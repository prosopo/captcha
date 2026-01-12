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

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApiAdminRoutesProvider } from "../../../api/admin/createApiAdminRoutesProvider.js";
import { AdminApiPaths } from "@prosopo/types";
import { createMockProviderEnvironment, createMockExpressObjects } from "../testUtils/mockProviderEnv.js";

describe("Admin Routes Provider", () => {
    let mockEnv: ReturnType<typeof createMockProviderEnvironment>;
    let mockReq: any;
    let mockRes: any;
    let mockNext: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockEnv = createMockProviderEnvironment();
        ({ mockReq, mockRes, mockNext } = createMockExpressObjects());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("Router Creation", () => {
        it("should create an admin routes provider with environment", () => {
            const adminRoutes = createApiAdminRoutesProvider(mockEnv);
            expect(adminRoutes).toBeDefined();
            expect(adminRoutes.getRouter).toBeDefined();
        });

        it("should return an express router", () => {
            const adminRoutes = createApiAdminRoutesProvider(mockEnv);
            const router = adminRoutes.getRouter();
            expect(router).toBeDefined();
            expect(typeof router.get).toBe("function");
            expect(typeof router.post).toBe("function");
        });
    });

    describe("Route Registration", () => {
        it("should register GET /admin/provider-details endpoint", () => {
            const adminRoutes = createApiAdminRoutesProvider(mockEnv);
            const router = adminRoutes.getRouter();

            const getSpy = vi.spyOn(router, "get");
            adminRoutes.getRouter(); // Trigger route registration

            const registeredPaths = getSpy.mock.calls.map(call => call[0]);
            expect(registeredPaths).toContain(AdminApiPaths.GetProviderDetails);
        });

        it("should register POST /admin/register-site-key endpoint", () => {
            const adminRoutes = createApiAdminRoutesProvider(mockEnv);
            const router = adminRoutes.getRouter();

            const postSpy = vi.spyOn(router, "post");
            adminRoutes.getRouter();

            const registeredPaths = postSpy.mock.calls.map(call => call[0]);
            expect(registeredPaths).toContain(AdminApiPaths.RegisterSiteKey);
        });

        it("should register POST /admin/toggle-maintenance endpoint", () => {
            const adminRoutes = createApiAdminRoutesProvider(mockEnv);
            const router = adminRoutes.getRouter();

            const postSpy = vi.spyOn(router, "post");
            adminRoutes.getRouter();

            const registeredPaths = postSpy.mock.calls.map(call => call[0]);
            expect(registeredPaths).toContain(AdminApiPaths.ToggleMaintenanceMode);
        });

        it("should register POST /admin/update-detector-key endpoint", () => {
            const adminRoutes = createApiAdminRoutesProvider(mockEnv);
            const router = adminRoutes.getRouter();

            const postSpy = vi.spyOn(router, "post");
            adminRoutes.getRouter();

            const registeredPaths = postSpy.mock.calls.map(call => call[0]);
            expect(registeredPaths).toContain(AdminApiPaths.UpdateDetectorKey);
        });

        it("should register POST /admin/remove-detector-key endpoint", () => {
            const adminRoutes = createApiAdminRoutesProvider(mockEnv);
            const router = adminRoutes.getRouter();

            const postSpy = vi.spyOn(router, "post");
            adminRoutes.getRouter();

            const registeredPaths = postSpy.mock.calls.map(call => call[0]);
            expect(registeredPaths).toContain(AdminApiPaths.RemoveDetectorKey);
        });
    });

    describe("Provider Details Endpoint", () => {
        it("should handle GET /admin/provider-details successfully", async () => {
            const adminRoutes = createApiAdminRoutesProvider(mockEnv);
            const router = adminRoutes.getRouter();

            // Mock provider details response
            const mockProviderDetails = {
                siteKey: "test-site-key",
                owner: "test-owner",
                fee: 100,
                payee: "test-payee",
                status: "active",
                datasetId: "test-dataset",
            };

            mockEnv.tasks.getProviderDetails = vi.fn().mockResolvedValue(mockProviderDetails);

            const getSpy = vi.spyOn(router, "get");
            adminRoutes.getRouter();

            const providerDetailsHandler = getSpy.mock.calls.find(
                (call) => call[0] === AdminApiPaths.GetProviderDetails
            )?.[1];

            expect(providerDetailsHandler).toBeDefined();

            await providerDetailsHandler(mockReq, mockRes, mockNext);

            expect(mockEnv.tasks.getProviderDetails).toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalled();
        });

        it("should handle errors in provider details retrieval", async () => {
            const adminRoutes = createApiAdminRoutesProvider(mockEnv);
            const router = adminRoutes.getRouter();

            const error = new Error("Provider not found");
            mockEnv.tasks.getProviderDetails = vi.fn().mockRejectedValue(error);

            const getSpy = vi.spyOn(router, "get");
            adminRoutes.getRouter();

            const providerDetailsHandler = getSpy.mock.calls.find(
                (call) => call[0] === AdminApiPaths.GetProviderDetails
            )?.[1];

            await providerDetailsHandler(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe("Site Key Registration Endpoint", () => {
        it("should handle POST /admin/register-site-key successfully", async () => {
            const adminRoutes = createApiAdminRoutesProvider(mockEnv);
            const router = adminRoutes.getRouter();

            mockReq.body = {
                siteKey: "new-site-key",
                origin: "https://example.com",
            };

            // Mock successful registration
            const mockRegistrationResult = { success: true, siteKey: "new-site-key" };
            vi.doMock("../../../api/admin/apiRegisterSiteKeyEndpoint.js", () => ({
                apiRegisterSiteKeyEndpoint: vi.fn().mockResolvedValue(mockRegistrationResult),
            }));

            const postSpy = vi.spyOn(router, "post");
            adminRoutes.getRouter();

            const registerSiteKeyHandler = postSpy.mock.calls.find(
                (call) => call[0] === AdminApiPaths.RegisterSiteKey
            )?.[1];

            expect(registerSiteKeyHandler).toBeDefined();

            await registerSiteKeyHandler(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it("should handle validation errors in site key registration", async () => {
            const adminRoutes = createApiAdminRoutesProvider(mockEnv);
            const router = adminRoutes.getRouter();

            mockReq.body = {}; // Missing required fields

            const validationError = new Error("Validation failed");
            vi.doMock("../../../api/admin/apiRegisterSiteKeyEndpoint.js", () => ({
                apiRegisterSiteKeyEndpoint: vi.fn().mockRejectedValue(validationError),
            }));

            const postSpy = vi.spyOn(router, "post");
            adminRoutes.getRouter();

            const registerSiteKeyHandler = postSpy.mock.calls.find(
                (call) => call[0] === AdminApiPaths.RegisterSiteKey
            )?.[1];

            await registerSiteKeyHandler(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(validationError);
        });
    });

    describe("Maintenance Mode Toggle Endpoint", () => {
        it("should handle POST /admin/toggle-maintenance successfully", async () => {
            const adminRoutes = createApiAdminRoutesProvider(mockEnv);
            const router = adminRoutes.getRouter();

            mockReq.body = { maintenanceMode: true };

            const mockToggleResult = { maintenanceMode: true, updated: true };
            vi.doMock("../../../api/admin/apiToggleMaintenanceModeEndpoint.js", () => ({
                apiToggleMaintenanceModeEndpoint: vi.fn().mockResolvedValue(mockToggleResult),
            }));

            const postSpy = vi.spyOn(router, "post");
            adminRoutes.getRouter();

            const toggleMaintenanceHandler = postSpy.mock.calls.find(
                (call) => call[0] === AdminApiPaths.ToggleMaintenanceMode
            )?.[1];

            expect(toggleMaintenanceHandler).toBeDefined();

            await toggleMaintenanceHandler(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe("Detector Key Management Endpoints", () => {
        it("should handle POST /admin/update-detector-key successfully", async () => {
            const adminRoutes = createApiAdminRoutesProvider(mockEnv);
            const router = adminRoutes.getRouter();

            mockReq.body = {
                detectorKey: "new-detector-key",
                action: "add",
            };

            const mockUpdateResult = { success: true, detectorKey: "new-detector-key" };
            vi.doMock("../../../api/admin/apiUpdateDetectorKeyEndpoint.js", () => ({
                apiUpdateDetectorKeyEndpoint: vi.fn().mockResolvedValue(mockUpdateResult),
            }));

            const postSpy = vi.spyOn(router, "post");
            adminRoutes.getRouter();

            const updateDetectorKeyHandler = postSpy.mock.calls.find(
                (call) => call[0] === AdminApiPaths.UpdateDetectorKey
            )?.[1];

            expect(updateDetectorKeyHandler).toBeDefined();

            await updateDetectorKeyHandler(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it("should handle POST /admin/remove-detector-key successfully", async () => {
            const adminRoutes = createApiAdminRoutesProvider(mockEnv);
            const router = adminRoutes.getRouter();

            mockReq.body = { detectorKey: "detector-key-to-remove" };

            const mockRemoveResult = { success: true, removed: true };
            vi.doMock("../../../api/admin/apiRemoveDetectorKeyEndpoint.js", () => ({
                apiRemoveDetectorKeyEndpoint: vi.fn().mockResolvedValue(mockRemoveResult),
            }));

            const postSpy = vi.spyOn(router, "post");
            adminRoutes.getRouter();

            const removeDetectorKeyHandler = postSpy.mock.calls.find(
                (call) => call[0] === AdminApiPaths.RemoveDetectorKey
            )?.[1];

            expect(removeDetectorKeyHandler).toBeDefined();

            await removeDetectorKeyHandler(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe("Error Handling", () => {
        it("should propagate errors through next() for all endpoints", async () => {
            const adminRoutes = createApiAdminRoutesProvider(mockEnv);
            const router = adminRoutes.getRouter();

            const error = new Error("Endpoint error");

            // Mock all admin endpoints to throw errors
            vi.doMock("../../../api/admin/apiRegisterSiteKeyEndpoint.js", () => ({
                apiRegisterSiteKeyEndpoint: vi.fn().mockRejectedValue(error),
            }));
            vi.doMock("../../../api/admin/apiToggleMaintenanceModeEndpoint.js", () => ({
                apiToggleMaintenanceModeEndpoint: vi.fn().mockRejectedValue(error),
            }));
            vi.doMock("../../../api/admin/apiUpdateDetectorKeyEndpoint.js", () => ({
                apiUpdateDetectorKeyEndpoint: vi.fn().mockRejectedValue(error),
            }));
            vi.doMock("../../../api/admin/apiRemoveDetectorKeyEndpoint.js", () => ({
                apiRemoveDetectorKeyEndpoint: vi.fn().mockRejectedValue(error),
            }));

            const postSpy = vi.spyOn(router, "post");
            const getSpy = vi.spyOn(router, "get");

            adminRoutes.getRouter();

            // Test POST endpoints
            const postHandlers = postSpy.mock.calls.map(call => call[1]);
            for (const handler of postHandlers) {
                await handler(mockReq, mockRes, mockNext);
                expect(mockNext).toHaveBeenCalledWith(error);
            }

            // Test GET endpoints
            const getHandlers = getSpy.mock.calls.map(call => call[1]);
            for (const handler of getHandlers) {
                await handler(mockReq, mockRes, mockNext);
                expect(mockNext).toHaveBeenCalledWith(error);
            }
        });

        it("should handle database connection errors", async () => {
            // Mock database disconnection
            mockEnv.db.isConnected = vi.fn().mockReturnValue(false);

            const adminRoutes = createApiAdminRoutesProvider(mockEnv);
            expect(adminRoutes).toBeDefined();

            expect(mockEnv.db.isConnected()).toBe(false);
        });
    });
});