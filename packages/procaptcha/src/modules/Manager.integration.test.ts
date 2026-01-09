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

import { type Server, createServer } from "node:http";
import type {
	CaptchaResponseBody,
	CaptchaSolutionResponse,
	ProcaptchaCallbacks,
	ProcaptchaClientConfigOutput,
	ProcaptchaState,
	ProcaptchaStateUpdateFn,
} from "@prosopo/types";
import { ApiParams } from "@prosopo/types";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Manager } from "./Manager.js";

// Mock window object for Node environment
(global as any).window = {
	clearTimeout: vi.fn(),
	setTimeout: vi.fn().mockReturnValue(123),
};

// Mock fingerprint library
vi.mock("@prosopo/fingerprint", () => ({
	getFingerprint: vi.fn().mockResolvedValue("mock-fingerprint"),
}));

// Mock procaptcha-common functions that use browser APIs
vi.mock("@prosopo/procaptcha-common", async () => {
	const actual = await vi.importActual("@prosopo/procaptcha-common");
	return {
		...actual,
		getProcaptchaRandomActiveProvider: vi.fn().mockImplementation(() => {
			const port = (global as unknown as { mockServerPort?: number })
				.mockServerPort;
			return Promise.resolve({
				provider: {
					url: `http://localhost:${port}`,
					datasetId: "test-dataset",
				},
			});
		}),
		providerRetry: vi.fn().mockImplementation(async (fn) => {
			return await fn();
		}),
		ExtensionLoader: vi.fn().mockImplementation(
			() =>
				class MockExtension {
					async getAccount() {
						return {
							account: {
								address: "test-user-address",
							},
							extension: {
								signer: {
									signRaw: vi.fn().mockResolvedValue({
										signature: "test-signature",
									}),
								},
							},
						};
					}
				},
		),
		getDefaultEvents: vi.fn().mockReturnValue({
			onOpen: vi.fn(),
			onClose: vi.fn(),
			onError: vi.fn(),
			onHuman: vi.fn(),
			onExpired: vi.fn(),
			onFailed: vi.fn(),
			onReset: vi.fn(),
			onReload: vi.fn(),
			onChallengeExpired: vi.fn(),
			onExtensionNotFound: vi.fn(),
		}),
		buildUpdateState: vi.fn().mockImplementation((state, onUpdate) => {
			return (updates: Partial<typeof state>) => {
				Object.assign(state, updates);
				onUpdate(updates);
			};
		}),
	};
});

// Mock crypto.getRandomValues
Object.defineProperty(global, "crypto", {
	value: {
		getRandomValues: vi.fn().mockImplementation((arr) => {
			for (let i = 0; i < arr.length; i++) {
				arr[i] = Math.floor(Math.random() * 256);
			}
			return arr;
		}),
	},
});

describe("Manager Integration Tests", () => {
	let mockProviderServer: Server;
	let serverPort: number;

	beforeAll(async () => {
		// Create a mock provider API server for integration testing
		mockProviderServer = createServer((req, res) => {
			const url = new URL(req.url || "", `http://${req.headers.host}`);

			if (
				req.method === "POST" &&
				url.pathname === "/v1/prosopo/provider/client/captcha/image"
			) {
				// Mock captcha challenge response
				const mockResponse: CaptchaResponseBody = {
					captchas: [
						{
							captchaId: "test-captcha-1",
							captchaContentId: "test-content-1",
							items: [
								{
									type: "image" as any,
									hash: "item-hash-1",
									data: "https://example.com/image1.png",
								},
								{
									type: "image" as any,
									hash: "item-hash-2",
									data: "https://example.com/image2.png",
								},
							],
							timeLimitMs: 30000,
							datasetId: "test-dataset",
						},
					],
					requestHash: "test-request-hash",
					timestamp: "1234567890",
					signature: {
						provider: {
							requestHash: "provider-request-hash",
						},
					},
				};

				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(mockResponse));
			} else if (
				req.method === "POST" &&
				url.pathname === "/v1/prosopo/provider/client/solution"
			) {
				// Mock captcha solution submission response
				const mockResponse: CaptchaSolutionResponse = {
					[ApiParams.status]: "You correctly answered the captchas",
					[ApiParams.captchas]: [],
					verified: true,
				};

				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(mockResponse));
			} else {
				res.writeHead(404);
				res.end(JSON.stringify({ error: "Not found" }));
			}
		});

		// Start server on a random available port
		await new Promise<void>((resolve) => {
			mockProviderServer.listen(0, "localhost", () => {
				const address = mockProviderServer.address();
				if (address && typeof address === "object") {
					serverPort = address.port;
				}
				// Set the mock server port for the mocked provider
				(global as unknown as { mockServerPort: number }).mockServerPort =
					serverPort;
				resolve();
			});
		});
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => {
			mockProviderServer.close(() => resolve());
		});
	});

	describe("Full Manager Workflow", () => {
		it("should complete full captcha workflow from start to submit", async () => {
			// Setup test state and configuration
			const mockState: ProcaptchaState = {
				isHuman: false,
				index: 0,
				solutions: [],
				captchaApi: undefined,
				showModal: false,
				challenge: undefined,
				loading: false,
				account: {
					account: {
						address: "test-user-address",
					},
					extension: {
						name: "test-extension",
						version: "1.0.0",
						signer: {
							signRaw: vi.fn().mockResolvedValue({
								signature: "test-signature",
							}),
						},
					} as any,
				},
				dappAccount: "test-dapp-address",
				submission: undefined,
				timeout: undefined,
				successfullChallengeTimeout: undefined,
				sendData: false,
				attemptCount: 0,
				error: undefined,
				sessionId: undefined,
			};

			const mockCallbacks: ProcaptchaCallbacks = {
				onHuman: vi.fn(),
				onError: vi.fn(),
				onExpired: vi.fn(),
				onFailed: vi.fn(),
			};

			const mockConfig: ProcaptchaClientConfigOutput = {
				account: {
					address: "test-dapp-address",
				},
				web2: true,
				userAccountAddress: "test-user-address",
				defaultEnvironment: "development",
				captchas: {
					image: {
						verifiedTimeout: 300000,
						challengeTimeout: 30000,
						solutionTimeout: 60000,
						cachedTimeout: 3600000,
					},
				},
			};

			const currentState = { ...mockState };
			const onStateUpdate: ProcaptchaStateUpdateFn = vi.fn((updates) => {
				Object.assign(currentState, updates);
			});

			const manager = Manager(
				mockConfig,
				currentState,
				onStateUpdate,
				mockCallbacks,
			);

			// Test 1: Start captcha process
			await manager.start();

			// Verify state after start
			expect(currentState.loading).toBe(false);
			expect(currentState.showModal).toBe(true);
			expect(currentState.challenge).toBeDefined();
			expect(currentState.challenge?.captchas).toHaveLength(1);
			expect(currentState.solutions).toHaveLength(1);
			expect(currentState.solutions[0]).toEqual([]);

			// Test 2: Select some items
			manager.select("item-hash-1", 10, 20);
			expect(currentState.solutions[0]).toEqual([["item-hash-1", 10, 20]]);

			// Test 3: Submit the solution
			await manager.submit();

			// Verify final state
			expect(currentState.showModal).toBe(false);
			expect(currentState.isHuman).toBe(true);
			expect(currentState.submission).toBeDefined();
			expect(mockCallbacks.onHuman).toHaveBeenCalled();
		}, 30000);

		it("should handle provider API errors gracefully", async () => {
			// Setup server to return error
			const originalHandler = mockProviderServer.listeners("request")[0];
			mockProviderServer.removeAllListeners("request");

			mockProviderServer.on("request", (req, res) => {
				const url = new URL(req.url || "", `http://${req.headers.host}`);

				if (
					req.method === "POST" &&
					url.pathname === "/api/getCaptchaChallenge"
				) {
					const errorResponse: CaptchaResponseBody = {
						[ApiParams.error]: {
							message: "Provider unavailable",
							key: "PROVIDER.ERROR",
							code: 500,
						} as any,
						captchas: [],
						requestHash: "",
						timestamp: "",
						signature: {
							provider: {
								requestHash: "",
							},
						},
					};

					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify(errorResponse));
				} else {
					res.writeHead(404);
					res.end();
				}
			});

			const mockState: ProcaptchaState = {
				isHuman: false,
				index: 0,
				solutions: [],
				captchaApi: undefined,
				showModal: false,
				challenge: undefined,
				loading: false,
				account: {
					account: {
						address: "test-user-address",
					},
					extension: {
						name: "test-extension",
						version: "1.0.0",
						signer: {
							signRaw: vi.fn().mockResolvedValue({
								signature: "test-signature",
							}),
						},
					} as any,
				},
				dappAccount: "test-dapp-address",
				submission: undefined,
				timeout: undefined,
				successfullChallengeTimeout: undefined,
				sendData: false,
				attemptCount: 0,
				error: undefined,
				sessionId: undefined,
			};

			const mockCallbacks: ProcaptchaCallbacks = {
				onHuman: vi.fn(),
				onError: vi.fn(),
				onExpired: vi.fn(),
				onFailed: vi.fn(),
			};

			const mockConfig: ProcaptchaClientConfigOutput = {
				account: {
					address: "test-dapp-address",
				},
				web2: true,
				userAccountAddress: "test-user-address",
				defaultEnvironment: "development",
				captchas: {
					image: {
						verifiedTimeout: 300000,
						challengeTimeout: 30000,
						solutionTimeout: 60000,
						cachedTimeout: 3600000,
					},
				},
			};

			const currentState = { ...mockState };
			const onStateUpdate: ProcaptchaStateUpdateFn = vi.fn((updates) => {
				Object.assign(currentState, updates);
			});

			const manager = Manager(
				mockConfig,
				currentState,
				onStateUpdate,
				mockCallbacks,
			);

			// Start should handle the error gracefully
			await manager.start();

			expect(currentState.loading).toBe(false);
			expect(currentState.error).toEqual({
				message: "Provider unavailable",
				key: "PROVIDER.ERROR",
			});
			expect(mockCallbacks.onError).toHaveBeenCalled();

			// Restore original handler
			mockProviderServer.removeAllListeners("request");
			mockProviderServer.addListener("request", originalHandler);
		}, 30000);
	});
});
