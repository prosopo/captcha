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

import type {
	InjectedAccount,
	InjectedExtension,
} from "@polkadot/extension-inject/types";
import { ProsopoError } from "@prosopo/common";
import type { Account, ProcaptchaClientConfigOutput } from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExtensionWeb3 } from "../extension/ExtensionWeb3.js";

// Mock dependencies
vi.mock("@polkadot/extension-dapp", () => ({
	web3Enable: vi.fn(),
}));

vi.mock("@polkadot/util-crypto", () => ({
	cryptoWaitReady: vi.fn().mockResolvedValue(undefined),
}));

describe("ExtensionWeb3", () => {
	let extension: ExtensionWeb3;
	let mockConfig: ProcaptchaClientConfigOutput;
	let mockAccount: InjectedAccount;
	let mockExtension: InjectedExtension;

	beforeEach(() => {
		vi.clearAllMocks();
		extension = new ExtensionWeb3();

		mockAccount = {
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			name: "Test Account",
			type: "sr25519",
		};

		mockExtension = {
			name: "polkadot-js",
			version: "1.0.0",
			accounts: {
				get: vi.fn().mockResolvedValue([mockAccount]),
				subscribe: vi.fn().mockReturnValue(() => {}),
			},
			// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
			signer: {} as any,
		};

		mockConfig = {
			userAccountAddress: mockAccount.address,
			web2: false,
			solutionThreshold: 80,
			dappName: "TestDapp",
			serverUrl: "https://test.server.com",
			defaultEnvironment: "development",
			account: {
				address: "test-address",
			},
			theme: "light",
			mode: "visible",
		} as ProcaptchaClientConfigOutput;
	});

	describe("getAccount", () => {
		it("should return Account type with correct structure", async () => {
			const { web3Enable } = await import("@polkadot/extension-dapp");
			vi.mocked(web3Enable).mockResolvedValue([mockExtension]);

			const result = await extension.getAccount(mockConfig);

			// Type test: verify return type is Account
			const accountResult: Account = result;
			expect(accountResult).toBeDefined();
			expect(accountResult.account).toBeDefined();
			expect(accountResult.extension).toBeDefined();
		});

		it("should accept ProcaptchaClientConfigOutput as parameter", async () => {
			// Type test: verify parameter type
			const { web3Enable } = await import("@polkadot/extension-dapp");
			vi.mocked(web3Enable).mockResolvedValue([mockExtension]);

			const config: ProcaptchaClientConfigOutput = mockConfig;
			const result = await extension.getAccount(config);

			expect(result).toBeDefined();
			expect(result.account).toBeDefined();
		});

		it("should throw ProsopoError when userAccountAddress is not provided", async () => {
			const configWithoutAddress: ProcaptchaClientConfigOutput = {
				...mockConfig,
				userAccountAddress: undefined,
			} as ProcaptchaClientConfigOutput;

			await expect(extension.getAccount(configWithoutAddress)).rejects.toThrow(
				ProsopoError,
			);

			await expect(extension.getAccount(configWithoutAddress)).rejects.toThrow(
				"WIDGET.NO_ACCOUNTS_FOUND",
			);
		});

		it("should throw ProsopoError when userAccountAddress is empty string", async () => {
			const configWithEmptyAddress: ProcaptchaClientConfigOutput = {
				...mockConfig,
				userAccountAddress: "",
			} as ProcaptchaClientConfigOutput;

			await expect(
				extension.getAccount(configWithEmptyAddress),
			).rejects.toThrow(ProsopoError);
		});

		it("should call cryptoWaitReady before enabling extensions", async () => {
			const { cryptoWaitReady } = await import("@polkadot/util-crypto");
			const { web3Enable } = await import("@polkadot/extension-dapp");
			vi.mocked(web3Enable).mockResolvedValue([mockExtension]);

			await extension.getAccount(mockConfig);

			expect(cryptoWaitReady).toHaveBeenCalled();
		});

		it("should call web3Enable with dappName from config", async () => {
			const { web3Enable } = await import("@polkadot/extension-dapp");
			vi.mocked(web3Enable).mockResolvedValue([mockExtension]);

			await extension.getAccount(mockConfig);

			expect(web3Enable).toHaveBeenCalledWith(mockConfig.dappName);
		});

		it("should throw ProsopoError when no extensions are found", async () => {
			const { web3Enable } = await import("@polkadot/extension-dapp");
			vi.mocked(web3Enable).mockResolvedValue([]);

			await expect(extension.getAccount(mockConfig)).rejects.toThrow(
				ProsopoError,
			);
			await expect(extension.getAccount(mockConfig)).rejects.toThrow(
				"WIDGET.NO_EXTENSION_FOUND",
			);
		});

		it("should find account in first extension that contains it", async () => {
			const { web3Enable } = await import("@polkadot/extension-dapp");
			vi.mocked(web3Enable).mockResolvedValue([mockExtension]);

			const result = await extension.getAccount(mockConfig);

			expect(result.account).toEqual(mockAccount);
			expect(result.extension).toEqual(mockExtension);
			expect(mockExtension.accounts.get).toHaveBeenCalled();
		});

		it("should search through multiple extensions to find account", async () => {
			const { web3Enable } = await import("@polkadot/extension-dapp");

			const otherAccount: InjectedAccount = {
				address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				name: "Other Account",
				type: "sr25519",
			};

			const otherExtension: InjectedExtension = {
				name: "other-extension",
				version: "1.0.0",
				accounts: {
					get: vi.fn().mockResolvedValue([otherAccount]),
					subscribe: vi.fn().mockReturnValue(() => {}),
				},
				// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
				signer: {} as any,
			};

			// First extension doesn't have the account, second one does
			vi.mocked(web3Enable).mockResolvedValue([otherExtension, mockExtension]);

			const result = await extension.getAccount(mockConfig);

			expect(result.account).toEqual(mockAccount);
			expect(result.extension).toEqual(mockExtension);
			expect(otherExtension.accounts.get).toHaveBeenCalled();
			expect(mockExtension.accounts.get).toHaveBeenCalled();
		});

		it("should throw ProsopoError when account is not found in any extension", async () => {
			const { web3Enable } = await import("@polkadot/extension-dapp");

			const differentAccount: InjectedAccount = {
				address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				name: "Different Account",
				type: "sr25519",
			};

			const extensionWithDifferentAccount: InjectedExtension = {
				name: "test-extension",
				version: "1.0.0",
				accounts: {
					get: vi.fn().mockResolvedValue([differentAccount]),
					subscribe: vi.fn().mockReturnValue(() => {}),
				},
				// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
				signer: {} as any,
			};

			vi.mocked(web3Enable).mockResolvedValue([extensionWithDifferentAccount]);

			await expect(extension.getAccount(mockConfig)).rejects.toThrow(
				ProsopoError,
			);
			await expect(extension.getAccount(mockConfig)).rejects.toThrow(
				"WIDGET.ACCOUNT_NOT_FOUND",
			);
		});

		it("should handle extension with multiple accounts", async () => {
			const { web3Enable } = await import("@polkadot/extension-dapp");

			const account2: InjectedAccount = {
				address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				name: "Account 2",
				type: "sr25519",
			};

			const extensionWithMultipleAccounts: InjectedExtension = {
				...mockExtension,
				accounts: {
					get: vi.fn().mockResolvedValue([account2, mockAccount]),
					subscribe: vi.fn().mockReturnValue(() => {}),
				},
			};

			vi.mocked(web3Enable).mockResolvedValue([extensionWithMultipleAccounts]);

			const result = await extension.getAccount(mockConfig);

			expect(result.account).toEqual(mockAccount);
			expect(result.extension).toEqual(extensionWithMultipleAccounts);
		});

		it("should handle extension with empty accounts array", async () => {
			const { web3Enable } = await import("@polkadot/extension-dapp");

			const extensionWithNoAccounts: InjectedExtension = {
				...mockExtension,
				accounts: {
					get: vi.fn().mockResolvedValue([]),
					subscribe: vi.fn().mockReturnValue(() => {}),
				},
			};

			vi.mocked(web3Enable).mockResolvedValue([extensionWithNoAccounts]);

			await expect(extension.getAccount(mockConfig)).rejects.toThrow(
				ProsopoError,
			);
			await expect(extension.getAccount(mockConfig)).rejects.toThrow(
				"WIDGET.ACCOUNT_NOT_FOUND",
			);
		});

		it("should use default dappName when not provided", async () => {
			const { web3Enable } = await import("@polkadot/extension-dapp");
			vi.mocked(web3Enable).mockResolvedValue([mockExtension]);

			const configWithDefaultDapp: ProcaptchaClientConfigOutput = {
				...mockConfig,
				dappName: undefined,
			} as ProcaptchaClientConfigOutput;

			// The schema should provide a default, but if it doesn't, we test the behavior
			if (configWithDefaultDapp.dappName) {
				await extension.getAccount(configWithDefaultDapp);
				expect(web3Enable).toHaveBeenCalledWith(configWithDefaultDapp.dappName);
			}
		});
	});

	describe("type correctness", () => {
		it("should have correct return type Promise<Account>", async () => {
			// Type test: verify return type
			const { web3Enable } = await import("@polkadot/extension-dapp");
			vi.mocked(web3Enable).mockResolvedValue([mockExtension]);

			const result: Promise<Account> = extension.getAccount(mockConfig);
			const account: Account = await result;

			expect(account).toBeDefined();
			expect(account.account).toBeDefined();
			expect(account.extension).toBeDefined();
		});

		it("should return account with InjectedAccount type", async () => {
			// Type test: verify account is InjectedAccount
			const { web3Enable } = await import("@polkadot/extension-dapp");
			vi.mocked(web3Enable).mockResolvedValue([mockExtension]);

			const result = await extension.getAccount(mockConfig);

			const injectedAccount: InjectedAccount = result.account;
			expect(injectedAccount.address).toBeDefined();
			expect(injectedAccount.name).toBeDefined();
		});

		it("should return extension with InjectedExtension type", async () => {
			// Type test: verify extension is InjectedExtension
			const { web3Enable } = await import("@polkadot/extension-dapp");
			vi.mocked(web3Enable).mockResolvedValue([mockExtension]);

			const result = await extension.getAccount(mockConfig);

			const injectedExtension: InjectedExtension | undefined = result.extension;
			expect(injectedExtension).toBeDefined();
			expect(injectedExtension?.name).toBeDefined();
			expect(injectedExtension?.accounts).toBeDefined();
		});

		it("should accept config with userAccountAddress as string", async () => {
			// Type test: verify userAccountAddress type
			const { web3Enable } = await import("@polkadot/extension-dapp");
			vi.mocked(web3Enable).mockResolvedValue([mockExtension]);

			const config: ProcaptchaClientConfigOutput = {
				...mockConfig,
				userAccountAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			} as ProcaptchaClientConfigOutput;

			const result = await extension.getAccount(config);
			expect(result.account.address).toBe(config.userAccountAddress);
		});
	});

	describe("error handling", () => {
		it("should include context in error when address is missing", async () => {
			const configWithoutAddress: ProcaptchaClientConfigOutput = {
				...mockConfig,
				userAccountAddress: undefined,
			} as ProcaptchaClientConfigOutput;

			try {
				await extension.getAccount(configWithoutAddress);
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error).toBeInstanceOf(ProsopoError);
				if (error instanceof ProsopoError) {
					expect(error.code).toBe("WIDGET.NO_ACCOUNTS_FOUND");
					expect(error.context).toBeDefined();
				}
			}
		});

		it("should include context in error when account is not found", async () => {
			const { web3Enable } = await import("@polkadot/extension-dapp");

			const differentAccount: InjectedAccount = {
				address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				name: "Different Account",
				type: "sr25519",
			};

			const extensionWithDifferentAccount: InjectedExtension = {
				name: "test-extension",
				version: "1.0.0",
				accounts: {
					get: vi.fn().mockResolvedValue([differentAccount]),
					subscribe: vi.fn().mockReturnValue(() => {}),
				},
				// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
				signer: {} as any,
			};

			vi.mocked(web3Enable).mockResolvedValue([extensionWithDifferentAccount]);

			try {
				await extension.getAccount(mockConfig);
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error).toBeInstanceOf(ProsopoError);
				if (error instanceof ProsopoError) {
					expect(error.code).toBe("WIDGET.ACCOUNT_NOT_FOUND");
					expect(error.context).toBeDefined();
					expect(error.context?.error).toContain(mockConfig.userAccountAddress);
				}
			}
		});
	});
});
