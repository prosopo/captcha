// Copyright 2021-2026 Prosopo (UK) Ltd.
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
import { type Logger, type ProsopoApiError, getLogger } from "@prosopo/common";
import {
	GetDecisionMachineBody,
	GetDecisionMachineResponse,
} from "@prosopo/types";
import type { z } from "zod";
import type { ClientTaskManager } from "../../tasks/client/clientTasks.js";

type GetDecisionMachineBodyType = typeof GetDecisionMachineBody;

class ApiGetDecisionMachineEndpoint
	implements ApiEndpoint<GetDecisionMachineBodyType>
{
	public constructor(private readonly clientTaskManager: ClientTaskManager) {}

	async processRequest(
		args: z.infer<GetDecisionMachineBodyType>,
		logger?: Logger,
	): Promise<ApiEndpointResponse> {
		logger = logger || getLogger("info", "");
		try {
			const { id } = args;

			logger.info(() => ({
				msg: "Getting decision machine",
				data: { id },
			}));

			const result = await this.clientTaskManager.getDecisionMachine(id);

			logger.info(() => ({
				msg: "Retrieved decision machine",
				data: { id },
			}));

			return {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: GetDecisionMachineResponse.parse(result),
			};
		} catch (error) {
			logger.error(() => ({
				msg: "Error getting decision machine",
				err: error,
			}));
			return {
				status: ApiEndpointResponseStatus.FAIL,
				error: (error as ProsopoApiError).message,
			};
		}
	}

	public getRequestArgsSchema(): GetDecisionMachineBodyType {
		return GetDecisionMachineBody;
	}
}

export { ApiGetDecisionMachineEndpoint };
