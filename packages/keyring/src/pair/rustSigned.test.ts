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

// The TS half of the sr25519 cross-verification: signatures made by the Rust keyring
// (rust/sr25519_cross.rs, with live randomness) must verify here. Set
// PROSOPO_SR25519_RUST_SIGNED to check a freshly signed file instead of the committed one.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { hexToU8a, u8aToU8a } from "@polkadot/util";
import type { KeyringPair } from "@prosopo/types";
import {
	encodeAddress,
	signatureVerify,
	sr25519Verify,
} from "@prosopo/util-crypto";
import { describe, expect, it } from "vitest";
import { Keyring } from "../keyring/keyring.js";

type MessageSpec =
	| { id: string; kind: "hex"; value: string }
	| { id: string; kind: "string"; value: string }
	| { id: string; kind: "pattern"; length: number; seed: number };

interface RustKey {
	key: number;
	suri: string;
	publicKey: string;
	address: string;
}

interface RustSignature {
	key: number;
	message: string;
	withType: boolean;
	signature: string;
}

interface WrongContextSignature {
	key: number;
	message: string;
	publicKey: string;
	signature: string;
}

interface RustSigned {
	messages: MessageSpec[];
	keys: RustKey[];
	signatures: RustSignature[];
	wrongContext: WrongContextSignature[];
}

const path: string =
	process.env.PROSOPO_SR25519_RUST_SIGNED ??
	fileURLToPath(
		new URL("../../rust/equivalence/sr25519/rust-signed.json", import.meta.url),
	);
const SLOW_MS = 600_000;

const signed: RustSigned = JSON.parse(readFileSync(path, "utf8")) as RustSigned;

const messageInput = (message: MessageSpec): string | Uint8Array => {
	switch (message.kind) {
		case "hex":
			return hexToU8a(message.value);
		case "string":
			return message.value;
		case "pattern":
			return Uint8Array.from(
				{ length: message.length },
				(_: unknown, i: number): number => (i * 31 + message.seed) & 0xff,
			);
	}
};

const message = (id: string): string | Uint8Array => {
	const spec: MessageSpec | undefined = signed.messages.find(
		(m: MessageSpec): boolean => m.id === id,
	);
	if (!spec) throw new Error(`no message ${id}`);
	return messageInput(spec);
};

const keyring: Keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
const pairs: Map<number, KeyringPair> = new Map(
	signed.keys.map((key: RustKey): [number, KeyringPair] => [
		key.key,
		keyring.addFromUri(key.suri),
	]),
);
const pairOf = (key: number): KeyringPair => {
	const pair: KeyringPair | undefined = pairs.get(key);
	if (!pair) throw new Error(`no key ${key}`);
	return pair;
};

const rawSignature = (signature: Uint8Array): Uint8Array =>
	signature.length === 65 ? signature.subarray(1) : signature;

/** Whether any verification API accepts it; a throw counts as a rejection. */
const accepted = (
	input: string | Uint8Array,
	signature: Uint8Array,
	publicKey: Uint8Array,
): boolean[] =>
	[
		(): boolean => sr25519Verify(input, rawSignature(signature), publicKey),
		(): boolean =>
			signatureVerify(input, signature, encodeAddress(publicKey, 42)).isValid,
		(): boolean => pairOf(0).verify(input, signature, publicKey),
	].map((verify: () => boolean): boolean => {
		try {
			return verify();
		} catch {
			return false;
		}
	});

const flip = (signature: Uint8Array, byte: number): Uint8Array => {
	const out: Uint8Array = signature.slice();
	out[byte] = (out[byte] ?? 0) ^ 0x01;
	return out;
};

describe("signatures made by the Rust keyring", () => {
	it("come from the same keys the TS derives", () => {
		expect(signed.keys.length).toBe(24);
		for (const key of signed.keys) {
			const pair: KeyringPair = pairOf(key.key);
			expect(pair.address, key.suri).toBe(key.address);
			expect(u8aToU8a(key.publicKey), key.suri).toEqual(pair.publicKey);
		}
	});

	it(
		"verify in the TS through sr25519Verify, signatureVerify and pair.verify",
		{ timeout: SLOW_MS },
		() => {
			expect(signed.signatures.length).toBe(532);
			for (const s of signed.signatures) {
				const pair: KeyringPair = pairOf(s.key);
				const signature: Uint8Array = hexToU8a(s.signature);
				const input: string | Uint8Array = message(s.message);
				expect(signature.length).toBe(s.withType ? 65 : 64);
				expect(
					sr25519Verify(input, rawSignature(signature), pair.publicKey),
					`${s.key} ${s.message}`,
				).toBe(true);
				expect(
					signatureVerify(input, signature, pair.address).isValid,
					`${s.key} ${s.message}`,
				).toBe(true);
				expect(
					pair.verify(input, signature, pair.publicKey),
					`${s.key} ${s.message}`,
				).toBe(true);
			}
		},
	);

	it("carry a fresh nonce: the same key and message never sign to the same bytes", () => {
		const plain: RustSignature[] = signed.signatures.filter(
			(s: RustSignature): boolean => !s.withType,
		);
		for (const s of plain) {
			const typed: RustSignature | undefined = signed.signatures.find(
				(t: RustSignature): boolean =>
					t.withType && t.key === s.key && t.message === s.message,
			);
			if (!typed)
				throw new Error(`no typed signature for ${s.key} ${s.message}`);
			expect(rawSignature(hexToU8a(typed.signature))).not.toEqual(
				hexToU8a(s.signature),
			);
		}
	});

	it(
		"fail in the TS once the key, the message or a bit of the signature is wrong",
		{ timeout: SLOW_MS },
		() => {
			for (const [position, s] of signed.signatures.entries()) {
				const pair: KeyringPair = pairOf(s.key);
				const other: RustKey | undefined = signed.keys.find(
					(k: RustKey): boolean =>
						k.publicKey !==
						signed.keys.find((own: RustKey): boolean => own.key === s.key)
							?.publicKey,
				);
				if (!other) throw new Error("no second key");
				const signature: Uint8Array = hexToU8a(s.signature);
				const input: Uint8Array = u8aToU8a(message(s.message));
				const offset: number = s.withType ? 1 : 0;
				const cases: [string, Uint8Array, Uint8Array, Uint8Array][] = [
					["wrong key", input, signature, u8aToU8a(other.publicKey)],
					[
						"wrong message",
						Uint8Array.from([...input, 0]),
						signature,
						pair.publicKey,
					],
					["flipped R", input, flip(signature, offset), pair.publicKey],
					[
						"flipped s",
						input,
						flip(signature, offset + 32 + (position % 31)),
						pair.publicKey,
					],
				];
				for (const [name, m, sig, publicKey] of cases) {
					expect(
						accepted(m, sig, publicKey),
						`${name}: ${s.key} ${s.message}`,
					).toEqual([false, false, false]);
				}
			}
		},
	);

	it("made under a signing context other than substrate do not verify", () => {
		expect(signed.wrongContext.length).toBe(3);
		for (const s of signed.wrongContext) {
			const pair: KeyringPair = pairOf(s.key);
			expect(u8aToU8a(s.publicKey)).toEqual(pair.publicKey);
			expect(
				accepted(message(s.message), hexToU8a(s.signature), pair.publicKey),
			).toEqual([false, false, false]);
		}
	});
});
