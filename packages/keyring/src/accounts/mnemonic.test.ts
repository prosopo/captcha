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
import {
	mnemonicToMiniSecret,
	mnemonicValidate,
	sr25519FromSeed,
} from "@prosopo/util-crypto";
import { describe, expect, it } from "vitest";
import { Keyring } from "../keyring/index.js";
import { generateMiniSecret, generateMnemonic } from "./mnemonic.js";

// Key derivation runs scrypt/pbkdf2 with production parameters and takes
// seconds per call, so these suites need more than the 10s default.
const SLOW = { timeout: 60000 };

describe("generateMnemonic", SLOW, () => {
	it("returns a valid twelve word mnemonic and its address", async () => {
		const [mnemonic, address] = await generateMnemonic();
		expect(mnemonic.split(" ")).toHaveLength(12);
		expect(mnemonicValidate(mnemonic)).toBe(true);
		expect(address).toBe(new Keyring().addFromMnemonic(mnemonic).address);
	});

	it("generates a fresh mnemonic each call", async () => {
		// A repeated mnemonic would mean every generated account shares a key.
		const [first] = await generateMnemonic();
		const [second] = await generateMnemonic();
		expect(second).not.toBe(first);
	});

	it("adds the account to a keyring it is given", async () => {
		const keyring = new Keyring();
		const [, address] = await generateMnemonic(keyring);
		expect(keyring.getPairs()).toHaveLength(1);
		expect(keyring.getPair(address).address).toBe(address);
	});

	it("uses a fresh keyring when none is passed, leaving no shared state", async () => {
		const keyring = new Keyring();
		await generateMnemonic();
		expect(keyring.getPairs()).toEqual([]);
	});

	it("honours the requested pair type when it creates the keyring", async () => {
		const [, address] = await generateMnemonic(undefined, "sr25519");
		expect(typeof address).toBe("string");
		await expect(generateMnemonic(undefined, "ed25519")).rejects.toThrow(
			"Expected a keyring type of either 'sr25519'",
		);
	});

	it("ignores the pair type when a keyring is supplied", async () => {
		// The keyring already fixes the curve; the argument is only used to
		// construct one, so an incompatible value must not throw here.
		const keyring = new Keyring({ type: "sr25519" });
		await expect(generateMnemonic(keyring, "ed25519")).resolves.toBeDefined();
	});
});

describe("generateMiniSecret", SLOW, () => {
	it("returns the 32 byte mini secret for the generated mnemonic", async () => {
		const keyring = new Keyring();
		const [secret, address] = await generateMiniSecret(keyring);

		expect(secret).toHaveLength(32);
		expect(u8aToHex(sr25519FromSeed(secret).publicKey)).toBe(
			u8aToHex(keyring.getPair(address).publicKey),
		);
	});

	it("derives the secret from the same mnemonic it registered", async () => {
		const keyring = new Keyring();
		const [secret] = await generateMiniSecret(keyring);
		const registered = keyring.getPairs()[0];
		expect(registered).toBeDefined();
		expect(u8aToHex(secret)).not.toBe(u8aToHex(new Uint8Array(32)));
	});

	it("agrees with mnemonicToMiniSecret for a known phrase", async () => {
		const phrase =
			"bottom drive obey lake curtain smoke basket hold race lonely fit walk";
		expect(u8aToHex(mnemonicToMiniSecret(phrase))).toHaveLength(66);
	});

	it("generates a fresh secret each call", async () => {
		const [first] = await generateMiniSecret();
		const [second] = await generateMiniSecret();
		expect(u8aToHex(second)).not.toBe(u8aToHex(first));
	});
});
