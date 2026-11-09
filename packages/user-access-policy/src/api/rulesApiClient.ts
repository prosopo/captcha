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

import { ApiClient } from "@prosopo/api";
import type {
	ApiEndpointData,
	ApiEndpointResponse,
	ApiRouteContract,
	ApiRouteRequest,
	ApiRouteResponseData,
} from "@prosopo/api-route";
import type { ZodType, ZodTypeDef, z } from "zod";
import {
	deleteAllRulesRoute,
	deleteRuleGroupsRoute,
	deleteRulesRoute,
	fetchRulesRoute,
	findRuleIdsRoute,
	getMissingIdsRoute,
	insertRulesRoute,
	rehashRulesRoute,
} from "#policy/api/ruleApiContracts.js";

type RouteResponse<Contract extends ApiRouteContract> = ApiEndpointResponse<
	ApiRouteResponseData<Contract>
>;

export class AccessRulesApiClient extends ApiClient {
	//// delete

	public deleteMany(
		filters: ApiRouteRequest<typeof deleteRulesRoute>,
		jwt: string,
	): Promise<RouteResponse<typeof deleteRulesRoute>> {
		return this.post(deleteRulesRoute.path, filters, this.getAuthHeaders(jwt));
	}

	public deleteGroups(
		siteGroups: ApiRouteRequest<typeof deleteRuleGroupsRoute>,
		jwt: string,
	): Promise<RouteResponse<typeof deleteRuleGroupsRoute>> {
		return this.post(
			deleteRuleGroupsRoute.path,
			siteGroups,
			this.getAuthHeaders(jwt),
		);
	}

	public deleteAll(
		jwt: string,
	): Promise<RouteResponse<typeof deleteAllRulesRoute>> {
		return this.post(deleteAllRulesRoute.path, {}, this.getAuthHeaders(jwt));
	}

	//// read

	public getMissingIds(
		idsToCheck: ApiRouteRequest<typeof getMissingIdsRoute>,
		jwt: string,
	): Promise<RouteResponse<typeof getMissingIdsRoute>> {
		return this.postAndParse(getMissingIdsRoute, idsToCheck, jwt);
	}

	public fetchMany(
		fetchOptions: ApiRouteRequest<typeof fetchRulesRoute>,
		jwt: string,
	): Promise<RouteResponse<typeof fetchRulesRoute>> {
		return this.postAndParse(fetchRulesRoute, fetchOptions, jwt);
	}

	public findIds(
		filters: ApiRouteRequest<typeof findRuleIdsRoute>,
		jwt: string,
	): Promise<RouteResponse<typeof findRuleIdsRoute>> {
		return this.postAndParse(findRuleIdsRoute, filters, jwt);
	}

	//// write

	public rehashAll(
		jwt: string,
	): Promise<RouteResponse<typeof rehashRulesRoute>> {
		return this.post(rehashRulesRoute.path, {}, this.getAuthHeaders(jwt));
	}

	public insertMany(
		ruleGroups: ApiRouteRequest<typeof insertRulesRoute>,
		jwt: string,
	): Promise<RouteResponse<typeof insertRulesRoute>> {
		return this.post(
			insertRulesRoute.path,
			ruleGroups,
			this.getAuthHeaders(jwt),
		);
	}

	// Data that fails the contract's response schema is dropped rather than
	// thrown, so callers still see the status and error from the envelope.
	protected async postAndParse<
		Schema extends ZodType<ApiEndpointData, ZodTypeDef, unknown>,
	>(
		route: ApiRouteContract<string, ZodType | undefined, Schema>,
		body: unknown,
		jwt: string,
	): Promise<ApiEndpointResponse<z.infer<Schema>>> {
		const endpointResponse: ApiEndpointResponse<ApiEndpointData> =
			await this.post(route.path, body, this.getAuthHeaders(jwt));
		const parsedData = route.responseSchema.safeParse(endpointResponse.data);

		return {
			...endpointResponse,
			data: parsedData.success ? parsedData.data : undefined,
		};
	}

	protected getAuthHeaders(jwt: string): RequestInit {
		return {
			headers: {
				"Prosopo-Site-Key": this.account,
				Authorization: `Bearer ${jwt}`,
			},
		};
	}
}
