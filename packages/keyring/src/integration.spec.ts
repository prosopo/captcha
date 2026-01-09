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

import { describe, expect, it } from "vitest";
import { Keyring } from "./keyring/keyring.js";

describe("Keyring Integration Tests", () => {
	describe("Complete key management workflow", () => {
		it("should create, use, export, and import a key pair", () => {
			// Create a new keyring
			const keyring = new Keyring();

			// Add a pair from mnemonic
			const mnemonic = "bottom drive obey lake curtain smoke basket hold race lonely fit walk";
			const pair = keyring.addFromMnemonic(mnemonic, { name: "test-pair" });

			// Verify the pair was added
			expect(keyring.getPairs()).toHaveLength(1);
			expect(pair.address).toBeDefined();
			expect(pair.meta.name).toBe("test-pair");

			// Test signing functionality
			const message = "test message for signing";
			const signature = pair.sign(message);
			expect(signature).toBeInstanceOf(Uint8Array);
			expect(signature.length).toBeGreaterThan(0);

			// Verify the signature
			const isValid = pair.verify(message, signature, pair.publicKey);
			expect(isValid).toBe(true);

			// Test VRF signing
			const vrfSignature = pair.vrfSign(message);
			expect(vrfSignature).toBeInstanceOf(Uint8Array);
			expect(vrfSignature.length).toBe(96);

			// Verify VRF signature
			const isVrfValid = pair.vrfVerify(message, vrfSignature, pair.publicKey);
			expect(isVrfValid).toBe(true);

			// Export to JSON
			const json = pair.toJson("test-password");
			expect(json.address).toBe(pair.address);
			expect(json.encoding.type).toContain("scrypt");

			// Create a new keyring and import the JSON
			const newKeyring = new Keyring();
			const importedPair = newKeyring.addFromJson(json);

			// Verify the imported pair works the same
			expect(importedPair.address).toBe(pair.address);
			const newSignature = importedPair.sign(message);
			const isNewValid = importedPair.verify(message, newSignature, importedPair.publicKey);
			expect(isNewValid).toBe(true);
		});

		it("should handle passphrase-protected key export and import", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(
				"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
			);

			// Export with passphrase
			const passphrase = "secure-password-123";
			const json = pair.toJson(passphrase);

			// Import should work with correct passphrase
			const newKeyring = new Keyring();
			const importedPair = newKeyring.addFromJson(json);

			// Should be able to unlock and use
			expect(importedPair.isLocked).toBe(true);
			importedPair.unlock(passphrase);
			expect(importedPair.isLocked).toBe(false);

			// Should be able to sign after unlocking
			const message = "test after unlock";
			const signature = importedPair.sign(message);
			expect(signature).toBeInstanceOf(Uint8Array);
		});

		it("should manage multiple pairs in a keyring", () => {
			const keyring = new Keyring();

			// Add multiple pairs
			const pair1 = keyring.addFromMnemonic(
				"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
				{ name: "alice" },
			);
			const pair2 = keyring.addFromMnemonic(
				"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
				{ name: "bob" },
			);
			const pair3 = keyring.addFromUri("Charlie", { name: "charlie" });

			// Verify all pairs are present
			expect(keyring.getPairs()).toHaveLength(3);
			expect(keyring.getPublicKeys()).toHaveLength(3);

			// Test retrieval by address
			expect(keyring.getPair(pair1.address)).toBe(pair1);
			expect(keyring.getPair(pair2.address)).toBe(pair2);
			expect(keyring.getPair(pair3.address)).toBe(pair3);

			// Test signing between pairs
			const message = "cross-pair message";
			const signature1 = pair1.sign(message);
			const signature2 = pair2.sign(message);

			// Verify signatures with correct public keys
			expect(pair1.verify(message, signature1, pair1.publicKey)).toBe(true);
			expect(pair2.verify(message, signature2, pair2.publicKey)).toBe(true);

			// Verify signatures don't validate with wrong public keys
			expect(pair1.verify(message, signature1, pair2.publicKey)).toBe(false);
			expect(pair2.verify(message, signature2, pair1.publicKey)).toBe(false);

			// Test removal
			keyring.removePair(pair2.address);
			expect(keyring.getPairs()).toHaveLength(2);
			expect(() => keyring.getPair(pair2.address)).toThrow();
		});

		it("should handle key derivation", () => {
			const keyring = new Keyring();
			const masterPair = keyring.addFromMnemonic(
				"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
			);

			// Derive child keys
			const childPair1 = masterPair.derive("//child/1", { name: "child1" });
			const childPair2 = masterPair.derive("//child/2", { name: "child2" });

			// Verify derived keys are different from master
			expect(childPair1.address).not.toBe(masterPair.address);
			expect(childPair2.address).not.toBe(masterPair.address);
			expect(childPair1.address).not.toBe(childPair2.address);

			// Verify derived keys can sign and verify
			const message = "derived key test";
			const signature1 = childPair1.sign(message);
			const signature2 = childPair2.sign(message);

			expect(childPair1.verify(message, signature1, childPair1.publicKey)).toBe(true);
			expect(childPair2.verify(message, signature2, childPair2.publicKey)).toBe(true);

			// Verify master key can verify child signatures (same key hierarchy)
			expect(masterPair.verify(message, signature1, childPair1.publicKey)).toBe(true);
		});

		it("should handle JWT operations", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(
				"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
			);

			// Create JWT
			const payload = { userId: "123", role: "admin" };
			const jwt = pair.jwtIssue({ expiresIn: "1h" }, payload);

			expect(jwt).toBeDefined();
			expect(typeof jwt).toBe("string");
			expect(jwt.split(".")).toHaveLength(3); // JWT format: header.payload.signature

			// Verify JWT
			const verificationResult = pair.jwtVerify(jwt);
			expect(verificationResult.isValid).toBe(true);
			expect(verificationResult.crypto).toBe("sr25519");
			expect(verificationResult.publicKey).toEqual(pair.publicKey);
		});

		it("should handle address encoding/decoding across formats", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(
				"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
			);

			// Test SS58 encoding
			const ss58Address = keyring.encodeAddress(pair.publicKey);
			expect(ss58Address).toBe(pair.address);

			// Test decoding
			const decodedPublicKey = keyring.decodeAddress(ss58Address);
			expect(decodedPublicKey).toEqual(pair.publicKey);

			// Test with different SS58 formats
			const customSs58Address = keyring.encodeAddress(pair.publicKey, 42);
			expect(customSs58Address).toBeDefined();
			expect(customSs58Address).not.toBe(ss58Address); // Different prefix

			// Test hex address decoding
			const hexAddress = `0x${Array.from(pair.publicKey)
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("")}`;
			const decodedHexPublicKey = keyring.decodeAddress(hexAddress);
			expect(decodedHexPublicKey).toEqual(pair.publicKey);
		});

		it("should handle key locking and unlocking", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(
				"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
			);

			// Initially should be unlocked (since we added from mnemonic)
			expect(pair.isLocked).toBe(false);

			// Lock the pair
			pair.lock();
			expect(pair.isLocked).toBe(true);

			// Should not be able to sign when locked
			expect(() => pair.sign("test")).toThrow("Cannot sign with a locked key pair");
			expect(() => pair.vrfSign("test")).toThrow("Cannot sign with a locked key pair");

			// Unlock the pair
			pair.unlock();
			expect(pair.isLocked).toBe(false);

			// Should be able to sign again
			const signature = pair.sign("test after unlock");
			expect(signature).toBeInstanceOf(Uint8Array);
		});

		it("should handle metadata management", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(
				"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
				{ name: "initial", created: Date.now() },
			);

			// Check initial metadata
			expect(pair.meta.name).toBe("initial");
			expect(pair.meta.created).toBeDefined();

			// Update metadata
			pair.setMeta({ name: "updated", role: "admin" });

			// Check updated metadata (should merge, not replace)
			expect(pair.meta.name).toBe("updated");
			expect(pair.meta.role).toBe("admin");
			expect(pair.meta.created).toBeDefined(); // Should still be there
		});
	});

	describe("Error handling integration", () => {
		it("should handle invalid operations gracefully", () => {
			const keyring = new Keyring();

			// Try to get non-existent pair
			expect(() => keyring.getPair("invalid-address")).toThrow();

			// Try to remove non-existent pair (should not throw)
			expect(() => keyring.removePair("invalid-address")).not.toThrow();

			// Try to add invalid mnemonic
			expect(() => keyring.addFromUri("invalid mnemonic phrase")).toThrow();

			// Try to create from invalid JSON
			expect(() => keyring.createFromJson({} as any)).toThrow();
		});

		it("should handle locked pair operations", () => {
			const keyring = new Keyring();
			const pair = keyring.addFromAddress(
				"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			);

			// Address-only pair should be locked
			expect(pair.isLocked).toBe(true);

			// Should not be able to sign
			expect(() => pair.sign("test")).toThrow();
			expect(() => pair.vrfSign("test")).toThrow();
			expect(() => pair.derive("//test")).toThrow();

			// Should be able to verify (doesn't need secret key)
			const dummySignature = new Uint8Array(64);
			const isValid = pair.verify("test", dummySignature, pair.publicKey);
			expect(typeof isValid).toBe("boolean");
		});
	});
});