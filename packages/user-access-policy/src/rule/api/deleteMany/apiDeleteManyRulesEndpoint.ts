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
import type { z } from "zod";
import type { ApiEndpoint } from "../../../api/apiEndpoint.js";
import type { ApiResponse } from "../../../api/response/apiResponse.js";
import { ApiResponseStatus } from "../../../api/response/apiResponseStatus.js";
import type { RulesStorage } from "../../storage/rulesStorage.js";
import { zodDeleteManyRulesSchema } from "./zodDeleteManyRulesSchema.js";

class ApiDeleteManyRulesEndpoint
	implements ApiEndpoint<typeof zodDeleteManyRulesSchema>
{
	public constructor(private readonly rulesStorage: RulesStorage) {}

	async processRequest(
		args: z.infer<typeof zodDeleteManyRulesSchema>,
	): Promise<ApiResponse> {
		await this.rulesStorage.deleteMany(args);

		return {
			status: ApiResponseStatus.SUCCESS,
		};
	}

	public getRequestArgsSchema(): typeof zodDeleteManyRulesSchema {
		return zodDeleteManyRulesSchema;
	}
}

export { ApiDeleteManyRulesEndpoint };
