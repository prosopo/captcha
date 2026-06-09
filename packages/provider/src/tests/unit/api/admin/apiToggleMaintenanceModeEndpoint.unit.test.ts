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
	getMaintenanceMode,
	setMaintenanceMode,
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
	};

	beforeEach(() => {
		vi.clearAllMocks();
		process.env.MAINTENANCE_MODE = undefined;
		mockLogger = {
			info: vi.fn(),
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
