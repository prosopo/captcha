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

// Writes ts-signed.json, which sr25519_cross.rs checks against the Rust. Unlike
// ../generate.ts, randomness is left alone: every signature here is made with a fresh
// nonce, exactly as in production, so signatures are proven by verification and never
// compared byte for byte. Keys, addresses and mini-secrets are deterministic and are.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { hexToU8a, u8aToHex, u8aToU8a } from "@polkadot/util";
import type { KeyringPair } from "@prosopo/types";
import {
	type VerifyResult,
	decodeAddress,
	encodeAddress,
	mnemonicToMiniSecret,
	signatureVerify,
	sr25519Verify,
} from "@prosopo/util-crypto";
import { DEV_PHRASE, Keyring } from "../../../src/keyring/keyring.js";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

type MessageSpec =
	| { id: string; kind: "hex"; value: string }
	| { id: string; kind: "string"; value: string }
	| { id: string; kind: "pattern"; length: number; seed: number };

type Outcome<T> = { result: T } | { error: string };

type VerifyOutcome = Outcome<
	boolean | { isValid: boolean; isWrapped: boolean; crypto: string }
>;

if (!process.version.startsWith("v24.")) {
	throw new Error(
		`this generator must run on Node 24 (the production runtime), not ${process.version}`,
	);
}

const hex = (value: Uint8Array): string => u8aToHex(value);

const PASSWORD_NFC = "p\u00e4ssw\u00f6rd";
const PASSWORD_NFD = "pa\u0308sswo\u0308rd";

// 42 is the only format production uses (getPair, Keyring and nobody default to it); 0, 1
// and 2 appear in code and tests; 63/64 straddle the one-byte/two-byte boundary, 16383 is
// the largest valid prefix and 16384 must be rejected.
const PREFIXES: number[] = [0, 1, 2, 42, 63, 64, 16383, 16384];

const KEY_URIS: string[] = [
	DEV_PHRASE,
	`${DEV_PHRASE}//Alice`,
	`${DEV_PHRASE}/soft`,
	`${DEV_PHRASE}//Alice/soft`,
	`${DEV_PHRASE}/soft//hard`,
	`${DEV_PHRASE}//hard/soft//hard2/soft2`,
	`${DEV_PHRASE}//1`,
	`${DEV_PHRASE}/1`,
	`${DEV_PHRASE}//0x1234`,
	`${DEV_PHRASE}//18446744073709551616`,
	`${DEV_PHRASE}//${"x".repeat(40)}`,
	`${DEV_PHRASE}///password`,
	`${DEV_PHRASE}//Alice///password`,
	`${DEV_PHRASE}/soft///password`,
	`${DEV_PHRASE}///${PASSWORD_NFC}`,
	`${DEV_PHRASE}///${PASSWORD_NFD}`,
	`${DEV_PHRASE}///`,
	"//Alice",
	"//Bob/soft",
	"legal winner thank year wave sausage worth useful legal winner thank yellow",
	"letter advice cage absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic bless///TREZOR",
	`0x${"01".repeat(32)}`,
	`0x${"00".repeat(32)}`,
	`0x${"ff".repeat(32)}//hard/soft`,
	`${DEV_PHRASE} extra`,
	`${"abandon ".repeat(11)}abandon`,
	`0x${"ab".repeat(31)}`,
];

const MESSAGES: MessageSpec[] = [
	{ id: "empty", kind: "hex", value: "0x" },
	{ id: "zero", kind: "hex", value: "0x00" },
	{ id: "hello", kind: "hex", value: hex(new TextEncoder().encode("hello")) },
	{
		id: "helloWrapped",
		kind: "hex",
		value: hex(new TextEncoder().encode("<Bytes>hello</Bytes>")),
	},
	{ id: "bytes32", kind: "pattern", length: 32, seed: 7 },
	{ id: "timestamp", kind: "string", value: "1750000000123" },
	{ id: "unicode", kind: "string", value: "h\u00e9llo \u{1f30d}" },
	{ id: "hexLookingString", kind: "string", value: "0x1234" },
	{ id: "wrappedString", kind: "string", value: "<Bytes>hello</Bytes>" },
	{ id: "bytes1000", kind: "pattern", length: 1000, seed: 1 },
	{ id: "bytes65536", kind: "pattern", length: 65536, seed: 2 },
];

const LONG_MESSAGES: MessageSpec[] = [
	{ id: "bytes1MiB", kind: "pattern", length: 1 << 20, seed: 3 },
];
const LONG_MESSAGE_KEYS: number[] = [0, 1];

const WRAP_PAIRS: [string, string][] = [
	["hello", "helloWrapped"],
	["helloWrapped", "hello"],
	["wrappedString", "hello"],
];

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

const outcome = <T>(fn: () => T): Outcome<T> => {
	try {
		return { result: fn() };
	} catch (e) {
		return { error: (e as Error).message };
	}
};

const verifyOutcome = (fn: () => boolean | VerifyResult): VerifyOutcome =>
	outcome(() => {
		const result: boolean | VerifyResult = fn();
		return typeof result === "boolean"
			? result
			: {
					isValid: result.isValid,
					isWrapped: result.isWrapped,
					crypto: result.crypto,
				};
	});

const MNEMONICS: string[] = [
	DEV_PHRASE,
	"legal winner thank year wave sausage worth useful legal winner thank yellow",
	"letter advice cage absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic bless",
	"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon",
	`${"abandon ".repeat(11)}about`,
	DEV_PHRASE.toUpperCase(),
];
const PASSWORDS: string[] = [
	"",
	"password",
	"TREZOR",
	"pässwörd",
	"pässwörd",
	" ",
];

const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });

type KeyRecord = { suri: string; pair: KeyringPair | undefined; json: Json };

const keys: KeyRecord[] = KEY_URIS.map((suri: string): KeyRecord => {
	let pair: KeyringPair;
	try {
		pair = keyring.addFromUri(suri);
	} catch (e) {
		return {
			suri,
			pair: undefined,
			json: { suri, error: (e as Error).message },
		};
	}
	const addresses: { [prefix: string]: Outcome<string> } = {};
	for (const prefix of PREFIXES) {
		addresses[String(prefix)] = outcome((): string =>
			encodeAddress(pair.publicKey, prefix),
		);
	}
	return {
		suri,
		pair,
		json: {
			suri,
			publicKey: hex(pair.publicKey),
			address: pair.address,
			addresses,
			decoded: hex(decodeAddress(pair.address)),
		},
	};
});

const signedKeys: { index: number; pair: KeyringPair }[] = keys.flatMap(
	(key: KeyRecord, index: number): { index: number; pair: KeyringPair }[] =>
		key.pair ? [{ index, pair: key.pair }] : [],
);

const verifyAll = (
	message: MessageSpec,
	signature: Uint8Array,
	signer: KeyringPair,
	publicKey: Uint8Array,
): { [api: string]: VerifyOutcome } => {
	const input: string | Uint8Array = messageInput(message);
	const raw: Uint8Array =
		signature.length === 65 ? signature.subarray(1) : signature;
	return {
		raw: verifyOutcome((): boolean => sr25519Verify(input, raw, publicKey)),
		address: verifyOutcome(() =>
			signatureVerify(input, signature, encodeAddress(publicKey, 42)),
		),
		addressPrefix0: verifyOutcome(() =>
			signatureVerify(input, signature, encodeAddress(publicKey, 0)),
		),
		pair: verifyOutcome((): boolean =>
			signer.verify(input, signature, publicKey),
		),
	};
};

const signatures: Json[] = [];
const signMessages = (
	keyIndex: number,
	pair: KeyringPair,
	messages: MessageSpec[],
): void => {
	for (const message of messages) {
		for (const withType of [false, true]) {
			const signature: Uint8Array = pair.sign(messageInput(message), {
				withType,
			});
			signatures.push({
				key: keyIndex,
				message: message.id,
				withType,
				signature: hex(signature),
				verify: verifyAll(message, signature, pair, pair.publicKey),
			});
		}
	}
};
for (const { index, pair } of signedKeys) {
	signMessages(index, pair, MESSAGES);
	if (LONG_MESSAGE_KEYS.includes(index))
		signMessages(index, pair, LONG_MESSAGES);
}

const flip = (
	signature: Uint8Array,
	byte: number,
	mask: number,
): Uint8Array => {
	const out: Uint8Array = signature.slice();
	out[byte] = (out[byte] ?? 0) ^ mask;
	return out;
};

const messageById = (id: string): MessageSpec => {
	const found: MessageSpec | undefined = [...MESSAGES, ...LONG_MESSAGES].find(
		(m: MessageSpec): boolean => m.id === id,
	);
	if (!found) throw new Error(`no message ${id}`);
	return found;
};

const negatives: Json[] = [];
const NEGATIVE_MESSAGES: MessageSpec[] = [
	messageById("empty"),
	messageById("hello"),
	messageById("timestamp"),
];
for (const [position, { index, pair }] of signedKeys.entries()) {
	const other = signedKeys[(position + 1) % signedKeys.length];
	if (!other) throw new Error("no other key");
	for (const message of NEGATIVE_MESSAGES) {
		const signature: Uint8Array = pair.sign(messageInput(message));
		const appended: MessageSpec = {
			id: `${message.id}+00`,
			kind: "hex",
			value: `${hex(u8aToU8a(messageInput(message)))}00`,
		};
		const cases: {
			name: string;
			signature: Uint8Array;
			message: MessageSpec;
			publicKey: Uint8Array;
		}[] = [
			{ name: "wrongKey", signature, message, publicKey: other.pair.publicKey },
			{
				name: "wrongMessage",
				signature,
				message: appended,
				publicKey: pair.publicKey,
			},
			{
				name: "flipR",
				signature: flip(signature, 0, 0x01),
				message,
				publicKey: pair.publicKey,
			},
			{
				name: "flipS",
				signature: flip(signature, 32, 0x01),
				message,
				publicKey: pair.publicKey,
			},
			{
				name: "noMarker",
				signature: flip(signature, 63, 0x80),
				message,
				publicKey: pair.publicKey,
			},
			{
				name: "sAboveOrder",
				signature: Uint8Array.from([
					...signature.subarray(0, 32),
					...new Uint8Array(31).fill(0xff),
					0xff,
				]),
				message,
				publicKey: pair.publicKey,
			},
			{
				name: "zero",
				signature: Uint8Array.from([...new Uint8Array(63), 0x80]),
				message,
				publicKey: pair.publicKey,
			},
			{
				name: "truncated",
				signature: signature.subarray(0, 63),
				message,
				publicKey: pair.publicKey,
			},
			{
				name: "extended",
				signature: Uint8Array.from([...signature, 0]),
				message,
				publicKey: pair.publicKey,
			},
			{
				name: "wrongTypePrefix",
				signature: Uint8Array.from([0, ...signature]),
				message,
				publicKey: pair.publicKey,
			},
		];
		for (const c of cases) {
			negatives.push({
				key: index,
				name: c.name,
				message: c.message,
				signature: hex(c.signature),
				publicKey: hex(c.publicKey),
				verify: verifyAll(c.message, c.signature, pair, c.publicKey),
			});
		}
	}
}

const wrapped: Json[] = [];
for (const { index, pair } of signedKeys.slice(0, 3)) {
	for (const [signedId, verifiedId] of WRAP_PAIRS) {
		const signature: Uint8Array = pair.sign(
			messageInput(messageById(signedId)),
		);
		wrapped.push({
			key: index,
			signed: signedId,
			verified: verifiedId,
			signature: hex(signature),
			verify: verifyAll(
				messageById(verifiedId),
				signature,
				pair,
				pair.publicKey,
			),
		});
	}
}

const miniSecrets: Json[] = MNEMONICS.flatMap((mnemonic: string): Json[] =>
	PASSWORDS.map(
		(password: string): Json => ({
			mnemonic,
			password,
			...outcome((): string => hex(mnemonicToMiniSecret(mnemonic, password))),
		}),
	),
);

const vectors: Json = {
	node: process.version,
	prefixes: PREFIXES,
	messages: [...MESSAGES, ...LONG_MESSAGES],
	longMessages: LONG_MESSAGES.map((m: MessageSpec): string => m.id),
	longMessageKeys: LONG_MESSAGE_KEYS,
	keys: keys.map((key: KeyRecord): Json => key.json),
	miniSecrets,
	signatures,
	negatives,
	wrapped,
};

writeFileSync(
	fileURLToPath(new URL("./ts-signed.json", import.meta.url)),
	`${JSON.stringify(vectors, null, "\t")}\n`,
);
