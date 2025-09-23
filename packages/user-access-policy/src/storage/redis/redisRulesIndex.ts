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

import type { RedisIndex } from "@prosopo/redis-client";
import { type FtSearchOptions, SCHEMA_FIELD_TYPE } from "@redis/search";
import { type AccessRule, makeAccessRuleHash } from "#policy/accessRule.js";
import type { PolicyScope } from "#policy/policyScope.js";
import {
	type AccessRulesFilter,
	ScopeMatch,
} from "#policy/storage/accessRulesStorage.js";
import {
	type UserScope,
	userScopeSchema,
} from "#policy/userScope/userScope.js";

export const redisRulesIndexName = "index:user-access-rules";
// names take space, so we use an acronym instead of the long-tailed one
export const redisRuleKeyPrefix = "uar:";

export const getRedisRuleKey = (rule: AccessRule): string =>
	redisRuleKeyPrefix + makeAccessRuleHash(rule);

export const redisAccessRulesIndex: RedisIndex = {
	name: redisRulesIndexName,
	/**
	 * Note on the field type decision
	 *
	 * TAG is designed for the exact value matching
	 * TEXT is designed for the word-based and pattern matching
	 *
	 * For our goal TAG fits perfectly and, more performant
	 */
	schema: {
		clientId: {
			type: SCHEMA_FIELD_TYPE.TAG,
			// necessary to make possible use of the ismissing() function on this field in the search
			INDEXMISSING: true,
		},
		groupId: { type: SCHEMA_FIELD_TYPE.TAG, INDEXMISSING: true },
		numericIpMaskMin: { type: SCHEMA_FIELD_TYPE.NUMERIC, INDEXMISSING: true },
		numericIpMaskMax: { type: SCHEMA_FIELD_TYPE.NUMERIC, INDEXMISSING: true },
		userId: { type: SCHEMA_FIELD_TYPE.TAG, INDEXMISSING: true },
		numericIp: { type: SCHEMA_FIELD_TYPE.NUMERIC, INDEXMISSING: true },
		ja4Hash: { type: SCHEMA_FIELD_TYPE.TAG, INDEXMISSING: true },
		headersHash: { type: SCHEMA_FIELD_TYPE.TAG, INDEXMISSING: true },
		userAgentHash: { type: SCHEMA_FIELD_TYPE.TAG, INDEXMISSING: true },
	} satisfies Partial<Record<keyof AccessRule, string | object>>,
	// the satisfy statement is to guarantee that the keys are right
	options: {
		ON: "HASH" as const,
		PREFIX: [redisRuleKeyPrefix],
	},
};

const DEFAULT_SEARCH_LIMIT = 1000;

export const numericIndexFields: Array<keyof AccessRule> = [
	"numericIp",
	"numericIpMaskMin",
	"numericIpMaskMax",
];

type CustomFieldComparisons = Record<
	keyof AccessRule,
	(value: unknown, scope: { [key in keyof AccessRule]: unknown }) => string
>;

const greedyFieldComparisons: Partial<CustomFieldComparisons> = {
	numericIp: (value, scope) => {
		if (value !== undefined) {
			return `( @numericIp:[${value} ${value}] | ( @numericIpMaskMin:[-inf ${value}] @numericIpMaskMax:[${value} +inf] ) )`;
		}
		// Only emit ismissing(@numericIp) if ranges are also not present
		if (
			scope.numericIpMaskMin === undefined &&
			scope.numericIpMaskMax === undefined
		) {
			return "ismissing(@numericIp) ismissing(@numericIpMaskMin) ismissing(@numericIpMaskMax)";
		}
		// Else, let ranges handle it
		return "";
	},
	numericIpMaskMin: (value, scope) => {
		if (scope.numericIp !== undefined) {
			return ""; // handled by numericIp
		}
		return value !== undefined
			? `@numericIpMaskMin:[-inf ${value}]`
			: "ismissing(@numericIpMaskMin)";
	},
	numericIpMaskMax: (value, scope) => {
		if (scope.numericIp !== undefined) {
			return ""; // handled by numericIp
		}
		return value !== undefined
			? `@numericIpMaskMax:[${value} +inf]`
			: "ismissing(@numericIpMaskMax)";
	},
};

// https://redis.io/docs/latest/commands/ft.search/
export const redisRulesSearchOptions: FtSearchOptions = {
	// #2 is a required option when the 'ismissing()' function is in the query body
	DIALECT: 2,
	LIMIT: {
		from: 0,
		size: DEFAULT_SEARCH_LIMIT,
	},
};

/*
 * Search command example:
 *
 * ft.search index:test "( @clientId:{value} | ismissing(@clientId) )
 * (
 * ( @ip:[value] | ( @ipRangeMin:[-inf value] @ipRangeMax:[value +inf] ) ) |
 * @id:{value} | @ja4Fingerprint:{value} | headersFingerprint:{value}"
 * )
 * DIALECT 2 # must have when the ismissing() function in use
 * */
export const getRedisRulesQuery = (
	filter: AccessRulesFilter,
	matchingFieldsOnly: boolean,
): string => {
	const { policyScope, userScope } = filter;
	const queryParts = [];

	if (filter.groupId) {
		queryParts.push(`@groupId:{${filter.groupId}}`);
	}

	const policyScopeQuery = getPolicyScopeQuery(
		policyScope,
		filter.policyScopeMatch,
	);

	if (policyScopeQuery) {
		queryParts.push(policyScopeQuery);
	}

	if (userScope && Object.keys(userScope).length > 0) {
		const userScopeFilter = getUserScopeQuery(
			userScope,
			filter.userScopeMatch,
			matchingFieldsOnly,
		);

		queryParts.push(`( ${userScopeFilter} )`);
	}

	return queryParts.length > 0 ? queryParts.join(" ") : "*";
};

const getPolicyScopeQuery = (
	policyScope: PolicyScope | undefined,
	scopeMatchType: ScopeMatch | undefined,
): string => {
	const clientId = policyScope?.clientId;

	if ("string" === typeof clientId) {
		return ScopeMatch.Exact === scopeMatchType
			? `@clientId:{${clientId}}`
			: `( @clientId:{${clientId}} | ismissing(@clientId) )`;
	}

	return ScopeMatch.Exact === scopeMatchType ? "ismissing(@clientId)" : "";
};

const getUserScopeQuery = (
	userScope: UserScope,
	scopeMatchType: ScopeMatch | undefined,
	matchingFieldsOnly: boolean,
): string => {
	let scopeEntries = Object.entries(userScope) as Array<
		[keyof UserScope, unknown]
	>;
	let scopeJoinType = " ";

	// skip fields with undefined values if in greedy mode and set operator to OR
	if (scopeMatchType === ScopeMatch.Greedy) {
		scopeEntries = scopeEntries.filter(
			([_, value]) => value !== undefined,
		) as Array<[keyof UserScope, unknown]>;
		scopeJoinType = " | ";
	}

	if (matchingFieldsOnly) {
		const scopeMap = new Map<keyof UserScope, unknown>(scopeEntries);

		// If numericIp is explicitly undefined, set both range fields to undefined
		if (scopeMap.has("numericIp") && scopeMap.get("numericIp") === undefined) {
			scopeMap.set("numericIpMaskMin", undefined);
			scopeMap.set("numericIpMaskMax", undefined);
		}

		// Ensure all expected fields are accounted for
		for (const name of Object.keys(userScopeSchema._def.schema) as Array<
			keyof UserScope
		>) {
			if (!scopeMap.has(name)) {
				scopeMap.set(name, undefined);
			}
		}

		scopeEntries = [...scopeMap.entries()];
	}

	const scopeObj = Object.fromEntries(scopeEntries) as Partial<UserScope>;

	return scopeEntries
		.map(([scopeFieldName, scopeFieldValue]) =>
			getUserScopeFieldQuery(
				scopeFieldName,
				scopeFieldValue,
				scopeMatchType,
				scopeObj,
			),
		)
		.filter(Boolean)
		.join(scopeJoinType);
};

const getUserScopeFieldQuery = (
	fieldName: keyof UserScope,
	fieldValue: unknown,
	matchType: ScopeMatch | undefined,
	fullScope: Partial<UserScope>, // <-- NEW ARG
): string => {
	if ("function" === typeof greedyFieldComparisons[fieldName]) {
		return greedyFieldComparisons[fieldName](fieldValue, fullScope);
	}

	if (fieldValue === undefined) {
		return `ismissing(@${fieldName})`;
	}

	return numericIndexFields.includes(fieldName)
		? `@${fieldName}:[${fieldValue}]`
		: `@${fieldName}:{${fieldValue}}`;
};
