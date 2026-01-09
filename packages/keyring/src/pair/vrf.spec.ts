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
import { createTestPairs } from "../keyring/testingPairs.js";

const keyring = createTestPairs({ type: "sr25519" }, false);

describe("Pair VRF (Verifiable Random Function)", () => {
	describe("vrfSign", () => {
		it("should sign a message using VRF and return a valid signature", () => {
			// Test VRF signing with a simple message
			const message = "test message for VRF signing";
			const signature = keyring.alice.vrfSign(message);

			// VRF signatures for sr25519 should be 96 bytes (32 + 64)
			expect(signature).toBeInstanceOf(Uint8Array);
			expect(signature.length).toBe(96);
		});

		it("should sign with context parameter", () => {
			// Test VRF signing with context
			const message = "test message";
			const context = "test context";
			const signature = keyring.alice.vrfSign(message, context);

			expect(signature).toBeInstanceOf(Uint8Array);
			expect(signature.length).toBe(96);
		});

		it("should sign with context and extra parameters", () => {
			// Test VRF signing with both context and extra parameters
			const message = "test message";
			const context = "test context";
			const extra = "extra data";
			const signature = keyring.alice.vrfSign(message, context, extra);

			expect(signature).toBeInstanceOf(Uint8Array);
			expect(signature.length).toBe(96);
		});

		it("should sign Uint8Array message", () => {
			// Test VRF signing with Uint8Array message
			const message = new Uint8Array([1, 2, 3, 4, 5]);
			const signature = keyring.alice.vrfSign(message);

			expect(signature).toBeInstanceOf(Uint8Array);
			expect(signature.length).toBe(96);
		});

		it("should throw error when trying to sign with locked key pair", () => {
			// Lock the key pair and try to sign
			keyring.alice.lock();

			expect(() => {
				keyring.alice.vrfSign("test message");
			}).toThrow("Cannot sign with a locked key pair");

			// Unlock for other tests
			keyring.alice.unlock();
		});
	});

	describe("vrfVerify", () => {
		it("should verify a valid VRF signature", () => {
			// Test VRF verification with a valid signature
			const message = "test message for VRF verification";
			const signature = keyring.alice.vrfSign(message);
			const isValid = keyring.alice.vrfVerify(
				message,
				signature,
				keyring.alice.publicKey,
			);

			expect(isValid).toBe(true);
		});

		it("should verify with context parameter", () => {
			// Test VRF verification with context
			const message = "test message";
			const context = "test context";
			const signature = keyring.alice.vrfSign(message, context);
			const isValid = keyring.alice.vrfVerify(
				message,
				signature,
				keyring.alice.publicKey,
				context,
			);

			expect(isValid).toBe(true);
		});

		it("should verify with context and extra parameters", () => {
			// Test VRF verification with both context and extra
			const message = "test message";
			const context = "test context";
			const extra = "extra data";
			const signature = keyring.alice.vrfSign(message, context, extra);
			const isValid = keyring.alice.vrfVerify(
				message,
				signature,
				keyring.alice.publicKey,
				context,
				extra,
			);

			expect(isValid).toBe(true);
		});

		it("should verify Uint8Array message", () => {
			// Test VRF verification with Uint8Array message
			const message = new Uint8Array([1, 2, 3, 4, 5]);
			const signature = keyring.alice.vrfSign(message);
			const isValid = keyring.alice.vrfVerify(
				message,
				signature,
				keyring.alice.publicKey,
			);

			expect(isValid).toBe(true);
		});

		it("should verify with string public key", () => {
			// Test VRF verification using string address instead of Uint8Array
			const message = "test message";
			const signature = keyring.alice.vrfSign(message);
			const isValid = keyring.alice.vrfVerify(
				message,
				signature,
				keyring.alice.address,
			);

			expect(isValid).toBe(true);
		});

		it("should return false for invalid signature", () => {
			// Test VRF verification with tampered signature
			const message = "test message";
			const validSignature = keyring.alice.vrfSign(message);

			// Create invalid signature by modifying one byte
			const invalidSignature = new Uint8Array(validSignature);
			invalidSignature[0] = invalidSignature[0] === 0 ? 1 : 0;

			const isValid = keyring.alice.vrfVerify(
				message,
				invalidSignature,
				keyring.alice.publicKey,
			);

			expect(isValid).toBe(false);
		});

		it("should return false for wrong message", () => {
			// Test VRF verification with wrong message
			const originalMessage = "original message";
			const wrongMessage = "wrong message";
			const signature = keyring.alice.vrfSign(originalMessage);

			const isValid = keyring.alice.vrfVerify(
				wrongMessage,
				signature,
				keyring.alice.publicKey,
			);

			expect(isValid).toBe(false);
		});

		it("should return false for wrong public key", () => {
			// Test VRF verification with wrong public key
			const message = "test message";
			const signature = keyring.alice.vrfSign(message);

			const isValid = keyring.alice.vrfVerify(
				message,
				signature,
				keyring.bob.publicKey,
			);

			expect(isValid).toBe(false);
		});

		it("should return false for wrong context", () => {
			// Test VRF verification with wrong context
			const message = "test message";
			const context = "correct context";
			const wrongContext = "wrong context";
			const signature = keyring.alice.vrfSign(message, context);

			const isValid = keyring.alice.vrfVerify(
				message,
				signature,
				keyring.alice.publicKey,
				wrongContext,
			);

			expect(isValid).toBe(false);
		});

		it("should return false for wrong extra data", () => {
			// Test VRF verification with wrong extra data
			const message = "test message";
			const context = "test context";
			const extra = "correct extra";
			const wrongExtra = "wrong extra";
			const signature = keyring.alice.vrfSign(message, context, extra);

			const isValid = keyring.alice.vrfVerify(
				message,
				signature,
				keyring.alice.publicKey,
				context,
				wrongExtra,
			);

			expect(isValid).toBe(false);
		});
	});

	describe("VRF round-trip consistency", () => {
		it("should maintain consistency across multiple sign/verify cycles", () => {
			// Test multiple rounds of signing and verification
			const messages = [
				"message 1",
				"message 2",
				new Uint8Array([1, 2, 3]),
				new Uint8Array([4, 5, 6, 7, 8]),
			];

			const contexts = [undefined, "context1", "context2"];
			const extras = [undefined, "extra1", "extra2"];

			for (const message of messages) {
				for (const context of contexts) {
					for (const extra of extras) {
						const signature = keyring.alice.vrfSign(message, context, extra);
						const isValid = keyring.alice.vrfVerify(
							message,
							signature,
							keyring.alice.publicKey,
							context,
							extra,
						);

						expect(isValid).toBe(true);
					}
				}
			}
		});

		it("should work with different key pairs", () => {
			// Test VRF with different key pairs
			const testPairs = [keyring.alice, keyring.bob, keyring.charlie];
			const message = "cross-pair test message";

			for (const signer of testPairs) {
				const signature = signer.vrfSign(message);
				const isValid = signer.vrfVerify(message, signature, signer.publicKey);

				expect(isValid).toBe(true);
			}
		});
	});
});
