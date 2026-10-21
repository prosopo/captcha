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


// Records the keyring's behaviour into vectors.json, which equivalence.rs replays against the
// Rust. Randomness comes from a seeded generator and every draw is recorded, so the Rust can
// replay it and match signatures and encrypted exports byte for byte.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { u8aToHex } from "@polkadot/util";
import { ProsopoEnvError } from "@prosopo/common";
import type { KeyringPair, KeyringPair$Json } from "@prosopo/types";
import {
	type KeypairType,
	base64Encode,
	encodeAddress,
	mnemonicGenerate,
	sr25519FromSeed,
} from "@prosopo/util-crypto";
import { getPair } from "../../src/accounts/getPair.js";
import { DEV_PHRASE, Keyring } from "../../src/keyring/keyring.js";
import { createTestKeyring } from "../../src/keyring/testing.js";
import { decodePair } from "../../src/pair/decode.js";
import { PAIR_DIV, PAIR_HDR } from "../../src/pair/defaults.js";

// The vectors are what Node 24, the production runtime, produces.
if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

let prngState = 0x6b657972;
const draws: Uint8Array[] = [];
const nextByte = (): number => {
	prngState ^= prngState << 13;
	prngState ^= prngState >>> 17;
	prngState ^= prngState << 5;
	return prngState & 0xff;
};
Object.defineProperty(globalThis.crypto, "getRandomValues", {
	value: <T extends ArrayBufferView | null>(array: T): T => {
		if (array !== null) {
			const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
			for (let i = 0; i < bytes.length; i++) bytes[i] = nextByte();
			draws.push(bytes.slice());
		}
		return array;
	},
	configurable: true,
	writable: true,
});

const NOW_MS = 1_750_000_000_123;
Date.now = (): number => NOW_MS;

const hex = (value: Uint8Array): string => u8aToHex(value);

type Outcome = { result: Json } | { error: string };

/** Runs `fn`, returning its outcome and the random bytes it drew. */
const captured = (fn: () => Json): Outcome & { random: string[] } => {
	draws.length = 0;
	let outcome: Outcome;
	try {
		outcome = { result: fn() };
	} catch (e) {
		outcome = { error: (e as Error).message };
	}
	const random = draws.map(hex);
	draws.length = 0;
	return { ...outcome, random };
};

const pairState = (pair: KeyringPair): Json => ({
	publicKey: hex(pair.publicKey),
	address: pair.address,
	isLocked: pair.isLocked,
	meta: JSON.parse(JSON.stringify(pair.meta)) as Json,
});

const isHardOnly = (suri: string): boolean => !/(^|[^/])\/[^/]/.test(suri.replace(/\/\/\/.*$/, ""));

const mnemonic15 = mnemonicGenerate(15);
const mnemonic24 = mnemonicGenerate(24);
const SEED_HEX = hex(new Uint8Array(32).fill(1));

const SURIS: [string, KeypairType | undefined][] = [
	...[
		DEV_PHRASE,
		`${DEV_PHRASE}//Alice`,
		"//Alice",
		"//Alice//stash",
		"//Alice/soft",
		`${DEV_PHRASE}/Alice`,
		`${DEV_PHRASE}///pass`,
		`${DEV_PHRASE}//Alice///pass`,
		`${DEV_PHRASE}///`,
		"//1",
		"//0",
		"//18446744073709551616",
		"/1",
		`//${"long".repeat(10)}`,
		"//",
		"///pass",
		"hello",
		"hello world",
		"x".repeat(32),
		"x".repeat(33),
		"Alice",
		"Alice//stash",
		"Alice/soft",
		SEED_HEX,
		`${SEED_HEX}//Alice`,
		`0x${"ab".repeat(31)}`,
		`0x${"ab".repeat(15)}`,
		"0x00",
		`${DEV_PHRASE} extra`,
		`${"abandon ".repeat(11)}abandon`,
		`${"abandon ".repeat(11)}about`,
		DEV_PHRASE.toUpperCase(),
		mnemonic15,
		mnemonic24,
		`${mnemonic24}//hard/soft`,
		"",
		" ",
		"a  b",
		"é",
		"hello//",
		"hello///",
	].map((suri): [string, KeypairType | undefined] => [suri, undefined]),
	[DEV_PHRASE, "ethereum"],
	[SEED_HEX, "ethereum"],
	[DEV_PHRASE, "ed25519"],
	[SEED_HEX, "ed25519"],
	["hello", "ecdsa"],
	["hello", "sr25519"],
];

const uri = SURIS.map(([suri, type]) => {
	const outcome = captured(() => {
		const pair = new Keyring({ ss58Format: 42 }).createFromUri(suri, { name: "uri" }, type);
		return {
			...(pairState(pair) as { [key: string]: Json }),
			...(isHardOnly(suri) ? { secretKey: hex(pair.encodePkcs8().subarray(16, 80)) } : {}),
		};
	});
	return { suri, type: type ?? null, ...outcome };
});

const testPairs = createTestKeyring({ ss58Format: 42 }).getPairs();
const alice = testPairs[0] as KeyringPair;
const bob = testPairs[2] as KeyringPair;

const aliceJson = alice.toJson();
const aliceEncrypted = (captured(() => alice.toJson("testing") as unknown as Json) as { result: Json }).result as unknown as KeyringPair$Json;

const seedOnly = (seed: Uint8Array, publicKey: Uint8Array): string =>
	base64Encode(new Uint8Array([...PAIR_HDR, ...seed, ...PAIR_DIV, ...publicKey]));
const seed2 = new Uint8Array(32).fill(2);
const generation2 = seedOnly(seed2, sr25519FromSeed(seed2).publicKey);

const withEncoding = (encoding: Partial<KeyringPair$Json["encoding"]>): KeyringPair$Json => ({
	...aliceJson,
	encoding: { ...aliceJson.encoding, ...encoding },
});
const corrupt = (bytes: number[]): string => base64Encode(new Uint8Array(bytes));
const aliceBody = Array.from(alice.encodePkcs8());

const JSONS: [string, Json, boolean][] = [
	["alice", aliceJson as unknown as Json, false],
	["alice encrypted", aliceEncrypted as unknown as Json, false],
	["generation 2 seed", { ...aliceJson, address: encodeAddress(sr25519FromSeed(seed2).publicKey, 42), encoded: generation2 } as unknown as Json, false],
	["hex address", { ...aliceJson, address: hex(alice.publicKey) } as unknown as Json, false],
	["hex encoded", { ...aliceJson, encoded: hex(alice.encodePkcs8()) } as unknown as Json, false],
	["empty encoded", { ...aliceJson, encoded: "" } as unknown as Json, false],
	["single encoding type", withEncoding({ type: "none" }) as unknown as Json, false],
	["v3 not pkcs8", withEncoding({ content: ["none", "sr25519"] }) as unknown as Json, false],
	["v3 empty content", withEncoding({ content: [] }) as unknown as Json, false],
	["no crypto type", withEncoding({ content: ["pkcs8"] }) as unknown as Json, false],
	["empty crypto type", withEncoding({ content: ["pkcs8", ""] }) as unknown as Json, false],
	["ed25519", withEncoding({ content: ["pkcs8", "ed25519"] }) as unknown as Json, false],
	["v0 ed25519", withEncoding({ content: ["pkcs8", "ed25519"], version: "0" }) as unknown as Json, false],
	["v2 not pkcs8", withEncoding({ content: ["none", "sr25519"], version: "2" }) as unknown as Json, false],
	["bad header", { ...aliceJson, encoded: corrupt([0, ...aliceBody.slice(1)]) } as unknown as Json, false],
	["bad divider", { ...aliceJson, encoded: corrupt([...aliceBody.slice(0, 80), 0, ...aliceBody.slice(81)]) } as unknown as Json, false],
	["truncated", { ...aliceJson, encoded: corrupt(aliceBody.slice(0, 90)) } as unknown as Json, false],
	["bad address", { ...aliceJson, address: "not-an-address" } as unknown as Json, false],
	["bad checksum", { ...aliceJson, address: `${aliceJson.address.slice(0, -1)}${aliceJson.address.endsWith("Q") ? "R" : "Q"}` } as unknown as Json, false],
	["bad checksum ignored", { ...aliceJson, address: `${aliceJson.address.slice(0, -1)}${aliceJson.address.endsWith("Q") ? "R" : "Q"}` } as unknown as Json, true],
	["address of another key", { ...aliceEncrypted, address: bob.address } as unknown as Json, false],
	["no meta", { address: aliceJson.address, encoded: aliceJson.encoded, encoding: aliceJson.encoding }, false],
];
const PASSPHRASES: (string | undefined)[] = [undefined, "", "testing", "wrong"];

const json = JSONS.map(([label, input, ignoreChecksum]) => {
	const created = captured(() => pairState(new Keyring({ ss58Format: 42 }).createFromJson(input as unknown as KeyringPair$Json, ignoreChecksum)));
	const unlock = PASSPHRASES.map((passphrase) =>
		captured(() => {
			const pair = new Keyring({ ss58Format: 42 }).createFromJson(input as unknown as KeyringPair$Json, ignoreChecksum);
			pair.unlock(passphrase);
			return { publicKey: hex(pair.publicKey), secretKey: hex(pair.encodePkcs8().subarray(16, 80)), isLocked: pair.isLocked };
		}),
	);
	const toJson = captured(() => {
		const pair = new Keyring({ ss58Format: 42 }).createFromJson(input as unknown as KeyringPair$Json, ignoreChecksum);
		return pair.toJson("testing") as unknown as Json;
	});
	const reencode = captured(() => {
		const pair = new Keyring({ ss58Format: 42 }).createFromJson(input as unknown as KeyringPair$Json, ignoreChecksum);
		pair.unlock();
		pair.encodePkcs8("pw");
		pair.lock();
		pair.unlock("pw");
		return { publicKey: hex(pair.publicKey), isLocked: pair.isLocked };
	});
	return { label, input, ignoreChecksum, created, unlock, toJson, reencode };
});

type PairSource = { label: string; make: () => KeyringPair };
const SOURCES: PairSource[] = [
	{ label: "alice test pair", make: () => createTestKeyring({ ss58Format: 42 }).getPairs()[0] as KeyringPair },
	{ label: "uri //Bob", make: () => new Keyring({ ss58Format: 42 }).addFromUri("//Bob") },
	{ label: "seed", make: () => new Keyring({ ss58Format: 2 }).addFromSeed(new Uint8Array(32).fill(9)) },
	{
		label: "all-zero secret",
		make: () => new Keyring({ ss58Format: 42 }).addFromPair({ publicKey: alice.publicKey, secretKey: new Uint8Array(64) }),
	},
];
const MESSAGES: (string | number[])[] = ["hello", "0x1234", "", "0x", [1, 2, 3], []];
const message = (value: string | number[]): string | Uint8Array => (typeof value === "string" ? value : new Uint8Array(value));

const ops = SOURCES.map(({ label, make }) => {
	const pair = make();
	const signs = MESSAGES.flatMap((m) =>
		[false, true].map((withType) => ({ message: m, withType, ...captured(() => hex(pair.sign(message(m), { withType }))) })),
	);
	const signature = (index: number): string => (signs[index] as { result?: string }).result ?? "0x";
	const firstSignature = signature(0);
	const verifies = [
		["hello", firstSignature, hex(pair.publicKey)],
		["hello", firstSignature, pair.address],
		["hello", firstSignature, hex(bob.publicKey)],
		["hellO", firstSignature, hex(pair.publicKey)],
		["hello", `0x${"00".repeat(64)}`, hex(pair.publicKey)],
		["hello", "0x00", hex(pair.publicKey)],
		["hello", firstSignature, "not-an-address"],
		["0x1234", signature(2), hex(pair.publicKey)],
		["0x1234", signature(3), hex(pair.publicKey)],
	].map(([m, signature, signer]) => ({
		message: m as string,
		signature: signature as string,
		signer: signer as string,
		...captured(() => pair.verify(m as string, signature as string as unknown as Uint8Array, signer as string)),
	}));
	const vrfs = [
		["hello", undefined, undefined],
		["hello", "ctx", undefined],
		["hello", "ctx", "extra"],
		["0x1234", "0xabcd", "0x"],
	].map(([m, context, extra]) => {
		const signed = captured(() => hex(pair.vrfSign(m as string, context, extra)));
		const output = "result" in signed ? (signed.result as string) : "0x";
		return {
			message: m as string,
			context: context ?? null,
			extra: extra ?? null,
			signed,
			verified: captured(() => pair.vrfVerify(m as string, output as unknown as Uint8Array, pair.publicKey, context, extra)),
			tampered: captured(() => pair.vrfVerify(`${m as string}!`, output as unknown as Uint8Array, pair.publicKey, context, extra)),
		};
	});
	const jwts = [
		[undefined, undefined],
		[{ expiresIn: 60 }, { sub: "user" }],
		[{ notBefore: NOW_MS / 1000 + 10 }, { a: "1", b: "2" }],
	].map(([options, claims]) => {
		const issued = captured(() => pair.jwtIssue(options as { expiresIn?: number }, claims as { [key: string]: string }));
		const token = "result" in issued ? (issued.result as string) : "";
		const verified = captured(() => JSON.parse(JSON.stringify({ ...pair.jwtVerify(token), publicKey: hex(pair.jwtVerify(token).publicKey) })) as Json);
		return { options: (options ?? null) as Json, claims: (claims ?? null) as Json, issued, verified };
	});
	const exports = [undefined, "", "testing"].map((passphrase) => ({
		passphrase: passphrase ?? null,
		encodePkcs8: captured(() => hex(make().encodePkcs8(passphrase))),
		toJson: captured(() => make().toJson(passphrase) as unknown as Json),
	}));
	const derives = ["//hard", "//hard//deeper", "/soft", "//1", "", "garbage"].map((suri) => ({
		suri,
		...captured(() => {
			const derived = make().derive(suri, { name: "derived" });
			return {
				...(pairState(derived) as { [key: string]: Json }),
				...(isHardOnly(suri) ? { secretKey: hex(derived.encodePkcs8().subarray(16, 80)) } : {}),
			};
		}),
	}));
	const locked = make();
	locked.lock();
	const afterLock = {
		isLocked: locked.isLocked,
		sign: captured(() => hex(locked.sign("hello"))),
		derive: captured(() => locked.derive("//x").address),
		jwtIssue: captured(() => locked.jwtIssue()),
		vrfSign: captured(() => hex(locked.vrfSign("hello"))),
		unlock: captured(() => {
			locked.unlock("testing");
			return locked.isLocked;
		}),
		toJson: captured(() => locked.toJson() as unknown as Json),
	};
	const metaPair = make();
	metaPair.setMeta({ name: "renamed", extra: 1 });
	metaPair.setMeta({ more: [1, 2] });
	return { label, state: pairState(pair), signs, verifies, vrfs, jwts, exports, derives, afterLock, meta: JSON.parse(JSON.stringify(metaPair.meta)) as Json };
});

const exported = (passphrase: string): { encoded: string; passphrase: string } => ({
	encoded: hex(alice.encodePkcs8(passphrase)),
	passphrase,
});
const decodes = [exported("testing"), exported(""), exported("0x1234")].flatMap(({ encoded, passphrase }) =>
	[passphrase, "wrong", undefined].map((attempt) => ({
		encoded,
		passphrase: attempt ?? null,
		...captured(() => {
			const { publicKey, secretKey } = decodePair(attempt, new Uint8Array(Buffer.from(encoded.slice(2), "hex")));
			return { publicKey: hex(publicKey), secretKey: hex(secretKey) };
		}),
	})),
);

const ss58 = (() => {
	const keyring = new Keyring({ ss58Format: 42 });
	const pair = keyring.addFromUri("//Alice");
	const before = pair.address;
	keyring.setSS58Format(2);
	const after = pair.address;
	const encodes = [
		[undefined, undefined],
		[0, undefined],
		[2, 5],
		[16384, undefined],
		[46, undefined],
		[undefined, 47],
	].map(([configured, explicit]) => ({
		configured: configured ?? null,
		explicit: explicit ?? null,
		...captured(() => new Keyring(configured === undefined ? {} : { ss58Format: configured }).encodeAddress(hex(alice.publicKey), explicit)),
	}));
	return { before, after, encodes };
})();

const keyringTypes = [undefined, "sr25519", "ed25519", "ecdsa", "ethereum"].map((type) => ({
	type: type ?? null,
	...captured(() => new Keyring(type === undefined ? {} : { type: type as KeypairType }).type),
}));

const pairsScript = (() => {
	const keyring = new Keyring({ ss58Format: 42 });
	const a = keyring.addFromUri("//Alice");
	const b = keyring.addFromUri("//Bob");
	const c = keyring.addFromUri("//Charlie");
	const order: Json[] = [];
	const snapshot = (): void => {
		order.push(keyring.getPairs().map((pair) => hex(pair.publicKey)));
	};
	snapshot();
	keyring.addFromUri("//Alice", { name: "again" });
	snapshot();
	keyring.removePair(encodeAddress(b.publicKey, 2));
	snapshot();
	keyring.addFromUri("//Bob");
	snapshot();
	keyring.removePair(new Uint8Array(32).fill(7));
	snapshot();
	const gets = [
		a.address,
		hex(a.publicKey),
		hex(a.publicKey).toUpperCase().replace("0X", "0x"),
		encodeAddress(c.publicKey, 2),
		encodeAddress(new Uint8Array(32).fill(6), 42),
		`0x${"06".repeat(32)}`,
		`0x${"AB".repeat(32)}`,
		"not-an-address",
		"",
		"0x",
	].map((address) => ({ address, ...captured(() => pairState(keyring.getPair(address))) }));
	const byteGets = [Array.from(c.publicKey), new Array(32).fill(6), []].map((bytes) => ({
		bytes,
		...captured(() => pairState(keyring.getPair(new Uint8Array(bytes)))),
	}));
	const name = (keyring.getPair(a.address).meta.name ?? null) as Json;
	return { order, gets, byteGets, name };
})();

type GetPairCase = { label: string; secret?: Json; json?: boolean; account?: string | number[]; type?: KeypairType; ss58?: number };
const GET_PAIR: GetPairCase[] = [
	{ label: "mnemonic", secret: DEV_PHRASE },
	{ label: "hex seed", secret: SEED_HEX },
	{ label: "short hex seed", secret: "0x0102" },
	{ label: "suri", secret: `${DEV_PHRASE}//Alice` },
	{ label: "bare path", secret: "//Alice" },
	{ label: "mnemonic and path", secret: `${DEV_PHRASE}//1` },
	{ label: "json text", secret: JSON.stringify(aliceJson) },
	{ label: "json object", secret: aliceJson as unknown as Json, json: true },
	{ label: "json text ed25519", secret: JSON.stringify(withEncoding({ content: ["pkcs8", "ed25519"] })) },
	{ label: "json text unknown type", secret: JSON.stringify(withEncoding({ content: ["pkcs8", "foo"] })) },
	{ label: "json text no type", secret: JSON.stringify(withEncoding({ content: ["pkcs8"] })) },
	{ label: "json object ed25519", secret: withEncoding({ content: ["pkcs8", "ed25519"] }) as unknown as Json, json: true },
	{ label: "json without encoding", secret: '{"address":"x"}' },
	{ label: "json number", secret: "5" },
	{ label: "not a secret", secret: "this is not a secret" },
	{ label: "empty", secret: "" },
	{ label: "nothing" },
	{ label: "address", account: alice.address },
	{ label: "public key", account: Array.from(alice.publicKey) },
	{ label: "empty public key", account: [] },
	{ label: "hex account", account: hex(alice.publicKey) },
	{ label: "bad account", account: "not-an-address" },
	{ label: "empty secret and address", secret: "", account: alice.address },
	{ label: "empty secret and empty account", secret: "", account: "" },
	{ label: "secret wins over account", secret: DEV_PHRASE, account: bob.address },
	{ label: "ss58 2", secret: DEV_PHRASE, ss58: 2 },
	{ label: "ss58 0", secret: DEV_PHRASE, ss58: 0 },
	{ label: "ss58 out of range", secret: DEV_PHRASE, ss58: 16384 },
	{ label: "ed25519", secret: DEV_PHRASE, type: "ed25519" },
	{ label: "explicit sr25519", secret: DEV_PHRASE, type: "sr25519" },
];

const getPairVectors = GET_PAIR.map((input) => {
	let outcome: Json;
	try {
		const account = Array.isArray(input.account) ? new Uint8Array(input.account) : input.account;
		const pair = getPair(input.secret as string | KeyringPair$Json | undefined, account, input.type, input.ss58);
		outcome = { result: pairState(pair) };
	} catch (e) {
		outcome =
			e instanceof ProsopoEnvError
				? { envError: { message: e.message, translationKey: e.translationKey ?? null, hasCause: e.context?.error !== undefined } }
				: { error: (e as Error).message };
	}
	return { ...input, secret: input.secret ?? null, json: input.json ?? false, account: input.account ?? null, type: input.type ?? null, ss58: input.ss58 ?? null, ...(outcome as { [key: string]: Json }) };
});

const testing = [
	[{}, true],
	[{ ss58Format: 2 }, true],
	[{}, false],
].map(([options, isDerived]) => ({
	options: options as Json,
	isDerived: isDerived as boolean,
	pairs: createTestKeyring(options as { ss58Format?: number }, isDerived as boolean)
		.getPairs()
		.map(pairState),
}));

const output = fileURLToPath(new URL("./vectors.json", import.meta.url));
writeFileSync(
	output,
	`${JSON.stringify(
		{
			uri,
			json,
			ops,
			decodes,
			ss58,
			keyringTypes,
			pairs: pairsScript,
			getPair: getPairVectors,
			testing,
		},
		null,
		"\t",
	)}\n`,
);
process.stdout.write(
	`wrote ${uri.length} uri, ${json.length} json, ${ops.length} pair-op, ${decodes.length} decode, ${getPairVectors.length} getPair and ${testing.length} test-keyring vectors\n`,
);
