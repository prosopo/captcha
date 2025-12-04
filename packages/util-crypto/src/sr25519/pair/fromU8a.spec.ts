// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, expectTypeOf, it } from "vitest";
import type { Keypair } from "../../types.js";
import { randomAsU8a } from "../../random/asU8a.js";
import { sr25519FromSeed } from "./fromSeed.js";
import { sr25519KeypairToU8a } from "./toU8a.js";
import { sr25519PairFromU8a } from "./fromU8a.js";

describe("sr25519PairFromU8a", (): void => {
	it("creates keypair from 96-byte Uint8Array", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const full = sr25519KeypairToU8a(pair);

		const restored = sr25519PairFromU8a(full);

		expect(restored.publicKey).toEqual(pair.publicKey);
		expect(restored.secretKey).toEqual(pair.secretKey);
	});

	it("round-trips with toU8a", (): void => {
		const seed = randomAsU8a();
		const original = sr25519FromSeed(seed);
		const u8a = sr25519KeypairToU8a(original);
		const restored = sr25519PairFromU8a(u8a);

		expect(restored.publicKey).toEqual(original.publicKey);
		expect(restored.secretKey).toEqual(original.secretKey);
	});

	it("throws error for wrong length", (): void => {
		const wrongLength = new Uint8Array(95);

		expect(() => sr25519PairFromU8a(wrongLength)).toThrow(
			/Expected keypair with 96 bytes/,
		);
	});

	it("throws error for too long array", (): void => {
		const tooLong = new Uint8Array(97);

		expect(() => sr25519PairFromU8a(tooLong)).toThrow(
			/Expected keypair with 96 bytes/,
		);
	});

	it("works with string input", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const full = sr25519KeypairToU8a(pair);
		const hexString = `0x${Array.from(full)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("")}`;

		const restored = sr25519PairFromU8a(hexString);

		expect(restored.publicKey).toEqual(pair.publicKey);
		expect(restored.secretKey).toEqual(pair.secretKey);
	});

	it("correctly splits secret and public key", (): void => {
		const secretKey = new Uint8Array(64).fill(1);
		const publicKey = new Uint8Array(32).fill(2);
		const full = new Uint8Array([...secretKey, ...publicKey]);

		const pair = sr25519PairFromU8a(full);

		expect(pair.secretKey).toEqual(secretKey);
		expect(pair.publicKey).toEqual(publicKey);
	});
});

describe("sr25519PairFromU8a types", (): void => {
	it("returns Keypair", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const full = sr25519KeypairToU8a(pair);
		const result = sr25519PairFromU8a(full);
		expectTypeOf(result).toMatchTypeOf<Keypair>();
		expectTypeOf(result).not.toBeAny();
	});

	it("accepts string or Uint8Array", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const full = sr25519KeypairToU8a(pair);
		expectTypeOf(sr25519PairFromU8a).parameter(0).toEqualTypeOf<
			string | Uint8Array
		>();
	});

	it("result has correct Keypair structure", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const full = sr25519KeypairToU8a(pair);
		const result = sr25519PairFromU8a(full);
		expectTypeOf(result.publicKey).toEqualTypeOf<Uint8Array>();
		expectTypeOf(result.secretKey).toEqualTypeOf<Uint8Array>();
	});
});

