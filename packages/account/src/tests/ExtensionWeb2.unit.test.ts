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

import type { InjectedAccount } from "@polkadot/extension-inject/types";
import type { Account, ProcaptchaClientConfigOutput } from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExtensionWeb2 } from "../extension/ExtensionWeb2.js";

// Mock dependencies
vi.mock("@prosopo/fingerprint", () => ({
	getFingerprint: vi.fn(),
}));

vi.mock("@prosopo/keyring", () => ({
	Keyring: vi.fn(),
}));

vi.mock("@prosopo/util-crypto", async () => {
	const actual = await vi.importActual("@prosopo/util-crypto");
	return {
		...actual,
		hexHash: vi.fn((data: string, bits: number) => {
			// Return a hex string that starts with 0x and has enough characters
			const hexLength = bits / 4;
			const hexChars = data
				.repeat(Math.ceil(hexLength / data.length))
				.slice(0, hexLength);
			return `0x${hexChars}`;
		}),
		entropyToMnemonic: vi.fn(),
	};
});

vi.mock("@prosopo/util", () => ({
	u8aToHex: vi.fn((val: Uint8Array) => {
		const hex = Array.from(val)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
		return `0x${hex}` as `0x${string}`;
	}),
	version: "1.0.0",
}));

vi.mock("@polkadot/util", () => ({
	stringToU8a: vi.fn(
		(str: string) => new Uint8Array(str.split("").map((c) => c.charCodeAt(0))),
	),
}));

vi.mock("@polkadot/extension-base/page/Signer", () => ({
	default: vi.fn().mockImplementation(() => ({
		signRaw: vi.fn(),
	})),
}));

describe("ExtensionWeb2", () => {
	let extension: ExtensionWeb2;
	let mockConfig: ProcaptchaClientConfigOutput;
	let mockFingerprint: string;
	let mockMnemonic: string;
	let mockKeypair: {
		address: string;
		sign: (data: { data: Uint8Array }) => Uint8Array;
	};

	beforeEach(async () => {
		vi.clearAllMocks();
		extension = new ExtensionWeb2();

		mockFingerprint = "test-fingerprint-data";
		mockMnemonic =
			"word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12";

		mockKeypair = {
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			sign: vi.fn((data: { data: Uint8Array }) => {
				const sig = new Uint8Array(64);
				sig.fill(1);
				return sig;
			}),
		};

		mockConfig = {
			userAccountAddress: undefined,
			web2: true,
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

		// Setup mocks
		const { getFingerprint } = await import("@prosopo/fingerprint");
		vi.mocked(getFingerprint).mockResolvedValue(mockFingerprint);

		const { entropyToMnemonic } = await import("@prosopo/util-crypto");
		vi.mocked(entropyToMnemonic).mockReturnValue(mockMnemonic);

		const { Keyring } = await import("@prosopo/keyring");
		const mockKeyringInstance = {
			addFromMnemonic: vi.fn().mockReturnValue(mockKeypair),
		};
		// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
		vi.mocked(Keyring).mockImplementation(() => mockKeyringInstance as any);
	});

	describe("getAccount", () => {
		it("should return Account type with correct structure", async () => {
			const result = await extension.getAccount(mockConfig);

			// Type test: verify return type is Account
			const accountResult: Account = result;
			expect(accountResult).toBeDefined();
			expect(accountResult.account).toBeDefined();
			expect(accountResult.extension).toBeDefined();
		});

		it("should accept ProcaptchaClientConfigOutput as parameter", async () => {
			// Type test: verify parameter type
			const config: ProcaptchaClientConfigOutput = mockConfig;
			const result = await extension.getAccount(config);

			expect(result).toBeDefined();
			expect(result.account).toBeDefined();
		});

		it("should create account with address from keypair", async () => {
			const result = await extension.getAccount(mockConfig);

			expect(result.account).toBeDefined();
			expect(result.account.address).toBe(mockKeypair.address);
			expect(result.account.name).toBe(mockKeypair.address);
		});

		it("should create extension with correct name and version", async () => {
			const result = await extension.getAccount(mockConfig);

			expect(result.extension).toBeDefined();
			expect(result.extension?.name).toBe("procaptcha-web2");
			expect(result.extension?.version).toBeDefined();
		});

		it("should create extension with accounts.get that returns single account", async () => {
			const result = await extension.getAccount(mockConfig);

			expect(result.extension?.accounts.get).toBeDefined();
			const accounts = await result.extension?.accounts.get();
			expect(accounts).toBeDefined();
			expect(Array.isArray(accounts)).toBe(true);
			expect(accounts?.length).toBe(1);
			expect(accounts?.[0]).toEqual(result.account);
		});

		it("should create extension with accounts.subscribe that returns unsubscribe function", async () => {
			const result = await extension.getAccount(mockConfig);

			expect(result.extension?.accounts.subscribe).toBeDefined();
			const unsubscribe = result.extension?.accounts.subscribe(() => {});
			expect(typeof unsubscribe).toBe("function");

			// Should not throw when called
			expect(() => unsubscribe()).not.toThrow();
		});

		it("should create signer with signRaw that signs data", async () => {
			const result = await extension.getAccount(mockConfig);

			expect(result.extension?.signer).toBeDefined();
			expect(result.extension?.signer.signRaw).toBeDefined();

			const testData = new Uint8Array([1, 2, 3, 4]);
			const signature = await result.extension?.signer.signRaw({
				data: testData,
				address: mockKeypair.address,
				// biome-ignore lint/suspicious/noExplicitAny: Mock data for testing
			} as any);

			expect(signature).toBeDefined();
			expect(signature?.id).toBe(1);
			expect(signature?.signature).toBeDefined();
			expect(typeof signature?.signature).toBe("string");
			expect(signature?.signature.startsWith("0x")).toBe(true);
			expect(mockKeypair.sign).toHaveBeenCalledWith({ data: testData });
		});

		it("should generate account from browser fingerprint", async () => {
			const { getFingerprint } = await import("@prosopo/fingerprint");
			const { hexHash } = await import("@prosopo/util-crypto");
			const { stringToU8a } = await import("@polkadot/util");
			const { entropyToMnemonic } = await import("@prosopo/util-crypto");

			await extension.getAccount(mockConfig);

			expect(getFingerprint).toHaveBeenCalled();

			// Verify fingerprint is hashed with 128 bits
			expect(hexHash).toHaveBeenCalledWith(mockFingerprint, 128);

			// Verify entropy is converted to mnemonic
			expect(stringToU8a).toHaveBeenCalled();
			expect(entropyToMnemonic).toHaveBeenCalled();
		});

		it("should use sr25519 keypair type", async () => {
			const { Keyring } = await import("@prosopo/keyring");

			await extension.getAccount(mockConfig);

			expect(Keyring).toHaveBeenCalledWith({
				type: "sr25519",
			});
		});

		it("should create consistent account for same fingerprint", async () => {
			const result1 = await extension.getAccount(mockConfig);
			const result2 = await extension.getAccount(mockConfig);

			// Same fingerprint should generate same address
			expect(result1.account.address).toBe(result2.account.address);
		});

		it("should handle different config values", async () => {
			const differentConfig: ProcaptchaClientConfigOutput = {
				...mockConfig,
				dappName: "DifferentDapp",
				theme: "dark",
				mode: "invisible",
			};

			const result = await extension.getAccount(differentConfig);

			expect(result).toBeDefined();
			expect(result.account).toBeDefined();
			expect(result.extension).toBeDefined();
		});
	});

	describe("type correctness", () => {
		it("should have correct return type Promise<Account>", async () => {
			// Type test: verify return type
			const result: Promise<Account> = extension.getAccount(mockConfig);
			const account: Account = await result;

			expect(account).toBeDefined();
			expect(account.account).toBeDefined();
			expect(account.extension).toBeDefined();
		});

		it("should accept config with all optional fields", async () => {
			// Type test: verify config with minimal fields
			const minimalConfig: ProcaptchaClientConfigOutput = {
				defaultEnvironment: "development",
				account: {
					address: "test",
				},
			} as ProcaptchaClientConfigOutput;

			const result = await extension.getAccount(minimalConfig);
			expect(result).toBeDefined();
		});

		it("should return account with InjectedAccount type", async () => {
			const result = await extension.getAccount(mockConfig);

			// Type test: verify account is InjectedAccount
			const injectedAccount: InjectedAccount = result.account;
			expect(injectedAccount.address).toBeDefined();
			expect(injectedAccount.name).toBeDefined();
		});
	});
});
