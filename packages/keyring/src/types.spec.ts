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
	KeyringInstance,
	KeyringPair,
	KeyringPair$Json,
	KeyringPair$Meta,
} from "@prosopo/types";
import { describe, expect, it } from "vitest";
import { Keyring } from "./keyring/keyring.js";
import { nobody } from "./pair/nobody.js";

/**
 * Type tests to ensure TypeScript interfaces are correctly implemented.
 * These tests focus on type safety and interface compliance rather than runtime behavior.
 */
describe("Type Safety Tests", () => {
	describe("KeyringPair interface compliance", () => {
		it("should implement all required KeyringPair methods and properties", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(
				"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
			);

			// Test that all required properties exist and have correct types
			expect(typeof pair.address).toBe("string");
			expect(pair.addressRaw).toBeInstanceOf(Uint8Array);
			expect(typeof pair.isLocked).toBe("boolean");
			expect(typeof pair.meta).toBe("object");
			expect(pair.publicKey).toBeInstanceOf(Uint8Array);
			expect(typeof pair.type).toBe("string");

			// Test that all required methods exist
			expect(typeof pair.decodePkcs8).toBe("function");
			expect(typeof pair.derive).toBe("function");
			expect(typeof pair.encodePkcs8).toBe("function");
			expect(typeof pair.jwtIssue).toBe("function");
			expect(typeof pair.jwtVerify).toBe("function");
			expect(typeof pair.lock).toBe("function");
			expect(typeof pair.setMeta).toBe("function");
			expect(typeof pair.sign).toBe("function");
			expect(typeof pair.toJson).toBe("function");
			expect(typeof pair.unlock).toBe("function");
			expect(typeof pair.verify).toBe("function");
			expect(typeof pair.vrfSign).toBe("function");
			expect(typeof pair.vrfVerify).toBe("function");
		});

		it("should have correctly typed method signatures", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(
				"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
			);

			// Test method return types
			const signature: Uint8Array = pair.sign("test message");
			expect(signature).toBeInstanceOf(Uint8Array);

			const vrfSignature: Uint8Array = pair.vrfSign("test message");
			expect(vrfSignature).toBeInstanceOf(Uint8Array);

			const json: KeyringPair$Json = pair.toJson();
			expect(json).toBeDefined();
			expect(typeof json.address).toBe("string");

			const jwt: string = pair.jwtIssue();
			expect(typeof jwt).toBe("string");

			// Test method parameter types
			const isValid: boolean = pair.verify(
				"message",
				signature,
				pair.publicKey,
			);
			expect(typeof isValid).toBe("boolean");

			const isVrfValid: boolean = pair.vrfVerify(
				"message",
				vrfSignature,
				pair.publicKey,
			);
			expect(typeof isVrfValid).toBe("boolean");
		});

		it("should handle optional parameters correctly", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(
				"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
			);

			// Test methods with optional parameters
			const jsonWithPassphrase: KeyringPair$Json = pair.toJson("password");
			expect(jsonWithPassphrase).toBeDefined();

			const encodedWithPassphrase: Uint8Array = pair.encodePkcs8("password");
			expect(encodedWithPassphrase).toBeInstanceOf(Uint8Array);

			// Test methods without optional parameters
			const jsonWithoutPassphrase: KeyringPair$Json = pair.toJson();
			expect(jsonWithoutPassphrase).toBeDefined();

			const encodedWithoutPassphrase: Uint8Array = pair.encodePkcs8();
			expect(encodedWithoutPassphrase).toBeInstanceOf(Uint8Array);
		});
	});

	describe("KeyringInstance interface compliance", () => {
		it("should implement all required KeyringInstance methods", () => {
			const keyring: KeyringInstance = new Keyring();

			// Test that all required methods exist
			expect(typeof keyring.addPair).toBe("function");
			expect(typeof keyring.addFromAddress).toBe("function");
			expect(typeof keyring.addFromJson).toBe("function");
			expect(typeof keyring.addFromMnemonic).toBe("function");
			expect(typeof keyring.addFromPair).toBe("function");
			expect(typeof keyring.addFromSeed).toBe("function");
			expect(typeof keyring.addFromUri).toBe("function");
			expect(typeof keyring.createFromJson).toBe("function");
			expect(typeof keyring.createFromPair).toBe("function");
			expect(typeof keyring.createFromUri).toBe("function");
			expect(typeof keyring.decodeAddress).toBe("function");
			expect(typeof keyring.encodeAddress).toBe("function");
			expect(typeof keyring.getPair).toBe("function");
			expect(typeof keyring.getPairs).toBe("function");
			expect(typeof keyring.getPublicKeys).toBe("function");
			expect(typeof keyring.removePair).toBe("function");
			expect(typeof keyring.setSS58Format).toBe("function");
			expect(typeof keyring.toJson).toBe("function");

			// Test that all required properties exist
			expect(typeof keyring.pairs).toBe("object");
			expect(typeof keyring.publicKeys).toBe("object");
			expect(typeof keyring.type).toBe("string");
		});

		it("should have correctly typed method signatures", () => {
			const keyring = new Keyring();

			// Test method return types
			const pairs = keyring.getPairs();
			expect(Array.isArray(pairs)).toBe(true);

			const publicKeys = keyring.getPublicKeys();
			expect(Array.isArray(publicKeys)).toBe(true);
			for (const key of publicKeys) {
				expect(key).toBeInstanceOf(Uint8Array);
			}

			const address: string = keyring.encodeAddress(new Uint8Array(32));
			expect(typeof address).toBe("string");

			const decodedKey: Uint8Array = keyring.decodeAddress(
				"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			);
			expect(decodedKey).toBeInstanceOf(Uint8Array);
		});
	});

	describe("KeyringPair$Json interface compliance", () => {
		it("should have all required JSON properties", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(
				"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
			);
			const json = pair.toJson();

			// Test that all required properties exist
			expect(typeof json.address).toBe("string");
			expect(typeof json.encoded).toBe("string");
			expect(typeof json.encoding).toBe("object");
			expect(typeof json.meta).toBe("object");

			// Test encoding structure
			expect(typeof json.encoding.content).toBe("object");
			expect(typeof json.encoding.type).toBe("object");
			expect(typeof json.encoding.version).toBe("string");
		});

		it("should handle different encoding types", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(
				"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
			);

			// Test without passphrase (should use 'none' type)
			const jsonNoPass = pair.toJson();
			expect(jsonNoPass.encoding.type).toContain("none");

			// Test with passphrase (should use encryption)
			const jsonWithPass = pair.toJson("password");
			expect(jsonWithPass.encoding.type).not.toContain("none");
		});
	});

	describe("KeyringPair$Meta interface compliance", () => {
		it("should accept valid meta properties", () => {
			const keyring = new Keyring();

			// Test various valid meta properties
			const meta: KeyringPair$Meta = {
				name: "test-pair",
				isTesting: true,
				createdAt: Date.now(),
				tags: ["test", "development"],
				customProperty: "custom value",
			};

			const pair = keyring.addFromMnemonic(
				"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
				meta,
			);

			// Verify meta is preserved
			expect(pair.meta.name).toBe("test-pair");
			expect(pair.meta.isTesting).toBe(true);
			expect(typeof pair.meta.createdAt).toBe("number");
			expect(Array.isArray(pair.meta.tags)).toBe(true);
			expect(pair.meta.customProperty).toBe("custom value");
		});

		it("should handle partial meta objects", () => {
			const keyring = new Keyring();

			// Test with minimal meta
			const minimalMeta: KeyringPair$Meta = { name: "minimal" };
			const pair1 = keyring.addFromMnemonic(
				"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
				minimalMeta,
			);
			expect(pair1.meta.name).toBe("minimal");

			// Test with empty meta
			const emptyMeta: KeyringPair$Meta = {};
			const pair2 = keyring.addFromMnemonic(
				"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
				emptyMeta,
			);
			expect(pair2.meta).toEqual({});
		});
	});

	describe("nobody function type compliance", () => {
		it("should return a properly typed KeyringPair", () => {
			const pair: KeyringPair = nobody();

			// Verify it implements the KeyringPair interface
			expect(typeof pair.address).toBe("string");
			expect(pair.addressRaw).toBeInstanceOf(Uint8Array);
			expect(typeof pair.isLocked).toBe("boolean");
			expect(pair.publicKey).toBeInstanceOf(Uint8Array);
			expect(typeof pair.type).toBe("string");

			// Verify all methods exist
			expect(typeof pair.decodePkcs8).toBe("function");
			expect(typeof pair.encodePkcs8).toBe("function");
			expect(typeof pair.sign).toBe("function");
			expect(typeof pair.verify).toBe("function");
			expect(typeof pair.vrfSign).toBe("function");
			expect(typeof pair.vrfVerify).toBe("function");
			expect(typeof pair.toJson).toBe("function");
		});

		it("should be assignable to KeyringPair type", () => {
			// This test ensures nobody() can be used wherever KeyringPair is expected
			const pair: KeyringPair = nobody();

			// Should be able to pass to functions expecting KeyringPair
			const pairs: KeyringPair[] = [pair];
			expect(pairs).toHaveLength(1);
			expect(pairs[0]).toBe(pair);
		});
	});

	describe("Type guards and assertions", () => {
		it("should properly type Uint8Array parameters", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(
				"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
			);

			// Test that methods accept various input types for message
			const stringMessage = "string message";
			const uint8ArrayMessage = new Uint8Array([1, 2, 3, 4]);

			// Should accept both string and Uint8Array
			const sig1: Uint8Array = pair.sign(stringMessage);
			const sig2: Uint8Array = pair.sign(uint8ArrayMessage);

			expect(sig1).toBeInstanceOf(Uint8Array);
			expect(sig2).toBeInstanceOf(Uint8Array);
		});

		it("should properly type address parameters", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(
				"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
			);

			// Test that address can be string or Uint8Array
			const stringAddress = pair.address;
			const uint8ArrayAddress = pair.publicKey;

			// Should be able to get pair by both types
			const pair1 = keyring.getPair(stringAddress);
			const pair2 = keyring.getPair(uint8ArrayAddress);

			expect(pair1).toBe(pair);
			expect(pair2).toBe(pair);
		});
	});
});
