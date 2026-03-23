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
import { type Logger, getLogger } from "@prosopo/common";
import { ClientSettingsSchema, RegisterSitekeysBody } from "@prosopo/types";
import type { z } from "zod";
import type { ClientTaskManager } from "../../tasks/client/clientTasks.js";

type RegisterSitekeysBodyType = typeof RegisterSitekeysBody;

class ApiRegisterSiteKeysEndpoint
	implements ApiEndpoint<RegisterSitekeysBodyType>
{
	public constructor(private readonly clientTaskManager: ClientTaskManager) {}

	async processRequest(
		args: z.infer<RegisterSitekeysBodyType>,
		logger?: Logger,
	): Promise<ApiEndpointResponse> {
		logger = logger || getLogger("info", import.meta.url);

		logger.info(() => ({
			data: { count: args.length },
			msg: "Registering site keys",
		}));

		const siteKeys = args.map(({ siteKey, tier, settings }) => ({
			siteKey,
			tier,
			settings:
				settings ||
				ClientSettingsSchema.parse({
					domains: ["localhost"],
				}),
		}));

		await this.clientTaskManager.registerSiteKeys(siteKeys);

		logger.info(() => ({ msg: "Site keys registered" }));

		return {
			status: ApiEndpointResponseStatus.SUCCESS,
		};
	}

	public getRequestArgsSchema(): RegisterSitekeysBodyType {
		return RegisterSitekeysBody;
	}
}

export { ApiRegisterSiteKeysEndpoint };
