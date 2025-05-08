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

import { z } from "zod";
import {
	accessPolicySchema,
	accessPolicyScopeSchema,
} from "#policy/accessPolicy.js";

export const accessRuleScopeSchema = z.object({
	clientId: z.string().optional(),
});

export const accessRuleSchema = z.object({
	// flat structure is used to fit the Redis requirements
	...accessRuleScopeSchema.shape,
	...accessPolicySchema.shape,
	...accessPolicyScopeSchema.shape,
});

export enum AccessRuleMatchType {
	EXACT = "exact",
	GREEDY = "greedy",
}

export const accessRuleFilterSchema = z.object({
	ruleScope: accessRuleScopeSchema.optional(),
	policyScope: accessPolicyScopeSchema.optional(),
	/**
	 * exact: "clientId" => client rules, "undefined" => global rules. Used by the API
	 * greedy: "clientId" => client + global rules, "undefined" => any rules. Used by the Express middleware
	 */
	ruleScopeMatch: z
		.nativeEnum(AccessRuleMatchType)
		.default(AccessRuleMatchType.EXACT)
		.optional(),
	/**
	 * exact: finds rules where all the given fields matches. Used by the API
	 * greedy: finds rules where any of the given fields match. Used by the Express middleware
	 */
	policyScopeMatch: z
		.nativeEnum(AccessRuleMatchType)
		.default(AccessRuleMatchType.EXACT)
		.optional(),
});

export type AccessRule = z.infer<typeof accessRuleSchema>;
export type AccessRuleScope = z.infer<typeof accessRuleScopeSchema>;
export type AccessRuleFilter = z.infer<typeof accessRuleFilterSchema>;
