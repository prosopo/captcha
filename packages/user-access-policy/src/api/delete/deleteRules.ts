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
import { type Logger, executeBatchesSequentially } from "@prosopo/common";
import { type ZodType, z } from "zod";
import {
	type AccessRulesFilterInput,
	accessRulesFilterInput,
	getAccessRuleFiltersFromInput,
} from "#policy/ruleInput/ruleInput.js";
import type { AccessRulesStorage } from "#policy/rulesStorage.js";

type DeleteRulesSchema = ZodType<AccessRulesFilterInput[]>;

export class DeleteRulesEndpoint implements ApiEndpoint<DeleteRulesSchema> {
	public constructor(
		private readonly accessRulesStorage: AccessRulesStorage,
		private readonly logger: Logger,
	) {}

	public getRequestArgsSchema(): DeleteRulesSchema {
		return z.array(accessRulesFilterInput);
	}

	async processRequest(
		args: AccessRulesFilterInput[],
	): Promise<ApiEndpointResponse> {
		const allRuleIds: string[] = [];

		for (const rulesFilterInput of args) {
			const ruleFilters = getAccessRuleFiltersFromInput(rulesFilterInput);

			await executeBatchesSequentially(ruleFilters, async (ruleFilter) => {
				const ruleIds = await this.accessRulesStorage.findRuleIds(ruleFilter);
				allRuleIds.push(...ruleIds);
			});
		}

		// Deduplicate across all filters
		const uniqueRuleIds = [...new Set(allRuleIds)];

		if (uniqueRuleIds.length > 0) {
			await this.accessRulesStorage.deleteRules(uniqueRuleIds);

			this.logger.info(() => ({
				msg: "Endpoint deleted rules",
				data: {
					args,
					uniqueRuleIds,
				},
			}));
		}

		return {
			status: ApiEndpointResponseStatus.SUCCESS,
			data: {
				deleted_count: uniqueRuleIds.length,
			},
		};
	}
}
