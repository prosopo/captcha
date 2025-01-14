// Copyright 2021-2024 Prosopo (UK) Ltd.
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
	type ApiInsertManyRulesArgsSchema,
	apiInsertManyRulesArgsSchema,
} from "@rules/api/insertMany/apiInsertManyRulesArgsSchema.js";
import type { RulesStorage } from "@rules/storage/rulesStorage.js";
import type { z } from "zod";

class ApiInsertManyRulesEndpoint
	implements ApiEndpoint<ApiInsertManyRulesArgsSchema>
{
	public constructor(private readonly rulesStorage: RulesStorage) {}

	async processRequest(
		args: z.infer<ApiInsertManyRulesArgsSchema>,
	): Promise<ApiEndpointResponse> {
		await this.rulesStorage.insertMany(args);

		return {
			status: ApiEndpointResponseStatus.SUCCESS,
		};
	}

	public getRequestArgsSchema(): ApiInsertManyRulesArgsSchema {
		return apiInsertManyRulesArgsSchema;
	}
}

export { ApiInsertManyRulesEndpoint };
