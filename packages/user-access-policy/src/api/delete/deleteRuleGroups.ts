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

import {
    type ApiEndpoint,
    type ApiEndpointResponse,
    ApiEndpointResponseStatus,
} from "@prosopo/api-route";
import type { AllKeys, Logger } from "@prosopo/common";
import { type ZodType, z } from "zod";
import {
    type AccessRulesStorage,
    FilterScopeMatch,
} from "#policy/rulesStorage.js";

export type DeleteSiteGroup = {
    clientIds: string[];
    groupId: string;
};

export type DeleteSiteGroups = DeleteSiteGroup[];

type DeleteRuleGroupsSchema = ZodType<DeleteSiteGroups>;

export class DeleteRuleGroupsEndpoint
    implements ApiEndpoint<DeleteRuleGroupsSchema>
{
    public constructor(
        private readonly accessRulesStorage: AccessRulesStorage,
        private readonly logger: Logger,
    ) {}

    public getRequestArgsSchema(): DeleteRuleGroupsSchema {
        return z.array(
            z.object({
                clientIds: z.string().array(),
                groupId: z.string(),
            } satisfies AllKeys<DeleteSiteGroup>),
        );
    }

    async processRequest(args: DeleteSiteGroups): Promise<ApiEndpointResponse> {
        const foundRuleIdPromises = args.flatMap((ruleToDelete) =>
            ruleToDelete.clientIds.map((clientId) =>
                this.accessRulesStorage.findRuleIds({
                    policyScope: {
                        clientId: clientId,
                    },
                    policyScopeMatch: FilterScopeMatch.Exact,
                    groupId: ruleToDelete.groupId,
                }),
            ),
        );

        const foundRuleIds = await Promise.all(foundRuleIdPromises);
        const ruleIds = foundRuleIds.flat();

        // Set() automatically removes duplicates
        const uniqueRuleIds = [...new Set(ruleIds)];

        if (uniqueRuleIds.length > 0) {
            await this.accessRulesStorage.deleteRules(uniqueRuleIds);
        }

        this.logger.info(() => ({
            msg: "Endpoint deleted rule groups",
            data: {
                args,
                uniqueRuleIds,
            },
        }));

        return {
            status: ApiEndpointResponseStatus.SUCCESS,
            data: {
                deleted_count: uniqueRuleIds.length,
            },
        };
    }
}
