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
import { type ApiResponse, UserAccessPolicyAddRuleBody } from "@prosopo/types";
import type { UserAccessRulesStorage } from "@prosopo/types-database";
import type { z } from "zod";
import type { Endpoint } from "../../interfaces/endpoint/endpoint.js";

class AddUserAccessRuleEndpoint
	implements Endpoint<typeof UserAccessPolicyAddRuleBody>
{
	public constructor(
		private readonly userAccessRulesStorage: UserAccessRulesStorage,
	) {}

	async processRequest(
		args: z.infer<typeof UserAccessPolicyAddRuleBody>,
	): Promise<ApiResponse> {
		await this.userAccessRulesStorage.insertMany(args);

		return {
			status: "success",
		};
	}

	public getRequestArgsSchema(): typeof UserAccessPolicyAddRuleBody {
		return UserAccessPolicyAddRuleBody;
	}
}

export { AddUserAccessRuleEndpoint };
