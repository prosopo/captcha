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

// Records the server SDK into vectors.json, which equivalence.rs replays against the Rust:
// detectIpMode, getServerUrl and getServerConfig over environments, isRecent, and isVerified
// end to end against a stubbed fetch, with the messages it signed and the requests it sent.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ProsopoBaseError } from "@prosopo/common";
import { Keyring } from "@prosopo/keyring";
import {
	ApiParams,
	type CaptchaType,
	type KeyringPair,
	type ProcaptchaOutput,
	ProcaptchaTokenCodec,
	ProcaptchaTokenCodecV1,
	type ProsopoServerConfigOutput,
	ProsopoServerConfigSchema,
	encodeProcaptchaOutput,
} from "@prosopo/types";
import { u8aToHex } from "@prosopo/util";
import { getServerConfig, getServerUrl } from "../../src/config.js";
import { PublicProsopoServer } from "../../src/index.js";
import { ProsopoServer, detectIpMode } from "../../src/server.js";

// The vectors are what Node 24, the production runtime, produces.
if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const NOW = 1_710_000_060_000;
const PROVIDER_URL = "https://pronode1.example";
const DAPP = "5C1cs9CfxYQfNi3ARtprMDzR7BFRWFVSoDaLb1JytkiXwq5m";
const USER = "5CFHA8d3S1XXkZuBwGqiuA6SECTzfoucq397YL34FuPAH89G";
const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const SIGNATURE_PLACEHOLDER = "<dappSignature>";

Date.now = (): number => NOW;

// sr25519 signing draws a nonce from crypto.getRandomValues. A fixed xorshift stream makes
// the recorded TS signatures the same on every run; they are verified, never compared.
let prngState = 0x2545f491;
Object.defineProperty(globalThis.crypto, "getRandomValues", {
	value: <T extends ArrayBufferView | null>(array: T): T => {
		if (array !== null) {
			const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
			for (let i = 0; i < bytes.length; i++) {
				prngState ^= prngState << 13;
				prngState ^= prngState >>> 17;
				prngState ^= prngState << 5;
				bytes[i] = prngState & 0xff;
			}
		}
		return array;
	},
	configurable: true,
	writable: true,
});
for (const key of Object.keys(process.env)) {
	if (key.startsWith("PROSOPO_")) delete process.env[key];
}
process.env.PROSOPO_PROVIDER_URL_DEVELOPMENT = PROVIDER_URL;

const ipModes: Json[] = [
	undefined,
	"",
	"https://ipv4.pronode15.prosopo.io",
	"https://ipv6.pronode15.prosopo.io",
	"https://pronode15.prosopo.io",
	"https://ipv4.pronode15.prosopo.io/",
	"https://ipv4.pronode15.prosopo.io/some/path?q=1",
	"https://ipv4-shim.pronode15.prosopo.io",
	"https://pronode15.ipv4-thing.prosopo.io",
	"https://pronode15.ipv4.prosopo.io",
	"https://xipv4.pronode15.prosopo.io",
	"https://pronode15.prosopo.io/ipv4.x",
	"http://ipv4.pronode15.prosopo.io",
	"not-a-url",
	"https://IPV4.Pronode15.prosopo.io",
	"https://ipv6.pronode15.prosopo.io:8443/x",
	"https://user:pw@ipv4.pronode15.prosopo.io",
	"  https://ipv4.pronode15.prosopo.io  ",
	"https://ipv4\t.pronode15.prosopo.io",
	"https://ipv4%2epronode15.prosopo.io",
	"https://ipv4。pronode15.prosopo.io",
	"https://ipv4.",
	"https://ipv4",
	"ftp://ipv4.pronode15.prosopo.io",
	"file://ipv4.pronode15.prosopo.io/x",
	"blob:https://ipv4.pronode15.prosopo.io/uuid",
	"mailto:ipv4.pronode15.prosopo.io",
	"https://[::1]:9229",
	"https://ipv4.xn--bcher-kva.example",
	"https://ipv4.bücher.example",
	"ipv4.pronode15.prosopo.io",
	"//ipv4.pronode15.prosopo.io",
	"https:ipv4.pronode15.prosopo.io",
	"https://ipv4.pronode15.prosopo.io#frag",
	"https://192.168.0.1",
	"https://0x7f.1",
].map((url) => ({ url: url ?? null, mode: detectIpMode(url as string | undefined) ?? null }));

const ENV_KEYS = ["PROSOPO_SERVER_URL", "PROSOPO_SERVER_PORT", "PROSOPO_DEFAULT_ENVIRONMENT", "PROSOPO_DAPP_NAME", "PROSOPO_SITE_KEY", "PROSOPO_SITE_PRIVATE_KEY"];

const ENVIRONMENTS: { [key: string]: string }[] = [
	{},
	{ PROSOPO_SERVER_URL: "https://provider.test:8080" },
	{ PROSOPO_SERVER_URL: "https://provider.test", PROSOPO_SERVER_PORT: "1234" },
	{ PROSOPO_SERVER_URL: "https://provider.test" },
	{ PROSOPO_SERVER_URL: "" },
	{ PROSOPO_SERVER_URL: "https://provider.test", PROSOPO_SERVER_PORT: "" },
	{ PROSOPO_SERVER_URL: "https://provider.test/a:1b" },
	{ PROSOPO_SERVER_URL: "https://provider.test:" },
	{ PROSOPO_SERVER_URL: "https://provider.test:x", PROSOPO_SERVER_PORT: "9" },
	{ PROSOPO_SERVER_URL: "provider.test" },
	{ PROSOPO_SERVER_URL: "https://provider.test", PROSOPO_SERVER_PORT: "abc" },
	{ PROSOPO_SERVER_URL: "https://provider.test:٣" },
	{ PROSOPO_DEFAULT_ENVIRONMENT: "development", PROSOPO_DAPP_NAME: "my-dapp", PROSOPO_SITE_KEY: "site-key", PROSOPO_SITE_PRIVATE_KEY: "site-secret", PROSOPO_SERVER_URL: "https://provider.test:8080" },
	{ PROSOPO_DEFAULT_ENVIRONMENT: "staging" },
	{ PROSOPO_DEFAULT_ENVIRONMENT: "production" },
	{ PROSOPO_DEFAULT_ENVIRONMENT: "not-an-environment" },
	{ PROSOPO_DEFAULT_ENVIRONMENT: "" },
	{ PROSOPO_DEFAULT_ENVIRONMENT: "test" },
	{ PROSOPO_DAPP_NAME: "" },
	{ PROSOPO_SITE_KEY: "", PROSOPO_SITE_PRIVATE_KEY: "" },
	{ PROSOPO_SERVER_URL: "not a url:80" },
];

const environments: Json[] = ENVIRONMENTS.map((env) => {
	for (const key of ENV_KEYS) delete process.env[key];
	Object.assign(process.env, env);
	const url = getServerUrl();
	let config: Json;
	try {
		config = { ok: JSON.parse(JSON.stringify(getServerConfig())) as Json };
	} catch (e) {
		config = { issues: JSON.parse(JSON.stringify((e as { issues: unknown }).issues)) as Json };
	}
	for (const key of ENV_KEYS) delete process.env[key];
	return { env, url, config };
});

const TIMEOUTS = {
	image: { challengeTimeout: 1_000, solutionTimeout: 2_000, verifiedTimeout: 3_000, cachedTimeout: 11_000 },
	pow: { verifiedTimeout: 4_000, solutionTimeout: 5_000, cachedTimeout: 22_000 },
	puzzle: { verifiedTimeout: 6_000, solutionTimeout: 7_000, cachedTimeout: 33_000 },
	audio: { verifiedTimeout: 8_000, solutionTimeout: 9_000, cachedTimeout: 44_000 },
	iconOrder: { verifiedTimeout: 10_000, solutionTimeout: 12_000, cachedTimeout: 55_000 },
	contract: { maxVerifiedTime: 13_000 },
};

const configInput = (extra: { [key: string]: Json } = {}): { [key: string]: Json } => ({
	defaultEnvironment: "development",
	account: { address: DAPP },
	timeouts: TIMEOUTS,
	...extra,
});

const parseConfig = (input: { [key: string]: Json }): ProsopoServerConfigOutput => ProsopoServerConfigSchema.parse(input);

const recency: Json[] = [];
{
	const server = new ProsopoServer(parseConfig(configInput()));
	const isRecent = server["isRecent"].bind(server);
	for (const timestamp of [NOW, NOW - 1, NOW - 999, NOW - 1_000, NOW - 1_001, NOW + 29_999, NOW + 30_000, NOW + 30_001, 0, Number.NaN, -1, 1, NOW - 0.5, NOW + 30_000.5, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
		for (const timeout of [1_000, 0, -1, 0.5, Number.POSITIVE_INFINITY]) {
			recency.push({ timestamp: String(timestamp), timeout: String(timeout), recent: isRecent(timestamp, timeout, "Label") });
		}
	}
}

type TokenSpec = { kind: "v2"; output: ProcaptchaOutput } | { kind: "v1"; output: ProcaptchaOutput } | { kind: "bogusType"; captchaType: string } | { kind: "raw"; token: string };

const output = (timestamp: string, captchaType?: CaptchaType, challenge = true, providerUrl: string | undefined = PROVIDER_URL): ProcaptchaOutput => ({
	...(providerUrl === undefined ? {} : { [ApiParams.providerUrl]: providerUrl }),
	[ApiParams.dapp]: DAPP,
	[ApiParams.user]: USER,
	...(challenge ? { [ApiParams.challenge]: "challenge-string" } : { [ApiParams.commitmentId]: "0xdeadbeef" }),
	[ApiParams.timestamp]: timestamp,
	[ApiParams.signature]: challenge
		? { [ApiParams.provider]: { [ApiParams.challenge]: "psig" }, [ApiParams.user]: { [ApiParams.timestamp]: "usig" } }
		: { [ApiParams.provider]: { [ApiParams.requestHash]: "req" }, [ApiParams.user]: { [ApiParams.timestamp]: "usig" } },
	...(captchaType === undefined ? {} : { [ApiParams.captchaType]: captchaType }),
});

const encodeV1 = (value: ProcaptchaOutput): string =>
	u8aToHex(
		ProcaptchaTokenCodecV1.enc({
			[ApiParams.commitmentId]: undefined,
			[ApiParams.providerUrl]: undefined,
			[ApiParams.challenge]: undefined,
			[ApiParams.nonce]: undefined,
			...value,
			signature: {
				provider: { challenge: value.signature.provider?.challenge || undefined, requestHash: value.signature.provider?.requestHash || undefined },
				user: { timestamp: value.signature.user?.timestamp || undefined, requestHash: value.signature.user?.requestHash || undefined },
			},
		}),
	);

const tokenOf = (spec: TokenSpec): string => {
	switch (spec.kind) {
		case "v2":
			return encodeProcaptchaOutput(spec.output);
		case "v1":
			return encodeV1(spec.output);
		case "bogusType":
			return u8aToHex(
				ProcaptchaTokenCodec.enc({
					[ApiParams.commitmentId]: undefined,
					[ApiParams.providerUrl]: PROVIDER_URL,
					[ApiParams.challenge]: "c",
					[ApiParams.nonce]: undefined,
					[ApiParams.dapp]: DAPP,
					[ApiParams.user]: USER,
					[ApiParams.timestamp]: String(NOW),
					[ApiParams.signature]: { provider: { challenge: "s", requestHash: undefined }, user: { timestamp: "s", requestHash: undefined } },
					[ApiParams.captchaType]: spec.captchaType,
				}),
			);
		case "raw":
			return spec.token;
	}
};

type ResponseSpec = { status: number; statusText: string; contentType?: string; body: string } | { networkError: string } | { stall: true };
const ok = (body: Json): ResponseSpec => ({ status: 200, statusText: "OK", contentType: "application/json", body: JSON.stringify(body) });
const VERIFIED = ok({ status: "ok", verified: true, score: 0.25 });

type Signer = "alice" | "none" | "watchOnly";
type Scenario = { label: string; config: { [key: string]: Json }; signer: Signer; token: string; ip?: string; email?: string; clientSessionId?: string; response: ResponseSpec };

const scenarios: Scenario[] = [];
const add = (label: string, token: string, extra: Partial<Scenario> = {}): void => {
	scenarios.push({ label, config: configInput(), signer: "alice", token, response: VERIFIED, ...extra });
};

const CAPTCHA_TYPES: (CaptchaType | undefined)[] = [undefined, "image", "pow", "frictionless", "puzzle", "audio", "iconOrder", "authenticated"] as (CaptchaType | undefined)[];
const AGES = [1_000, 10_999, 11_000, 21_999, 22_000, 32_999, 33_000, 43_999, 44_000, 54_999, 55_000, -30_000, -30_001];
for (const captchaType of CAPTCHA_TYPES) {
	for (const challenge of [true, false]) {
		for (const age of AGES) {
			add(`${captchaType ?? "legacy"} ${challenge ? "challenge" : "commitment"} aged ${age}`, tokenOf({ kind: "v2", output: output(String(NOW - age), captchaType, challenge) }));
		}
	}
}
const freshHex = `0x${(NOW - 1_000).toString(16)}`;
for (const timestamp of [freshHex, freshHex.toUpperCase().replace("0X", "0x"), `0o${(NOW - 1_000).toString(8)}`, `0b${(NOW - 1_000).toString(2)}`, `${NOW - 1_000}.000`, `\n${NOW - 1_000}\t`, `+${NOW - 1_000}`, `${(NOW - 1_000) / 1e12}e12`, "0", "", "abc", "0x10", " 1710000050000 ", "1.71000005e12", "1710000050000.5", "-5", "Infinity", "1e400", "0b1", "1_710_000_050_000"]) {
	add(`pow timestamp ${JSON.stringify(timestamp)}`, tokenOf({ kind: "v2", output: output(timestamp, "pow" as CaptchaType) }));
	add(`image timestamp ${JSON.stringify(timestamp)}`, tokenOf({ kind: "v2", output: output(timestamp, "image" as CaptchaType, false) }));
}
add("v1 pow-shape token", tokenOf({ kind: "v1", output: output(String(NOW - 1_000), undefined, true) }));
add("v1 image-shape token", tokenOf({ kind: "v1", output: output(String(NOW - 1_000), undefined, false) }));
add("unknown captcha type", tokenOf({ kind: "bogusType", captchaType: "bogus-captcha-type" }));
add("malformed token", "0xdeadbeef");
add("non-hex token", "not-a-hex-token");
add("empty token", "");
add("no provider url", tokenOf({ kind: "v2", output: output(String(NOW - 1_000), "pow" as CaptchaType, true, undefined) }));
add("empty provider url", tokenOf({ kind: "v2", output: output(String(NOW - 1_000), "pow" as CaptchaType, true, "") }));
add("unknown provider", tokenOf({ kind: "v2", output: output(String(NOW - 1_000), "pow" as CaptchaType, true, "https://a-different-provider.example") }));
add("provider url with a trailing slash", tokenOf({ kind: "v2", output: output(String(NOW - 1_000), "pow" as CaptchaType, true, `${PROVIDER_URL}/`) }));
add("ipv4 sub-zone provider", tokenOf({ kind: "v2", output: output(String(NOW - 1_000), "pow" as CaptchaType, true, "https://ipv4.pronode1.example") }));
const fresh = (captchaType: string, challenge = true): string => tokenOf({ kind: "v2", output: output(String(NOW - 1_000), captchaType as CaptchaType, challenge) });
for (const captchaType of ["image", "pow", "puzzle", "audio", "iconOrder", "authenticated"]) {
	const challenge = captchaType !== "image";
	add(`${captchaType} with ip, email and session`, fresh(captchaType, challenge), { ip: "203.0.113.7", email: "a@example.com", clientSessionId: "session-1" });
	add(`${captchaType} with empty ip, email and session`, fresh(captchaType, challenge), { ip: "", email: "", clientSessionId: "" });
	add(`${captchaType} not verified`, fresh(captchaType, challenge), { response: ok({ status: "ok", verified: false }) });
	add(`${captchaType} json 400`, fresh(captchaType, challenge), { response: { status: 400, statusText: "Bad Request", contentType: "application/json", body: '{"error":{"message":"bad","code":400}}' } });
	add(`${captchaType} text 503`, fresh(captchaType, challenge), { response: { status: 503, statusText: "Service Unavailable", contentType: "text/plain", body: "down" } });
	add(`${captchaType} network failure`, fresh(captchaType, challenge), { response: { networkError: "fetch failed" } });
	add(`${captchaType} stalled provider`, fresh(captchaType, challenge), { response: { stall: true }, config: configInput({ providerRequestTimeoutMs: 50 }) });
	add(`${captchaType} unparseable body`, fresh(captchaType, challenge), { response: { status: 200, statusText: "OK", contentType: "application/json", body: "<html>" } });
}
add("image with a default max verified time", fresh("image", false), { config: { defaultEnvironment: "development", account: { address: DAPP } } });
add("no signer", fresh("pow"), { signer: "none" });
add("watch-only signer", fresh("pow"), { signer: "watchOnly" });
add("stale token with no signer", tokenOf({ kind: "v2", output: output(String(NOW - 60_000), "pow" as CaptchaType) }), { signer: "none" });
add("no site key", fresh("pow"), { config: { defaultEnvironment: "development", account: {}, timeouts: TIMEOUTS } });

const errorJson = (e: unknown): Json => {
	if (e instanceof ProsopoBaseError) {
		const context = (e.context ?? {}) as { code?: number; token?: string };
		return { name: e.name, key: e.translationKey ?? null, code: context.code ?? null, token: context.token ?? null };
	}
	return { name: (e as Error).name, message: (e as Error).message };
};

const alice = new Keyring({ type: "sr25519" }).addFromUri("//Alice");
const signed: string[] = [];
const sign = alice.sign.bind(alice);
alice.sign = (...args: Parameters<KeyringPair["sign"]>): Uint8Array => {
	signed.push(String(args[0]));
	return sign(...args);
};
const watchOnly = new Keyring({ type: "sr25519" }).addFromAddress(ALICE);

// AbortSignal.timeout's timer does not keep the process alive, and a stalled request is all
// that is pending while it runs.
const keepAlive = setInterval(() => undefined, 1_000);
const recorded: Json[] = [];
for (const scenario of scenarios) {
	const requests: Json[] = [];
	const signatures: string[] = [];
	signed.length = 0;
	globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const headers = init?.headers as { [key: string]: string } | undefined;
		let body: Json = typeof init?.body === "string" ? init.body : null;
		if (typeof body === "string") {
			const parsed = JSON.parse(body) as { [key: string]: Json };
			if (typeof parsed.dappSignature === "string") {
				signatures.push(parsed.dappSignature);
				body = body.replace(parsed.dappSignature, SIGNATURE_PLACEHOLDER);
			}
		}
		requests.push({ url: String(input), method: init?.method ?? "GET", headers: Object.entries(headers ?? {}), body });
		const response = scenario.response;
		if ("networkError" in response) throw new TypeError(response.networkError);
		if ("stall" in response) {
			return new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
			});
		}
		const built = new Response(response.body, { status: response.status, statusText: response.statusText, headers: response.contentType ? { "content-type": response.contentType } : {} });
		Object.defineProperty(built, "url", { value: String(input) });
		return built;
	}) as typeof fetch;
	const pair: KeyringPair | undefined = scenario.signer === "alice" ? alice : scenario.signer === "watchOnly" ? watchOnly : undefined;
	const server = new ProsopoServer(parseConfig(scenario.config), pair);
	let outcome: Json;
	try {
		outcome = { result: JSON.parse(JSON.stringify(await server.isVerified(scenario.token, scenario.ip, scenario.email, scenario.clientSessionId))) as Json };
	} catch (e) {
		outcome = { error: errorJson(e) };
	}
	recorded.push({ ...(scenario as unknown as { [key: string]: Json }), signed: [...signed], signatures, requests, ...(outcome as { [key: string]: Json }) });
}

const publicServers: Json[] = [];
for (const address of [ALICE, DAPP, "", undefined, "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQZ", "0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d", "not-an-address"]) {
	const config = parseConfig({ defaultEnvironment: "development", account: address === undefined ? {} : { address } });
	try {
		const server = await PublicProsopoServer(config);
		publicServers.push({ address: address ?? null, ok: server.pair?.address ?? null });
	} catch (e) {
		publicServers.push({ address: address ?? null, error: (e as Error).message });
	}
}

clearInterval(keepAlive);

const target = fileURLToPath(new URL("./vectors.json", import.meta.url));
writeFileSync(target, `${JSON.stringify({ now: NOW, providerUrl: PROVIDER_URL, signaturePlaceholder: SIGNATURE_PLACEHOLDER, ipModes, environments, recency, scenarios: recorded, publicServers }, null, "\t")}\n`);
process.stdout.write(`wrote ${ipModes.length} ip modes, ${environments.length} environments, ${recency.length} recency checks, ${recorded.length} scenarios, ${publicServers.length} public servers\n`);
