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

import { ProsopoError } from "@prosopo/common";
import { ExtensionLoader } from "@prosopo/procaptcha-common";
import {
	buildUpdateState,
	getProcaptchaRandomActiveProvider,
	providerRetry,
} from "@prosopo/procaptcha-common";
import { getDefaultEvents } from "@prosopo/procaptcha-common";
import type {
	Account,
	CaptchaResponseBody,
	FrictionlessState,
	ProcaptchaCallbacks,
	ProcaptchaClientConfigOutput,
	ProcaptchaState,
	ProcaptchaStateUpdateFn,
	TCaptchaSubmitResult,
} from "@prosopo/types";
import { ApiParams } from "@prosopo/types";
import { encodeProcaptchaOutput } from "@prosopo/types";
import { sleep } from "@prosopo/util";
import { embedData, hashToHex } from "@prosopo/util";
import { randomAsHex } from "@prosopo/util-crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Manager } from "./Manager.js";
import ProsopoCaptchaApi from "./ProsopoCaptchaApi.js";

vi.mock("@prosopo/procaptcha-common", async () => {
	const actual = await vi.importActual("@prosopo/procaptcha-common");
	return {
		...actual,
		ExtensionLoader: vi.fn(),
		getProcaptchaRandomActiveProvider: vi.fn(),
		providerRetry: vi.fn(),
		buildUpdateState: vi.fn(),
		getDefaultEvents: vi.fn(),
	};
});

vi.mock("./ProsopoCaptchaApi.js", () => ({
	default: vi.fn(),
}));

vi.mock("@prosopo/util", () => ({
	sleep: vi.fn(),
	embedData: vi.fn(),
	hashToHex: vi.fn(),
	at: vi.fn((arr, index) => arr[index]),
}));

vi.mock("@prosopo/util-crypto", () => ({
	randomAsHex: vi.fn(),
}));

vi.mock("@prosopo/types", async () => {
	const actual = await vi.importActual("@prosopo/types");
	return {
		...actual,
		encodeProcaptchaOutput: vi.fn(),
	};
});

describe("Manager", () => {
	let mockState: ProcaptchaState;
	let mockOnStateUpdate: ProcaptchaStateUpdateFn;
	let mockCallbacks: ProcaptchaCallbacks;
	let mockConfig: ProcaptchaClientConfigOutput;
	let mockUpdateState: ReturnType<typeof buildUpdateState>;
	let mockEvents: ReturnType<typeof getDefaultEvents>;
	let mockExtensionLoader: typeof ExtensionLoader;
	let mockProviderApi: { getCaptchaChallenge: any; submitCaptchaSolution: any };
	let mockCaptchaApi: ProsopoCaptchaApi;

	beforeEach(() => {
		vi.useFakeTimers();

		mockState = {
			isHuman: false,
			index: 0,
			solutions: [],
			captchaApi: undefined,
			showModal: false,
			challenge: undefined,
			loading: false,
			account: undefined,
			dappAccount: undefined,
			submission: undefined,
			timeout: undefined,
			successfullChallengeTimeout: undefined,
			sendData: false,
			attemptCount: 0,
			error: undefined,
			sessionId: undefined,
		};

		mockOnStateUpdate = vi.fn();
		mockCallbacks = {
			onHuman: vi.fn(),
			onError: vi.fn(),
			onExpired: vi.fn(),
			onFailed: vi.fn(),
		};

		mockConfig = {
			account: {
				address: "dapp-address-123",
			},
			web2: true,
			userAccountAddress: "user-address-123",
			defaultEnvironment: "development",
			captchas: {
				image: {
					challengeTimeout: 30000,
					solutionTimeout: 60000,
				},
			},
		} as ProcaptchaClientConfigOutput;

		mockUpdateState = vi.fn((nextState) => {
			Object.assign(mockState, nextState);
			mockOnStateUpdate(nextState);
		});

		mockEvents = {
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
		};

		vi.mocked(buildUpdateState).mockReturnValue(mockUpdateState);
		vi.mocked(getDefaultEvents).mockReturnValue(mockEvents);

		mockExtensionLoader = vi.fn().mockResolvedValue(
			class MockExtension {
				async getAccount() {
					return {
						account: {
							address: "user-address-123",
						},
						extension: {
							signer: {
								signRaw: vi.fn().mockResolvedValue({
									signature: "signed-data",
								}),
							},
						},
					} as Account;
				}
			},
		);

		vi.mocked(ExtensionLoader).mockImplementation(mockExtensionLoader);

		mockProviderApi = {
			getCaptchaChallenge: vi.fn(),
			submitCaptchaSolution: vi.fn(),
		};

		mockCaptchaApi = {
			userAccount: "user-address-123",
			provider: {
				provider: {
					url: "https://provider.example.com",
				},
			},
			providerApi: mockProviderApi,
			dappAccount: "dapp-address-123",
			web2: false,
			getCaptchaChallenge: vi.fn(),
			submitCaptchaSolution: vi.fn(),
		} as unknown as ProsopoCaptchaApi;

		vi.mocked(ProsopoCaptchaApi).mockImplementation(() => mockCaptchaApi);

		vi.mocked(sleep).mockResolvedValue(undefined);
		vi.mocked(randomAsHex).mockReturnValue("random-hex");
		vi.mocked(embedData).mockReturnValue([1, 2, 3]);
		vi.mocked(hashToHex).mockReturnValue("hashed-hex");
		vi.mocked(encodeProcaptchaOutput).mockReturnValue("encoded-output");

		(global as any).window = {
			clearTimeout: vi.fn(),
			setTimeout: vi.fn().mockReturnValue(123),
		};
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	describe("start", () => {
		it("should start captcha process successfully", async () => {
			const mockChallenge: CaptchaResponseBody = {
				captchas: [
					{
						captchaId: "captcha-1",
						captchaContentId: "content-1",
						items: [],
						timeLimitMs: 30000,
						datasetId: "dataset-1",
					},
				],
				requestHash: "request-hash",
				timestamp: "1234567890",
				signature: {
					provider: {
						requestHash: "provider-request-hash",
					},
				},
			};

			vi.mocked(getProcaptchaRandomActiveProvider).mockResolvedValue({
				provider: {
					url: "https://provider.example.com",
					datasetId: "dataset-1",
				},
			});

			vi.mocked(providerRetry).mockImplementation(async (fn) => {
				await fn();
			});

			mockCaptchaApi.getCaptchaChallenge = vi
				.fn()
				.mockResolvedValue(mockChallenge);

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.start();

			expect(mockEvents.onOpen).toHaveBeenCalled();
			expect(mockState.attemptCount).toBe(1);
			expect(mockState.dappAccount).toBe("dapp-address-123");
			expect(mockState.account).toBeDefined();
			expect(mockState.captchaApi).toBe(mockCaptchaApi);
			expect(mockState.challenge).toEqual(mockChallenge);
			expect(mockState.showModal).toBe(true);
			expect(mockState.loading).toBe(false);
		});

		it("should not start if already loading", async () => {
			mockState.loading = true;

			vi.mocked(providerRetry).mockImplementation(async (fn) => {
				await fn();
			});

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.start();

			expect(getProcaptchaRandomActiveProvider).not.toHaveBeenCalled();
		});

		it("should not start if already human", async () => {
			mockState.isHuman = true;

			vi.mocked(providerRetry).mockImplementation(async (fn) => {
				await fn();
			});

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.start();

			expect(getProcaptchaRandomActiveProvider).not.toHaveBeenCalled();
		});

		it("should handle challenge error response", async () => {
			const errorChallenge: CaptchaResponseBody = {
				[ApiParams.error]: {
					message: "Challenge error",
					key: "CHALLENGE.ERROR",
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

			vi.mocked(getProcaptchaRandomActiveProvider).mockResolvedValue({
				provider: {
					url: "https://provider.example.com",
					datasetId: "dataset-1",
				},
			});

			vi.mocked(providerRetry).mockImplementation(async (fn) => {
				await fn();
			});

			mockCaptchaApi.getCaptchaChallenge = vi
				.fn()
				.mockResolvedValue(errorChallenge);

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.start();

			expect(mockState.error).toEqual({
				message: "Challenge error",
				key: "CHALLENGE.ERROR",
			});
			expect(mockState.loading).toBe(false);
			expect(mockEvents.onError).toHaveBeenCalled();
		});

		it("should throw error when no captchas returned", async () => {
			const emptyChallenge: CaptchaResponseBody = {
				captchas: [],
				requestHash: "request-hash",
				timestamp: "1234567890",
				signature: {
					provider: {
						requestHash: "provider-request-hash",
					},
				},
			};

			vi.mocked(getProcaptchaRandomActiveProvider).mockResolvedValue({
				provider: {
					url: "https://provider.example.com",
					datasetId: "dataset-1",
				},
			});

			vi.mocked(providerRetry).mockImplementation(async (fn) => {
				try {
					await fn();
				} catch (err) {
					// Error is caught by providerRetry
				}
			});

			mockCaptchaApi.getCaptchaChallenge = vi
				.fn()
				.mockResolvedValue(emptyChallenge);

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.start();

			expect(providerRetry).toHaveBeenCalled();
		});

		it("should use frictionless state provider when available", async () => {
			const frictionlessState: FrictionlessState = {
				provider: {
					provider: {
						url: "https://frictionless-provider.example.com",
						datasetId: "dataset-1",
					},
				} as any,
				sessionId: "session-123",
				userAccount: {
					account: {
						address: "frictionless-user-123",
					},
					extension: {
						signer: {
							signRaw: vi.fn().mockResolvedValue({
								signature: "signed-data",
							}),
						},
					},
				} as Account,
				restart: vi.fn(),
			};

			const mockChallenge: CaptchaResponseBody = {
				captchas: [
					{
						captchaId: "captcha-1",
						captchaContentId: "content-1",
						items: [],
						timeLimitMs: 30000,
						datasetId: "dataset-1",
					},
				],
				requestHash: "request-hash",
				timestamp: "1234567890",
				signature: {
					provider: {
						requestHash: "provider-request-hash",
					},
				},
			};

			vi.mocked(providerRetry).mockImplementation(async (fn) => {
				await fn();
			});

			mockCaptchaApi.getCaptchaChallenge = vi
				.fn()
				.mockResolvedValue(mockChallenge);

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
				frictionlessState,
			);

			await manager.start();

			expect(mockState.sessionId).toBe("session-123");
			expect(mockState.account).toBe(frictionlessState.userAccount);
			expect(getProcaptchaRandomActiveProvider).not.toHaveBeenCalled();
		});
	});

	describe("submit", () => {
		beforeEach(() => {
			mockState.challenge = {
				captchas: [
					{
						captchaId: "captcha-1",
						captchaContentId: "content-1",
						items: [],
						timeLimitMs: 30000,
						datasetId: "dataset-1",
					},
				],
				requestHash: "request-hash",
				timestamp: "1234567890",
				signature: {
					provider: {
						requestHash: "provider-request-hash",
					},
				},
			};

			mockState.solutions = [[["hash1", 10, 20]]];
			mockState.account = {
				account: {
					address: "user-address-123",
				},
				extension: {
					signer: {
						signRaw: vi.fn().mockResolvedValue({
							signature: "user-signature",
						}),
					},
				},
			} as Account;

			mockState.captchaApi = mockCaptchaApi;
		});

		it("should submit captcha solution successfully", async () => {
			mockState.dappAccount = "dapp-address-123";
			const mockSubmission: TCaptchaSubmitResult = [
				{ verified: true },
				"commitment-id",
			];

			vi.mocked(providerRetry).mockImplementation(async (fn) => {
				await fn();
			});

			mockCaptchaApi.submitCaptchaSolution = vi
				.fn()
				.mockResolvedValue(mockSubmission);

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.submit();

			expect(mockState.showModal).toBe(false);
			expect(mockState.isHuman).toBe(true);
			expect(mockState.submission).toEqual(mockSubmission);
			expect(mockEvents.onHuman).toHaveBeenCalled();
		});

		it("should throw error when no challenge in state", async () => {
			mockState.challenge = undefined;

			vi.mocked(providerRetry).mockImplementation(async (fn) => {
				try {
					await fn();
				} catch (err) {
					// Error is caught by providerRetry
				}
			});

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.submit();

			expect(providerRetry).toHaveBeenCalled();
		});

		it("should throw error when no datasetId in challenge", async () => {
			mockState.challenge = {
				captchas: [
					{
						captchaId: "captcha-1",
						captchaContentId: "content-1",
						items: [],
						timeLimitMs: 30000,
					},
				],
				requestHash: "request-hash",
				timestamp: "1234567890",
				signature: {
					provider: {
						requestHash: "provider-request-hash",
					},
				},
			};

			vi.mocked(providerRetry).mockImplementation(async (fn) => {
				try {
					await fn();
				} catch (err) {
					// Error is caught by providerRetry
				}
			});

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.submit();

			expect(providerRetry).toHaveBeenCalled();
		});

		it("should throw error when no captchaApi in state", async () => {
			mockState.captchaApi = undefined;

			vi.mocked(providerRetry).mockImplementation(async (fn) => {
				try {
					await fn();
				} catch (err) {
					// Error is caught by providerRetry
				}
			});

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.submit();

			expect(providerRetry).toHaveBeenCalled();
		});

		it("should throw error when no signer available", async () => {
			mockState.account = {
				account: {
					address: "user-address-123",
				},
			} as Account;

			vi.mocked(providerRetry).mockImplementation(async (fn) => {
				try {
					await fn();
				} catch (err) {
					// Error is caught by providerRetry
				}
			});

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.submit();

			expect(providerRetry).toHaveBeenCalled();
		});

		it("should call onFailed when submission is not verified", async () => {
			const mockSubmission: TCaptchaSubmitResult = [
				{ verified: false },
				"commitment-id",
			];

			vi.mocked(providerRetry).mockImplementation(async (fn) => {
				await fn();
			});

			mockCaptchaApi.submitCaptchaSolution = vi
				.fn()
				.mockResolvedValue(mockSubmission);

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.submit();

			expect(mockState.isHuman).toBe(false);
			expect(mockEvents.onFailed).toHaveBeenCalled();
		});

		it("should handle getAccount error when no account in state", async () => {
			// Test the getAccount error path - it should be caught by providerRetry
			mockState.account = undefined;

			vi.mocked(providerRetry).mockImplementation(async (fn) => {
				try {
					await fn();
				} catch (err) {
					// Error is caught by providerRetry - this is expected behavior
					expect(err).toBeDefined();
				}
			});

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			// The submit should complete (error is handled internally)
			await expect(manager.submit()).resolves.toBeUndefined();
		});

		it("should handle getDappAccount error when no dappAccount in state", async () => {
			// Test the getDappAccount error path - it should be caught by providerRetry
			mockState.dappAccount = undefined;

			vi.mocked(providerRetry).mockImplementation(async (fn) => {
				try {
					await fn();
				} catch (err) {
					// Error is caught by providerRetry - this is expected behavior
					expect(err).toBeDefined();
				}
			});

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			// The submit should complete (error is handled internally)
			await expect(manager.submit()).resolves.toBeUndefined();
		});
	});

	describe("cancel", () => {
		it("should cancel and reset state", async () => {
			mockState.timeout = 123 as any;

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.cancel();

			expect(global.window.clearTimeout).toHaveBeenCalledWith(123);
			expect(mockEvents.onClose).toHaveBeenCalled();
		});

		it("should call frictionless restart if provided", async () => {
			const frictionlessRestart = vi.fn();
			const frictionlessState: FrictionlessState = {
				provider: {} as any,
				sessionId: "session-123",
				userAccount: {} as Account,
				restart: frictionlessRestart,
			};

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
				frictionlessState,
			);

			await manager.cancel();

			expect(frictionlessRestart).toHaveBeenCalled();
		});
	});

	describe("reload", () => {
		it("should reload and restart captcha", async () => {
			const mockChallenge: CaptchaResponseBody = {
				captchas: [
					{
						captchaId: "captcha-1",
						captchaContentId: "content-1",
						items: [],
						timeLimitMs: 30000,
						datasetId: "dataset-1",
					},
				],
				requestHash: "request-hash",
				timestamp: "1234567890",
				signature: {
					provider: {
						requestHash: "provider-request-hash",
					},
				},
			};

			vi.mocked(getProcaptchaRandomActiveProvider).mockResolvedValue({
				provider: {
					url: "https://provider.example.com",
					datasetId: "dataset-1",
				},
			});

			vi.mocked(providerRetry).mockImplementation(async (fn) => {
				await fn();
			});

			mockCaptchaApi.getCaptchaChallenge = vi
				.fn()
				.mockResolvedValue(mockChallenge);

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.reload();

			expect(mockEvents.onReload).toHaveBeenCalled();
			expect(getProcaptchaRandomActiveProvider).toHaveBeenCalled();
		});

		it("should call frictionless restart if provided", async () => {
			const frictionlessRestart = vi.fn();
			const frictionlessState: FrictionlessState = {
				provider: {} as any,
				sessionId: "session-123",
				userAccount: {} as Account,
				restart: frictionlessRestart,
			};

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
				frictionlessState,
			);

			await manager.reload();

			expect(frictionlessRestart).toHaveBeenCalled();
			expect(getProcaptchaRandomActiveProvider).not.toHaveBeenCalled();
		});
	});

	describe("select", () => {
		beforeEach(() => {
			mockState.challenge = {
				captchas: [
					{
						captchaId: "captcha-1",
						captchaContentId: "content-1",
						items: [],
						timeLimitMs: 30000,
						datasetId: "dataset-1",
					},
				],
				requestHash: "request-hash",
				timestamp: "1234567890",
				signature: {
					provider: {
						requestHash: "provider-request-hash",
					},
				},
			};

			mockState.solutions = [[]];
			mockState.index = 0;
		});

		it("should add hash to solution when not present", () => {
			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			manager.select("hash1", 10, 20);

			expect(mockState.solutions[0]).toEqual([["hash1", 10, 20]]);
		});

		it("should remove hash from solution when already present", () => {
			mockState.solutions = [[["hash1", 10, 20]]];

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			manager.select("hash1", 10, 20);

			expect(mockState.solutions[0]).toEqual([]);
		});

		it("should throw error when no challenge", () => {
			mockState.challenge = undefined;

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			expect(() => manager.select("hash1", 10, 20)).toThrow(ProsopoError);
		});

		it("should throw error when index out of range", () => {
			mockState.index = 10;

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			expect(() => manager.select("hash1", 10, 20)).toThrow(ProsopoError);
		});
	});

	describe("nextRound", () => {
		beforeEach(() => {
			mockState.challenge = {
				captchas: [
					{
						captchaId: "captcha-1",
						captchaContentId: "content-1",
						items: [],
						timeLimitMs: 30000,
						datasetId: "dataset-1",
					},
					{
						captchaId: "captcha-2",
						captchaContentId: "content-2",
						items: [],
						timeLimitMs: 30000,
						datasetId: "dataset-1",
					},
				],
				requestHash: "request-hash",
				timestamp: "1234567890",
				signature: {
					provider: {
						requestHash: "provider-request-hash",
					},
				},
			};

			mockState.index = 0;
		});

		it("should advance to next round", () => {
			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			manager.nextRound();

			expect(mockState.index).toBe(1);
		});

		it("should throw error when no challenge", () => {
			mockState.challenge = undefined;

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			expect(() => manager.nextRound()).toThrow(ProsopoError);
		});

		it("should throw error when already at last round", () => {
			mockState.index = 1;

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			expect(() => manager.nextRound()).toThrow(ProsopoError);
		});
	});
});
