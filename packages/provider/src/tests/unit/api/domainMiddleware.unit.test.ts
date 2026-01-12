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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { domainMiddleware } from "../../../api/domainMiddleware.js";
import { createMockExpressObjects, createMockProviderEnvironment } from "../testUtils/mockProviderEnv.js";

describe("domainMiddleware", () => {
    let mockEnv: ReturnType<typeof createMockProviderEnvironment>;
    let { mockReq, mockRes, mockNext }: ReturnType<typeof createMockExpressObjects>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockEnv = createMockProviderEnvironment();
        ({ mockReq, mockRes, mockNext } = createMockExpressObjects());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should call next() for valid site key and domain", async () => {
        // Setup valid request
        mockReq.headers["prosopo-site-key"] = "valid-site-key";
        mockReq.headers.origin = "https://example.com";
        mockReq.headers.referer = "https://example.com/page";

        // Mock successful validation
        mockEnv.tasks.getProviderDetails = vi.fn().mockResolvedValue({
            siteKey: "valid-site-key",
            origin: "https://example.com",
        });

        const middleware = domainMiddleware(mockEnv);
        await middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockEnv.tasks.getProviderDetails).toHaveBeenCalledWith("valid-site-key");
    });

    it("should return 400 error when prosopo-site-key header is missing", async () => {
        // Request without site key
        mockReq.headers["prosopo-site-key"] = undefined;

        const middleware = domainMiddleware(mockEnv);
        await middleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: "Missing prosopo-site-key header",
        });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 403 error when provider details cannot be retrieved", async () => {
        mockReq.headers["prosopo-site-key"] = "invalid-site-key";

        // Mock provider not found
        mockEnv.tasks.getProviderDetails = vi.fn().mockRejectedValue(
            new Error("Provider not found")
        );

        const middleware = domainMiddleware(mockEnv);
        await middleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: "Invalid site key or domain not allowed",
        });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it("should allow localhost origins in development", async () => {
        mockReq.headers["prosopo-site-key"] = "valid-site-key";
        mockReq.headers.origin = "http://localhost:3000";

        // Mock successful validation
        mockEnv.tasks.getProviderDetails = vi.fn().mockResolvedValue({
            siteKey: "valid-site-key",
            origin: "https://example.com", // Different origin but should allow localhost
        });

        const middleware = domainMiddleware(mockEnv);
        await middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
    });

    it("should validate domain against allowed origins", async () => {
        mockReq.headers["prosopo-site-key"] = "valid-site-key";
        mockReq.headers.origin = "https://malicious.com";

        // Mock provider with different allowed origin
        mockEnv.tasks.getProviderDetails = vi.fn().mockResolvedValue({
            siteKey: "valid-site-key",
            origin: "https://example.com",
        });

        const middleware = domainMiddleware(mockEnv);
        await middleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: "Invalid site key or domain not allowed",
        });
    });

    it("should handle missing origin header gracefully", async () => {
        mockReq.headers["prosopo-site-key"] = "valid-site-key";
        mockReq.headers.origin = undefined;

        // Mock successful validation
        mockEnv.tasks.getProviderDetails = vi.fn().mockResolvedValue({
            siteKey: "valid-site-key",
            origin: "https://example.com",
        });

        const middleware = domainMiddleware(mockEnv);
        await middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
    });

    it("should handle errors during provider details retrieval", async () => {
        mockReq.headers["prosopo-site-key"] = "valid-site-key";

        // Mock database error
        mockEnv.tasks.getProviderDetails = vi.fn().mockRejectedValue(
            new Error("Database connection failed")
        );

        const middleware = domainMiddleware(mockEnv);
        await middleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: "Invalid site key or domain not allowed",
        });
        expect(mockEnv.logger.error).toHaveBeenCalled();
    });

    it("should validate multiple allowed origins", async () => {
        mockReq.headers["prosopo-site-key"] = "valid-site-key";
        mockReq.headers.origin = "https://subdomain.example.com";

        // Mock provider with wildcard origin
        mockEnv.tasks.getProviderDetails = vi.fn().mockResolvedValue({
            siteKey: "valid-site-key",
            origin: "*.example.com",
        });

        const middleware = domainMiddleware(mockEnv);
        await middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
    });

    it("should reject requests with malformed origins", async () => {
        mockReq.headers["prosopo-site-key"] = "valid-site-key";
        mockReq.headers.origin = "not-a-valid-url";

        mockEnv.tasks.getProviderDetails = vi.fn().mockResolvedValue({
            siteKey: "valid-site-key",
            origin: "https://example.com",
        });

        const middleware = domainMiddleware(mockEnv);
        await middleware(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
    });
});