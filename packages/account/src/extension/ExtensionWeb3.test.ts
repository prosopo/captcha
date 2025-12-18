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
import type { ProcaptchaClientConfigOutput } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExtensionWeb3 } from "./ExtensionWeb3.js";

// Mock dependencies
vi.mock("@polkadot/extension-dapp", () => ({
	web3Enable: vi.fn(),
}));

vi.mock("@polkadot/util-crypto", () => ({
	cryptoWaitReady: vi.fn(),
}));

describe("ExtensionWeb3", () => {
	let extensionWeb3: ExtensionWeb3;
	let mockConfig: ProcaptchaClientConfigOutput;

	beforeEach(() => {
		extensionWeb3 = new ExtensionWeb3();
		mockConfig = {
			dappName: "test-dapp",
			userAccountAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		} as ProcaptchaClientConfigOutput;

		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("getAccount", () => {
		it("should throw error when no address is provided", async () => {
			const configWithoutAddress = {
				...mockConfig,
				userAccountAddress: undefined,
			};

			await expect(
				extensionWeb3.getAccount(configWithoutAddress),
			).rejects.toThrow(ProsopoError);

			try {
				await extensionWeb3.getAccount(configWithoutAddress);
			} catch (error) {
				expect(error).toBeInstanceOf(ProsopoError);
				if (error instanceof ProsopoError) {
					expect(error.message).toBe("WIDGET.NO_ACCOUNTS_FOUND");
				}
			}
		});

		it("should throw error when address is empty string", async () => {
			const configWithEmptyAddress = {
				...mockConfig,
				userAccountAddress: "",
			};

			await expect(
				extensionWeb3.getAccount(configWithEmptyAddress),
			).rejects.toThrow(ProsopoError);
		});

		it("should call cryptoWaitReady before web3Enable", async () => {
			const { web3Enable } = await import("@polkadot/extension-dapp");
			const { cryptoWaitReady } = await import("@polkadot/util-crypto");

			const callOrder: string[] = [];

			vi.mocked(cryptoWaitReady).mockImplementation(async () => {
				callOrder.push("cryptoWaitReady");
			});

			vi.mocked(web3Enable).mockImplementation(async () => {
				callOrder.push("web3Enable");
				return [];
			});

			try {
				await extensionWeb3.getAccount(mockConfig);
			} catch {
				// Expected to fail with no extensions
			}

			expect(callOrder).toEqual(["cryptoWaitReady", "web3Enable"]);
		});

		it("should throw error when no extensions are found", async () => {
			const { web3Enable } = await import("@polkadot/extension-dapp");
			const { cryptoWaitReady } = await import("@polkadot/util-crypto");

			vi.mocked(cryptoWaitReady).mockResolvedValue(undefined);
			vi.mocked(web3Enable).mockResolvedValue([]);

			await expect(extensionWeb3.getAccount(mockConfig)).rejects.toThrow(
				ProsopoError,
			);

			await expect(extensionWeb3.getAccount(mockConfig)).rejects.toThrow(
				"WIDGET.NO_EXTENSION_FOUND",
			);

			expect(web3Enable).toHaveBeenCalledWith(mockConfig.dappName);
		});

		it("should return account when found in first extension", async () => {
			const { web3Enable } = await import("@polkadot/extension-dapp");
			const { cryptoWaitReady } = await import("@polkadot/util-crypto");

			const mockAccount = {
				address: mockConfig.userAccountAddress,
				name: "Test Account",
			};

			const mockExtension = {
				name: "polkadot-js",
				version: "1.0.0",
				accounts: {
					get: vi.fn().mockResolvedValue([mockAccount]),
				},
			};

			vi.mocked(cryptoWaitReady).mockResolvedValue(undefined);
			// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
			vi.mocked(web3Enable).mockResolvedValue([mockExtension] as any);

			const result = await extensionWeb3.getAccount(mockConfig);

			expect(result).toEqual({
				account: mockAccount,
				extension: mockExtension,
			});

			expect(mockExtension.accounts.get).toHaveBeenCalledOnce();
		});

		it("should search through multiple extensions to find account", async () => {
			const { web3Enable } = await import("@polkadot/extension-dapp");
			const { cryptoWaitReady } = await import("@polkadot/util-crypto");

			const mockAccount = {
				address: mockConfig.userAccountAddress,
				name: "Test Account",
			};

			// First extension doesn't have the account
			const mockExtension1 = {
				name: "extension-1",
				version: "1.0.0",
				accounts: {
					get: vi.fn().mockResolvedValue([
						{
							address: "5DifferentAddress",
							name: "Different Account",
						},
					]),
				},
			};

			// Second extension has the account
			const mockExtension2 = {
				name: "extension-2",
				version: "1.0.0",
				accounts: {
					get: vi.fn().mockResolvedValue([mockAccount]),
				},
			};

			vi.mocked(cryptoWaitReady).mockResolvedValue(undefined);
			vi.mocked(web3Enable).mockResolvedValue([
				mockExtension1,
				mockExtension2,
				// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
			] as any);

			const result = await extensionWeb3.getAccount(mockConfig);

			// Should return account from second extension
			expect(result).toEqual({
				account: mockAccount,
				extension: mockExtension2,
			});

			// Both extensions should have been checked
			expect(mockExtension1.accounts.get).toHaveBeenCalledOnce();
			expect(mockExtension2.accounts.get).toHaveBeenCalledOnce();
		});

		it("should return first matching account when extension has multiple accounts", async () => {
			const { web3Enable } = await import("@polkadot/extension-dapp");
			const { cryptoWaitReady } = await import("@polkadot/util-crypto");

			const mockAccount1 = {
				address: "5DifferentAddress",
				name: "Different Account",
			};

			const mockAccount2 = {
				address: mockConfig.userAccountAddress,
				name: "Test Account",
			};

			const mockAccount3 = {
				address: "5AnotherAddress",
				name: "Another Account",
			};

			const mockExtension = {
				name: "polkadot-js",
				version: "1.0.0",
				accounts: {
					get: vi
						.fn()
						.mockResolvedValue([mockAccount1, mockAccount2, mockAccount3]),
				},
			};

			vi.mocked(cryptoWaitReady).mockResolvedValue(undefined);
			// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
			vi.mocked(web3Enable).mockResolvedValue([mockExtension] as any);

			const result = await extensionWeb3.getAccount(mockConfig);

			// Should return the matching account (mockAccount2)
			expect(result.account).toEqual(mockAccount2);
			expect(result.extension).toEqual(mockExtension);
		});

		it("should throw error when account not found in any extension", async () => {
			const { web3Enable } = await import("@polkadot/extension-dapp");
			const { cryptoWaitReady } = await import("@polkadot/util-crypto");

			const mockExtension1 = {
				name: "extension-1",
				version: "1.0.0",
				accounts: {
					get: vi.fn().mockResolvedValue([
						{
							address: "5DifferentAddress1",
							name: "Different Account 1",
						},
					]),
				},
			};

			const mockExtension2 = {
				name: "extension-2",
				version: "1.0.0",
				accounts: {
					get: vi.fn().mockResolvedValue([
						{
							address: "5DifferentAddress2",
							name: "Different Account 2",
						},
					]),
				},
			};

			vi.mocked(cryptoWaitReady).mockResolvedValue(undefined);
			vi.mocked(web3Enable).mockResolvedValue([
				mockExtension1,
				mockExtension2,
				// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
			] as any);

			try {
				await extensionWeb3.getAccount(mockConfig);
			} catch (error) {
				expect(error).toBeInstanceOf(ProsopoError);
				if (error instanceof ProsopoError) {
					expect(error.message).toBe("WIDGET.ACCOUNT_NOT_FOUND");
				}
			}

			// Both extensions should have been checked
			expect(mockExtension1.accounts.get).toHaveBeenCalledOnce();
			expect(mockExtension2.accounts.get).toHaveBeenCalledOnce();
		});

		it("should handle extension with empty accounts list", async () => {
			const { web3Enable } = await import("@polkadot/extension-dapp");
			const { cryptoWaitReady } = await import("@polkadot/util-crypto");

			const mockExtension = {
				name: "empty-extension",
				version: "1.0.0",
				accounts: {
					get: vi.fn().mockResolvedValue([]),
				},
			};

			vi.mocked(cryptoWaitReady).mockResolvedValue(undefined);
			// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
			vi.mocked(web3Enable).mockResolvedValue([mockExtension] as any);

			await expect(extensionWeb3.getAccount(mockConfig)).rejects.toThrow(
				ProsopoError,
			);

			expect(mockExtension.accounts.get).toHaveBeenCalledOnce();
		});

		it("should pass dappName to web3Enable", async () => {
			const { web3Enable } = await import("@polkadot/extension-dapp");
			const { cryptoWaitReady } = await import("@polkadot/util-crypto");

			const customDappName = "my-custom-dapp";
			const customConfig = {
				...mockConfig,
				dappName: customDappName,
			};

			const mockExtension = {
				name: "polkadot-js",
				version: "1.0.0",
				accounts: {
					get: vi.fn().mockResolvedValue([
						{
							address: mockConfig.userAccountAddress,
							name: "Test Account",
						},
					]),
				},
			};

			vi.mocked(cryptoWaitReady).mockResolvedValue(undefined);
			// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
			vi.mocked(web3Enable).mockResolvedValue([mockExtension] as any);

			await extensionWeb3.getAccount(customConfig);

			expect(web3Enable).toHaveBeenCalledWith(customDappName);
		});

		it("should handle extensions with undefined accounts gracefully", async () => {
			const { web3Enable } = await import("@polkadot/extension-dapp");
			const { cryptoWaitReady } = await import("@polkadot/util-crypto");

			const mockAccount = {
				address: mockConfig.userAccountAddress,
				name: "Test Account",
			};

			// First extension returns undefined accounts (misbehaving extension)
			const mockExtension1 = {
				name: "broken-extension",
				version: "1.0.0",
				accounts: {
					get: vi.fn().mockResolvedValue(undefined),
				},
			};

			// Second extension has valid accounts
			const mockExtension2 = {
				name: "working-extension",
				version: "1.0.0",
				accounts: {
					get: vi.fn().mockResolvedValue([mockAccount]),
				},
			};

			vi.mocked(cryptoWaitReady).mockResolvedValue(undefined);
			vi.mocked(web3Enable).mockResolvedValue([
				mockExtension1,
				mockExtension2,
				// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
			] as any);

			const result = await extensionWeb3.getAccount(mockConfig);

			// Should skip broken extension and find account in second extension
			expect(result.account).toEqual(mockAccount);
			expect(result.extension).toEqual(mockExtension2);

			// Both extensions should have been checked
			expect(mockExtension1.accounts.get).toHaveBeenCalledOnce();
			expect(mockExtension2.accounts.get).toHaveBeenCalledOnce();
		});

		it("should handle extensions with null accounts gracefully", async () => {
			const { web3Enable } = await import("@polkadot/extension-dapp");
			const { cryptoWaitReady } = await import("@polkadot/util-crypto");

			const mockAccount = {
				address: mockConfig.userAccountAddress,
				name: "Test Account",
			};

			// First extension returns null accounts
			const mockExtension1 = {
				name: "broken-extension",
				version: "1.0.0",
				accounts: {
					get: vi.fn().mockResolvedValue(null),
				},
			};

			// Second extension has valid accounts
			const mockExtension2 = {
				name: "working-extension",
				version: "1.0.0",
				accounts: {
					get: vi.fn().mockResolvedValue([mockAccount]),
				},
			};

			vi.mocked(cryptoWaitReady).mockResolvedValue(undefined);
			vi.mocked(web3Enable).mockResolvedValue([
				mockExtension1,
				mockExtension2,
				// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
			] as any);

			const result = await extensionWeb3.getAccount(mockConfig);

			// Should skip broken extension and find account in second extension
			expect(result.account).toEqual(mockAccount);
			expect(result.extension).toEqual(mockExtension2);
		});
	});

	describe("extends Extension", () => {
		it("should be instance of Extension", async () => {
			const { Extension } = await import("./Extension.js");
			expect(extensionWeb3).toBeInstanceOf(Extension);
		});

		it("should implement getAccount method", () => {
			expect(extensionWeb3.getAccount).toBeDefined();
			expect(typeof extensionWeb3.getAccount).toBe("function");
		});
	});
});
