// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, expectTypeOf, it } from "vitest";
import { randomAsU8a } from "../random/asU8a.js";
import { sr25519DerivePublic } from "./derivePublic.js";
import { sr25519FromSeed } from "./pair/fromSeed.js";

describe("sr25519DerivePublic", (): void => {
	it("derives public key from public key and chain code", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const chainCode = new Uint8Array(32).fill(1);

		const derivedPublic = sr25519DerivePublic(pair.publicKey, chainCode);

		expect(derivedPublic).toHaveLength(32);
		expect(derivedPublic).not.toEqual(pair.publicKey);
	});

	it("produces different keys for different chain codes", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const chainCode1 = new Uint8Array(32).fill(1);
		const chainCode2 = new Uint8Array(32).fill(2);

		const derived1 = sr25519DerivePublic(pair.publicKey, chainCode1);
		const derived2 = sr25519DerivePublic(pair.publicKey, chainCode2);

		expect(derived1).not.toEqual(derived2);
	});

	it("produces same key for same chain code", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const chainCode = new Uint8Array(32).fill(1);

		const derived1 = sr25519DerivePublic(pair.publicKey, chainCode);
		const derived2 = sr25519DerivePublic(pair.publicKey, chainCode);

		expect(derived1).toEqual(derived2);
	});

	it("works with string public key", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const chainCode = new Uint8Array(32).fill(1);
		const publicKeyHex = `0x${Array.from(pair.publicKey)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("")}`;

		const derived1 = sr25519DerivePublic(pair.publicKey, chainCode);
		const derived2 = sr25519DerivePublic(publicKeyHex, chainCode);

		expect(derived1).toEqual(derived2);
	});

	it("throws error for invalid chain code length", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const invalidChainCode = new Uint8Array(31); // Wrong length

		expect(() => sr25519DerivePublic(pair.publicKey, invalidChainCode)).toThrow(
			/Invalid chainCode/,
		);
	});

	it("throws error for invalid public key length", (): void => {
		const invalidPublicKey = new Uint8Array(31); // Wrong length
		const chainCode = new Uint8Array(32).fill(1);

		expect(() => sr25519DerivePublic(invalidPublicKey, chainCode)).toThrow(
			/Invalid publicKey/,
		);
	});
});

describe("sr25519DerivePublic types", (): void => {
	it("returns Uint8Array", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const chainCode = new Uint8Array(32).fill(1);
		const result = sr25519DerivePublic(pair.publicKey, chainCode);
		expectTypeOf(result).toEqualTypeOf<Uint8Array>();
		expectTypeOf(result).not.toBeAny();
	});

	it("accepts string or Uint8Array for publicKey", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const chainCode = new Uint8Array(32);
		expectTypeOf(sr25519DerivePublic)
			.parameter(0)
			.toEqualTypeOf<string | Uint8Array>();
		expectTypeOf(sr25519DerivePublic).parameter(1).toEqualTypeOf<Uint8Array>();
	});
});
