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

// Unit tests for the CryptoWorker task implementations. The worker itself
// bootstraps under `?worker&inline` in the browser build and can't easily be
// spun up in a Node vitest env, so these tests exercise the same primitives
// the worker's message handler dispatches to (entropyToMnemonic,
// mnemonicToMiniSecret, sr25519FromSeed) and prove they produce a keypair
// equivalent to `keyring.addFromMnemonic` — the shipped-blob invariant that
// `ExtensionWeb2.createAccount`'s worker path relies on.

import { stringToU8a } from "@polkadot/util";
import { Keyring } from "@prosopo/keyring";
import {
	entropyToMnemonic,
	mnemonicToMiniSecret,
	sr25519FromSeed,
} from "@prosopo/util-crypto";
import { describe, expect, it } from "vitest";

// Mirrors ExtensionWeb2.createAccount: browserEntropy → hexHash(., 128) →
// slice(2) → 32 ASCII-hex characters → stringToU8a → 32 bytes. Fixed value
// so tests are deterministic (real code path uses the browser fingerprint).
const FIXED_ENTROPY_HEX = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";

const entropyBytes = (hex: string): Uint8Array => stringToU8a(hex);

describe("CryptoWorker task primitives", () => {
	describe("entropyToKeypair pipeline", () => {
		it("derives an sr25519 keypair from entropy deterministically", () => {
			const entropy = entropyBytes(FIXED_ENTROPY_HEX);

			const mnemonic = entropyToMnemonic(entropy);
			const seed = mnemonicToMiniSecret(mnemonic);
			const { publicKey, secretKey } = sr25519FromSeed(seed);

			expect(publicKey).toBeInstanceOf(Uint8Array);
			expect(secretKey).toBeInstanceOf(Uint8Array);
			expect(publicKey.length).toBe(32);
			expect(secretKey.length).toBe(64);

			// Re-running with the same entropy must yield the same keys —
			// otherwise the CryptoWorker cache would be poisoned by a
			// non-deterministic derivation.
			const again = sr25519FromSeed(
				mnemonicToMiniSecret(entropyToMnemonic(entropy)),
			);
			expect(again.publicKey).toEqual(publicKey);
			expect(again.secretKey).toEqual(secretKey);
		});

		it("produces the same address as keyring.addFromMnemonic (worker/main-thread parity)", () => {
			const entropy = entropyBytes(FIXED_ENTROPY_HEX);
			const mnemonic = entropyToMnemonic(entropy);

			// Worker path: entropy → mnemonic → miniSecret → sr25519 → addFromPair
			const seed = mnemonicToMiniSecret(mnemonic);
			const { publicKey, secretKey } = sr25519FromSeed(seed);
			const workerKeyring = new Keyring({ type: "sr25519" });
			const workerPair = workerKeyring.addFromPair(
				{ publicKey, secretKey },
				{},
				"sr25519",
			);

			// Legacy main-thread path: keyring.addFromMnemonic
			const mainKeyring = new Keyring({ type: "sr25519" });
			const mainPair = mainKeyring.addFromMnemonic(mnemonic);

			// Addresses must match exactly — this is the invariant that guarantees
			// swapping addFromMnemonic → addFromPair(entropyToKeypair(...)) is a
			// behavioural no-op for account identity.
			expect(workerPair.address).toBe(mainPair.address);
			expect(workerPair.publicKey).toEqual(mainPair.publicKey);
			expect(workerPair.type).toBe(mainPair.type);
		});

		it("signatures produced by addFromPair verify against the addFromMnemonic public key", () => {
			const entropy = entropyBytes(FIXED_ENTROPY_HEX);
			const mnemonic = entropyToMnemonic(entropy);
			const seed = mnemonicToMiniSecret(mnemonic);
			const { publicKey, secretKey } = sr25519FromSeed(seed);

			const workerKeyring = new Keyring({ type: "sr25519" });
			const workerPair = workerKeyring.addFromPair(
				{ publicKey, secretKey },
				{},
				"sr25519",
			);
			const mainKeyring = new Keyring({ type: "sr25519" });
			const mainPair = mainKeyring.addFromMnemonic(mnemonic);

			const message = stringToU8a("prosopo-test-message");
			const workerSig = workerPair.sign(message);
			const mainSig = mainPair.sign(message);

			expect(workerSig.length).toBe(64);
			expect(mainSig.length).toBe(64);
			// sr25519 signatures are non-deterministic, so we can't byte-compare;
			// but each signature must verify against BOTH pairs' public keys.
			expect(mainPair.verify(message, workerSig, mainPair.publicKey)).toBe(
				true,
			);
			expect(workerPair.verify(message, mainSig, workerPair.publicKey)).toBe(
				true,
			);
		});
	});

	describe("entropyToMnemonic (existing worker task, unchanged)", () => {
		it("produces a 24-word BIP39 mnemonic from 32 bytes of entropy", () => {
			const entropy = entropyBytes(FIXED_ENTROPY_HEX);
			const mnemonic = entropyToMnemonic(entropy);
			const words = mnemonic.split(" ");
			// 32 bytes of entropy = 256 bits → 24 BIP39 words.
			expect(words.length).toBe(24);
			for (const w of words) {
				expect(w).toMatch(/^[a-z]+$/);
			}
		});

		it("is deterministic for a given entropy", () => {
			const entropy = entropyBytes(FIXED_ENTROPY_HEX);
			expect(entropyToMnemonic(entropy)).toBe(entropyToMnemonic(entropy));
		});

		it("rejects entropy that isn't 16/20/24/28/32 bytes", () => {
			// bip39 accepts only these sizes — CryptoWorker relies on the caller
			// passing valid entropy (already-hashed to 32 bytes in ExtensionWeb2).
			expect(() => entropyToMnemonic(new Uint8Array(15))).toThrow();
			expect(() => entropyToMnemonic(new Uint8Array(17))).toThrow();
			expect(() => entropyToMnemonic(new Uint8Array(33))).toThrow();
		});
	});
});
