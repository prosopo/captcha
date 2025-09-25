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

import type { ApiRoute, ApiRoutesProvider } from "@prosopo/api-route";
import type { Logger } from "@prosopo/common";
import type { AccessRulesStorage } from "#policy/accessRulesStorage.js";
import { FindRuleIdsEndpoint } from "#policy/api/endpoints/findRuleIds.js";
import { DeleteAllRulesEndpoint } from "./endpoints/deleteAllRules.js";
import { DeleteRuleGroupsEndpoint } from "./endpoints/deleteRuleGroups.js";
import { DeleteRulesEndpoint } from "./endpoints/deleteRules.js";
import { InsertRulesEndpoint } from "./endpoints/insertRules.js";

export enum accessRuleApiPaths {
	FIND_IDS = "/v1/prosopo/user-access-policy/rules/find-ids",
	INSERT_MANY = "/v1/prosopo/user-access-policy/rules/insert-many",
	DELETE_MANY = "/v1/prosopo/user-access-policy/rules/delete-many",
	DELETE_GROUPS = "/v1/prosopo/user-access-policy/rules/delete-groups",
	DELETE_ALL = "/v1/prosopo/user-access-policy/rules/delete-all",
}

type RuleApiPath = `${accessRuleApiPaths}`;

export class AccessRuleApiRoutes implements ApiRoutesProvider {
	public constructor(
		private readonly accessRulesStorage: AccessRulesStorage,
		private readonly logger: Logger,
	) {}

	public getRoutes(): ApiRoute[] {
		return [
			{
				path: accessRuleApiPaths.FIND_IDS,
				endpoint: new FindRuleIdsEndpoint(this.accessRulesStorage, this.logger),
			},
			{
				path: accessRuleApiPaths.INSERT_MANY,
				endpoint: new InsertRulesEndpoint(this.accessRulesStorage, this.logger),
			},
			{
				path: accessRuleApiPaths.DELETE_MANY,
				endpoint: new DeleteRulesEndpoint(this.accessRulesStorage, this.logger),
			},
			{
				path: accessRuleApiPaths.DELETE_GROUPS,
				endpoint: new DeleteRuleGroupsEndpoint(
					this.accessRulesStorage,
					this.logger,
				),
			},
			{
				path: accessRuleApiPaths.DELETE_ALL,
				endpoint: new DeleteAllRulesEndpoint(
					this.accessRulesStorage,
					this.logger,
				),
			},
		] satisfies Array<{ path: RuleApiPath; [key: string]: unknown }>;
	}
}

export const getExpressApiRuleRateLimits = () => {
	const defaultWindowsMs = 60000;
	const defaultLimit = 5;

	return {
		[accessRuleApiPaths.FIND_IDS]: {
			windowMs:
				getIntEnvironmentVariable(
					"PROSOPO_USER_ACCESS_POLICY_RULE_FIND_IDS_WINDOW",
				) || defaultWindowsMs,
			limit:
				getIntEnvironmentVariable(
					"PROSOPO_USER_ACCESS_POLICY_RULE_FIND_IDS_LIMIT",
				) || defaultLimit,
		},
		[accessRuleApiPaths.INSERT_MANY]: {
			windowMs:
				getIntEnvironmentVariable(
					"PROSOPO_USER_ACCESS_POLICY_RULE_INSERT_MANY_WINDOW",
				) || defaultWindowsMs,
			limit:
				getIntEnvironmentVariable(
					"PROSOPO_USER_ACCESS_POLICY_RULE_INSERT_MANY_LIMIT",
				) || defaultLimit,
		},
		[accessRuleApiPaths.DELETE_MANY]: {
			windowMs:
				getIntEnvironmentVariable(
					"PROSOPO_USER_ACCESS_POLICY_RULE_DELETE_MANY_WINDOW",
				) || defaultWindowsMs,
			limit:
				getIntEnvironmentVariable(
					"PROSOPO_USER_ACCESS_POLICY_RULE_DELETE_MANY_LIMIT",
				) || defaultLimit,
		},
		[accessRuleApiPaths.DELETE_GROUPS]: {
			windowMs:
				getIntEnvironmentVariable(
					"PROSOPO_USER_ACCESS_POLICY_RULE_DELETE_GROUPS_WINDOW",
				) || defaultWindowsMs,
			limit:
				getIntEnvironmentVariable(
					"PROSOPO_USER_ACCESS_POLICY_RULE_DELETE_GROUPS_LIMIT",
				) || defaultLimit,
		},
		[accessRuleApiPaths.DELETE_ALL]: {
			windowMs:
				getIntEnvironmentVariable(
					"PROSOPO_USER_ACCESS_POLICY_RULE_DELETE_ALL_WINDOW",
				) || defaultWindowsMs,
			limit:
				getIntEnvironmentVariable(
					"PROSOPO_USER_ACCESS_POLICY_RULE_DELETE_ALL_LIMIT",
				) || defaultLimit,
		},
	} satisfies Record<RuleApiPath, Record<string, number>>;
};

const getIntEnvironmentVariable = (
	variableName: string,
): number | undefined => {
	const variableValue = process.env[variableName];

	const numericValue = variableValue
		? Number.parseInt(variableValue)
		: Number.NaN;

	return Number.isInteger(numericValue) ? numericValue : undefined;
};
