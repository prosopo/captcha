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
	type GetAllDecisionMachinesBody,
	GetAllDecisionMachinesResponse,
} from "@prosopo/types";
import { object } from "zod";
import type { ClientTaskManager } from "../../tasks/client/clientTasks.js";

type GetAllDecisionMachinesBodyType = typeof GetAllDecisionMachinesBody;

class ApiGetAllDecisionMachinesEndpoint
	implements ApiEndpoint<GetAllDecisionMachinesBodyType>
{
	public constructor(private readonly clientTaskManager: ClientTaskManager) {}

	async processRequest(
		args: unknown,
		logger?: Logger,
	): Promise<ApiEndpointResponse> {
		logger = logger || getLogger("info", "");
		try {
			logger.info(() => ({
				msg: "Getting all decision machines",
			}));

			const result = await this.clientTaskManager.getAllDecisionMachines();

			logger.info(() => ({
				msg: "Retrieved all decision machines",
				data: { count: result.length },
			}));

			logger.info(() => ({
				msg: "Result before parsing",
				data: { result },
			}));

			logger.info(() => ({
				msg: "Schema definition",
				data: { schema: GetAllDecisionMachinesResponse.toString() },
			}));

			return {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: GetAllDecisionMachinesResponse.parse(result),
			};
		} catch (error) {
			logger.error(() => ({
				msg: "Error getting all decision machines",
				err: error,
			}));
			return {
				status: ApiEndpointResponseStatus.FAIL,
				error: (error as ProsopoApiError).message,
			};
		}
	}

	public getRequestArgsSchema(): GetAllDecisionMachinesBodyType {
		return object({});
	}
}

export { ApiGetAllDecisionMachinesEndpoint };
