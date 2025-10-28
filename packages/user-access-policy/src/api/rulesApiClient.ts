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
import type { ApiEndpointResponse } from "@prosopo/api-route";
import {
	type FetchRulesEndpointResponse,
	type FetchRulesOptions,
	fetchRulesResponse,
} from "#policy/api/read/fetchRules.js";
import {
	type FindRuleFilters,
	type RuleIdsEndpointResponse,
	ruleIdsResponse,
} from "#policy/api/read/findRuleIds.js";
import {
	type MissingIds,
	type MissingIdsEndpointResponse,
	missingIdsResponse,
} from "#policy/api/read/getMissingIds.js";
import type { DeleteSiteGroups } from "./delete/deleteRuleGroups.js";
import type { DeleteRuleFilters } from "./delete/deleteRules.js";
import { accessRuleApiPaths } from "./ruleApiRoutes.js";
import type { InsertRulesGroup } from "./write/insertRules.js";

export class AccessRulesApiClient extends ApiClient {
	//// delete

	public deleteMany(
		filters: DeleteRuleFilters,
		timestamp: string,
		signature: string,
	): Promise<ApiEndpointResponse> {
		return this.post(
			accessRuleApiPaths.DELETE_MANY,
			filters,
			this.getAuthHeaders(timestamp, signature),
		);
	}

	public deleteGroups(
		siteGroups: DeleteSiteGroups,
		timestamp: string,
		signature: string,
	): Promise<ApiEndpointResponse> {
		return this.post(
			accessRuleApiPaths.DELETE_GROUPS,
			siteGroups,
			this.getAuthHeaders(timestamp, signature),
		);
	}

	public deleteAll(
		timestamp: string,
		signature: string,
	): Promise<ApiEndpointResponse> {
		return this.post(
			accessRuleApiPaths.DELETE_ALL,
			{},
			this.getAuthHeaders(timestamp, signature),
		);
	}

	//// read

	public async getMissingIds(
		idsToCheck: MissingIds,
		timestamp: string,
		signature: string,
	): Promise<MissingIdsEndpointResponse> {
		const endpointResponse: ApiEndpointResponse = await this.post(
			accessRuleApiPaths.GET_MISSING_IDS,
			idsToCheck,
			this.getAuthHeaders(timestamp, signature),
		);

		const parsedData = missingIdsResponse.safeParse(endpointResponse.data);

		return {
			...endpointResponse,
			data: parsedData.success ? parsedData.data : undefined,
		};
	}

	public async fetchMany(
		fetchOptions: FetchRulesOptions,
		timestamp: string,
		signature: string,
	): Promise<FetchRulesEndpointResponse> {
		const endpointResponse: ApiEndpointResponse = await this.post(
			accessRuleApiPaths.FETCH_MANY,
			fetchOptions,
			this.getAuthHeaders(timestamp, signature),
		);

		const parsedData = fetchRulesResponse.safeParse(endpointResponse.data);

		return {
			...endpointResponse,
			data: parsedData.success ? parsedData.data : undefined,
		};
	}

	public async findIds(
		filters: FindRuleFilters,
		timestamp: string,
		signature: string,
	): Promise<RuleIdsEndpointResponse> {
		const endpointResponse: ApiEndpointResponse = await this.post(
			accessRuleApiPaths.FIND_IDS,
			filters,
			this.getAuthHeaders(timestamp, signature),
		);

		const parsedData = ruleIdsResponse.safeParse(endpointResponse.data);

		return {
			...endpointResponse,
			data: parsedData.success ? parsedData.data : undefined,
		};
	}

	//// write

	public async rehashAll(
		timestamp: string,
		signature: string,
	): Promise<ApiEndpointResponse> {
		return this.post(
			accessRuleApiPaths.REHASH_ALL,
			{},
			this.getAuthHeaders(timestamp, signature),
		);
	}

	public insertMany(
		ruleGroups: InsertRulesGroup[],
		timestamp: string,
		signature: string,
	): Promise<ApiEndpointResponse> {
		return this.post(
			accessRuleApiPaths.INSERT_MANY,
			ruleGroups,
			this.getAuthHeaders(timestamp, signature),
		);
	}

	protected getAuthHeaders(timestamp: string, signature: string): RequestInit {
		return {
			headers: {
				"Prosopo-Site-Key": this.account,
				timestamp,
				signature,
			},
		};
	}
}
