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

import { ApiEndpointResponseStatus } from "@prosopo/api-route";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	ApiToggleMaintenanceModeEndpoint,
	clearMaintenanceModeSiteKeys,
	getMaintenanceMode,
	getMaintenanceModeSiteKeys,
	isSiteKeyInMaintenanceMode,
	setMaintenanceMode,
	setMaintenanceModeForSiteKeys,
} from "../../../../api/admin/apiToggleMaintenanceModeEndpoint.js";

describe("getMaintenanceMode", () => {
	beforeEach(() => {
		process.env.MAINTENANCE_MODE = undefined;
	});

	afterEach(() => {
		process.env.MAINTENANCE_MODE = undefined;
	});

	it("returns false when MAINTENANCE_MODE is not set", () => {
		expect(getMaintenanceMode()).toBe(false);
	});

	it("returns true when MAINTENANCE_MODE is 'true'", () => {
		process.env.MAINTENANCE_MODE = "true";
		expect(getMaintenanceMode()).toBe(true);
	});

	it("returns true when MAINTENANCE_MODE is 'TRUE'", () => {
		process.env.MAINTENANCE_MODE = "TRUE";
		expect(getMaintenanceMode()).toBe(true);
	});

	it("returns false when MAINTENANCE_MODE is 'false'", () => {
		process.env.MAINTENANCE_MODE = "false";
		expect(getMaintenanceMode()).toBe(false);
	});

	it("returns false when MAINTENANCE_MODE is other value", () => {
		process.env.MAINTENANCE_MODE = "other";
		expect(getMaintenanceMode()).toBe(false);
	});
});

describe("setMaintenanceMode", () => {
	beforeEach(() => {
		process.env.MAINTENANCE_MODE = undefined;
	});

	afterEach(() => {
		process.env.MAINTENANCE_MODE = undefined;
	});

	it("sets MAINTENANCE_MODE to 'true' when enabled is true", () => {
		setMaintenanceMode(true);
		expect(process.env.MAINTENANCE_MODE).toBe("true");
		expect(getMaintenanceMode()).toBe(true);
	});

	it("sets MAINTENANCE_MODE to 'false' when enabled is false", () => {
		setMaintenanceMode(false);
		expect(process.env.MAINTENANCE_MODE).toBe("false");
		expect(getMaintenanceMode()).toBe(false);
	});
});

describe("ApiToggleMaintenanceModeEndpoint", () => {
	let endpoint: ApiToggleMaintenanceModeEndpoint;
	let mockLogger: {
		info: ReturnType<typeof vi.fn>;
		with: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		process.env.MAINTENANCE_MODE = undefined;
		mockLogger = {
			info: vi.fn(),
			with: vi.fn().mockReturnThis(),
		};
		endpoint = new ApiToggleMaintenanceModeEndpoint();
	});

	afterEach(() => {
		process.env.MAINTENANCE_MODE = undefined;
	});

	it("returns success status when toggling maintenance mode", async () => {
		const result = await endpoint.processRequest(
			{ enabled: true },
			mockLogger as never,
		);

		expect(result.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(result.data).toHaveProperty("maintenanceMode", true);
	});

	it("sets maintenance mode to enabled", async () => {
		await endpoint.processRequest({ enabled: true }, mockLogger as never);

		expect(getMaintenanceMode()).toBe(true);
	});

	it("sets maintenance mode to disabled", async () => {
		setMaintenanceMode(true);
		await endpoint.processRequest({ enabled: false }, mockLogger as never);

		expect(getMaintenanceMode()).toBe(false);
	});

	it("logs previous and current maintenance mode state", async () => {
		setMaintenanceMode(false);
		await endpoint.processRequest({ enabled: true }, mockLogger as never);

		expect(mockLogger.info).toHaveBeenCalledWith(expect.any(Function));
		const logCall = mockLogger.info.mock.calls.find(
			(call) =>
				typeof call[0] === "function" &&
				call[0]().msg === "Toggling maintenance mode",
		);
		expect(logCall).toBeDefined();
	});

	it("returns correct schema", () => {
		const schema = endpoint.getRequestArgsSchema();
		expect(schema).toBeDefined();
	});
});

const KEY_A = "5EZVvsHMrKCFaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const KEY_B = "5FWoE4Z7K24tbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

describe("per-site-key maintenance mode", () => {
	beforeEach(() => {
		process.env.MAINTENANCE_MODE = "false";
		clearMaintenanceModeSiteKeys();
	});

	afterEach(() => {
		process.env.MAINTENANCE_MODE = undefined;
		clearMaintenanceModeSiteKeys();
	});

	it("puts only the named site key into maintenance mode", () => {
		setMaintenanceModeForSiteKeys([KEY_A], true);
		expect(isSiteKeyInMaintenanceMode(KEY_A)).toBe(true);
		expect(isSiteKeyInMaintenanceMode(KEY_B)).toBe(false);
	});

	it("removes a site key again", () => {
		setMaintenanceModeForSiteKeys([KEY_A], true);
		setMaintenanceModeForSiteKeys([KEY_A], false);
		expect(isSiteKeyInMaintenanceMode(KEY_A)).toBe(false);
		expect(getMaintenanceModeSiteKeys()).toEqual([]);
	});

	it("treats the node-wide flag as covering every site key", () => {
		setMaintenanceMode(true);
		expect(isSiteKeyInMaintenanceMode(KEY_A)).toBe(true);
		expect(isSiteKeyInMaintenanceMode(KEY_B)).toBe(true);
	});

	it("returns false for an absent site key unless the node-wide flag is on", () => {
		setMaintenanceModeForSiteKeys([KEY_A], true);
		expect(isSiteKeyInMaintenanceMode(undefined)).toBe(false);
		setMaintenanceMode(true);
		expect(isSiteKeyInMaintenanceMode(undefined)).toBe(true);
	});
});

describe("ApiToggleMaintenanceModeEndpoint with site keys", () => {
	const endpoint = new ApiToggleMaintenanceModeEndpoint();
	const mockLogger = {
		info: vi.fn(),
		with: vi.fn().mockReturnThis(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		process.env.MAINTENANCE_MODE = "false";
		clearMaintenanceModeSiteKeys();
	});

	afterEach(() => {
		process.env.MAINTENANCE_MODE = undefined;
		clearMaintenanceModeSiteKeys();
	});

	it("scopes the toggle to the supplied site keys", async () => {
		await endpoint.processRequest(
			{ enabled: true, siteKeys: [KEY_A] },
			mockLogger as never,
		);
		expect(isSiteKeyInMaintenanceMode(KEY_A)).toBe(true);
		expect(isSiteKeyInMaintenanceMode(KEY_B)).toBe(false);
	});

	it("leaves the node-wide flag alone when scoping to site keys", async () => {
		// The whole point of the scoped form: one customer must not take the
		// node out of scoring for everybody else.
		await endpoint.processRequest(
			{ enabled: true, siteKeys: [KEY_A] },
			mockLogger as never,
		);
		expect(getMaintenanceMode()).toBe(false);
	});

	it("still sets the node-wide flag when no site keys are given", async () => {
		await endpoint.processRequest({ enabled: true }, mockLogger as never);
		expect(getMaintenanceMode()).toBe(true);
	});

	it("treats an empty site key list as the node-wide form", async () => {
		await endpoint.processRequest(
			{ enabled: true, siteKeys: [] },
			mockLogger as never,
		);
		expect(getMaintenanceMode()).toBe(true);
	});

	it("reports the current site keys back to the caller", async () => {
		await endpoint.processRequest(
			{ enabled: true, siteKeys: [KEY_A, KEY_B] },
			mockLogger as never,
		);
		const response = await endpoint.processRequest(
			{ enabled: false, siteKeys: [KEY_B] },
			mockLogger as never,
		);
		expect(response.data).toMatchObject({
			maintenanceMode: false,
			maintenanceModeSiteKeys: [KEY_A],
		});
	});
});
