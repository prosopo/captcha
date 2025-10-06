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

import * as util from "node:util";
import {ApiClient} from "@prosopo/api";
import type {ApiEndpointResponse} from "@prosopo/api-route";
import {
    type FetchRulesEndpointResponse,
    type FetchRulesOptions,
    fetchRulesResponse,
} from "#policy/api/endpoints/fetchRules.js";
import {
    type FindRuleFilters,
    type RuleIdsEndpointResponse,
    ruleIdsResponse,
} from "#policy/api/endpoints/findRuleIds.js";
import type {DeleteSiteGroups} from "./endpoints/deleteRuleGroups.js";
import type {DeleteRuleFilters} from "./endpoints/deleteRules.js";
import type {InsertRulesGroup} from "./endpoints/insertRules.js";
import {accessRuleApiPaths} from "./ruleApiRoutes.js";
import {
    type MissingIds,
    type MissingIdsEndpointResponse,
    missingIdsResponse
} from "#policy/api/endpoints/getMissingIds.js";

export class AccessRulesApiClient extends ApiClient {
    public async getMissingIds(idsToCheck: MissingIds,
                               timestamp: string,
                               signature: string,): Promise<MissingIdsEndpointResponse> {
        const endpointResponse: ApiEndpointResponse = await this.post(
            accessRuleApiPaths.GET_MISSING_IDS,
            idsToCheck,
            {
                headers: {
                    "Prosopo-Site-Key": this.account,
                    timestamp,
                    signature,
                },
            },
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
            {
                headers: {
                    "Prosopo-Site-Key": this.account,
                    timestamp,
                    signature,
                },
            },
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
            {
                headers: {
                    "Prosopo-Site-Key": this.account,
                    timestamp,
                    signature,
                },
            },
        );

        const parsedData = ruleIdsResponse.safeParse(endpointResponse.data);

        return {
            ...endpointResponse,
            data: parsedData.success ? parsedData.data : undefined,
        };
    }

    public insertMany(
        rulesGroup: InsertRulesGroup,
        timestamp: string,
        signature: string,
    ): Promise<ApiEndpointResponse> {
        return this.post(accessRuleApiPaths.INSERT_MANY, rulesGroup, {
            headers: {
                "Prosopo-Site-Key": this.account,
                timestamp,
                signature,
            },
        });
    }

    public deleteMany(
        filters: DeleteRuleFilters,
        timestamp: string,
        signature: string,
    ): Promise<ApiEndpointResponse> {
        return this.post(accessRuleApiPaths.DELETE_MANY, filters, {
            headers: {
                "Prosopo-Site-Key": this.account,
                timestamp,
                signature,
            },
        });
    }

    public deleteGroups(
        siteGroups: DeleteSiteGroups,
        timestamp: string,
        signature: string,
    ): Promise<ApiEndpointResponse> {
        return this.post(accessRuleApiPaths.DELETE_GROUPS, siteGroups, {
            headers: {
                "Prosopo-Site-Key": this.account,
                timestamp,
                signature,
            },
        });
    }

    public deleteAll(
        timestamp: string,
        signature: string,
    ): Promise<ApiEndpointResponse> {
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
