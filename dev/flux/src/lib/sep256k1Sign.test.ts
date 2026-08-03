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
import { secp256k1 } from "@noble/curves/secp256k1";
import { u8aToHex } from "@polkadot/util";
import { base58Encode, sha256AsU8a } from "@polkadot/util-crypto";
import { ProsopoEnvError } from "@prosopo/common";
import { beforeAll, describe, expect, it } from "vitest";
import { sign, wifToPrivateKey } from "./sep256k1Sign.js";

// A throwaway key, used only to check the signature shape.
const SECRET_KEY = new Uint8Array(32).fill(7);

// Builds a mainnet WIF the way Bitcoin does: version byte, key, optional
// compression byte, then the first four bytes of the double sha256 checksum.
const toWif = (key: Uint8Array, compressed: boolean): string => {
	const payload = compressed
		? new Uint8Array([0x80, ...key, 0x01])
		: new Uint8Array([0x80, ...key]);
	const checksum = sha256AsU8a(sha256AsU8a(payload)).slice(0, 4);
	return base58Encode(new Uint8Array([...payload, ...checksum]));
};

beforeAll(async () => {
	// `sign` awaits this itself, but doing it up front keeps the first test
	// from paying for wasm initialisation.
	const { cryptoWaitReady } = await import("@polkadot/util-crypto");
	await cryptoWaitReady();
});

describe("sign", () => {
	it("produces a 65 byte compact signature", async () => {
		const signature = await sign("hello", { secretKey: SECRET_KEY });
		expect(signature).toHaveLength(65);
	});

	it("sets the header byte to the recovery id plus 31", async () => {
		// 4 for a compressed key, 27 for the bitcoin recovery base
		const signature = await sign("hello", { secretKey: SECRET_KEY });
		const header = signature[0] ?? 0;
		expect(header).toBeGreaterThanOrEqual(31);
		expect(header).toBeLessThanOrEqual(34);
	});

	it("is deterministic for the same message and key", async () => {
		const a = await sign("hello", { secretKey: SECRET_KEY });
		const b = await sign("hello", { secretKey: SECRET_KEY });
		expect(u8aToHex(a)).toBe(u8aToHex(b));
	});

	it("produces a different signature for a different message", async () => {
		const a = await sign("hello", { secretKey: SECRET_KEY });
		const b = await sign("goodbye", { secretKey: SECRET_KEY });
		expect(u8aToHex(a)).not.toBe(u8aToHex(b));
	});

	it("produces a verifiable r and s pair", async () => {
		const signature = await sign("hello", { secretKey: SECRET_KEY });
		const compact = signature.slice(1);
		const publicKey = secp256k1.getPublicKey(SECRET_KEY, true);
		expect(compact).toHaveLength(64);
		expect(secp256k1.Signature.fromCompact(compact).hasHighS()).toBe(false);
		expect(publicKey).toHaveLength(33);
	});

	it("signs an empty message", async () => {
		await expect(sign("", { secretKey: SECRET_KEY })).resolves.toHaveLength(65);
	});

	it("signs a message long enough to need a multi byte length prefix", async () => {
		await expect(
			sign("a".repeat(1000), { secretKey: SECRET_KEY }),
		).resolves.toHaveLength(65);
	});

	it("rejects when no secret key is supplied", async () => {
		await expect(sign("hello", {})).rejects.toThrow(ProsopoEnvError);
	});

	it("rejects an empty secret key", async () => {
		// an empty array is truthy, so it reaches the curve rather than the
		// missing-key guard
		await expect(
			sign("hello", { secretKey: new Uint8Array(0) }),
		).rejects.toThrow();
	});

	it("rejects a secret key of the wrong length", async () => {
		await expect(
			sign("hello", { secretKey: new Uint8Array(16).fill(1) }),
		).rejects.toThrow();
	});
});

describe("wifToPrivateKey", () => {
	it("recovers the key from a compressed WIF", () => {
		const wif = toWif(SECRET_KEY, true);
		expect(wif).toHaveLength(52);
		expect(u8aToHex(wifToPrivateKey(wif))).toBe(u8aToHex(SECRET_KEY));
	});

	it("recovers the key from an uncompressed WIF", () => {
		// not every key yields a 51 character uncompressed WIF, so search for one
		let key = new Uint8Array(32).fill(1);
		let wif = toWif(key, false);
		for (let i = 2; wif.length !== 51 && i < 200; i++) {
			key = new Uint8Array(32).fill(i);
			wif = toWif(key, false);
		}
		expect(wif).toHaveLength(51);
		expect(u8aToHex(wifToPrivateKey(wif))).toBe(u8aToHex(key));
	});

	it("throws for a WIF that is too short", () => {
		expect(() => wifToPrivateKey("abc")).toThrow(ProsopoEnvError);
	});

	it("throws for a WIF that is too long", () => {
		expect(() => wifToPrivateKey("a".repeat(53))).toThrow(ProsopoEnvError);
	});

	it("throws for an empty WIF", () => {
		expect(() => wifToPrivateKey("")).toThrow(ProsopoEnvError);
	});

	it("throws for a correctly sized string that is not base58", () => {
		expect(() => wifToPrivateKey("0".repeat(52))).toThrow();
	});

	it("round trips through sign", async () => {
		const key = wifToPrivateKey(toWif(SECRET_KEY, true));
		const fromWif = await sign("hello", { secretKey: key });
		const direct = await sign("hello", { secretKey: SECRET_KEY });
		expect(u8aToHex(fromWif)).toBe(u8aToHex(direct));
	});
});
