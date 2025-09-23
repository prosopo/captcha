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
import type { Logger } from "@prosopo/common";
import { type ZodType, z } from "zod";
import { ScopeMatch } from "#policy/accessPolicyResolver.js";
import type { AccessRulesStorage } from "#policy/storage/accessRulesStorage.js";

export type SiteGroup = {
	clientIds: string[];
	groupId: string;
};

export type SiteGroups = SiteGroup[];

type DeleteRuleGroupsSchema = ZodType<SiteGroups>;

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
			}),
		);
	}

	async processRequest(args: SiteGroups): Promise<ApiEndpointResponse> {
		const ruleIdPromises = [];

		for (const ruleToDelete of args) {
			const currentRuleIdPromises = ruleToDelete.clientIds.map(
				async (clientId) => {
					return await this.accessRulesStorage.findRuleIds({
						policyScope: {
							clientId: clientId,
						},
						policyScopeMatch: ScopeMatch.Exact,
						groupId: ruleToDelete.groupId,
					});
				},
			);

			ruleIdPromises.push(...currentRuleIdPromises);
		}

		const foundRuleIds = await Promise.all(ruleIdPromises);
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
