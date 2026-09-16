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
import { captchaPolicySeverity } from "@prosopo/captcha-severity";
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
	HEADER_RULE_MARKER,
	type UserScope,
	type UserScopeRecord,
	accessRuleHeaderMatches,
	classifyBrowser,
	classifyOs,
	describeMatchedRule,
	makeAccessRuleHash,
	userScopeInput,
} from "@prosopo/user-access-policy";
import type { NextFunction, Request, Response } from "express";
import { getCompositeIpAddress } from "../compositeIpAddress.js";
import {
	HardBlockVerdictCache,
	hardBlockCacheKey,
} from "./hardBlockVerdictCache.js";
import { recordBlockedRequest } from "./metrics.js";

export const getRequestUserScope = (
	requestHeaders: Record<string, unknown>,
	ja4?: string,
	ip?: string,
	user?: string,
	headHash?: string,
	coords?: string,
	countryCode?: string,
	asn?: number,
	// Present only when Web Bot Auth signature verification succeeded on the
	// inbound request. Passed through to rule matching so `webBotAuthAgent`
	// rules match the verified signer URL, never a spoofed header.
	webBotAuthAgent?: string,
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
	| "os"
	| "browser"
	| "headerMatch"
	| "webBotAuthAgent"
> => {
	const userAgent = requestHeaders["user-agent"]
		? requestHeaders["user-agent"].toString()
		: undefined;

	return {
		...(user && { userId: user }),
		...(ja4 && { ja4Hash: ja4 }),
		...(userAgent && { userAgent }),
		...(ip && { ip }),
		...(headHash && { headHash }),
		...(coords && { coords }),
		...(countryCode && { countryCode }),
		...(typeof asn === "number" && { asn }),
		...(webBotAuthAgent && { webBotAuthAgent }),
		// Unconditional, unlike the fields above: an allow-list has to match a
		// request whose UA we can't classify, which lands on "unknown".
		os: classifyOs(userAgent),
		browser: classifyBrowser(userAgent),
		// Sentinel that makes every header-restriction rule a matching
		// candidate for this request (the concrete header condition is then
		// checked in code — see `accessRuleHeaderMatches`). Always present so an
		// allow-list header rule fires even on a request that omits the header.
		headerMatch: HEADER_RULE_MARKER,
	};
};

// Normalise a raw request-header bag into the lower-cased `{name: value}` map
// the in-code header matcher expects. Array-valued headers are joined the same
// way `sanitizeRequestHeaders` collapses them, so a `contains` check sees the
// same string the session record would store.
export const normalizeHeadersForMatching = (
	headers: Record<string, unknown>,
): Record<string, string> => {
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(headers)) {
		if (typeof value === "string") {
			out[key.toLowerCase()] = value;
		} else if (Array.isArray(value)) {
			out[key.toLowerCase()] = value.map((v) => String(v)).join(", ");
		}
	}
	return out;
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
	"os",
	"browser",
	// Always-equal sentinel (the real header condition is checked by
	// `accessRuleHeaderMatches`). Listed so a header rule scores one specificity
	// point, mirroring `exists(@headerMatch)` in the reader's SPECIFICITY_EXPR.
	"headerMatch",
	"webBotAuthAgent",
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
	requestHeaders: Record<string, string>,
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
	if (!ruleIpMatchesRequest(rule, request.numericIp)) {
		return false;
	}
	// Arbitrary-header condition (equals / contains / their negations). Checked
	// against the raw request headers because Redis can't express it; a rule
	// with no header condition passes this trivially.
	return accessRuleHeaderMatches(rule, requestHeaders);
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

// Tiebreaker within an equal-specificity tier (issue #3713):
//   Block  >  Restrict[image, rounds DESC]  >  Restrict[puzzle]  >  Restrict[pow]
// Specificity still dominates — a more-specific Restrict[pow] beats a
// less-specific Block, because the operator deliberately narrowed scope
// for that combination.
//
// The ordering comes from `@prosopo/captcha-severity`, shared with the
// traffic filter's `resolveChallengePolicy` and downstream routing consumers
// so they all agree on "stricter". `captchaPolicySeverity` ranks the captcha
// type first and its difficulty setting second, clamped below the tier gap,
// so no setting (e.g. an unbounded `solvedImagesCount`) can lift a rule over
// a stricter captcha type. Pow breaks ties on `powDifficulty`; image and
// puzzle share `solvedImagesCount` as their severity currency.
//
// `deferToVerify` doesn't affect this ordering: it controls *when* a Block
// fires (request-time vs verify-time), not how severe it is.
const ruleHarshness = (rule: AccessRule): number => {
	if (rule.type === AccessPolicyType.Block) {
		return Number.MAX_SAFE_INTEGER;
	}
	return captchaPolicySeverity(rule);
};

/**
 * Rank the candidate rules a single Redis query returned. A rule "applies" iff
 * every populated field on the rule equals the corresponding request field
 * (IP fields use range semantics).
 *
 * Ordering: specificity DESC primary, harshness DESC as the equal-specificity
 * tiebreaker (issue #3713). The most specific applicable rule wins; on tie,
 * the harshest matching rule wins — Block > Restrict[image, rounds DESC] >
 * Restrict[puzzle] > Restrict[pow]. Client-scoped rules outrank global rules
 * of equal user-scope specificity.
 */
export const rankCandidateRules = (
	rules: AccessRule[],
	request: UserScope,
	requestClientId: string | undefined,
	requestHeaders: Record<string, string>,
): AccessRule[] =>
	rules
		.filter((rule) =>
			ruleApplies(rule, request, requestClientId, requestHeaders),
		)
		.sort((a, b) => {
			const specDelta =
				ruleSpecificity(b, requestClientId) -
				ruleSpecificity(a, requestClientId);
			if (specDelta !== 0) {
				return specDelta;
			}
			return ruleHarshness(b) - ruleHarshness(a);
		});

// Process-scoped (each provider process keeps its own); staleness is bounded
// by DEFAULT_VERDICT_CACHE_TTL_MS.
const verdictCache = new HardBlockVerdictCache();

// Exposed for tests + admin tooling that needs to bound the staleness
// window after a rule mutation. Not on the request path.
export const getVerdictCache = (): HardBlockVerdictCache => verdictCache;

// Per-request memo attached to the Express request, so every check in one
// request that looks up the same scope shares one Redis round-trip.
type RequestMemo = Map<string, AccessRule[]>;
const REQUEST_MEMO_SYMBOL = Symbol.for("prosopo.accessRuleRequestMemo");
type RequestWithMemo = {
	[REQUEST_MEMO_SYMBOL]?: RequestMemo;
};

const getOrCreateRequestMemo = (
	requestMemoHost: RequestWithMemo,
): RequestMemo => {
	let memo = requestMemoHost[REQUEST_MEMO_SYMBOL];
	if (memo === undefined) {
		memo = new Map();
		requestMemoHost[REQUEST_MEMO_SYMBOL] = memo;
	}
	return memo;
};

export type GetPrioritisedAccessRuleOptions = {
	blockOnly?: boolean;
	// Widen a `blockOnly` pool to also admit deferred rules of any type.
	// Only the verify-time hard-block lookup sets this — see
	// AccessRulesFilter.includeDeferred.
	includeDeferred?: boolean;
	// When provided, results are memoised against this host object for
	// the request lifetime. Callers pass `req` directly; middleware
	// chains that share the same request object share one Redis
	// round-trip per (scope, blockOnly) combination.
	requestMemoHost?: object;
	// Test/ops hook: skip the process-wide cache. Individual callers
	// (e.g. an admin write endpoint that must observe the just-inserted
	// rule) can bypass without flushing everyone else.
	skipCache?: boolean;
};

/**
 * Fetch the access rules that apply to a request, most specific first.
 *
 * The storage layer runs a strict-match query, so every returned candidate
 * applies, and ranks specificity server-side (FT.AGGREGATE+APPLY+SORTBY+LIMIT),
 * returning at most 20 rules. `rankCandidateRules` still runs as a defence, so
 * any mismatch between the Redis-side score and the JS semantics surfaces as
 * ordering rather than letting traffic through.
 */
export const getPrioritisedAccessRule = async (
	userAccessRulesStorage: AccessRulesStorage,
	userScope: UserScope | UserScopeRecord,
	clientId: string | undefined,
	// Raw request headers (lower-cased name → value) for the in-code header
	// condition check. Required, with no default: the negated header operators
	// treat a missing header as "does not match", so a lookup that silently
	// ran with an empty header map would make every allow-list rule fire on
	// every request. Callers with nothing but a scope must say so explicitly.
	requestHeaders: Record<string, string>,
	options?: GetPrioritisedAccessRuleOptions,
): Promise<AccessRule[]> => {
	const parsedUserScope = userScopeInput.parse(userScope);
	const blockOnly = options?.blockOnly ?? false;
	const includeDeferred = options?.includeDeferred ?? false;
	const skipCache = options?.skipCache ?? false;
	const requestMemoHost = options?.requestMemoHost as
		| RequestWithMemo
		| undefined;

	const cacheKey = hardBlockCacheKey(
		clientId,
		parsedUserScope,
		blockOnly,
		includeDeferred,
	);

	// Request-scoped memo first — zero staleness, cheapest lookup.
	const requestMemo = requestMemoHost
		? getOrCreateRequestMemo(requestMemoHost)
		: undefined;
	const memoHit = requestMemo?.get(cacheKey);

	const filter = {
		...(clientId && {
			policyScope: {
				clientId,
			},
		}),
		policyScopeMatch: FilterScopeMatch.Greedy,
		userScope: parsedUserScope,
		userScopeMatch: FilterScopeMatch.Greedy,
		...(blockOnly && { blockOnly: true }),
		...(includeDeferred && { includeDeferred: true }),
	};

	const compute = async (): Promise<AccessRule[]> =>
		userAccessRulesStorage.findRules(
			filter,
			true, // matchingFieldsOnly — engages the split-query hot path
			true, // skipEmptyUserScopes
		);

	// Only the candidate fetch is cached, never the ranked list: `ruleApplies`
	// consults the raw request headers, but `hardBlockCacheKey` is built from
	// the user scope alone (header values in the key would destroy its hit
	// rate). Caching a ranked list would serve one request's header-rule
	// verdict to another request that shares a scope but sends other headers.
	let candidates: AccessRule[];
	if (memoHit !== undefined) {
		candidates = memoHit;
	} else if (skipCache) {
		candidates = await compute();
	} else {
		candidates = await verdictCache.getOrCompute(cacheKey, compute);
	}

	requestMemo?.set(cacheKey, candidates);
	return rankCandidateRules(
		candidates,
		parsedUserScope,
		clientId,
		requestHeaders,
	);
};

export class BlacklistRequestInspector {
	public constructor(
		private readonly userAccessRulesStorage: AccessRulesStorage,
		private readonly environmentReadinessWaiter: () => Promise<void>,
		// Optional because not every caller (e.g. tests) has a DB. When provided,
		// requests blocked by a matched `Block` rule also write a synthetic
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
			// Share the per-request memo so a downstream captcha task
			// hitting checkForHardBlock in the same request reuses this
			// lookup rather than re-querying Redis.
			request,
		);

		if (shouldAbortRequest) {
			// 403, not 401: the client isn't lacking credentials, it is denied
			// access. The body must be a structured `{ message, code }` object so
			// the widget's `result.error?.message` extractor picks it up — a plain
			// string falls through to the generic "Cannot load CAPTCHA" fallback.
			// The requestId lets support quote it back on tickets.
			res.status(403).json({
				error: {
					message: `Forbidden: ${request.requestId ?? "unknown"}`,
					code: 403,
				},
			});
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
		requestMemoHost?: object,
	): Promise<boolean> {
		// Skip this middleware for non-api routes like /json /favicon.ico etc
		if (this.isApiUnrelatedRoute(requestedRoute)) {
			return false;
		}

		if (!rawIp) {
			logger.info(() => ({
				data: {
					requestedRoute,
					requestHeaders,
					requestBody,
				},
				msg: "Request without IP",
			}));

			recordBlockedRequest("no_ip");
			return true;
		}

		await this.environmentReadinessWaiter();

		try {
			const { userId, clientId } = this.extractIdsFromRequest(
				requestHeaders,
				requestBody,
			);

			// ipInfoMiddleware runs before blockMiddleware, so country/ASN rules
			// can fire here — before a frictionless session is created.
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
				normalizeHeadersForMatching(requestHeaders),
				// Only Block policies act at request time (Restrict rules flow
				// through to the captcha-creation path). Narrowing the Redis-side
				// pool stops the SERVER_SIDE_RANK_TOP_N cap crowding out
				// hard-block rules for clients with many Restrict rules.
				{ blockOnly: true, requestMemoHost },
			);
			// `deferToVerify` policies are matched again by `checkForHardBlock`
			// in each captcha task's verify path instead.
			const enforceable = (accessPolicies ?? []).filter(
				(p) => !p.deferToVerify,
			);
			const accessPolicy = enforceable[0];
			if (!accessPolicy) {
				return false;
			}

			const isBlock = AccessPolicyType.Block === accessPolicy.type;
			if (isBlock) {
				recordBlockedRequest("access_policy");
				// `Restrict` policies don't 403; the captcha-creation path
				// writes their normal session record.
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

			recordBlockedRequest("error");
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
				? ctx.requestHeaders["user-agent"]
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
					os: classifyOs(userAgent),
					browser: classifyBrowser(userAgent),
				},
			},
		}));

		// storeBlockedSession swallows its own errors so the 403 is unaffected
		// if Mongo is unhappy.
		if (!this.db) {
			return;
		}
		const ipAddress = ctx.rawIp ? getCompositeIpAddress(ctx.rawIp) : undefined;
		if (!ipAddress) {
			// The session schema requires ipAddress.
			return;
		}
		const headers = sanitizeRequestHeaders(ctx.requestHeaders);
		const session: Session = {
			sessionId: `blocked-${randomUUID()}`,
			createdAt: new Date(),
			// Sentinel values for schema-required fields the blocked request
			// never reached the point of populating. `token` must be non-empty:
			// mongoose treats "" as missing on required String, and the
			// resulting "Validation failed: token: Path `token` is required"
			// spam floods the error stream and shows as API.PARSE_ERROR volume.
			token: "blocked",
			score: 1,
			threshold: 0,
			scoreComponents: { baseScore: 1 },
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
			// Rule identity — the whole point of writing this record. The three
			// flat fields drive the Traffic page's rule-type grouping;
			// `matchedRule` carries the rule itself so the audit page can name
			// the exact policy (and its conditions) long after the rule expires.
			ruleHash,
			ruleType,
			ruleDescription,
			matchedRule: describeMatchedRule(accessPolicy),
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
