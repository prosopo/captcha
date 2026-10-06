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
import { type Logger, getLogger } from "@prosopo/logger";
import { ToggleMaintenanceModeBody } from "@prosopo/types";
import type { z } from "zod";
import { setMaintenanceModeGauge } from "../metrics.js";

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

/**
 * Site keys taken out of scoring individually, rather than putting the whole
 * node into maintenance mode.
 *
 * Same durability as the node-wide flag above: per-process, cleared on restart,
 * and set by calling this endpoint on each node. Deliberately not persisted —
 * a forced-pass state that survives a restart unnoticed is worse than one an
 * operator has to re-apply.
 */
const maintenanceModeSiteKeys = new Set<string>();

export function getMaintenanceModeSiteKeys(): string[] {
	return [...maintenanceModeSiteKeys];
}

export function setMaintenanceModeForSiteKeys(
	siteKeys: readonly string[],
	enabled: boolean,
): void {
	for (const siteKey of siteKeys) {
		if (enabled) maintenanceModeSiteKeys.add(siteKey);
		else maintenanceModeSiteKeys.delete(siteKey);
	}
}

export function clearMaintenanceModeSiteKeys(): void {
	maintenanceModeSiteKeys.clear();
}

/**
 * Whether this specific site key is in maintenance mode, node-wide or scoped.
 *
 * Callers MUST pass a site key the request has proven it owns. Maintenance mode
 * forces an approval, so deciding it from an unverified, caller-supplied value
 * — the `prosopo-site-key` header, or a site key read out of a request body
 * before its signature is checked — would let anyone claim maintenance for a
 * key they do not control and collect a free pass. The verify handlers call
 * this only after the dapp signature has been verified.
 */
export function isSiteKeyInMaintenanceMode(
	siteKey: string | undefined,
): boolean {
	if (getMaintenanceMode()) return true;
	if (!siteKey) return false;
	return maintenanceModeSiteKeys.has(siteKey);
}

class ApiToggleMaintenanceModeEndpoint
	implements ApiEndpoint<ToggleMaintenanceModeBodyType>
{
	async processRequest(
		args: z.infer<ToggleMaintenanceModeBodyType>,
		logger?: Logger,
	): Promise<ApiEndpointResponse> {
		const { enabled, siteKeys } = args;

		logger = logger
			? logger.with({}, "admin:maintenance:toggle")
			: getLogger("info", "provider:admin:maintenance:toggle");

		const previousMode = getMaintenanceMode();

		// A scoped toggle leaves the node-wide flag and its gauge alone: the two
		// are independent, and a caller asking for one customer must not take the
		// whole node out of scoring as a side effect.
		if (siteKeys && siteKeys.length > 0) {
			logger.info(() => ({
				data: { enabled, siteKeys },
				msg: "Toggling maintenance mode for site keys",
			}));
			setMaintenanceModeForSiteKeys(siteKeys, enabled);
			const currentSiteKeys = getMaintenanceModeSiteKeys();
			logger.info(() => ({
				data: { siteKeys: currentSiteKeys, maintenanceMode: previousMode },
				msg: "Maintenance mode site keys updated",
			}));
			return {
				status: ApiEndpointResponseStatus.SUCCESS,
				data: {
					maintenanceMode: previousMode,
					maintenanceModeSiteKeys: currentSiteKeys,
				},
			};
		}

		logger.info(() => ({
			data: { enabled, previous: previousMode },
			msg: "Toggling maintenance mode",
		}));

		setMaintenanceMode(enabled);
		setMaintenanceModeGauge(enabled);

		const currentMode = getMaintenanceMode();

		logger.info(() => ({
			data: { enabled: currentMode },
			msg: "Maintenance mode updated",
		}));

		return {
			status: ApiEndpointResponseStatus.SUCCESS,
			data: {
				maintenanceMode: currentMode,
				maintenanceModeSiteKeys: getMaintenanceModeSiteKeys(),
			},
		};
	}

	public getRequestArgsSchema(): ToggleMaintenanceModeBodyType {
		return ToggleMaintenanceModeBody;
	}
}

export { ApiToggleMaintenanceModeEndpoint };
