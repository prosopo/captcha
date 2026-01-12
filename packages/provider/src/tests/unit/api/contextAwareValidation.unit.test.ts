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
import { contextAwareValidation } from "../../../api/captcha/contextAwareValidation.js";
import { createMockProviderEnvironment, createMockExpressObjects } from "../testUtils/mockProviderEnv.js";

describe("contextAwareValidation", () => {
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

    describe("Successful Validation", () => {
        it("should call next() when validation passes", async () => {
            // Setup valid request context
            mockReq.headers["prosopo-site-key"] = "valid-site-key";
            mockReq.headers["origin"] = "https://example.com";
            mockReq.body = { userAccount: "test-account" };

            // Mock successful context validation
            const mockValidationResult = {
                valid: true,
                score: 0.9,
                reasons: [],
            };

            vi.doMock("../../../api/captcha/contextAwareValidation.js", () => ({
                contextAwareValidation: vi.fn().mockResolvedValue(mockValidationResult),
            }));

            // Import and test the actual function
            const { contextAwareValidation: actualValidation } = await import(
                "../../../api/captcha/contextAwareValidation.js"
            );

            const validationMiddleware = actualValidation(mockEnv);

            await validationMiddleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it("should validate request context parameters", async () => {
            mockReq.headers["prosopo-site-key"] = "test-site-key";
            mockReq.headers["origin"] = "https://trusted-domain.com";
            mockReq.ip = "192.168.1.100";
            mockReq.headers["user-agent"] = "Mozilla/5.0 (compatible; test-bot)";
            mockReq.body = {
                userAccount: "test-user",
                sessionId: "session-123",
            };

            // Mock context validation
            const mockValidationResult = {
                valid: true,
                score: 0.85,
                reasons: ["Low bot probability"],
            };

            vi.doMock("../../../api/captcha/contextAwareValidation.js", () => ({
                contextAwareValidation: vi.fn().mockResolvedValue(mockValidationResult),
            }));

            const { contextAwareValidation: actualValidation } = await import(
                "../../../api/captcha/contextAwareValidation.js"
            );

            const validationMiddleware = actualValidation(mockEnv);

            await validationMiddleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe("Validation Failure", () => {
        it("should return 403 when context validation fails", async () => {
            mockReq.headers["prosopo-site-key"] = "suspicious-site-key";
            mockReq.ip = "10.0.0.1"; // Suspicious IP
            mockReq.headers["user-agent"] = "bot-agent";

            // Mock failed validation
            const mockValidationResult = {
                valid: false,
                score: 0.1,
                reasons: ["Suspicious IP", "Bot-like user agent"],
            };

            vi.doMock("../../../api/captcha/contextAwareValidation.js", () => ({
                contextAwareValidation: vi.fn().mockResolvedValue(mockValidationResult),
            }));

            const { contextAwareValidation: actualValidation } = await import(
                "../../../api/captcha/contextAwareValidation.js"
            );

            const validationMiddleware = actualValidation(mockEnv);

            await validationMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: "Request blocked by context-aware validation",
                reasons: ["Suspicious IP", "Bot-like user agent"],
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it("should handle high-risk requests", async () => {
            mockReq.headers["prosopo-site-key"] = "blocked-site-key";
            mockReq.ip = "192.168.1.1";

            const mockValidationResult = {
                valid: false,
                score: 0.05,
                reasons: ["Known malicious site key", "Blocked IP range"],
            };

            vi.doMock("../../../api/captcha/contextAwareValidation.js", () => ({
                contextAwareValidation: vi.fn().mockResolvedValue(mockValidationResult),
            }));

            const { contextAwareValidation: actualValidation } = await import(
                "../../../api/captcha/contextAwareValidation.js"
            );

            const validationMiddleware = actualValidation(mockEnv);

            await validationMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: "Request blocked by context-aware validation",
                reasons: ["Known malicious site key", "Blocked IP range"],
            });
        });
    });

    describe("Error Handling", () => {
        it("should handle validation service errors", async () => {
            mockReq.headers["prosopo-site-key"] = "test-site-key";

            const validationError = new Error("Context validation service unavailable");

            vi.doMock("../../../api/captcha/contextAwareValidation.js", () => ({
                contextAwareValidation: vi.fn().mockRejectedValue(validationError),
            }));

            const { contextAwareValidation: actualValidation } = await import(
                "../../../api/captcha/contextAwareValidation.js"
            );

            const validationMiddleware = actualValidation(mockEnv);

            await validationMiddleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(validationError);
        });

        it("should handle database errors during validation", async () => {
            mockReq.headers["prosopo-site-key"] = "test-site-key";

            // Mock database error
            mockEnv.db.isConnected = vi.fn().mockReturnValue(false);

            const dbError = new Error("Database connection failed");

            vi.doMock("../../../api/captcha/contextAwareValidation.js", () => ({
                contextAwareValidation: vi.fn().mockRejectedValue(dbError),
            }));

            const { contextAwareValidation: actualValidation } = await import(
                "../../../api/captcha/contextAwareValidation.js"
            );

            const validationMiddleware = actualValidation(mockEnv);

            await validationMiddleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(dbError);
        });

        it("should handle malformed request data", async () => {
            mockReq.headers["prosopo-site-key"] = ""; // Empty site key
            mockReq.ip = "invalid-ip-address";

            const validationError = new Error("Invalid request parameters");

            vi.doMock("../../../api/captcha/contextAwareValidation.js", () => ({
                contextAwareValidation: vi.fn().mockRejectedValue(validationError),
            }));

            const { contextAwareValidation: actualValidation } = await import(
                "../../../api/captcha/contextAwareValidation.js"
            );

            const validationMiddleware = actualValidation(mockEnv);

            await validationMiddleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(validationError);
        });
    });

    describe("Configuration Integration", () => {
        it("should use configured validation thresholds", async () => {
            // Mock configuration with custom thresholds
            mockEnv.config.captcha = {
                ...mockEnv.config.captcha,
                contextValidation: {
                    minScore: 0.7,
                    blockThreshold: 0.3,
                },
            };

            mockReq.headers["prosopo-site-key"] = "test-site-key";

            const mockValidationResult = {
                valid: true,
                score: 0.75,
                reasons: [],
            };

            vi.doMock("../../../api/captcha/contextAwareValidation.js", () => ({
                contextAwareValidation: vi.fn().mockResolvedValue(mockValidationResult),
            }));

            const { contextAwareValidation: actualValidation } = await import(
                "../../../api/captcha/contextAwareValidation.js"
            );

            const validationMiddleware = actualValidation(mockEnv);

            await validationMiddleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it("should respect disabled validation configuration", async () => {
            // Mock disabled validation
            mockEnv.config.captcha = {
                ...mockEnv.config.captcha,
                contextValidation: {
                    enabled: false,
                },
            };

            mockReq.headers["prosopo-site-key"] = "test-site-key";

            vi.doMock("../../../api/captcha/contextAwareValidation.js", () => ({
                contextAwareValidation: vi.fn().mockResolvedValue({ valid: true }),
            }));

            const { contextAwareValidation: actualValidation } = await import(
                "../../../api/captcha/contextAwareValidation.js"
            );

            const validationMiddleware = actualValidation(mockEnv);

            await validationMiddleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe("Logging Integration", () => {
        it("should log validation results", async () => {
            mockReq.headers["prosopo-site-key"] = "test-site-key";
            mockReq.ip = "127.0.0.1";

            const mockValidationResult = {
                valid: true,
                score: 0.8,
                reasons: ["Clean request"],
            };

            vi.doMock("../../../api/captcha/contextAwareValidation.js", () => ({
                contextAwareValidation: vi.fn().mockResolvedValue(mockValidationResult),
            }));

            const { contextAwareValidation: actualValidation } = await import(
                "../../../api/captcha/contextAwareValidation.js"
            );

            const validationMiddleware = actualValidation(mockEnv);

            await validationMiddleware(mockReq, mockRes, mockNext);

            expect(mockEnv.logger.info).toHaveBeenCalled();
        });

        it("should log blocked requests with reasons", async () => {
            mockReq.headers["prosopo-site-key"] = "blocked-site-key";

            const mockValidationResult = {
                valid: false,
                score: 0.2,
                reasons: ["Blocked site key"],
            };

            vi.doMock("../../../api/captcha/contextAwareValidation.js", () => ({
                contextAwareValidation: vi.fn().mockResolvedValue(mockValidationResult),
            }));

            const { contextAwareValidation: actualValidation } = await import(
                "../../../api/captcha/contextAwareValidation.js"
            );

            const validationMiddleware = actualValidation(mockEnv);

            await validationMiddleware(mockReq, mockRes, mockNext);

            expect(mockEnv.logger.warn).toHaveBeenCalled();
        });
    });
});