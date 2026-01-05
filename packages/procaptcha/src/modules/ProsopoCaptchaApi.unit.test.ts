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

import type { ProviderApi } from "@prosopo/api";
import { ProsopoDatasetError, ProsopoEnvError } from "@prosopo/common";
import {
	CaptchaMerkleTree,
	computeCaptchaSolutionHash,
} from "@prosopo/datasets";
import type {
	CaptchaResponseBody,
	CaptchaSolution,
	CaptchaSolutionResponse,
	RandomProvider,
} from "@prosopo/types";
import { ApiParams } from "@prosopo/types";
import {
	type MockedFunction,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import ProsopoCaptchaApi from "./ProsopoCaptchaApi.js";

vi.mock("@prosopo/datasets", () => ({
	CaptchaMerkleTree: vi.fn(),
	computeCaptchaSolutionHash: vi.fn(),
}));

describe("ProsopoCaptchaApi", () => {
	let mockProviderApi: ProviderApi;
	let mockRandomProvider: RandomProvider;
	let api: ProsopoCaptchaApi;
	let mockTree: {
		build: MockedFunction<(leaves: string[]) => void>;
		root: { hash: string } | null;
	};

	beforeEach(() => {
		mockTree = {
			build: vi.fn(),
			root: { hash: "mock-commitment-id" },
		};
		vi.mocked(CaptchaMerkleTree).mockImplementation(() => mockTree as any);

		mockProviderApi = {
			getCaptchaChallenge: vi.fn(),
			submitCaptchaSolution: vi.fn(),
		} as unknown as ProviderApi;

		mockRandomProvider = {
			provider: {
				url: "https://provider.example.com",
				datasetId: "test-dataset-id",
			},
		} as RandomProvider;

		api = new ProsopoCaptchaApi(
			"user-account-123",
			mockRandomProvider,
			mockProviderApi,
			false,
			"dapp-account-456",
		);
	});

	describe("constructor", () => {
		it("should initialize with correct properties", () => {
			expect(api.userAccount).toBe("user-account-123");
			expect(api.provider).toBe(mockRandomProvider);
			expect(api.providerApi).toBe(mockProviderApi);
			expect(api.dappAccount).toBe("dapp-account-456");
			expect(api.web2).toBe(false);
		});

		it("should set web2 property correctly", () => {
			const apiWeb2 = new ProsopoCaptchaApi(
				"user-account-123",
				mockRandomProvider,
				mockProviderApi,
				true,
				"dapp-account-456",
			);
			expect(apiWeb2.web2).toBe(true);
		});
	});

	describe("getCaptchaChallenge", () => {
		it("should return captcha challenge successfully", async () => {
			const mockChallenge: CaptchaResponseBody = {
				captchas: [
					{
						captchaId: "captcha-1",
						captchaContentId: "content-1",
						items: [
							{
								hash: "item-hash-1",
								data: "http://example.com/image1.png",
							},
						],
						timeLimitMs: 30000,
					},
				],
				requestHash: "request-hash-123",
				timestamp: "1234567890",
				signature: {
					provider: {
						requestHash: "provider-request-hash",
					},
				},
			};

			vi.mocked(mockProviderApi.getCaptchaChallenge).mockResolvedValue(
				mockChallenge,
			);

			const result = await api.getCaptchaChallenge();

			expect(result).toEqual({
				...mockChallenge,
				captchas: [
					{
						...mockChallenge.captchas[0],
						items: [
							{
								...mockChallenge.captchas[0].items[0],
								data: "https://example.com/image1.png",
							},
						],
					},
				],
			});
			expect(mockProviderApi.getCaptchaChallenge).toHaveBeenCalledWith(
				"user-account-123",
				mockRandomProvider,
				undefined,
			);
		});

		it("should convert http to https in captcha item data", async () => {
			const mockChallenge: CaptchaResponseBody = {
				captchas: [
					{
						captchaId: "captcha-1",
						captchaContentId: "content-1",
						items: [
							{
								hash: "item-hash-1",
								data: "http://example.com/image1.png",
							},
							{
								hash: "item-hash-2",
								data: "https://example.com/image2.png",
							},
						],
						timeLimitMs: 30000,
					},
				],
				requestHash: "request-hash-123",
				timestamp: "1234567890",
				signature: {
					provider: {
						requestHash: "provider-request-hash",
					},
				},
			};

			vi.mocked(mockProviderApi.getCaptchaChallenge).mockResolvedValue(
				mockChallenge,
			);

			const result = await api.getCaptchaChallenge();

			expect(result.captchas[0].items[0].data).toBe(
				"https://example.com/image1.png",
			);
			expect(result.captchas[0].items[1].data).toBe(
				"https://example.com/image2.png",
			);
		});

		it("should handle https URLs correctly", async () => {
			const mockChallenge: CaptchaResponseBody = {
				captchas: [
					{
						captchaId: "captcha-1",
						captchaContentId: "content-1",
						items: [
							{
								hash: "item-hash-1",
								data: "https://example.com/image1.png",
							},
						],
						timeLimitMs: 30000,
					},
				],
				requestHash: "request-hash-123",
				timestamp: "1234567890",
				signature: {
					provider: {
						requestHash: "provider-request-hash",
					},
				},
			};

			vi.mocked(mockProviderApi.getCaptchaChallenge).mockResolvedValue(
				mockChallenge,
			);

			const result = await api.getCaptchaChallenge();

			expect(result.captchas[0].items[0].data).toBe(
				"https://example.com/image1.png",
			);
		});

		it("should pass sessionId when provided", async () => {
			const mockChallenge: CaptchaResponseBody = {
				captchas: [],
				requestHash: "request-hash-123",
				timestamp: "1234567890",
				signature: {
					provider: {
						requestHash: "provider-request-hash",
					},
				},
			};

			vi.mocked(mockProviderApi.getCaptchaChallenge).mockResolvedValue(
				mockChallenge,
			);

			await api.getCaptchaChallenge("session-123");

			expect(mockProviderApi.getCaptchaChallenge).toHaveBeenCalledWith(
				"user-account-123",
				mockRandomProvider,
				"session-123",
			);
		});

		it("should return error response when provider API returns error", async () => {
			const errorResponse: CaptchaResponseBody = {
				[ApiParams.error]: {
					message: "Provider error",
					key: "PROVIDER.ERROR",
				},
				captchas: [],
				requestHash: "",
				timestamp: "",
				signature: {
					provider: {
						requestHash: "",
					},
				},
			};

			vi.mocked(mockProviderApi.getCaptchaChallenge).mockResolvedValue(
				errorResponse,
			);

			const result = await api.getCaptchaChallenge();

			expect(result[ApiParams.error]).toEqual({
				message: "Provider error",
				key: "PROVIDER.ERROR",
			});
		});

		it("should throw ProsopoEnvError when provider API throws", async () => {
			const error = new Error("Network error");
			vi.mocked(mockProviderApi.getCaptchaChallenge).mockRejectedValue(error);

			await expect(api.getCaptchaChallenge()).rejects.toThrow(ProsopoEnvError);
			await expect(api.getCaptchaChallenge()).rejects.toThrow(
				"CAPTCHA.INVALID_CAPTCHA_CHALLENGE",
			);
		});

		it("should handle items without data field", async () => {
			const mockChallenge: CaptchaResponseBody = {
				captchas: [
					{
						captchaId: "captcha-1",
						captchaContentId: "content-1",
						items: [
							{
								hash: "item-hash-1",
							},
						],
						timeLimitMs: 30000,
					},
				],
				requestHash: "request-hash-123",
				timestamp: "1234567890",
				signature: {
					provider: {
						requestHash: "provider-request-hash",
					},
				},
			};

			vi.mocked(mockProviderApi.getCaptchaChallenge).mockResolvedValue(
				mockChallenge,
			);

			const result = await api.getCaptchaChallenge();

			expect(result.captchas[0].items[0].data).toBeUndefined();
		});
	});

	describe("submitCaptchaSolution", () => {
		const mockSolutions: CaptchaSolution[] = [
			{
				captchaId: "captcha-1",
				captchaContentId: "content-1",
				salt: "salt-123",
				solution: [1, 2, 3],
			},
		];

		beforeEach(() => {
			vi.mocked(computeCaptchaSolutionHash).mockReturnValue("hashed-solution");
		});

		it("should submit captcha solution successfully", async () => {
			const mockResponse: CaptchaSolutionResponse = {
				verified: true,
			};

			vi.mocked(mockProviderApi.submitCaptchaSolution).mockResolvedValue(
				mockResponse,
			);

			const result = await api.submitCaptchaSolution(
				"user-signature",
				"request-hash",
				mockSolutions,
				"timestamp",
				"provider-signature",
			);

			expect(result).toEqual([mockResponse, "mock-commitment-id"]);
			expect(computeCaptchaSolutionHash).toHaveBeenCalledWith(mockSolutions[0]);
			expect(mockTree.build).toHaveBeenCalledWith(["hashed-solution"]);
			expect(mockProviderApi.submitCaptchaSolution).toHaveBeenCalledWith(
				mockSolutions,
				"request-hash",
				"user-account-123",
				"timestamp",
				"provider-signature",
				"user-signature",
			);
		});

		it("should handle multiple captcha solutions", async () => {
			vi.clearAllMocks();
			const multipleSolutions: CaptchaSolution[] = [
				{
					captchaId: "captcha-1",
					captchaContentId: "content-1",
					salt: "salt-123",
					solution: [1, 2],
				},
				{
					captchaId: "captcha-2",
					captchaContentId: "content-2",
					salt: "salt-456",
					solution: [3, 4],
				},
			];

			vi.mocked(computeCaptchaSolutionHash)
				.mockReturnValueOnce("hashed-solution-1")
				.mockReturnValueOnce("hashed-solution-2");

			const mockResponse: CaptchaSolutionResponse = {
				verified: true,
			};

			vi.mocked(mockProviderApi.submitCaptchaSolution).mockResolvedValue(
				mockResponse,
			);

			await api.submitCaptchaSolution(
				"user-signature",
				"request-hash",
				multipleSolutions,
				"timestamp",
				"provider-signature",
			);

			expect(computeCaptchaSolutionHash).toHaveBeenCalledTimes(2);
			expect(mockTree.build).toHaveBeenCalledWith([
				"hashed-solution-1",
				"hashed-solution-2",
			]);
		});

		it("should throw ProsopoDatasetError when merkle tree root is undefined", async () => {
			mockTree.root = null;

			await expect(
				api.submitCaptchaSolution(
					"user-signature",
					"request-hash",
					mockSolutions,
					"timestamp",
					"provider-signature",
				),
			).rejects.toThrow(ProsopoDatasetError);
			await expect(
				api.submitCaptchaSolution(
					"user-signature",
					"request-hash",
					mockSolutions,
					"timestamp",
					"provider-signature",
				),
			).rejects.toThrow("CAPTCHA.INVALID_CAPTCHA_CHALLENGE");
		});

		it("should throw ProsopoDatasetError when provider API throws", async () => {
			const error = new Error("Submission failed");
			vi.mocked(mockProviderApi.submitCaptchaSolution).mockRejectedValue(error);

			await expect(
				api.submitCaptchaSolution(
					"user-signature",
					"request-hash",
					mockSolutions,
					"timestamp",
					"provider-signature",
				),
			).rejects.toThrow(ProsopoDatasetError);
			await expect(
				api.submitCaptchaSolution(
					"user-signature",
					"request-hash",
					mockSolutions,
					"timestamp",
					"provider-signature",
				),
			).rejects.toThrow("CAPTCHA.INVALID_CAPTCHA_CHALLENGE");
		});

		it("should handle verified false response", async () => {
			const mockResponse: CaptchaSolutionResponse = {
				verified: false,
			};

			vi.mocked(mockProviderApi.submitCaptchaSolution).mockResolvedValue(
				mockResponse,
			);

			const result = await api.submitCaptchaSolution(
				"user-signature",
				"request-hash",
				mockSolutions,
				"timestamp",
				"provider-signature",
			);

			expect(result[0].verified).toBe(false);
			expect(result[1]).toBe("mock-commitment-id");
		});

		it("should create new CaptchaMerkleTree instance for each submission", async () => {
			const mockResponse: CaptchaSolutionResponse = {
				verified: true,
			};

			vi.mocked(mockProviderApi.submitCaptchaSolution).mockResolvedValue(
				mockResponse,
			);

			await api.submitCaptchaSolution(
				"user-signature",
				"request-hash",
				mockSolutions,
				"timestamp",
				"provider-signature",
			);

			expect(CaptchaMerkleTree).toHaveBeenCalled();
		});
	});
});
