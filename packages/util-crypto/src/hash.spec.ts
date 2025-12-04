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

import { isHex } from "@polkadot/util";
import { describe, expect, expectTypeOf, it } from "vitest";
import { hexHash, hexHashArray, HEX_HASH_BIT_LENGTH } from "./hash.js";

describe("hexHash", (): void => {
	it("returns a hex string", (): void => {
		const result = hexHash("test");
		expect(isHex(result)).toBe(true);
	});

	it("returns a 256-bit hash by default", (): void => {
		const result = hexHash("test");
		// 256 bits = 32 bytes = 64 hex chars + 2 for 0x = 66 chars
		expect(result).toHaveLength(66);
	});

	it("returns different hashes for different inputs", (): void => {
		const hash1 = hexHash("test1");
		const hash2 = hexHash("test2");
		expect(hash1).not.toEqual(hash2);
	});

	it("returns the same hash for the same input", (): void => {
		const hash1 = hexHash("test");
		const hash2 = hexHash("test");
		expect(hash1).toEqual(hash2);
	});

	it("works with Uint8Array input", (): void => {
		const input = new Uint8Array([1, 2, 3, 4, 5]);
		const result = hexHash(input);
		expect(isHex(result)).toBe(true);
		expect(result).toHaveLength(66);
	});

	it("works with different bit lengths", (): void => {
		const input = "test";
		const hash64 = hexHash(input, 64);
		const hash128 = hexHash(input, 128);
		const hash256 = hexHash(input, 256);
		const hash384 = hexHash(input, 384);
		const hash512 = hexHash(input, 512);

		// 64 bits = 8 bytes = 16 hex chars + 2 = 18
		expect(hash64).toHaveLength(18);
		// 128 bits = 16 bytes = 32 hex chars + 2 = 34
		expect(hash128).toHaveLength(34);
		// 256 bits = 32 bytes = 64 hex chars + 2 = 66
		expect(hash256).toHaveLength(66);
		// 384 bits = 48 bytes = 96 hex chars + 2 = 98
		expect(hash384).toHaveLength(98);
		// 512 bits = 64 bytes = 128 hex chars + 2 = 130
		expect(hash512).toHaveLength(130);
	});

	it("produces different hashes for different bit lengths", (): void => {
		const input = "test";
		const hash256 = hexHash(input, 256);
		const hash512 = hexHash(input, 512);
		expect(hash256).not.toEqual(hash512);
	});
});

describe("hexHashArray", (): void => {
	it("returns a hex string", (): void => {
		const result = hexHashArray(["a", "b", "c"]);
		expect(isHex(result)).toBe(true);
	});

	it("returns a 256-bit hash by default", (): void => {
		const result = hexHashArray(["a", "b", "c"]);
		expect(result).toHaveLength(66);
	});

	it("joins array elements before hashing", (): void => {
		const hash1 = hexHashArray(["a", "b", "c"]);
		const hash2 = hexHash("abc");
		expect(hash1).toEqual(hash2);
	});

	it("returns different hashes for different arrays", (): void => {
		const hash1 = hexHashArray(["a", "b"]);
		const hash2 = hexHashArray(["a", "b", "c"]);
		expect(hash1).not.toEqual(hash2);
	});

	it("returns the same hash for the same array", (): void => {
		const hash1 = hexHashArray(["a", "b", "c"]);
		const hash2 = hexHashArray(["a", "b", "c"]);
		expect(hash1).toEqual(hash2);
	});

	it("works with empty array", (): void => {
		const result = hexHashArray([]);
		expect(isHex(result)).toBe(true);
		expect(result).toHaveLength(66);
	});

	it("works with numbers in array", (): void => {
		const hash1 = hexHashArray(["1", "2", "3"]);
		const hash2 = hexHash("123");
		expect(hash1).toEqual(hash2);
	});
});

describe("HEX_HASH_BIT_LENGTH", (): void => {
	it("is 256", (): void => {
		expect(HEX_HASH_BIT_LENGTH).toBe(256);
	});
});

describe("hash types", (): void => {
	it("hexHash returns string", (): void => {
		const result = hexHash("test");
		expectTypeOf(result).toBeString();
		expectTypeOf(result).not.toBeAny();
	});

	it("hexHash accepts string or Uint8Array", (): void => {
		expectTypeOf(hexHash).parameter(0).toEqualTypeOf<string | Uint8Array>();
		expectTypeOf(hexHash).parameter(1).toEqualTypeOf<
			256 | 512 | 64 | 128 | 384 | undefined
		>();
	});

	it("hexHashArray returns string", (): void => {
		const result = hexHashArray(["a", "b"]);
		expectTypeOf(result).toBeString();
		expectTypeOf(result).not.toBeAny();
	});

	it("hexHashArray accepts array", (): void => {
		expectTypeOf(hexHashArray).parameter(0).toEqualTypeOf<unknown[]>();
	});
});

