// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, expectTypeOf, it } from "vitest";
import type { Keypair } from "../types.js";
import { randomAsU8a } from "../random/asU8a.js";
import { sr25519FromSeed } from "./pair/fromSeed.js";
import { sr25519DeriveSoft } from "./deriveSoft.js";
import { sr25519DeriveHard } from "./deriveHard.js";

describe("sr25519DeriveSoft", (): void => {
	it("derives soft keypair", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const chainCode = new Uint8Array(32).fill(1);

		const derived = sr25519DeriveSoft(pair, chainCode);

		expect(derived.publicKey).toHaveLength(32);
		expect(derived.secretKey).toHaveLength(64);
		expect(derived.publicKey).not.toEqual(pair.publicKey);
		expect(derived.secretKey).not.toEqual(pair.secretKey);
	});

	it("produces different keys for different chain codes", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const chainCode1 = new Uint8Array(32).fill(1);
		const chainCode2 = new Uint8Array(32).fill(2);

		const derived1 = sr25519DeriveSoft(pair, chainCode1);
		const derived2 = sr25519DeriveSoft(pair, chainCode2);

		expect(derived1.publicKey).not.toEqual(derived2.publicKey);
		expect(derived1.secretKey).not.toEqual(derived2.secretKey);
	});

	it("produces same key for same chain code", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const chainCode = new Uint8Array(32).fill(1);

		const derived1 = sr25519DeriveSoft(pair, chainCode);
		const derived2 = sr25519DeriveSoft(pair, chainCode);

		expect(derived1.publicKey).toEqual(derived2.publicKey);
		expect(derived1.secretKey).toEqual(derived2.secretKey);
	});

	it("throws error for invalid chain code length", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const invalidChainCode = new Uint8Array(31); // Wrong length

		expect(() => sr25519DeriveSoft(pair, invalidChainCode)).toThrow(
			/Invalid chainCode/,
		);
	});

	it("produces different keys than hard derivation", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const chainCode = new Uint8Array(32).fill(1);

		const softDerived = sr25519DeriveSoft(pair, chainCode);
		const hardDerived = sr25519DeriveHard(pair, chainCode);

		expect(softDerived.publicKey).not.toEqual(hardDerived.publicKey);
		expect(softDerived.secretKey).not.toEqual(hardDerived.secretKey);
	});
});

describe("sr25519DeriveSoft types", (): void => {
	it("returns Keypair", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const chainCode = new Uint8Array(32).fill(1);
		const result = sr25519DeriveSoft(pair, chainCode);
		expectTypeOf(result).toMatchTypeOf<Keypair>();
		expectTypeOf(result).not.toBeAny();
	});

	it("accepts correct parameter types", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const chainCode = new Uint8Array(32);
		expectTypeOf(sr25519DeriveSoft).parameter(0).toMatchTypeOf<Keypair>();
		expectTypeOf(sr25519DeriveSoft).parameter(1).toEqualTypeOf<Uint8Array>();
	});
});

