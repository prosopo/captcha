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

import type { AccessRule, PolicyScope, UserScope } from "#policy/rule.js";

export enum FilterScopeMatch {
	Exact = "exact",
	Greedy = "greedy",
}

export type AccessRulesFilter = {
	policyScope?: PolicyScope;
	/**
	 * Exact: "clientId" => client rules, "undefined" => global rules. Used by the API
	 * Greedy: "clientId" => client + global rules, "undefined" => any rules. Used by the Express middleware
	 */
	policyScopeMatch?: FilterScopeMatch;
	userScope?: UserScope;
	/**
	 * Exact: "clientId" => client rules, "undefined" => global rules. Used by the API
	 * Greedy: "clientId" => client + global rules, "undefined" => any rules. Used by the Express middleware
	 */
	userScopeMatch?: FilterScopeMatch;
	groupId?: string;
};

export type AccessRulesReader = {
	findRules(
		filter: AccessRulesFilter,
		matchingFieldsOnly?: boolean,
		skipEmptyUserScopes?: boolean,
	): Promise<AccessRule[]>;

	findRuleIds(
		filter: AccessRulesFilter,
		matchingFieldsOnly?: boolean,
	): Promise<string[]>;
};

export type AccessRulesWriter = {
	insertRule(
		rule: AccessRule,
		expirationTimestampSeconds?: number,
	): Promise<string>;

	deleteRules(ruleKeys: string[]): Promise<void>;

	deleteAllRules(): Promise<number>;
};

export type AccessRulesStorage = AccessRulesReader & AccessRulesWriter;
