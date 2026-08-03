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
import { describe, expect, it } from "vitest";
import { PAIRSSR25519, createTestKeyring } from "./testing.js";
import { createTestPairs } from "./testingPairs.js";

// Key derivation runs scrypt/pbkdf2 with production parameters and takes
// seconds per call, so these suites need more than the 10s default.
const SLOW = { timeout: 60000 };

describe("createTestKeyring", SLOW, () => {
	it("adds a pair for every well-known dev account", () => {
		expect(createTestKeyring().getPairs()).toHaveLength(PAIRSSR25519.length);
	});

	it("names each pair after its seed, lowercased with the path flattened", () => {
		// `Alice//stash` becomes `alice_stash`, which is the name the rest of
		// the stack looks pairs up by.
		const names = createTestKeyring()
			.getPairs()
			.map((pair) => pair.meta.name);
		expect(names).toEqual([
			"alice",
			"alice_stash",
			"bob",
			"bob_stash",
			"charlie",
			"dave",
			"eve",
			"ferdie",
		]);
	});

	it("marks every pair as a testing pair", () => {
		for (const pair of createTestKeyring().getPairs()) {
			expect(pair.meta.isTesting).toBe(true);
		}
	});

	it("uses the hard-coded public keys, not derivation, by default", () => {
		const keyring = createTestKeyring();
		for (const { p } of PAIRSSR25519) {
			expect(u8aToHex(keyring.getPair(p).publicKey)).toBe(p);
		}
	});

	it("replaces lock with a no-op so the fixtures stay usable", () => {
		// The pairs carry their secret in the clear; locking them would make
		// every downstream test fail to sign.
		const pair = createTestKeyring().getPairs()[0];
		expect(pair).toBeDefined();
		if (!pair) return;
		expect(() => pair.lock()).not.toThrow();
		expect(pair.isLocked).toBe(false);
	});

	it("produces signable pairs", () => {
		const pair = createTestKeyring().getPair(PAIRSSR25519[0]?.p ?? "0x");
		const message = new TextEncoder().encode("hello");
		expect(pair.verify(message, pair.sign(message), pair.publicKey)).toBe(true);
	});

	it("honours a requested ss58 format", () => {
		const alice = PAIRSSR25519[0]?.p ?? "0x";
		expect(
			createTestKeyring({ ss58Format: 42 }).getPair(alice).address,
		).not.toBe(createTestKeyring({ ss58Format: 2 }).getPair(alice).address);
	});

	it("derives different keys when asked to, because the seeds are bare names", () => {
		// The `isDerived = false` branch feeds the seed straight to
		// `addFromUri`, and the seeds are names like "Alice" rather than
		// "//Alice". They are therefore padded raw phrases, not dev-phrase
		// derivations, so the pairs are NOT the well-known dev accounts.
		// Anything relying on Alice's address must use the default mode.
		const derived = createTestKeyring({}, false);
		expect(derived.getPairs()).toHaveLength(PAIRSSR25519.length);
		for (const { p } of PAIRSSR25519) {
			expect(() => derived.getPair(p)).toThrow("Unable to retrieve keypair");
		}
	});

	it("rejects a keyring type it cannot support", () => {
		expect(() => createTestKeyring({ type: "ed25519" })).toThrow(
			"Expected a keyring type of either 'sr25519'",
		);
	});
});

describe("createTestPairs", SLOW, () => {
	it("exposes every named pair plus nobody", () => {
		const pairs = createTestPairs();
		for (const name of [
			"nobody",
			"alice",
			"alice_stash",
			"bob",
			"bob_stash",
			"charlie",
			"dave",
			"eve",
			"ferdie",
		]) {
			expect(pairs[name], name).toBeDefined();
		}
	});

	it("maps alice to the well-known Alice public key", () => {
		expect(
			u8aToHex(createTestPairs().alice?.publicKey ?? new Uint8Array()),
		).toBe(PAIRSSR25519[0]?.p);
	});

	it("includes nobody, which cannot verify anything", () => {
		const nobodyPair = createTestPairs().nobody;
		expect(nobodyPair).toBeDefined();
		expect(nobodyPair?.isLocked).toBe(true);
		expect(
			nobodyPair?.verify(
				new Uint8Array(1),
				new Uint8Array(64),
				nobodyPair.publicKey,
			),
		).toBe(false);
	});

	it("returns independent maps so one test cannot poison another", () => {
		const first = createTestPairs();
		const second = createTestPairs();
		expect(first).not.toBe(second);
		expect(first.alice).not.toBe(second.alice);
	});
});
