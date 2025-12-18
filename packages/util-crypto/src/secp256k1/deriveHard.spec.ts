// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, expectTypeOf, it } from "vitest";
import { randomAsU8a } from "../random/asU8a.js";
import { secp256k1DeriveHard } from "./deriveHard.js";

describe("secp256k1DeriveHard", (): void => {
	it("derives seed from seed and chain code", (): void => {
		const seed = randomAsU8a(32);
		const chainCode = new Uint8Array(32).fill(1);

		const derived = secp256k1DeriveHard(seed, chainCode);

		expect(derived).toHaveLength(32);
		expect(derived).not.toEqual(seed);
	});

	it("produces different seeds for different chain codes", (): void => {
		const seed = randomAsU8a(32);
		const chainCode1 = new Uint8Array(32).fill(1);
		const chainCode2 = new Uint8Array(32).fill(2);

		const derived1 = secp256k1DeriveHard(seed, chainCode1);
		const derived2 = secp256k1DeriveHard(seed, chainCode2);

		expect(derived1).not.toEqual(derived2);
	});

	it("produces same seed for same inputs", (): void => {
		const seed = randomAsU8a(32);
		const chainCode = new Uint8Array(32).fill(1);

		const derived1 = secp256k1DeriveHard(seed, chainCode);
		const derived2 = secp256k1DeriveHard(seed, chainCode);

		expect(derived1).toEqual(derived2);
	});

	it("throws error for invalid chain code length", (): void => {
		const seed = randomAsU8a(32);
		const invalidChainCode = new Uint8Array(31); // Wrong length

		expect(() => secp256k1DeriveHard(seed, invalidChainCode)).toThrow(
			/Invalid chainCode/,
		);
	});

	it("produces deterministic output", (): void => {
		const seed = new Uint8Array(32).fill(0x42);
		const chainCode = new Uint8Array(32).fill(0x01);

		const derived1 = secp256k1DeriveHard(seed, chainCode);
		const derived2 = secp256k1DeriveHard(seed, chainCode);

		expect(derived1).toEqual(derived2);
	});

	it("works with different seed values", (): void => {
		const seed1 = new Uint8Array(32).fill(0x01);
		const seed2 = new Uint8Array(32).fill(0x02);
		const chainCode = new Uint8Array(32).fill(0x01);

		const derived1 = secp256k1DeriveHard(seed1, chainCode);
		const derived2 = secp256k1DeriveHard(seed2, chainCode);

		expect(derived1).not.toEqual(derived2);
	});
});

describe("secp256k1DeriveHard types", (): void => {
	it("returns Uint8Array", (): void => {
		const seed = randomAsU8a(32);
		const chainCode = new Uint8Array(32).fill(1);
		const result = secp256k1DeriveHard(seed, chainCode);
		expectTypeOf(result).toEqualTypeOf<Uint8Array>();
		expectTypeOf(result).not.toBeAny();
	});

	it("accepts Uint8Array parameters", (): void => {
		const seed = new Uint8Array(32);
		const chainCode = new Uint8Array(32);
		expectTypeOf(secp256k1DeriveHard).parameter(0).toEqualTypeOf<Uint8Array>();
		expectTypeOf(secp256k1DeriveHard).parameter(1).toEqualTypeOf<Uint8Array>();
	});
});
