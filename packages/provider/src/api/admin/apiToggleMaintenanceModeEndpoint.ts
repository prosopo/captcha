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

/**
 * Get the current maintenance mode state
 * Defaults to false if not set in environment
 */
export function getMaintenanceMode(): boolean {
	return process.env.MAINTENANCE_MODE?.toLowerCase() === "true";
}

/**
 * Set the maintenance mode state
 * Note: This modifies process.env which persists for the lifetime of the Node.js process
 * In Lambda, this means it persists until the container is recycled
 */
export function setMaintenanceMode(enabled: boolean): void {
	process.env.MAINTENANCE_MODE = enabled ? "true" : "false";
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

		const previousMode = getMaintenanceMode();

		logger.info(() => ({
			data: { enabled, previous: previousMode },
			msg: "Toggling maintenance mode",
		}));

		setMaintenanceMode(enabled);

		const currentMode = getMaintenanceMode();

		logger.info(() => ({
			data: { enabled: currentMode },
			msg: "Maintenance mode updated",
		}));

		return {
			status: ApiEndpointResponseStatus.SUCCESS,
			data: {
				maintenanceMode: currentMode,
			},
		};
	}

	public getRequestArgsSchema(): ToggleMaintenanceModeBodyType {
		return ToggleMaintenanceModeBody;
	}
}

export { ApiToggleMaintenanceModeEndpoint };
