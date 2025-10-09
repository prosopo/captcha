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
import { type Logger, getLogger } from "@prosopo/common";
import { ToggleMaintenanceModeBody } from "@prosopo/types";
import type { z } from "zod";

type ToggleMaintenanceModeBodyType = typeof ToggleMaintenanceModeBody;

// Global maintenance mode state - defaults to false if not set in environment
let IS_MAINTENANCE_MODE =
	process.env.IS_MAINTENANCE_MODE?.toLowerCase() === "true" || false;

/**
 * Get the current maintenance mode state
 */
export function getMaintenanceMode(): boolean {
	return IS_MAINTENANCE_MODE;
}

/**
 * Set the maintenance mode state
 */
export function setMaintenanceMode(enabled: boolean): void {
	IS_MAINTENANCE_MODE = enabled;
}

class ApiToggleMaintenanceModeEndpoint
	implements ApiEndpoint<ToggleMaintenanceModeBodyType>
{
	async processRequest(
		args: z.infer<ToggleMaintenanceModeBodyType>,
		logger?: Logger,
	): Promise<ApiEndpointResponse> {
		const { enabled } = args;

		logger = logger || getLogger("info", import.meta.url);

		logger.info(() => ({
			data: { enabled, previous: IS_MAINTENANCE_MODE },
			msg: "Toggling maintenance mode",
		}));

		setMaintenanceMode(enabled);

		logger.info(() => ({
			data: { enabled: IS_MAINTENANCE_MODE },
			msg: "Maintenance mode updated",
		}));

		return {
			status: ApiEndpointResponseStatus.SUCCESS,
			data: {
				maintenanceMode: IS_MAINTENANCE_MODE,
			},
		};
	}

	public getRequestArgsSchema(): ToggleMaintenanceModeBodyType {
		return ToggleMaintenanceModeBody;
	}
}

export { ApiToggleMaintenanceModeEndpoint };
