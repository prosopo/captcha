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
	type AccessRulesFilter,
	type AccessRulesStorage,
	accessRulesFilterSchema,
} from "#policy/storage/accessRulesStorage.js";

export type AccessRuleFilters = AccessRulesFilter[];

const deleteRulesSchema = z.array(
	accessRulesFilterSchema,
) satisfies ZodType<AccessRuleFilters>;

type DeleteRulesSchema = typeof deleteRulesSchema;

export class DeleteRulesEndpoint implements ApiEndpoint<DeleteRulesSchema> {
	public constructor(
		private readonly accessRulesStorage: AccessRulesStorage,
		private readonly logger: Logger,
	) {}

	async processRequest(args: AccessRuleFilters): Promise<ApiEndpointResponse> {
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

		this.logger.info(() => ({
			msg: "Endpoint deleted rules",
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

	public getRequestArgsSchema(): DeleteRulesSchema {
		return deleteRulesSchema;
	}
}
