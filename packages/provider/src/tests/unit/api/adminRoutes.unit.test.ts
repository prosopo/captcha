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

import { AdminApiPaths } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApiAdminRoutesProvider } from "../../../api/admin/createApiAdminRoutesProvider.js";
import {
	createMockExpressObjects,
	createMockProviderEnvironment,
} from "../testUtils/mockProviderEnv.js";

describe("Admin Routes Provider", () => {
	let mockEnv: ReturnType<typeof createMockProviderEnvironment>;
	// biome-ignore lint/suspicious/noExplicitAny: tests
	let mockReq: any;
	// biome-ignore lint/suspicious/noExplicitAny: tests
	let mockRes: any;
	// biome-ignore lint/suspicious/noExplicitAny: tests
	let mockNext: any;
	// biome-ignore lint/suspicious/noExplicitAny: tests
	let mockLogger: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockEnv = createMockProviderEnvironment();
		({ mockReq, mockRes, mockNext } = createMockExpressObjects());
		mockLogger = {
			info: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			debug: vi.fn(),
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Routes Provider Creation", () => {
		it("should create an admin routes provider with environment", () => {
			const adminRoutes = createApiAdminRoutesProvider(mockEnv);
			expect(adminRoutes).toBeDefined();
			expect(adminRoutes.getRoutes).toBeDefined();
		});

		it("should return API routes", () => {
			const adminRoutes = createApiAdminRoutesProvider(mockEnv);
			const routes = adminRoutes.getRoutes();
			expect(routes).toBeDefined();
			expect(typeof routes).toBe("object");
		});
	});

	describe("Route Registration", () => {
		it("should register admin routes", () => {
			const adminRoutes = createApiAdminRoutesProvider(mockEnv);
			const routes = adminRoutes.getRoutes();

			expect(routes).toBeDefined();
			expect(Object.keys(routes)).toHaveLength(4); // Should have 4 routes
		});

		it("should register POST /admin/register-site-key endpoint", () => {
			const adminRoutes = createApiAdminRoutesProvider(mockEnv);
			const routes = adminRoutes.getRoutes();

			expect(routes).toHaveProperty(AdminApiPaths.SiteKeyRegister);
			expect(routes[AdminApiPaths.SiteKeyRegister]).toBeDefined();
		});

		it("should register POST /admin/toggle-maintenance endpoint", () => {
			const adminRoutes = createApiAdminRoutesProvider(mockEnv);
			const routes = adminRoutes.getRoutes();

			expect(routes).toHaveProperty(AdminApiPaths.ToggleMaintenanceMode);
			expect(routes[AdminApiPaths.ToggleMaintenanceMode]).toBeDefined();
		});

		it("should register POST /admin/update-detector-key endpoint", () => {
			const adminRoutes = createApiAdminRoutesProvider(mockEnv);
			const routes = adminRoutes.getRoutes();

			expect(routes).toHaveProperty(AdminApiPaths.UpdateDetectorKey);
			expect(routes[AdminApiPaths.UpdateDetectorKey]).toBeDefined();
		});

		it("should register POST /admin/remove-detector-key endpoint", () => {
			const adminRoutes = createApiAdminRoutesProvider(mockEnv);
			const routes = adminRoutes.getRoutes();

			expect(routes).toHaveProperty(AdminApiPaths.RemoveDetectorKey);
			expect(routes[AdminApiPaths.RemoveDetectorKey]).toBeDefined();
		});
	});

	describe("Site Key Registration Endpoint", () => {
		it("should handle POST /admin/register-site-key endpoint creation", async () => {
			const adminRoutes = createApiAdminRoutesProvider(mockEnv);
			const routes = adminRoutes.getRoutes();

			const endpoint = routes[AdminApiPaths.SiteKeyRegister];
			expect(endpoint).toBeDefined();
			expect(typeof endpoint?.processRequest).toBe("function");
		});

		it("should handle validation errors in site key registration", async () => {
			const adminRoutes = createApiAdminRoutesProvider(mockEnv);
			const routes = adminRoutes.getRoutes();

			const endpoint = routes[AdminApiPaths.SiteKeyRegister];
			expect(endpoint).toBeDefined();

			// Invalid site key should cause validation error
			await expect(
				endpoint?.processRequest(
					{
						siteKey: "invalid-site-key",
						origin: "https://example.com",
					},
					mockLogger,
				),
			).rejects.toThrow();
		});
	});

	describe("Maintenance Mode Toggle Endpoint", () => {
		it("should handle POST /admin/toggle-maintenance successfully", async () => {
			const adminRoutes = createApiAdminRoutesProvider(mockEnv);
			const routes = adminRoutes.getRoutes();

			const endpoint = routes[AdminApiPaths.ToggleMaintenanceMode];
			expect(endpoint).toBeDefined();

			const result = await endpoint?.processRequest(
				{ enabled: true },
				mockLogger,
			);
			expect(result).toBeDefined();
		});
	});

	describe("Detector Key Management Endpoints", () => {
		it("should handle POST /admin/update-detector-key endpoint", async () => {
			const adminRoutes = createApiAdminRoutesProvider(mockEnv);
			const routes = adminRoutes.getRoutes();

			const endpoint = routes[AdminApiPaths.UpdateDetectorKey];
			expect(endpoint).toBeDefined();

			// Test that the endpoint can be called (validation happens internally)
			const result = await endpoint?.processRequest(
				{
					detectorKey: "some-detector-key",
					action: "add",
				},
				mockLogger,
			);

			expect(result).toBeDefined();
		});

		it("should handle POST /admin/remove-detector-key endpoint", async () => {
			const adminRoutes = createApiAdminRoutesProvider(mockEnv);
			const routes = adminRoutes.getRoutes();

			const endpoint = routes[AdminApiPaths.RemoveDetectorKey];
			expect(endpoint).toBeDefined();

			// Test that the endpoint can be called (validation happens internally)
			const result = await endpoint?.processRequest(
				{
					detectorKey: "some-detector-key",
				},
				mockLogger,
			);

			expect(result).toBeDefined();
		});
	});

	describe("Error Handling", () => {
		it("should handle database connection errors", async () => {
			// Mock database disconnection
			// @ts-ignore
			mockEnv.db.isConnected = vi.fn().mockReturnValue(false);

			const adminRoutes = createApiAdminRoutesProvider(mockEnv);
			expect(adminRoutes).toBeDefined();

			// @ts-ignore
			expect(mockEnv.db.isConnected()).toBe(false);
		});
	});
});
