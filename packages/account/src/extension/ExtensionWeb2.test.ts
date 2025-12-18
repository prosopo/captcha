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

import { stringToU8a } from "@polkadot/util";
import type { ProcaptchaClientConfigOutput } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExtensionWeb2 } from "./ExtensionWeb2.js";

// Mock dependencies
vi.mock("@prosopo/fingerprint", () => ({
	getFingerprint: vi.fn(),
}));

vi.mock("@prosopo/keyring", () => ({
	Keyring: vi.fn(),
}));

vi.mock("@prosopo/util-crypto", () => ({
	hexHash: vi.fn(),
	entropyToMnemonic: vi.fn(),
}));

vi.mock("@prosopo/util", () => ({
	u8aToHex: vi.fn(),
	version: "1.0.0",
}));

vi.mock("@polkadot/util", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@polkadot/util")>();
	return {
		...actual,
		stringToU8a: actual.stringToU8a,
	};
});

vi.mock("@polkadot/extension-base/page/Signer", () => ({
	default: vi.fn().mockImplementation((callback) => ({
		signRaw: undefined,
	})),
}));

describe("ExtensionWeb2", () => {
	let extensionWeb2: ExtensionWeb2;
	let mockConfig: ProcaptchaClientConfigOutput;

	beforeEach(() => {
		extensionWeb2 = new ExtensionWeb2();
		mockConfig = {
			dappName: "test-dapp",
			userAccountAddress: "test-address",
		} as ProcaptchaClientConfigOutput;

		// Reset all mocks before each test
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("getAccount", () => {
		it("should return an account with extension", async () => {
			const { getFingerprint } = await import("@prosopo/fingerprint");
			const { Keyring } = await import("@prosopo/keyring");
			const { hexHash, entropyToMnemonic } = await import(
				"@prosopo/util-crypto"
			);
			const { u8aToHex } = await import("@prosopo/util");

			const mockFingerprint = "mock-fingerprint";
			const mockHash = "0xmockhash123";
			const mockMnemonic = "mock mnemonic phrase";
			const mockAddress = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

			const mockKeypair = {
				address: mockAddress,
				sign: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
			};

			const mockKeyring = {
				addFromMnemonic: vi.fn().mockReturnValue(mockKeypair),
			};

			vi.mocked(getFingerprint).mockResolvedValue(mockFingerprint);
			vi.mocked(hexHash).mockReturnValue(mockHash);
			vi.mocked(entropyToMnemonic).mockReturnValue(mockMnemonic);
			// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
			vi.mocked(Keyring).mockReturnValue(mockKeyring as any);
			vi.mocked(u8aToHex).mockReturnValue("0x010203");

			const result = await extensionWeb2.getAccount(mockConfig);

			// Verify account structure
			expect(result).toHaveProperty("account");
			expect(result).toHaveProperty("extension");
			expect(result.account).toHaveProperty("address", mockAddress);
			expect(result.account).toHaveProperty("name", mockAddress);

			// Verify extension structure
			expect(result.extension).toHaveProperty("name", "procaptcha-web2");
			expect(result.extension).toHaveProperty("version", "1.0.0");
			expect(result.extension).toHaveProperty("accounts");
			expect(result.extension).toHaveProperty("signer");

			// Verify dependencies were called correctly
			expect(getFingerprint).toHaveBeenCalledOnce();
			expect(hexHash).toHaveBeenCalledWith(mockFingerprint, 128);
			expect(entropyToMnemonic).toHaveBeenCalled();
			expect(Keyring).toHaveBeenCalledWith({ type: "sr25519" });
			expect(mockKeyring.addFromMnemonic).toHaveBeenCalledWith(mockMnemonic);
		});

		it("should create extension with functional accounts.get", async () => {
			const { getFingerprint } = await import("@prosopo/fingerprint");
			const { Keyring } = await import("@prosopo/keyring");
			const { hexHash, entropyToMnemonic } = await import(
				"@prosopo/util-crypto"
			);

			const mockAddress = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
			const mockKeypair = {
				address: mockAddress,
				sign: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
			};

			const mockKeyring = {
				addFromMnemonic: vi.fn().mockReturnValue(mockKeypair),
			};

			vi.mocked(getFingerprint).mockResolvedValue("fingerprint");
			vi.mocked(hexHash).mockReturnValue("0xhash");
			vi.mocked(entropyToMnemonic).mockReturnValue("mnemonic");
			// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
			vi.mocked(Keyring).mockReturnValue(mockKeyring as any);

			const result = await extensionWeb2.getAccount(mockConfig);
			const accounts = await result.extension.accounts.get();

			// Verify accounts.get returns the single account
			expect(accounts).toHaveLength(1);
			expect(accounts[0].address).toBe(mockAddress);
			expect(accounts[0].name).toBe(mockAddress);
		});

		it("should create extension with functional accounts.subscribe", async () => {
			const { getFingerprint } = await import("@prosopo/fingerprint");
			const { Keyring } = await import("@prosopo/keyring");
			const { hexHash, entropyToMnemonic } = await import(
				"@prosopo/util-crypto"
			);

			const mockAddress = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
			const mockKeypair = {
				address: mockAddress,
				sign: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
			};

			const mockKeyring = {
				addFromMnemonic: vi.fn().mockReturnValue(mockKeypair),
			};

			vi.mocked(getFingerprint).mockResolvedValue("fingerprint");
			vi.mocked(hexHash).mockReturnValue("0xhash");
			vi.mocked(entropyToMnemonic).mockReturnValue("mnemonic");
			// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
			vi.mocked(Keyring).mockReturnValue(mockKeyring as any);

			const result = await extensionWeb2.getAccount(mockConfig);
			const unsubscribe = result.extension.accounts.subscribe(() => {});

			// Verify accounts.subscribe returns an unsubscribe function
			expect(typeof unsubscribe).toBe("function");

			// Calling unsubscribe should not throw
			expect(() => unsubscribe()).not.toThrow();
		});

		it("should create signer with functional signRaw", async () => {
			const { getFingerprint } = await import("@prosopo/fingerprint");
			const { Keyring } = await import("@prosopo/keyring");
			const { hexHash, entropyToMnemonic } = await import(
				"@prosopo/util-crypto"
			);
			const { u8aToHex } = await import("@prosopo/util");

			const mockAddress = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
			const mockSignature = new Uint8Array([1, 2, 3, 4, 5]);
			const mockKeypair = {
				address: mockAddress,
				sign: vi.fn().mockReturnValue(mockSignature),
			};

			const mockKeyring = {
				addFromMnemonic: vi.fn().mockReturnValue(mockKeypair),
			};

			vi.mocked(getFingerprint).mockResolvedValue("fingerprint");
			vi.mocked(hexHash).mockReturnValue("0xhash");
			vi.mocked(entropyToMnemonic).mockReturnValue("mnemonic");
			// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
			vi.mocked(Keyring).mockReturnValue(mockKeyring as any);
			vi.mocked(u8aToHex).mockReturnValue("0x0102030405");

			const result = await extensionWeb2.getAccount(mockConfig);
			const payload = {
				address: mockAddress,
				data: "0xdata",
				type: "bytes" as const,
			};

			const signResult = await result.extension.signer.signRaw?.(payload);

			// Verify signRaw returns correct structure
			expect(signResult).toHaveProperty("id", 1);
			expect(signResult).toHaveProperty("signature", "0x0102030405");

			// Verify keypair.sign was called with payload data
			expect(mockKeypair.sign).toHaveBeenCalledWith(payload.data);

			// Verify u8aToHex was called with the signature
			expect(u8aToHex).toHaveBeenCalledWith(mockSignature);
		});

		it("should sign different payloads with same signature for same data", async () => {
			const { getFingerprint } = await import("@prosopo/fingerprint");
			const { Keyring } = await import("@prosopo/keyring");
			const { hexHash, entropyToMnemonic } = await import(
				"@prosopo/util-crypto"
			);
			const { u8aToHex } = await import("@prosopo/util");

			const mockAddress = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
			const mockSignature = new Uint8Array([1, 2, 3, 4, 5]);
			const mockKeypair = {
				address: mockAddress,
				sign: vi.fn().mockReturnValue(mockSignature),
			};

			const mockKeyring = {
				addFromMnemonic: vi.fn().mockReturnValue(mockKeypair),
			};

			vi.mocked(getFingerprint).mockResolvedValue("fingerprint");
			vi.mocked(hexHash).mockReturnValue("0xhash");
			vi.mocked(entropyToMnemonic).mockReturnValue("mnemonic");
			// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
			vi.mocked(Keyring).mockReturnValue(mockKeyring as any);
			vi.mocked(u8aToHex).mockReturnValue("0x0102030405");

			const result = await extensionWeb2.getAccount(mockConfig);

			// Sign same data twice
			const payload1 = {
				address: mockAddress,
				data: "0xsamedata",
				type: "bytes" as const,
			};
			const payload2 = {
				address: mockAddress,
				data: "0xsamedata",
				type: "bytes" as const,
			};

			const signResult1 = await result.extension.signer.signRaw?.(payload1);
			const signResult2 = await result.extension.signer.signRaw?.(payload2);

			// Both should have id=1 (as noted in comment, id doesn't increment)
			expect(signResult1.id).toBe(1);
			expect(signResult2.id).toBe(1);

			// Both should have same signature
			expect(signResult1.signature).toBe(signResult2.signature);
		});

		it("should use sr25519 keypair type", async () => {
			const { getFingerprint } = await import("@prosopo/fingerprint");
			const { Keyring } = await import("@prosopo/keyring");
			const { hexHash, entropyToMnemonic } = await import(
				"@prosopo/util-crypto"
			);

			const mockAddress = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
			const mockKeypair = {
				address: mockAddress,
				sign: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
			};

			const mockKeyring = {
				addFromMnemonic: vi.fn().mockReturnValue(mockKeypair),
			};

			vi.mocked(getFingerprint).mockResolvedValue("fingerprint");
			vi.mocked(hexHash).mockReturnValue("0xhash");
			vi.mocked(entropyToMnemonic).mockReturnValue("mnemonic");
			// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
			vi.mocked(Keyring).mockReturnValue(mockKeyring as any);

			await extensionWeb2.getAccount(mockConfig);

			// Verify sr25519 was used
			expect(Keyring).toHaveBeenCalledWith({ type: "sr25519" });
		});

		it("should process entropy correctly", async () => {
			const { getFingerprint } = await import("@prosopo/fingerprint");
			const { Keyring } = await import("@prosopo/keyring");
			const { hexHash, entropyToMnemonic } = await import(
				"@prosopo/util-crypto"
			);

			const mockFingerprint = "test-fingerprint";
			const mockHashWithPrefix = "0xabcd1234";
			const mockHashWithoutPrefix = "abcd1234";
			const mockMnemonic = "test mnemonic";

			const mockAddress = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
			const mockKeypair = {
				address: mockAddress,
				sign: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
			};

			const mockKeyring = {
				addFromMnemonic: vi.fn().mockReturnValue(mockKeypair),
			};

			vi.mocked(getFingerprint).mockResolvedValue(mockFingerprint);
			vi.mocked(hexHash).mockReturnValue(mockHashWithPrefix);
			vi.mocked(entropyToMnemonic).mockReturnValue(mockMnemonic);
			// biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
			vi.mocked(Keyring).mockReturnValue(mockKeyring as any);

			await extensionWeb2.getAccount(mockConfig);

			// Verify entropy was converted to U8a correctly (after removing 0x prefix)
			expect(entropyToMnemonic).toHaveBeenCalledWith(
				stringToU8a(mockHashWithoutPrefix),
			);
		});
	});

	describe("extends Extension", () => {
		it("should be instance of Extension", async () => {
			const { Extension } = await import("./Extension.js");
			expect(extensionWeb2).toBeInstanceOf(Extension);
		});

		it("should implement getAccount method", () => {
			expect(extensionWeb2.getAccount).toBeDefined();
			expect(typeof extensionWeb2.getAccount).toBe("function");
		});
	});
});
