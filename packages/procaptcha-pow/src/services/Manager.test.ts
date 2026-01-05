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

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type {
	Account,
	FrictionlessState,
	ProcaptchaCallbacks,
	ProcaptchaClientConfigInput,
	ProcaptchaState,
	ProcaptchaStateUpdateFn,
} from "@prosopo/types";
import { ApiParams } from "@prosopo/types";
import { ProsopoEnvError } from "@prosopo/common";
import { Manager } from "./Manager.js";

vi.mock("@prosopo/procaptcha-common", async () => {
	const actual = await vi.importActual("@prosopo/procaptcha-common");
	return {
		...actual,
		ExtensionLoader: vi.fn(() => {
			class MockExtension {
				async getAccount() {
					return { account: { address: "user123" } };
				}
			}
			return MockExtension;
		}),
		buildUpdateState: vi.fn((state, onStateUpdate) => {
			return (partialState: Partial<ProcaptchaState>) => {
				Object.assign(state, partialState);
				onStateUpdate(partialState);
			};
		}),
		getProcaptchaRandomActiveProvider: vi.fn(),
		providerRetry: vi.fn((fn) => fn()),
		getDefaultEvents: vi.fn((callbacks) => ({
			onHuman: callbacks.onHuman || vi.fn(),
			onError: callbacks.onError || vi.fn(),
			onExpired: callbacks.onExpired || vi.fn(),
			onFailed: callbacks.onFailed || vi.fn(),
			onReset: callbacks.onReset || vi.fn(),
			onExtensionNotFound: callbacks.onExtensionNotFound || vi.fn(),
			onChallengeExpired: callbacks.onChallengeExpired || vi.fn(),
			onClose: callbacks.onClose || vi.fn(),
			onOpen: callbacks.onOpen || vi.fn(),
			onReload: callbacks.onReload || vi.fn(),
		})),
	};
});

vi.mock("@prosopo/api", () => ({
	ProviderApi: vi.fn(),
}));

vi.mock("@prosopo/util", async () => {
	const actual = await vi.importActual("@prosopo/util");
	return {
		...actual,
		embedData: vi.fn((salt, coords) => `${salt}_${coords.join(",")}`),
		sleep: vi.fn(() => Promise.resolve()),
		solvePoW: vi.fn(() => "solution123"),
	};
});

vi.mock("@prosopo/util-crypto", () => ({
	randomAsHex: vi.fn(() => "randomSalt123"),
}));

vi.mock("@polkadot/util/string", () => ({
	stringToHex: vi.fn((str) => `0x${str}`),
}));

describe("Manager", () => {
	let mockState: ProcaptchaState;
	let mockOnStateUpdate: ReturnType<typeof vi.fn<[Partial<ProcaptchaState>]>>;
	let mockCallbacks: ProcaptchaCallbacks;
	let mockConfig: ProcaptchaClientConfigInput;
	let mockProviderApi: {
		getPowCaptchaChallenge: ReturnType<typeof vi.fn>;
		submitPowCaptchaSolution: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		vi.clearAllMocks();

		mockState = {
			isHuman: false,
			index: 0,
			solutions: [],
			captchaApi: undefined,
			challenge: undefined,
			showModal: false,
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
			onReset: vi.fn(),
		};

		mockConfig = {
			account: {
				address: "dappAccount123",
			},
			defaultEnvironment: "development",
			web2: false,
			userAccountAddress: "userAccount123",
			captchas: {
				pow: {
					solutionTimeout: 30000,
					verifiedTimeout: 5000,
				},
			},
		} as ProcaptchaClientConfigInput;

		mockProviderApi = {
			getPowCaptchaChallenge: vi.fn(),
			submitPowCaptchaSolution: vi.fn(),
		};

		const { ProviderApi } = await import("@prosopo/api");
		vi.mocked(ProviderApi).mockImplementation(() => mockProviderApi as any);

		const { getProcaptchaRandomActiveProvider } = await import(
			"@prosopo/procaptcha-common"
		);
		vi.mocked(getProcaptchaRandomActiveProvider).mockResolvedValue({
			provider: {
				url: "https://test-provider.com",
				datasetId: "datasetId123",
			},
			providerAccount: "providerAccount123",
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("resetState", () => {
		it("should reset state to default values", () => {
			mockState.isHuman = true;
			mockState.loading = true;
			mockState.showModal = true;

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			manager.resetState();

			expect(mockState.isHuman).toBe(false);
			expect(mockState.loading).toBe(false);
			expect(mockState.showModal).toBe(false);
			expect(mockState.index).toBe(0);
			expect(mockState.challenge).toBeUndefined();
			expect(mockState.solutions).toBeUndefined();
			expect(mockState.captchaApi).toBeUndefined();
			expect(mockState.account).toBeUndefined();
		});

		it("should call onReset callback", () => {
			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			manager.resetState();

			expect(mockCallbacks.onReset).toHaveBeenCalled();
		});

	it("should call frictionless restart if provided when onFailed is called", () => {
		const mockRestart = vi.fn();
		const frictionlessState: FrictionlessState = {
			provider: {
				provider: {
					url: "https://test-provider.com",
					datasetId: "datasetId123",
				},
				providerAccount: "providerAccount123",
			},
			userAccount: {
				account: { address: "user123" },
			},
			restart: mockRestart,
		};

		const manager = Manager(
			mockConfig,
			mockState,
			mockOnStateUpdate,
			mockCallbacks,
			frictionlessState,
		);

		manager.resetState();

		expect(mockCallbacks.onReset).toHaveBeenCalled();
		expect(mockRestart).not.toHaveBeenCalled();
	});

		it("should clear timeout if set", () => {
			const mockTimeout = setTimeout(() => {}, 1000);
			mockState.timeout = mockTimeout;
			window.clearTimeout = vi.fn();

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			manager.resetState();

			expect(window.clearTimeout).toHaveBeenCalledWith(Number(mockTimeout));
		});

		it("should clear successful challenge timeout if set", () => {
			const mockTimeout = setTimeout(() => {}, 1000);
			mockState.successfullChallengeTimeout = mockTimeout;
			window.clearTimeout = vi.fn();

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			manager.resetState();

			expect(window.clearTimeout).toHaveBeenCalledWith(Number(mockTimeout));
		});
	});

	describe("start", () => {
		it("should return early if already loading", async () => {
			mockState.loading = true;

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.start();

			expect(mockProviderApi.getPowCaptchaChallenge).not.toHaveBeenCalled();
		});

		it("should return early if already human", async () => {
			mockState.isHuman = true;

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.start();

			expect(mockProviderApi.getPowCaptchaChallenge).not.toHaveBeenCalled();
		});

		it("should throw error if account not found in web3 mode", async () => {
			mockConfig.web2 = false;
			mockConfig.userAccountAddress = undefined;

			const { ExtensionLoader } = await import("@prosopo/procaptcha-common");
			vi.mocked(ExtensionLoader).mockReturnValue(
				class MockExtension {
					async getAccount() {
						return { account: { address: "user123" } };
					}
				} as any,
			);

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await expect(manager.start()).rejects.toThrow();
		});

		it("should use frictionless provider if provided", async () => {
			const frictionlessState: FrictionlessState = {
				provider: {
					provider: {
						url: "https://frictionless-provider.com",
						datasetId: "datasetId456",
					},
					providerAccount: "providerAccount456",
				},
				userAccount: {
					account: { address: "frictionlessUser123" },
					extension: {
						name: "test-extension",
						version: "1.0.0",
						signer: {
							signRaw: vi.fn().mockResolvedValue({
								signature: { toString: () => "signature123" },
							}),
						},
					},
				},
				restart: vi.fn(),
				sessionId: "session123",
			};

			mockProviderApi.getPowCaptchaChallenge.mockResolvedValue({
				challenge: "challenge123",
				difficulty: 5,
				timestamp: 1234567890,
				signature: {
					provider: "providerSig",
				},
			});

			mockProviderApi.submitPowCaptchaSolution.mockResolvedValue({
				[ApiParams.verified]: true,
			});

			mockConfig.account = {
				address: "dappAccount123",
			};

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
				frictionlessState,
			);

			await manager.start();

			expect(mockProviderApi.getPowCaptchaChallenge).toHaveBeenCalledWith(
				"frictionlessUser123",
				expect.any(String),
				"session123",
			);
			expect(mockState.isHuman).toBe(true);
		});

		it("should handle challenge error", async () => {
			const { ExtensionLoader } = await import("@prosopo/procaptcha-common");
			vi.mocked(ExtensionLoader).mockReturnValue(
				class MockExtension {
					async getAccount() {
						return {
							account: { address: "user123" },
							extension: {
								name: "test-extension",
								version: "1.0.0",
								signer: {
									signRaw: vi.fn(),
								},
							},
						};
					}
				} as any,
			);

			mockProviderApi.getPowCaptchaChallenge.mockResolvedValue({
				error: {
					message: "Challenge error",
					key: "CHALLENGE.ERROR",
				},
			});

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.start();

			expect(mockState.loading).toBe(false);
			expect(mockState.error).toEqual({
				message: "Challenge error",
				key: "CHALLENGE.ERROR",
			});
		});

		it("should handle challenge error without key", async () => {
			const { ExtensionLoader } = await import("@prosopo/procaptcha-common");
			vi.mocked(ExtensionLoader).mockReturnValue(
				class MockExtension {
					async getAccount() {
						return {
							account: { address: "user123" },
							extension: {
								name: "test-extension",
								version: "1.0.0",
								signer: {
									signRaw: vi.fn(),
								},
							},
						};
					}
				} as any,
			);

			mockProviderApi.getPowCaptchaChallenge.mockResolvedValue({
				error: {
					message: "Challenge error",
				},
			});

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.start();

			expect(mockState.error?.key).toBe("API.UNKNOWN_ERROR");
		});

		it("should throw error if signer not found", async () => {
			const { ExtensionLoader } = await import("@prosopo/procaptcha-common");
			vi.mocked(ExtensionLoader).mockReturnValue(
				class MockExtension {
					async getAccount() {
						return {
							account: { address: "user123" },
							extension: {
								name: "test-extension",
								version: "1.0.0",
							},
						};
					}
				} as any,
			);

			mockProviderApi.getPowCaptchaChallenge.mockResolvedValue({
				challenge: "challenge123",
				difficulty: 5,
				timestamp: 1234567890,
				signature: {
					provider: "providerSig",
				},
			});

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await expect(manager.start()).rejects.toThrow();
		});

		it("should throw error if signRaw not available", async () => {
			const { ExtensionLoader } = await import("@prosopo/procaptcha-common");
			vi.mocked(ExtensionLoader).mockReturnValue(
				class MockExtension {
					async getAccount() {
						return {
							account: { address: "user123" },
							extension: {
								name: "test-extension",
								version: "1.0.0",
								signer: {},
							},
						};
					}
				} as any,
			);

			mockProviderApi.getPowCaptchaChallenge.mockResolvedValue({
				challenge: "challenge123",
				difficulty: 5,
				timestamp: 1234567890,
				signature: {
					provider: "providerSig",
				},
			});

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await expect(manager.start()).rejects.toThrow();
		});

		it("should successfully complete captcha flow", async () => {
			const { ExtensionLoader } = await import("@prosopo/procaptcha-common");
			const mockSigner = {
				signRaw: vi.fn().mockResolvedValue({
					signature: { toString: () => "signature123" },
				}),
			};
			vi.mocked(ExtensionLoader).mockReturnValue(
				class MockExtension {
					async getAccount() {
						return {
							account: { address: "user123" },
							extension: {
								name: "test-extension",
								version: "1.0.0",
								signer: mockSigner,
							},
						};
					}
				} as any,
			);

			mockProviderApi.getPowCaptchaChallenge.mockResolvedValue({
				challenge: "challenge123",
				difficulty: 5,
				timestamp: 1234567890,
				signature: {
					provider: "providerSig",
				},
			});

			mockProviderApi.submitPowCaptchaSolution.mockResolvedValue({
				[ApiParams.verified]: true,
			});

			mockConfig.account = {
				address: "dappAccount123",
			};

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.start();

			expect(mockState.isHuman).toBe(true);
			expect(mockState.loading).toBe(false);
			expect(mockCallbacks.onHuman).toHaveBeenCalled();
			expect(mockSigner.signRaw).toHaveBeenCalled();
		});

		it("should call onFailed when verification fails", async () => {
			const { ExtensionLoader } = await import("@prosopo/procaptcha-common");
			const mockSigner = {
				signRaw: vi.fn().mockResolvedValue({
					signature: { toString: () => "signature123" },
				}),
			};
			vi.mocked(ExtensionLoader).mockReturnValue(
				class MockExtension {
					async getAccount() {
						return {
							account: { address: "user123" },
							extension: {
								name: "test-extension",
								version: "1.0.0",
								signer: mockSigner,
							},
						};
					}
				} as any,
			);

			mockProviderApi.getPowCaptchaChallenge.mockResolvedValue({
				challenge: "challenge123",
				difficulty: 5,
				timestamp: 1234567890,
				signature: {
					provider: "providerSig",
				},
			});

			mockProviderApi.submitPowCaptchaSolution.mockResolvedValue({
				[ApiParams.verified]: false,
			});

			mockConfig.account = {
				address: "dappAccount123",
			};

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.start();

			expect(mockState.isHuman).toBe(false);
			expect(mockCallbacks.onFailed).toHaveBeenCalled();
		});

		it("should create salt with coordinates when provided", async () => {
			const { ExtensionLoader } = await import("@prosopo/procaptcha-common");
			const mockSigner = {
				signRaw: vi.fn().mockResolvedValue({
					signature: { toString: () => "signature123" },
				}),
			};
			vi.mocked(ExtensionLoader).mockReturnValue(
				class MockExtension {
					async getAccount() {
						return {
							account: { address: "user123" },
							extension: {
								name: "test-extension",
								version: "1.0.0",
								signer: mockSigner,
							},
						};
					}
				} as any,
			);

			mockProviderApi.getPowCaptchaChallenge.mockResolvedValue({
				challenge: "challenge123",
				difficulty: 5,
				timestamp: 1234567890,
				signature: {
					provider: "providerSig",
				},
			});

			mockProviderApi.submitPowCaptchaSolution.mockResolvedValue({
				[ApiParams.verified]: true,
			});

			mockConfig.account = {
				address: "dappAccount123",
			};

			const { embedData } = await import("@prosopo/util");
			const { randomAsHex } = await import("@prosopo/util-crypto");

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.start(100, 200);

			expect(randomAsHex).toHaveBeenCalled();
			expect(embedData).toHaveBeenCalledWith(
				expect.any(String),
				[100, 200],
			);
			expect(mockProviderApi.submitPowCaptchaSolution).toHaveBeenCalledWith(
				expect.any(Object),
				expect.any(String),
				expect.any(String),
				expect.any(String),
				expect.any(String),
				expect.any(Number),
				expect.stringContaining("100,200"),
			);
		});

		it("should not create salt when coordinates not provided", async () => {
			const { ExtensionLoader } = await import("@prosopo/procaptcha-common");
			const mockSigner = {
				signRaw: vi.fn().mockResolvedValue({
					signature: { toString: () => "signature123" },
				}),
			};
			vi.mocked(ExtensionLoader).mockReturnValue(
				class MockExtension {
					async getAccount() {
						return {
							account: { address: "user123" },
							extension: {
								name: "test-extension",
								version: "1.0.0",
								signer: mockSigner,
							},
						};
					}
				} as any,
			);

			mockProviderApi.getPowCaptchaChallenge.mockResolvedValue({
				challenge: "challenge123",
				difficulty: 5,
				timestamp: 1234567890,
				signature: {
					provider: "providerSig",
				},
			});

			mockProviderApi.submitPowCaptchaSolution.mockResolvedValue({
				[ApiParams.verified]: true,
			});

			mockConfig.account = {
				address: "dappAccount123",
			};

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.start();

			expect(mockProviderApi.submitPowCaptchaSolution).toHaveBeenCalledWith(
				expect.any(Object),
				expect.any(String),
				expect.any(String),
				expect.any(String),
				expect.any(String),
				expect.any(Number),
				expect.stringContaining("0,0"),
			);
		});

		it("should increment attemptCount on start", async () => {
			mockState.attemptCount = 5;

			const { ExtensionLoader } = await import("@prosopo/procaptcha-common");
			const mockSigner = {
				signRaw: vi.fn().mockResolvedValue({
					signature: { toString: () => "signature123" },
				}),
			};
			vi.mocked(ExtensionLoader).mockReturnValue(
				class MockExtension {
					async getAccount() {
						return {
							account: { address: "user123" },
							extension: {
								name: "test-extension",
								version: "1.0.0",
								signer: mockSigner,
							},
						};
					}
				} as any,
			);

			mockProviderApi.getPowCaptchaChallenge.mockResolvedValue({
				challenge: "challenge123",
				difficulty: 5,
				timestamp: 1234567890,
				signature: {
					provider: "providerSig",
				},
			});

			mockProviderApi.submitPowCaptchaSolution.mockResolvedValue({
				[ApiParams.verified]: true,
			});

			mockConfig.account = {
				address: "dappAccount123",
			};

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.start();

			expect(mockState.attemptCount).toBe(6);
		});

		it("should set valid challenge timeout on successful verification", async () => {
			const { ExtensionLoader } = await import("@prosopo/procaptcha-common");
			const mockSigner = {
				signRaw: vi.fn().mockResolvedValue({
					signature: { toString: () => "signature123" },
				}),
			};
			vi.mocked(ExtensionLoader).mockReturnValue(
				class MockExtension {
					async getAccount() {
						return {
							account: { address: "user123" },
							extension: {
								name: "test-extension",
								version: "1.0.0",
								signer: mockSigner,
							},
						};
					}
				} as any,
			);

			mockProviderApi.getPowCaptchaChallenge.mockResolvedValue({
				challenge: "challenge123",
				difficulty: 5,
				timestamp: 1234567890,
				signature: {
					provider: "providerSig",
				},
			});

			mockProviderApi.submitPowCaptchaSolution.mockResolvedValue({
				[ApiParams.verified]: true,
			});

			mockConfig.account = {
				address: "dappAccount123",
			};
			mockConfig.captchas = {
				pow: {
					solutionTimeout: 60000,
					verifiedTimeout: 5000,
				},
			} as any;

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.start();

			expect(mockState.successfullChallengeTimeout).toBeDefined();
		});

		it("should use account from state if available", async () => {
			mockState.account = {
				account: { address: "stateAccount123" },
			};

			const { ExtensionLoader } = await import("@prosopo/procaptcha-common");
			const mockSigner = {
				signRaw: vi.fn().mockResolvedValue({
					signature: { toString: () => "signature123" },
				}),
			};
			vi.mocked(ExtensionLoader).mockReturnValue(
				class MockExtension {
					async getAccount() {
						return {
							account: { address: "user123" },
							extension: {
								name: "test-extension",
								version: "1.0.0",
								signer: mockSigner,
							},
						};
					}
				} as any,
			);

			mockProviderApi.getPowCaptchaChallenge.mockResolvedValue({
				challenge: "challenge123",
				difficulty: 5,
				timestamp: 1234567890,
				signature: {
					provider: "providerSig",
				},
			});

			mockProviderApi.submitPowCaptchaSolution.mockResolvedValue({
				[ApiParams.verified]: true,
			});

			mockConfig.account = {
				address: "dappAccount123",
			};

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await manager.start();

			expect(mockProviderApi.getPowCaptchaChallenge).toHaveBeenCalledWith(
				"user123",
				expect.any(String),
				undefined,
			);
		});

		it("should throw error if dappAccount not found", async () => {
			mockState.dappAccount = undefined;

			const { ExtensionLoader } = await import("@prosopo/procaptcha-common");
			const mockSigner = {
				signRaw: vi.fn().mockResolvedValue({
					signature: { toString: () => "signature123" },
				}),
			};
			vi.mocked(ExtensionLoader).mockReturnValue(
				class MockExtension {
					async getAccount() {
						return {
							account: { address: "user123" },
							extension: {
								name: "test-extension",
								version: "1.0.0",
								signer: mockSigner,
							},
						};
					}
				} as any,
			);

			mockProviderApi.getPowCaptchaChallenge.mockResolvedValue({
				challenge: "challenge123",
				difficulty: 5,
				timestamp: 1234567890,
				signature: {
					provider: "providerSig",
				},
			});

			mockConfig.account = undefined;

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await expect(manager.start()).rejects.toThrow();
		});

		it("should throw error if account not found in state when calling getAccount", async () => {
			mockState.account = undefined;
			mockState.dappAccount = "dappAccount123";

			const { ExtensionLoader } = await import("@prosopo/procaptcha-common");
			const mockSigner = {
				signRaw: vi.fn().mockResolvedValue({
					signature: { toString: () => "signature123" },
				}),
			};
			vi.mocked(ExtensionLoader).mockReturnValue(
				class MockExtension {
					async getAccount() {
						return {
							account: { address: "user123" },
							extension: {
								name: "test-extension",
								version: "1.0.0",
								signer: mockSigner,
							},
						};
					}
				} as any,
			);

			mockProviderApi.getPowCaptchaChallenge.mockResolvedValue({
				challenge: "challenge123",
				difficulty: 5,
				timestamp: 1234567890,
				signature: {
					provider: "providerSig",
				},
			});

			mockConfig.account = {
				address: "dappAccount123",
			};

			const manager = Manager(
				mockConfig,
				mockState,
				mockOnStateUpdate,
				mockCallbacks,
			);

			await expect(manager.start()).rejects.toThrow();
		});
	});
});

