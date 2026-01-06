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
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createServer } from "node:http";
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
						registered: true,
						address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (method === "GET" && path === PublicApiPaths.GetProviderDetails) {
					const response: Provider = {
						address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
						url: "https://provider.example.com",
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (
					method === "POST" &&
					path === ClientApiPaths.GetImageCaptchaChallenge
				) {
					const response: CaptchaResponseBody = {
						captchas: [],
						requestHash: "hash123",
						signature: {
							provider: {
								requestHash: "provider-sig",
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
						token: "token123" as ProcaptchaToken,
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (
					method === "POST" &&
					path === ClientApiPaths.VerifyImageCaptchaSolutionDapp
				) {
					const response: ImageVerificationResponse = {
						verified: true,
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (
					method === "POST" &&
					path === ClientApiPaths.GetPowCaptchaChallenge
				) {
					const response: GetPowCaptchaResponse = {
						challenge: "1704067200000___user123___dapp456___random",
						difficulty: 5,
						timestamp: "2024-01-01T00:00:00Z",
						signature: {
							provider: {
								challenge: "provider-challenge-sig",
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
						token: "pow-token123" as ProcaptchaToken,
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (
					method === "POST" &&
					path === ClientApiPaths.GetFrictionlessCaptchaChallenge
				) {
					const response: GetFrictionlessCaptchaResponse = {
						sessionId: "session-123",
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (
					method === "POST" &&
					path === ClientApiPaths.SubmitUserEvents
				) {
					const response: UpdateProviderClientsResponse = {
						success: true,
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (
					method === "POST" &&
					path === ClientApiPaths.VerifyPowCaptchaSolution
				) {
					const response: VerificationResponse = {
						verified: true,
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (method === "POST" && path === AdminApiPaths.SiteKeyRegister) {
					const response: ApiResponse = {
						success: true,
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (method === "POST" && path === AdminApiPaths.UpdateDetectorKey) {
					const response: UpdateDetectorKeyResponse = {
						success: true,
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (method === "POST" && path === AdminApiPaths.RemoveDetectorKey) {
					const response: ApiResponse = {
						success: true,
					};
					res.statusCode = 200;
					res.end(JSON.stringify(response));
				} else if (
					method === "POST" &&
					path === AdminApiPaths.ToggleMaintenanceMode
				) {
					const response: ApiResponse = {
						success: true,
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
				provider: {
					datasetId: "dataset-123",
					address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				},
			};

			const result = await api.getCaptchaChallenge(userAccount, randomProvider);

			expect(result).toHaveProperty("captchas");
			expect(result).toHaveProperty("requestHash");
			expect(result.requestHash).toBe("hash123");
		});

		test("includes sessionId when provided", async () => {
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

			expect(result).toHaveProperty("requestHash");
		});
	});

	describe("submitCaptchaSolution", () => {
		test("makes HTTP request and returns response", async () => {
			const captchas: CaptchaSolution[] = [
				{ index: 0, solution: [1, 2, 3] },
			];
			const result = await api.submitCaptchaSolution(
				captchas,
				"hash123",
				"user123",
				"2024-01-01T00:00:00Z",
				"provider-sig",
				"user-sig",
			);

			expect(result).toHaveProperty("token");
			expect(result.token).toBe("token123");
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

			expect(result).toHaveProperty("challenge");
			expect(result).toHaveProperty("difficulty");
			expect(result.difficulty).toBe(5);
		});

		test("includes sessionId when provided", async () => {
			const result = await api.getPowCaptchaChallenge(
				"user123",
				"dapp456",
				"session789",
			);

			expect(result).toHaveProperty("challenge");
		});
	});

	describe("submitPowCaptchaSolution", () => {
		test("makes HTTP request and returns response", async () => {
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

			const result = await api.submitPowCaptchaSolution(
				challenge,
				"user123",
				"dapp456",
				42,
				"user-sig",
			);

			expect(result).toHaveProperty("token");
			expect(result.token).toBe("pow-token123");
		});

		test("includes optional parameters", async () => {
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
				3600,
				"salt123",
			);

			expect(result).toHaveProperty("token");
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

			expect(result).toHaveProperty("sessionId");
			expect(result.sessionId).toBe("session-123");
		});
	});

	describe("submitUserEvents", () => {
		test("makes HTTP request and returns response", async () => {
			const events: StoredEvents = {
				events: [{ type: "click", timestamp: "2024-01-01T00:00:00Z" }],
			};

			const result = await api.submitUserEvents(events, "event-string");

			expect(result).toHaveProperty("success");
			expect(result.success).toBe(true);
		});
	});

	describe("getProviderStatus", () => {
		test("makes HTTP request and returns response", async () => {
			const result = await api.getProviderStatus();

			expect(result).toHaveProperty("registered");
			expect(result.registered).toBe(true);
		});
	});

	describe("getProviderDetails", () => {
		test("makes HTTP request and returns response", async () => {
			const result = await api.getProviderDetails();

			expect(result).toHaveProperty("address");
			expect(result).toHaveProperty("url");
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
			const tier: Tier = "free";
			const settings: IUserSettings = {
				enabled: true,
			};
			const jwt = "jwt-token-123";

			const result = await api.registerSiteKey(siteKey, tier, settings, jwt);

			expect(result).toHaveProperty("success");
			expect(result.success).toBe(true);
		});
	});

	describe("updateDetectorKey", () => {
		test("makes HTTP request and returns response", async () => {
			const result = await api.updateDetectorKey("detector-key-123", "jwt-token");

			expect(result).toHaveProperty("success");
			expect(result.success).toBe(true);
		});
	});

	describe("removeDetectorKey", () => {
		test("makes HTTP request and returns response without expirationInSeconds", async () => {
			const result = await api.removeDetectorKey("detector-key-123", "jwt-token");

			expect(result).toHaveProperty("success");
			expect(result.success).toBe(true);
		});

		test("makes HTTP request and returns response with expirationInSeconds", async () => {
			const result = await api.removeDetectorKey(
				"detector-key-123",
				"jwt-token",
				3600,
			);

			expect(result).toHaveProperty("success");
			expect(result.success).toBe(true);
		});
	});

	describe("toggleMaintenanceMode", () => {
		test("makes HTTP request and returns response with enabled true", async () => {
			const result = await api.toggleMaintenanceMode(
				true,
				"2024-01-01T00:00:00Z",
				"sig123",
			);

			expect(result).toHaveProperty("success");
			expect(result.success).toBe(true);
		});

		test("makes HTTP request and returns response with enabled false", async () => {
			const result = await api.toggleMaintenanceMode(
				false,
				"2024-01-01T00:00:00Z",
				"sig123",
			);

			expect(result).toHaveProperty("success");
			expect(result.success).toBe(true);
		});
	});
});

