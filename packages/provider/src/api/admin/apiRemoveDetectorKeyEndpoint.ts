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
import {
	type RemoveDetectorKeyBody, RemoveDetectorKeyBodySpec,
	UpdateDetectorKeyBody,
} from "@prosopo/types";
import type { z } from "zod";
import type { ClientTaskManager } from "../../tasks/client/clientTasks.js";

class ApiRemoveDetectorKeyEndpoint
	implements ApiEndpoint<RemoveDetectorKeyBody>
{
	public constructor(private readonly clientTaskManager: ClientTaskManager) {}

	async processRequest(
		args: RemoveDetectorKeyBody,
		logger?: Logger,
	): Promise<ApiEndpointResponse> {
		logger = logger || getLogger("info", import.meta.url);
		try {
			const { detectorKey, expirationInSeconds } = args;

			logger = logger || getLogger("info", import.meta.url);

			logger.info(() => ({ msg: "Removing detector key" }));

			await this.clientTaskManager.removeDetectorKey(
				detectorKey,
				expirationInSeconds,
			);

			return {
				status: ApiEndpointResponseStatus.SUCCESS,
			};
		} catch (error: unknown) {
			logger.error(() => ({ err: error, msg: "Error updating detector key" }));
			return {
				status: ApiEndpointResponseStatus.FAIL,
				error: (error as ProsopoApiError).message,
			};
		}
	}

	public getRequestArgsSchema() {
		return RemoveDetectorKeyBodySpec;
	}
}

export { ApiRemoveDetectorKeyEndpoint };
