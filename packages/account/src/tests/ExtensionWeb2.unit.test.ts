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

// Tests for ExtensionWeb2.createAccount. The interesting behaviour to lock
// down is the two-branch account-derivation path:
//
//   1. Worker branch (preferred): `workerManager.entropyToKeypair(...)` →
//      `keyring.addFromPair({publicKey, secretKey})` — the sr25519 scalar-
//      mul runs off the main thread, main thread just packages the bytes.
//   2. Fallback branch: worker throws (CSP block, task timeout, etc.) →
//      dynamic-import `entropyToMnemonic` → `keyring.addFromMnemonic(...)`
//      on the main thread.
//
// Both branches must produce the same account address for a given fingerprint
// or session identity breaks between the two paths — a repeat visitor whose
// worker fails would look like a different user to the provider.

import { stringToU8a } from "@polkadot/util";
import { getFingerprint } from "@prosopo/fingerprint";
import { Keyring } from "@prosopo/keyring";
import { entropyToMnemonic, hexHash } from "@prosopo/util-crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted() makes these accessible from within vi.mock factories, which
// run before the module's own imports at collection time.
const mocks = vi.hoisted(() => {
	const entropyToKeypair = vi.fn();
	return {
		entropyToKeypair,
		getCryptoWorkerManager: vi.fn(() => ({
			prewarm: vi.fn(),
			entropyToKeypair,
			entropyToMnemonic: vi.fn(),
		})),
	};
});

vi.mock("@prosopo/fingerprint", async (importOriginal) => {
	const actual =
		(await importOriginal()) as typeof import("@prosopo/fingerprint");
	return {
		...actual,
		getFingerprint: vi.fn(),
		prefetchFingerprint: vi.fn(),
	};
});

vi.mock("../workers/CryptoWorkerManager.js", () => ({
	getCryptoWorkerManager: mocks.getCryptoWorkerManager,
	// Types re-exported at runtime aren't needed for the tests but keep the
	// mock shape aligned with the module's actual named exports.
	CryptoWorkerManager: class {},
}));

// Imported after mocks so the module picks up the mocked getFingerprint and
// worker manager during its top-level side effects (prefetchFingerprint,
// getCryptoWorkerManager().prewarm()).
const { default: ExtensionWeb2 } = await import(
	"../extension/ExtensionWeb2.js"
);

// Fixed browser-fingerprint hex the mocked getFingerprint always returns.
// The real code hashes this to 128 bits, hex-encodes it, and passes the ASCII
// hex bytes as entropy to the mnemonic derivation — so both branches under
// test see the same input regardless of the underlying fingerprint.
const FIXED_FINGERPRINT_HEX = "0x1234567890abcdef1234567890abcdef";

// Config placeholder — ExtensionWeb2.createAccount ignores fields other than
// what the fingerprint hash + keyring type need.
const config = {
	account: { address: "" },
	web2: true,
	defaultEnvironment: "test",
} as unknown as Parameters<InstanceType<typeof ExtensionWeb2>["getAccount"]>[0];

describe("ExtensionWeb2.createAccount", () => {
	beforeEach(() => {
		vi.mocked(getFingerprint).mockReset();
		mocks.entropyToKeypair.mockReset();
		vi.mocked(getFingerprint).mockResolvedValue(FIXED_FINGERPRINT_HEX);
	});

	it("worker branch: derives account from worker-returned keypair bytes", async () => {
		// Compute the expected keypair the same way ExtensionWeb2 would — we
		// need to feed the mock the exact bytes the worker would produce for
		// this fingerprint, otherwise the reconstructed address won't match.
		const entropyHex = hexHash(FIXED_FINGERPRINT_HEX, 128).slice(2);
		const u8Entropy = stringToU8a(entropyHex);
		const mnemonic = entropyToMnemonic(u8Entropy);
		const keyring = new Keyring({ type: "sr25519" });
		const expectedPair = keyring.addFromMnemonic(mnemonic);

		mocks.entropyToKeypair.mockResolvedValue({
			publicKey: expectedPair.publicKey,
			secretKey:
				// Fish the secret out of the reference pair — this is what the
				// real CryptoWorker returns from sr25519FromSeed(seed).
				(expectedPair as unknown as { secretKey: Uint8Array }).secretKey ??
				new Uint8Array(64),
			mnemonic,
		});

		const ext = new ExtensionWeb2();
		const { account } = await ext.getAccount(config);

		expect(mocks.entropyToKeypair).toHaveBeenCalledTimes(1);
		// The worker got called with the entropy ExtensionWeb2 hashed from the
		// fingerprint — verifies the argument-shaping code isn't broken.
		const [entropyArg] = mocks.entropyToKeypair.mock.calls[0] ?? [];
		expect(entropyArg).toBeInstanceOf(Uint8Array);
		expect(entropyArg).toEqual(u8Entropy);
		// Account address matches the addFromMnemonic-derived one — proves the
		// addFromPair wrapping preserves account identity.
		expect(account.address).toBe(expectedPair.address);
	});

	it("fallback branch: derives account on main thread when worker throws", async () => {
		// Simulate a worker failure — CSP block, worker script parse failure,
		// task timeout — anything that surfaces as a rejection from
		// entropyToKeypair. Fallback path must reach the same account address.
		mocks.entropyToKeypair.mockRejectedValue(new Error("Worker unavailable"));

		const entropyHex = hexHash(FIXED_FINGERPRINT_HEX, 128).slice(2);
		const u8Entropy = stringToU8a(entropyHex);
		const mnemonic = entropyToMnemonic(u8Entropy);
		const keyring = new Keyring({ type: "sr25519" });
		const expectedPair = keyring.addFromMnemonic(mnemonic);

		const ext = new ExtensionWeb2();
		const { account } = await ext.getAccount(config);

		expect(mocks.entropyToKeypair).toHaveBeenCalledTimes(1);
		// Fallback still gives us a working keypair with the same address —
		// this is the invariant that lets us safely swap in the worker path.
		expect(account.address).toBe(expectedPair.address);
	});

	it("worker and fallback branches derive the same account address", async () => {
		// Direct A/B: one call goes through the worker mock, the next through
		// the fallback. Assert the addresses match.
		const entropyHex = hexHash(FIXED_FINGERPRINT_HEX, 128).slice(2);
		const u8Entropy = stringToU8a(entropyHex);
		const mnemonic = entropyToMnemonic(u8Entropy);
		const refKeyring = new Keyring({ type: "sr25519" });
		const refPair = refKeyring.addFromMnemonic(mnemonic);

		mocks.entropyToKeypair.mockResolvedValueOnce({
			publicKey: refPair.publicKey,
			secretKey:
				(refPair as unknown as { secretKey: Uint8Array }).secretKey ??
				new Uint8Array(64),
			mnemonic,
		});
		const workerAccount = await new ExtensionWeb2().getAccount(config);

		mocks.entropyToKeypair.mockRejectedValueOnce(new Error("worker down"));
		const fallbackAccount = await new ExtensionWeb2().getAccount(config);

		expect(workerAccount.account.address).toBe(fallbackAccount.account.address);
	});
});
