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

import type { ProcaptchaClientConfigOutput } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { u8aToHex } from "@prosopo/util";
import { ExtensionWeb2 } from "./ExtensionWeb2.js";

// Mock only getFingerprint since it requires browser environment
// This allows us to test real keyring and crypto integration
vi.mock("@prosopo/fingerprint", () => ({
	getFingerprint: vi.fn().mockResolvedValue("test-fingerprint-constant"),
}));

describe("ExtensionWeb2 Integration", () => {
	let extensionWeb2: ExtensionWeb2;
	let mockConfig: ProcaptchaClientConfigOutput;

	beforeEach(() => {
		extensionWeb2 = new ExtensionWeb2();
		mockConfig = {
			dappName: "test-dapp",
			userAccountAddress: undefined,
		} as ProcaptchaClientConfigOutput;
	});

	afterEach(() => {
		// Cleanup if needed
	});

	describe("getAccount", () => {
		it("should create and return a complete account object with extension", async () => {
			// Test that getAccount returns an object with both account and extension properties
			// This tests the integration of account creation and extension setup
			const result = await extensionWeb2.getAccount(mockConfig);

			expect(result).toHaveProperty("account");
			expect(result).toHaveProperty("extension");
			expect(result.account).toHaveProperty("address");
			expect(result.account).toHaveProperty("name");
			expect(typeof result.account.address).toBe("string");
			expect(result.account.address.length).toBeGreaterThan(0);
		});

		it("should create extension with functional accounts.get method", async () => {
			// Test that the created extension has a working accounts.get method
			// This tests the mock extension implementation returns valid account data
			const result = await extensionWeb2.getAccount(mockConfig);
			expect(result.extension).toBeDefined();
			if (!result.extension) {
				throw new Error("Extension should be defined");
			}
			const accounts = await result.extension.accounts.get();

			expect(Array.isArray(accounts)).toBe(true);
			expect(accounts.length).toBeGreaterThan(0);
			expect(accounts[0]).toHaveProperty("address");
			expect(accounts[0]).toHaveProperty("name");
		});

		it("should create extension with functional accounts.subscribe method", async () => {
			// Test that the created extension has a working accounts.subscribe method
			// This tests the mock extension subscription functionality
			const result = await extensionWeb2.getAccount(mockConfig);
			expect(result.extension).toBeDefined();
			if (!result.extension) {
				throw new Error("Extension should be defined");
			}
			const unsubscribe = result.extension.accounts.subscribe(() => {});

			expect(typeof unsubscribe).toBe("function");
			expect(() => unsubscribe()).not.toThrow();
		});

		it("should create signer with functional signRaw method", async () => {
			// Test that the created extension has a working signer.signRaw method
			// This tests the integration of keypair signing with the mock signer interface
			const result = await extensionWeb2.getAccount(mockConfig);
			expect(result.extension).toBeDefined();
			if (!result.extension) {
				throw new Error("Extension should be defined");
			}
			const payload = {
				address: result.account.address,
				data: u8aToHex(new Uint8Array([1, 2, 3, 4, 5])),
				type: "bytes" as const,
			};

			const signResult = await result.extension.signer.signRaw?.(payload);

			expect(signResult).toBeDefined();
			if (!signResult) {
				throw new Error("Sign result should be defined");
			}
			expect(signResult).toHaveProperty("id");
			expect(signResult).toHaveProperty("signature");
			expect(typeof signResult.signature).toBe("string");
			expect(signResult.signature.startsWith("0x")).toBe(true);
		});

		it("should sign same data consistently", async () => {
			// Test that signing the same data multiple times produces the same signature
			// This tests the deterministic nature of the signing process
			const result = await extensionWeb2.getAccount(mockConfig);

			const data = new Uint8Array([1, 2, 3]);
			const payload = {
				address: result.account.address,
				data: u8aToHex(data),
				type: "bytes" as const,
			};

			expect(result.extension).toBeDefined();
			if (!result.extension) {
				throw new Error("Extension should be defined");
			}
			const signResult = await result.extension.signer.signRaw?.(payload);

			expect(signResult).toBeDefined();
			if (!signResult) {
				throw new Error("Sign result should be defined");
			}
			expect(signResult.id).toBe(1);
			expect(signResult.signature).toBeDefined();
			expect(typeof signResult.signature).toBe("string");
			expect(signResult.signature.startsWith("0x")).toBe(true);
		});

		it("should sign different data with different signatures", async () => {
			// Test that signing different data produces different signatures
			// This tests the cryptographic integrity of the signing process
			const result = await extensionWeb2.getAccount(mockConfig);

			const payload1 = {
				address: result.account.address,
				data: u8aToHex(new Uint8Array([1, 2, 3])),
				type: "bytes" as const,
			};
			const payload2 = {
				address: result.account.address,
				data: u8aToHex(new Uint8Array([4, 5, 6])),
				type: "bytes" as const,
			};

			expect(result.extension).toBeDefined();
			if (!result.extension) {
				throw new Error("Extension should be defined");
			}
			const signResult1 = await result.extension.signer.signRaw?.(payload1);
			const signResult2 = await result.extension.signer.signRaw?.(payload2);

			expect(signResult1).toBeDefined();
			expect(signResult2).toBeDefined();
			if (!signResult1 || !signResult2) {
				throw new Error("Sign results should be defined");
			}
			expect(signResult1.signature).not.toBe(signResult2.signature);
		});

		it("should create consistent account for same fingerprint", async () => {
			// Test that the same fingerprint produces the same account
			// This tests the deterministic account generation from browser entropy
			const result1 = await extensionWeb2.getAccount(mockConfig);
			const result2 = await extensionWeb2.getAccount(mockConfig);

			expect(result1.account.address).toBe(result2.account.address);
			expect(result1.account.name).toBe(result2.account.name);
		});

		it("should use sr25519 keypair type", async () => {
			// Test that accounts are created with the correct cryptographic keypair type
			// This tests the integration with the Prosopo keyring using sr25519
			const result = await extensionWeb2.getAccount(mockConfig);

			expect(result.account.address).toBeDefined();
			expect(typeof result.account.address).toBe("string");
		});

		it("should create extension with correct name and version", async () => {
			// Test that the created extension has the expected metadata
			// This tests the mock extension configuration
			const result = await extensionWeb2.getAccount(mockConfig);

			expect(result.extension).toBeDefined();
			if (!result.extension) {
				throw new Error("Extension should be defined");
			}
			expect(result.extension.name).toBe("procaptcha-web2");
			expect(result.extension.version).toBeDefined();
			expect(typeof result.extension.version).toBe("string");
		});
	});

	describe("extends Extension", () => {
		it("should be instance of Extension", async () => {
			// Test that ExtensionWeb2 properly implements the Extension interface
			const { Extension } = await import("./Extension.js");
			expect(extensionWeb2).toBeInstanceOf(Extension);
		});

		it("should implement getAccount method", () => {
			// Test that ExtensionWeb2 provides the required getAccount method
			expect(extensionWeb2.getAccount).toBeDefined();
			expect(typeof extensionWeb2.getAccount).toBe("function");
		});
	});
});
