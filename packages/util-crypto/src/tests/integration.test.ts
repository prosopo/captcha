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

/**
 * Integration tests for @prosopo/util-crypto
 *
 * These tests verify complex crypto workflows that combine multiple operations
 * in realistic scenarios. While most crypto functions are pure, these tests
 * ensure end-to-end functionality works correctly across the entire crypto pipeline.
 */

import { describe, expect, it } from "vitest";
import { hexHash } from "../hash.js";
import { jsonDecrypt, jsonEncrypt } from "../json/index.js";
import { jwtVerify } from "../jwt/index.js";
import { mnemonicGenerate, mnemonicToMiniSecret } from "../mnemonic/index.js";
import {
	sr25519FromSeed,
	sr25519Sign,
	sr25519Verify,
	sr25519jwtIssue,
} from "../sr25519/index.js";

describe("Crypto Integration Tests", () => {
	// Test complete key lifecycle from mnemonic to signing/verification
	it("should complete full key lifecycle: mnemonic -> seed -> keypair -> sign/verify", () => {
		// Generate a random mnemonic (integration test - combines random generation with mnemonic validation)
		const mnemonic = mnemonicGenerate();

		// Derive seed from mnemonic (tests mnemonic processing pipeline)
		const seed = mnemonicToMiniSecret(mnemonic);

		// Create keypair from seed (tests key derivation)
		const { publicKey, secretKey } = sr25519FromSeed(seed);

		// Test signing and verification workflow
		const message = "test message for signing";
		const signature = sr25519Sign(message, { publicKey, secretKey });
		const isValid = sr25519Verify(message, signature, publicKey);

		expect(isValid).toBe(true);

		// Verify signature fails with wrong message
		const isValidWrong = sr25519Verify("wrong message", signature, publicKey);
		expect(isValidWrong).toBe(false);
	});

	it("should complete JWT workflow: key generation -> JWT creation -> verification", () => {
		// Generate keypair for JWT operations
		const { publicKey, secretKey } = sr25519FromSeed(
			new Uint8Array(32).fill(1),
		);

		// Create JWT with expiration and custom claims
		const jwt = sr25519jwtIssue(
			{ publicKey, secretKey },
			{ expiresIn: 300 },
			{ userId: "test-user", role: "admin" },
		);

		// Verify JWT
		const result = jwtVerify(jwt, publicKey);

		expect(result.isValid).toBe(true);
		expect(result.crypto).toBe("sr25519");
		expect(result.payload?.userId).toBe("test-user");
		expect(result.payload?.role).toBe("admin");
		expect(result.payload?.exp).toBeGreaterThan(Date.now() / 1000);
	});

	it("should handle JSON encryption/decryption workflow with passphrase", () => {
		// Test data for encryption
		const originalData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
		const contentType = ["pkcs8", "sr25519"];
		const passphrase = "test-passphrase-123";

		// Encrypt data
		const encrypted = jsonEncrypt(originalData, contentType, passphrase);

		// Decrypt data
		const decrypted = jsonDecrypt(encrypted, passphrase);

		// Verify round-trip encryption/decryption
		expect(decrypted).toEqual(originalData);
		expect(encrypted.encoding.type).toEqual(["scrypt", "xsalsa20-poly1305"]);
		expect(encrypted.encoding.content).toEqual(contentType);
	});

	it("should handle complex hash operations with different inputs", () => {
		const testString = "integration test data";
		const testArray = ["item1", "item2", "item3"];

		// Test various hash operations and ensure consistency
		const hash1 = hexHash(testString);
		const hash2 = hexHash(testString);
		const arrayHash = hexHash(testArray.join(""));

		expect(hash1).toEqual(hash2); // Same input produces same hash
		expect(hash1).not.toEqual(arrayHash); // Different inputs produce different hashes
		expect(hash1).toHaveLength(66); // 256-bit hash with 0x prefix
	});

	it("should validate cross-crypto-system compatibility", () => {
		// Test that different crypto systems can work together
		// Generate data with one system, process with another

		const testData = "cross-system compatibility test";

		// Hash with our hash function
		const hash = hexHash(testData);

		// Use hash as seed for key generation
		const seed = new Uint8Array(32);
		for (let i = 0; i < 32; i++) {
			seed[i] = Number.parseInt(hash.slice(2 + i * 2, 2 + (i + 1) * 2), 16);
		}

		// Generate keypair and sign
		const { publicKey, secretKey } = sr25519FromSeed(seed);
		const signature = sr25519Sign(testData, { publicKey, secretKey });
		const isValid = sr25519Verify(testData, signature, publicKey);

		expect(isValid).toBe(true);
	});

	// Future testcontainers integration tests could be added here for:
	// - Testing crypto operations with external databases (storing/retrieving encrypted data)
	// - Testing JWT validation against external user stores
	// - Testing crypto operations under load with containerized services
	// - Testing key rotation and migration scenarios with external storage
});
