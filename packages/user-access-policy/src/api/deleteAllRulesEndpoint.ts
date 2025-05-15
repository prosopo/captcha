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
import type { AccessRulesStorage } from "#policy/accessRules.js";

export const deleteAllRulesEndpointSchema = z.object({});

export type DeleteAllRulesEndpointSchema = typeof deleteAllRulesEndpointSchema;

export class DeleteAllRulesEndpoint
	implements ApiEndpoint<DeleteAllRulesEndpointSchema>
{
	public constructor(private readonly accessRulesStorage: AccessRulesStorage) {}

	async processRequest(
		args: z.infer<DeleteAllRulesEndpointSchema>,
	): Promise<ApiEndpointResponse> {
		const deletedCount = await this.accessRulesStorage.deleteAllRules();

		return {
			status: ApiEndpointResponseStatus.SUCCESS,
			data: {
				deleted_count: deletedCount,
			},
		};
	}

	getRequestArgsSchema(): DeleteAllRulesEndpointSchema {
		return deleteAllRulesEndpointSchema;
	}
}
