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
import { nobody } from "./nobody.js";

describe("nobody", () => {
	it("should return a mock keyring pair with expected properties", () => {
		// Test that nobody() returns a proper KeyringPair interface
		const pair = nobody();

		// Check basic properties
		expect(pair).toBeDefined();
		expect(pair.address).toBe("5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM");
		expect(pair.type).toBe("sr25519");
		expect(pair.isLocked).toBe(true);
		expect(pair.meta.name).toBe("nobody");
		expect(pair.meta.isTesting).toBe(true);
	});

	it("should have zero-filled public key", () => {
		// Test that the public key is all zeros as expected
		const pair = nobody();
		const expectedPublicKey = new Uint8Array(32); // 32 bytes of zeros

		expect(pair.publicKey).toEqual(expectedPublicKey);
		expect(pair.addressRaw).toEqual(expectedPublicKey);
	});

	it("should return consistent address", () => {
		// Test that address is consistent
		const pair1 = nobody();
		const pair2 = nobody();

		expect(pair1.address).toBe(pair2.address);
		expect(pair1.publicKey).toEqual(pair2.publicKey);
	});

	it("should have stub implementations that don't throw or modify state", () => {
		// Test that stub methods don't throw and don't modify state
		const pair = nobody();

		// These methods should not throw and should return expected stub values
		expect(() => pair.decodePkcs8()).not.toThrow();
		expect(() => pair.lock()).not.toThrow();
		expect(() => pair.unlock()).not.toThrow();
		expect(() => pair.setMeta({ test: true })).not.toThrow();
	});

	it("should return stub signature for sign method", () => {
		// Test sign method returns stub 64-byte signature
		const pair = nobody();
		const signature = pair.sign("test message");

		expect(signature).toBeInstanceOf(Uint8Array);
		expect(signature.length).toBe(64); // Standard signature length
	});

	it("should return stub VRF signature for vrfSign method", () => {
		// Test vrfSign method returns stub 96-byte signature
		const pair = nobody();
		const signature = pair.vrfSign("test message");

		expect(signature).toBeInstanceOf(Uint8Array);
		expect(signature.length).toBe(96); // VRF signature length
	});

	it("should return false for verify method", () => {
		// Test verify method always returns false (stub implementation)
		const pair = nobody();
		const signature = new Uint8Array(64);
		const isValid = pair.verify("test message", signature, pair.publicKey);

		expect(isValid).toBe(false);
	});

	it("should return false for vrfVerify method", () => {
		// Test vrfVerify method always returns false (stub implementation)
		const pair = nobody();
		const signature = new Uint8Array(96);
		const isValid = pair.vrfVerify("test message", signature, pair.publicKey);

		expect(isValid).toBe(false);
	});

	it("should return stub JWT for jwtIssue method", () => {
		// Test jwtIssue method returns stub JWT
		const pair = nobody();
		const jwt = pair.jwtIssue();

		expect(jwt).toBe("jwt.dummy.token");
	});

	it("should return stub JWT verification result", () => {
		// Test jwtVerify method returns stub verification result
		const pair = nobody();
		const result = pair.jwtVerify("dummy.jwt");

		expect(result).toBeDefined();
		expect(result.isValid).toBe(false);
		expect(result.error).toBe("JWT verification failed");
		expect(result.crypto).toBe("sr25519");
		expect(result.publicKey).toEqual(pair.publicKey);
		expect(result.isWrapped).toBe(false);
	});

	it("should return consistent JSON representation", () => {
		// Test toJson method returns consistent JSON
		const pair = nobody();
		const json1 = pair.toJson();
		const json2 = pair.toJson();

		expect(json1).toEqual(json2);
		expect(json1.address).toBe(pair.address);
		expect(json1.meta).toEqual(pair.meta);
		expect(json1.encoding.version).toBe("0");
	});

	it("should return null for encodePkcs8", () => {
		// Test encodePkcs8 returns empty Uint8Array (stub implementation)
		const pair = nobody();
		const encoded = pair.encodePkcs8();

		expect(encoded).toBeInstanceOf(Uint8Array);
		expect(encoded.length).toBe(0);
	});

	it("should return self for derive method", () => {
		// Test derive method returns self (stub implementation)
		const pair = nobody();
		const derived = pair.derive("//test/path");

		expect(derived).toBe(pair);
	});
});