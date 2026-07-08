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

import type { AllKeys } from "@prosopo/common";
import { type ZodType, z } from "zod";
import type { AccessPolicy, AccessRule, PolicyScope } from "#policy/rule.js";
import {
	type AccessRuleEntry,
	type AccessRulesFilter,
	FilterScopeMatch,
} from "#policy/rulesStorage.js";
import { accessPolicyInput, policyScopeInput } from "./policyInput.js";
import { type UserScopeInput, userScopeInput } from "./userScopeInput.js";

type RuleGroupInput = {
	groupId?: string;
	ruleGroupId?: string;
};

export type AccessRuleInput = AccessPolicy &
	PolicyScope &
	UserScopeInput &
	RuleGroupInput;

const ruleGroupInput = z
	.object({
		groupId: z.coerce.string().optional(),
		ruleGroupId: z.coerce.string().optional(),
	} satisfies AllKeys<RuleGroupInput>)
	.transform((ruleGroupInput: RuleGroupInput) => {
		const { ruleGroupId, ...ruleGroup } = ruleGroupInput;

		if ("string" === typeof ruleGroupId) {
			ruleGroup.groupId = ruleGroupId;
		}

		return ruleGroup;
	});

// Explicit `ZodType<…, ZodTypeDef, unknown>` annotation rather than the
// strict-identity form because `accessPolicyInput.shape.deferToVerify`
// uses `z.preprocess` which widens the input position to `unknown`. The
// relaxed annotation is portable for declaration emit; the `transform`
// pins the OUTPUT to AccessRule.
export const accessRuleInput: ZodType<AccessRule, z.ZodTypeDef, unknown> = z
	.object({
		...accessPolicyInput.shape,
		...policyScopeInput.shape,
	})
	.and(userScopeInput)
	.and(ruleGroupInput)
	.transform((ruleInput: AccessRuleInput): AccessRule => ruleInput);

export const ruleEntryInput: ZodType<AccessRuleEntry, z.ZodTypeDef, unknown> =
	z.object({
		rule: accessRuleInput,
		expiresUnixTimestamp: z.coerce.number().optional(),
	} satisfies AllKeys<AccessRuleEntry>);

export type AccessRulesFilterInput = AccessRulesFilter & {
	userScope?: UserScopeInput;
	policyScopes?: PolicyScope[];
};

// `satisfies ZodType<AccessRulesFilterInput>` is intentionally omitted:
// `policyScopeInput.clientId` uses `z.preprocess` to unwrap the Redis
// `global` sentinel, which widens the input type to `unknown`. The
// output type is still `AccessRulesFilterInput` (Zod's `_output`); the
// downstream `DeleteRulesSchema` / `FindRulesSchema` use the relaxed
// `ZodType<T, ZodTypeDef, unknown>` form for the same reason.
export const accessRulesFilterInput = z.object({
	policyScope: policyScopeInput.optional(),
	policyScopes: z.array(policyScopeInput).optional(),
	policyScopeMatch: z
		.nativeEnum(FilterScopeMatch)
		.default(FilterScopeMatch.Exact),
	userScope: userScopeInput.optional(),
	userScopeMatch: z
		.nativeEnum(FilterScopeMatch)
		.default(FilterScopeMatch.Exact),
	groupId: z.string().optional(),
	blockOnly: z.boolean().optional(),
} satisfies AllKeys<AccessRulesFilterInput>);

export const getAccessRuleFiltersFromInput = (
	filterInput: AccessRulesFilterInput,
): AccessRulesFilter[] => {
	const { policyScopes, policyScope, ...filterBase } = filterInput;

	const allPolicyScopes = policyScopes || [];

	if (policyScope) {
		allPolicyScopes.push(policyScope);
	}

	if (allPolicyScopes.length > 0) {
		return allPolicyScopes.map((policyScope) => ({
			...filterBase,
			policyScope,
		}));
	}

	return [filterBase];
};
