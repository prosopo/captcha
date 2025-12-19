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
		// Explicitly check and prioritize groupId over ruleGroupId
		const groupId = ruleGroupInput.groupId;
		const ruleGroupId = ruleGroupInput.ruleGroupId;
		
		const { ruleGroupId: _, groupId: __, ...ruleGroup } = ruleGroupInput;

		// Prioritize groupId over ruleGroupId - if both are provided, use groupId
		if ("string" === typeof groupId) {
			ruleGroup.groupId = groupId;
		} else if ("string" === typeof ruleGroupId) {
			ruleGroup.groupId = ruleGroupId;
		}

		return ruleGroup;
	});

export const accessRuleInput: ZodType<AccessRule> = z
	.object({
		...accessPolicyInput.shape,
		...policyScopeInput.shape,
	})
	.and(userScopeInput)
	.and(ruleGroupInput)
	// transform is used for type safety only - plain "satisfies ZodType<x>" doesn't work after ".and()"
	.transform((ruleInput: AccessRuleInput): AccessRule => ruleInput);

export const ruleEntryInput = z.object({
	rule: accessRuleInput,
	expiresUnixTimestamp: z.coerce.number().optional(),
} satisfies AllKeys<AccessRuleEntry>) satisfies ZodType<AccessRuleEntry>;

export type AccessRulesFilterInput = AccessRulesFilter & {
	userScope?: UserScopeInput;
	policyScopes?: PolicyScope[];
};

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
} satisfies AllKeys<AccessRulesFilterInput>) satisfies ZodType<AccessRulesFilterInput>;

export const getAccessRuleFiltersFromInput = (
	filterInput: AccessRulesFilterInput,
): AccessRulesFilter[] => {
	const { policyScopes, policyScope, ...filterBase } = filterInput;

	const allPolicyScopes: PolicyScope[] = [];

	// Add policyScope first if provided
	if (policyScope) {
		allPolicyScopes.push(policyScope);
	}

	// Then add policyScopes if provided
	if (policyScopes) {
		allPolicyScopes.push(...policyScopes);
	}

	if (allPolicyScopes.length > 0) {
		return allPolicyScopes.map((policyScope) => ({
			...filterBase,
			policyScope,
		}));
	}

	return [filterBase];
};
