// Copyright 2017-2025 @polkadot/util-crypto authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, expectTypeOf, it } from "vitest";
import { randomAsU8a } from "../random/asU8a.js";
import { sr25519FromSeed } from "../sr25519/pair/fromSeed.js";
import type { Keypair, KeypairType } from "../types.js";
import { DeriveJunction } from "./DeriveJunction.js";
import { keyFromPath } from "./fromPath.js";

describe("keyFromPath", (): void => {
	it("derives keypair from path with sr25519", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const path: DeriveJunction[] = [
			DeriveJunction.from("0"),
			DeriveJunction.from("/1"),
		];

		const derived = keyFromPath(pair, path, "sr25519");

		expect(derived.publicKey).toHaveLength(32);
		expect(derived.secretKey).toHaveLength(64);
		expect(derived.publicKey).not.toEqual(pair.publicKey);
	});

	it("derives keypair from empty path", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const path: DeriveJunction[] = [];

		const derived = keyFromPath(pair, path, "sr25519");

		expect(derived.publicKey).toEqual(pair.publicKey);
		expect(derived.secretKey).toEqual(pair.secretKey);
	});

	it("derives keypair from multiple junctions", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const path: DeriveJunction[] = [
			DeriveJunction.from("0"),
			DeriveJunction.from("/1"),
			DeriveJunction.from("2"),
			DeriveJunction.from("/3"),
		];

		const derived = keyFromPath(pair, path, "sr25519");

		expect(derived.publicKey).toHaveLength(32);
		expect(derived.secretKey).toHaveLength(64);
	});

	it("throws error for invalid type", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const path: DeriveJunction[] = [DeriveJunction.from("0")];

		// biome-ignore lint/suspicious/noExplicitAny: Testing invalid type error
		expect(() => keyFromPath(pair, path, "" as any)).toThrow(/Invalid type/);
	});

	it("throws error for unsupported type (ecdsa)", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const path: DeriveJunction[] = [DeriveJunction.from("0")];

		expect(() => keyFromPath(pair, path, "ecdsa")).toThrow(
			/ECDSA key derivation/,
		);
	});

	it("throws error for unsupported type (ed25519)", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const path: DeriveJunction[] = [DeriveJunction.from("0")];

		expect(() => keyFromPath(pair, path, "ed25519")).toThrow(
			/ED25519 key derivation/,
		);
	});

	it("throws error for unsupported type (ethereum)", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const path: DeriveJunction[] = [DeriveJunction.from("0")];

		expect(() => keyFromPath(pair, path, "ethereum")).toThrow(
			/Ethereum key derivation/,
		);
	});

	it("produces different keys for different paths", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const path1: DeriveJunction[] = [DeriveJunction.from("0")];
		const path2: DeriveJunction[] = [DeriveJunction.from("1")];

		const derived1 = keyFromPath(pair, path1, "sr25519");
		const derived2 = keyFromPath(pair, path2, "sr25519");

		expect(derived1.publicKey).not.toEqual(derived2.publicKey);
		expect(derived1.secretKey).not.toEqual(derived2.secretKey);
	});

	it("throws error for unsupported keypair type", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const path: DeriveJunction[] = [DeriveJunction.from("0")];

		expect(() => keyFromPath(pair, path, "unsupported" as KeypairType)).toThrow(
			"Unsupported keypair type: unsupported",
		);
	});
});

describe("keyFromPath types", (): void => {
	it("returns Keypair", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const path: DeriveJunction[] = [DeriveJunction.from("0")];
		const result = keyFromPath(pair, path, "sr25519");
		expectTypeOf(result).toMatchTypeOf<Keypair>();
		expectTypeOf(result).not.toBeAny();
	});

	it("accepts correct parameter types", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const path: DeriveJunction[] = [];
		expectTypeOf(keyFromPath).parameter(0).toMatchTypeOf<Keypair>();
		expectTypeOf(keyFromPath).parameter(1).toEqualTypeOf<DeriveJunction[]>();
		expectTypeOf(keyFromPath).parameter(2).toEqualTypeOf<KeypairType>();
	});

	it("result has correct Keypair structure", (): void => {
		const seed = randomAsU8a();
		const pair = sr25519FromSeed(seed);
		const result = keyFromPath(pair, [], "sr25519");
		expectTypeOf(result.publicKey).toEqualTypeOf<Uint8Array>();
		expectTypeOf(result.secretKey).toEqualTypeOf<Uint8Array>();
	});
});
