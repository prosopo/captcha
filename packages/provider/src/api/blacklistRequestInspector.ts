// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import type { Logger } from "@prosopo/common";
import { ApiPrefix } from "@prosopo/types";
import {
	AccessPolicyType,
	type AccessRule,
	type AccessRulesFilter,
	type AccessRulesStorage,
	FilterScopeMatch,
	type UserScope,
	type UserScopeRecord,
} from "@prosopo/user-access-policy";
import { createHash } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

/**
 * Headers used for fingerprinting and access control
 */
const TRACKED_HEADERS = [
	"accept-language",
	"priority",
	"sec-ch-ua",
	"sec-ch-ua-mobile",
	"sec-ch-ua-platform",
	"x-duration-ms",
] as const;

/**
 * Calculate hash of tracked headers for fingerprinting
 *
 * This approach is preferred over storing individual header fields because:
 * 1. Avoids exponential permutation explosion (6 fields = 2^6 = 64 combinations vs 1 hash)
 * 2. Maintains efficient Redis query patterns
 * 3. More storage efficient
 * 4. Follows existing pattern with ja4Hash and userAgentHash
 */
const calculateHeadersHash = (requestHeaders: Record<string, unknown>): string | undefined => {
	const headerValues: string[] = [];

	for (const headerName of TRACKED_HEADERS) {
		const value = requestHeaders[headerName];
		if (value !== undefined) {
			// Normalize header values to strings and include header name for uniqueness
			headerValues.push(`${headerName}:${String(value)}`);
		}
	}

	// Only return hash if we have at least one tracked header
	if (headerValues.length === 0) {
		return undefined;
	}

	// Sort for consistent hashing regardless of header order
	headerValues.sort();

	// Create SHA256 hash of concatenated headers
	return createHash('sha256')
		.update(headerValues.join('|'))
		.digest('hex');
};

/**
 * Parse duration string with various units and convert to milliseconds
 * Handles formats like:
 * - "232.689µs" -> 0.232689ms
 * - "232.689Âµs" -> 0.232689ms (with garbled encoding)
 * - "150ms" -> 150ms
 * - "1.5s" -> 1500ms
 * - "250" -> 250ms (assume ms if no unit)
 */
const parseDurationToMilliseconds = (durationStr: string): number | undefined => {
	if (!durationStr || typeof durationStr !== 'string') {
		return undefined;
	}

	// Clean up the string - remove whitespace and normalize
	let cleanStr = durationStr.trim().toLowerCase();

	// Handle garbled encoding of µs (Âµs -> µs)
	cleanStr = cleanStr.replace(/âµs|Âµs/g, 'µs');

	// Define unit conversions to milliseconds
	const unitConversions: Record<string, number> = {
		'µs': 0.001,     // microseconds to milliseconds
		'us': 0.001,     // alternative microsecond notation
		'ms': 1,         // milliseconds
		's': 1000,       // seconds to milliseconds
		'sec': 1000,     // alternative seconds notation
		'min': 60000,    // minutes to milliseconds
		'm': 60000,      // alternative minutes notation
	};

	// Try to extract number and unit
	const match = cleanStr.match(/^([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s*([a-zµ]+)?$/);

	if (!match) {
		// If no match, try just parsing as a number (assume milliseconds)
		const numValue = Number.parseFloat(cleanStr);
		return Number.isNaN(numValue) ? undefined : numValue;
	}

	const [, numberPart, unit] = match;
	const numValue = Number.parseFloat(numberPart);

	if (Number.isNaN(numValue)) {
		return undefined;
	}

	// If no unit specified, assume milliseconds
	if (!unit) {
		return numValue;
	}

	// Look up unit conversion
	const multiplier = unitConversions[unit];
	if (multiplier === undefined) {
		// Unknown unit, log warning but try to return the numeric value assuming ms
		console.warn(`Unknown duration unit: ${unit}, assuming milliseconds`);
		return numValue;
	}

	return numValue * multiplier;
};

/**
 * Calculate hash of user agent for fingerprinting
 */
const calculateUserAgentHash = (userAgent: string): string => {
	return createHash('sha256')
		.update(userAgent)
		.digest('hex');
};

export const getRequestUserScope = (
	requestHeaders: Record<string, unknown>,
	ja4?: string,
	ip?: string,
	user?: string,
): Pick<UserScopeRecord, "userId" | "ja4Hash" | "userAgent" | "ip" | "headersHash" | "userAgentHash" |
	"headerAcceptLanguage" | "headerPriority" | "headerSecChUa" | "headerSecChUaMobile" | "headerSecChUaPlatform" | "headerXDurationMs" | "headerXDurationMsOperator"> => {

	const userAgent = requestHeaders["user-agent"]?.toString();

	// Calculate individual header fields with proper type conversion
	const headerAcceptLanguage = requestHeaders["accept-language"]?.toString();
	const headerPriority = requestHeaders["priority"]?.toString();
	const headerSecChUa = requestHeaders["sec-ch-ua"]?.toString();
	const headerSecChUaMobile = requestHeaders["sec-ch-ua-mobile"]?.toString();
	const headerSecChUaPlatform = requestHeaders["sec-ch-ua-platform"]?.toString();

	// Convert x-duration-ms to number using robust parsing that handles various units
	const durationStr = requestHeaders["x-duration-ms"]?.toString();
	const headerXDurationMs = durationStr ? parseDurationToMilliseconds(durationStr) : undefined;

	// Calculate composite hash and user agent hash
	const headersHash = calculateHeadersHash(requestHeaders);
	const userAgentHash = userAgent ? calculateUserAgentHash(userAgent) : undefined;

	return {
		...(user && { userId: user }),
		...(ja4 && { ja4Hash: ja4 }),
		...(userAgent && { userAgent }),
		...(userAgentHash && { userAgentHash }),
		...(headersHash && { headersHash }),
		...(ip && { ip }),
		// Individual header fields
		...(headerAcceptLanguage && { headerAcceptLanguage }),
		...(headerPriority && { headerPriority }),
		...(headerSecChUa && { headerSecChUa }),
		...(headerSecChUaMobile && { headerSecChUaMobile }),
		...(headerSecChUaPlatform && { headerSecChUaPlatform }),
		...(headerXDurationMs !== undefined && !Number.isNaN(headerXDurationMs) && { headerXDurationMs }),
		// Note: headerXDurationMsOperator is not set from request headers as it's only used in rules
	};
};


export const getPrioritisedAccessRule = async (
	userAccessRulesStorage: AccessRulesStorage,
	userScope: UserScope | UserScopeRecord,
	clientId?: string,
) => {
	// Build a single comprehensive filter that captures all priority combinations
	const optimizedFilter = buildOptimizedRulesFilter(userScope, clientId);

	// Execute single query that returns all potentially matching rules
	const allRules = await userAccessRulesStorage.findRules(optimizedFilter, true, true);

	// Sort results by priority (most specific first)
	return sortRulesByPriority(allRules, userScope, clientId);
};

/**
 * Builds a single filter that captures all priority combinations using OR conditions
 */
const buildOptimizedRulesFilter = (
	userScope: UserScope | UserScopeRecord,
	clientId?: string,
): AccessRulesFilter => {
	return {
		// Use greedy matching to capture all possible combinations
		policyScopeMatch: FilterScopeMatch.Greedy,
		userScopeMatch: FilterScopeMatch.Greedy,
		userScope,
		...(clientId && {
			policyScope: {
				clientId,
			},
		}),
	};
};

/**
 * Sort rules by priority - most specific scope matches first, client rules before global
 */
const sortRulesByPriority = (
	rules: AccessRule[],
	userScope: UserScope | UserScopeRecord,
	clientId?: string,
): AccessRule[] => {
	const userScopeKeys = Object.keys(userScope).filter(
		key => userScope[key as keyof typeof userScope] !== undefined
	);

	return rules.sort((a, b) => {
		// First priority: client-specific vs global rules
		const aIsClient = clientId && 'clientId' in a && a.clientId === clientId;
		const bIsClient = clientId && 'clientId' in b && b.clientId === clientId;

		if (aIsClient && !bIsClient) return -1;
		if (!aIsClient && bIsClient) return 1;

		// Second priority: number of matching user scope fields (more specific first)
		const aMatches = countMatchingUserScopeFields(a, userScope, userScopeKeys);
		const bMatches = countMatchingUserScopeFields(b, userScope, userScopeKeys);

		return bMatches - aMatches; // Descending order (more matches first)
	});
};

/**
 * Count how many user scope fields match between rule and request
 */
const countMatchingUserScopeFields = (
	rule: AccessRule,
	userScope: UserScope | UserScopeRecord,
	userScopeKeys: string[],
): number => {
	let matches = 0;

	for (const key of userScopeKeys) {
		const ruleValue = rule[key as keyof AccessRule];
		const userValue = userScope[key as keyof typeof userScope];

		if (ruleValue !== undefined && ruleValue === userValue) {
			matches++;
		}
	}

	return matches;
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

			const accessPolicies = await getPrioritisedAccessRule(
				this.userAccessRulesStorage,
				getRequestUserScope(requestHeaders, ja4, rawIp, userId),
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
