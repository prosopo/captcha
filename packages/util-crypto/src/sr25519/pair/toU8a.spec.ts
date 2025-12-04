// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, expectTypeOf, it } from "vitest";
import type { Keypair } from "../../types.js";
import { randomAsU8a } from "../../random/asU8a.js";
import { sr25519FromSeed } from "./fromSeed.js";
import { sr25519PairFromU8a } from "./fromU8a.js";
import { sr25519KeypairToU8a } from "./toU8a.js";

describe("sr25519KeypairToU8a", (): void => {
	it("converts keypair to 96-byte Uint8Array", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);

		const u8a = sr25519KeypairToU8a(pair);

		expect(u8a).toHaveLength(96); // 64 (secret) + 32 (public)
	});

	it("round-trips with fromU8a", (): void => {
		const seed = randomAsU8a();
		const original = sr25519FromSeed(seed);
		const u8a = sr25519KeypairToU8a(original);
		const restored = sr25519PairFromU8a(u8a);

		expect(restored.publicKey).toEqual(original.publicKey);
		expect(restored.secretKey).toEqual(original.secretKey);
	});

	it("concatenates secret and public key in correct order", (): void => {
		const secretKey = new Uint8Array(64).fill(1);
		const publicKey = new Uint8Array(32).fill(2);
		const pair = { secretKey, publicKey };

		const u8a = sr25519KeypairToU8a(pair);

		expect(u8a.subarray(0, 64)).toEqual(secretKey);
		expect(u8a.subarray(64, 96)).toEqual(publicKey);
	});

	it("produces different output for different keypairs", (): void => {
		const seed1 = randomAsU8a();
		const seed2 = randomAsU8a();
		const pair1 = sr25519FromSeed(seed1);
		const pair2 = sr25519FromSeed(seed2);

		const u8a1 = sr25519KeypairToU8a(pair1);
		const u8a2 = sr25519KeypairToU8a(pair2);

		expect(u8a1).not.toEqual(u8a2);
	});

	it("produces same output for same keypair", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);

		const u8a1 = sr25519KeypairToU8a(pair);
		const u8a2 = sr25519KeypairToU8a(pair);

		expect(u8a1).toEqual(u8a2);
	});
});

describe("sr25519KeypairToU8a types", (): void => {
	it("returns Uint8Array", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const result = sr25519KeypairToU8a(pair);
		expectTypeOf(result).toEqualTypeOf<Uint8Array>();
		expectTypeOf(result).not.toBeAny();
	});

	it("accepts Keypair", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		expectTypeOf(sr25519KeypairToU8a).parameter(0).toMatchTypeOf<Keypair>();
	});
});

