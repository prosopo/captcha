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
	type ApiResponse,
	RegisterSitekeyBody,
	type RegisterSitekeyBodyTypeOutput,
} from "@prosopo/types";
import type { ClientTaskManager } from "../../../tasks/client/clientTasks.js";
import type {ApiEndpoint} from "@prosopo/api-route";
import type {z} from "zod";

class ApiRegisterSiteKeyEndpoint implements ApiEndpoint<typeof RegisterSitekeyBody> {
	public constructor(private readonly clientTaskManager: ClientTaskManager) {}

	async processRequest(
		args: z.infer<typeof RegisterSitekeyBody>,
	): Promise<ApiResponse> {
		const { siteKey, settings } = args;

		const temp = settings || {};

		await this.clientTaskManager.registerSiteKey(siteKey, temp);

		return {
			status: "success",
		};
	}

	public getRequestArgsSchema(): typeof RegisterSitekeyBody {
		return RegisterSitekeyBody;
	}
}

export { ApiRegisterSiteKeyEndpoint };
