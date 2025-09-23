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
import {
	type PolicyScope,
	getPolicyScopeRedisQuery,
	policyScopeRedisSchema,
} from "#policy/policyScope.js";
import {
	type AccessRulesFilter,
	ScopeMatch,
} from "#policy/storage/accessRulesStorage.js";
import { userAttributesRedisSchema } from "#policy/userScope/userAttributes.js";
import { userIpRedisSchema } from "#policy/userScope/userIp.js";
import {
	getUserScopeRedisQuery,
	userScopeRedisSchema,
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
		...policyScopeRedisSchema,
		...userScopeRedisSchema,
		groupId: { type: SCHEMA_FIELD_TYPE.TAG, INDEXMISSING: true },
	} satisfies Partial<Record<keyof AccessRule, object>>,
	// the satisfy statement is to guarantee that the keys are right
	options: {
		ON: "HASH" as const,
		PREFIX: [redisRuleKeyPrefix],
	},
};

const DEFAULT_SEARCH_LIMIT = 1000;

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

	const policyScopeQuery = getPolicyScopeRedisQuery(
		policyScope,
		filter.policyScopeMatch,
	);

	if (policyScopeQuery) {
		queryParts.push(policyScopeQuery);
	}

	if (userScope && Object.keys(userScope).length > 0) {
		const userScopeFilter = getUserScopeRedisQuery(
			userScope,
			filter.userScopeMatch,
			matchingFieldsOnly,
		);

		queryParts.push(`( ${userScopeFilter} )`);
	}

	return queryParts.length > 0 ? queryParts.join(" ") : "*";
};
