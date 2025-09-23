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
import { type RediSearchSchema, SCHEMA_FIELD_TYPE } from "@redis/search";
import type { SchemaDefinition } from "mongoose";
import { ZodEffects, type ZodType, z } from "zod";
import {
	type AccessPolicy,
	accessPolicyMongooseSchema,
	accessPolicySchema,
} from "./accessPolicy.js";
import type { AccessRulesFilter } from "./accessRulesStorage.js";
import {
	type PolicyScope,
	getPolicyScopeRedisQuery,
	policyScopeMongooseSchema,
	policyScopeRedisSchema,
	policyScopeSchema,
} from "./policyScope.js";
import {
	type UserScope,
	type UserScopeRecord,
	getUserScopeRedisQuery,
	userScopeMongooseSchema,
	userScopeRedisSchema,
	userScopeSchema,
} from "./userScope/userScope.js";

// flat structure is used to fit the Redis requirements
export type AccessRule = AccessPolicy &
	PolicyScope &
	UserScope & {
		groupId?: string;
	};

export type AccessRuleRecord = AccessPolicy &
	PolicyScope &
	UserScopeRecord & {
		ruleGroupId?: string;
	};

const accessRuleInputSchema = z
	.object({
		...accessPolicySchema.shape,
		...policyScopeSchema.shape,
		groupId: z.coerce.string().optional(),
		ruleGroupId: z.coerce.string().optional(),
	})
	.and(userScopeSchema)
	.transform(
		// transform is used for type safety only - plain "satisfies ZodType<x>" doesn't work after ".and()"
		(accessRuleInput): AccessRule & AccessRuleRecord => accessRuleInput,
	);

export const accessRuleSchema: ZodType<AccessRule> =
	accessRuleInputSchema.transform((inputRule): AccessRule => {
		// this line creates a new "rule", without ruleGroupId
		const { ruleGroupId, ...rule } = inputRule;

		if ("string" === typeof ruleGroupId) {
			rule.groupId = ruleGroupId;
		}

		return rule;
	});

// this function applies all the Zod scheme transformations, so .userAgent becomes .userAgentHash and so on.
export const transformAccessRuleRecordIntoRule = (
	ruleRecord: AccessRuleRecord,
): AccessRule => accessRuleSchema.parse(ruleRecord);

export const accessRuleMongooseSchema: SchemaDefinition<AccessRuleRecord> = {
	...accessPolicyMongooseSchema,
	...policyScopeMongooseSchema,
	...userScopeMongooseSchema,
	ruleGroupId: { type: String, required: false },
};

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
} satisfies Partial<Record<keyof AccessRule, object>>;

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
export const getAccessRuleRedisQuery = (
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

const RULE_HASH_ALGORITHM = "md5";

export const makeAccessRuleHash = (rule: AccessRule): string =>
	crypto
		.createHash(RULE_HASH_ALGORITHM)
		.update(
			JSON.stringify(rule, (key, value) =>
				// JSON.stringify can't handle BigInt itself: throws "Do not know how to serialize a BigInt"
				"bigint" === typeof value ? value.toString() : value,
			),
		)
		.digest("hex");
