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

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	compactAddLength,
	hexToU8a,
	isHex,
	u8aIsWrapped,
	u8aToHex,
	u8aToString,
	u8aToU8a,
	u8aUnwrapBytes,
	u8aWrapBytes,
} from "@polkadot/util";
import { checkAddressChecksum } from "../../src/address/checksum.js";
import { base64URLDecode, base64URLEncode } from "../../src/base64/bs64.js";
import {
	base32Decode,
	base32Encode,
	base32Validate,
	base58Decode,
	base58Encode,
	base58Validate,
	base64Decode,
	base64Encode,
	base64Pad,
	base64Trim,
	base64Validate,
	blake2AsHex,
	blake2AsU8a,
	decodeAddress,
	encodeAddress,
	entropyToMnemonic,
	hexHash,
	hexHashArray,
	jsonDecrypt,
	jsonDecryptData,
	jsonEncrypt,
	jsonEncryptFormat,
	jwtVerify,
	keyExtractPath,
	keyExtractSuri,
	keyFromPath,
	mnemonicGenerate,
	mnemonicToEntropy,
	mnemonicToLegacySeed,
	mnemonicToMiniSecret,
	mnemonicValidate,
	naclDecrypt,
	naclEncrypt,
	pbkdf2Encode,
	randomAsHex,
	scryptEncode,
	scryptFromU8a,
	scryptToU8a,
	secp256k1Compress,
	secp256k1PairFromSeed,
	sha256AsU8a,
	sha512AsU8a,
	signatureVerify,
	sr25519Agreement,
	sr25519DeriveHard,
	sr25519DerivePublic,
	sr25519DeriveSoft,
	sr25519FromSeed,
	sr25519Sign,
	sr25519Verify,
	sr25519VrfSign,
	sr25519VrfVerify,
	sr25519jwtIssue,
	validateAddress,
} from "../../src/index.js";
import type {
	EncryptedJson,
	EncryptedJsonEncoding,
	JWTVerifyOptions,
	Keypair,
	KeypairType,
} from "../../src/index.js";
import { DeriveJunction } from "../../src/key/DeriveJunction.js";
import { mnemonicToSeedSync } from "../../src/mnemonic/bip39.js";
import { naclSecretbox, naclSecretboxOpen } from "../../src/nacl/tweetnacl.js";
import type { ScryptParams } from "../../src/scrypt/types.js";

// The vectors are what Node 24, the production runtime, produces.
if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
type Case = { [key: string]: Json };
type Outcome = { result: Json } | { error: string };
type Like = { s: string } | { b: string };
type BitLength = 64 | 128 | 256 | 384 | 512;

const here = dirname(fileURLToPath(import.meta.url));

// Every random draw is taken from a seeded generator and recorded, so the
// vectors are reproducible and the Rust side can replay the same randomness.
let prngState = 0x2545f491;
const draws: Uint8Array[] = [];
const nextByte = (): number => {
	prngState ^= prngState << 13;
	prngState ^= prngState >>> 17;
	prngState ^= prngState << 5;
	return prngState & 0xff;
};
const deterministicGetRandomValues = <T extends ArrayBufferView | null>(
	array: T,
): T => {
	if (array !== null) {
		const bytes = new Uint8Array(
			array.buffer,
			array.byteOffset,
			array.byteLength,
		);
		for (let i = 0; i < bytes.length; i++) {
			bytes[i] = nextByte();
		}
		draws.push(bytes.slice());
	}
	return array;
};
Object.defineProperty(globalThis.crypto, "getRandomValues", {
	value: deterministicGetRandomValues,
	configurable: true,
	writable: true,
});

const NOW_MS = 1_750_000_000_123;
let currentNow = NOW_MS;
Date.now = (): number => currentNow;

const hex = (value: Uint8Array): string => u8aToHex(value);
const bytes = (value: string): Uint8Array => hexToU8a(value);
const fill = (length: number, value: number): Uint8Array =>
	new Uint8Array(length).fill(value);
const seq = (length: number, start = 0): Uint8Array =>
	Uint8Array.from({ length }, (_, i) => (start + i) & 0xff);
const like = (value: string | Uint8Array): Like =>
	typeof value === "string" ? { s: value } : { b: hex(value) };

const run = (fn: () => Json): Outcome => {
	try {
		return { result: fn() };
	} catch (e) {
		return { error: (e as Error).message };
	}
};

/** Runs `fn`, returning its outcome and the random bytes it drew. */
const captured = (fn: () => Json): { outcome: Outcome; random: string[] } => {
	draws.length = 0;
	const outcome = run(fn);
	const random = draws.map((d) => hex(d));
	draws.length = 0;
	return { outcome, random };
};

/** The 32-byte draw @scure/sr25519 feeds to the transcript RNG (noble also draws 16-byte blinding values). */
const srRandom = (random: string[]): Json =>
	random.find((r) => r.length === 2 + 64) ?? null;

const pairJson = (pair: Keypair): Json => ({
	publicKey: hex(pair.publicKey),
	secretKey: hex(pair.secretKey),
});

const vectors: { [section: string]: Case[] } = {};
const add = (section: string, entry: Case): void => {
	if (!vectors[section]) {
		vectors[section] = [];
	}
	vectors[section].push(entry);
};

// ---------------------------------------------------------------- @polkadot/util helpers

const HEX_INPUTS = [
	"",
	"0x",
	"0x1",
	"0x12",
	"0x123",
	"0xabCD",
	"0xzz",
	"0x12g4",
	"abcd",
	"0X12",
	"0x00ff00ff",
	"0xé1",
	"0x€€",
	"hello",
];
for (const value of HEX_INPUTS) {
	add("u8a", {
		input: value,
		isHex: isHex(value),
		hexToU8a: hex(hexToU8a(value)),
		u8aToU8a: hex(u8aToU8a(value)),
	});
}
for (const value of [
	"",
	"68656c6c6f",
	"efbbbf68656c6c6f",
	"ff fe".replace(" ", ""),
	"c3",
	"e282ac",
	"f09f9880",
	"eda080",
	"c0af",
]) {
	add("u8aToString", { input: value, result: u8aToString(bytes(`0x${value}`)) });
}
for (const length of [0, 1, 63, 64, 100, 16383, 16384, 70000]) {
	add("compactAddLength", {
		length,
		result: hex(compactAddLength(new Uint8Array(length))).slice(0, 20),
	});
}
for (const message of [
	"hello",
	"<Bytes>hello</Bytes>",
	"<Bytes></Bytes>",
	"<Bytes>hello",
	"\x19Ethereum Signed Message:\nhi",
	"",
]) {
	const u8a = u8aToU8a(message);
	add("wrap", {
		input: hex(u8a),
		isWrapped: u8aIsWrapped(u8a, false),
		isWrappedEth: u8aIsWrapped(u8a, true),
		wrap: hex(u8aWrapBytes(u8a)),
		unwrap: hex(u8aUnwrapBytes(u8a)),
	});
}

// ---------------------------------------------------------------- base32 / base58 / base64

const BASE_STRINGS = [
	"",
	"irswgzloorzgc3djpjssazlwmvzhs5dinfxgoijb",
	"birswgzloorzgc3djpjssazlwmvzhs5dinfxgoijb",
	"afkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy",
	"bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy",
	"b2rhk6GMPQF3hfzwXTaNYFLKomMeC6UXdUt6jZKPpeVirLtV",
	"zb2rhk6GMPQF3hfzwXTaNYFLKomMeC6UXdUt6jZKPpeVirLtV",
	"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
	"111",
	"1112",
	"a",
	"ab",
	"abc",
	"abcd",
	"abcdefgh",
	"not in base32",
	"IRSWG",
	"aGVsbG8gd29ybGQg0J/RgNC40LLQtdGC0YHRgtCy0YPRjiDQvNC4IOS9oOWlvQ==",
	"4pyTIMOgIGxhIG1vZGU=",
	"SGVsbG8gV29ybGQh",
	"bGlnaHQgd28=",
	"bGlnaHQgdw==",
	"bGlnaHQgdw=g=",
	"YQ==",
	"YR==",
	"YWI=",
	"YWJ=",
	"A===",
	"====",
	"A=",
	"AA==AA==",
	"YWJjZA",
	"zz",
	"0OIl",
	"a1UbyspTdnyZXLUQaQbciCxrCWWxz24kgSwGXSQnkbs=",
	"héllo",
	"ab^c",
];
const baseCodecs: [
	string,
	(value: string, ipfsCompat?: boolean) => boolean,
	(value: string, ipfsCompat?: boolean) => Uint8Array,
][] = [
	["base32", base32Validate, base32Decode],
	["base58", base58Validate, base58Decode],
	["base64", base64Validate, base64Decode],
];
for (const [name, validate, decode] of baseCodecs) {
	for (const value of BASE_STRINGS) {
		for (const ipfsCompat of [false, true]) {
			add("baseDecode", {
				codec: name,
				input: value,
				ipfsCompat,
				validate: run(() => validate(value, ipfsCompat)),
				decode: run(() => hex(decode(value, ipfsCompat))),
			});
		}
	}
}
const ENCODE_INPUTS: (string | Uint8Array)[] = [
	"",
	"Decentralize everything!!",
	"hello world Приветствую ми 你好",
	"0x1234",
	"0x123",
	new Uint8Array(),
	new Uint8Array([0]),
	new Uint8Array([0, 0, 1]),
	seq(1),
	seq(2),
	seq(3),
	seq(4),
	seq(5),
	seq(31, 200),
	fill(40, 255),
];
for (const value of ENCODE_INPUTS) {
	for (const ipfsCompat of [false, true]) {
		add("baseEncode", {
			input: like(value),
			ipfsCompat,
			base32: base32Encode(value, ipfsCompat),
			base58: base58Encode(value, ipfsCompat),
			base64: base64Encode(value, ipfsCompat),
		});
	}
	add("base64Url", {
		input: like(value),
		encode: base64URLEncode(value),
	});
}
for (const value of [
	"",
	"YWJjZA",
	"YWJjZA=",
	"YWJjZA==",
	"YQ",
	"YWI",
	"Y",
	"aGVsbG8-_w",
	"aGVsbG8+/w==",
	"a=b",
	"==",
]) {
	add("base64Strings", {
		input: value,
		pad: base64Pad(value),
		trim: base64Trim(value),
		urlDecode: run(() => hex(base64URLDecode(value))),
	});
}

// ---------------------------------------------------------------- hashing

const HASH_INPUTS: (string | Uint8Array)[] = [
	"",
	"abc",
	"0x",
	"0x123456",
	"0x123",
	"hello world",
	"日本語",
	new Uint8Array(),
	seq(64),
	seq(200, 7),
];
const KEYS: (Uint8Array | null)[] = [
	null,
	new Uint8Array(),
	new Uint8Array([1, 2]),
	fill(64, 9),
	fill(65, 9),
];
for (const data of HASH_INPUTS) {
	for (const bitLength of [64, 128, 256, 384, 512]) {
		for (const key of KEYS) {
			add("blake2", {
				data: like(data),
				bitLength,
				key: key === null ? null : hex(key),
				result: run(() => hex(blake2AsU8a(data, bitLength as BitLength, key))),
			});
		}
	}
	for (const bitLength of [0, 7, 8, 100, 520]) {
		add("blake2", {
			data: like(data),
			bitLength,
			key: null,
			result: run(() => hex(blake2AsU8a(data, bitLength as BitLength))),
		});
	}
	add("hexHash", {
		data: like(data),
		default: hexHash(data),
		bits512: hexHash(data, 512),
		asHex: blake2AsHex(data, 128),
	});
	const u8a = u8aToU8a(data);
	add("sha", {
		data: hex(u8a),
		sha256: hex(sha256AsU8a(u8a)),
		sha512: hex(sha512AsU8a(u8a)),
	});
}

type JoinInput =
	| { str: string }
	| { num: string }
	| { bool: boolean }
	| { nullish: null }
	| { arr: JoinInput[] };
type JoinValue = string | number | boolean | null | undefined | JoinValue[];
const toJoinValue = (input: JoinInput): JoinValue => {
	if ("str" in input) return input.str;
	if ("num" in input) return Number(input.num);
	if ("bool" in input) return input.bool;
	if ("nullish" in input) return undefined;
	return input.arr.map(toJoinValue);
};
const s = (str: string): JoinInput => ({ str });
const n = (num: string): JoinInput => ({ num });
const JOIN_CASES: JoinInput[][] = [
	[],
	[s("")],
	[s("a"), s("b")],
	[s("0x1234"), s("abcd")],
	[{ nullish: null }],
	[s("a"), { nullish: null }, s("b")],
	[{ arr: [s("a"), s("b")] }, s("c")],
	[{ arr: [] }, s("x")],
	[{ arr: [{ arr: [n("1"), { arr: [n("2")] }] }, { nullish: null }] }],
	[n("1"), n("2.5"), n("-0"), n("1e21"), n("1e-7"), n("0.000001")],
	[n("NaN"), n("Infinity"), n("-Infinity"), n("123456789012345680000")],
	[{ bool: true }, { bool: false }],
	[s("target"), { arr: [s("h2"), s("h1")] }, s(""), s("salt")],
];
for (const items of JOIN_CASES) {
	add("hexHashArray", {
		items: { arr: items },
		result: hexHashArray(items.map(toJoinValue)),
	});
}

for (const [passphrase, salt, rounds] of [
	["test password", seq(32, 1), 2048],
	["", seq(32), 1],
	["0x1234", seq(16), 10],
	[new Uint8Array([1, 2, 3]), new Uint8Array(), 2],
	["mnemonic", fill(8, 7), 0],
] as [string | Uint8Array, Uint8Array, number][]) {
	add("pbkdf2", {
		passphrase: like(passphrase),
		salt: hex(salt),
		rounds,
		result: run(() => hex(pbkdf2Encode(passphrase, salt, rounds).password)),
	});
}

const scryptCase = (
	passphrase: string | Uint8Array,
	salt: Uint8Array,
	params: ScryptParams,
): void => {
	add("scrypt", {
		passphrase: like(passphrase),
		salt: hex(salt),
		params: { N: params.N, p: params.p, r: params.r },
		result: run(() => hex(scryptEncode(passphrase, salt, params).password)),
	});
};
scryptCase("testing, 123", seq(32), { N: 1 << 15, p: 1, r: 8 });
scryptCase("abc", fill(32, 0), { N: 2, p: 1, r: 1 });
scryptCase("0xdeadbeef", seq(10), { N: 16, p: 2, r: 4 });
scryptCase(new Uint8Array(), new Uint8Array(), { N: 1024, p: 1, r: 8 });
scryptCase("abc", seq(32), { N: 3, p: 1, r: 8 });
scryptCase("abc", seq(32), { N: 1, p: 1, r: 8 });
scryptCase("abc", seq(32), { N: 2, p: 0, r: 1 });
scryptCase("abc", seq(32), { N: 2, p: 1, r: 0 });
scryptCase("abc", seq(32), { N: 1 << 21, p: 1, r: 8 });

for (const data of [
	scryptToU8a(seq(32), { N: 1 << 15, p: 1, r: 8 }),
	scryptToU8a(seq(32), { N: 1 << 14, p: 1, r: 8 }),
	scryptToU8a(seq(32), { N: 1 << 15, p: 2, r: 8 }),
	new Uint8Array(),
	seq(40),
	u8aToU8a(
		`${hex(scryptToU8a(fill(32, 3), { N: 1 << 15, p: 1, r: 8 }))}ffff`,
	),
]) {
	add("scryptFromU8a", {
		data: hex(data),
		result: run(() => {
			const { params, salt } = scryptFromU8a(data);
			return { N: params.N, p: params.p, r: params.r, salt: hex(salt) };
		}),
	});
}

// ---------------------------------------------------------------- nacl

for (const [message, secret, nonce] of [
	[new Uint8Array([1, 2, 3, 4, 5, 4, 3, 2, 1]), new Uint8Array(32), new Uint8Array(24)],
	[new Uint8Array(), seq(32), seq(24, 32)],
	[seq(300), fill(32, 0xaa), fill(24, 0x55)],
	[seq(3), seq(31), seq(24)],
	[seq(3), seq(32), seq(23)],
] as [Uint8Array, Uint8Array, Uint8Array][]) {
	const encrypted = run(() => hex(naclEncrypt(message, secret, nonce).encrypted));
	add("nacl", {
		message: hex(message),
		secret: hex(secret),
		nonce: hex(nonce),
		encrypted,
		decrypted:
			"result" in encrypted && typeof encrypted.result === "string"
				? run(() => {
						const out = naclDecrypt(bytes(encrypted.result as string), nonce, secret);
						return out === null ? null : hex(out);
					})
				: null,
	});
}
for (const [sealed, nonce, key] of [
	[new Uint8Array(), new Uint8Array(24), new Uint8Array(32)],
	[new Uint8Array(15), new Uint8Array(24), new Uint8Array(32)],
	[new Uint8Array(16), new Uint8Array(24), new Uint8Array(32)],
	[new Uint8Array(100), new Uint8Array(24), new Uint8Array(32)],
	[new Uint8Array(16), new Uint8Array(24), new Uint8Array(33)],
	[naclSecretbox(seq(5), fill(24, 1), fill(32, 2)), fill(24, 1), fill(32, 2)],
	[naclSecretbox(seq(5), fill(24, 1), fill(32, 2)), fill(24, 1), fill(32, 3)],
] as [Uint8Array, Uint8Array, Uint8Array][]) {
	add("naclOpen", {
		sealed: hex(sealed),
		nonce: hex(nonce),
		key: hex(key),
		result: run(() => {
			const out = naclSecretboxOpen(sealed, nonce, key);
			return out === null ? null : hex(out);
		}),
	});
}

// ---------------------------------------------------------------- keystore

const encodingJson = (json: EncryptedJson): Json => ({
	encoded: json.encoded,
	encoding: {
		content: json.encoding.content,
		type: json.encoding.type,
		version: json.encoding.version,
	},
});
for (const [data, contentType, isEncrypted] of [
	[seq(10), ["pkcs8", "sr25519"], true],
	[new Uint8Array(), [], false],
] as [Uint8Array, string[], boolean][]) {
	add("jsonEncryptFormat", {
		data: hex(data),
		contentType,
		isEncrypted,
		result: encodingJson(jsonEncryptFormat(data, contentType, isEncrypted)),
	});
}
const KEYSTORE_DATA = seq(117, 3);
for (const passphrase of ["password", "0x1234", "", null]) {
	const encrypted: { json: EncryptedJson | null } = { json: null };
	const { outcome, random } = captured(() => {
		encrypted.json = jsonEncrypt(
			KEYSTORE_DATA,
			["pkcs8", "sr25519"],
			passphrase,
		);
		return encodingJson(encrypted.json);
	});
	const json = encrypted.json;
	add("jsonEncrypt", {
		data: hex(KEYSTORE_DATA),
		passphrase,
		random,
		result: "result" in outcome ? outcome.result : null,
		decrypt: [passphrase, "wrong", "", null].map((attempt) => ({
			passphrase: attempt,
			result: json ? run(() => hex(jsonDecrypt(json, attempt))) : null,
		})),
	});
}
const hexEncoded: EncryptedJson = {
	encoded: hex(seq(8)),
	encoding: { content: [], type: "none", version: "3" },
};
add("jsonDecrypt", {
	json: encodingJson(hexEncoded),
	passphrase: null,
	result: run(() => hex(jsonDecrypt(hexEncoded, null))),
});
const emptyEncoded: EncryptedJson = {
	encoded: "",
	encoding: { content: [], type: ["none"], version: "3" },
};
add("jsonDecrypt", {
	json: encodingJson(emptyEncoded),
	passphrase: null,
	result: run(() => hex(jsonDecrypt(emptyEncoded, null))),
});
const rawPasswordBox = (() => {
	const nonce = fill(24, 4);
	const password = new Uint8Array(32);
	password.set(u8aToU8a("raw-pass"));
	return hex(
		Uint8Array.from([...nonce, ...naclSecretbox(seq(9), nonce, password)]),
	);
})();
for (const [encrypted, passphrase, encType] of [
	[null, "pass", ["scrypt", "xsalsa20-poly1305"]],
	[seq(10), null, ["scrypt", "xsalsa20-poly1305"]],
	[seq(10), "pass", ["scrypt", "xsalsa20-poly1305"]],
	[seq(10), null, ["none"]],
	[seq(10), "", ["none"]],
	[seq(10), "pass", ["none"]],
	[new Uint8Array(), null, ["none"]],
	[bytes(rawPasswordBox), "raw-pass", ["xsalsa20-poly1305"]],
	[bytes(rawPasswordBox), "other", ["xsalsa20-poly1305"]],
	[bytes(rawPasswordBox).subarray(0, 20), "raw-pass", ["xsalsa20-poly1305"]],
	[scryptToU8a(seq(32), { N: 1 << 15, p: 1, r: 8 }), "pass", ["scrypt"]],
] as [Uint8Array | null, string | null, EncryptedJsonEncoding[]][]) {
	add("jsonDecryptData", {
		encrypted: encrypted === null ? null : hex(encrypted),
		passphrase,
		encType,
		result: run(() => hex(jsonDecryptData(encrypted, passphrase, encType))),
	});
}

// ---------------------------------------------------------------- addresses

const ADDRESSES = [
	"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
	"F3opxRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29",
	"F7NZ",
	"g4b",
	"3xygo",
	"zswfoZa",
	"848Gh2GcGaZia",
	"KWCv1L3QX9LDPwY4VzvLmarEmXjVJidUzZcinvVnmxAJJCBou",
	"cLtA6nCDyvwKcEHH4QkZDSHMhS9s78BvUJUsKUbUAn1Jc2SCF",
	"yGHU8YKprxHbHdEv7oUK4rzMZXtsdhcXVG2CAMyC9WhzhjH2k",
	"4pbsSkWcBaYoFHrKJZp5fDVUKbqSYD9dhZZGvpp3vQ5ysVs5ybV",
	"r6Gr4gaMP8TsjhFbqvZhv3YvnasugLiRJpzpRHifsqqG18UXa",
	"y9EMHt34JJo4rWLSaxoLGdYXvjgSXEd4zHUnQgfNzwES8b",
	"5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMa9cj",
	"F3opIRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29",
	"0x01020304",
	"0x",
	"0x123",
	"",
	"1",
	"11111111111111111111111111111111111",
	"héllo",
];
for (const address of ADDRESSES) {
	for (const [ignoreChecksum, ss58Format] of [
		[false, -1],
		[true, -1],
		[false, 42],
		[false, 2],
	] as [boolean, number][]) {
		add("decodeAddress", {
			encoded: like(address),
			ignoreChecksum,
			ss58Format,
			result: run(() => hex(decodeAddress(address, ignoreChecksum, ss58Format))),
			validate: run(() => validateAddress(address, ignoreChecksum, ss58Format)),
		});
	}
}
add("decodeAddress", {
	encoded: like(new Uint8Array()),
	ignoreChecksum: false,
	ss58Format: -1,
	result: run(() => hex(decodeAddress(new Uint8Array()))),
	validate: null,
});
add("decodeAddress", {
	encoded: like(seq(5)),
	ignoreChecksum: false,
	ss58Format: 42,
	result: run(() => hex(decodeAddress(seq(5), false, 42))),
	validate: null,
});
for (const address of ADDRESSES.slice(0, 12)) {
	const decoded = (() => {
		try {
			return base58Decode(address);
		} catch {
			return null;
		}
	})();
	if (decoded && decoded.length > 1) {
		add("checksum", {
			decoded: hex(decoded),
			result: run(() => checkAddressChecksum(decoded)),
		});
	}
}
const ENCODE_KEYS: (string | Uint8Array)[] = [
	seq(32),
	fill(32, 255),
	seq(33),
	seq(1),
	seq(2),
	seq(4),
	seq(8),
	seq(30),
	new Uint8Array(),
	"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
	"0x3050f8456519829fe03302da802d22d3233a5f4037b9a3e2bcc403ccfcb2d735",
	"not an address",
];
for (const key of ENCODE_KEYS) {
	for (const ss58Format of [
		0, 1, 2, 42, 45, 46, 47, 48, 63, 64, 65, 69, 200, 252, 255, 4242, 14269,
		16383, 16384, -1,
	]) {
		add("encodeAddress", {
			key: like(key),
			ss58Format,
			result: run(() => encodeAddress(key, ss58Format)),
		});
	}
}

// ---------------------------------------------------------------- mnemonic

const MNEMONICS = [
	"seed sock milk update focus rotate barely fade car face mechanic mercy",
	"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
	"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
	"legal winner thank year wave sausage worth useful legal winner thank yellow",
	"zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo vote",
	"wine photo extra cushion basket dwarf humor cloud truck job boat submit",
	"seed sock milk update focus rotate barely fade car face mechanic",
	"seed sock milk update focus rotate barely fade car face mechanic mercy ",
	"seed  sock milk update focus rotate barely fade car face mechanic mercy",
	"Seed sock milk update focus rotate barely fade car face mechanic mercy",
	"abandon abandon about",
	"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art",
	"",
	"foo bar baz",
	"pompier circuler pulpe injure aspect abyssal nuque boueux equerre balisage pieuvre medecin petit suffixe soleil cumuler monstre arlequin liasse pixel garrigue noble buisson scandale",
];
for (const mnemonic of MNEMONICS) {
	add("mnemonic", {
		mnemonic,
		entropy: run(() => hex(mnemonicToEntropy(mnemonic))),
		valid: mnemonicValidate(mnemonic),
		miniSecret: ["", "Substrate", "pässwörd", "0x1234"].map((password) => ({
			password,
			result: run(() => hex(mnemonicToMiniSecret(mnemonic, password))),
		})),
		legacySeed: [32, 64, 48].map((byteLength) => ({
			byteLength,
			result: run(() =>
				hex(mnemonicToLegacySeed(mnemonic, "", false, byteLength as 32)),
			),
		})),
	});
}
for (const [mnemonic, password] of [
	["seed sock milk update focus rotate barely fade car face mechanic mercy", ""],
	["seed sock milk update focus rotate barely fade car face mechanic mercy", "café"],
	["café is not a word", "páss"],
]) {
	add("seedSync", {
		mnemonic,
		password,
		result: hex(mnemonicToSeedSync(mnemonic, password)),
	});
}
for (const entropy of [
	seq(16),
	fill(16, 255),
	seq(20),
	seq(24),
	seq(28),
	seq(32, 100),
	seq(12),
	seq(17),
	seq(36),
	new Uint8Array(),
]) {
	add("entropyToMnemonic", {
		entropy: hex(entropy),
		result: run(() => entropyToMnemonic(entropy)),
	});
}
for (const numWords of [12, 15, 18, 21, 24, 13]) {
	const { outcome, random } = captured(() =>
		mnemonicGenerate(numWords as 12),
	);
	add("mnemonicGenerate", { numWords, random, ...outcome });
}
for (const length of [32, 8, 0]) {
	const { outcome, random } = captured(() => randomAsHex(length));
	add("randomAsHex", { length, random, ...outcome });
}

// ---------------------------------------------------------------- key derivation

const junctionJson = (junction: DeriveJunction): Json => ({
	chainCode: hex(junction.chainCode),
	isHard: junction.isHard,
});
for (const code of [
	"1",
	"/1",
	"0",
	"00",
	"/007",
	"123456789012345678901234567890",
	"115792089237316195423570985008687907853269984665640564039457584007913129639935",
	"115792089237316195423570985008687907853269984665640564039457584007913129639936",
	"0x1234",
	"0x123",
	"/0x",
	`0x${"ab".repeat(32)}`,
	`0x${"ab".repeat(33)}`,
	"DOT",
	"/Alice",
	"",
	"/",
	"a".repeat(31),
	"a".repeat(32),
	"é",
	"hello world",
	"1a",
]) {
	add("deriveJunction", {
		code,
		result: run(() => junctionJson(DeriveJunction.from(code))),
	});
}
for (const path of [
	"",
	"/1",
	"//1",
	"//1/2",
	"1/2",
	"hello",
	"///x",
	"//a//b/c",
	"/a b",
	"//Alice/0x1234",
	"/1/",
	"//",
]) {
	add("keyExtractPath", {
		path,
		result: run(() => {
			const { parts, path: junctions } = keyExtractPath(path);
			return { parts, path: junctions.map(junctionJson) };
		}),
	});
}
for (const suri of [
	"//2",
	"hello world",
	"hello world/1",
	"hello world//DOT/1",
	"hello world///password",
	"hello world//1/DOT///password",
	"hello world/1//DOT///",
	"hello world///pass/word",
	"hello world///pass\nword",
	"hello  world",
	"hello world/",
	"héllo world",
	"bottom drive obey lake curtain smoke basket hold race lonely fit walk//Alice",
	"0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef//hard/soft",
	"word_1 word2",
	"",
	"a///",
	"a////b",
]) {
	add("keyExtractSuri", {
		suri,
		result: run(() => {
			const { derivePath, password, path, phrase } = keyExtractSuri(suri);
			return {
				derivePath,
				password: password ?? null,
				path: path.map(junctionJson),
				phrase,
			};
		}),
	});
}

const ALICE = sr25519FromSeed(
	mnemonicToMiniSecret(
		"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
	),
);
for (const [path, type] of [
	["//Alice", "sr25519"],
	["//Alice//stash", "sr25519"],
	["//1//0x1234//foo", "sr25519"],
	["/soft", "sr25519"],
	["//hard/soft//hard2/soft2", "sr25519"],
	["", "ecdsa"],
	["//Alice", "ecdsa"],
	["//Alice", "ed25519"],
	["//Alice", "ethereum"],
] as [string, KeypairType][]) {
	const { outcome, random } = captured(() =>
		pairJson(keyFromPath(ALICE, keyExtractPath(path).path, type)),
	);
	add("keyFromPath", {
		pair: pairJson(ALICE),
		path,
		type,
		random: random.filter((r) => r.length === 2 + 64),
		...outcome,
	});
}

// ---------------------------------------------------------------- sr25519

const SEEDS: (string | Uint8Array)[] = [
	"12345678901234567890123456789012",
	"0x98b3d305d5a5eace562387e47e59badd4d77e3f72cabfb10a60f8a197059f0a8",
	new Uint8Array(32),
	fill(32, 1),
	fill(32, 255),
	seq(32),
	seq(31),
	"0x1234",
];
for (const seed of SEEDS) {
	add("fromSeed", {
		seed: like(seed),
		result: run(() => pairJson(sr25519FromSeed(seed))),
	});
}

const PAIRS = [fill(32, 1), fill(32, 2), seq(32, 9)].map((seed) =>
	sr25519FromSeed(seed),
);
const MESSAGES: (string | Uint8Array)[] = [
	"",
	"hello world",
	"0x1234",
	"this is a message",
	seq(1),
	seq(500),
	u8aWrapBytes("hello"),
];
const ZERO_SECRET = new Uint8Array(64);
const ORDER_SECRET = (() => {
	const order = bytes(
		"0xedd3f55c1a631258d69cf7a2def9de1400000000000000000000000000000010",
	);
	const shifted = new Uint8Array(64);
	let carry = 0;
	for (let i = 0; i < 32; i++) {
		const value = ((order[i] ?? 0) << 3) | carry;
		shifted[i] = value & 0xff;
		carry = value >> 8;
	}
	return shifted;
})();
const signCase = (message: string | Uint8Array, secretKey: Uint8Array): Json => {
	const { outcome, random } = captured(() =>
		hex(sr25519Sign(message, { secretKey })),
	);
	add("sign", {
		message: like(message),
		secretKey: hex(secretKey),
		random: srRandom(random),
		...outcome,
	});
	return "result" in outcome ? outcome.result : null;
};
const signatures: { message: string | Uint8Array; signature: string; publicKey: Uint8Array }[] = [];
for (const pair of PAIRS) {
	for (const message of MESSAGES) {
		const signature = signCase(message, pair.secretKey);
		if (typeof signature === "string") {
			signatures.push({ message, signature, publicKey: pair.publicKey });
		}
	}
}
signCase("x", seq(63));
signCase("x", ZERO_SECRET);
signCase("x", ORDER_SECRET);

const tamper = (signature: string, index: number, xor: number): Uint8Array => {
	const out = bytes(signature);
	out[index] = (out[index] ?? 0) ^ xor;
	return out;
};
const verifyCase = (
	message: string | Uint8Array,
	signature: string | Uint8Array,
	publicKey: string | Uint8Array,
): void => {
	add("verify", {
		message: like(message),
		signature: like(signature),
		publicKey: like(publicKey),
		result: run(() => sr25519Verify(message, signature, publicKey)),
	});
};
for (const { message, signature, publicKey } of signatures) {
	verifyCase(message, signature, publicKey);
	verifyCase(message, tamper(signature, 0, 1), publicKey);
	verifyCase(message, tamper(signature, 40, 1), publicKey);
	verifyCase(message, signature, PAIRS[0]?.publicKey ?? publicKey);
	if (typeof message === "string") {
		verifyCase(`${message}!`, signature, publicKey);
	}
}
const SIG = signatures[0]?.signature ?? "0x";
const PUB = PAIRS[0]?.publicKey ?? new Uint8Array(32);
const sMax = bytes(SIG);
sMax.set(fill(31, 0xff), 32);
sMax[63] = 0xff;
const sZero = bytes(SIG);
sZero.set(new Uint8Array(32), 32);
sZero[63] = 0x80;
const badR1 = bytes(SIG);
badR1[0] = 1;
const badR2 = bytes(SIG);
badR2.set(fill(32, 0x02), 0);
verifyCase("hello world", tamper(SIG, 63, 0x80), PUB);
verifyCase("hello world", sMax, PUB);
verifyCase("", sZero, PUB);
verifyCase("", sZero, new Uint8Array(32));
verifyCase("", badR1, PUB);
verifyCase("", badR2, PUB);
verifyCase("", SIG, fill(32, 0x02));
verifyCase("", SIG, new Uint8Array(32));
verifyCase("", SIG, fill(32, 0xff));
verifyCase("", SIG, new Uint8Array(31));
verifyCase("", new Uint8Array(65), PUB);
verifyCase("", hex(PUB), SIG);

for (const pair of PAIRS.slice(0, 2)) {
	for (const chainCode of [new Uint8Array(32), seq(32), fill(32, 7)]) {
		add("deriveHard", {
			pair: pairJson(pair),
			chainCode: hex(chainCode),
			result: run(() => pairJson(sr25519DeriveHard(pair, chainCode))),
		});
		const { outcome, random } = captured(() =>
			pairJson(sr25519DeriveSoft(pair, chainCode)),
		);
		add("deriveSoft", {
			pair: pairJson(pair),
			chainCode: hex(chainCode),
			random: srRandom(random),
			...outcome,
		});
		add("derivePublic", {
			publicKey: like(pair.publicKey),
			chainCode: hex(chainCode),
			result: run(() => hex(sr25519DerivePublic(pair.publicKey, chainCode))),
		});
	}
}
const oddPair: Keypair = { publicKey: PUB, secretKey: fill(64, 0xff) };
add("deriveHard", {
	pair: pairJson(oddPair),
	chainCode: hex(seq(32)),
	result: run(() => pairJson(sr25519DeriveHard(oddPair, seq(32)))),
});
const zeroPair: Keypair = { publicKey: PUB, secretKey: ZERO_SECRET };
add("deriveHard", {
	pair: pairJson(zeroPair),
	chainCode: hex(seq(32)),
	result: run(() => pairJson(sr25519DeriveHard(zeroPair, seq(32)))),
});
const shortPair: Keypair = { publicKey: PUB, secretKey: seq(10) };
add("deriveHard", {
	pair: pairJson(shortPair),
	chainCode: hex(seq(32)),
	result: run(() => pairJson(sr25519DeriveHard(shortPair, seq(32)))),
});
add("deriveHard", {
	pair: pairJson(PAIRS[0] ?? oddPair),
	chainCode: hex(seq(31)),
	result: run(() => pairJson(sr25519DeriveHard(PAIRS[0] ?? oddPair, seq(31)))),
});
for (const [pair, chainCode] of [
	[zeroPair, seq(32)],
	[oddPair, seq(32)],
	[shortPair, seq(32)],
	[PAIRS[0] ?? oddPair, seq(33)],
] as [Keypair, Uint8Array][]) {
	const { outcome, random } = captured(() =>
		pairJson(sr25519DeriveSoft(pair, chainCode)),
	);
	add("deriveSoft", {
		pair: pairJson(pair),
		chainCode: hex(chainCode),
		random: srRandom(random),
		...outcome,
	});
}
for (const [publicKey, chainCode] of [
	[new Uint8Array(32), seq(32)],
	[fill(32, 0xff), seq(32)],
	[fill(32, 0x02), seq(32)],
	[new Uint8Array(31), seq(32)],
	[PUB, seq(3)],
	[hex(PUB), seq(32)],
] as [string | Uint8Array, Uint8Array][]) {
	add("derivePublic", {
		publicKey: like(publicKey),
		chainCode: hex(chainCode),
		result: run(() => hex(sr25519DerivePublic(publicKey, chainCode))),
	});
}

for (const [secretKey, publicKey] of [
	[PAIRS[0]?.secretKey, PAIRS[1]?.publicKey],
	[PAIRS[1]?.secretKey, PAIRS[0]?.publicKey],
	[PAIRS[2]?.secretKey, PAIRS[2]?.publicKey],
	[hex(PAIRS[0]?.secretKey ?? ZERO_SECRET), hex(PUB)],
	[ZERO_SECRET, PUB],
	[ORDER_SECRET, PUB],
	[fill(64, 0xff), PUB],
	[PAIRS[0]?.secretKey, new Uint8Array(32)],
	[PAIRS[0]?.secretKey, fill(32, 0x02)],
	[PAIRS[0]?.secretKey, new Uint8Array(31)],
	[seq(63), PUB],
] as [string | Uint8Array, string | Uint8Array][]) {
	add("agreement", {
		secretKey: like(secretKey),
		publicKey: like(publicKey),
		result: run(() => hex(sr25519Agreement(secretKey, publicKey))),
	});
}

const vrfOutputs: { message: string | Uint8Array; output: string; publicKey: Uint8Array; context: string; extra: string }[] = [];
for (const pair of PAIRS) {
	for (const [message, context, extra] of [
		["this is a message", "", ""],
		["this is a message", "my context", ""],
		["this is a message", "my context", "some extra transcript data"],
		["0x1234", "0x99", "0x"],
		[seq(100), "", "x"],
	] as [string | Uint8Array, string, string][]) {
		const { outcome, random } = captured(() =>
			hex(sr25519VrfSign(message, { secretKey: pair.secretKey }, context, extra)),
		);
		add("vrfSign", {
			message: like(message),
			secretKey: hex(pair.secretKey),
			context: like(context),
			extra: like(extra),
			random: srRandom(random),
			...outcome,
		});
		if ("result" in outcome && typeof outcome.result === "string") {
			vrfOutputs.push({
				message,
				output: outcome.result,
				publicKey: pair.publicKey,
				context,
				extra,
			});
		}
	}
}
for (const secretKey of [ZERO_SECRET, ORDER_SECRET, seq(63)]) {
	const { outcome, random } = captured(() =>
		hex(sr25519VrfSign("m", { secretKey })),
	);
	add("vrfSign", {
		message: like("m"),
		secretKey: hex(secretKey),
		context: like(""),
		extra: like(""),
		random: srRandom(random),
		...outcome,
	});
}
const vrfVerifyCase = (
	message: string | Uint8Array,
	output: string | Uint8Array,
	publicKey: string | Uint8Array,
	context: string,
	extra: string,
): void => {
	add("vrfVerify", {
		message: like(message),
		output: like(output),
		publicKey: like(publicKey),
		context: like(context),
		extra: like(extra),
		result: run(() => sr25519VrfVerify(message, output, publicKey, context, extra)),
	});
};
for (const { message, output, publicKey, context, extra } of vrfOutputs) {
	vrfVerifyCase(message, output, publicKey, context, extra);
	vrfVerifyCase(message, output, publicKey, `${context}!`, extra);
	vrfVerifyCase(message, output, publicKey, context, `${extra}!`);
	vrfVerifyCase(message, tamper(output, 40, 1), publicKey, context, extra);
	vrfVerifyCase(message, output, PAIRS[1]?.publicKey ?? publicKey, context, extra);
}
const VRF = vrfOutputs[0]?.output ?? "0x";
const vrfWith = (offset: number, value: Uint8Array): Uint8Array => {
	const out = bytes(VRF);
	out.set(value, offset);
	return out;
};
vrfVerifyCase("this is a message", vrfWith(32, fill(32, 0xff)), PUB, "", "");
vrfVerifyCase("this is a message", vrfWith(64, fill(32, 0xff)), PUB, "", "");
vrfVerifyCase("this is a message", vrfWith(32, new Uint8Array(32)), PUB, "", "");
vrfVerifyCase("this is a message", vrfWith(64, new Uint8Array(32)), PUB, "", "");
vrfVerifyCase("this is a message", vrfWith(0, new Uint8Array(32)), PUB, "", "");
vrfVerifyCase("this is a message", vrfWith(0, fill(32, 0x02)), PUB, "", "");
vrfVerifyCase("this is a message", VRF, new Uint8Array(32), "", "");
vrfVerifyCase("this is a message", VRF, fill(32, 0x02), "", "");
vrfVerifyCase("this is a message", new Uint8Array(95), PUB, "", "");
vrfVerifyCase("this is a message", VRF, new Uint8Array(33), "", "");

// ---------------------------------------------------------------- signatureVerify

const signWith = (message: string | Uint8Array, pair: Keypair): Uint8Array =>
	sr25519Sign(message, pair);
const P0 = PAIRS[0] ?? ALICE;
const P1 = PAIRS[1] ?? ALICE;
const SV_PLAIN = signWith("hello world", P0);
const SV_WRAPPED = signWith(u8aWrapBytes("hello world"), P0);
const SV_ETH = signWith("\x19Ethereum Signed Message:\nhi", P0);
const prefixed = (prefix: number, signature: Uint8Array, extra = 0): Uint8Array =>
	Uint8Array.from([prefix, ...signature, ...new Uint8Array(extra)]);
const startingWith = (first: number, signature: Uint8Array): Uint8Array => {
	const out = signature.slice();
	out[0] = first;
	return out;
};
const P0_ADDRESS = encodeAddress(P0.publicKey);
for (const [message, signature, address] of [
	["hello world", SV_PLAIN, P0.publicKey],
	["hello world", SV_PLAIN, P0_ADDRESS],
	["hello world", SV_PLAIN, hex(P0.publicKey)],
	["hello world", SV_PLAIN, P1.publicKey],
	[u8aWrapBytes("hello world"), SV_PLAIN, P0.publicKey],
	["hello world", SV_WRAPPED, P0.publicKey],
	[u8aWrapBytes("hello world"), SV_WRAPPED, P0.publicKey],
	["\x19Ethereum Signed Message:\nhi", SV_ETH, P0.publicKey],
	["\x19Ethereum Signed Message:\nhi", SV_PLAIN, P0.publicKey],
	["hello world", prefixed(1, SV_PLAIN), P0.publicKey],
	["hello world", prefixed(1, SV_WRAPPED), P0.publicKey],
	["hello world", prefixed(1, SV_PLAIN), P1.publicKey],
	["hello world", prefixed(0, SV_PLAIN), P0.publicKey],
	["hello world", prefixed(2, SV_PLAIN), P0.publicKey],
	["hello world", prefixed(1, SV_PLAIN, 1), P0.publicKey],
	["hello world", prefixed(3, SV_PLAIN), P0.publicKey],
	["hello world", startingWith(1, SV_PLAIN), P0.publicKey],
	["hello world", new Uint8Array(64), P0.publicKey],
	["hello world", hex(SV_PLAIN), P0_ADDRESS],
	["0x68656c6c6f20776f726c64", SV_PLAIN, P0.publicKey],
	["hello world", SV_PLAIN.subarray(0, 63), P0.publicKey],
	["hello world", new Uint8Array(67), P0.publicKey],
	["hello world", SV_PLAIN, "not an address"],
	["hello world", SV_PLAIN, ""],
	["hello world", SV_PLAIN, new Uint8Array(31)],
	["hello world", SV_PLAIN, seq(4)],
] as [string | Uint8Array, string | Uint8Array, string | Uint8Array][]) {
	add("signatureVerify", {
		message: like(message),
		signature: like(signature),
		address: like(address),
		result: run(() => {
			const r = signatureVerify(message, signature, address);
			return {
				crypto: r.crypto,
				isValid: r.isValid,
				isWrapped: r.isWrapped,
				publicKey: hex(r.publicKey),
			};
		}),
	});
}

// ---------------------------------------------------------------- JWT

const JWT_PAIR = PAIRS[2] ?? ALICE;
const jwtTokens: { name: string; token: string }[] = [];
for (const [name, nowMs, options, message] of [
	["default", NOW_MS, undefined, undefined],
	["expires600", NOW_MS, { expiresIn: 600.7 }, undefined],
	["expiresZero", NOW_MS, { expiresIn: 0 }, undefined],
	["expiredAlready", NOW_MS, { expiresIn: -1 }, undefined],
	["notBefore", NOW_MS, { expiresIn: 300, notBefore: NOW_MS / 1000 + 600.5 }, undefined],
	["notBeforeZero", NOW_MS, { notBefore: 0 }, undefined],
	["audience", NOW_MS, undefined, { aud: "https://pronode1.prosopo.io" }],
	["otherAudience", NOW_MS, undefined, { aud: "https://pronode2.prosopo.io" }],
	["longLived", NOW_MS, { expiresIn: 7200 }, undefined],
	[
		"overrides",
		NOW_MS,
		{ expiresIn: 300 },
		{ sub: `0x${"00".repeat(32)}`, iat: "0", exp: "9", role: "admin", "2": "two", "10": "ten", "01": "zero-one", "é\"\n\\": "q\u0001\u001f\u007f" },
	],
	["fractionalNow", NOW_MS + 999, { expiresIn: 1e21 }, undefined],
] as [string, number, { expiresIn?: number; notBefore?: number } | undefined, { [key: string]: string } | undefined][]) {
	currentNow = nowMs;
	const { outcome, random } = captured(() =>
		sr25519jwtIssue(JWT_PAIR, options, message),
	);
	currentNow = NOW_MS;
	add("jwtIssue", {
		name,
		nowMs,
		pair: pairJson(JWT_PAIR),
		expiresIn: options?.expiresIn ?? null,
		notBefore: options?.notBefore ?? null,
		message: message ? Object.entries(message).map(([k, v]) => [k, v]) : [],
		random: srRandom(random),
		...outcome,
	});
	if ("result" in outcome && typeof outcome.result === "string") {
		jwtTokens.push({ name, token: outcome.result });
	}
}
{
	const { outcome } = captured(() =>
		sr25519jwtIssue({ publicKey: JWT_PAIR.publicKey, secretKey: seq(63) }),
	);
	add("jwtIssue", {
		name: "badSecret",
		nowMs: NOW_MS,
		pair: pairJson({ publicKey: JWT_PAIR.publicKey, secretKey: seq(63) }),
		expiresIn: null,
		notBefore: null,
		message: [],
		random: null,
		...outcome,
	});
}

const rawToken = (header: string, payload: string, signer: (input: string) => Uint8Array): string => {
	const signingInput = `${base64URLEncode(header)}.${base64URLEncode(payload)}`;
	return `${signingInput}.${base64URLEncode(signer(signingInput))}`;
};
const jwtSigner = (input: string): Uint8Array => sr25519Sign(input, JWT_PAIR);
const SUB = JSON.stringify(hex(JWT_PAIR.publicKey));
const NOW_S = Math.floor(NOW_MS / 1000);
const claims = (overrides: { [key: string]: string }): string => {
	const entries: { [key: string]: string } = {
		sub: SUB,
		iat: String(NOW_S),
		nbf: String(NOW_S),
		exp: String(NOW_S + 300),
		...overrides,
	};
	return `{${Object.entries(entries)
		.map(([k, v]) => `${JSON.stringify(k)}:${v}`)
		.join(",")}}`;
};
const HEADER = JSON.stringify({ alg: "sr25519", typ: "JWT" });
for (const [name, header, payload] of [
	["noneAlg", JSON.stringify({ alg: "none" }), claims({})],
	["upperAlg", JSON.stringify({ alg: "SR25519" }), claims({})],
	["arrayAlg", JSON.stringify({ alg: ["sr25519"] }), claims({})],
	["nullHeader", "null", claims({})],
	["stringHeader", '"sr25519"', claims({})],
	["arrayHeader", "[]", claims({})],
	["bomHeader", `﻿${HEADER}`, claims({})],
	["spacedHeader", ` ${HEADER}\n`, claims({})],
	["intClaims", HEADER, claims({})],
	["noNbf", HEADER, `{"sub":${SUB},"iat":${NOW_S},"exp":${NOW_S + 300}}`],
	["stringNbf", HEADER, claims({ nbf: '"0"' })],
	["nullNbf", HEADER, claims({ nbf: "null" })],
	["boolNbf", HEADER, claims({ nbf: "true" })],
	["infExp", HEADER, claims({ exp: "1e400" })],
	["infIat", HEADER, claims({ iat: "1e400" })],
	["negInfNbf", HEADER, claims({ nbf: "-1e400" })],
	["fracExp", HEADER, claims({ exp: String(NOW_MS / 1000 + 0.5) })],
	["justExpired", HEADER, claims({ exp: String(NOW_MS / 1000 - 0.001) })],
	["futureNbf", HEADER, claims({ nbf: String(NOW_S + 10) })],
	["nullPayload", HEADER, "null"],
	["arrayPayload", HEADER, "[]"],
	["stringPayload", HEADER, '"payload"'],
	["numberPayload", HEADER, "1"],
	["numberSub", HEADER, claims({ sub: "123" })],
	["otherSub", HEADER, claims({ sub: JSON.stringify(hex(PUB)) })],
	["unprefixedSub", HEADER, claims({ sub: JSON.stringify(hex(JWT_PAIR.publicKey).slice(2)) })],
	["arrayAud", HEADER, claims({ aud: '["x","https://pronode1.prosopo.io"]' })],
	["nullAud", HEADER, claims({ aud: "null" })],
	["numberAud", HEADER, claims({ aud: "1" })],
	["duplicateExp", HEADER, `{"sub":${SUB},"iat":${NOW_S},"exp":1,"exp":${NOW_S + 300}}`],
	["escapedKeys", HEADER, `{"s\\u0075b":${SUB},"iat":${NOW_S},"exp":${NOW_S + 300}}`],
	["badJson", HEADER, "{"],
	["trailingComma", HEADER, `{"sub":${SUB},}`],
] as [string, string, string][]) {
	jwtTokens.push({ name, token: rawToken(header, payload, jwtSigner) });
}
const VALID_TOKEN = jwtTokens[0]?.token ?? "";
const [vh, vp, vs] = VALID_TOKEN.split(".");
jwtTokens.push({ name: "wrapped", token: rawToken(HEADER, claims({}), (input) => sr25519Sign(u8aWrapBytes(input), JWT_PAIR)) });
jwtTokens.push({ name: "multisig", token: rawToken(HEADER, claims({}), (input) => Uint8Array.from([1, ...sr25519Sign(input, JWT_PAIR)])) });
jwtTokens.push({ name: "shortSig", token: rawToken(HEADER, claims({}), (input) => sr25519Sign(input, JWT_PAIR).subarray(0, 63)) });
jwtTokens.push({ name: "emptySigBytes", token: `${vh}.${vp}.==` });
jwtTokens.push({ name: "badSigChars", token: `${vh}.${vp}.!!!!` });
jwtTokens.push({ name: "twoParts", token: `${vh}.${vp}` });
jwtTokens.push({ name: "fourParts", token: `${VALID_TOKEN}.x` });
jwtTokens.push({ name: "emptyHeader", token: `.${vp}.${vs}` });
jwtTokens.push({ name: "blah", token: "blah.blah.blah" });
jwtTokens.push({ name: "tamperedPayload", token: `${vh}.${base64URLEncode(claims({ role: '"x"' }))}.${vs}` });

const VERIFY_OPTIONS: [string, JWTVerifyOptions | undefined][] = [
	["none", undefined],
	["audience", { audience: ["https://pronode1.prosopo.io"] }],
	["requireAudience", { audience: ["https://pronode1.prosopo.io"], requireAudience: true }],
	["maxLifetime", { maxLifetimeSeconds: 3600 }],
	["maxLifetimeTight", { maxLifetimeSeconds: 299 }],
];
for (const { name, token } of jwtTokens) {
	for (const [optionsName, options] of VERIFY_OPTIONS) {
		for (const [nowName, nowMs] of [
			["now", NOW_MS],
			["later", NOW_MS + 400_000],
			["much later", NOW_MS + 700_000],
		] as [string, number][]) {
			if (optionsName !== "none" && nowName !== "now") continue;
			for (const publicKey of nowName === "now" && optionsName === "none" ? [JWT_PAIR.publicKey, PUB] : [JWT_PAIR.publicKey]) {
				currentNow = nowMs;
				const outcome = run(() => {
					const r = jwtVerify(token, publicKey, options);
					return {
						isValid: r.isValid,
						error: r.error ?? null,
						crypto: r.crypto,
						publicKey: hex(r.publicKey),
						isWrapped: r.isWrapped,
						payload: r.payload ? JSON.stringify(r.payload) : null,
					};
				});
				currentNow = NOW_MS;
				add("jwtVerify", {
					name,
					token,
					publicKey: hex(publicKey),
					nowMs,
					audience: options?.audience ?? null,
					requireAudience: options?.requireAudience ?? false,
					maxLifetimeSeconds: options?.maxLifetimeSeconds ?? null,
					...outcome,
				});
			}
		}
	}
}

// ---------------------------------------------------------------- secp256k1

for (const publicKey of [
	bytes("0x03b9dc646dd71118e5f7fda681ad9eca36eb3ee96f344f582fbe7b5bcdebb13077"),
	bytes("0x04b9dc646dd71118e5f7fda681ad9eca36eb3ee96f344f582fbe7b5bcdebb1307763fe926c273235fd979a134076d00fd1683cbd35868cb485d4a3a640e52184af"),
	bytes("0x04b9dc646dd71118e5f7fda681ad9eca36eb3ee96f344f582fbe7b5bcdebb1307763fe926c273235fd979a134076d00fd1683cbd35868cb485d4a3a640e52184ae"),
	new Uint8Array(65),
	Uint8Array.from([4, ...new Uint8Array(64)]),
	seq(33),
	seq(32),
]) {
	add("secp256k1Compress", {
		publicKey: hex(publicKey),
		result: run(() => hex(secp256k1Compress(publicKey))),
	});
}
for (const seed of [
	bytes("0x4380de832af797688026ce24f85204d508243f201650c1a134929e5458b7fbae"),
	seq(32),
	new Uint8Array(32),
	fill(32, 0xff),
	bytes("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
	bytes("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140"),
	seq(31),
]) {
	add("secp256k1PairFromSeed", {
		seed: hex(seed),
		result: run(() => pairJson(secp256k1PairFromSeed(seed))),
	});
}

// ---------------------------------------------------------------- Rust-produced values, checked by TS

type RustSigned = {
	signatures: { message: string; signature: string; publicKey: string }[];
	vrf: { message: string; output: string; publicKey: string; context: string; extra: string }[];
	jwts: { token: string; publicKey: string; nowMs: number }[];
	keystores: { json: EncryptedJson; passphrase: string; data: string }[];
	softDerived: { publicKey: string; secretKey: string }[];
};
const rustSignedPath = join(here, "rust-signed.json");
if (existsSync(rustSignedPath)) {
	const rustSigned = JSON.parse(readFileSync(rustSignedPath, "utf8")) as RustSigned;
	for (const entry of rustSigned.signatures) {
		add("rustSigned", {
			kind: "signature",
			input: entry,
			tsResult: run(() => sr25519Verify(bytes(entry.message), entry.signature, entry.publicKey)),
		});
	}
	for (const entry of rustSigned.vrf) {
		add("rustSigned", {
			kind: "vrf",
			input: entry,
			tsResult: run(() =>
				sr25519VrfVerify(bytes(entry.message), entry.output, entry.publicKey, bytes(entry.context), bytes(entry.extra)),
			),
		});
	}
	for (const entry of rustSigned.jwts) {
		currentNow = entry.nowMs;
		add("rustSigned", {
			kind: "jwt",
			input: entry,
			tsResult: run(() => jwtVerify(entry.token, bytes(entry.publicKey)).isValid),
		});
		currentNow = NOW_MS;
	}
	for (const entry of rustSigned.keystores) {
		add("rustSigned", {
			kind: "keystore",
			input: { json: encodingJson(entry.json), passphrase: entry.passphrase, data: entry.data },
			tsResult: run(() => hex(jsonDecrypt(entry.json, entry.passphrase)) === entry.data),
		});
	}
	for (const entry of rustSigned.softDerived) {
		add("rustSigned", {
			kind: "softDerived",
			input: entry,
			tsResult: run(() => {
				const message = "soft derived key works";
				const signature = sr25519Sign(message, { secretKey: bytes(entry.secretKey) });
				return sr25519Verify(message, signature, entry.publicKey);
			}),
		});
	}
}

writeFileSync(
	join(here, "vectors.json"),
	`${JSON.stringify(vectors, null, "\t")}\n`,
);
