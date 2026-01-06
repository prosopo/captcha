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

import {
	AdminApiPaths,
	ApiParams,
	type ApiResponse,
	type CaptchaResponseBody,
	type CaptchaSolution,
	type CaptchaSolutionResponse,
	ClientApiPaths,
	type GetFrictionlessCaptchaResponse,
	type GetPowCaptchaResponse,
	type IUserSettings,
	type ImageVerificationResponse,
	type PowCaptchaSolutionResponse,
	type ProcaptchaToken,
	type Provider,
	type ProviderRegistered,
	PublicApiPaths,
	type RandomProvider,
	type StoredEvents,
	type Tier,
	type UpdateDetectorKeyResponse,
	type UpdateProviderClientsResponse,
	type VerificationResponse,
} from "@prosopo/types";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	expectTypeOf,
	test,
	vi,
} from "vitest";
import ProviderApi from "./ProviderApi.js";

// Mock the parent class methods
vi.mock("./apiClient.js", () => {
	return {
		ApiClient: class {
			protected account: string;
			constructor(baseUrl: string, account: string) {
				this.account = account;
			}
			protected async post<T>(
				input: string,
				body: unknown,
				init?: RequestInit,
			): Promise<T> {
				return { input, body, init } as T;
			}
			protected async fetch<T>(input: string, init?: RequestInit): Promise<T> {
				return { input, init } as T;
			}
		},
	};
});

describe("ProviderApi", () => {
	let api: ProviderApi;
	const baseUrl = "https://api.example.com";
	const account = "test-account-123";

	beforeEach(() => {
		api = new ProviderApi(baseUrl, account);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("getCaptchaChallenge", () => {
		test("constructs request body correctly without sessionId", async () => {
			const userAccount = "user123";
			const randomProvider: RandomProvider = {
				provider: {
					datasetId: "dataset-123",
					address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				},
			};

			const result = await api.getCaptchaChallenge(userAccount, randomProvider);

			expect(result).toHaveProperty(
				"input",
				ClientApiPaths.GetImageCaptchaChallenge,
			);
			expect(result).toHaveProperty("body");
			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body[ApiParams.dapp]).toBe(account);
			expect(body[ApiParams.user]).toBe(userAccount);
			expect(body[ApiParams.datasetId]).toBe("dataset-123");
			expect(body[ApiParams.sessionId]).toBeUndefined();
		});

		test("constructs request body correctly with sessionId", async () => {
			const userAccount = "user123";
			const sessionId = "session-456";
			const randomProvider: RandomProvider = {
				provider: {
					datasetId: "dataset-123",
					address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				},
			};

			const result = await api.getCaptchaChallenge(
				userAccount,
				randomProvider,
				sessionId,
			);

			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body[ApiParams.sessionId]).toBe(sessionId);
		});

		test("sets correct headers", async () => {
			const userAccount = "user123";
			const randomProvider: RandomProvider = {
				provider: {
					datasetId: "dataset-123",
					address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				},
			};

			const result = await api.getCaptchaChallenge(userAccount, randomProvider);

			const init = (result as { init: RequestInit }).init;
			expect(init?.headers).toMatchObject({
				"Prosopo-Site-Key": account,
				"Prosopo-User": userAccount,
			});
		});

		test("type checking - returns CaptchaResponseBody", async () => {
			const userAccount = "user123";
			const randomProvider: RandomProvider = {
				provider: {
					datasetId: "dataset-123",
					address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				},
			};

			const result = await api.getCaptchaChallenge(userAccount, randomProvider);

			expectTypeOf(result).toMatchTypeOf<Promise<CaptchaResponseBody>>();
		});
	});

	describe("submitCaptchaSolution", () => {
		test("constructs request body correctly", async () => {
			const captchas: CaptchaSolution[] = [
				{ index: 0, solution: [1, 2, 3] },
				{ index: 1, solution: [4, 5] },
			];
			const requestHash = "hash123";
			const userAccount = "user123";
			const timestamp = "2024-01-01T00:00:00Z";
			const providerRequestHashSignature = "provider-sig";
			const userTimestampSignature = "user-sig";

			const result = await api.submitCaptchaSolution(
				captchas,
				requestHash,
				userAccount,
				timestamp,
				providerRequestHashSignature,
				userTimestampSignature,
			);

			expect(result).toHaveProperty(
				"input",
				ClientApiPaths.SubmitImageCaptchaSolution,
			);
			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body[ApiParams.user]).toBe(userAccount);
			expect(body[ApiParams.dapp]).toBe(account);
			expect(body[ApiParams.captchas]).toEqual(captchas);
			expect(body[ApiParams.requestHash]).toBe(requestHash);
			expect(body[ApiParams.timestamp]).toBe(timestamp);

			const signature = body[ApiParams.signature] as Record<string, unknown>;
			expect(signature[ApiParams.user]).toMatchObject({
				[ApiParams.timestamp]: userTimestampSignature,
			});
			expect(signature[ApiParams.provider]).toMatchObject({
				[ApiParams.requestHash]: providerRequestHashSignature,
			});
		});

		test("sets correct headers", async () => {
			const captchas: CaptchaSolution[] = [{ index: 0, solution: [1] }];
			const result = await api.submitCaptchaSolution(
				captchas,
				"hash",
				"user123",
				"timestamp",
				"provider-sig",
				"user-sig",
			);

			const init = (result as { init: RequestInit }).init;
			expect(init?.headers).toMatchObject({
				"Prosopo-Site-Key": account,
				"Prosopo-User": "user123",
			});
		});

		test("type checking - returns CaptchaSolutionResponse", async () => {
			const captchas: CaptchaSolution[] = [{ index: 0, solution: [1] }];
			const result = await api.submitCaptchaSolution(
				captchas,
				"hash",
				"user123",
				"timestamp",
				"provider-sig",
				"user-sig",
			);

			expectTypeOf(result).toMatchTypeOf<Promise<CaptchaSolutionResponse>>();
		});
	});

	describe("verifyDappUser", () => {
		test("constructs request body correctly without optional parameters", async () => {
			const token: ProcaptchaToken = "token123";
			const signature = "sig123";
			const userAccount = "user123";

			const result = await api.verifyDappUser(token, signature, userAccount);

			expect(result).toHaveProperty(
				"input",
				ClientApiPaths.VerifyImageCaptchaSolutionDapp,
			);
			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body[ApiParams.token]).toBe(token);
			expect(body[ApiParams.dappSignature]).toBe(signature);
			expect(body[ApiParams.ip]).toBeUndefined();
			expect(body[ApiParams.maxVerifiedTime]).toBeUndefined();
		});

		test("constructs request body correctly with maxVerifiedTime", async () => {
			const token: ProcaptchaToken = "token123";
			const signature = "sig123";
			const userAccount = "user123";
			const maxVerifiedTime = 3600;

			const result = await api.verifyDappUser(
				token,
				signature,
				userAccount,
				maxVerifiedTime,
			);

			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body[ApiParams.maxVerifiedTime]).toBe(maxVerifiedTime);
		});

		test("constructs request body correctly with ip", async () => {
			const token: ProcaptchaToken = "token123";
			const signature = "sig123";
			const userAccount = "user123";
			const ip = "192.168.1.1";

			const result = await api.verifyDappUser(
				token,
				signature,
				userAccount,
				undefined,
				ip,
			);

			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body[ApiParams.ip]).toBe(ip);
		});

		test("constructs request body correctly with all optional parameters", async () => {
			const token: ProcaptchaToken = "token123";
			const signature = "sig123";
			const userAccount = "user123";
			const maxVerifiedTime = 3600;
			const ip = "192.168.1.1";

			const result = await api.verifyDappUser(
				token,
				signature,
				userAccount,
				maxVerifiedTime,
				ip,
			);

			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body[ApiParams.maxVerifiedTime]).toBe(maxVerifiedTime);
			expect(body[ApiParams.ip]).toBe(ip);
		});

		test("sets correct headers", async () => {
			const token: ProcaptchaToken = "token123";
			const result = await api.verifyDappUser(token, "sig", "user123");

			const init = (result as { init: RequestInit }).init;
			expect(init?.headers).toMatchObject({
				"Prosopo-Site-Key": account,
				"Prosopo-User": "user123",
			});
		});

		test("type checking - returns ImageVerificationResponse", async () => {
			const token: ProcaptchaToken = "token123";
			const result = await api.verifyDappUser(token, "sig", "user123");

			expectTypeOf(result).toMatchTypeOf<Promise<ImageVerificationResponse>>();
		});
	});

	describe("getPowCaptchaChallenge", () => {
		test("constructs request body correctly without sessionId", async () => {
			const user = "user123";
			const dapp = "dapp456";

			const result = await api.getPowCaptchaChallenge(user, dapp);

			expect(result).toHaveProperty(
				"input",
				ClientApiPaths.GetPowCaptchaChallenge,
			);
			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body[ApiParams.user]).toBe(user);
			expect(body[ApiParams.dapp]).toBe(dapp);
			expect(body[ApiParams.sessionId]).toBeUndefined();
		});

		test("constructs request body correctly with sessionId", async () => {
			const user = "user123";
			const dapp = "dapp456";
			const sessionId = "session789";

			const result = await api.getPowCaptchaChallenge(user, dapp, sessionId);

			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body[ApiParams.sessionId]).toBe(sessionId);
		});

		test("converts user and dapp to strings", async () => {
			const user = 123;
			const dapp = 456;

			const result = await api.getPowCaptchaChallenge(
				user.toString(),
				dapp.toString(),
			);

			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body[ApiParams.user]).toBe("123");
			expect(body[ApiParams.dapp]).toBe("456");
		});

		test("sets correct headers", async () => {
			const result = await api.getPowCaptchaChallenge("user123", "dapp456");

			const init = (result as { init: RequestInit }).init;
			expect(init?.headers).toMatchObject({
				"Prosopo-Site-Key": account,
				"Prosopo-User": "user123",
			});
		});

		test("type checking - returns GetPowCaptchaResponse", async () => {
			const result = await api.getPowCaptchaChallenge("user123", "dapp456");

			expectTypeOf(result).toMatchTypeOf<Promise<GetPowCaptchaResponse>>();
		});
	});

	describe("submitPowCaptchaSolution", () => {
		test("constructs request body correctly without optional parameters", async () => {
			// PoWChallengeId format: timestamp___user___dapp___randomValue (4 parts separated by ___)
			const challenge: GetPowCaptchaResponse = {
				challenge: "1704067200000___user123___dapp456___random",
				difficulty: 5,
				timestamp: "2024-01-01T00:00:00Z",
				signature: {
					provider: {
						challenge: "provider-challenge-sig",
					},
				},
			};
			const userAccount = "user123";
			const dappAccount = "dapp456";
			const nonce = 42;
			const userTimestampSignature = "user-sig";

			const result = await api.submitPowCaptchaSolution(
				challenge,
				userAccount,
				dappAccount,
				nonce,
				userTimestampSignature,
			);

			expect(result).toHaveProperty(
				"input",
				ClientApiPaths.SubmitPowCaptchaSolution,
			);
			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body[ApiParams.challenge]).toBe(challenge.challenge);
			expect(body[ApiParams.difficulty]).toBe(challenge.difficulty);
			// Note: timestamp is not part of SubmitPowCaptchaSolutionBody schema, so it gets stripped
			expect(body[ApiParams.timestamp]).toBeUndefined();
			expect(body[ApiParams.user]).toBe(userAccount);
			expect(body[ApiParams.dapp]).toBe(dappAccount);
			expect(body[ApiParams.nonce]).toBe(nonce);
			// verifiedTimeout has a default value when not provided (DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT = 120000)
			expect(body[ApiParams.verifiedTimeout]).toBe(120000);
			expect(body[ApiParams.salt]).toBeUndefined();

			const signature = body[ApiParams.signature] as Record<string, unknown>;
			expect(signature[ApiParams.provider]).toMatchObject(
				challenge.signature.provider,
			);
			expect(signature[ApiParams.user]).toMatchObject({
				[ApiParams.timestamp]: userTimestampSignature,
			});
		});

		test("constructs request body correctly with timeout", async () => {
			const challenge: GetPowCaptchaResponse = {
				challenge: "1704067200000___user___dapp___random",
				difficulty: 5,
				timestamp: "2024-01-01T00:00:00Z",
				signature: {
					provider: {
						challenge: "provider-challenge-sig",
					},
				},
			};
			const timeout = 3600;

			const result = await api.submitPowCaptchaSolution(
				challenge,
				"user",
				"dapp",
				42,
				"sig",
				timeout,
			);

			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body[ApiParams.verifiedTimeout]).toBe(timeout);
		});

		test("constructs request body correctly with salt", async () => {
			const challenge: GetPowCaptchaResponse = {
				challenge: "1704067200000___user___dapp___random",
				difficulty: 5,
				timestamp: "2024-01-01T00:00:00Z",
				signature: {
					provider: {
						challenge: "provider-challenge-sig",
					},
				},
			};
			const salt = "salt123";

			const result = await api.submitPowCaptchaSolution(
				challenge,
				"user",
				"dapp",
				42,
				"sig",
				undefined,
				salt,
			);

			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body[ApiParams.salt]).toBe(salt);
		});

		test("converts user and dapp to strings", async () => {
			const challenge: GetPowCaptchaResponse = {
				challenge: "1704067200000___123___456___random",
				difficulty: 5,
				timestamp: "2024-01-01T00:00:00Z",
				signature: {
					provider: {
						challenge: "provider-challenge-sig",
					},
				},
			};

			const result = await api.submitPowCaptchaSolution(
				challenge,
				"123",
				"456",
				42,
				"sig",
			);

			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body[ApiParams.user]).toBe("123");
			expect(body[ApiParams.dapp]).toBe("456");
		});

		test("sets correct headers", async () => {
			const challenge: GetPowCaptchaResponse = {
				challenge: "1704067200000___user123___dapp___random",
				difficulty: 5,
				timestamp: "2024-01-01T00:00:00Z",
				signature: {
					provider: {
						challenge: "provider-challenge-sig",
					},
				},
			};

			const result = await api.submitPowCaptchaSolution(
				challenge,
				"user123",
				"dapp",
				42,
				"sig",
			);

			const init = (result as { init: RequestInit }).init;
			expect(init?.headers).toMatchObject({
				"Prosopo-Site-Key": account,
				"Prosopo-User": "user123",
			});
		});

		test("type checking - returns PowCaptchaSolutionResponse", async () => {
			const challenge: GetPowCaptchaResponse = {
				challenge: "1704067200000___user___dapp___random",
				difficulty: 5,
				timestamp: "2024-01-01T00:00:00Z",
				signature: {
					provider: {
						challenge: "provider-challenge-sig",
					},
				},
			};

			const result = await api.submitPowCaptchaSolution(
				challenge,
				"user",
				"dapp",
				42,
				"sig",
			);

			expectTypeOf(result).toMatchTypeOf<Promise<PowCaptchaSolutionResponse>>();
		});
	});

	describe("getFrictionlessCaptcha", () => {
		test("constructs request body correctly", async () => {
			const token = "token123";
			const headHash = "hash123";
			const dapp = "dapp456";
			const user = "user789";

			const result = await api.getFrictionlessCaptcha(
				token,
				headHash,
				dapp,
				user,
			);

			expect(result).toHaveProperty(
				"input",
				ClientApiPaths.GetFrictionlessCaptchaChallenge,
			);
			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body[ApiParams.token]).toBe(token);
			expect(body[ApiParams.headHash]).toBe(headHash);
			expect(body[ApiParams.dapp]).toBe(dapp);
			expect(body[ApiParams.user]).toBe(user);
		});

		test("sets correct headers", async () => {
			const result = await api.getFrictionlessCaptcha(
				"token",
				"hash",
				"dapp",
				"user123",
			);

			const init = (result as { init: RequestInit }).init;
			expect(init?.headers).toMatchObject({
				"Prosopo-Site-Key": account,
				"Prosopo-User": "user123",
			});
		});

		test("type checking - returns GetFrictionlessCaptchaResponse", async () => {
			const result = await api.getFrictionlessCaptcha(
				"token",
				"hash",
				"dapp",
				"user",
			);

			expectTypeOf(result).toMatchTypeOf<
				Promise<GetFrictionlessCaptchaResponse>
			>();
		});
	});

	describe("submitUserEvents", () => {
		test("constructs request body correctly", async () => {
			const events: StoredEvents = {
				events: [{ type: "click", timestamp: "2024-01-01T00:00:00Z" }],
			};
			const string = "event-string";

			const result = await api.submitUserEvents(events, string);

			expect(result).toHaveProperty("input", ClientApiPaths.SubmitUserEvents);
			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body.events).toEqual(events);
			expect(body.string).toBe(string);
		});

		test("sets correct headers", async () => {
			const events: StoredEvents = {
				events: [{ type: "click", timestamp: "2024-01-01T00:00:00Z" }],
			};

			const result = await api.submitUserEvents(events, "string");

			const init = (result as { init: RequestInit }).init;
			expect(init?.headers).toMatchObject({
				"Prosopo-Site-Key": account,
			});
			expect(init?.headers).not.toHaveProperty("Prosopo-User");
		});

		test("type checking - returns UpdateProviderClientsResponse", async () => {
			const events: StoredEvents = {
				events: [{ type: "click", timestamp: "2024-01-01T00:00:00Z" }],
			};

			const result = await api.submitUserEvents(events, "string");

			expectTypeOf(result).toMatchTypeOf<
				Promise<UpdateProviderClientsResponse>
			>();
		});
	});

	describe("getProviderStatus", () => {
		test("calls correct endpoint", async () => {
			const result = await api.getProviderStatus();

			expect(result).toHaveProperty("input", ClientApiPaths.GetProviderStatus);
		});

		test("sets correct headers", async () => {
			const result = await api.getProviderStatus();

			const init = (result as { init: RequestInit }).init;
			expect(init?.headers).toMatchObject({
				"Prosopo-Site-Key": account,
			});
		});

		test("type checking - returns ProviderRegistered", async () => {
			const result = await api.getProviderStatus();

			expectTypeOf(result).toMatchTypeOf<Promise<ProviderRegistered>>();
		});
	});

	describe("getProviderDetails", () => {
		test("calls correct endpoint", async () => {
			const result = await api.getProviderDetails();

			expect(result).toHaveProperty("input", PublicApiPaths.GetProviderDetails);
		});

		test("sets correct headers", async () => {
			const result = await api.getProviderDetails();

			const init = (result as { init: RequestInit }).init;
			expect(init?.headers).toMatchObject({
				"Prosopo-Site-Key": account,
			});
		});

		test("type checking - returns Provider", async () => {
			const result = await api.getProviderDetails();

			expectTypeOf(result).toMatchTypeOf<Promise<Provider>>();
		});
	});

	describe("submitPowCaptchaVerify", () => {
		test("constructs request body correctly without ip", async () => {
			const token = "token123";
			const signatureHex = "sig123";
			const recencyLimit = 3600;
			const user = "user123";

			const result = await api.submitPowCaptchaVerify(
				token,
				signatureHex,
				recencyLimit,
				user,
			);

			expect(result).toHaveProperty(
				"input",
				ClientApiPaths.VerifyPowCaptchaSolution,
			);
			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body[ApiParams.token]).toBe(token);
			expect(body[ApiParams.dappSignature]).toBe(signatureHex);
			expect(body[ApiParams.verifiedTimeout]).toBe(recencyLimit);
			expect(body[ApiParams.ip]).toBeUndefined();
		});

		test("constructs request body correctly with ip", async () => {
			const token = "token123";
			const signatureHex = "sig123";
			const recencyLimit = 3600;
			const user = "user123";
			const ip = "192.168.1.1";

			const result = await api.submitPowCaptchaVerify(
				token,
				signatureHex,
				recencyLimit,
				user,
				ip,
			);

			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body[ApiParams.ip]).toBe(ip);
		});

		test("sets correct headers", async () => {
			const result = await api.submitPowCaptchaVerify(
				"token",
				"sig",
				3600,
				"user123",
			);

			const init = (result as { init: RequestInit }).init;
			expect(init?.headers).toMatchObject({
				"Prosopo-Site-Key": account,
				"Prosopo-User": "user123",
			});
		});

		test("type checking - returns VerificationResponse", async () => {
			const result = await api.submitPowCaptchaVerify(
				"token",
				"sig",
				3600,
				"user",
			);

			expectTypeOf(result).toMatchTypeOf<Promise<VerificationResponse>>();
		});
	});

	describe("registerSiteKey", () => {
		test("constructs request body correctly", async () => {
			const siteKey = "site-key-123";
			const tier: Tier = "free";
			const settings: IUserSettings = {
				enabled: true,
			};
			const jwt = "jwt-token-123";

			const result = await api.registerSiteKey(siteKey, tier, settings, jwt);

			expect(result).toHaveProperty("input", AdminApiPaths.SiteKeyRegister);
			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body.siteKey).toBe(siteKey);
			expect(body.tier).toBe(tier);
			expect(body.settings).toEqual(settings);
		});

		test("sets correct headers", async () => {
			const settings: IUserSettings = { enabled: true };
			const jwt = "jwt-token-123";

			const result = await api.registerSiteKey("site-key", "free", settings, jwt);

			const init = (result as { init: RequestInit }).init;
			expect(init?.headers).toMatchObject({
				"Prosopo-Site-Key": account,
				Authorization: `Bearer ${jwt}`,
			});
		});

		test("type checking - returns ApiResponse", async () => {
			const settings: IUserSettings = { enabled: true };
			const result = await api.registerSiteKey(
				"site-key",
				"free",
				settings,
				"jwt-token",
			);

			expectTypeOf(result).toMatchTypeOf<Promise<ApiResponse>>();
		});
	});

	describe("updateDetectorKey", () => {
		test("constructs request body correctly", async () => {
			const detectorKey = "detector-key-123";
			const jwt = "jwt-token-123";

			const result = await api.updateDetectorKey(detectorKey, jwt);

			expect(result).toHaveProperty("input", AdminApiPaths.UpdateDetectorKey);
			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body.detectorKey).toBe(detectorKey);
		});

		test("sets correct headers", async () => {
			const jwt = "jwt-token-123";

			const result = await api.updateDetectorKey("detector-key", jwt);

			const init = (result as { init: RequestInit }).init;
			expect(init?.headers).toMatchObject({
				"Prosopo-Site-Key": account,
				Authorization: `Bearer ${jwt}`,
			});
		});

		test("type checking - returns UpdateDetectorKeyResponse", async () => {
			const result = await api.updateDetectorKey("detector-key", "jwt-token");

			expectTypeOf(result).toMatchTypeOf<Promise<UpdateDetectorKeyResponse>>();
		});
	});

	describe("removeDetectorKey", () => {
		test("constructs request body correctly without expirationInSeconds", async () => {
			const detectorKey = "detector-key-123";
			const jwt = "jwt-token-123";

			const result = await api.removeDetectorKey(detectorKey, jwt);

			expect(result).toHaveProperty("input", AdminApiPaths.RemoveDetectorKey);
			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body.detectorKey).toBe(detectorKey);
			expect(body.expirationInSeconds).toBeUndefined();
		});

		test("constructs request body correctly with expirationInSeconds", async () => {
			const detectorKey = "detector-key-123";
			const jwt = "jwt-token-123";
			const expirationInSeconds = 3600;

			const result = await api.removeDetectorKey(
				detectorKey,
				jwt,
				expirationInSeconds,
			);

			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body.expirationInSeconds).toBe(expirationInSeconds);
		});

		test("sets correct headers", async () => {
			const jwt = "jwt-token-123";

			const result = await api.removeDetectorKey("detector-key", jwt);

			const init = (result as { init: RequestInit }).init;
			expect(init?.headers).toMatchObject({
				"Prosopo-Site-Key": account,
				Authorization: `Bearer ${jwt}`,
			});
		});

		test("type checking - returns ApiResponse", async () => {
			const result = await api.removeDetectorKey("detector-key", "jwt-token");

			expectTypeOf(result).toMatchTypeOf<Promise<ApiResponse>>();
		});
	});

	describe("toggleMaintenanceMode", () => {
		test("constructs request body correctly with enabled true", async () => {
			const enabled = true;
			const timestamp = "2024-01-01T00:00:00Z";
			const signature = "sig123";

			const result = await api.toggleMaintenanceMode(
				enabled,
				timestamp,
				signature,
			);

			expect(result).toHaveProperty(
				"input",
				AdminApiPaths.ToggleMaintenanceMode,
			);
			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body.enabled).toBe(true);
		});

		test("constructs request body correctly with enabled false", async () => {
			const enabled = false;
			const timestamp = "2024-01-01T00:00:00Z";
			const signature = "sig123";

			const result = await api.toggleMaintenanceMode(
				enabled,
				timestamp,
				signature,
			);

			const body = (result as { body: unknown }).body as Record<
				string,
				unknown
			>;
			expect(body.enabled).toBe(false);
		});

		test("sets correct headers", async () => {
			const timestamp = "2024-01-01T00:00:00Z";
			const signature = "sig123";

			const result = await api.toggleMaintenanceMode(
				true,
				timestamp,
				signature,
			);

			const init = (result as { init: RequestInit }).init;
			expect(init?.headers).toMatchObject({
				"Prosopo-Site-Key": account,
				timestamp,
				signature,
			});
		});

		test("type checking - returns ApiResponse", async () => {
			const result = await api.toggleMaintenanceMode(
				true,
				"timestamp",
				"signature",
			);

			expectTypeOf(result).toMatchTypeOf<Promise<ApiResponse>>();
		});
	});
});
