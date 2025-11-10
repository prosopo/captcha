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
import { type Logger, ProsopoApiError, getLogger } from "@prosopo/common";
import { DemoKeyBehavior } from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { z } from "zod";
import {
	areDemoKeysEnabled,
	validateDemoKeyEnvironment,
} from "../../utils/demoKeys.js";

const SetDemoKeyRequestSchema = z.object({
	siteKey: z.string(),
	behavior: z.nativeEnum(DemoKeyBehavior),
	notes: z.string().optional(),
});

const RemoveDemoKeyRequestSchema = z.object({
	siteKey: z.string(),
});

const GetDemoKeyRequestSchema = z.object({
	siteKey: z.string(),
});

type SetDemoKeyRequestSchemaType = typeof SetDemoKeyRequestSchema;
type RemoveDemoKeyRequestSchemaType = typeof RemoveDemoKeyRequestSchema;
type GetDemoKeyRequestSchemaType = typeof GetDemoKeyRequestSchema;

/**
 * Set a demo key configuration for a site key
 */
export class ApiSetDemoKeyEndpoint
	implements ApiEndpoint<SetDemoKeyRequestSchemaType>
{
	constructor(private readonly db: IProviderDatabase) {}

	async processRequest(
		args: z.infer<SetDemoKeyRequestSchemaType>,
		logger?: Logger,
	): Promise<ApiEndpointResponse> {
		logger = logger || getLogger("info", import.meta.url);

		try {
			// Validate environment
			validateDemoKeyEnvironment();

			if (!areDemoKeysEnabled()) {
				throw new ProsopoApiError("API.UNAUTHORIZED", {
					context: {
						code: 401,
						error: "Demo keys are not enabled in this environment",
					},
					logger,
				});
			}

			const { siteKey, behavior, notes } = args;

			const clientRecord = await this.db.getClientRecord(siteKey);

			if (!clientRecord) {
				throw new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
					context: { code: 400, siteKey },
					logger,
				});
			}

			// Update client settings with demo key config
			const updatedSettings = {
				...clientRecord.settings,
				demoKeyConfig: {
					enabled: true,
					behavior,
					createdAt: new Date(),
					notes,
				},
			};

			await this.db.storeClientRecord({
				...clientRecord,
				settings: updatedSettings,
			});

			logger.warn(() => ({
				msg: "⚠️ Demo key configuration set - NOT FOR PRODUCTION",
				data: { siteKey, behavior, notes },
			}));

			return {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: {
					message: "Demo key configuration set",
					siteKey,
					behavior,
				},
			};
		} catch (err) {
			logger.error(() => ({
				err,
				msg: "Error setting demo key",
			}));
			throw err;
		}
	}

	public getRequestArgsSchema(): SetDemoKeyRequestSchemaType {
		return SetDemoKeyRequestSchema;
	}
}

/**
 * Remove demo key configuration for a site key
 */
export class ApiRemoveDemoKeyEndpoint
	implements ApiEndpoint<RemoveDemoKeyRequestSchemaType>
{
	constructor(private readonly db: IProviderDatabase) {}

	async processRequest(
		args: z.infer<RemoveDemoKeyRequestSchemaType>,
		logger?: Logger,
	): Promise<ApiEndpointResponse> {
		logger = logger || getLogger("info", import.meta.url);

		try {
			// Validate environment
			validateDemoKeyEnvironment();

			if (!areDemoKeysEnabled()) {
				throw new ProsopoApiError("API.UNAUTHORIZED", {
					context: {
						code: 401,
						error: "Demo keys are not enabled in this environment",
					},
					logger,
				});
			}

			const { siteKey } = args;

			const clientRecord = await this.db.getClientRecord(siteKey);

			if (!clientRecord) {
				throw new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
					context: { code: 400, siteKey },
					logger,
				});
			}

			// Remove demo key config from client settings
			const updatedSettings = {
				...clientRecord.settings,
				demoKeyConfig: undefined,
			};

			await this.db.storeClientRecord({
				...clientRecord,
				settings: updatedSettings,
			});

			logger.info(() => ({
				msg: "Demo key configuration removed",
				data: { siteKey },
			}));

			return {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: {
					message: "Demo key configuration removed",
					siteKey,
				},
			};
		} catch (err) {
			logger.error(() => ({
				err,
				msg: "Error removing demo key",
			}));
			throw err;
		}
	}

	public getRequestArgsSchema(): RemoveDemoKeyRequestSchemaType {
		return RemoveDemoKeyRequestSchema;
	}
}

/**
 * Get demo key configuration for a site key
 */
export class ApiGetDemoKeyEndpoint
	implements ApiEndpoint<GetDemoKeyRequestSchemaType>
{
	constructor(private readonly db: IProviderDatabase) {}

	async processRequest(
		args: z.infer<GetDemoKeyRequestSchemaType>,
		logger?: Logger,
	): Promise<ApiEndpointResponse> {
		logger = logger || getLogger("info", import.meta.url);

		try {
			// Validate environment
			validateDemoKeyEnvironment();

			if (!areDemoKeysEnabled()) {
				throw new ProsopoApiError("API.UNAUTHORIZED", {
					context: {
						code: 401,
						error: "Demo keys are not enabled in this environment",
					},
					logger,
				});
			}

			const { siteKey } = args;

			const clientRecord = await this.db.getClientRecord(siteKey);

			if (!clientRecord) {
				throw new ProsopoApiError("API.SITE_KEY_NOT_REGISTERED", {
					context: { code: 400, siteKey },
					logger,
				});
			}

			const demoKeyConfig = clientRecord.settings?.demoKeyConfig;

			return {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: {
					siteKey,
					demoKeyConfig: demoKeyConfig || null,
				},
			};
		} catch (err) {
			logger.error(() => ({
				err,
				msg: "Error getting demo key",
			}));
			throw err;
		}
	}

	public getRequestArgsSchema(): GetDemoKeyRequestSchemaType {
		return GetDemoKeyRequestSchema;
	}
}

