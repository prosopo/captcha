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
import { z } from "zod";
import { policyFilterSchema } from "#policy/accessPolicyResolver.js";
import type { AccessRulesStorage } from "#policy/accessRules.js";

export const deleteRulesEndpointSchema = z.array(policyFilterSchema);

export type DeleteRulesEndpointSchema = typeof deleteRulesEndpointSchema;

export class DeleteRulesEndpoint
	implements ApiEndpoint<DeleteRulesEndpointSchema>
{
	public constructor(private readonly accessRulesStorage: AccessRulesStorage) {}

	async processRequest(
		args: z.infer<DeleteRulesEndpointSchema>,
	): Promise<ApiEndpointResponse> {
		const allRuleIds = [];

		for (const accessRuleFilter of args) {
			const foundRuleIds =
				await this.accessRulesStorage.findRuleIds(accessRuleFilter);

			allRuleIds.push(...foundRuleIds);
		}

		// Set() automatically removes duplicates
		const uniqueRuleIds = [...new Set(allRuleIds)];

		if (uniqueRuleIds.length > 0) {
			await this.accessRulesStorage.deleteRules(uniqueRuleIds);
		}

		return {
			status: ApiEndpointResponseStatus.SUCCESS,
			data: {
				deleted_count: uniqueRuleIds.length,
			},
		};
	}

	public getRequestArgsSchema(): DeleteRulesEndpointSchema {
		return deleteRulesEndpointSchema;
	}
}
