// Copyright 2021-2026 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { randomUUID } from "node:crypto";
import type { Logger } from "@prosopo/logger";
import {
	ApiPrefix,
	CaptchaStatus,
	CaptchaType,
	FrictionlessReason,
	type IPInfoResponse,
	type RequestHeaders,
	ResultReason,
	type Session,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import {
	AccessPolicyType,
	type AccessRule,
	type AccessRulesStorage,
	FilterScopeMatch,
	type UserScope,
	type UserScopeRecord,
	makeAccessRuleHash,
	userScopeInput,
} from "@prosopo/user-access-policy";
import type { NextFunction, Request, Response } from "express";
import { getCompositeIpAddress } from "../compositeIpAddress.js";

export const getRequestUserScope = (
	requestHeaders: Record<string, unknown>,
	ja4?: string,
	ip?: string,
	user?: string,
	headHash?: string,
	coords?: string,
	countryCode?: string,
	asn?: number,
): Pick<
	UserScopeRecord,
	| "userId"
	| "ja4Hash"
	| "userAgent"
	| "ip"
	| "headHash"
	| "coords"
	| "countryCode"
	| "asn"
> => {
	const userAgent = requestHeaders["user-agent"]
		? requestHeaders["user-agent"].toString()
		: undefined;

	return {
		...(user && { userId: user }),
		...(ja4 && { ja4Hash: ja4 }),
		...(userAgent && { userAgent: userAgent }),
		...(ip && { ip }),
		...(headHash && { headHash }),
		...(coords && { coords }),
		...(countryCode && { countryCode }),
		...(typeof asn === "number" && { asn }),
	};
};

// Scalar user-scope fields (i.e. everything except the IP triple, which is
// handled with range semantics below). Each present field on a rule
// contributes one point of specificity when ranking candidates.
const SCALAR_USER_SCOPE_FIELDS = [
	"userId",
	"ja4Hash",
	"headersHash",
	"userAgentHash",
	"headHash",
	"coords",
	"countryCode",
	"asn",
] as const satisfies ReadonlyArray<keyof UserScope>;

// Derive the populated-scope field list for a matched rule (the same shape
// as Mongo's `accessControlRules.ruleType`). Used when persisting a blocked
// session so the Traffic page can group blocks by rule-type — `['ja4Hash']`
// vs `['ja4Hash','coords']` vs `['ip']` — without re-parsing the rule.
const deriveRuleType = (rule: AccessRule): string[] => {
	const fields: string[] = [];
	for (const f of SCALAR_USER_SCOPE_FIELDS) {
		if (rule[f] !== undefined) {
			fields.push(f);
		}
	}
	if (rule.numericIp !== undefined) {
		fields.push("ip");
	} else if (
		rule.numericIpMaskMin !== undefined &&
		rule.numericIpMaskMax !== undefined
	) {
		fields.push("ipMask");
	}
	return fields;
};

// Strip header values that aren't strings so the Session.headers object
// matches the schema (RequestHeaders is `Record<string, string>`). Mirrors
// what the frictionless path stores; cheaper than dragging every catch-all
// header through and keeps the blocked-session doc the same shape as a
// normal session for the Traffic-page aggregations.
const sanitizeRequestHeaders = (
	headers: Record<string, unknown>,
): RequestHeaders => {
	const out: Record<string, string> = {};
	for (const [k, v] of Object.entries(headers)) {
		if (typeof v === "string") {
			out[k] = v;
		} else if (Array.isArray(v)) {
			out[k] = v.map((x) => String(x)).join(", ");
		}
	}
	return out as RequestHeaders;
};

const ruleHasIpConstraint = (rule: AccessRule): boolean =>
	rule.numericIp !== undefined ||
	(rule.numericIpMaskMin !== undefined && rule.numericIpMaskMax !== undefined);

const ruleIpMatchesRequest = (
	rule: AccessRule,
	requestIp: bigint | undefined,
): boolean => {
	if (!ruleHasIpConstraint(rule)) {
		return true;
	}
	if (requestIp === undefined) {
		return false;
	}
	if (rule.numericIp !== undefined) {
		return requestIp === rule.numericIp;
	}
	// CIDR rule: numericIpMaskMin / numericIpMaskMax both defined (per
	// ruleHasIpConstraint above).
	return (
		requestIp >= (rule.numericIpMaskMin as bigint) &&
		requestIp <= (rule.numericIpMaskMax as bigint)
	);
};

const ruleApplies = (
	rule: AccessRule,
	request: UserScope,
	requestClientId: string | undefined,
): boolean => {
	// Client-scoped rules: rule.clientId must equal the request's clientId.
	// Rules without a clientId are global and apply to any client.
	if (rule.clientId !== undefined && rule.clientId !== requestClientId) {
		return false;
	}
	for (const field of SCALAR_USER_SCOPE_FIELDS) {
		const ruleValue = rule[field];
		if (ruleValue === undefined) {
			continue;
		}
		if (ruleValue !== request[field]) {
			return false;
		}
	}
	return ruleIpMatchesRequest(rule, request.numericIp);
};

const ruleSpecificity = (
	rule: AccessRule,
	requestClientId: string | undefined,
): number => {
	let score = 0;
	if (rule.clientId !== undefined && rule.clientId === requestClientId) {
		score += 1;
	}
	for (const field of SCALAR_USER_SCOPE_FIELDS) {
		if (rule[field] !== undefined) {
			score += 1;
		}
	}
	if (ruleHasIpConstraint(rule)) {
		score += 1;
	}
	return score;
};

// On equal specificity, the more severe outcome wins. This is a safety
// property: a request that matches both a Block rule and a Restrict rule
// of equal specificity must be blocked, never restricted-but-let-through.
const policySeverity = (rule: AccessRule): number =>
	rule.type === AccessPolicyType.Block ? 1 : 0;

/**
 * Rank the candidate rules a single Redis query returned. A rule "applies" iff
 * every populated field on the rule equals the corresponding request field
 * (IP fields use range semantics). The most specific applicable rule wins;
 * on tie, the more severe (Block over Restrict) wins. Client-scoped rules
 * outrank global rules of equal user-scope specificity.
 */
export const rankCandidateRules = (
	rules: AccessRule[],
	request: UserScope,
	requestClientId: string | undefined,
): AccessRule[] =>
	rules
		.filter((rule) => ruleApplies(rule, request, requestClientId))
		.sort((a, b) => {
			const specDelta =
				ruleSpecificity(b, requestClientId) -
				ruleSpecificity(a, requestClientId);
			if (specDelta !== 0) {
				return specDelta;
			}
			return policySeverity(b) - policySeverity(a);
		});

/**
 * Fetch the access rules that apply to a request, most specific first.
 *
 * Evolution of this lookup:
 *
 *  - Original: 2 × (2^n − 1) `FT.SEARCH` round trips, one per non-empty
 *    subset of the populated user-scope fields × {clientId, undefined}.
 *    n=6 fields ⇒ 126 RTTs per request.
 *  - #2657 (greedy): one OR-of-fields `FT.SEARCH`, JS-side rank picks
 *    the most-specific. 1 RTT but pulled hundreds of irrelevant hashes
 *    every request.
 *  - #2689 / 3.6.38: greedy + FT.AGGREGATE+CURSOR to defeat the silent
 *    1000-cap truncation. Tipped CPU into 125% peg in production.
 *  - 3.6.38.1 hotfix: reverted to greedy + FT.SEARCH (this file's old
 *    shape with the truncation bug back).
 *  - Now (this fix): strict-match query so every returned candidate
 *    actually applies, with specificity ranked server-side via
 *    FT.AGGREGATE+APPLY+SORTBY+LIMIT in the storage layer. Node receives
 *    at most 20 already-ranked rules — no JS sort needed for
 *    correctness, but `rankCandidateRules` is kept as defence so any
 *    mismatch between the Redis-side score and the JS semantics surfaces
 *    as ordering rather than letting traffic through.
 */
export const getPrioritisedAccessRule = async (
	userAccessRulesStorage: AccessRulesStorage,
	userScope: UserScope | UserScopeRecord,
	clientId?: string,
): Promise<AccessRule[]> => {
	const parsedUserScope = userScopeInput.parse(userScope);

	const filter = {
		...(clientId && {
			policyScope: {
				clientId,
			},
		}),
		policyScopeMatch: FilterScopeMatch.Greedy,
		userScope: parsedUserScope,
		userScopeMatch: FilterScopeMatch.Greedy,
	};

	const candidates = await userAccessRulesStorage.findRules(
		filter,
		true, // matchingFieldsOnly — engages server-side specificity rank
		true,
	);

	return rankCandidateRules(candidates, parsedUserScope, clientId);
};

export class BlacklistRequestInspector {
	public constructor(
		private readonly userAccessRulesStorage: AccessRulesStorage,
		private readonly environmentReadinessWaiter: () => Promise<void>,
		// Optional so existing test-suite construction (where the DB isn't
		// always plumbed) keeps working. When provided, requests blocked by a
		// matched access-policy `Block` rule also write a synthetic
		// `blocked=true, deleted=true` session record so the Traffic page can
		// aggregate per-rule block counts. Other 403 cases (missing IP, or a
		// fail-closed middleware error) are not persisted, since there's no
		// matched rule to attribute them to.
		private readonly db?: IProviderDatabase,
	) {}

	public async abortRequestForBlockedUsers(
		request: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		const rawIp = request.ip || "";

		request.logger.debug(() => ({
			data: { ja4: request.ja4 },
		}));

		const shouldAbortRequest = await this.shouldAbortRequest(
			request.url,
			rawIp,
			request.ja4,
			request.headers,
			request.body,
			request.logger,
			request.ipInfo,
		);

		if (shouldAbortRequest) {
			// Any deny decision from shouldAbortRequest - a matched Block rule
			// (blocked IP / JA4 / user / country / ASN), a request with no IP, or
			// a fail-closed middleware error - is a 403 Forbidden, not a 401
			// Unauthorized: the client isn't lacking credentials, it is denied
			// access.
			res.status(403).json({ error: "Forbidden" });
			return;
		}

		next();
	}

	public async shouldAbortRequest(
		requestedRoute: string,
		rawIp: string,
		ja4: string,
		requestHeaders: Record<string, unknown>,
		requestBody: Record<string, unknown>,
		logger: Logger,
		ipInfo?: IPInfoResponse,
	): Promise<boolean> {
		// Skip this middleware for non-api routes like /json /favicon.ico etc
		if (this.isApiUnrelatedRoute(requestedRoute)) {
			return false;
		}

		// block if no IP is present
		if (!rawIp) {
			logger.info(() => ({
				data: {
					requestedRoute: requestedRoute,
					requestHeaders: requestHeaders,
					requestBody: requestBody,
				},
				msg: "Request without IP",
			}));

			return true;
		}

		await this.environmentReadinessWaiter();

		try {
			const { userId, clientId } = this.extractIdsFromRequest(
				requestHeaders,
				requestBody,
			);

			// Country comes from req.ipInfo (populated by ipInfoMiddleware,
			// which runs before blockMiddleware). Threading it in here lets
			// country-based access rules fire at the earliest entry point —
			// in particular, *before* a frictionless session is created.
			const countryCode = ipInfo?.isValid ? ipInfo.countryCode : undefined;
			const asn = ipInfo?.isValid ? ipInfo.asnNumber : undefined;

			const accessPolicies = await getPrioritisedAccessRule(
				this.userAccessRulesStorage,
				getRequestUserScope(
					requestHeaders,
					ja4,
					rawIp,
					userId,
					undefined, // headHash
					undefined, // coords
					countryCode,
					asn,
				),
				clientId,
			);
			// Skip policies that have explicitly opted out of request-time
			// enforcement (`deferToVerify`). Those are matched again from
			// `checkForHardBlock` inside each captcha task's verify path —
			// same pattern coords rules already use, just driven by a
			// per-policy flag rather than by blanking the scope field.
			const enforceable = (accessPolicies ?? []).filter(
				(p) => !p.deferToVerify,
			);
			if (enforceable.length === 0 || !enforceable[0]) {
				return false;
			}
			const accessPolicy = enforceable[0];

			const isBlock = AccessPolicyType.Block === accessPolicy.type;
			if (isBlock) {
				// `Restrict` policies aren't logged or persisted here — those
				// don't 403, they let the request through with modified
				// captcha params and the downstream captcha-creation path
				// already writes a normal session record.
				this.recordBlockDecision(
					accessPolicy,
					{
						userId,
						clientId,
						rawIp,
						ja4,
						requestHeaders,
						ipInfo,
						countryCode,
						asn,
					},
					logger,
				);
			}
			return isBlock;
		} catch (err) {
			logger.error(() => ({
				err,
				msg: "Block Middleware Error",
			}));

			return true;
		}
	}

	/**
	 * Emit a structured log line and (if a DB is wired) persist a synthetic
	 * Session record for the request we're about to block (403). Fire-and-forget on
	 * the Mongo side — the structured log line is the source of truth and
	 * the 403 response is never delayed by a persistence failure.
	 *
	 * Carries the matched rule's identity (hash + ruleType + description)
	 * so the Traffic page can surface "what's blocking traffic for this
	 * site" without re-reading the rules collection.
	 */
	private recordBlockDecision(
		accessPolicy: AccessRule,
		ctx: {
			userId?: string;
			clientId?: string;
			rawIp: string;
			ja4: string;
			requestHeaders: Record<string, unknown>;
			ipInfo?: IPInfoResponse;
			countryCode?: string;
			asn?: number;
		},
		logger: Logger,
	): void {
		const ruleHash = makeAccessRuleHash(accessPolicy);
		const ruleType = deriveRuleType(accessPolicy);
		const ruleDescription = accessPolicy.description;
		const userAgent =
			typeof ctx.requestHeaders["user-agent"] === "string"
				? (ctx.requestHeaders["user-agent"] as string)
				: undefined;

		logger.info(() => ({
			msg: "Access policy block",
			data: {
				ruleHash,
				ruleType,
				ruleDescription,
				policyType: accessPolicy.type,
				clientId: ctx.clientId,
				userScope: {
					userId: ctx.userId,
					ja4: ctx.ja4,
					ip: ctx.rawIp,
					userAgent,
					countryCode: ctx.countryCode,
					asn: ctx.asn,
				},
			},
		}));

		// Persistence is optional and best-effort. The log line above is the
		// primary record; storeBlockedSession swallows its own errors so the
		// 401 path is unaffected if Mongo is unhappy.
		if (!this.db) {
			return;
		}
		const ipAddress = ctx.rawIp ? getCompositeIpAddress(ctx.rawIp) : undefined;
		if (!ipAddress) {
			// Schema requires ipAddress; without a parseable IP we drop the
			// persistence and rely on the log line.
			return;
		}
		const headers = sanitizeRequestHeaders(ctx.requestHeaders);
		const session: Session = {
			sessionId: `blocked-${randomUUID()}`,
			createdAt: new Date(),
			// Sentinel values for schema-required fields the blocked request
			// never reached the point of populating.
			token: "",
			score: 1,
			threshold: 0,
			scoreComponents: { baseScore: 1 },
			providerSelectEntropy: 0,
			captchaType: CaptchaType.frictionless,
			webView: false,
			iFrame: false,
			decryptedHeadHash: "",
			// Real data the inspector did collect.
			siteKey: ctx.clientId,
			ipAddress,
			ipInfo: ctx.ipInfo,
			headers,
			reason: FrictionlessReason.ACCESS_POLICY_BLOCK,
			result: {
				status: CaptchaStatus.disapproved,
				reason: ResultReason.ACCESS_POLICY_BLOCK,
			},
			// Rule identity — the whole point of writing this record.
			ruleHash,
			ruleType,
			ruleDescription,
			// blocked + deleted are stamped inside storeBlockedSession so
			// the synthetic record is unmistakably a block-middleware
			// artefact and can never be picked up by the captcha flow.
		};
		void this.db.storeBlockedSession(session);
	}

	protected isApiUnrelatedRoute(url: string): boolean {
		return !url.includes(ApiPrefix);
	}

	protected extractIdsFromRequest(
		requestHeaders: Record<string, unknown>,
		requestBody: Record<string, unknown>,
	): {
		userId: string | undefined;
		clientId: string | undefined;
	} {
		const userId =
			this.getObjectValue(requestHeaders, "Prosopo-User") ||
			this.getObjectValue(requestBody, "user");
		const clientId =
			this.getObjectValue(requestHeaders, "Prosopo-Site-Key") ||
			this.getObjectValue(requestBody, "dapp");

		return {
			userId: "string" === typeof userId ? userId : undefined,
			clientId: "string" === typeof clientId ? clientId : undefined,
		};
	}

	protected getObjectValue(
		object: Record<string, unknown>,
		key: string,
	): unknown {
		return object[key];
	}
}
