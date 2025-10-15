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

import type {
	ApiRouteLimits,
	ApiRoutes,
	ApiRoutesProvider,
} from "@prosopo/api-route";
import type { AllEnumValues, Logger } from "@prosopo/common";
import { FetchRulesEndpoint } from "#policy/api/read/fetchRules.js";
import { FindRuleIdsEndpoint } from "#policy/api/read/findRuleIds.js";
import { GetMissingIdsEndpoint } from "#policy/api/read/getMissingIds.js";
import { RehashRulesEndpoint } from "#policy/api/write/rehashRules.js";
import type { AccessRulesStorage } from "#policy/rulesStorage.js";
import { DeleteAllRulesEndpoint } from "./delete/deleteAllRules.js";
import { DeleteRuleGroupsEndpoint } from "./delete/deleteRuleGroups.js";
import { DeleteRulesEndpoint } from "./delete/deleteRules.js";
import { InsertRulesEndpoint } from "./write/insertRules.js";

export enum accessRuleApiPaths {
	// delete
	DELETE_ALL = "/v1/prosopo/user-access-policy/rules/delete-all",
	DELETE_GROUPS = "/v1/prosopo/user-access-policy/rules/delete-groups",
	DELETE_MANY = "/v1/prosopo/user-access-policy/rules/delete-many",
	// read
	FETCH_MANY = "/v1/prosopo/user-access-policy/rules/fetch-many",
	FIND_IDS = "/v1/prosopo/user-access-policy/rules/find-ids",
	GET_MISSING_IDS = "/v1/prosopo/user-access-policy/rules/get-missing-ids",
	// write
	INSERT_MANY = "/v1/prosopo/user-access-policy/rules/insert-many",
	REHASH_ALL = "/v1/prosopo/user-access-policy/rules/rehash-all",
}

export class AccessRuleApiRoutes implements ApiRoutesProvider {
	public constructor(
		private readonly accessRulesStorage: AccessRulesStorage,
		private readonly logger: Logger,
	) {}

	public getRoutes(): ApiRoutes {
		return {
			...this.makeDeleteEndpoints(),
			...this.makeReadEndpoints(),
			...this.makeWriteEndpoints(),
		} satisfies AllEnumValues<accessRuleApiPaths>;
	}

	protected makeDeleteEndpoints() {
		return {
			[accessRuleApiPaths.DELETE_ALL]: new DeleteAllRulesEndpoint(
				this.accessRulesStorage,
				this.logger,
			),
			[accessRuleApiPaths.DELETE_GROUPS]: new DeleteRuleGroupsEndpoint(
				this.accessRulesStorage,
				this.logger,
			),
			[accessRuleApiPaths.DELETE_MANY]: new DeleteRulesEndpoint(
				this.accessRulesStorage,
				this.logger,
			),
		};
	}

	protected makeReadEndpoints() {
		return {
			[accessRuleApiPaths.FETCH_MANY]: new FetchRulesEndpoint(
				this.accessRulesStorage,
				this.logger,
			),
			[accessRuleApiPaths.FIND_IDS]: new FindRuleIdsEndpoint(
				this.accessRulesStorage,
				this.logger,
			),
			[accessRuleApiPaths.GET_MISSING_IDS]: new GetMissingIdsEndpoint(
				this.accessRulesStorage,
				this.logger,
			),
		};
	}

	protected makeWriteEndpoints() {
		return {
			[accessRuleApiPaths.INSERT_MANY]: new InsertRulesEndpoint(
				this.accessRulesStorage,
				this.logger,
			),
			[accessRuleApiPaths.REHASH_ALL]: new RehashRulesEndpoint(
				this.accessRulesStorage,
				this.logger,
			),
		};
	}
}

export const getExpressApiRuleRateLimits =
	(): ApiRouteLimits<accessRuleApiPaths> => {
		const defaults = {
			limit: 5,
			windowSeconds: 60,
		};

		const defaultWindowMs = defaults.windowSeconds * 1_000;

		const rateLimitEntries = Object.entries(accessRuleApiPaths).map(
			([endpointName, endpointPath]) => [
				endpointPath,
				{
					windowMs:
						getIntEnvironmentVariable(
							`PROSOPO_USER_ACCESS_POLICY_RULE_${endpointName}_WINDOW`,
						) || defaultWindowMs,
					limit:
						getIntEnvironmentVariable(
							`PROSOPO_USER_ACCESS_POLICY_RULE_${endpointName}_LIMIT`,
						) || defaults.limit,
				},
			],
		);

		return Object.fromEntries(rateLimitEntries);
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
