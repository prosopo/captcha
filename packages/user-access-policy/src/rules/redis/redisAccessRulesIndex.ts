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
import type { AccessPolicyScope } from "#policy/accessPolicy.js";
import type { AccessRule } from "#policy/rules/accessRule.js";
import {
	type RedisIndex,
	createRedisIndex,
} from "#policy/rules/redis/redisIndex.js";

export const accessRuleIndexName = "index:user-access-rules";
// names take space, so we use an acronym instead of the long-tailed one
export const accessRuleKeyPrefix = "uar:";
const accessRuleContentHashAlgorithm = "md5";

const accessRulesIndex: RedisIndex = {
	name: accessRuleIndexName,
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
		userId: SCHEMA_FIELD_TYPE.TAG,
		ip: SCHEMA_FIELD_TYPE.NUMERIC,
		ja4Hash: SCHEMA_FIELD_TYPE.TAG,
		headersHash: SCHEMA_FIELD_TYPE.TAG,
		userAgentHash: SCHEMA_FIELD_TYPE.TAG,
	} satisfies Partial<Record<keyof AccessRule, string | object>>,
	// the satisfy statement is to guarantee that the keys are right
	options: {
		ON: "HASH" as const,
		PREFIX: accessRuleKeyPrefix,
	},
};

export const createAccessRulesIndex = async (
	client: RedisClientType,
): Promise<void> => createRedisIndex(client, accessRulesIndex);

export const accessRuleSearchOptions: FtSearchOptions = {
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
export const getAccessRulesQuery = (policyScope: AccessPolicyScope): string => {
	const { clientId, userAttributes } = policyScope;

	const clientIdFilter =
		"string" === typeof clientId
			? // when clientId is set, we look among his + "global" rules.
				`( @clientId:${clientId}) | ismissing(@clientId) )`
			: // when clientId is not set, we look among "global" only rules.
				"ismissing(@clientId)";

	if (userAttributes && Object.keys(userAttributes).length > 0) {
		const userAttributesFilter = Object.entries(userAttributes)
			.map(([field, value]) => getUserAttributeQuery(field, value))
			// to support a partial user attribute match join by the logical "OR"
			.join(" | ");

		return `${clientIdFilter} ( ${userAttributesFilter} )`;
	}

	return clientIdFilter;
};

const getUserAttributeQuery = (field: string, value: unknown): string => {
	type CustomAttribute = Record<string, (value: unknown) => string>;

	const customAttributes: CustomAttribute = {
		ip: (value) =>
			`( @ip:[${value}] | ( @ipRangeMin:[-inf ${value}] @ipRangeMax:[${value} +inf] ) )`,
	};

	return "function" === typeof customAttributes[field]
		? customAttributes[field](value)
		: `@${field}:{${value}}`;
};

export const getAccessRuleKey = (rule: AccessRule): string =>
	accessRuleKeyPrefix +
	crypto
		.createHash(accessRuleContentHashAlgorithm)
		.update(JSON.stringify(rule))
		.digest("hex");
