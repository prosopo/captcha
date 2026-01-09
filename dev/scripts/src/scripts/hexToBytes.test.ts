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

import { hexToU8a } from "@polkadot/util";
import { describe, expect, it } from "vitest";

// Test the hexToBytes conversion logic directly
describe("hexToBytes conversion logic", () => {
	it("should convert hex string to byte array", () => {
		const testHex = "deadbeef";
		const result = hexToU8a(testHex);

		expect(result).toEqual(Uint8Array.from([222, 173, 190, 239]));
	});

	it("should convert hex string with 0x prefix", () => {
		const testHex = "0xdeadbeef";
		const result = hexToU8a(testHex);

		expect(result).toEqual(Uint8Array.from([222, 173, 190, 239]));
	});

	it("should handle empty hex string", () => {
		const testHex = "";
		const result = hexToU8a(testHex);

		expect(result).toEqual(new Uint8Array([]));
	});

	it("should handle single byte", () => {
		const testHex = "ff";
		const result = hexToU8a(testHex);

		expect(result).toEqual(Uint8Array.from([255]));
	});

	it("should handle odd length hex string", () => {
		const testHex = "abc";
		const result = hexToU8a(testHex);

		expect(result).toEqual(Uint8Array.from([171, 192]));
	});

	it("should handle uppercase hex", () => {
		const testHex = "DEADBEEF";
		const result = hexToU8a(testHex);

		expect(result).toEqual(Uint8Array.from([222, 173, 190, 239]));
	});

	it("should handle mixed case hex", () => {
		const testHex = "DeAdBeEf";
		const result = hexToU8a(testHex);

		expect(result).toEqual(Uint8Array.from([222, 173, 190, 239]));
	});

	it("should handle long hex strings", () => {
		const testHex = "0102030405060708090a0b0c0d0e0f";
		const result = hexToU8a(testHex);

		expect(result).toEqual(
			Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
		);
	});

	it("should handle invalid hex gracefully", () => {
		const testHex = "invalid";
		expect(() => hexToU8a(testHex)).not.toThrow();
	});
});
