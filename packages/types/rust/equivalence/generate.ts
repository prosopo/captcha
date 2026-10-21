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

// Runs the TypeScript token codec on fixed and seeded-random inputs and writes what it produces
// to vectors.json, which equivalence.rs replays against the Rust port.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { u8aToHex } from "@prosopo/util";
import { ZodError } from "zod";
import { CaptchaType } from "../../src/client/captchaType/captchaType.js";
import {
	type ProcaptchaOutput,
	ProcaptchaTokenCodecV1,
	decodeProcaptchaOutput,
	encodeProcaptchaOutput,
} from "../../src/procaptcha/token.js";

// The vectors are what Node 24, the production runtime, produces.
if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type EncodeVector = { output: ProcaptchaOutput; token: string };

type DecodeResult = { ok: string } | { error: "malformed" | "schema" };

type DecodeVector = { token: string; result: DecodeResult };

const mulberry32 = (seed: number): (() => number) => {
	let state = seed >>> 0;
	return (): number => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

const random = mulberry32(0x70726f73);
const randomInt = (below: number): number => Math.floor(random() * below);
const pick = <T>(items: readonly T[]): T => items[randomInt(items.length)] as T;

const ALPHABETS: string[] = [
	"abcdefghijklmnopqrstuvwxyz0123456789",
	"0123456789abcdef",
	"日本語✅éß€😀\u0000\u{10FFFF}",
	"_-./:?=&%#@ ",
];

const randomString = (maxLength: number): string => {
	const alphabet = [...pick(ALPHABETS)];
	const length = randomInt(maxLength + 1);
	return Array.from({ length }, () => pick(alphabet)).join("");
};

const maybe = <T>(value: () => T): T | undefined =>
	random() < 0.5 ? value() : undefined;

const SS58 = [
	"5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw",
	"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
];

const fixedOutputs = (): ProcaptchaOutput[] => {
	const minimal: ProcaptchaOutput = {
		dapp: SS58[0] as string,
		user: SS58[1] as string,
		timestamp: "1700000000000",
		signature: { provider: {}, user: {} },
	};
	const outputs: ProcaptchaOutput[] = [
		minimal,
		{ ...minimal, dapp: "", user: "", timestamp: "" },
		{
			...minimal,
			commitmentId: "0xcommitment",
			providerUrl: "https://provider.example",
			challenge: "a___b___c",
			nonce: 42,
			captchaType: CaptchaType.pow,
			signature: {
				provider: { challenge: "pc", requestHash: "pr", timestamp: "dropped" },
				user: { timestamp: "ut", requestHash: "ur", challenge: "dropped" },
			},
		},
		{
			...minimal,
			commitmentId: "",
			providerUrl: "",
			challenge: "",
			signature: {
				provider: { challenge: "", requestHash: "" },
				user: { timestamp: "", requestHash: "" },
			},
		},
		{ ...minimal, challenge: "x".repeat(63) },
		{ ...minimal, challenge: "x".repeat(64) },
		{ ...minimal, challenge: "x".repeat(16383) },
		{ ...minimal, challenge: "x".repeat(16384) },
		{ ...minimal, challenge: "日本語 ✅".repeat(3000) },
	];
	for (const nonce of [0, 1, 255, 256, 65535, 65536, 2 ** 31, 2 ** 32 - 1]) {
		outputs.push({ ...minimal, nonce });
	}
	for (const captchaType of Object.values(CaptchaType)) {
		outputs.push({ ...minimal, captchaType });
	}
	return outputs;
};

const randomOutput = (): ProcaptchaOutput => ({
	commitmentId: maybe(() => randomString(80)),
	providerUrl: maybe(() => randomString(80)),
	dapp: randomString(70),
	user: randomString(70),
	challenge: maybe(() => randomString(120)),
	nonce: maybe(() => randomInt(2 ** 32)),
	timestamp: randomString(20),
	signature: {
		provider: {
			challenge: maybe(() => randomString(140)),
			requestHash: maybe(() => randomString(140)),
		},
		user: {
			timestamp: maybe(() => randomString(140)),
			requestHash: maybe(() => randomString(140)),
		},
	},
	captchaType: maybe(() => pick(Object.values(CaptchaType))),
});

const withoutUndefined = (output: ProcaptchaOutput): ProcaptchaOutput =>
	JSON.parse(JSON.stringify(output)) as ProcaptchaOutput;

const encodeV1 = (output: ProcaptchaOutput): string =>
	u8aToHex(
		ProcaptchaTokenCodecV1.enc({
			commitmentId: output.commitmentId,
			providerUrl: output.providerUrl,
			dapp: output.dapp,
			user: output.user,
			challenge: output.challenge,
			nonce: output.nonce,
			timestamp: output.timestamp,
			signature: {
				provider: {
					challenge: output.signature.provider.challenge,
					requestHash: output.signature.provider.requestHash,
				},
				user: {
					timestamp: output.signature.user.timestamp,
					requestHash: output.signature.user.requestHash,
				},
			},
		}),
	);

const decode = (token: string): DecodeResult => {
	try {
		return { ok: JSON.stringify(decodeProcaptchaOutput(token)) };
	} catch (error) {
		return { error: error instanceof ZodError ? "schema" : "malformed" };
	}
};

const hexToBytes = (hex: string): number[] => {
	const bytes: number[] = [];
	for (let i = 2; i < hex.length; i += 2) {
		bytes.push(Number.parseInt(hex.slice(i, i + 2), 16));
	}
	return bytes;
};

const bytesToHex = (bytes: number[]): string =>
	`0x${bytes.map((byte: number) => byte.toString(16).padStart(2, "0")).join("")}`;

const mutations = (token: string): string[] => {
	const bytes = hexToBytes(token);
	const mutated: string[] = [];
	for (let i = 0; i < 6; i++) {
		const copy = [...bytes];
		copy[randomInt(copy.length)] = randomInt(256);
		mutated.push(bytesToHex(copy));
	}
	const tagged = [...bytes];
	tagged[0] = pick([2, 3, 0x7f, 0xff]);
	mutated.push(bytesToHex(tagged));
	mutated.push(bytesToHex([...bytes, ...Array.from({ length: 1 + randomInt(8) }, () => randomInt(256))]));
	mutated.push(bytesToHex(bytes.slice(0, randomInt(bytes.length))));
	return mutated;
};

// Long tokens only exist to reach the wider compact length modes; mutating them adds bulk, not
// coverage.
const MUTATED_TOKEN_LIMIT = 2000;

const str = (bytes: number[]): number[] => [bytes.length << 2, ...bytes];

const handBuilt = (): string[] => {
	const ascii = (text: string): number[] => [...text].map((c: string) => c.charCodeAt(0));
	const body = (dapp: number[], tail: number[]): number[] => [
		0,
		0,
		...dapp,
		...str(ascii("user")),
		0,
		0,
		...str(ascii("ts")),
		0,
		0,
		0,
		0,
		...tail,
	];
	const dapps: number[][] = [
		str([0xef, 0xbb, 0xbf, ...ascii("bom")]),
		str([0xef, 0xbb, 0xbf, 0xef, 0xbb, 0xbf]),
		str([0x61, 0xef, 0xbb, 0xbf]),
		str([0xff, 0xfe, 0x80, 0xc0, 0xaf, 0xe0, 0x80, 0xbf, 0xed, 0xa0, 0x80, 0xf4, 0x90, 0x80, 0x80]),
		str([0xf0, 0x9f, 0x98]),
		str([0xe2, 0x82]),
		[(4 << 2) | 1, 0, ...ascii("four")],
		[(4 << 2) | 2, 0, 0, 0, ...ascii("four")],
		[3, ...ascii("bigmode")],
		[0x03, 0, 0, 0],
		[((65540 << 2) | 2) & 0xff, ((65540 << 2) >>> 8) & 0xff, ((65540 << 2) >>> 16) & 0xff, 0, ...ascii("four")],
		[0x07, 0, 0, 0, 0, 0],
	];
	const tails: number[][] = [[], [0], [1, ...str(ascii("pow"))], [1, ...str(ascii("nope"))], [9, ...str(ascii("image"))], [1]];
	const tokens: string[] = [];
	for (const dapp of dapps) {
		for (const tail of tails) {
			tokens.push(bytesToHex(body(dapp, tail)));
		}
	}
	return tokens;
};

const HEX_QUIRKS: string[] = [
	"",
	"0x",
	"0x00",
	"00",
	"0X0000",
	"0x0",
	"0xabc",
	"0xzz",
	"0xg0",
	"0x日本",
	"0xĀā",
	"0x😀😀",
	"x0",
];

const main = (): void => {
	const outputs: ProcaptchaOutput[] = [
		...fixedOutputs(),
		...Array.from({ length: 300 }, randomOutput),
	];
	const encode: EncodeVector[] = outputs.map(
		(output: ProcaptchaOutput): EncodeVector => ({
			output: withoutUndefined(output),
			token: encodeProcaptchaOutput(output),
		}),
	);

	const tokens: string[] = [];
	for (const [index, { output, token }] of encode.entries()) {
		tokens.push(token, encodeV1(output));
		if (token.length > MUTATED_TOKEN_LIMIT) continue;
		if (index % 3 === 0) tokens.push(...mutations(token));
		if (index % 5 === 0) tokens.push(token.toUpperCase().replace("0X", "0x"), token.slice(2));
	}
	const small = encode[0]?.token ?? "0x";
	for (let length = 2; length <= small.length; length++) {
		tokens.push(small.slice(0, length));
	}
	tokens.push(...handBuilt(), ...HEX_QUIRKS);
	for (let i = 0; i < 400; i++) {
		tokens.push(bytesToHex(Array.from({ length: randomInt(160) }, () => randomInt(256))));
	}
	const decodeVectors: DecodeVector[] = tokens.map(
		(token: string): DecodeVector => ({ token, result: decode(token) }),
	);

	const output = fileURLToPath(new URL("./vectors.json", import.meta.url));
	writeFileSync(
		output,
		`${JSON.stringify({ encode, decode: decodeVectors }, null, "\t")}\n`,
	);
	process.stdout.write(
		`wrote ${encode.length} encode and ${decodeVectors.length} decode vectors\n`,
	);
};

main();
