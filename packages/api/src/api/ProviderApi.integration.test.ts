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

import { createServer } from "node:http";
import {
	AdminApiPaths,
	ApiParams,
	type CaptchaResponseBody,
	type CaptchaSolution,
	type CaptchaSolutionResponse,
	CaptchaType,
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
	Tier,
	type UpdateDetectorKeyResponse,
	type UpdateProviderClientsResponse,
	type VerificationResponse,
} from "@prosopo/types";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import ProviderApi from "./ProviderApi.js";

describe("ProviderApi Integration Tests", () => {
	let server: ReturnType<typeof createServer>;
	let serverUrl: string;
	let api: ProviderApi;
	const account = "test-account-123";
	const port = 30001;

	beforeAll(async () => {
		server = createServer((req, res) => {
			let body = "";
			req.on("data", (chunk) => {
				body += chunk.toString();
			});
			req.on("end", () => {
				const url = new URL(req.url || "/", `http://localhost:${port}`);
				const path = url.pathname;
				const method = req.method;

				res.setHeader("Content-Type", "application/json");

				if (method === "GET" && path === ClientApiPaths.GetProviderStatus) {
					const response: ProviderRegistered = {
						status: "Registered",
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (
					method === "GET" &&
					path === PublicApiPaths.GetProviderDetails
				) {
					const response: Provider = {
						url: [
							104, 116, 116, 112, 115, 58, 47, 47, 112, 114, 111, 118, 105, 100,
							101, 114, 46, 101, 120, 97, 109, 112, 108, 101, 46, 99, 111, 109,
						],
						datasetId: "datasetId123",
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (
					method === "POST" &&
					path === ClientApiPaths.GetImageCaptchaChallenge
				) {
					const response: CaptchaResponseBody = {
						[ApiParams.captchas]: [],
						[ApiParams.requestHash]: "hash123",
						[ApiParams.timestamp]: "2024-01-01T00:00:00Z",
						[ApiParams.status]: "success",
						[ApiParams.signature]: {
							[ApiParams.provider]: {
								[ApiParams.requestHash]: "provider-sig",
							},
						},
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (
					method === "POST" &&
					path === ClientApiPaths.SubmitImageCaptchaSolution
				) {
					const response: CaptchaSolutionResponse = {
						[ApiParams.captchas]: [],
						[ApiParams.verified]: true,
						[ApiParams.status]: "success",
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (
					method === "POST" &&
					path === ClientApiPaths.VerifyImageCaptchaSolutionDapp
				) {
					const response: ImageVerificationResponse = {
						[ApiParams.verified]: true,
						[ApiParams.status]: "success",
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (
					method === "POST" &&
					path === ClientApiPaths.GetPowCaptchaChallenge
				) {
					const response: GetPowCaptchaResponse = {
						[ApiParams.challenge]: "1704067200000___user123___dapp456___random",
						[ApiParams.difficulty]: 5,
						[ApiParams.timestamp]: "2024-01-01T00:00:00Z",
						[ApiParams.status]: "success",
						[ApiParams.signature]: {
							[ApiParams.provider]: {
								[ApiParams.challenge]: "provider-challenge-sig",
							},
						},
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (
					method === "POST" &&
					path === ClientApiPaths.SubmitPowCaptchaSolution
				) {
					const response: PowCaptchaSolutionResponse = {
						[ApiParams.verified]: true,
						[ApiParams.status]: "success",
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (
					method === "POST" &&
					path === ClientApiPaths.GetFrictionlessCaptchaChallenge
				) {
					const response: GetFrictionlessCaptchaResponse = {
						[ApiParams.captchaType]: CaptchaType.pow,
						[ApiParams.sessionId]: "session-123",
						[ApiParams.status]: "success",
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (
					method === "POST" &&
					path === ClientApiPaths.SubmitUserEvents
				) {
					const response: UpdateProviderClientsResponse = {
						message: "Events submitted",
						[ApiParams.status]: "success",
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (
					method === "POST" &&
					path === ClientApiPaths.VerifyPowCaptchaSolution
				) {
					const response: VerificationResponse = {
						[ApiParams.verified]: true,
						[ApiParams.status]: "success",
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (
					method === "POST" &&
					path === AdminApiPaths.SiteKeyRegister
				) {
					const response = {
						[ApiParams.status]: "success",
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (
					method === "POST" &&
					path === AdminApiPaths.UpdateDetectorKey
				) {
					const response: UpdateDetectorKeyResponse = {
						data: {
							activeDetectorKeys: ["key1", "key2"],
						},
						[ApiParams.status]: "success",
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (
					method === "POST" &&
					path === AdminApiPaths.RemoveDetectorKey
				) {
					const response = {
						[ApiParams.status]: "success",
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (
					method === "POST" &&
					path === AdminApiPaths.ToggleMaintenanceMode
				) {
					const response = {
						[ApiParams.status]: "success",
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else {
					res.statusCode = 404;
					res.end(JSON.stringify({ error: "Not found" }));
				}
			});
		});

		await new Promise<void>((resolve) => {
			server.listen(port, () => {
				resolve();
			});
		});

		serverUrl = `http://localhost:${port}`;
		api = new ProviderApi(serverUrl, account);
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => {
			server.close(() => {
				resolve();
			});
		});
	});

	describe("getCaptchaChallenge", () => {
		test("makes HTTP request and returns response", async () => {
			const userAccount = "user123";
			const randomProvider: RandomProvider = {
				providerAccount: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				provider: {
					datasetId: "dataset-123",
					url: "https://provider.example.com",
				},
			};

			const result = await api.getCaptchaChallenge(userAccount, randomProvider);

			expect(result).toHaveProperty(ApiParams.captchas);
			expect(result).toHaveProperty(ApiParams.requestHash);
			expect(result[ApiParams.requestHash]).toBe("hash123");
		});

		test("includes sessionId when provided", async () => {
			const userAccount = "user123";
			const sessionId = "session-456";
			const randomProvider: RandomProvider = {
				providerAccount: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				provider: {
					datasetId: "dataset-123",
					url: "https://provider.example.com",
				},
			};

			const result = await api.getCaptchaChallenge(
				userAccount,
				randomProvider,
				sessionId,
			);

			expect(result).toHaveProperty(ApiParams.requestHash);
		});
	});

	describe("submitCaptchaSolution", () => {
		test("makes HTTP request and returns response", async () => {
			const captchas: CaptchaSolution[] = [
				{
					captchaId: "captcha-1",
					captchaContentId: "content-1",
					salt: "salt123456789012345678901234567890",
					solution: ["1", "2", "3"],
				},
			];
			const result = await api.submitCaptchaSolution(
				captchas,
				"hash123",
				"user123",
				"2024-01-01T00:00:00Z",
				"provider-sig",
				"user-sig",
			);

			expect(result).toHaveProperty(ApiParams.verified);
			expect(result[ApiParams.verified]).toBe(true);
		});
	});

	describe("verifyDappUser", () => {
		test("makes HTTP request and returns response", async () => {
			const token: ProcaptchaToken = "token123";
			const result = await api.verifyDappUser(token, "sig123", "user123");

			expect(result).toHaveProperty("verified");
			expect(result.verified).toBe(true);
		});

		test("includes optional parameters", async () => {
			const token: ProcaptchaToken = "token123";
			const result = await api.verifyDappUser(
				token,
				"sig123",
				"user123",
				3600,
				"192.168.1.1",
			);

			expect(result.verified).toBe(true);
		});
	});

	describe("getPowCaptchaChallenge", () => {
		test("makes HTTP request and returns response", async () => {
			const result = await api.getPowCaptchaChallenge("user123", "dapp456");

			expect(result).toHaveProperty(ApiParams.challenge);
			expect(result).toHaveProperty(ApiParams.difficulty);
			expect(result[ApiParams.difficulty]).toBe(5);
		});

		test("includes sessionId when provided", async () => {
			const result = await api.getPowCaptchaChallenge(
				"user123",
				"dapp456",
				"session789",
			);

			expect(result).toHaveProperty(ApiParams.challenge);
		});
	});

	describe("submitPowCaptchaSolution", () => {
		test("makes HTTP request and returns response", async () => {
			const challenge: GetPowCaptchaResponse = {
				[ApiParams.challenge]: "1704067200000___user123___dapp456___random",
				[ApiParams.difficulty]: 5,
				[ApiParams.timestamp]: "2024-01-01T00:00:00Z",
				[ApiParams.status]: "success",
				[ApiParams.signature]: {
					[ApiParams.provider]: {
						[ApiParams.challenge]: "provider-challenge-sig",
					},
				},
			};

			const result = await api.submitPowCaptchaSolution(
				challenge,
				"user123",
				"dapp456",
				42,
				"user-sig",
			);

			expect(result).toHaveProperty(ApiParams.verified);
			expect(result[ApiParams.verified]).toBe(true);
		});

		test("includes optional parameters", async () => {
			const challenge: GetPowCaptchaResponse = {
				[ApiParams.challenge]: "1704067200000___user___dapp___random",
				[ApiParams.difficulty]: 5,
				[ApiParams.timestamp]: "2024-01-01T00:00:00Z",
				[ApiParams.status]: "success",
				[ApiParams.signature]: {
					[ApiParams.provider]: {
						[ApiParams.challenge]: "provider-challenge-sig",
					},
				},
			};

			const result = await api.submitPowCaptchaSolution(
				challenge,
				"user",
				"dapp",
				42,
				"sig",
				3600,
				"salt123",
			);

			expect(result).toHaveProperty(ApiParams.verified);
		});
	});

	describe("getFrictionlessCaptcha", () => {
		test("makes HTTP request and returns response", async () => {
			const result = await api.getFrictionlessCaptcha(
				"token123",
				"hash123",
				"dapp456",
				"user789",
			);

			expect(result).toHaveProperty(ApiParams.sessionId);
			expect(result[ApiParams.sessionId]).toBe("session-123");
		});
	});

	describe("submitUserEvents", () => {
		test("makes HTTP request and returns response", async () => {
			const events: StoredEvents = {
				mouseEvents: [],
			};

			const result = await api.submitUserEvents(events, "event-string");

			expect(result).toHaveProperty("message");
			expect(result.message).toBe("Events submitted");
		});
	});

	describe("getProviderStatus", () => {
		test("makes HTTP request and returns response", async () => {
			const result = await api.getProviderStatus();

			expect(result).toHaveProperty("status");
			expect(result.status).toBe("Registered");
		});
	});

	describe("getProviderDetails", () => {
		test("makes HTTP request and returns response", async () => {
			const result = await api.getProviderDetails();

			expect(result).toHaveProperty("url");
			expect(result).toHaveProperty("datasetId");
		});
	});

	describe("submitPowCaptchaVerify", () => {
		test("makes HTTP request and returns response", async () => {
			const result = await api.submitPowCaptchaVerify(
				"token123",
				"sig123",
				3600,
				"user123",
			);

			expect(result).toHaveProperty("verified");
			expect(result.verified).toBe(true);
		});

		test("includes optional ip parameter", async () => {
			const result = await api.submitPowCaptchaVerify(
				"token123",
				"sig123",
				3600,
				"user123",
				"192.168.1.1",
			);

			expect(result.verified).toBe(true);
		});
	});

	describe("registerSiteKey", () => {
		test("makes HTTP request and returns response", async () => {
			const siteKey = "site-key-123";
			const tier = Tier.Free;
			const settings: IUserSettings = {
				captchaType: CaptchaType.image,
				domains: [],
				frictionlessThreshold: 0.5,
				powDifficulty: 5,
				imageThreshold: 0.5,
			};
			const jwt = "jwt-token-123";

			const result = await api.registerSiteKey(siteKey, tier, settings, jwt);

			expect(result).toHaveProperty(ApiParams.status);
			expect(result[ApiParams.status]).toBe("success");
		});
	});

	describe("updateDetectorKey", () => {
		test("makes HTTP request and returns response", async () => {
			const result = await api.updateDetectorKey(
				"detector-key-123",
				"jwt-token",
			);

			expect(result).toHaveProperty("data");
			expect(result).toHaveProperty(ApiParams.status);
			expect(result.data.activeDetectorKeys).toEqual(["key1", "key2"]);
		});
	});

	describe("removeDetectorKey", () => {
		test("makes HTTP request and returns response without expirationInSeconds", async () => {
			const result = await api.removeDetectorKey(
				"detector-key-123",
				"jwt-token",
			);

			expect(result).toHaveProperty(ApiParams.status);
			expect(result[ApiParams.status]).toBe("success");
		});

		test("makes HTTP request and returns response with expirationInSeconds", async () => {
			const result = await api.removeDetectorKey(
				"detector-key-123",
				"jwt-token",
				3600,
			);

			expect(result).toHaveProperty(ApiParams.status);
			expect(result[ApiParams.status]).toBe("success");
		});
	});

	describe("toggleMaintenanceMode", () => {
		test("makes HTTP request and returns response with enabled true", async () => {
			const result = await api.toggleMaintenanceMode(
				true,
				"2024-01-01T00:00:00Z",
				"sig123",
			);

			expect(result).toHaveProperty(ApiParams.status);
			expect(result[ApiParams.status]).toBe("success");
		});

		test("makes HTTP request and returns response with enabled false", async () => {
			const result = await api.toggleMaintenanceMode(
				false,
				"2024-01-01T00:00:00Z",
				"sig123",
			);

			expect(result).toHaveProperty(ApiParams.status);
			expect(result[ApiParams.status]).toBe("success");
		});
	});
});
