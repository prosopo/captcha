// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, expectTypeOf, it } from "vitest";
import type { ScryptParams } from "./types.js";
import { DEFAULT_PARAMS } from "./defaults.js";
import { scryptFromU8a } from "./fromU8a.js";
import { scryptToU8a } from "./toU8a.js";

describe("scryptToU8a", (): void => {
	it("converts salt and params to Uint8Array", (): void => {
		const salt = new Uint8Array(32).fill(1);
		const params = DEFAULT_PARAMS;

		const result = scryptToU8a(salt, params);

		expect(result).toHaveLength(32 + 4 + 4 + 4); // salt + N + p + r
		expect(result.subarray(0, 32)).toEqual(salt);
	});

	it("round-trips with fromU8a", (): void => {
		const salt = new Uint8Array(32).fill(0x42);
		const params = DEFAULT_PARAMS;

		const u8a = scryptToU8a(salt, params);
		const extracted = scryptFromU8a(u8a);

		expect(extracted.salt).toEqual(salt);
		expect(extracted.params).toEqual(params);
	});

	it("encodes params in little-endian format", (): void => {
		const salt = new Uint8Array(32).fill(0);
		const params = DEFAULT_PARAMS;

		const result = scryptToU8a(salt, params);

		// Check that N (32768 = 0x8000) is encoded correctly
		const nBytes = result.subarray(32, 36);
		expect(nBytes[0]).toBe(0x00);
		expect(nBytes[1]).toBe(0x80);
		expect(nBytes[2]).toBe(0x00);
		expect(nBytes[3]).toBe(0x00);
	});

	it("works with different salt values", (): void => {
		const salt1 = new Uint8Array(32).fill(0x01);
		const salt2 = new Uint8Array(32).fill(0x02);
		const params = DEFAULT_PARAMS;

		const result1 = scryptToU8a(salt1, params);
		const result2 = scryptToU8a(salt2, params);

		expect(result1.subarray(0, 32)).not.toEqual(result2.subarray(0, 32));
		expect(result1.subarray(32)).toEqual(result2.subarray(32)); // Params should be same
	});

	it("produces correct total length", (): void => {
		const salt = new Uint8Array(32);
		const params = DEFAULT_PARAMS;

		const result = scryptToU8a(salt, params);

		// 32 (salt) + 4 (N) + 4 (p) + 4 (r) = 44
		expect(result.length).toBe(44);
	});
});

describe("scryptToU8a types", (): void => {
	it("returns Uint8Array", (): void => {
		const salt = new Uint8Array(32);
		const params = DEFAULT_PARAMS;
		const result = scryptToU8a(salt, params);
		expectTypeOf(result).toEqualTypeOf<Uint8Array>();
		expectTypeOf(result).not.toBeAny();
	});

	it("accepts correct parameter types", (): void => {
		const salt = new Uint8Array(32);
		const params: ScryptParams = DEFAULT_PARAMS;
		expectTypeOf(scryptToU8a).parameter(0).toEqualTypeOf<Uint8Array>();
		expectTypeOf(scryptToU8a).parameter(1).toMatchTypeOf<ScryptParams>();
	});
});

