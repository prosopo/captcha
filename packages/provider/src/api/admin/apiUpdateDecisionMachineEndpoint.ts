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
import { UpdateDecisionMachineBody } from "@prosopo/types";
import type { z } from "zod";
import type { ClientTaskManager } from "../../tasks/client/clientTasks.js";

type UpdateDecisionMachineBodyType = typeof UpdateDecisionMachineBody;

class ApiUpdateDecisionMachineEndpoint
	implements ApiEndpoint<UpdateDecisionMachineBodyType>
{
	public constructor(private readonly clientTaskManager: ClientTaskManager) {}

	async processRequest(
		args: z.infer<UpdateDecisionMachineBodyType>,
		logger?: Logger,
	): Promise<ApiEndpointResponse> {
		logger = logger || getLogger("info", "");
		try {
			const {
				decisionMachineScope,
				decisionMachineRuntime,
				decisionMachineSource,
				decisionMachineLanguage,
				decisionMachineName,
				decisionMachineVersion,
				decisionMachineCaptchaType,
				dapp,
			} = args;

			logger.info(() => ({
				msg: "Updating decision machine",
				data: { decisionMachineScope, dappAccount: dapp },
			}));

			const result = await this.clientTaskManager.updateDecisionMachine(
				decisionMachineScope,
				decisionMachineRuntime,
				decisionMachineSource,
				dapp,
				decisionMachineLanguage,
				decisionMachineName,
				decisionMachineVersion,
				decisionMachineCaptchaType,
			);

			logger.info(() => ({
				msg: "Decision machine updated",
				data: result,
			}));
			return {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: result,
			};
		} catch (error) {
			logger.error(() => ({
				msg: "Error updating decision machine",
				err: error,
			}));
			return {
				status: ApiEndpointResponseStatus.FAIL,
				error: (error as ProsopoApiError).message,
			};
		}
	}

	public getRequestArgsSchema(): UpdateDecisionMachineBodyType {
		return UpdateDecisionMachineBody;
	}
}

export { ApiUpdateDecisionMachineEndpoint };
