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

import { type ZodType, type ZodTypeAny, z } from "zod";
import type { AccessPolicy, AccessRule, PolicyScope } from "#policy/rule.js";
import {
	type AccessRulesFilter,
	FilterScopeMatch,
} from "#policy/rulesStorage.js";
import { accessPolicyInput, policyScopeInput } from "./policyInput.js";
import {
	type UserScopeInput,
	userScopeInput,
	userScopeSchema,
} from "./userScopeInput.js";

export type AccessRuleInput = AccessPolicy &
	PolicyScope &
	UserScopeInput & {
		groupId?: string;
		ruleGroupId?: string;
	};

export const accessRuleInput: ZodType<AccessRule> = z
	.object({
		...accessPolicyInput.shape,
		...policyScopeInput.shape,
		groupId: z.coerce.string().optional(),
		ruleGroupId: z.coerce.string().optional(),
	})
	.and(userScopeInput)
	.transform((ruleInput: AccessRuleInput): AccessRule => {
		// extract ruleGroupId
		const { ruleGroupId, ...rule } = ruleInput;

		if ("string" === typeof ruleGroupId) {
			rule.groupId = ruleGroupId;
		}

		return rule;
	});

export type AccessRulesFilterInput = AccessRulesFilter & {
	userScope?: UserScopeInput;
};

export const accessRulesFilterInput = z.object({
	policyScope: policyScopeInput.optional(),
	policyScopeMatch: z
		.nativeEnum(FilterScopeMatch)
		.default(FilterScopeMatch.Exact),
	userScope: userScopeInput.optional(),
	userScopeMatch: z
		.nativeEnum(FilterScopeMatch)
		.default(FilterScopeMatch.Exact),
	groupId: z.string().optional(),
}) satisfies ZodType<AccessRulesFilter>;
