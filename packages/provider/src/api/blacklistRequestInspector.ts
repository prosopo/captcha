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

import type { Logger } from "@prosopo/logger";
import { ApiPrefix, type IPInfoResponse } from "@prosopo/types";
import {
	AccessPolicyType,
	type AccessRule,
	type AccessRulesStorage,
	FilterScopeMatch,
	type UserScope,
	type UserScopeRecord,
	userScopeInput,
} from "@prosopo/user-access-policy";
import type { NextFunction, Request, Response } from "express";

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
 * Old shape: 2 × (2^n − 1) `FT.SEARCH` round trips, one per non-empty subset
 * of the populated user-scope fields × {clientId, undefined}. With n=6 fields
 * (incl. ASN) that's 126 round trips per request.
 *
 * New shape: one greedy `FT.SEARCH` that returns any rule touching any
 * populated request field for either the matching clientId or no clientId.
 * Specificity is computed in JS afterwards. Same external semantics.
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
		false,
		true,
	);

	return rankCandidateRules(candidates, parsedUserScope, clientId);
};

export class BlacklistRequestInspector {
	public constructor(
		private readonly userAccessRulesStorage: AccessRulesStorage,
		private readonly environmentReadinessWaiter: () => Promise<void>,
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
			res.status(401).json({ error: "Unauthorized" });
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
			if (
				!accessPolicies ||
				accessPolicies.length === 0 ||
				!accessPolicies[0]
			) {
				return false;
			}
			const accessPolicy = accessPolicies[0];

			return AccessPolicyType.Block === accessPolicy.type;
		} catch (err) {
			logger.error(() => ({
				err,
				msg: "Block Middleware Error",
			}));

			return true;
		}
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
