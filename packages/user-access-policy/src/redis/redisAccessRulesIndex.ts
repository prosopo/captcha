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
	AccessPolicyMatch,
	type AccessPolicyScope,
	type AccessRule,
	type AccessRulesFilter,
} from "#policy/accessPolicy.js";
import { type RedisIndex, createRedisIndex } from "#policy/redis/redisIndex.js";

export const redisAccessRuleIndexName = "index:user-access-rules";
// names take space, so we use an acronym instead of the long-tailed one
export const redisAccessRuleKeyPrefix = "uar:";
const redisAccessRuleContentHashAlgorithm = "md5";

const redisAccessRulesIndex: RedisIndex = {
	name: redisAccessRuleIndexName,
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
		numericIpMaskMin: SCHEMA_FIELD_TYPE.NUMERIC,
		numericIpMaskMax: SCHEMA_FIELD_TYPE.NUMERIC,
		userId: SCHEMA_FIELD_TYPE.TAG,
		numericIp: SCHEMA_FIELD_TYPE.NUMERIC,
		ja4Hash: SCHEMA_FIELD_TYPE.TAG,
		headersHash: SCHEMA_FIELD_TYPE.TAG,
		userAgentHash: SCHEMA_FIELD_TYPE.TAG,
	} satisfies Partial<Record<keyof AccessRule, string | object>>,
	// the satisfy statement is to guarantee that the keys are right
	options: {
		ON: "HASH" as const,
		PREFIX: redisAccessRuleKeyPrefix,
	},
};

export const createRedisAccessRulesIndex = async (
	client: RedisClientType,
): Promise<void> => createRedisIndex(client, redisAccessRulesIndex);

export const redisAccessRuleSearchOptions: FtSearchOptions = {
	// #2 is a required option when the 'ismissing()' function is in the query body
	DIALECT: 2,
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
	rulesFilter: AccessRulesFilter,
): string => {
	const { policyScope } = rulesFilter;

	const ruleScopeFilter = getRuleScopeQuery(rulesFilter);

	if (policyScope && Object.keys(policyScope).length > 0) {
		const policyScopeFilter = getPolicyScopeQuery(
			policyScope,
			rulesFilter.policyScopeMatch,
		);

		return `${ruleScopeFilter} ( ${policyScopeFilter} )`;
	}

	return ruleScopeFilter ? ruleScopeFilter : "*";
};

const getRuleScopeQuery = (rulesFilter: AccessRulesFilter): string => {
	const { clientId, ruleScopeMatch } = rulesFilter;

	if ("string" === typeof clientId) {
		return AccessPolicyMatch.STRICT === ruleScopeMatch
			? `@clientId:{${clientId}}`
			: `( @clientId:{${clientId}} | ismissing(@clientId) )`;
	}

	return AccessPolicyMatch.STRICT === ruleScopeMatch
		? "ismissing(@clientId)"
		: "";
};

const getPolicyScopeQuery = (
	policyScope: AccessPolicyScope,
	policyScopeMatch: AccessPolicyMatch | undefined,
): string => {
	const scopeEntries = Object.entries(policyScope) as Array<
		[keyof AccessPolicyScope, unknown]
	>;

	const scopeJoinType =
		AccessPolicyMatch.STRICT === policyScopeMatch ? " " : " | ";

	return scopeEntries
		.map(([scopeFieldName, scopeFieldValue]) =>
			getPolicyScopeFieldQuery(scopeFieldName, scopeFieldValue),
		)
		.join(scopeJoinType);
};

const getPolicyScopeFieldQuery = (
	scopeFieldName: keyof AccessPolicyScope,
	scopeFieldValue: unknown,
): string => {
	type CustomScopeFieldComparisons = Record<
		keyof AccessPolicyScope,
		(value: unknown) => string
	>;

	const customFieldComparisons: Partial<CustomScopeFieldComparisons> = {
		numericIp: (value) =>
			`( @numericIp:[${value}] | ( @numericIpMaskMin:[-inf ${value}] @numericIpMaskMax:[${value} +inf] ) )`,
	};

	return "function" === typeof customFieldComparisons[scopeFieldName]
		? customFieldComparisons[scopeFieldName](scopeFieldValue)
		: `@${scopeFieldName}:{${scopeFieldValue}}`;
};

export const getRedisAccessRuleKey = (rule: AccessRule): string =>
	redisAccessRuleKeyPrefix +
	crypto
		.createHash(redisAccessRuleContentHashAlgorithm)
		.update(JSON.stringify(rule))
		.digest("hex");
