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
import {
	type AccessRulesFilterInput,
	accessRulesFilterInput,
} from "#policy/ruleInput.js";
import type {
	AccessRulesFilter,
	AccessRulesStorage,
} from "#policy/rulesStorage.js";

export type FindRuleFilters = AccessRulesFilterInput[];

type FindRulesSchema = ZodType<FindRuleFilters>;

export class FindRuleIdsEndpoint implements ApiEndpoint<FindRulesSchema> {
	public constructor(
		private readonly accessRulesStorage: AccessRulesStorage,
		private readonly logger: Logger,
	) {}

	public getRequestArgsSchema(): FindRulesSchema {
		return z.array(accessRulesFilterInput);
	}

	async processRequest(
		args: AccessRulesFilter[],
	): Promise<ApiEndpointResponse> {
		const allRuleIds = [];

		for (const accessRuleFilter of args) {
			const ruleIds =
				await this.accessRulesStorage.findRuleIds(accessRuleFilter);

			allRuleIds.push(...ruleIds);
		}

		// Set() automatically removes duplicates
		const uniqueRuleIds = [...new Set(allRuleIds)];

		this.logger.info(() => ({
			msg: "Endpoint found rules",
			data: {
				totalFoundCount: allRuleIds.length,
				uniqueFoundCount: uniqueRuleIds.length,
				searchFilters: args,
				foundIds: uniqueRuleIds,
			},
		}));

		return {
			status: ApiEndpointResponseStatus.SUCCESS,
			data: uniqueRuleIds,
		};
	}
}
