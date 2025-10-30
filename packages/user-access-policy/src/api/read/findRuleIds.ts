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
import {
	type AllKeys,
	type Logger,
	executeBatchesSequentially,
} from "@prosopo/common";
import { type ZodType, z } from "zod";
import {
	type AccessRulesFilterInput,
	accessRulesFilterInput,
	getAccessRuleFiltersFromInput,
} from "#policy/ruleInput/ruleInput.js";
import type { AccessRulesStorage } from "#policy/rulesStorage.js";

type FindRulesSchema = ZodType<AccessRulesFilterInput[]>;

export type RuleIdsResponse = {
	ruleIds: string[];
};

export const ruleIdsResponse = z.object({
	ruleIds: z.string().array(),
} satisfies AllKeys<RuleIdsResponse>) satisfies ZodType<RuleIdsResponse>;

export type RuleIdsEndpointResponse = ApiEndpointResponse & {
	data?: RuleIdsResponse;
};

export class FindRuleIdsEndpoint implements ApiEndpoint<FindRulesSchema> {
	public constructor(
		private readonly accessRulesStorage: AccessRulesStorage,
		private readonly logger: Logger,
	) {}

	public getRequestArgsSchema(): FindRulesSchema {
		return z.array(accessRulesFilterInput);
	}

	async processRequest(
		args: AccessRulesFilterInput[],
	): Promise<RuleIdsEndpointResponse> {
		const ruleIdBatches = await executeBatchesSequentially(
			args,
			async (rulesFilterInput) => {
				const ruleFilters = getAccessRuleFiltersFromInput(rulesFilterInput);

				const ruleIds = await executeBatchesSequentially(
					ruleFilters,
					(ruleFilter) => this.accessRulesStorage.findRuleIds(ruleFilter),
				);

				return ruleIds.flat();
			},
		);

		const ruleIds = ruleIdBatches.flat();

		// Set() automatically removes duplicates
		const uniqueRuleIds = [...new Set(ruleIds)];

		this.logger.info(() => ({
			msg: "Endpoint found rules",
			data: {
				totalFoundCount: ruleIds.length,
				uniqueFoundCount: uniqueRuleIds.length,
				searchFilters: args,
				foundIds: uniqueRuleIds,
			},
		}));

		return {
			status: ApiEndpointResponseStatus.SUCCESS,
			data: {
				ruleIds: uniqueRuleIds,
			},
		};
	}
}
