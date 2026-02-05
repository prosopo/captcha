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

import type { AllKeys, Keys } from "@prosopo/common";
import type { RedisIndex } from "@prosopo/redis-client";
import { type RediSearchSchema, SCHEMA_FIELD_TYPE } from "@redis/search";
import type {
	AccessRule,
	PolicyScope,
	UserAttributes,
	UserIp,
	UserScope,
} from "#policy/rule.js";
import { makeAccessRuleHash } from "#policy/transformRule.js";

export const userIpRedisSchema: RediSearchSchema = {
	numericIpMaskMin: { type: SCHEMA_FIELD_TYPE.NUMERIC, INDEXMISSING: true },
	numericIpMaskMax: { type: SCHEMA_FIELD_TYPE.NUMERIC, INDEXMISSING: true },
	numericIp: { type: SCHEMA_FIELD_TYPE.NUMERIC, INDEXMISSING: true },
} satisfies AllKeys<UserIp>;

export const userAttributesRedisSchema: RediSearchSchema = {
	userId: { type: SCHEMA_FIELD_TYPE.TAG, INDEXMISSING: true },
	ja4Hash: { type: SCHEMA_FIELD_TYPE.TAG, INDEXMISSING: true },
	headersHash: { type: SCHEMA_FIELD_TYPE.TAG, INDEXMISSING: true },
	userAgentHash: { type: SCHEMA_FIELD_TYPE.TAG, INDEXMISSING: true },
	headHash: { type: SCHEMA_FIELD_TYPE.TAG, INDEXMISSING: true },
	// Use pipe separator for coords since JSON strings contain commas
	coords: { type: SCHEMA_FIELD_TYPE.TAG, INDEXMISSING: true, SEPARATOR: "|" },
	countryCode: { type: SCHEMA_FIELD_TYPE.TAG, INDEXMISSING: true },
} satisfies AllKeys<UserAttributes>;

export const userScopeRedisSchema: RediSearchSchema = {
	...userAttributesRedisSchema,
	...userIpRedisSchema,
} satisfies Keys<UserScope>;

export const policyScopeRedisSchema: RediSearchSchema = {
	clientId: {
		type: SCHEMA_FIELD_TYPE.TAG,
		INDEXMISSING: true,
	},
} satisfies AllKeys<PolicyScope>;

/**
 * Note on the field type decision
 *
 * TAG is designed for the exact value matching
 * TEXT is designed for the word-based and pattern matching
 *
 * For our goal TAG fits perfectly and, more performant
 */
export const accessRuleRedisSchema: RediSearchSchema = {
	...policyScopeRedisSchema,
	...userScopeRedisSchema,
	groupId: { type: SCHEMA_FIELD_TYPE.TAG, INDEXMISSING: true },
} satisfies Keys<AccessRule>;

export const ACCESS_RULES_REDIS_INDEX_NAME = "index:user-access-rules";

// names take space, so we use an acronym instead of the long-tailed one
export const ACCESS_RULE_REDIS_KEY_PREFIX = "uar:";

export const accessRulesRedisIndex: RedisIndex = {
	name: ACCESS_RULES_REDIS_INDEX_NAME,
	schema: accessRuleRedisSchema,
	options: {
		ON: "HASH" as const,
		PREFIX: [ACCESS_RULE_REDIS_KEY_PREFIX],
	},
};

export const getAccessRuleRedisKey = (rule: AccessRule): string =>
	ACCESS_RULE_REDIS_KEY_PREFIX + makeAccessRuleHash(rule);
