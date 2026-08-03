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

import { u8aToHex } from "@polkadot/util";
import type { KeyringPair, KeyringPair$Json } from "@prosopo/types";
import type { KeypairType } from "@prosopo/util-crypto";
import {
	decodeAddress,
	encodeAddress,
	mnemonicToMiniSecret,
	sr25519FromSeed,
} from "@prosopo/util-crypto";
import { describe, expect, it } from "vitest";
import { DEV_PHRASE, Keyring } from "./keyring.js";

const ALICE_SURI = `${DEV_PHRASE}//Alice`;
// Well-known dev key: the public half of `//Alice` derived from the standard
// substrate dev phrase, published in substrate's own test fixtures.
const ALICE_PUBLIC =
	"0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d";
const SEED_32 = new Uint8Array(32).fill(1);

// Key derivation runs scrypt/pbkdf2 with production parameters and takes
// seconds per call, so these suites need more than the 10s default.
const SLOW = { timeout: 60000 };

describe("Keyring construction", SLOW, () => {
	it("defaults to sr25519", () => {
		expect(new Keyring().type).toBe("sr25519");
		expect(new Keyring({}).type).toBe("sr25519");
	});

	it("accepts an explicit sr25519 type", () => {
		expect(new Keyring({ type: "sr25519" }).type).toBe("sr25519");
	});

	it("rejects every other curve, naming what it found", () => {
		// This fork only implements sr25519; silently accepting ed25519 would
		// produce pairs that throw deep inside signing instead.
		for (const type of ["ed25519", "ecdsa", "ethereum"] as KeypairType[]) {
			expect(() => new Keyring({ type })).toThrow(
				`Expected a keyring type of either 'sr25519', found '${type}`,
			);
		}
	});

	it("starts with no pairs", () => {
		const keyring = new Keyring();
		expect(keyring.pairs).toEqual([]);
		expect(keyring.getPairs()).toEqual([]);
		expect(keyring.publicKeys).toEqual([]);
	});
});

describe("Keyring address encoding", SLOW, () => {
	it("uses the configured ss58 format", () => {
		const publicKey = new Uint8Array(32).fill(2);
		expect(new Keyring({ ss58Format: 42 }).encodeAddress(publicKey)).toBe(
			encodeAddress(publicKey, 42),
		);
		expect(new Keyring({ ss58Format: 2 }).encodeAddress(publicKey)).toBe(
			encodeAddress(publicKey, 2),
		);
	});

	it("lets an explicit format override the configured one", () => {
		const publicKey = new Uint8Array(32).fill(3);
		expect(new Keyring({ ss58Format: 42 }).encodeAddress(publicKey, 2)).toBe(
			encodeAddress(publicKey, 2),
		);
	});

	it("applies a format set after construction to new pairs", () => {
		const keyring = new Keyring({ ss58Format: 42 });
		const before = keyring.addFromUri(ALICE_SURI).address;
		keyring.setSS58Format(2);
		const after = keyring.addFromUri(ALICE_SURI).address;

		expect(after).not.toBe(before);
		expect(decodeAddress(after).toString()).toBe(
			decodeAddress(before).toString(),
		);
	});

	it("exposes decodeAddress as the inverse of its own encoding", () => {
		const keyring = new Keyring({ ss58Format: 42 });
		const publicKey = new Uint8Array(32).fill(4);
		expect(keyring.decodeAddress(keyring.encodeAddress(publicKey))).toEqual(
			publicKey,
		);
	});
});

describe("Keyring.createFromUri", SLOW, () => {
	it("derives the well-known Alice key from the dev phrase", () => {
		const pair = new Keyring().createFromUri(ALICE_SURI);
		expect(u8aToHex(pair.publicKey)).toBe(ALICE_PUBLIC);
	});

	it("expands a bare hard-derivation path against the dev phrase", () => {
		// `//Alice` on its own is the shorthand every dev script uses.
		expect(u8aToHex(new Keyring().createFromUri("//Alice").publicKey)).toBe(
			ALICE_PUBLIC,
		);
	});

	it("does not create the pair in the keyring", () => {
		const keyring = new Keyring();
		keyring.createFromUri(ALICE_SURI);
		expect(keyring.getPairs()).toEqual([]);
	});

	it("treats a 256-bit hex phrase as a raw seed", () => {
		const seedHex = u8aToHex(SEED_32);
		expect(u8aToHex(new Keyring().createFromUri(seedHex).publicKey)).toBe(
			u8aToHex(sr25519FromSeed(SEED_32).publicKey),
		);
	});

	it("pads a short non-mnemonic phrase out to 32 bytes", () => {
		const pair = new Keyring().createFromUri("hello");
		const padded = new Uint8Array(32).fill(32);
		padded.set(new TextEncoder().encode("hello"));
		expect(u8aToHex(pair.publicKey)).toBe(
			u8aToHex(sr25519FromSeed(padded).publicKey),
		);
	});

	it("rejects a phrase that is neither a mnemonic nor short enough to pad", () => {
		// Silently truncating would give a key the caller never intended and
		// could not recover funds from.
		expect(() => new Keyring().createFromUri("x".repeat(33))).toThrow(
			"specified phrase is not a valid mnemonic and is invalid as a raw seed at > 32 bytes",
		);
	});

	it("accepts a 32 character phrase at the padding boundary", () => {
		expect(() => new Keyring().createFromUri("x".repeat(32))).not.toThrow();
	});

	it("derives a 12 word mnemonic through the mini secret rather than padding", () => {
		expect(u8aToHex(new Keyring().createFromUri(DEV_PHRASE).publicKey)).toBe(
			u8aToHex(sr25519FromSeed(mnemonicToMiniSecret(DEV_PHRASE)).publicKey),
		);
	});

	it("treats a word count outside the mnemonic set as a raw phrase", () => {
		// 13 words is not a valid BIP39 length, and the string is well over 32
		// bytes, so it must be refused rather than quietly padded or hashed.
		expect(() => new Keyring().createFromUri(`${DEV_PHRASE} extra`)).toThrow(
			"is not a valid mnemonic",
		);
	});

	it("gives a different key for a different password", () => {
		const plain = new Keyring().createFromUri(DEV_PHRASE);
		const withPassword = new Keyring().createFromUri(`${DEV_PHRASE}///pass`);
		expect(u8aToHex(withPassword.publicKey)).not.toBe(
			u8aToHex(plain.publicKey),
		);
	});

	it("distinguishes soft and hard derivation of the same name", () => {
		const soft = new Keyring().createFromUri(`${DEV_PHRASE}/Alice`);
		const hard = new Keyring().createFromUri(ALICE_SURI);
		expect(u8aToHex(soft.publicKey)).not.toBe(u8aToHex(hard.publicKey));
	});

	it("carries meta through to the pair", () => {
		const pair = new Keyring().createFromUri(ALICE_SURI, { name: "alice" });
		expect(pair.meta.name).toBe("alice");
	});

	it("refuses ethereum derivation for a mnemonic", () => {
		expect(() =>
			new Keyring().createFromUri(DEV_PHRASE, {}, "ethereum"),
		).toThrow("Not implemented - Prosopo Keyring supports sr25519 only");
	});
});

describe("Keyring add* methods", SLOW, () => {
	it("stores a pair created from a uri and returns it on lookup", () => {
		const keyring = new Keyring();
		const pair = keyring.addFromUri(ALICE_SURI);

		expect(keyring.getPairs()).toEqual([pair]);
		expect(keyring.getPair(pair.address)).toBe(pair);
		expect(keyring.getPair(pair.publicKey)).toBe(pair);
	});

	it("treats addFromMnemonic as addFromUri", () => {
		const fromMnemonic = new Keyring().addFromMnemonic(DEV_PHRASE);
		const fromUri = new Keyring().addFromUri(DEV_PHRASE);
		expect(fromMnemonic.address).toBe(fromUri.address);
	});

	it("derives a pair from a raw seed", () => {
		const pair = new Keyring().addFromSeed(SEED_32);
		expect(u8aToHex(pair.publicKey)).toBe(
			u8aToHex(sr25519FromSeed(SEED_32).publicKey),
		);
	});

	it("refuses a seed for an unimplemented curve", () => {
		expect(() => new Keyring().addFromSeed(SEED_32, {}, "ed25519")).toThrow(
			"Not Implemented",
		);
	});

	it("adds an address-only pair that has no secret and cannot sign", () => {
		// Watch-only accounts are legitimate, but they must not silently
		// produce a signature made from an empty secret.
		const keyring = new Keyring();
		const address = keyring.addFromUri(ALICE_SURI).address;
		const watchOnly = new Keyring().addFromAddress(address);

		expect(watchOnly.address).toBe(address);
		expect(watchOnly.isLocked).toBe(true);
		expect(() => watchOnly.sign(new Uint8Array([1]))).toThrow();
	});

	it("adds a pair from an explicit keypair", () => {
		const keypair = sr25519FromSeed(SEED_32);
		const keyring = new Keyring();
		const pair = keyring.addFromPair(keypair, { name: "explicit" });

		expect(u8aToHex(pair.publicKey)).toBe(u8aToHex(keypair.publicKey));
		expect(pair.meta.name).toBe("explicit");
		expect(keyring.getPairs()).toEqual([pair]);
	});

	it("exposes public keys for every stored pair", () => {
		const keyring = new Keyring();
		const first = keyring.addFromUri(ALICE_SURI);
		const second = keyring.addFromUri(`${DEV_PHRASE}//Bob`);
		expect(keyring.publicKeys).toEqual([first.publicKey, second.publicKey]);
	});

	it("removes a pair", () => {
		const keyring = new Keyring();
		const pair = keyring.addFromUri(ALICE_SURI);
		keyring.removePair(pair.address);
		expect(keyring.pairs).toEqual([]);
		expect(() => keyring.getPair(pair.address)).toThrow(
			"Unable to retrieve keypair",
		);
	});

	it("keeps addPair and the pairs getter in agreement", () => {
		const keyring = new Keyring();
		const pair = keyring.createFromUri(ALICE_SURI);
		expect(keyring.addPair(pair)).toBe(pair);
		expect(keyring.pairs).toEqual(keyring.getPairs());
	});
});

describe("Keyring.createFromJson", SLOW, () => {
	const json = (
		overrides: Partial<KeyringPair$Json> = {},
	): KeyringPair$Json => ({
		address: encodeAddress(new Uint8Array(32).fill(5), 42),
		encoded: "0x00",
		encoding: {
			content: ["pkcs8", "sr25519"],
			type: ["none"],
			version: "3",
		},
		meta: { name: "from-json" },
		...overrides,
	});

	it("round trips address, meta and type", () => {
		const pair = new Keyring().createFromJson(json());
		expect(pair.meta.name).toBe("from-json");
		expect(pair.type).toBe("sr25519");
		expect(u8aToHex(pair.publicKey)).toBe(u8aToHex(new Uint8Array(32).fill(5)));
	});

	it("accepts a hex address as the public key directly", () => {
		const pair = new Keyring().createFromJson(json({ address: ALICE_PUBLIC }));
		expect(u8aToHex(pair.publicKey)).toBe(ALICE_PUBLIC);
	});

	it("rejects a v3 file that is not pkcs8", () => {
		expect(() =>
			new Keyring().createFromJson(
				json({
					encoding: {
						content: ["none", "sr25519"],
						type: ["none"],
						version: "3",
					},
				}),
			),
		).toThrow("Unable to decode non-pkcs8 type");
	});

	it("falls back to the keyring type for a v0 file", () => {
		// v0 predates the content array, so the crypto type is implied.
		const pair = new Keyring().createFromJson(
			json({
				encoding: {
					content: ["pkcs8", "ed25519"],
					type: ["none"],
					version: "0",
				},
			}),
		);
		expect(pair.type).toBe("sr25519");
	});

	it("rejects a crypto type this keyring cannot handle", () => {
		expect(() =>
			new Keyring().createFromJson(
				json({
					encoding: {
						content: ["pkcs8", "ed25519"],
						type: ["none"],
						version: "3",
					},
				}),
			),
		).toThrow("Unknown crypto type ed25519");
	});

	it("normalises a single encoding type into a list", () => {
		expect(() =>
			new Keyring().createFromJson(
				json({
					encoding: {
						content: ["pkcs8", "sr25519"],
						type: "none",
						version: "3",
					},
				}),
			),
		).not.toThrow();
	});

	it("stores the pair when added rather than created", () => {
		const keyring = new Keyring();
		const pair = keyring.addFromJson(json());
		expect(keyring.getPairs()).toEqual([pair]);
	});
});

describe("Keyring.toJson", SLOW, () => {
	it("delegates to the stored pair", () => {
		const keyring = new Keyring();
		const pair: KeyringPair = keyring.addFromUri(ALICE_SURI);
		const asJson = keyring.toJson(pair.address);

		expect(asJson.address).toBe(pair.address);
		expect(asJson.encoding.content).toContain("sr25519");
	});

	it("throws for an address it does not hold", () => {
		expect(() =>
			new Keyring().toJson(encodeAddress(new Uint8Array(32).fill(6), 42)),
		).toThrow("Unable to retrieve keypair");
	});
});
