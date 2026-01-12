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
import { prosopoRouter } from "../../../api/captcha.js";
import { ClientApiPaths } from "@prosopo/types";
import { createMockProviderEnvironment, createMockExpressObjects } from "../testUtils/mockProviderEnv.js";

describe("prosopoRouter", () => {
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

    describe("Image Captcha Challenge endpoint", () => {
        it("should route POST /api/v1/captcha/image-challenge to getImageCaptchaChallenge", async () => {
            const router = prosopoRouter(mockEnv);

            // Mock the router.post method to capture arguments
            const postSpy = vi.spyOn(router, "post");

            // Re-instantiate to trigger route registration
            prosopoRouter(mockEnv);

            // Find the handler for the image captcha challenge path
            const imageCaptchaHandler = postSpy.mock.calls.find(
                (call) => call[0] === ClientApiPaths.GetImageCaptchaChallenge
            )?.[1];

            expect(imageCaptchaHandler).toBeDefined();

            // Mock successful captcha challenge generation
            const mockChallenge = { captchaId: "test-id", images: [] };
            vi.doMock("../../../api/captcha/getImageCaptchaChallenge.js", () => ({
                default: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(mockChallenge)),
            }));

            // Call the handler
            await imageCaptchaHandler(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it("should handle errors in image captcha challenge generation", async () => {
            const router = prosopoRouter(mockEnv);
            const postSpy = vi.spyOn(router, "post");
            prosopoRouter(mockEnv);

            const imageCaptchaHandler = postSpy.mock.calls.find(
                (call) => call[0] === ClientApiPaths.GetImageCaptchaChallenge
            )?.[1];

            expect(imageCaptchaHandler).toBeDefined();

            // Mock error in challenge generation
            vi.doMock("../../../api/captcha/getImageCaptchaChallenge.js", () => ({
                default: vi.fn().mockReturnValue(vi.fn().mockRejectedValue(new Error("Challenge generation failed"))),
            }));

            await imageCaptchaHandler(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe("PoW Captcha Challenge endpoint", () => {
        it("should route POST /api/v1/captcha/pow-challenge to getPoWCaptchaChallenge", async () => {
            const router = prosopoRouter(mockEnv);
            const postSpy = vi.spyOn(router, "post");
            prosopoRouter(mockEnv);

            const powCaptchaHandler = postSpy.mock.calls.find(
                (call) => call[0] === ClientApiPaths.GetPowCaptchaChallenge
            )?.[1];

            expect(powCaptchaHandler).toBeDefined();

            // Mock successful PoW challenge generation
            const mockChallenge = { challenge: "test-challenge", difficulty: 4 };
            vi.doMock("../../../api/captcha/getPoWCaptchaChallenge.js", () => ({
                default: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(mockChallenge)),
            }));

            await powCaptchaHandler(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe("Frictionless Captcha Challenge endpoint", () => {
        it("should route POST /api/v1/captcha/frictionless-challenge to getFrictionlessCaptchaChallenge", async () => {
            const router = prosopoRouter(mockEnv);
            const postSpy = vi.spyOn(router, "post");
            prosopoRouter(mockEnv);

            const frictionlessCaptchaHandler = postSpy.mock.calls.find(
                (call) => call[0] === ClientApiPaths.GetFrictionlessCaptchaChallenge
            )?.[1];

            expect(frictionlessCaptchaHandler).toBeDefined();

            // Mock successful frictionless challenge generation
            const mockChallenge = { verified: true, score: 0.9 };
            vi.doMock("../../../api/captcha/getFrictionlessCaptchaChallenge.js", () => ({
                default: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(mockChallenge)),
            }));

            await frictionlessCaptchaHandler(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe("Image Captcha Solution endpoint", () => {
        it("should route POST /api/v1/captcha/image-solution to submitImageCaptchaSolution", async () => {
            const router = prosopoRouter(mockEnv);
            const postSpy = vi.spyOn(router, "post");
            prosopoRouter(mockEnv);

            const imageSolutionHandler = postSpy.mock.calls.find(
                (call) => call[0] === ClientApiPaths.SubmitImageCaptchaSolution
            )?.[1];

            expect(imageSolutionHandler).toBeDefined();

            // Mock successful solution submission
            const mockResult = { verified: true, captchaId: "test-id" };
            vi.doMock("../../../api/captcha/submitImageCaptchaSolution.js", () => ({
                default: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(mockResult)),
            }));

            await imageSolutionHandler(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe("PoW Captcha Solution endpoint", () => {
        it("should route POST /api/v1/captcha/pow-solution to submitPoWCaptchaSolution", async () => {
            const router = prosopoRouter(mockEnv);
            const postSpy = vi.spyOn(router, "post");
            prosopoRouter(mockEnv);

            const powSolutionHandler = postSpy.mock.calls.find(
                (call) => call[0] === ClientApiPaths.SubmitPowCaptchaSolution
            )?.[1];

            expect(powSolutionHandler).toBeDefined();

            // Mock successful PoW solution submission
            const mockResult = { verified: true, proof: "test-proof" };
            vi.doMock("../../../api/captcha/submitPoWCaptchaSolution.js", () => ({
                default: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(mockResult)),
            }));

            await powSolutionHandler(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe("Router setup", () => {
        it("should initialize user access rules storage", () => {
            prosopoRouter(mockEnv);
            expect(mockEnv.db.getUserAccessRulesStorage).toHaveBeenCalled();
        });

        it("should create an express router instance", () => {
            const router = prosopoRouter(mockEnv);
            expect(router).toBeDefined();
            expect(typeof router.post).toBe("function");
        });

        it("should register all required routes", () => {
            const router = prosopoRouter(mockEnv);
            const postSpy = vi.spyOn(router, "post");

            // Re-instantiate to count route registrations
            prosopoRouter(mockEnv);

            // Should register 5 POST routes
            expect(postSpy).toHaveBeenCalledTimes(5);

            const registeredPaths = postSpy.mock.calls.map(call => call[0]);
            expect(registeredPaths).toEqual([
                ClientApiPaths.GetImageCaptchaChallenge,
                ClientApiPaths.GetPowCaptchaChallenge,
                ClientApiPaths.GetFrictionlessCaptchaChallenge,
                ClientApiPaths.SubmitImageCaptchaSolution,
                ClientApiPaths.SubmitPowCaptchaSolution,
            ]);
        });
    });

    describe("Error handling", () => {
        it("should propagate errors through next() for all endpoints", async () => {
            const router = prosopoRouter(mockEnv);
            const postSpy = vi.spyOn(router, "post");
            prosopoRouter(mockEnv);

            const handlers = postSpy.mock.calls.map(call => call[1]);

            // Test each handler propagates errors
            for (const handler of handlers) {
                const error = new Error("Test error");

                // Mock the imported functions to throw errors
                vi.doMock("../../../api/captcha/getImageCaptchaChallenge.js", () => ({
                    default: vi.fn().mockReturnValue(vi.fn().mockRejectedValue(error)),
                }));

                await handler(mockReq, mockRes, mockNext);
                expect(mockNext).toHaveBeenCalledWith(error);
            }
        });
    });
});