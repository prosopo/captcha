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

import z, { type ZodType } from "zod";
import type { AccessRule } from "#policy/rules/accessRule.js";
import {
	type PolicyScope,
	policyScopeSchema,
} from "#policy/rules/policyScope.js";
import { type UserIp, userScopeInputSchema } from "#policy/rules/userIp.js";

export enum ScopeMatch {
	Exact = "exact",
	Greedy = "greedy",
}

export type PolicyFilter = {
	policyScope?: PolicyScope;
	/**
	 * Exact: "clientId" => client rules, "undefined" => global rules. Used by the API
	 * Greedy: "clientId" => client + global rules, "undefined" => any rules. Used by the Express middleware
	 */
	policyScopeMatch?: ScopeMatch;
	userScope?: UserIp;
	/**
	 * Exact: "clientId" => client rules, "undefined" => global rules. Used by the API
	 * Greedy: "clientId" => client + global rules, "undefined" => any rules. Used by the Express middleware
	 */
	userScopeMatch?: ScopeMatch;
	groupId?: string;
};

export const policyFilterSchema = z.object({
	policyScope: policyScopeSchema.optional(),
	policyScopeMatch: z.nativeEnum(ScopeMatch).default(ScopeMatch.Exact),
	userScope: userScopeInputSchema.optional(),
	userScopeMatch: z.nativeEnum(ScopeMatch).default(ScopeMatch.Exact),
	groupId: z.string().optional(),
}) satisfies ZodType<PolicyFilter>;

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
