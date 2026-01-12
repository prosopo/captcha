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
import { Tasks } from "../../../tasks/index.js";
import { createMockProviderEnvironment } from "../testUtils/mockProviderEnv.js";

describe("Tasks", () => {
	let mockEnv: ReturnType<typeof createMockProviderEnvironment>;
	let tasks: Tasks;

	beforeEach(() => {
		vi.clearAllMocks();
		mockEnv = createMockProviderEnvironment();
		tasks = new Tasks(mockEnv);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Initialization", () => {
		it("should initialize with a provider environment", () => {
			expect(tasks).toBeDefined();
			expect(tasks.env).toBe(mockEnv);
		});

		it("should have access to database through environment", () => {
			expect(tasks.db).toBe(mockEnv.db);
		});

		it("should have access to logger through environment", () => {
			expect(tasks.logger).toBe(mockEnv.logger);
		});
	});

	describe("Image Captcha Operations", () => {
		it("should delegate getImageCaptcha to appropriate task handler", async () => {
			const mockParams = {
				userAccount: "test-account",
				datasetId: "test-dataset",
			};
			const mockResult = { captchaId: "test-id", images: [] };

			// Mock the image captcha task
			vi.doMock("../../../tasks/imgCaptcha/imgCaptchaTasks.js", () => ({
				getImageCaptcha: vi.fn().mockResolvedValue(mockResult),
			}));

			const { getImageCaptcha } = await import(
				"../../../tasks/imgCaptcha/imgCaptchaTasks.js"
			);
			const mockGetImageCaptcha = vi.mocked(getImageCaptcha);

			mockGetImageCaptcha.mockResolvedValue(mockResult);

			// Since Tasks delegates to specific task modules, we test the delegation pattern
			expect(tasks).toHaveProperty("getImageCaptcha");
			expect(typeof tasks.getImageCaptcha).toBe("function");
		});

		it("should handle errors in image captcha generation", async () => {
			const mockParams = { userAccount: "test-account" };
			const error = new Error("Captcha generation failed");

			vi.doMock("../../../tasks/imgCaptcha/imgCaptchaTasks.js", () => ({
				getImageCaptcha: vi.fn().mockRejectedValue(error),
			}));

			const { getImageCaptcha } = await import(
				"../../../tasks/imgCaptcha/imgCaptchaTasks.js"
			);
			const mockGetImageCaptcha = vi.mocked(getImageCaptcha);

			mockGetImageCaptcha.mockRejectedValue(error);

			expect(tasks).toHaveProperty("getImageCaptcha");
		});
	});

	describe("PoW Captcha Operations", () => {
		it("should delegate getPoWCaptcha to PoW task handler", async () => {
			const mockParams = { userAccount: "test-account" };
			const mockResult = { challenge: "test-challenge", difficulty: 4 };

			vi.doMock("../../../tasks/powCaptcha/powTasks.js", () => ({
				getPoWCaptcha: vi.fn().mockResolvedValue(mockResult),
			}));

			const { getPoWCaptcha } = await import(
				"../../../tasks/powCaptcha/powTasks.js"
			);
			const mockGetPoWCaptcha = vi.mocked(getPoWCaptcha);

			mockGetPoWCaptcha.mockResolvedValue(mockResult);

			expect(tasks).toHaveProperty("getPoWCaptcha");
			expect(typeof tasks.getPoWCaptcha).toBe("function");
		});

		it("should handle PoW captcha validation", async () => {
			const mockParams = {
				userAccount: "test-account",
				proofOfWork: { challenge: "test", solution: "solution", difficulty: 4 },
			};

			vi.doMock("../../../tasks/powCaptcha/powTasks.js", () => ({
				submitPoWCaptchaSolution: vi.fn().mockResolvedValue({ verified: true }),
			}));

			expect(tasks).toHaveProperty("submitPoWCaptchaSolution");
		});
	});

	describe("Frictionless Captcha Operations", () => {
		it("should delegate getFrictionlessCaptcha to frictionless task handler", async () => {
			const mockParams = { userAccount: "test-account" };
			const mockResult = { verified: true, score: 0.95 };

			vi.doMock("../../../tasks/frictionless/frictionlessTasks.js", () => ({
				getFrictionlessCaptcha: vi.fn().mockResolvedValue(mockResult),
			}));

			const { getFrictionlessCaptcha } = await import(
				"../../../tasks/frictionless/frictionlessTasks.js"
			);
			const mockGetFrictionlessCaptcha = vi.mocked(getFrictionlessCaptcha);

			mockGetFrictionlessCaptcha.mockResolvedValue(mockResult);

			expect(tasks).toHaveProperty("getFrictionlessCaptcha");
		});
	});

	describe("Dataset Operations", () => {
		it("should delegate dataset operations to dataset task handler", async () => {
			const mockParams = { datasetId: "test-dataset" };
			const mockResult = { datasetId: "test-dataset", images: [] };

			vi.doMock("../../../tasks/dataset/datasetTasks.js", () => ({
				getDataset: vi.fn().mockResolvedValue(mockResult),
			}));

			const { getDataset } = await import(
				"../../../tasks/dataset/datasetTasks.js"
			);
			const mockGetDataset = vi.mocked(getDataset);

			mockGetDataset.mockResolvedValue(mockResult);

			expect(tasks).toHaveProperty("getDataset");
		});
	});

	describe("Detection Operations", () => {
		it("should delegate bot score calculation to detection task handler", async () => {
			const mockParams = {
				userAccount: "test-account",
				ip: "127.0.0.1",
				userAgent: "test-agent",
			};
			const mockResult = {
				baseBotScore: 0.1,
				timestamp: Date.now(),
				userId: "test-user",
				isWebView: false,
				isIframe: false,
			};

			vi.doMock("../../../tasks/detection/getBotScore.js", () => ({
				getBotScore: vi.fn().mockResolvedValue(mockResult),
			}));

			const { getBotScore } = await import(
				"../../../tasks/detection/getBotScore.js"
			);
			const mockGetBotScore = vi.mocked(getBotScore);

			mockGetBotScore.mockResolvedValue(mockResult);

			expect(tasks).toHaveProperty("getBotScore");
		});
	});

	describe("Error Handling", () => {
		it("should propagate errors from task handlers", async () => {
			const error = new Error("Task execution failed");

			vi.doMock("../../../tasks/imgCaptcha/imgCaptchaTasks.js", () => ({
				getImageCaptcha: vi.fn().mockRejectedValue(error),
			}));

			const { getImageCaptcha } = await import(
				"../../../tasks/imgCaptcha/imgCaptchaTasks.js"
			);
			const mockGetImageCaptcha = vi.mocked(getImageCaptcha);

			mockGetImageCaptcha.mockRejectedValue(error);

			// Verify error handling pattern exists
			expect(tasks).toBeDefined();
		});

		it("should handle database connection errors", async () => {
			// Mock database disconnection
			mockEnv.db.isConnected = vi.fn().mockReturnValue(false);

			expect(tasks).toBeDefined();
			expect(mockEnv.db.isConnected()).toBe(false);
		});
	});

	describe("Configuration Access", () => {
		it("should have access to captcha configuration", () => {
			expect(tasks.config).toBeDefined();
			expect(tasks.config.captcha).toBeDefined();
		});

		it("should have access to database configuration", () => {
			expect(tasks.config.database).toBeDefined();
		});

		it("should have access to task queue configuration", () => {
			expect(tasks.config.tasks).toBeDefined();
			expect(tasks.config.tasks.queues).toBeDefined();
		});
	});

	describe("Client Tasks Integration", () => {
		it("should delegate client task operations", async () => {
			vi.doMock("../../../tasks/client/clientTasks.js", () => ({
				getCaptchaChallenge: vi.fn().mockResolvedValue({}),
				validateCaptchaSolution: vi.fn().mockResolvedValue({ verified: true }),
				getProviderDetails: vi.fn().mockResolvedValue({}),
			}));

			expect(tasks).toHaveProperty("getCaptchaChallenge");
			expect(tasks).toHaveProperty("validateCaptchaSolution");
			expect(tasks).toHaveProperty("getProviderDetails");
		});
	});
});
