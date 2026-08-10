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

import { encodeAddress } from "@prosopo/util-crypto";
import { describe, expect, it } from "vitest";
import {
	PAIR_DIV,
	PAIR_HDR,
	PUB_LENGTH,
	SALT_LENGTH,
	SEC_LENGTH,
	SEED_LENGTH,
} from "./defaults.js";
import { nobody } from "./nobody.js";

describe("nobody", () => {
	it("is the all-zero public key, encoded as the well-known address", () => {
		const pair = nobody();
		expect(pair.publicKey).toEqual(new Uint8Array(32));
		expect(pair.address).toBe(
			"5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM",
		);
		// The address is a pre-computed constant in the source; if the encoding
		// ever changed, the constant would silently be wrong.
		expect(pair.address).toBe(encodeAddress(pair.publicKey, 42));
	});

	it("is permanently locked", () => {
		const pair = nobody();
		expect(pair.isLocked).toBe(true);
		pair.unlock("anything");
		expect(pair.isLocked).toBe(true);
		pair.lock();
		expect(pair.isLocked).toBe(true);
	});

	it("never verifies a signature, whatever it is given", () => {
		// This is the whole point of the pair: it stands in for "no account"
		// and must never authenticate anyone.
		const pair = nobody();
		expect(
			pair.verify(new Uint8Array(1), new Uint8Array(64), pair.publicKey),
		).toBe(false);
		expect(
			pair.verify(
				new Uint8Array(0),
				pair.sign(new Uint8Array(1)),
				pair.publicKey,
			),
		).toBe(false);
		expect(
			pair.vrfVerify(new Uint8Array(1), new Uint8Array(96), pair.publicKey),
		).toBe(false);
	});

	it("never reports a JWT as valid", () => {
		const result = nobody().jwtVerify(nobody().jwtIssue());
		expect(result.isValid).toBe(false);
		expect(result.error).toBe("JWT verification failed");
		expect(result.publicKey).toEqual(new Uint8Array(32));
	});

	it("returns correctly sized but empty signatures", () => {
		const pair = nobody();
		expect(pair.sign(new Uint8Array(1))).toEqual(new Uint8Array(64));
		expect(pair.vrfSign(new Uint8Array(1))).toEqual(new Uint8Array(96));
		expect(pair.encodePkcs8()).toEqual(new Uint8Array(0));
	});

	it("derives to itself, so no chain of derivation can escape it", () => {
		const pair = nobody();
		expect(pair.derive("//anything")).toBe(pair);
		expect(pair.derive("//a").derive("//b")).toBe(pair);
	});

	it("ignores attempts to change its meta", () => {
		const pair = nobody();
		pair.setMeta({ name: "somebody" });
		expect(pair.meta.name).toBe("nobody");
		expect(pair.meta.isTesting).toBe(true);
	});

	it("serialises to an unencrypted v0 json blob", () => {
		const json = nobody().toJson();
		expect(json.address).toBe(nobody().address);
		expect(json.encoded).toBe("");
		expect(json.encoding.version).toBe("0");
		expect(json.encoding.type).toBe("none");
	});

	it("returns the same shared instance each call", () => {
		expect(nobody()).toBe(nobody());
	});

	it("accepts pkcs8 decoding without throwing", () => {
		expect(() => nobody().decodePkcs8("pass", new Uint8Array(1))).not.toThrow();
	});
});

describe("pair defaults", () => {
	it("declares the sr25519 key and seed lengths", () => {
		expect(PUB_LENGTH).toBe(32);
		expect(SEED_LENGTH).toBe(32);
		expect(SALT_LENGTH).toBe(32);
		expect(SEC_LENGTH).toBe(64);
	});

	it("declares the pkcs8 header and divider used by the encoder", () => {
		// These framing bytes are what makes an exported key readable by
		// polkadot-js; a change here silently breaks every existing backup.
		expect(Array.from(PAIR_DIV)).toEqual([161, 35, 3, 33, 0]);
		expect(Array.from(PAIR_HDR)).toEqual([
			48, 83, 2, 1, 1, 48, 5, 6, 3, 43, 101, 112, 4, 34, 4, 32,
		]);
	});
});
