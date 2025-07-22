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

import crypto from "node:crypto";
import { type FtSearchOptions, SCHEMA_FIELD_TYPE } from "@redis/search";
import type { RedisClientType } from "redis";
import {
	type PolicyScope,
	type UserScope,
	userScopeSchema,
} from "#policy/accessPolicy.js";
import { type PolicyFilter, ScopeMatch } from "#policy/accessPolicyResolver.js";
import type { AccessRule } from "#policy/accessRules.js";
import { type RedisIndex, createRedisIndex } from "#policy/redis/redisIndex.js";

export const accessRulesRedisIndexName = "index:user-access-rules";
// names take space, so we use an acronym instead of the long-tailed one
export const accessRuleRedisKeyPrefix = "uar:";
const accessRuleContentHashAlgorithm = "md5";
const DEFAULT_SEARCH_LIMIT = 1000;

const accessRulesIndex: RedisIndex = {
	name: accessRulesRedisIndexName,
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
		PREFIX: [accessRuleRedisKeyPrefix],
	},
};

export const createRedisAccessRulesIndex = async (
	client: RedisClientType,
	indexName?: string,
): Promise<void> => {
	if (indexName) {
		accessRulesIndex.name = indexName;
	}
	return createRedisIndex(client, accessRulesIndex);
};

const numericIndexFields: Array<keyof AccessRule> = [
	"numericIp",
	"numericIpMaskMin",
	"numericIpMaskMax",
];

type CustomFieldComparisons = Record<
	keyof AccessRule,
	(value: unknown) => string
>;
const fieldDependencies: {
	[key in keyof UserScope]?: {
		exclude?: Array<keyof UserScope>;
		implies?: Array<keyof UserScope>;
	};
} = {
	numericIp: {
		exclude: ["numericIpMaskMin", "numericIpMaskMax"],
	},
	numericIpMaskMin: {
		exclude: ["numericIp"],
		implies: ["numericIpMaskMax"],
	},
	numericIpMaskMax: {
		exclude: ["numericIp"],
		implies: ["numericIpMaskMin"],
	},
};
const greedyFieldComparisons: Partial<CustomFieldComparisons> = {
	numericIp: (value) => {
		if (value !== undefined) {
			return `( @numericIp:[${value}] | ( @numericIpMaskMin:[-inf ${value}] @numericIpMaskMax:[${value} +inf] ) )`;
		}
		return "ismissing(@numericIp)";
	},
};

export const accessRulesRedisSearchOptions: FtSearchOptions = {
	// #2 is a required option when the 'ismissing()' function is in the query body
	DIALECT: 2,
};

export const accessRulesRedisDeleteOptions: FtSearchOptions = {
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
export const getRedisAccessRulesQuery = (
	filter: PolicyFilter,
	matchingFieldsOnly: boolean,
): string => {
	const { policyScope, userScope } = filter;

	const policyScopeFilter = getPolicyScopeQuery(
		policyScope,
		filter.policyScopeMatch,
	);

	if (userScope && Object.keys(userScope).length > 0) {
		const userScopeFilter = getUserScopeQuery(
			userScope,
			filter.userScopeMatch,
			matchingFieldsOnly,
		);
		return `${policyScopeFilter} ( ${userScopeFilter} )`;
	}

	return policyScopeFilter ? policyScopeFilter : "*";
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
		const presentFields = new Set(scopeEntries.map(([key]) => key));
		const addedFields = new Set<keyof UserScope>();

		for (const name of Object.keys(userScopeSchema.shape) as Array<
			keyof UserScope
		>) {
			if (presentFields.has(name)) continue;

			// Respect dependencies
			const deps = fieldDependencies[name];

			// If any of its 'exclude' fields are present, skip this one
			if (deps?.exclude?.some((excluded) => presentFields.has(excluded))) {
				continue;
			}

			// If it's implied by another field (e.g., max implies min), and that field is present, add this
			if (deps?.implies?.some((impliedBy) => presentFields.has(impliedBy))) {
				scopeEntries.push([name, undefined]);
				addedFields.add(name);
				continue;
			}

			// If none of the conditions above apply, mark it undefined
			scopeEntries.push([name, undefined]);
			addedFields.add(name);
		}
	}

	return scopeEntries
		.map(([scopeFieldName, scopeFieldValue]) =>
			getUserScopeFieldQuery(scopeFieldName, scopeFieldValue, scopeMatchType),
		)
		.join(scopeJoinType);
};

const getUserScopeFieldQuery = (
	fieldName: keyof UserScope,
	fieldValue: unknown,
	matchType: ScopeMatch | undefined,
): string => {
	if (
		//ScopeMatch.Greedy === matchType &&
		"function" === typeof greedyFieldComparisons[fieldName]
	) {
		return greedyFieldComparisons[fieldName](fieldValue);
	}

	if (fieldValue === undefined) {
		return `ismissing(@${fieldName})`;
	}

	return numericIndexFields.includes(fieldName)
		? `@${fieldName}:[${fieldValue}]`
		: `@${fieldName}:{${fieldValue}}`;
};

export const getRedisAccessRuleKey = (rule: AccessRule): string =>
	accessRuleRedisKeyPrefix +
	crypto
		.createHash(accessRuleContentHashAlgorithm)
		.update(
			JSON.stringify(rule, (key, value) =>
				// JSON.stringify can't handle BigInt itself: throws "Do not know how to serialize a BigInt"
				"bigint" === typeof value ? value.toString() : value,
			),
		)
		.digest("hex");

export const getRedisAccessRuleValue = (
	rule: AccessRule,
): Record<string, string> =>
	Object.fromEntries(
		Object.entries(rule).map(([key, value]) => [key, String(value)]),
	);
