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
import type { KeyringPair } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import { Keyring } from "../keyring/keyring.js";

const pairFromSeedByte = (byte: number): KeyringPair =>
	new Keyring().addFromSeed(new Uint8Array(32).fill(byte));

describe("KeyringPair.vrfVerify", () => {
	const alice = pairFromSeedByte(1);
	const bob = pairFromSeedByte(2);
	const message = "msg";
	const aliceOutput = alice.vrfSign(message);

	it("accepts output checked against the key that signed it", () => {
		expect(bob.vrfVerify(message, aliceOutput, alice.publicKey)).toBe(true);
	});

	it("rejects output checked against a key that did not sign it", () => {
		expect(alice.vrfVerify(message, aliceOutput, bob.publicKey)).toBe(false);
	});

	it("takes the signer as an address or a hex public key", () => {
		expect(bob.vrfVerify(message, aliceOutput, alice.address)).toBe(true);
		expect(bob.vrfVerify(message, aliceOutput, u8aToHex(alice.publicKey))).toBe(
			true,
		);
	});
});
