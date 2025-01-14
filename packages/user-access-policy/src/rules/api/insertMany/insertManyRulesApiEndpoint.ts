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

import type { ApiEndpoint } from "@api/apiEndpoint.js";
import type { ApiResponse } from "@api/response/apiResponse.js";
import { ApiResponseStatus } from "@api/response/apiResponseStatus.js";
import { insertManyRulesApiSchema } from "@rules/api/insertMany/insertManyRulesApiSchema.js";
import type { RulesStorage } from "@rules/storage/rulesStorage.js";
import type { z } from "zod";

class InsertManyRulesApiEndpoint
	implements ApiEndpoint<typeof insertManyRulesApiSchema>
{
	public constructor(private readonly rulesStorage: RulesStorage) {}

	async processRequest(
		args: z.infer<typeof insertManyRulesApiSchema>,
	): Promise<ApiResponse> {
		await this.rulesStorage.insertMany(args);

		return {
			status: ApiResponseStatus.SUCCESS,
		};
	}

	public getRequestArgsSchema(): typeof insertManyRulesApiSchema {
		return insertManyRulesApiSchema;
	}
}

export { InsertManyRulesApiEndpoint };
