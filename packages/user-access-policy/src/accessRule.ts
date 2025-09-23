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
import mongoose from "mongoose";
import { z } from "zod";
import {
	type AccessPolicy,
	accessPolicyMongooseSchema,
	accessPolicySchema,
} from "./accessPolicy.js";
import {
	type PolicyScope,
	policyScopeMongooseSchema,
	policyScopeSchema,
} from "./policyScope.js";
import {
	type UserScope,
	type UserScopeRecord,
	userScopeMongooseSchema,
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

export const accessRuleSchema = accessRuleInputSchema.transform(
	(inputRule): AccessRule => {
		// this line creates a new "rule", without ruleGroupId
		const { ruleGroupId, ...rule } = inputRule;

		if ("string" === typeof ruleGroupId) {
			rule.groupId = ruleGroupId;
		}

		return rule;
	},
);

export const accessRuleMongooseSchema = new mongoose.Schema<AccessRuleRecord>({
	...accessPolicyMongooseSchema.obj,
	...policyScopeMongooseSchema.obj,
	...userScopeMongooseSchema.obj,
	ruleGroupId: { type: String, required: false },
});

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

// this function applies all the Zod scheme transformations, so .userAgent becomes .userAgentHash and so on.
export const transformAccessRuleRecordIntoRule = (
	ruleRecord: AccessRuleRecord,
): AccessRule => accessRuleSchema.parse(ruleRecord);
