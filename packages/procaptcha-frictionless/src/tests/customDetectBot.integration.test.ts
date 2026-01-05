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

import { ProviderApi } from "@prosopo/api";
import { ProsopoEnvError } from "@prosopo/common";
import type {
	Account,
	ProcaptchaClientConfigOutput,
	RandomProvider,
} from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@prosopo/procaptcha-common", () => ({
	ExtensionLoader: vi.fn(),
}));

vi.mock("../detectorLoader.js", () => ({
	DetectorLoader: vi.fn(),
}));

vi.mock("@prosopo/load-balancer", () => ({
	getRandomActiveProvider: vi.fn(),
}));

vi.mock("@prosopo/api", () => ({
	ProviderApi: vi.fn(),
}));

import { ExtensionLoader } from "@prosopo/procaptcha-common";
import customDetectBot from "../customDetectBot.js";
import { DetectorLoader } from "../detectorLoader.js";

describe("customDetectBot", () => {
	const mockConfig: ProcaptchaClientConfigOutput = {
		account: {
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		},
		defaultEnvironment: "development",
		web2: true,
	} as ProcaptchaClientConfigOutput;

	const mockContainer = document.createElement("div");
	const mockRestartFn = vi.fn();

	const mockProvider: RandomProvider = {
		provider: {
			url: "https://provider.example.com",
			address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
		},
		score: 0.9,
	};

	const mockUserAccount: Account = {
		account: {
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		},
	};

	const mockDetectionResult = {
		token: "test-token",
		provider: mockProvider,
		encryptHeadHash: "test-hash",
		userAccount: mockUserAccount,
	};

	const mockCaptchaResponse = {
		captchaType: "pow" as const,
		sessionId: "test-session-id",
		status: "success" as const,
		error: undefined,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should successfully detect bot and return result", async () => {
		class MockExtension {
			getAccount = vi.fn().mockResolvedValue(mockUserAccount);
		}

		vi.mocked(ExtensionLoader).mockResolvedValue(MockExtension as never);

		const mockDetector = vi.fn().mockResolvedValue(mockDetectionResult);
		vi.mocked(DetectorLoader).mockResolvedValue(mockDetector);

		const mockGetFrictionlessCaptcha = vi
			.fn()
			.mockResolvedValue(mockCaptchaResponse);
		vi.mocked(ProviderApi).mockImplementation(
			() =>
				({
					getFrictionlessCaptcha: mockGetFrictionlessCaptcha,
				}) as never,
		);

		const result = await customDetectBot(
			mockConfig,
			mockContainer,
			mockRestartFn,
		);

		expect(result).toEqual({
			captchaType: mockCaptchaResponse.captchaType,
			sessionId: mockCaptchaResponse.sessionId,
			provider: mockProvider,
			status: mockCaptchaResponse.status,
			userAccount: mockUserAccount,
			error: mockCaptchaResponse.error,
		});

		expect(mockGetFrictionlessCaptcha).toHaveBeenCalledWith(
			mockDetectionResult.token,
			mockDetectionResult.encryptHeadHash,
			mockConfig.account.address,
			mockUserAccount.account.address,
		);
	});

	it("should throw error when account address is missing", async () => {
		const configWithoutAddress = {
			...mockConfig,
			account: { address: undefined },
		} as ProcaptchaClientConfigOutput;

		class MockExtension {
			getAccount = vi.fn().mockResolvedValue(mockUserAccount);
		}

		vi.mocked(ExtensionLoader).mockResolvedValue(MockExtension as never);

		const mockDetector = vi.fn().mockResolvedValue(mockDetectionResult);
		vi.mocked(DetectorLoader).mockResolvedValue(mockDetector);

		await expect(
			customDetectBot(configWithoutAddress, mockContainer, mockRestartFn),
		).rejects.toThrow(ProsopoEnvError);
	});

	it("should throw error when provider selection fails", async () => {
		class MockExtension {
			getAccount = vi.fn().mockResolvedValue(mockUserAccount);
		}

		vi.mocked(ExtensionLoader).mockResolvedValue(MockExtension as never);

		const mockDetector = vi.fn().mockResolvedValue({
			...mockDetectionResult,
			provider: undefined,
		});
		vi.mocked(DetectorLoader).mockResolvedValue(mockDetector);

		await expect(
			customDetectBot(mockConfig, mockContainer, mockRestartFn),
		).rejects.toThrow("Provider Selection Failed");
	});

	// Timeout behavior is tested in withTimeout tests
	// This test verifies that timeout errors are properly propagated
	it("should propagate timeout errors from API calls", async () => {
		class MockExtension {
			getAccount = vi.fn().mockResolvedValue(mockUserAccount);
		}

		vi.mocked(ExtensionLoader).mockResolvedValue(MockExtension as never);

		const mockDetector = vi.fn().mockResolvedValue(mockDetectionResult);
		vi.mocked(DetectorLoader).mockResolvedValue(mockDetector);

		const timeoutError = new ProsopoEnvError("API.UNKNOWN");
		const mockGetFrictionlessCaptcha = vi.fn().mockRejectedValue(timeoutError);

		vi.mocked(ProviderApi).mockImplementation(
			() =>
				({
					getFrictionlessCaptcha: mockGetFrictionlessCaptcha,
				}) as never,
		);

		await expect(
			customDetectBot(mockConfig, mockContainer, mockRestartFn),
		).rejects.toThrow(ProsopoEnvError);
	});

	it("should handle image captcha type", async () => {
		class MockExtension {
			getAccount = vi.fn().mockResolvedValue(mockUserAccount);
		}

		vi.mocked(ExtensionLoader).mockResolvedValue(MockExtension as never);

		const mockDetector = vi.fn().mockResolvedValue(mockDetectionResult);
		vi.mocked(DetectorLoader).mockResolvedValue(mockDetector);

		const imageCaptchaResponse = {
			...mockCaptchaResponse,
			captchaType: "image" as const,
		};

		const mockGetFrictionlessCaptcha = vi
			.fn()
			.mockResolvedValue(imageCaptchaResponse);
		vi.mocked(ProviderApi).mockImplementation(
			() =>
				({
					getFrictionlessCaptcha: mockGetFrictionlessCaptcha,
				}) as never,
		);

		const result = await customDetectBot(
			mockConfig,
			mockContainer,
			mockRestartFn,
		);

		expect(result.captchaType).toBe("image");
		expect(result.sessionId).toBe(imageCaptchaResponse.sessionId);
		expect(result.provider).toEqual(mockProvider);
	});

	it("should handle error in captcha response", async () => {
		class MockExtension {
			getAccount = vi.fn().mockResolvedValue(mockUserAccount);
		}

		vi.mocked(ExtensionLoader).mockResolvedValue(MockExtension as never);

		const mockDetector = vi.fn().mockResolvedValue(mockDetectionResult);
		vi.mocked(DetectorLoader).mockResolvedValue(mockDetector);

		const errorCaptchaResponse = {
			...mockCaptchaResponse,
			error: {
				message: "Test error",
				key: "TEST_ERROR",
			},
		};

		const mockGetFrictionlessCaptcha = vi
			.fn()
			.mockResolvedValue(errorCaptchaResponse);
		vi.mocked(ProviderApi).mockImplementation(
			() =>
				({
					getFrictionlessCaptcha: mockGetFrictionlessCaptcha,
				}) as never,
		);

		const result = await customDetectBot(
			mockConfig,
			mockContainer,
			mockRestartFn,
		);

		expect(result.error).toEqual(errorCaptchaResponse.error);
	});
});
