// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { mnemonicValidate } from "@prosopo/util-crypto";
import { describe, expect, it } from "vitest";
import { Keyring } from "../keyring/keyring.js";
import { generateMiniSecret, generateMnemonic } from "./mnemonic.js";

describe("mnemonic", () => {
	describe("generateMnemonic", () => {
		it("generates mnemonic and address without keyring", async () => {
			const [mnemonic, address] = await generateMnemonic();
			expect(mnemonic).toBeDefined();
			expect(mnemonic.split(" ").length).toBeGreaterThanOrEqual(12);
			expect(mnemonicValidate(mnemonic)).toBe(true);
			expect(address).toBeDefined();
			expect(typeof address).toBe("string");
		});

		it("generates mnemonic and address with provided keyring", async () => {
			const keyring = new Keyring();
			const [mnemonic, address] = await generateMnemonic(keyring);
			expect(mnemonic).toBeDefined();
			expect(mnemonicValidate(mnemonic)).toBe(true);
			expect(address).toBeDefined();
			const pair = keyring.getPair(address);
			expect(pair).toBeDefined();
		});

		it("generates mnemonic with explicit pairType", async () => {
			const [mnemonic, address] = await generateMnemonic(undefined, "sr25519");
			expect(mnemonic).toBeDefined();
			expect(mnemonicValidate(mnemonic)).toBe(true);
			expect(address).toBeDefined();
		});

		it("generates different mnemonics on each call", async () => {
			const [mnemonic1] = await generateMnemonic();
			const [mnemonic2] = await generateMnemonic();
			expect(mnemonic1).not.toBe(mnemonic2);
		});

		it("generates address that matches mnemonic", async () => {
			const [mnemonic, address] = await generateMnemonic();
			const keyring = new Keyring();
			const pair = keyring.addFromMnemonic(mnemonic);
			expect(pair.address).toBe(address);
		});
	});

	describe("generateMiniSecret", () => {
		it("generates miniSecret and address without keyring", async () => {
			const [miniSecret, address] = await generateMiniSecret();
			expect(miniSecret).toBeDefined();
			expect(miniSecret).toBeInstanceOf(Uint8Array);
			expect(miniSecret.length).toBe(32);
			expect(address).toBeDefined();
			expect(typeof address).toBe("string");
		});

		it("generates miniSecret and address with provided keyring", async () => {
			const keyring = new Keyring();
			const [miniSecret, address] = await generateMiniSecret(keyring);
			expect(miniSecret).toBeDefined();
			expect(miniSecret.length).toBe(32);
			expect(address).toBeDefined();
			const pair = keyring.getPair(address);
			expect(pair).toBeDefined();
		});

		it("generates miniSecret with explicit pairType", async () => {
			const [miniSecret, address] = await generateMiniSecret(
				undefined,
				"sr25519",
			);
			expect(miniSecret).toBeDefined();
			expect(miniSecret.length).toBe(32);
			expect(address).toBeDefined();
		});

		it("generates different miniSecrets on each call", async () => {
			const [miniSecret1] = await generateMiniSecret();
			const [miniSecret2] = await generateMiniSecret();
			expect(Array.from(miniSecret1)).not.toEqual(Array.from(miniSecret2));
		});

		it("generates address that matches miniSecret", async () => {
			const [miniSecret, address] = await generateMiniSecret();
			const keyring = new Keyring();
			const pair = keyring.addFromSeed(miniSecret);
			expect(pair.address).toBe(address);
		});

		it("miniSecret corresponds to generated mnemonic", async () => {
			const [mnemonic, mnemonicAddress] = await generateMnemonic();
			const [miniSecret, secretAddress] = await generateMiniSecret();
			const keyring = new Keyring();
			const mnemonicPair = keyring.addFromMnemonic(mnemonic);
			const secretPair = keyring.addFromSeed(miniSecret);
			expect(mnemonicPair.address).toBe(mnemonicAddress);
			expect(secretPair.address).toBe(secretAddress);
		});
	});
});
