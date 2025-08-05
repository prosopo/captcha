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
import { type Logger, type ProsopoApiError, getLogger } from "@prosopo/common";
import { UpdateDetectorKeyBody } from "@prosopo/types";
import type { z } from "zod";
import type { ClientTaskManager } from "../../tasks/client/clientTasks.js";

type UpdateDetectorKeyBodyType = typeof UpdateDetectorKeyBody;

class ApiUpdateDetectorKeyEndpoint
	implements ApiEndpoint<UpdateDetectorKeyBodyType>
{
	public constructor(private readonly clientTaskManager: ClientTaskManager) {}

	async processRequest(
		args: z.infer<UpdateDetectorKeyBodyType>,
		logger?: Logger,
	): Promise<ApiEndpointResponse> {
		logger =
			logger ||
			getLogger({
				scope: "provider.api.admin.apiUpdateDetectorKeyEndpoint",
				url: import.meta.url,
			});
		try {
			const { detectorKey } = args;

			logger =
				logger ||
				getLogger({
					scope: "provider.api.admin.apiUpdateDetectorKeyEndpoint",
					url: import.meta.url,
				});

			logger.info(() => ({ msg: "Updating detector key" }));

			const activeDetectorKeys =
				await this.clientTaskManager.updateDetectorKey(detectorKey);

			logger.info(() => ({
				msg: "Detector key updated",
				activeDetectorKeys,
			}));
			return {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: {
					activeDetectorKeys,
				},
			};
		} catch (error) {
			logger.error(() => ({ msg: "Error updating detector key", err: error }));
			return {
				status: ApiEndpointResponseStatus.FAIL,
				error: (error as ProsopoApiError).message,
			};
		}
	}

	public getRequestArgsSchema(): UpdateDetectorKeyBodyType {
		return UpdateDetectorKeyBody;
	}
}

export { ApiUpdateDetectorKeyEndpoint };
