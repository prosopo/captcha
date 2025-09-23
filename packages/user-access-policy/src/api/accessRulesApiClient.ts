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

import { ApiClient } from "@prosopo/api";
import type { ApiResponse } from "@prosopo/types";
import { accessRuleApiPaths } from "./accessRuleApiRoutes.js";
import type { SiteGroups } from "./endpoints/deleteRuleGroupsEndpoint.js";
import type { AccessRuleFilters } from "./endpoints/deleteRulesEndpoint.js";
import type { RulesGroup } from "./endpoints/insertRulesEndpoint.js";

export class AccessRulesApiClient extends ApiClient {
	public insertMany(
		rulesGroup: RulesGroup,
		timestamp: string,
		signature: string,
	): Promise<ApiResponse> {
		return this.post(accessRuleApiPaths.INSERT_MANY, rulesGroup, {
			headers: {
				"Prosopo-Site-Key": this.account,
				timestamp,
				signature,
			},
		});
	}

	public deleteMany(
		filters: AccessRuleFilters,
		timestamp: string,
		signature: string,
	): Promise<ApiResponse> {
		return this.post(accessRuleApiPaths.DELETE_MANY, filters, {
			headers: {
				"Prosopo-Site-Key": this.account,
				timestamp,
				signature,
			},
		});
	}

	public deleteGroups(
		siteGroups: SiteGroups,
		timestamp: string,
		signature: string,
	): Promise<ApiResponse> {
		return this.post(accessRuleApiPaths.DELETE_GROUPS, siteGroups, {
			headers: {
				"Prosopo-Site-Key": this.account,
				timestamp,
				signature,
			},
		});
	}

	public deleteAll(timestamp: string, signature: string): Promise<ApiResponse> {
		return this.post(
			accessRuleApiPaths.DELETE_ALL,
			{},
			{
				headers: {
					"Prosopo-Site-Key": this.account,
					timestamp,
					signature,
				},
			},
		);
	}
}
