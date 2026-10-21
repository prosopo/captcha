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

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ED25519_TORSION_SUBGROUP, ed25519 } from "@noble/curves/ed25519.js";
import { decodeBase64, decodeBase64Url } from "../../src/base64.js";
import {
	type JwksFetch,
	type JwksResolverOptions,
	clearJwksCache,
	resolveJwksFromSignatureAgent,
} from "../../src/jwksResolver.js";
import {
	normaliseSignatureAgentUrl,
	parseSignatureAgentHeader,
} from "../../src/parseSignatureAgent.js";
import { buildSignatureBase } from "../../src/signatureBase.js";
import {
	type ParamValue,
	parseSignature,
	parseSignatureInput,
} from "../../src/structuredFields.js";
import { verifyWebBotAuth } from "../../src/verify.js";

// URL parsing and serialisation come from Node's bundled URL parser, and production runs Node 24.
if (!process.version.startsWith("v24.")) {
	throw new Error(`generate.ts must run on Node 24 (the production runtime), not ${process.version}`);
}

type Outcome<T> = { ok: T } | { error: string };

const errorText = (error: unknown): string => {
	if (error instanceof SyntaxError) return "SyntaxError";
	return error instanceof Error ? error.message : String(error);
};

const attempt = <T>(fn: () => T): Outcome<T> => {
	try {
		return { ok: fn() };
	} catch (error) {
		return { error: errorText(error) };
	}
};

const attemptAsync = async <T>(fn: () => Promise<T>): Promise<Outcome<T>> => {
	try {
		return { ok: await fn() };
	} catch (error) {
		return { error: errorText(error) };
	}
};

const toHex = (bytes: Uint8Array): string =>
	Array.from(bytes, (b: number) => b.toString(16).padStart(2, "0")).join("");

const fromHex = (hex: string): Uint8Array =>
	Uint8Array.from(hex.match(/../g) ?? [], (h: string) =>
		Number.parseInt(h, 16),
	);

const toBase64 = (bytes: Uint8Array): string => {
	let bin = "";
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin);
};

const toBase64Url = (bytes: Uint8Array): string =>
	toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// ---------------------------------------------------------------- base64

const BASE64_INPUTS: string[] = [
	"",
	"   ",
	"AQID",
	"AQI",
	"AQ",
	"A",
	"AQ==",
	"AQ=",
	"AQ= =",
	"A Q I D",
	"\tAQ\nID\r\f",
	"AR==",
	"AQ=D",
	"AQ===",
	"====",
	"==",
	"AQIDBA",
	"AQIDB",
	"AQIDBA==",
	"AQIDBA=",
	"é",
	"AQ ID",
	"AQ\u000bID",
	"-_-_",
	"+/+/",
	"not_valid_base64!!!",
	"////",
	"AAAA",
	"AB",
	"ABC",
	"A===",
	"AB=C",
	"ABC=",
	"ABCD=",
	"ABCD==",
	"=ABC",
	"YWJj\u0000",
	"AQID ",
];

type Base64Vector = { input: string; result: Outcome<string> };

const base64Vectors = (decode: (input: string) => Uint8Array): Base64Vector[] =>
	BASE64_INPUTS.map((input: string) => ({
		input,
		result: attempt(() => toHex(decode(input))),
	}));

// ---------------------------------------------------------------- structured fields

type ParamValueJson =
	| { type: "string"; value: string }
	| { type: "number"; value: number | string }
	| { type: "boolean"; value: boolean }
	| { type: "bytes"; value: string };

const paramValueJson = (value: ParamValue): ParamValueJson => {
	if (typeof value === "string") return { type: "string", value };
	if (typeof value === "boolean") return { type: "boolean", value };
	if (typeof value === "number") {
		return {
			type: "number",
			value: Number.isFinite(value) ? value : String(value),
		};
	}
	return { type: "bytes", value: toHex(value) };
};

const BASE_INPUT =
	'sig1=("@authority" "signature-agent");created=1735689600;expires=1735693200;keyid="abc";alg="ed25519";tag="web-bot-auth"';

const SIGNATURE_INPUT_HEADERS: string[] = [
	BASE_INPUT,
	"garbage",
	"",
	"   ",
	",,,",
	"=",
	"sig1=",
	'sig1="not-a-list"',
	'sig1=("@authority");keyid="k";alg=ed25519',
	'sig1=();keyid="k"',
	"sig1=()",
	"sig1=(",
	'sig1=("@authority"',
	'sig1=("a" "b";x=1 c);keyid="k"',
	'sig1=( "a"   "b" )',
	'sig1=("a""b")',
	'sig1=("a\\"b" "c")',
	'sig1=("a\\\\b")',
	'sig1=(tok1 tok2 "q")',
	'sig1=("unterminated)',
	'sig1=("a" "b);x="1"',
	'sig1=("a\tb")',
	'sig1=( "a"　"b"﻿)',
	'  sig1 = ("@authority") ; keyid = "k" ; alg = "ed25519"  ',
	'sig1=("@authority");keyid="k;with;semis";tag="a,b"',
	'sig1=("@authority");keyid="k", sig2=("x");keyid="other"',
	'sig2=("x");keyid="other", sig1=("@authority")',
	', sig1=("@authority");keyid="k"',
	'"quoted"=("a")',
	'sig1=("@authority");created=-5;expires=1.5;n=007;m=-0;big=123456789012345678901234567890',
	`sig1=("@authority");huge=${"9".repeat(400)}`,
	'sig1=("@authority");neg=-;dot=1.;lead=.5;exp=1e5;plus=+1',
	'sig1=("@authority");b1=?1;b0=?0;bare;empty=;flag',
	'sig1=("@authority");bytes=:AQID:;emptybytes=::;colon=:',
	'sig1=("@authority");bad=:!!!:',
	'sig1=("@authority");q="unterminated',
	'sig1=("@authority");q="',
	'sig1=("@authority");esc="a\\"b\\\\c\\d"',
	'sig1=("@authority");esc="trailing\\"',
	'sig1=("@authority");dup=1;other=2;dup="three"',
	'sig1=("@authority");2=b;1=a;x=c;0=z;01=y;4294967295=big;4294967294=max',
	'sig1=("@authority");__proto__="str";keyid="k"',
	'sig1=("@authority");__proto__=:AQID:;keyid="k";0=a;2=b;5=c;-0=d;1.5=e;NaN=f;Infinity=g;01=h',
	'sig1=("@authority");__proto__=:AQID:;length=1',
	'sig1=("@authority");__proto__=:AQID:;byteOffset=1',
	'sig1=("@authority");__proto__=:AQID:;constructor=1;toString=2',
	'sig1=("@authority");constructor=1;hasOwnProperty=x',
	'sig1=("@authority");a="x=y";b=c=d',
	'sig1=("@authority");;;keyid="k";;',
	'sig1=("@authority") trailing;keyid="k"',
	'sig1=("@authority")x;keyid="k"',
	'sig1=("a)b");keyid="k"',
	'sig1=("a" (nested));keyid="k"',
	"sig1=:AQID:",
	"sig1=token;keyid=k",
	'sig1=("@authority");tag="web-bot-auth";alg=ED25519',
	'sig1=("@authority");keyid="ключ";tag="веб"',
	'sig1=("@authority");keyid="k\\é"',
	'sig1=("@authority");keyid="a\\\nb"',
	'ünicode=("@authority");keyid="k"',
	'sig1=("@authority");x=1e3;y=0x10;z=Infinity',
];

type SignatureInputJson = {
	label: string;
	coveredComponents: string[];
	params: [string, ParamValueJson][];
	serialisedValue: string;
} | null;

const signatureInputVectors = SIGNATURE_INPUT_HEADERS.map((header: string) => {
	const entry = parseSignatureInput(header);
	const result: SignatureInputJson = entry
		? {
				label: entry.label,
				coveredComponents: entry.coveredComponents,
				params: Object.entries(entry.params).map(
					([k, v]: [string, ParamValue]): [string, ParamValueJson] => [
						k,
						paramValueJson(v),
					],
				),
				serialisedValue: entry.serialisedValue,
			}
		: null;
	return { header, result };
});

const SIGNATURE_HEADERS: [string, string][] = [
	["sig1=:AQID:", "sig1"],
	["sig1=:AQID:", "sig2"],
	['sig1="AQID"', "sig1"],
	["sig1=:not_valid_base64!!!:", "sig1"],
	["sig1=::", "sig1"],
	["sig1=:", "sig1"],
	["sig1= :AQID: ", "sig1"],
	["sig1=:AQID:;param=1", "sig1"],
	["sig1=:AQ ID:", "sig1"],
	["sig1=:AQ==:", "sig1"],
	["sig1=:AQ=:", "sig1"],
	["sig1=:AQID:, sig2=:BBBB:", "sig2"],
	["sig2=:BBBB:, sig1=:AQID:", "sig2"],
	["", "sig1"],
	["garbage", "sig1"],
	[" sig1 =:AQID:", "sig1"],
	["sig1=:-_-_:", "sig1"],
	['sig1=":,:"', "sig1"],
	[":AQID:", ""],
	["=:AQID:", ""],
	["SIG1=:AQID:", "sig1"],
];

const signatureVectors = SIGNATURE_HEADERS.map(
	([header, label]: [string, string]) => {
		const bytes = parseSignature(header, label);
		return { header, label, result: bytes ? toHex(bytes) : null };
	},
);

// ---------------------------------------------------------------- signature agent

const SIGNATURE_AGENT_HEADERS: string[] = [
	'"https://chatgpt.com"',
	'g="https://agent.bot.goog"',
	'  "https://chatgpt.com"  ',
	'"https://CHATGPT.com/"',
	'"HTTPS://chatgpt.com"',
	'"https://chatgpt.com/path/"',
	'"https://chatgpt.com/path"',
	'"https://chatgpt.com/?q=1"',
	'"https://chatgpt.com/#frag"',
	'"https://chatgpt.com:443/"',
	'"https://chatgpt.com:8443/"',
	'"http://chatgpt.com:80"',
	'"https://user:pass@chatgpt.com"',
	'"https://ÉXAMPLE.com"',
	'"https://xn--nxasmq6b.com"',
	'"https://[::1]:8080/"',
	'"https://0x7f.1/"',
	'"https://exa mple.com"',
	'"https://[::1"',
	'"http://a:99999"',
	'"https://"',
	'"http://"',
	'"ftp://example.com"',
	'"https://a"b"',
	'"https://a.com',
	"https://a.com",
	"",
	'g="https://agent.bot.goog", o="https://chatgpt.com"',
	'  g_1-x="https://agent.bot.goog";param',
	'1g="https://agent.bot.goog"',
	'g ="https://agent.bot.goog"',
	'g="https://agent.bot.goog',
	'g="ftp://agent.bot.goog"',
	'g="https://exa mple.com"',
	'g="https://"',
	' g="https://agent.bot.goog"',
	'"https://chatgpt.com" ',
	'"https://chatgpt.com/a/b/"',
	'"https://chatgpt.com//"',
	'"https://chat\tgpt.com"',
	'"https://chatgpt.com\n"',
	'"https://%41.com"',
	'"https://a..com/"',
	'"http://chatgpt.com."',
];

const signatureAgentVectors = SIGNATURE_AGENT_HEADERS.map((header: string) => ({
	header,
	result: attempt(() => parseSignatureAgentHeader(header)),
}));

const NORMALISE_INPUTS: string[] = [
	"https://chatgpt.com",
	"https://chatgpt.com/",
	"HTTPS://CHATGPT.COM/A/",
	"foo://ABC/",
	"foo://ABC",
	"foo://h%C3%A9/",
	"foo:/x",
	"mailto:X",
	"mailto:x/",
	"file:///tmp/",
	"https://a.com/?x",
	"https://a.com/#",
	"not a url",
	"",
	"https://a.com//",
	"https://[0:0::1]/",
	"  https://trim.com/  ",
	"https://a.com:443",
];

const normaliseVectors = NORMALISE_INPUTS.map((input: string) => ({
	input,
	result: attempt(() => normaliseSignatureAgentUrl(input)),
}));

// ---------------------------------------------------------------- signature base

type SignatureBaseCase = {
	covered: string[];
	authority: string;
	signatureAgent: string;
	params: string;
};

const SIGNATURE_BASE_CASES: SignatureBaseCase[] = [
	{
		covered: ["@authority", "signature-agent"],
		authority: "example.com",
		signatureAgent: '"https://chatgpt.com"',
		params: BASE_INPUT.slice("sig1=".length),
	},
	{
		covered: ["signature-agent", "@authority"],
		authority: "example.com",
		signatureAgent: 'g="https://agent.bot.goog"',
		params: '("signature-agent" "@authority");keyid="k"',
	},
	{ covered: [], authority: "x", signatureAgent: "y", params: "()" },
	{
		covered: ["@authority", "@authority"],
		authority: "a:8080",
		signatureAgent: "",
		params: "",
	},
	{
		covered: ["@method"],
		authority: "example.com",
		signatureAgent: '""',
		params: "()",
	},
	{
		covered: ["@authority", "Signature-Agent"],
		authority: "example.com",
		signatureAgent: "x",
		params: "()",
	},
	{
		covered: [""],
		authority: "example.com",
		signatureAgent: "x",
		params: "()",
	},
];

const signatureBaseVectors = SIGNATURE_BASE_CASES.map(
	(c: SignatureBaseCase) => ({
		...c,
		result: attempt(() =>
			buildSignatureBase(
				c.covered,
				{ authority: c.authority, signatureAgent: c.signatureAgent },
				c.params,
			),
		),
	}),
);

// ---------------------------------------------------------------- fetch mocks

// A repeated chunk keeps the multi-kilobyte bodies out of vectors.json.
type Chunk = string | { repeat: string; times: number } | { hex: string };

const chunkBytes = (chunk: Chunk): Uint8Array => {
	if (typeof chunk === "string") return new TextEncoder().encode(chunk);
	if ("hex" in chunk) return fromHex(chunk.hex);
	return new TextEncoder().encode(chunk.repeat.repeat(chunk.times));
};

type MockResponse =
	| {
			kind: "response";
			status: number;
			headers: [string, string][];
			// null is a null body; otherwise UTF-8 chunks.
			chunks: Chunk[] | null;
	  }
	| { kind: "hang" }
	| { kind: "throw"; message: string };

const mockFetch = (spec: MockResponse, seen: string[]): JwksFetch => {
	return (url: string, init?: RequestInit): Promise<Response> => {
		seen.push(url);
		if (spec.kind === "throw") return Promise.reject(new Error(spec.message));
		if (spec.kind === "hang") {
			return new Promise<Response>(
				(_resolve: (r: Response) => void, reject: (e: unknown) => void) => {
					init?.signal?.addEventListener("abort", () =>
						reject(init.signal?.reason),
					);
				},
			);
		}
		const chunks = spec.chunks;
		const body =
			chunks === null
				? null
				: new ReadableStream<Uint8Array>({
						start(controller: ReadableStreamDefaultController<Uint8Array>) {
							for (const chunk of chunks) controller.enqueue(chunkBytes(chunk));
							controller.close();
						},
					});
		return Promise.resolve(
			new Response(body, { status: spec.status, headers: spec.headers }),
		);
	};
};

const okJson = (
	body: string,
	headers: [string, string][] = [],
): MockResponse => ({ kind: "response", status: 200, headers, chunks: [body] });

// ---------------------------------------------------------------- jwks resolver

let fakeNow = 0;
Date.now = (): number => fakeNow;
// AbortSignal.timeout's timer is unref'd, so without this the process would
// exit while the "hang" case is still waiting for it.
const keepAlive: NodeJS.Timeout = setInterval((): void => {}, 1000);

type ResolverOptionsJson = {
	ttlMs?: number;
	timeoutMs?: number;
	allowLocalSigners?: boolean;
};

type JwksCase = {
	name: string;
	signerUrl: string;
	options: ResolverOptionsJson;
	response: MockResponse;
	// Each step resolves again at this clock time against the same cache.
	stepTimesMs: number[];
};

const START_MS = 1_767_225_600_000;
const KEYS_BODY = JSON.stringify({
	keys: [{ kty: "OKP", crv: "Ed25519", kid: "k", x: "AAAA" }],
});

const ttlCase = (
	name: string,
	cacheControl: string | null,
	stepTimesMs: number[],
	options: ResolverOptionsJson = {},
): JwksCase => ({
	name,
	signerUrl: "https://ttl.example.com",
	options,
	response: okJson(
		KEYS_BODY,
		cacheControl === null ? [] : [["cache-control", cacheControl]],
	),
	stepTimesMs,
});

const HOUR = 3_600_000;

const JWKS_CASES: JwksCase[] = [
	...[
		"https://signer.example.com",
		"https://signer.example.com/",
		"https://signer.example.com/sub/path?q=1#f",
		"https://SIGNER.Example.COM",
		"https://signer.example.com:8443",
		"http://signer.example.com",
		"https://127.0.0.1",
		"https://10.0.0.5:6379",
		"https://169.254.169.254",
		"https://0x7f.1",
		"https://2130706433",
		"https://[::1]",
		"https://[fe80::1]:443",
		"https://localhost",
		"https://LOCALHOST",
		"https://redis.localhost",
		"https://intranet",
		"https://1.2.3",
		"https://example.com.",
		"ftp://example.com",
		"file:///etc",
		"foo://example.com",
		"not a url",
		"",
		"mailto:x",
		"https://user:pw@signer.example.com",
	].map(
		(signerUrl: string): JwksCase => ({
			name: `signer ${signerUrl}`,
			signerUrl,
			options: {},
			response: okJson(KEYS_BODY),
			stepTimesMs: [START_MS],
		}),
	),
	...["http://localhost:1234", "https://127.0.0.1", "foo://x", "not a url"].map(
		(signerUrl: string): JwksCase => ({
			name: `local signer ${signerUrl}`,
			signerUrl,
			options: { allowLocalSigners: true },
			response: okJson(KEYS_BODY),
			stepTimesMs: [START_MS],
		}),
	),
	{
		name: "status 404",
		signerUrl: "https://s.example.com",
		options: {},
		response: { kind: "response", status: 404, headers: [], chunks: ["nope"] },
		stepTimesMs: [START_MS],
	},
	{
		name: "status 500",
		signerUrl: "https://s.example.com",
		options: {},
		response: {
			kind: "response",
			status: 500,
			headers: [],
			chunks: [KEYS_BODY],
		},
		stepTimesMs: [START_MS],
	},
	{
		name: "status 299 is ok",
		signerUrl: "https://s.example.com",
		options: {},
		response: {
			kind: "response",
			status: 299,
			headers: [],
			chunks: [KEYS_BODY],
		},
		stepTimesMs: [START_MS],
	},
	{
		name: "fetch throws",
		signerUrl: "https://s.example.com",
		options: {},
		response: { kind: "throw", message: "fetch failed" },
		stepTimesMs: [START_MS, START_MS + 1],
	},
	{
		name: "hang times out",
		signerUrl: "https://s.example.com",
		options: { timeoutMs: 10 },
		response: { kind: "hang" },
		stepTimesMs: [START_MS],
	},
	...[
		"65536",
		"65537",
		"1e6",
		"0x20000",
		" 70000 ",
		"abc",
		"",
		"-1",
		"Infinity",
		"1.5e5",
		"70000, 70000",
		"0b1",
	].map(
		(contentLength: string): JwksCase => ({
			name: `content-length ${contentLength}`,
			signerUrl: "https://s.example.com",
			options: {},
			response: okJson(KEYS_BODY, [["content-length", contentLength]]),
			stepTimesMs: [START_MS],
		}),
	),
	{
		name: "body exactly at the cap",
		signerUrl: "https://s.example.com",
		options: {},
		response: {
			kind: "response",
			status: 200,
			headers: [],
			chunks: ['{"keys":[],"pad":"', { repeat: "x", times: 65536 - 20 }, '"}'],
		},
		stepTimesMs: [START_MS],
	},
	{
		name: "body one byte over the cap, in chunks",
		signerUrl: "https://s.example.com",
		options: {},
		response: {
			kind: "response",
			status: 200,
			headers: [],
			chunks: ['{"keys":[],"pad":"', { repeat: "x", times: 65536 - 19 }, '"}'],
		},
		stepTimesMs: [START_MS],
	},
	...[
		"",
		"null",
		"[]",
		"5",
		'"keys"',
		"{}",
		'{"keys":null}',
		'{"keys":{}}',
		'{"keys":"abc"}',
		'{"keys":[]}',
		'{"keys":[1,null,"x",{"kid":"a"}]}',
		'{"keys":[{"kid":"a"}],"keys":[{"kid":"b"}]}',
		`﻿${KEYS_BODY}`,
		` \n\t${KEYS_BODY}\r\n `,
		"{bad json}",
		'{"keys":[]} trailing',
		'{"keys":[{"kid":"\\u00e9","n":1e300}]}',
		'{"keys":[{"big":12345678901234567890,"f":1.5,"neg":-0}]}',
	].map(
		(body: string): JwksCase => ({
			name: `body ${body.slice(0, 40)}`,
			signerUrl: "https://s.example.com",
			options: {},
			response: okJson(body),
			stepTimesMs: [START_MS],
		}),
	),
	{
		name: "null body",
		signerUrl: "https://s.example.com",
		options: {},
		response: { kind: "response", status: 200, headers: [], chunks: null },
		stepTimesMs: [START_MS],
	},
	{
		name: "invalid utf-8 is replaced",
		signerUrl: "https://s.example.com",
		options: {},
		response: {
			kind: "response",
			status: 200,
			headers: [],
			chunks: [
				'{"keys":[{"kid":"',
				{ hex: "ff80c3" },
				'"},{"kid":"',
				{ hex: "e282" },
				'"}]}',
			],
		},
		stepTimesMs: [START_MS],
	},
	ttlCase("default ttl", null, [
		START_MS,
		START_MS + HOUR - 1,
		START_MS + HOUR,
		START_MS + HOUR + 1,
	]),
	ttlCase("max-age=60", "max-age=60", [
		START_MS,
		START_MS + 59_999,
		START_MS + 60_000,
		START_MS + 60_001,
	]),
	ttlCase("public, MAX-AGE=10", "public, MAX-AGE=10", [
		START_MS,
		START_MS + 9_999,
		START_MS + 10_000,
	]),
	ttlCase("max-age=0", "max-age=0", [START_MS, START_MS]),
	ttlCase("max-age= without digits", "max-age=, max-age=5", [
		START_MS,
		START_MS + 4_999,
		START_MS + 5_000,
	]),
	ttlCase("s-maxage only", "s-maxage=5", [
		START_MS,
		START_MS + 5_000,
		START_MS + HOUR,
	]),
	ttlCase("max-age=007", "max-age=007", [
		START_MS,
		START_MS + 6_999,
		START_MS + 7_000,
	]),
	ttlCase("huge max-age", `max-age=${"9".repeat(400)}`, [
		START_MS,
		START_MS + 24 * HOUR - 1,
		START_MS + 24 * HOUR,
	]),
	ttlCase("max-age capped", "max-age=999999999", [
		START_MS,
		START_MS + 24 * HOUR + 1000,
	]),
	ttlCase(
		"ttlMs overrides",
		"max-age=60",
		[START_MS, START_MS + 60_000, START_MS + 100_000],
		{
			ttlMs: 100_000,
		},
	),
	ttlCase("ttlMs 0", null, [START_MS, START_MS], { ttlMs: 0 }),
	ttlCase("ttlMs negative", null, [START_MS, START_MS - 10], { ttlMs: -5 }),
	ttlCase("ttlMs above cap", null, [START_MS, START_MS + 24 * HOUR], {
		ttlMs: 48 * HOUR,
	}),
	ttlCase("clock going backwards keeps cache", null, [
		START_MS,
		START_MS - HOUR,
	]),
];

const resolverOptions = (
	o: ResolverOptionsJson,
	fetch: JwksFetch,
): JwksResolverOptions => ({ ...o, fetch });

type JwksStepResult = {
	nowMs: number;
	result: Outcome<unknown[]>;
	fetchedUrls: string[];
};

const jwksVectors: (JwksCase & { steps: JwksStepResult[] })[] = [];
for (const c of JWKS_CASES) {
	clearJwksCache();
	const steps: JwksStepResult[] = [];
	for (const nowMs of c.stepTimesMs) {
		fakeNow = nowMs;
		const seen: string[] = [];
		const result = await attemptAsync(() =>
			resolveJwksFromSignatureAgent(
				c.signerUrl,
				resolverOptions(c.options, mockFetch(c.response, seen)),
			),
		);
		steps.push({ nowMs, result, fetchedUrls: seen });
	}
	jwksVectors.push({ ...c, steps });
}

// ---------------------------------------------------------------- ed25519

const seed = (n: number): Uint8Array =>
	Uint8Array.from(
		{ length: 32 },
		(_v: unknown, i: number) => (n * 31 + i * 7) & 0xff,
	);

const SIGNING_MESSAGES: string[] = [
	"",
	"abc",
	'"@authority": example.com\n"signature-agent": "https://chatgpt.com"\n"@signature-params": ("@authority" "signature-agent");created=1;expires=2',
	"ünïcödé ✓",
];

const signingVectors = [1, 2, 3].flatMap((n: number) =>
	SIGNING_MESSAGES.map((message: string) => {
		const secret = seed(n);
		return {
			seed: toHex(secret),
			message,
			publicKey: toHex(ed25519.getPublicKey(secret)),
			signature: toHex(ed25519.sign(new TextEncoder().encode(message), secret)),
		};
	}),
);

const Point = ed25519.Point;
const L = Point.Fn.ORDER;
const scalarBytes = (s: bigint): Uint8Array => {
	const out = new Uint8Array(32);
	let v = s;
	for (let i = 0; i < 32; i++) {
		out[i] = Number(v & 0xffn);
		v >>= 8n;
	}
	return out;
};
const concat = (a: Uint8Array, b: Uint8Array): Uint8Array => {
	const out = new Uint8Array(a.length + b.length);
	out.set(a, 0);
	out.set(b, a.length);
	return out;
};

type RawVerifyCase = {
	name: string;
	signature: string;
	message: string;
	publicKey: string;
};

const rawCases: RawVerifyCase[] = [];
const msg = new TextEncoder().encode("web bot auth");
const msgHex = toHex(msg);
const secret = seed(9);
const pub = ed25519.getPublicKey(secret);
const goodSig = ed25519.sign(msg, secret);
rawCases.push({
	name: "valid",
	signature: toHex(goodSig),
	message: msgHex,
	publicKey: toHex(pub),
});
rawCases.push({
	name: "wrong message",
	signature: toHex(goodSig),
	message: toHex(new TextEncoder().encode("web bot auth!")),
	publicKey: toHex(pub),
});
rawCases.push({
	name: "wrong key",
	signature: toHex(goodSig),
	message: msgHex,
	publicKey: toHex(ed25519.getPublicKey(seed(10))),
});
for (const i of [0, 31, 32, 63]) {
	const flipped = Uint8Array.from(goodSig);
	flipped[i] = (flipped[i] ?? 0) ^ 1;
	rawCases.push({
		name: `flipped byte ${i}`,
		signature: toHex(flipped),
		message: msgHex,
		publicKey: toHex(pub),
	});
}
const sPlusL = concat(
	goodSig.slice(0, 32),
	scalarBytes(
		(() => {
			let s = 0n;
			for (let i = 31; i >= 0; i--)
				s = (s << 8n) | BigInt(goodSig[32 + i] ?? 0);
			return s + L;
		})(),
	),
);
rawCases.push({
	name: "s + L (non-canonical s)",
	signature: toHex(sPlusL),
	message: msgHex,
	publicKey: toHex(pub),
});
rawCases.push({
	name: "short signature",
	signature: toHex(goodSig.slice(0, 63)),
	message: msgHex,
	publicKey: toHex(pub),
});
rawCases.push({
	name: "empty signature",
	signature: "",
	message: msgHex,
	publicKey: toHex(pub),
});
rawCases.push({
	name: "long signature",
	signature: `${toHex(goodSig)}00`,
	message: msgHex,
	publicKey: toHex(pub),
});
const zero32 = new Uint8Array(32);
const nonCanonicalIdentity =
	"eeffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f";
const notOnCurve = (() => {
	for (let y = 2; y < 100; y++) {
		const bytes = scalarBytes(BigInt(y));
		try {
			Point.fromBytes(bytes, true);
		} catch {
			return toHex(bytes);
		}
	}
	return toHex(zero32);
})();
for (const [ti, torsion] of ED25519_TORSION_SUBGROUP.entries()) {
	rawCases.push({
		name: `identity R, s=0, torsion A #${ti}`,
		signature: `0100000000000000000000000000000000000000000000000000000000000000${toHex(zero32)}`,
		message: msgHex,
		publicKey: torsion,
	});
	const s = 0x1234567890abcdefn;
	const sB = Point.BASE.multiply(s).toBytes();
	rawCases.push({
		name: `R = sB, torsion A #${ti}`,
		signature: toHex(concat(sB, scalarBytes(s))),
		message: msgHex,
		publicKey: torsion,
	});
	rawCases.push({
		name: `torsion R #${ti}, s=0, identity A`,
		signature: `${torsion}${toHex(zero32)}`,
		message: msgHex,
		publicKey:
			"0100000000000000000000000000000000000000000000000000000000000000",
	});
	const mixedR = Point.fromBytes(goodSig.slice(0, 32))
		.add(Point.fromBytes(fromHex(torsion), true))
		.toBytes();
	rawCases.push({
		name: `valid signature with torsion added to R #${ti}`,
		signature: toHex(concat(mixedR, goodSig.slice(32))),
		message: msgHex,
		publicKey: toHex(pub),
	});
}
rawCases.push({
	name: "non-canonical identity A",
	signature: `0100000000000000000000000000000000000000000000000000000000000000${toHex(zero32)}`,
	message: msgHex,
	publicKey: nonCanonicalIdentity,
});
rawCases.push({
	name: "non-canonical identity R",
	signature: `${nonCanonicalIdentity}${toHex(zero32)}`,
	message: msgHex,
	publicKey: "0100000000000000000000000000000000000000000000000000000000000000",
});
rawCases.push({
	name: "x=0 with sign bit set (A)",
	signature: `0100000000000000000000000000000000000000000000000000000000000000${toHex(zero32)}`,
	message: msgHex,
	publicKey: "0100000000000000000000000000000000000000000000000000000000000080",
});
rawCases.push({
	name: "A not on curve",
	signature: toHex(goodSig),
	message: msgHex,
	publicKey: notOnCurve,
});
rawCases.push({
	name: "R not on curve",
	signature: `${notOnCurve}${toHex(goodSig.slice(32))}`,
	message: msgHex,
	publicKey: toHex(pub),
});

const rawVerifyVectors = rawCases.map((c: RawVerifyCase) => ({
	...c,
	valid: (() => {
		try {
			return ed25519.verify(
				fromHex(c.signature),
				fromHex(c.message),
				fromHex(c.publicKey),
			);
		} catch {
			return false;
		}
	})(),
}));

// ---------------------------------------------------------------- verify

const NOW_S = 1_767_225_600;
const KEY_ID = "test-key-1";
const SIGNER_KEY = seed(42);
const SIGNER_PUB = ed25519.getPublicKey(SIGNER_KEY);
const OTHER_PUB = ed25519.getPublicKey(seed(43));
const COVERED = '("@authority" "signature-agent")';

const params = (
	overrides: {
		covered?: string;
		created?: string | null;
		expires?: string | null;
		keyid?: string | null;
		alg?: string | null;
		tag?: string | null;
		extra?: string;
	} = {},
): string => {
	const parts: string[] = [overrides.covered ?? COVERED];
	const add = (
		key: string,
		value: string | null | undefined,
		fallback: string,
	): void => {
		const v = value === undefined ? fallback : value;
		if (v !== null) parts.push(v === "" ? key : `${key}=${v}`);
	};
	add("created", overrides.created, String(NOW_S));
	add("expires", overrides.expires, String(NOW_S + 60));
	add("keyid", overrides.keyid, `"${KEY_ID}"`);
	add("alg", overrides.alg, '"ed25519"');
	add("tag", overrides.tag, '"web-bot-auth"');
	return parts.join(";") + (overrides.extra ?? "");
};

const sign = (base: string, secretKey: Uint8Array = SIGNER_KEY): string =>
	toBase64(ed25519.sign(new TextEncoder().encode(base), secretKey));

const jwksFor = (keys: unknown[]): MockResponse =>
	okJson(JSON.stringify({ keys }));

const okp = (kid: string, publicKey: Uint8Array): Record<string, string> => ({
	kty: "OKP",
	crv: "Ed25519",
	alg: "EdDSA",
	kid,
	x: toBase64Url(publicKey),
});

type VerifyCase = {
	name: string;
	nowMs: number;
	url: string;
	headers: Record<string, string>;
	allowLocalSigners: boolean;
	response: MockResponse;
};

type SignedCaseInput = {
	name: string;
	agent?: string;
	authority?: string;
	url?: string;
	paramsValue?: string;
	covered?: string[];
	label?: string;
	signatureLabel?: string;
	signatureOverride?: string;
	response?: MockResponse;
	nowMs?: number;
	allowLocalSigners?: boolean;
	dropHeader?: string;
	headerOverrides?: Record<string, string>;
	signingKey?: Uint8Array;
};

const signedCase = (input: SignedCaseInput): VerifyCase => {
	const agent = input.agent ?? '"https://signer.example.com"';
	const authority = input.authority ?? "target.example.com";
	const paramsValue = input.paramsValue ?? params();
	const covered = input.covered ?? ["@authority", "signature-agent"];
	const label = input.label ?? "sig1";
	const base = buildSignatureBase(
		covered,
		{ authority, signatureAgent: agent },
		paramsValue,
	);
	const headers: Record<string, string> = {
		"signature-agent": agent,
		"signature-input": `${label}=${paramsValue}`,
		signature: `${input.signatureLabel ?? label}=:${input.signatureOverride ?? sign(base, input.signingKey)}:`,
		...input.headerOverrides,
	};
	if (input.dropHeader) delete headers[input.dropHeader];
	return {
		name: input.name,
		nowMs: input.nowMs ?? NOW_S * 1000,
		url: input.url ?? `https://${authority}/api/thing`,
		headers,
		allowLocalSigners: input.allowLocalSigners ?? false,
		response: input.response ?? jwksFor([okp(KEY_ID, SIGNER_PUB)]),
	};
};

const flippedSignature = (() => {
	const base = buildSignatureBase(
		["@authority", "signature-agent"],
		{
			authority: "target.example.com",
			signatureAgent: '"https://signer.example.com"',
		},
		params(),
	);
	const bytes = ed25519.sign(new TextEncoder().encode(base), SIGNER_KEY);
	bytes[0] = (bytes[0] ?? 0) ^ 0xff;
	return toBase64(bytes);
})();

const VERIFY_CASES: VerifyCase[] = [
	signedCase({ name: "valid bare-string agent" }),
	signedCase({
		name: "valid dictionary agent, components reversed",
		agent: 'g="https://agent.bot.goog"',
		covered: ["signature-agent", "@authority"],
		paramsValue: params({ covered: '("signature-agent" "@authority")' }),
	}),
	signedCase({
		name: "valid with unquoted alg token",
		paramsValue: params({ alg: "ed25519" }),
	}),
	signedCase({ name: "valid without alg", paramsValue: params({ alg: null }) }),
	signedCase({
		name: "valid with extra params",
		paramsValue: params({ extra: ';nonce="abc";x' }),
	}),
	signedCase({
		name: "valid with uppercase agent host",
		agent: '"https://SIGNER.example.com/"',
	}),
	signedCase({
		name: "valid with port in authority",
		authority: "target.example.com:8443",
	}),
	signedCase({
		name: "valid with default port in url",
		authority: "target.example.com",
		url: "https://target.example.com:443/x",
	}),
	signedCase({
		name: "uppercase url host signed lowercase",
		url: "https://TARGET.example.com/x",
	}),
	signedCase({ name: "valid with label sig2", label: "sig2" }),
	signedCase({
		name: "valid with created at skew limit",
		paramsValue: params({
			created: String(NOW_S + 5),
			expires: String(NOW_S + 65),
		}),
	}),
	signedCase({
		name: "valid expiring now",
		paramsValue: params({ expires: String(NOW_S) }),
	}),
	signedCase({
		name: "valid 24h window",
		paramsValue: params({
			created: String(NOW_S - 100),
			expires: String(NOW_S - 100 + 86400),
		}),
	}),
	signedCase({
		name: "validity just over 24h",
		paramsValue: params({
			created: String(NOW_S - 100),
			expires: String(NOW_S - 99 + 86400),
		}),
	}),
	signedCase({
		name: "fractional times",
		paramsValue: params({ created: `${NOW_S}.5`, expires: `${NOW_S}.75` }),
		nowMs: NOW_S * 1000 + 700,
	}),
	signedCase({
		name: "fractional expired",
		paramsValue: params({ created: `${NOW_S}.5`, expires: `${NOW_S}.75` }),
		nowMs: NOW_S * 1000 + 751,
	}),
	signedCase({
		name: "infinite times",
		paramsValue: params({ created: "9".repeat(400), expires: "9".repeat(400) }),
	}),
	signedCase({
		name: "tampered signature",
		signatureOverride: flippedSignature,
	}),
	signedCase({
		name: "tampered authority",
		url: "https://evil.example.com/api",
	}),
	signedCase({ name: "signed with a different key", signingKey: seed(43) }),
	signedCase({
		name: "wrong key published under kid",
		response: jwksFor([okp(KEY_ID, OTHER_PUB)]),
	}),
	signedCase({
		name: "no matching kid",
		response: jwksFor([okp("other", SIGNER_PUB)]),
	}),
	signedCase({
		name: "second key matches",
		response: jwksFor([okp("other", OTHER_PUB), okp(KEY_ID, SIGNER_PUB)]),
	}),
	signedCase({
		name: "first of duplicate kids is wrong",
		response: jwksFor([okp(KEY_ID, OTHER_PUB), okp(KEY_ID, SIGNER_PUB)]),
	}),
	signedCase({
		name: "null jwk before match throws",
		response: jwksFor([null, okp(KEY_ID, SIGNER_PUB)]),
	}),
	signedCase({
		name: "null jwk after match",
		response: jwksFor([okp(KEY_ID, SIGNER_PUB), null]),
	}),
	signedCase({
		name: "non-object jwks entries",
		response: jwksFor([1, "x", [], true, okp(KEY_ID, SIGNER_PUB)]),
	}),
	signedCase({
		name: "rsa key",
		response: jwksFor([{ kty: "RSA", kid: KEY_ID, n: "abc", e: "AQAB" }]),
	}),
	signedCase({
		name: "wrong curve",
		response: jwksFor([{ ...okp(KEY_ID, SIGNER_PUB), crv: "X25519" }]),
	}),
	signedCase({
		name: "missing x",
		response: jwksFor([{ kty: "OKP", crv: "Ed25519", kid: KEY_ID }]),
	}),
	signedCase({
		name: "numeric x",
		response: jwksFor([{ kty: "OKP", crv: "Ed25519", kid: KEY_ID, x: 5 }]),
	}),
	signedCase({
		name: "short x",
		response: jwksFor([{ ...okp(KEY_ID, SIGNER_PUB.slice(0, 31)) }]),
	}),
	signedCase({
		name: "invalid base64url x",
		response: jwksFor([{ ...okp(KEY_ID, SIGNER_PUB), x: "!!!" }]),
	}),
	signedCase({
		name: "padded base64url x",
		response: jwksFor([
			{ ...okp(KEY_ID, SIGNER_PUB), x: `${toBase64Url(SIGNER_PUB)}=` },
		]),
	}),
	signedCase({
		name: "plain base64 x",
		response: jwksFor([
			{ ...okp(KEY_ID, SIGNER_PUB), x: toBase64(SIGNER_PUB) },
		]),
	}),
	signedCase({
		name: "numeric kid does not match",
		paramsValue: params({ keyid: '"5"' }),
		response: jwksFor([{ ...okp("5", SIGNER_PUB), kid: 5 }]),
	}),
	signedCase({
		name: "jwks 500",
		response: { kind: "response", status: 500, headers: [], chunks: ["x"] },
	}),
	signedCase({
		name: "jwks throws",
		response: { kind: "throw", message: "boom" },
	}),
	signedCase({ name: "jwks invalid json", response: okJson("{nope") }),
	signedCase({ name: "jwks null", response: okJson("null") }),
	signedCase({ name: "jwks without keys", response: okJson("{}") }),
	signedCase({
		name: "http signer refused",
		agent: '"http://signer.example.com"',
	}),
	signedCase({
		name: "localhost signer refused",
		agent: '"https://localhost"',
	}),
	signedCase({
		name: "localhost signer allowed",
		agent: '"http://localhost:1234"',
		allowLocalSigners: true,
	}),
	signedCase({
		name: "agent with path",
		agent: '"https://signer.example.com/bots/"',
	}),
	signedCase({
		name: "unsupported alg",
		paramsValue: params({ alg: '"rsa-pss-sha512"' }),
	}),
	signedCase({ name: "boolean alg", paramsValue: params({ alg: "" }) }),
	signedCase({
		name: "uppercase alg",
		paramsValue: params({ alg: '"ED25519"' }),
	}),
	signedCase({ name: "missing keyid", paramsValue: params({ keyid: null }) }),
	signedCase({ name: "empty keyid", paramsValue: params({ keyid: '""' }) }),
	signedCase({ name: "numeric keyid", paramsValue: params({ keyid: "5" }) }),
	signedCase({
		name: "token keyid",
		paramsValue: params({ keyid: "test-key-1" }),
	}),
	signedCase({
		name: "expired",
		paramsValue: params({
			created: String(NOW_S - 120),
			expires: String(NOW_S - 60),
		}),
	}),
	signedCase({
		name: "expired by a second",
		paramsValue: params({ expires: String(NOW_S - 1) }),
	}),
	signedCase({
		name: "not yet valid",
		paramsValue: params({
			created: String(NOW_S + 6),
			expires: String(NOW_S + 66),
		}),
	}),
	signedCase({
		name: "missing created",
		paramsValue: params({ created: null }),
	}),
	signedCase({
		name: "missing expires",
		paramsValue: params({ expires: null }),
	}),
	signedCase({
		name: "string created",
		paramsValue: params({ created: `"${NOW_S}"` }),
	}),
	signedCase({
		name: "boolean expires",
		paramsValue: params({ expires: "?1" }),
	}),
	signedCase({ name: "missing tag", paramsValue: params({ tag: null }) }),
	signedCase({
		name: "token tag",
		paramsValue: params({ tag: "web-bot-auth" }),
	}),
	signedCase({ name: "wrong tag", paramsValue: params({ tag: '"other"' }) }),
	signedCase({
		name: "expired and wrong tag",
		paramsValue: params({ expires: String(NOW_S - 60), tag: '"x"' }),
	}),
	signedCase({
		name: "bad alg and wrong tag",
		paramsValue: params({ alg: '"x"', tag: '"x"' }),
	}),
	signedCase({
		name: "proto bytes param",
		paramsValue: params({ extra: ";__proto__=:AQID:" }),
	}),
	signedCase({
		name: "proto bytes then length",
		paramsValue: params({ extra: ";__proto__=:AQID:;length=3" }),
	}),
	signedCase({ name: "signature label mismatch", signatureLabel: "sig2" }),
	signedCase({ name: "signature not base64", signatureOverride: "!!!" }),
	signedCase({
		name: "empty signature bytes",
		headerOverrides: { signature: "sig1=::" },
	}),
	signedCase({
		name: "colon-only signature",
		headerOverrides: { signature: "sig1=:" },
	}),
	signedCase({
		name: "signature quoted",
		headerOverrides: { signature: 'sig1="abc"' },
	}),
	signedCase({
		name: "unsupported component",
		covered: ["@authority", "signature-agent"],
		paramsValue: params({ covered: '("@authority" "@method")' }),
	}),
	signedCase({
		name: "no covered components",
		covered: [],
		paramsValue: params({ covered: "()" }),
	}),
	signedCase({ name: "unparseable url", url: "not a url" }),
	signedCase({ name: "non-special url", url: "foo://target.example.com/x" }),
	signedCase({
		name: "unparseable signature input",
		headerOverrides: { "signature-input": "garbage" },
	}),
	signedCase({
		name: "signature input not a list",
		headerOverrides: { "signature-input": 'sig1="x"' },
	}),
	signedCase({
		name: "unparseable signature agent",
		agent: "https://signer.example.com",
	}),
	signedCase({
		name: "signature agent ftp",
		agent: '"ftp://signer.example.com"',
	}),
	signedCase({
		name: "signature agent invalid url throws",
		agent: '"https://exa mple.com"',
	}),
	signedCase({
		name: "missing signature-agent",
		dropHeader: "signature-agent",
	}),
	signedCase({
		name: "missing signature-input",
		dropHeader: "signature-input",
	}),
	signedCase({ name: "missing signature", dropHeader: "signature" }),
	signedCase({
		name: "empty signature header",
		headerOverrides: { signature: "" },
	}),
	{
		name: "unsigned",
		nowMs: NOW_S * 1000,
		url: "https://target.example.com/",
		headers: {},
		allowLocalSigners: false,
		response: jwksFor([]),
	},
	{
		name: "uppercase header names are not found",
		nowMs: NOW_S * 1000,
		url: "https://target.example.com/",
		headers: {
			"Signature-Agent": '"https://signer.example.com"',
			"Signature-Input": "x",
			Signature: "y",
		},
		allowLocalSigners: false,
		response: jwksFor([]),
	},
];

type VerifyResultJson =
	| { verified: true; signerUrl: string; keyid: string }
	| { verified: false; reason: string };

const verifyVectors: (VerifyCase & {
	result: Outcome<VerifyResultJson>;
	fetchedUrls: string[];
})[] = [];
for (const c of VERIFY_CASES) {
	clearJwksCache();
	fakeNow = c.nowMs;
	const seen: string[] = [];
	const result: Outcome<VerifyResultJson> = await attemptAsync(() =>
		verifyWebBotAuth(
			{ method: "GET", url: c.url, headers: c.headers },
			{
				fetch: mockFetch(c.response, seen),
				allowLocalSigners: c.allowLocalSigners,
			},
		),
	);
	verifyVectors.push({ ...c, result, fetchedUrls: seen });
}
clearJwksCache();
clearInterval(keepAlive);

const data = {
	decodeBase64: base64Vectors(decodeBase64),
	decodeBase64Url: base64Vectors(decodeBase64Url),
	parseSignatureInput: signatureInputVectors,
	parseSignature: signatureVectors,
	parseSignatureAgentHeader: signatureAgentVectors,
	normaliseSignatureAgentUrl: normaliseVectors,
	buildSignatureBase: signatureBaseVectors,
	resolveJwks: jwksVectors,
	ed25519Sign: signingVectors,
	ed25519Verify: rawVerifyVectors,
	verifyWebBotAuth: verifyVectors,
};

const out = join(dirname(fileURLToPath(import.meta.url)), "vectors.json");
writeFileSync(out, `${JSON.stringify(data, null, "\t")}\n`);
