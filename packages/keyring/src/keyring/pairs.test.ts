// Copyright 2021-2026 Prosopo (UK) Ltd.
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

import type { KeyringPair } from "@prosopo/types";
import { decodeAddress, encodeAddress } from "@prosopo/util-crypto";
import { describe, expect, it } from "vitest";
import { nobody } from "../pair/nobody.js";
import { Pairs } from "./pairs.js";

/**
 * A pair is stored under `decodeAddress(pair.address).toString()`, which is the
 * comma-joined bytes of the public key. Only `address` and `publicKey` are read
 * by `Pairs`, so the inert `nobody` pair supplies the rest of the surface.
 */
const stubPair = (publicKey: Uint8Array): KeyringPair => ({
	...nobody(),
	address: encodeAddress(publicKey, 42),
	addressRaw: publicKey,
	publicKey,
});

const keyOf = (byte: number): Uint8Array => new Uint8Array(32).fill(byte);

describe("Pairs", () => {
	it("returns the pair it was given, so callers can chain off add", () => {
		const pairs = new Pairs();
		const pair = stubPair(keyOf(1));
		expect(pairs.add(pair)).toBe(pair);
	});

	it("starts empty", () => {
		expect(new Pairs().all()).toEqual([]);
	});

	it("retrieves a pair by SS58 address, public key or raw bytes", () => {
		const pairs = new Pairs();
		const publicKey = keyOf(2);
		const pair = pairs.add(stubPair(publicKey));

		expect(pairs.get(pair.address)).toBe(pair);
		expect(pairs.get(publicKey)).toBe(pair);
		// A different SS58 prefix decodes to the same public key, so it must
		// find the same pair — the map is keyed on bytes, not on the string.
		expect(pairs.get(encodeAddress(publicKey, 2))).toBe(pair);
	});

	it("keeps only the latest pair for a public key", () => {
		const pairs = new Pairs();
		const publicKey = keyOf(3);
		pairs.add(stubPair(publicKey));
		const second = stubPair(publicKey);
		pairs.add(second);

		expect(pairs.all()).toHaveLength(1);
		expect(pairs.get(publicKey)).toBe(second);
	});

	it("keeps distinct public keys apart", () => {
		const pairs = new Pairs();
		const first = pairs.add(stubPair(keyOf(4)));
		const second = pairs.add(stubPair(keyOf(5)));

		expect(pairs.all()).toEqual([first, second]);
		expect(pairs.get(first.address)).toBe(first);
		expect(pairs.get(second.address)).toBe(second);
	});

	it("names the address it could not find, formatting bytes as hex", () => {
		const pairs = new Pairs();
		// A caller debugging a missing key needs to see which key was asked
		// for; a bare "not found" would be useless.
		expect(() => pairs.get(keyOf(6))).toThrow(
			`Unable to retrieve keypair '0x${"06".repeat(32)}'`,
		);
	});

	it("names the address verbatim when it was given as SS58", () => {
		const address = encodeAddress(keyOf(7), 42);
		expect(() => new Pairs().get(address)).toThrow(
			`Unable to retrieve keypair '${address}'`,
		);
	});

	it("rejects an address that is not decodable at all", () => {
		expect(() => new Pairs().get("not-an-address")).toThrow();
	});

	it("removes a pair, after which lookup throws again", () => {
		const pairs = new Pairs();
		const publicKey = keyOf(8);
		pairs.add(stubPair(publicKey));
		pairs.remove(publicKey);

		expect(pairs.all()).toEqual([]);
		expect(() => pairs.get(publicKey)).toThrow("Unable to retrieve keypair");
	});

	it("removes by any encoding of the same key", () => {
		const pairs = new Pairs();
		const publicKey = keyOf(9);
		const pair = pairs.add(stubPair(publicKey));
		pairs.remove(encodeAddress(publicKey, 2));
		expect(pairs.all()).toEqual([]);
		expect(pair.address).toBe(encodeAddress(publicKey, 42));
	});

	it("ignores removal of a key that was never added", () => {
		const pairs = new Pairs();
		const kept = pairs.add(stubPair(keyOf(10)));
		expect(() => pairs.remove(keyOf(11))).not.toThrow();
		expect(pairs.all()).toEqual([kept]);
	});

	it("decodes the address for the map key rather than trusting the string", () => {
		// Guards the assumption the class is built on: two encodings of one
		// key must decode to identical bytes.
		const publicKey = keyOf(12);
		expect(decodeAddress(encodeAddress(publicKey, 42)).toString()).toBe(
			decodeAddress(encodeAddress(publicKey, 2)).toString(),
		);
	});
});
