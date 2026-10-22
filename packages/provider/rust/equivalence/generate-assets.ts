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

// Writes assets-vectors.json: how the image route rewrites item URLs, from the TS on Node 24.
// The seal format's helpers; `sealAssetPath` over paths, key ids and expiries (each blob
// carries the random IV it was sealed under, which the Rust takes back out to reproduce it);
// the sealed and signed resolvers built from the environment, as the route builds them per
// request, over URLs with and without paths, extensions, queries and non-http schemes; and
// which of the two the route uses.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { sealAssetPath } from "../../src/api/captcha/assetSeal.js";
import {
	encodePayload,
	fromBase64Url,
	isSafeAssetPath,
	parseSealKeys,
	toBase64Url,
} from "../../src/api/captcha/assetSealFormat.js";
import { getSealedAssetsResolver } from "../../src/api/captcha/sealedAssetsResolver.js";
import { getSignedAssetsResolver } from "../../src/api/captcha/signedAssetsResolver.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(
		`this generator must run on Node 24 (the production runtime), not ${process.version}`,
	);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const outcome = (run: () => Json): Json => {
	try {
		return { ok: run() };
	} catch (err) {
		return { error: err instanceof Error ? err.message : String(err) };
	}
};
const hex = (bytes: Uint8Array | undefined): Json =>
	bytes === undefined ? null : Buffer.from(bytes).toString("hex");

const NOW_MS = 1_792_663_258_460;
Date.now = () => NOW_MS;

const KEY_A = Buffer.alloc(32, 0xa1);
const KEY_B = Buffer.alloc(32, 0x5b);
const b64 = (key: Buffer): string => key.toString("base64");
const b64url = (key: Buffer): string => toBase64Url(new Uint8Array(key));

const base64Inputs: string[] = [
	"",
	"AA",
	"AAA",
	"AAAA",
	"A",
	"AB",
	"AQ",
	"_-_-",
	"ab+c",
	"ab/c",
	"YWJj=",
	"YWJj",
	"YW",
	"YWI",
	"Zm9vYmFy",
	" YWJj",
	"Y W",
	"é",
];
const base64 = base64Inputs.map((input) => ({
	input,
	decoded: hex(fromBase64Url(input)),
}));
const encodeInputs: number[][] = [
	[],
	[0],
	[255, 254],
	[1, 2, 3],
	[251, 255, 191, 0],
];
const encoded = encodeInputs.map((bytes) => ({
	bytes,
	encoded: toBase64Url(new Uint8Array(bytes)),
}));

const pathInputs: [string, string | undefined][] = [
	["/a/b.jpg", undefined],
	["a/b.jpg", undefined],
	["/", undefined],
	["", undefined],
	["//cdn/x", undefined],
	["/a/../b", undefined],
	["/a/..b", undefined],
	["/a\tb", undefined],
	["/a\u007fb", undefined],
	["/a\u0080b", undefined],
	["/é.png", undefined],
	[`/${"a".repeat(511)}`, undefined],
	[`/${"a".repeat(512)}`, undefined],
	[`/${"é".repeat(511)}`, undefined],
	[`/${"😀".repeat(256)}`, undefined],
	["/datasets/x.png", "/datasets/"],
	["/other/x.png", "/datasets/"],
];
const safePaths = pathInputs.map(([path, prefix]) => ({
	path,
	prefix: prefix ?? null,
	safe: isSafeAssetPath(path, prefix),
}));

const keySpecs: string[] = [
	`1:${b64(KEY_A)}`,
	` 1:${b64(KEY_A)} , 2:${b64url(KEY_B)},`,
	`0:${b64(KEY_A)}`,
	`255:${b64(KEY_A)}`,
	`256:${b64(KEY_A)}`,
	`-1:${b64(KEY_A)}`,
	`1.5:${b64(KEY_A)}`,
	`0x2:${b64(KEY_A)}`,
	` 3 :${b64(KEY_A)}`,
	`1e0:${b64(KEY_A)}`,
	`+4:${b64(KEY_A)}`,
	`:${b64(KEY_A)}`,
	`1${b64(KEY_A)}`,
	`1:${b64(KEY_A).slice(0, 40)}`,
	`1:${b64(Buffer.alloc(33, 1))}`,
	`1:${b64(KEY_A)}==`,
	`1:${b64(KEY_A)}, 1:${b64(KEY_B)}`,
	`1:${b64(KEY_A)}, 2:${b64(KEY_B)}, 1:${b64(KEY_B)}`,
	"",
	" , ",
	`1:${b64(KEY_A).replace(/=/g, "")}x`,
	` 1:${b64(KEY_A)} `,
];
const keys = keySpecs.map((spec) => ({
	spec,
	parsed: outcome(() =>
		[...parseSealKeys(spec)].map(([id, key]) => [id, hex(key)] as Json),
	),
}));

const expiries: number[] = [
	0,
	1,
	1_792_663_558,
	4_294_967_295,
	4_294_967_296,
	-1,
	1.9,
	2 ** 53,
	Number.NaN,
];
const payloads = expiries.map((expiresAtSeconds) => ({
	expiresAtSeconds: Number.isNaN(expiresAtSeconds) ? "NaN" : expiresAtSeconds,
	encoded: hex(encodePayload({ expiresAtSeconds, path: "/x" })),
}));

const sealInputs: [Buffer, number, string, number][] = [
	[KEY_A, 1, "/datasets/a/0.jpg", 1_792_663_558],
	[KEY_B, 0, "/x", 0],
	[KEY_B, 255, "/é/😀.png", 4_294_967_295],
	[KEY_A, 7, "/a/../b", 1],
	[KEY_A, 7, "no-slash", 1],
	[KEY_A, 7, `/${"a".repeat(600)}`, 1],
];
const seals = sealInputs.map(([key, keyId, path, expiresAtSeconds]) => ({
	key: hex(key),
	keyId,
	path,
	expiresAtSeconds,
	sealed: outcome(() => sealAssetPath({ path, key, keyId, expiresAtSeconds })),
}));

const uris: string[] = [
	"https://cdn.example.com/datasets/a/0.jpg",
	"https://cdn.example.com/datasets/a/0",
	"https://cdn.example.com/datasets/a.b/0",
	"https://cdn.example.com/datasets/a/0.verylongext",
	"https://cdn.example.com/datasets/a/0.abcdefgh1",
	"https://cdn.example.com/datasets/a/0.abcdefg1",
	"https://cdn.example.com/datasets/a/0.j-g",
	"https://cdn.example.com/datasets/a/.hidden",
	"https://cdn.example.com/x.PNG",
	"https://cdn.example.com/",
	"https://cdn.example.com",
	"https://cdn.example.com:8443/a.webp",
	"https://user:pw@cdn.example.com/a.jpg",
	"http://cdn.example.com/a b.jpg",
	"https://cdn.example.com/é.jpg",
	"https://CDN.Example.com/a/./b/../c.jpg",
	"https://bücher.example/a.jpg",
	"https://cdn.example.com/a.jpg?",
	"https://cdn.example.com/a.jpg?v=1",
	"https://cdn.example.com/a.jpg#frag",
	"https://cdn.example.com/a%2e%2e/b.jpg",
	"https://cdn.example.com//a.jpg",
	"ftp://cdn.example.com/a.jpg",
	"/local/a.jpg",
	"data:image/png;base64,AAAA",
	"not a url",
	"",
];

const sealedEnvs: Record<string, string>[] = [
	{},
	{ PROSOPO_ASSET_SEAL_KEYS: `1:${b64(KEY_A)},4:${b64(KEY_B)}` },
	{
		PROSOPO_ASSET_SEAL_KEYS: `1:${b64(KEY_A)},4:${b64(KEY_B)}`,
		PROSOPO_ASSET_SEAL_ACTIVE_KEY_ID: "1",
		PROSOPO_ASSET_SEAL_TTL_SECONDS: "60",
		PROSOPO_ASSET_SEAL_URL_PREFIX: "img",
	},
	{
		PROSOPO_ASSET_SEAL_KEYS: `1:${b64(KEY_A)}`,
		PROSOPO_ASSET_SEAL_ACTIVE_KEY_ID: "2",
	},
	{
		PROSOPO_ASSET_SEAL_KEYS: `1:${b64(KEY_A)}`,
		PROSOPO_ASSET_SEAL_ACTIVE_KEY_ID: "1abc",
		PROSOPO_ASSET_SEAL_TTL_SECONDS: "0",
	},
	{
		PROSOPO_ASSET_SEAL_KEYS: `1:${b64(KEY_A)}`,
		PROSOPO_ASSET_SEAL_ACTIVE_KEY_ID: "x",
	},
	{
		PROSOPO_ASSET_SEAL_KEYS: `1:${b64(KEY_A)}`,
		PROSOPO_ASSET_SEAL_TTL_SECONDS: "-1792663258",
	},
	{
		PROSOPO_ASSET_SEAL_KEYS: `1:${b64(KEY_A)}`,
		PROSOPO_ASSET_SEAL_TTL_SECONDS: "3e9",
		PROSOPO_ASSET_SEAL_URL_PREFIX: "",
	},
	{ PROSOPO_ASSET_SEAL_KEYS: "1:short" },
	{ PROSOPO_ASSET_SEAL_KEYS: " , " },
];
const signedEnvs: Record<string, string>[] = [
	{},
	{ PROSOPO_ASSET_TOKEN_KEY: "bunny-key" },
	{
		PROSOPO_ASSET_TOKEN_KEY: "bunny-key",
		PROSOPO_ASSET_TOKEN_TTL_SECONDS: "60",
		PROSOPO_ASSET_TOKEN_BIND_IP: "true",
	},
	{
		PROSOPO_ASSET_TOKEN_KEY: "bunny-key",
		PROSOPO_ASSET_TOKEN_TTL_SECONDS: "0",
		PROSOPO_ASSET_TOKEN_BIND_IP: "TRUE",
	},
	{
		PROSOPO_ASSET_TOKEN_KEY: "ключ",
		PROSOPO_ASSET_TOKEN_TTL_SECONDS: "1.5e3",
	},
];
const clientIps: (string | undefined)[] = [undefined, "203.0.113.7", "::1", ""];

const ENV_KEYS = [
	"PROSOPO_ASSET_SEAL_KEYS",
	"PROSOPO_ASSET_SEAL_ACTIVE_KEY_ID",
	"PROSOPO_ASSET_SEAL_TTL_SECONDS",
	"PROSOPO_ASSET_SEAL_URL_PREFIX",
	"PROSOPO_ASSET_TOKEN_KEY",
	"PROSOPO_ASSET_TOKEN_TTL_SECONDS",
	"PROSOPO_ASSET_TOKEN_BIND_IP",
];
const withEnv = <T>(env: Record<string, string>, run: () => T): T => {
	for (const key of ENV_KEYS) Reflect.deleteProperty(process.env, key);
	Object.assign(process.env, env);
	try {
		return run();
	} finally {
		for (const key of ENV_KEYS) Reflect.deleteProperty(process.env, key);
	}
};

// The route's `getSealedAssetsResolver() ?? getSignedAssetsResolver(ip)`, then each item's
// `resolveAsset(data).getURL() || data`.
const resolved: Json[] = [];
for (const sealedEnv of sealedEnvs) {
	for (const signedEnv of signedEnvs) {
		for (const clientIp of clientIps) {
			const env = { ...sealedEnv, ...signedEnv };
			resolved.push({
				env,
				clientIp: clientIp ?? null,
				urls: withEnv(env, () =>
					outcome(() => {
						const resolver =
							getSealedAssetsResolver() ?? getSignedAssetsResolver(clientIp);
						return uris.map((uri) =>
							outcome(() => resolver?.resolveAsset(uri).getURL() || uri),
						);
					}),
				),
			});
		}
	}
}

const out = fileURLToPath(new URL("assets-vectors.json", import.meta.url));
writeFileSync(
	out,
	`${JSON.stringify({ nowMs: NOW_MS, uris, base64, encoded, safePaths, keys, payloads, seals, resolved })}\n`,
);
console.log(
	`wrote ${resolved.length} resolver configurations over ${uris.length} URLs to ${out}`,
);
