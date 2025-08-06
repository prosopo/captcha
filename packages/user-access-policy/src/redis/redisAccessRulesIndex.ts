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

export const numericIndexFields: Array<keyof AccessRule> = [
	"numericIp",
	"numericIpMaskMin",
	"numericIpMaskMax",
];

export const accessRulesRedisSearchOptions: FtSearchOptions = {
	// #2 is a required option when the 'ismissing()' function is in the query body
	DIALECT: 2,
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
