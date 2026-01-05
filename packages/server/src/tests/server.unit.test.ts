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
import { ProsopoApiError, ProsopoContractError } from "@prosopo/common";
import { loadBalancer } from "@prosopo/load-balancer";
import type {
	CaptchaTimeoutOutput,
	KeyringPair,
	ProcaptchaOutput,
	ProcaptchaToken,
	ProsopoServerConfigOutput,
	VerificationResponse,
} from "@prosopo/types";
import { decodeProcaptchaOutput } from "@prosopo/types";
import { u8aToHex } from "@prosopo/util";
import {
	type MockedFunction,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { ProsopoServer } from "../server.js";

vi.mock("@prosopo/api");
vi.mock("@prosopo/load-balancer");
vi.mock("@prosopo/types", async () => {
	const actual = await vi.importActual("@prosopo/types");
	return {
		...actual,
		decodeProcaptchaOutput: vi.fn(),
	};
});
vi.mock("i18next", () => ({
	default: {
		t: vi.fn((key: string) => key),
	},
}));

describe("ProsopoServer", () => {
	let mockConfig: ProsopoServerConfigOutput;
	let mockPair: KeyringPair;
	let mockProviderApi: {
		verifyDappUser: MockedFunction<
			(...args: unknown[]) => Promise<VerificationResponse>
		>;
		submitPowCaptchaVerify: MockedFunction<
			(...args: unknown[]) => Promise<VerificationResponse>
		>;
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockConfig = {
			defaultEnvironment: "development",
			serverUrl: "http://localhost:9228",
			dappName: "test-app",
			account: {
				password: "",
				address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				secret: "0x1234567890abcdef",
			},
			logLevel: "info",
			timeouts: {
				image: {
					cachedTimeout: 300000,
				},
				pow: {
					cachedTimeout: 600000,
				},
			},
		} as ProsopoServerConfigOutput;

		mockPair = {
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			sign: vi.fn((message: string) => new Uint8Array([1, 2, 3, 4])),
		} as unknown as KeyringPair;

		mockProviderApi = {
			verifyDappUser: vi.fn(),
			submitPowCaptchaVerify: vi.fn(),
		};

		vi.mocked(ProviderApi).mockImplementation(
			() => mockProviderApi as unknown as ProviderApi,
		);
	});

	describe("constructor", () => {
		it("initializes with config and optional pair", () => {
			const server = new ProsopoServer(mockConfig, mockPair);
			expect(server.config).toBe(mockConfig);
			expect(server.pair).toBe(mockPair);
			expect(server.dappAccount).toBe(mockConfig.account.address);
			expect(server.defaultEnvironment).toBe(mockConfig.defaultEnvironment);
		});

		it("initializes without pair", () => {
			const server = new ProsopoServer(mockConfig);
			expect(server.config).toBe(mockConfig);
			expect(server.pair).toBeUndefined();
			expect(server.dappAccount).toBe(mockConfig.account.address);
		});

		it("handles empty dappAccount address", () => {
			const configWithEmptyAddress = {
				...mockConfig,
				account: {
					...mockConfig.account,
					address: "",
				},
			};
			const server = new ProsopoServer(configWithEmptyAddress);
			expect(server.dappAccount).toBe("");
		});
	});

	describe("getProviderApi", () => {
		it("creates ProviderApi with providerUrl and dappAccount", () => {
			const server = new ProsopoServer(mockConfig, mockPair);
			const providerUrl = "http://provider.example.com";
			const api = server.getProviderApi(providerUrl);
			expect(ProviderApi).toHaveBeenCalledWith(
				providerUrl,
				mockConfig.account.address,
			);
			expect(api).toBe(mockProviderApi);
		});

		it("creates ProviderApi with empty string when dappAccount is empty", () => {
			const configWithEmptyAddress = {
				...mockConfig,
				account: {
					...mockConfig.account,
					address: "",
				},
			};
			const server = new ProsopoServer(configWithEmptyAddress);
			const providerUrl = "http://provider.example.com";
			server.getProviderApi(providerUrl);
			expect(ProviderApi).toHaveBeenCalledWith(providerUrl, "");
		});
	});

	describe("verifyProvider", () => {
		it("verifies image captcha successfully when timestamp is recent", async () => {
			const server = new ProsopoServer(mockConfig, mockPair);
			const token = "test-token";
			const timeouts: CaptchaTimeoutOutput = {
				image: { cachedTimeout: 300000 },
				pow: { cachedTimeout: 600000 },
			};
			const providerUrl = "http://provider.example.com";
			const timestamp = Date.now() - 1000; // 1 second ago
			const user = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";
			const ip = "192.168.1.1";

			const expectedResponse: VerificationResponse = {
				verified: true,
				status: "verified",
			};

			mockProviderApi.verifyDappUser.mockResolvedValue(expectedResponse);

			const result = await server.verifyProvider(
				token,
				timeouts,
				providerUrl,
				timestamp,
				user,
				undefined,
				ip,
			);

			expect(result).toEqual(expectedResponse);
			expect(mockPair.sign).toHaveBeenCalledWith(timestamp.toString());
			expect(mockProviderApi.verifyDappUser).toHaveBeenCalledWith(
				token,
				u8aToHex(new Uint8Array([1, 2, 3, 4])),
				user,
				timeouts.image.cachedTimeout,
				ip,
			);
		});

		it("verifies PoW captcha successfully when challenge is provided and timestamp is recent", async () => {
			const server = new ProsopoServer(mockConfig, mockPair);
			const token = "test-token";
			const timeouts: CaptchaTimeoutOutput = {
				image: { cachedTimeout: 300000 },
				pow: { cachedTimeout: 600000 },
			};
			const providerUrl = "http://provider.example.com";
			const timestamp = Date.now() - 1000; // 1 second ago
			const user = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";
			const challenge = "test-challenge";
			const ip = "192.168.1.1";

			const expectedResponse: VerificationResponse = {
				verified: true,
				status: "verified",
			};

			mockProviderApi.submitPowCaptchaVerify.mockResolvedValue(
				expectedResponse,
			);

			const result = await server.verifyProvider(
				token,
				timeouts,
				providerUrl,
				timestamp,
				user,
				challenge,
				ip,
			);

			expect(result).toEqual(expectedResponse);
			expect(mockPair.sign).toHaveBeenCalledWith(timestamp.toString());
			expect(mockProviderApi.submitPowCaptchaVerify).toHaveBeenCalledWith(
				token,
				u8aToHex(new Uint8Array([1, 2, 3, 4])),
				timeouts.pow.cachedTimeout,
				user,
				ip,
			);
		});

		it("returns time expired error when image captcha timestamp is too old", async () => {
			const server = new ProsopoServer(mockConfig, mockPair);
			const token = "test-token";
			const timeouts: CaptchaTimeoutOutput = {
				image: { cachedTimeout: 300000 },
				pow: { cachedTimeout: 600000 },
			};
			const providerUrl = "http://provider.example.com";
			const timestamp = Date.now() - 400000; // older than timeout
			const user = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

			const result = await server.verifyProvider(
				token,
				timeouts,
				providerUrl,
				timestamp,
				user,
			);

			expect(result.verified).toBe(false);
			expect(result.status).toBe("API.USER_NOT_VERIFIED_TIME_EXPIRED");
			expect(mockProviderApi.verifyDappUser).not.toHaveBeenCalled();
		});

		it("returns time expired error when PoW captcha timestamp is too old", async () => {
			const server = new ProsopoServer(mockConfig, mockPair);
			const token = "test-token";
			const timeouts: CaptchaTimeoutOutput = {
				image: { cachedTimeout: 300000 },
				pow: { cachedTimeout: 600000 },
			};
			const providerUrl = "http://provider.example.com";
			const timestamp = Date.now() - 700000; // older than timeout
			const user = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";
			const challenge = "test-challenge";

			const result = await server.verifyProvider(
				token,
				timeouts,
				providerUrl,
				timestamp,
				user,
				challenge,
			);

			expect(result.verified).toBe(false);
			expect(result.status).toBe("API.USER_NOT_VERIFIED_TIME_EXPIRED");
			expect(mockProviderApi.submitPowCaptchaVerify).not.toHaveBeenCalled();
		});

		it("returns time expired error when timestamp is 0", async () => {
			const server = new ProsopoServer(mockConfig, mockPair);
			const token = "test-token";
			const timeouts: CaptchaTimeoutOutput = {
				image: { cachedTimeout: 300000 },
				pow: { cachedTimeout: 600000 },
			};
			const providerUrl = "http://provider.example.com";
			const timestamp = 0;
			const user = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

			const result = await server.verifyProvider(
				token,
				timeouts,
				providerUrl,
				timestamp,
				user,
			);

			expect(result.verified).toBe(false);
			expect(result.status).toBe("API.USER_NOT_VERIFIED_TIME_EXPIRED");
		});

		it("throws ProsopoContractError when pair is not set and cannot sign", async () => {
			const server = new ProsopoServer(mockConfig); // no pair
			const token = "test-token";
			const timeouts: CaptchaTimeoutOutput = {
				image: { cachedTimeout: 300000 },
				pow: { cachedTimeout: 600000 },
			};
			const providerUrl = "http://provider.example.com";
			const timestamp = Date.now();
			const user = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

			await expect(
				server.verifyProvider(token, timeouts, providerUrl, timestamp, user),
			).rejects.toThrow(ProsopoContractError);
		});

		it("verifies image captcha without IP address", async () => {
			const server = new ProsopoServer(mockConfig, mockPair);
			const token = "test-token";
			const timeouts: CaptchaTimeoutOutput = {
				image: { cachedTimeout: 300000 },
				pow: { cachedTimeout: 600000 },
			};
			const providerUrl = "http://provider.example.com";
			const timestamp = Date.now() - 1000;
			const user = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

			const expectedResponse: VerificationResponse = {
				verified: true,
				status: "verified",
			};

			mockProviderApi.verifyDappUser.mockResolvedValue(expectedResponse);

			const result = await server.verifyProvider(
				token,
				timeouts,
				providerUrl,
				timestamp,
				user,
			);

			expect(result).toEqual(expectedResponse);
			expect(mockProviderApi.verifyDappUser).toHaveBeenCalledWith(
				token,
				u8aToHex(new Uint8Array([1, 2, 3, 4])),
				user,
				timeouts.image.cachedTimeout,
				undefined,
			);
		});
	});

	describe("isVerified", () => {
		const mockToken: ProcaptchaToken = "0x1234567890abcdef";
		const mockPayload = {
			providerUrl: "http://provider.example.com",
			dapp: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			user: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
			timestamp: Date.now().toString(),
			signature: {
				provider: { Sr25519: "0x1234" },
				user: { Sr25519: "0x5678" },
			},
		};

		beforeEach(() => {
			vi.mocked(decodeProcaptchaOutput).mockReturnValue(
				mockPayload as unknown as ProcaptchaOutput,
			);
			vi.mocked(loadBalancer).mockResolvedValue([
				{
					address: "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV",
					url: "http://provider.example.com",
					datasetId:
						"0x9f460e81ac9c71b486f796a21bb36e2263694756a6621134d110da217fd3ef25",
					weight: 1,
				},
			]);
		});

		it("verifies token successfully for image captcha", async () => {
			const server = new ProsopoServer(mockConfig, mockPair);
			const expectedResponse: VerificationResponse = {
				verified: true,
				status: "verified",
			};

			mockProviderApi.verifyDappUser.mockResolvedValue(expectedResponse);

			const result = await server.isVerified(mockToken);

			expect(result).toEqual(expectedResponse);
			expect(decodeProcaptchaOutput).toHaveBeenCalledWith(mockToken);
			expect(loadBalancer).toHaveBeenCalledWith(mockConfig.defaultEnvironment);
			expect(mockProviderApi.verifyDappUser).toHaveBeenCalled();
		});

		it("verifies token successfully for PoW captcha with challenge", async () => {
			const server = new ProsopoServer(mockConfig, mockPair);
			const payloadWithChallenge = {
				...mockPayload,
				challenge: "test-challenge",
			};
			vi.mocked(decodeProcaptchaOutput).mockReturnValue(
				payloadWithChallenge as unknown as ProcaptchaOutput,
			);

			const expectedResponse: VerificationResponse = {
				verified: true,
				status: "verified",
			};

			mockProviderApi.submitPowCaptchaVerify.mockResolvedValue(
				expectedResponse,
			);

			const result = await server.isVerified(mockToken);

			expect(result).toEqual(expectedResponse);
			expect(mockProviderApi.submitPowCaptchaVerify).toHaveBeenCalled();
		});

		it("returns error when provider is not found in load balancer", async () => {
			const server = new ProsopoServer(mockConfig, mockPair);
			const payloadWithDifferentUrl = {
				...mockPayload,
				providerUrl: "http://unknown-provider.com",
			};
			vi.mocked(decodeProcaptchaOutput).mockReturnValue(
				payloadWithDifferentUrl as unknown as ProcaptchaOutput,
			);

			const result = await server.isVerified(mockToken);

			expect(result.verified).toBe(false);
			expect(result.status).toBe("API.USER_NOT_VERIFIED");
			expect(mockProviderApi.verifyDappUser).not.toHaveBeenCalled();
		});

		it("passes IP address to verifyProvider when provided", async () => {
			const server = new ProsopoServer(mockConfig, mockPair);
			const ip = "192.168.1.1";
			const expectedResponse: VerificationResponse = {
				verified: true,
				status: "verified",
			};

			mockProviderApi.verifyDappUser.mockResolvedValue(expectedResponse);

			await server.isVerified(mockToken, ip);

			expect(mockProviderApi.verifyDappUser).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.any(String),
				expect.any(Number),
				ip,
			);
		});

		it("throws ProsopoApiError when decodeProcaptchaOutput fails", async () => {
			const server = new ProsopoServer(mockConfig, mockPair);
			vi.mocked(decodeProcaptchaOutput).mockImplementation(() => {
				throw new Error("Invalid token");
			});

			await expect(server.isVerified(mockToken)).rejects.toThrow(
				ProsopoApiError,
			);
		});

		it("throws ProsopoApiError when ProcaptchaOutputSchema.parse fails", async () => {
			const server = new ProsopoServer(mockConfig, mockPair);
			vi.mocked(decodeProcaptchaOutput).mockReturnValue({
				invalid: "payload",
			} as unknown as ProcaptchaOutput);

			await expect(server.isVerified(mockToken)).rejects.toThrow(
				ProsopoApiError,
			);
		});

		it("handles empty provider list from loadBalancer", async () => {
			const server = new ProsopoServer(mockConfig, mockPair);
			vi.mocked(loadBalancer).mockResolvedValue([]);

			const result = await server.isVerified(mockToken);

			expect(result.verified).toBe(false);
			expect(result.status).toBe("API.USER_NOT_VERIFIED");
		});

		it("handles multiple providers and finds the correct one", async () => {
			const server = new ProsopoServer(mockConfig, mockPair);
			vi.mocked(loadBalancer).mockResolvedValue([
				{
					address: "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV",
					url: "http://provider1.example.com",
					datasetId:
						"0x9f460e81ac9c71b486f796a21bb36e2263694756a6621134d110da217fd3ef25",
					weight: 1,
				},
				{
					address: "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV",
					url: "http://provider.example.com",
					datasetId:
						"0x9f460e81ac9c71b486f796a21bb36e2263694756a6621134d110da217fd3ef25",
					weight: 1,
				},
			]);

			const expectedResponse: VerificationResponse = {
				verified: true,
				status: "verified",
			};

			mockProviderApi.verifyDappUser.mockResolvedValue(expectedResponse);

			const result = await server.isVerified(mockToken);

			expect(result).toEqual(expectedResponse);
			expect(mockProviderApi.verifyDappUser).toHaveBeenCalled();
		});
	});
});
