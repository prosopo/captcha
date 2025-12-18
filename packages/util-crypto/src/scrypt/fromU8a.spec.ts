// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { bnToU8a, u8aConcat } from "@polkadot/util";
import { describe, expect, expectTypeOf, it } from "vitest";
import { BN_LE_32_OPTS } from "../bn.js";
import { DEFAULT_PARAMS } from "./defaults.js";
import { scryptFromU8a } from "./fromU8a.js";
import type { ScryptParams } from "./types.js";

describe("scryptFromU8a", (): void => {
	it("extracts scrypt params and salt from Uint8Array", (): void => {
		const salt = new Uint8Array(32).fill(1);
		const params = DEFAULT_PARAMS;
		const data = u8aConcat(
			salt,
			bnToU8a(params.N, BN_LE_32_OPTS),
			bnToU8a(params.p, BN_LE_32_OPTS),
			bnToU8a(params.r, BN_LE_32_OPTS),
		);

		const result = scryptFromU8a(data);

		expect(result.salt).toEqual(salt);
		expect(result.params).toEqual(params);
	});

	it("throws error for invalid params", (): void => {
		const salt = new Uint8Array(32).fill(1);
		const invalidParams = { N: 1 << 14, p: 1, r: 8 }; // Different N
		const data = u8aConcat(
			salt,
			bnToU8a(invalidParams.N, BN_LE_32_OPTS),
			bnToU8a(invalidParams.p, BN_LE_32_OPTS),
			bnToU8a(invalidParams.r, BN_LE_32_OPTS),
		);

		expect(() => scryptFromU8a(data)).toThrow(/Invalid injected scrypt params/);
	});

	it("throws error for invalid p param", (): void => {
		const salt = new Uint8Array(32).fill(1);
		const invalidParams = { N: DEFAULT_PARAMS.N, p: 2, r: 8 }; // Different p
		const data = u8aConcat(
			salt,
			bnToU8a(invalidParams.N, BN_LE_32_OPTS),
			bnToU8a(invalidParams.p, BN_LE_32_OPTS),
			bnToU8a(invalidParams.r, BN_LE_32_OPTS),
		);

		expect(() => scryptFromU8a(data)).toThrow(/Invalid injected scrypt params/);
	});

	it("throws error for invalid r param", (): void => {
		const salt = new Uint8Array(32).fill(1);
		const invalidParams = { N: DEFAULT_PARAMS.N, p: 1, r: 16 }; // Different r
		const data = u8aConcat(
			salt,
			bnToU8a(invalidParams.N, BN_LE_32_OPTS),
			bnToU8a(invalidParams.p, BN_LE_32_OPTS),
			bnToU8a(invalidParams.r, BN_LE_32_OPTS),
		);

		expect(() => scryptFromU8a(data)).toThrow(/Invalid injected scrypt params/);
	});

	it("extracts correct salt", (): void => {
		const salt = new Uint8Array(32).fill(0x42);
		const params = DEFAULT_PARAMS;
		const data = u8aConcat(
			salt,
			bnToU8a(params.N, BN_LE_32_OPTS),
			bnToU8a(params.p, BN_LE_32_OPTS),
			bnToU8a(params.r, BN_LE_32_OPTS),
		);

		const result = scryptFromU8a(data);

		expect(result.salt).toEqual(salt);
		expect(result.salt[0]).toBe(0x42);
		expect(result.salt[31]).toBe(0x42);
	});

	it("works with default params", (): void => {
		const salt = new Uint8Array(32).fill(1);
		const data = u8aConcat(
			salt,
			bnToU8a(DEFAULT_PARAMS.N, BN_LE_32_OPTS),
			bnToU8a(DEFAULT_PARAMS.p, BN_LE_32_OPTS),
			bnToU8a(DEFAULT_PARAMS.r, BN_LE_32_OPTS),
		);

		const result = scryptFromU8a(data);

		expect(result.params.N).toBe(DEFAULT_PARAMS.N);
		expect(result.params.p).toBe(DEFAULT_PARAMS.p);
		expect(result.params.r).toBe(DEFAULT_PARAMS.r);
	});
});

describe("scryptFromU8a types", (): void => {
	it("returns object with params and salt", (): void => {
		const salt = new Uint8Array(32).fill(1);
		const params = DEFAULT_PARAMS;
		const data = u8aConcat(
			salt,
			bnToU8a(params.N, BN_LE_32_OPTS),
			bnToU8a(params.p, BN_LE_32_OPTS),
			bnToU8a(params.r, BN_LE_32_OPTS),
		);
		const result = scryptFromU8a(data);
		expectTypeOf(result).toMatchTypeOf<{
			params: ScryptParams;
			salt: Uint8Array;
		}>();
		expectTypeOf(result).not.toBeAny();
		expectTypeOf(result.params).toMatchTypeOf<ScryptParams>();
		expectTypeOf(result.salt).toEqualTypeOf<Uint8Array>();
	});

	it("accepts Uint8Array", (): void => {
		const data = new Uint8Array(44);
		expectTypeOf(scryptFromU8a).parameter(0).toEqualTypeOf<Uint8Array>();
	});
});
