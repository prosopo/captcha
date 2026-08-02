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
import type { KeyringPair$Json } from "@prosopo/types";
import { encodeAddress, sr25519FromSeed } from "@prosopo/util-crypto";
import { describe, expect, it } from "vitest";
import { DEV_PHRASE, Keyring } from "../keyring/index.js";
import { getPair } from "./getPair.js";

const SEED_32 = new Uint8Array(32).fill(7);
const SEED_HEX = u8aToHex(SEED_32);
const ALICE_PUBLIC =
	"0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d";

const pairJson = (
	overrides: Partial<KeyringPair$Json> = {},
): KeyringPair$Json => ({
	address: encodeAddress(new Uint8Array(32).fill(8), 42),
	encoded: "0x00",
	encoding: { content: ["pkcs8", "sr25519"], type: ["none"], version: "3" },
	meta: {},
	...overrides,
});

// Key derivation runs scrypt/pbkdf2 with production parameters and takes
// seconds per call, so these suites need more than the 10s default.
const SLOW = { timeout: 60000 };

describe("getPair secret handling", SLOW, () => {
	it("derives from a mnemonic", () => {
		expect(getPair(DEV_PHRASE).address).toBe(
			new Keyring({ ss58Format: 42 }).addFromMnemonic(DEV_PHRASE).address,
		);
	});

	it("derives from a hex seed", () => {
		expect(u8aToHex(getPair(SEED_HEX).publicKey)).toBe(
			u8aToHex(sr25519FromSeed(SEED_32).publicKey),
		);
	});

	it("derives from a suri with a hard derivation path", () => {
		expect(u8aToHex(getPair(`${DEV_PHRASE}//Alice`).publicKey)).toBe(
			ALICE_PUBLIC,
		);
	});

	it("prefers the mnemonic branch over the suri branch", () => {
		// A bare valid mnemonic contains no "//", but the ordering matters if
		// one is ever added: mnemonic validation must win so the derivation
		// path is honoured rather than the whole string being padded.
		const suri = `${DEV_PHRASE}//1`;
		expect(getPair(suri).address).not.toBe(getPair(DEV_PHRASE).address);
	});

	it("parses a JSON string, taking the crypto type from its encoding", () => {
		const pair = getPair(JSON.stringify(pairJson()));
		expect(pair.type).toBe("sr25519");
		expect(u8aToHex(pair.publicKey)).toBe(u8aToHex(new Uint8Array(32).fill(8)));
	});

	it("accepts a JSON object directly", () => {
		expect(getPair(pairJson()).type).toBe("sr25519");
	});

	it("reports a missing secret when the string is neither key nor JSON", () => {
		// The unparseable case funnels into the same error as a genuinely
		// absent secret, so an operator sees one actionable message.
		expect(() => getPair("this is not a secret")).toThrow();
	});

	it("reports a missing secret for JSON without an encoding block", () => {
		expect(() => getPair('{"address":"x"}')).toThrow();
	});

	it("throws when neither a secret nor an account is given", () => {
		expect(() => getPair()).toThrow();
	});

	it("throws when the secret is an empty string and no account is given", () => {
		expect(() => getPair("")).toThrow();
	});
});

describe("getPair account handling", SLOW, () => {
	it("builds a watch-only pair from an address when no secret is given", () => {
		const address = getPair(DEV_PHRASE).address;
		const watchOnly = getPair(undefined, address);
		expect(watchOnly.address).toBe(address);
		expect(watchOnly.isLocked).toBe(true);
	});

	it("accepts a raw public key as the account", () => {
		const pair = getPair(DEV_PHRASE);
		expect(getPair(undefined, pair.publicKey).address).toBe(pair.address);
	});

	it("ignores the account once a secret is supplied", () => {
		const other = getPair(`${DEV_PHRASE}//other`).address;
		expect(getPair(DEV_PHRASE, other).address).toBe(
			getPair(DEV_PHRASE).address,
		);
	});
});

describe("getPair defaults", SLOW, () => {
	it("defaults to sr25519 and ss58 format 42", () => {
		const pair = getPair(DEV_PHRASE);
		expect(pair.type).toBe("sr25519");
		expect(pair.address).toBe(encodeAddress(pair.publicKey, 42));
	});

	it("honours an explicit ss58 format", () => {
		const pair = getPair(DEV_PHRASE, undefined, "sr25519", 2);
		expect(pair.address).toBe(encodeAddress(pair.publicKey, 2));
	});

	it("rejects a pair type the keyring does not support", () => {
		expect(() => getPair(DEV_PHRASE, undefined, "ed25519")).toThrow(
			"Expected a keyring type of either 'sr25519'",
		);
	});

	it("treats ss58 format 0 as unset, because it is falsy", () => {
		// Documents a live quirk of the `||` defaulting: Polkadot's own
		// format 0 cannot be requested and silently becomes 42.
		const pair = getPair(DEV_PHRASE, undefined, "sr25519", 0);
		expect(pair.address).toBe(encodeAddress(pair.publicKey, 42));
	});
});
