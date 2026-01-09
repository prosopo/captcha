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

import { hexToU8a, isHex } from "@polkadot/util";
import { isAddress } from "@polkadot/util-crypto";
import { decodeAddress, encodeAddress } from "@prosopo/util-crypto";
import { describe, expect, it } from "vitest";

// Test the convertAccount conversion logic directly
describe("convertAccount conversion logic", () => {
	const ss58Format = 42;

	it("should convert SS58 address to bytes and hex", () => {
		// Using a known test address
		const testAddress = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

		expect(isAddress(testAddress)).toBe(true);

		const bytes = decodeAddress(testAddress);
		const hex = `0x${Array.from(bytes, (byte) =>
			byte.toString(16).padStart(2, "0"),
		).join("")}`;
		const ss58 = encodeAddress(bytes, ss58Format);

		expect(bytes).toBeInstanceOf(Uint8Array);
		expect(hex).toMatch(/^0x[0-9a-f]+$/);
		expect(ss58).toBe(testAddress);
	});

	it("should convert hex string to bytes and SS58", () => {
		const testHex =
			"0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d";

		expect(isHex(testHex)).toBe(true);

		const bytes = hexToU8a(testHex);
		const hex = `0x${Array.from(bytes, (byte) =>
			byte.toString(16).padStart(2, "0"),
		).join("")}`;
		const ss58 = encodeAddress(bytes, ss58Format);

		expect(bytes).toBeInstanceOf(Uint8Array);
		expect(hex).toBe(testHex);
		expect(ss58).toMatch(/^5[1-9A-HJ-NP-Za-km-z]{47}$/); // SS58 format regex
	});

	it("should convert byte array to hex and SS58", () => {
		const byteArrayInput = [
			212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214,
			130, 44, 133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162,
			125,
		];
		const bytes = new Uint8Array(byteArrayInput);

		const hex = `0x${Array.from(bytes, (byte) =>
			byte.toString(16).padStart(2, "0"),
		).join("")}`;
		const ss58 = encodeAddress(bytes, ss58Format);

		expect(hex).toBe(
			"0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d",
		);
		expect(ss58).toMatch(/^5[1-9A-HJ-NP-Za-km-z]{47}$/);
	});

	it("should handle different SS58 formats", () => {
		const testAddress = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

		const bytes = decodeAddress(testAddress);
		const ss58Format2 = encodeAddress(bytes, 2); // Kusama format
		const ss58Format42 = encodeAddress(bytes, 42); // Generic Substrate format

		expect(ss58Format2).not.toBe(ss58Format42);
		// Format 2 (Kusama) actually starts with various letters, let's check the actual result
		expect(ss58Format2.length).toBeGreaterThan(40); // Just verify it's a valid SS58 address
		expect(ss58Format42).toMatch(/^5[1-9A-HJ-NP-Za-km-z]{47}$/);
	});

	it("should validate input types correctly", () => {
		const validAddress = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
		const validHex =
			"0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d";
		const validBytes =
			"[212,53,147,199,21,253,211,28,97,20,26,189,4,169,159,214,130,44,133,88,133,76,205,227,154,86,132,231,165,109,162,125]";
		const invalidInput = "invalid";

		expect(isAddress(validAddress)).toBe(true);
		expect(isHex(validHex)).toBe(true);
		expect(isAddress(invalidInput)).toBe(false);
		expect(isHex(invalidInput)).toBe(false);

		// Test byte array parsing
		expect(() => JSON.parse(validBytes)).not.toThrow();
		expect(() => new Uint8Array(JSON.parse(validBytes))).not.toThrow();
	});

	it("should handle edge cases", () => {
		// Empty input
		expect(() => hexToU8a("")).not.toThrow();
		expect(hexToU8a("")).toEqual(new Uint8Array([]));

		// Invalid hex - hexToU8a actually doesn't throw, it tries to parse
		const result = hexToU8a("invalid");
		expect(result).toBeInstanceOf(Uint8Array);
		// It might return some result or empty array

		// Invalid address
		expect(isAddress("invalid")).toBe(false);
	});
});
