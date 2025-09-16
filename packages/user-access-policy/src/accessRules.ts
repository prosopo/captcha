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
import { z } from "zod";
import {
	accessPolicySchema,
	policyScopeSchema,
	userScopeInputSchema,
	userScopeSchema,
} from "#policy/accessPolicy.js";
import type { PolicyFilter } from "#policy/accessPolicyResolver.js";

export const accessRuleSchema: z.ZodObject<
	typeof accessPolicySchema.shape &
		typeof policyScopeSchema.shape &
		typeof userScopeSchema.shape
> = z.object({
	// flat structure is used to fit the Redis requirements
	...accessPolicySchema.shape,
	...policyScopeSchema.shape,
	...userScopeSchema.shape,
});

export type AccessRule = z.infer<typeof accessRuleSchema>;

export const accessRuleSchemaExtended = z
	.object({
		// flat structure is used to fit the Redis requirements
		...accessPolicySchema.shape,
		...policyScopeSchema.shape,
		...userScopeInputSchema._def.schema.shape,
	})
	.omit({
		numericIp: true,
		numericIpMaskMin: true,
		numericIpMaskMax: true,
	});
export type AccessRuleExtended = z.input<typeof accessRuleSchemaExtended>;

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

/**
 * This function allows getting the exact same rule on the AWS side from the ExtendedRule, as on the provider one.
 * It's necessary to have the same rule hash everywhere.
 */
export const transformExtendedRuleIntoAccessRule = (
	extendedRule: AccessRuleExtended,
): AccessRule => {
	// turn ip:string into numericIp:number and make other scope transformations
	const userScope = userScopeInputSchema.parse(extendedRule);

	const ruleFields = { ...extendedRule, ...userScope };

	// get rid of the unused extended fields
	return accessRuleSchema.parse(ruleFields);
};

export type AccessRulesReader = {
	findRules(
		filter: PolicyFilter,
		matchingFieldsOnly?: boolean,
		skipEmptyUserScopes?: boolean,
	): Promise<AccessRule[]>;

	findRuleIds(
		filter: PolicyFilter,
		matchingFieldsOnly?: boolean,
	): Promise<string[]>;
};

export type AccessRulesWriter = {
	insertRule(
		rule: AccessRule,
		expirationTimestampSeconds?: number,
	): Promise<string>;

	deleteRules(ruleIds: string[]): Promise<void>;

	deleteAllRules(): Promise<number>;
};

export type AccessRulesStorage = AccessRulesReader & AccessRulesWriter;
