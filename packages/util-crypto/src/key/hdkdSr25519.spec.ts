// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, expectTypeOf, it } from "vitest";
import type { Keypair } from "../types.js";
import { randomAsU8a } from "../random/asU8a.js";
import { sr25519FromSeed } from "../sr25519/pair/fromSeed.js";
import { DeriveJunction } from "./DeriveJunction.js";
import { keyHdkdSr25519 } from "./hdkdSr25519.js";

describe("keyHdkdSr25519", (): void => {
	it("derives soft junction", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const junction = DeriveJunction.from("0");

		const derived = keyHdkdSr25519(pair, junction);

		expect(derived.publicKey).toHaveLength(32);
		expect(derived.secretKey).toHaveLength(64);
		expect(derived.publicKey).not.toEqual(pair.publicKey);
	});

	it("derives hard junction", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const junction = DeriveJunction.from("/1");

		const derived = keyHdkdSr25519(pair, junction);

		expect(derived.publicKey).toHaveLength(32);
		expect(derived.secretKey).toHaveLength(64);
		expect(derived.publicKey).not.toEqual(pair.publicKey);
	});

	it("produces different keys for soft vs hard", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const softJunction = DeriveJunction.from("0");
		const hardJunction = DeriveJunction.from("/0");

		const softDerived = keyHdkdSr25519(pair, softJunction);
		const hardDerived = keyHdkdSr25519(pair, hardJunction);

		expect(softDerived.publicKey).not.toEqual(hardDerived.publicKey);
		expect(softDerived.secretKey).not.toEqual(hardDerived.secretKey);
	});

	it("produces different keys for different chain codes", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const junction1 = DeriveJunction.from("0");
		const junction2 = DeriveJunction.from("1");

		const derived1 = keyHdkdSr25519(pair, junction1);
		const derived2 = keyHdkdSr25519(pair, junction2);

		expect(derived1.publicKey).not.toEqual(derived2.publicKey);
		expect(derived1.secretKey).not.toEqual(derived2.secretKey);
	});

	it("maintains keypair structure", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const junction = DeriveJunction.from("0");

		const derived = keyHdkdSr25519(pair, junction);

		expect(derived).toHaveProperty("publicKey");
		expect(derived).toHaveProperty("secretKey");
		expect(derived.publicKey).toBeInstanceOf(Uint8Array);
		expect(derived.secretKey).toBeInstanceOf(Uint8Array);
	});
});

describe("keyHdkdSr25519 types", (): void => {
	it("returns Keypair", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const junction = DeriveJunction.from("0");
		const result = keyHdkdSr25519(pair, junction);
		expectTypeOf(result).toMatchTypeOf<Keypair>();
		expectTypeOf(result).not.toBeAny();
	});

	it("accepts correct parameter types", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const junction = DeriveJunction.from("0");
		expectTypeOf(keyHdkdSr25519).parameter(0).toMatchTypeOf<Keypair>();
		expectTypeOf(keyHdkdSr25519).parameter(1).toMatchTypeOf<DeriveJunction>();
	});
});

