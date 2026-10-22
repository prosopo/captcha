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

// Writes pipeline-vectors.json: what the request-signal middlewares read off headers, the key
// the admin rate limit uses, and the provider's real express app (startProviderApi, with an
// environment that has no database) answering requests, in a production setting with rate
// limits and a development one without. A request marked `compare: false` reaches a stage the
// Rust provider does not serve yet; it is still sent, in order, so the rate limits count it.
// `{{ADMIN_JWT}}` stands for a token freshly issued by the provider's pair. Run on Node 24.
import { writeFileSync } from "node:fs";
import type { IncomingHttpHeaders } from "node:http";
import type { AddressInfo, Server } from "node:net";
import net from "node:net";
import { fileURLToPath } from "node:url";
import type { ProviderEnvironment } from "@prosopo/env";
import { getPair } from "@prosopo/keyring";
import { getLogger } from "@prosopo/logger";
import type { Request } from "express";
import getConfig from "../../../cli/src/prosopo.config.js";
import { getHandshakeTiming } from "../../src/api/handshakeTimingMiddleware.js";
import { getJA4 } from "../../src/api/ja4Middleware.js";
import { getRawTlsSignals } from "../../src/api/rawTlsSignalsMiddleware.js";
import { getUserFromJWT, startProviderApi } from "../../src/api/startProviderApi.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

process.env.NODE_ENV = "production";
const MNEMONIC = "bottom drive obey lake curtain smoke basket hold race lonely fit walk";
const ADMIN = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";
const USER = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const SITE_KEY = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y";
const quiet = getLogger("error", "equivalence");

// ---------------------------------------------------------------- header readers

const base64Inputs = ["", "QQ", "QQ==", "QUI=", "QUJD", "QUJDRA", "Q U\nJ\tD", "QUJD!!RA", "-_8", "+/8", "QQ=QQ", "=QQ", "Q", "QUJDRA====", "ab", "abc", "abcd", "ÿÿ", "QUJDRA==QUJD"];
const base64 = base64Inputs.map((text) => ({ text, hex: Buffer.from(text, "base64").toString("hex") }));

const clientHello = (version: number, ciphers: number[], extensions: { id: number; data: Buffer }[]): Buffer => {
	const u16 = (n: number) => Buffer.from([(n >> 8) & 0xff, n & 0xff]);
	const exts = Buffer.concat(extensions.flatMap((ext) => [u16(ext.id), u16(ext.data.length), ext.data]));
	const body = Buffer.concat([u16(version), Buffer.alloc(32, 0xaa), Buffer.from([0]), u16(ciphers.length * 2), ...ciphers.map(u16), Buffer.from([1, 0]), u16(exts.length), exts]);
	const handshake = Buffer.concat([Buffer.from([0x01, (body.length >> 16) & 0xff, (body.length >> 8) & 0xff, body.length & 0xff]), body]);
	return Buffer.concat([Buffer.from([0x16, 0x03, 0x01]), u16(handshake.length), handshake]);
};
const sni = (host: string): Buffer => {
	const name = Buffer.from(host, "ascii");
	return Buffer.concat([Buffer.from([0, name.length + 3, 0, 0, name.length]), name]);
};
const alpn = (protocols: string[]): Buffer => {
	const list = Buffer.concat(protocols.map((p) => Buffer.concat([Buffer.from([p.length]), Buffer.from(p, "ascii")])));
	return Buffer.concat([Buffer.from([0, list.length]), list]);
};
const versions = (vs: number[]): Buffer => Buffer.concat([Buffer.from([vs.length * 2]), ...vs.map((v) => Buffer.from([v >> 8, v & 0xff]))]);
const hellos: Buffer[] = [
	clientHello(0x0303, [0x1301, 0x1302, 0x1303, 0xc02b], [
		{ id: 0, data: sni("example.com") },
		{ id: 16, data: alpn(["h2", "http/1.1"]) },
		{ id: 43, data: versions([0x0304, 0x0303]) },
		{ id: 13, data: Buffer.from([0, 4, 0x04, 0x03, 0x08, 0x04]) },
	]),
	clientHello(0x0303, [0x0a0a, 0xc02f], [{ id: 0x0a0a, data: Buffer.alloc(0) }, { id: 16, data: alpn(["http/1.1"]) }]),
	clientHello(0x0301, [0x002f], []),
	clientHello(0x0303, [], [{ id: 16, data: alpn(["ÿ"]) }]),
];
const ja4Headers: IncomingHttpHeaders[] = [
	{},
	{ "x-tls-clienthello": "" },
	{ "x-tls-clienthello": "not base64 at all" },
	{ "x-tls-clienthello": Buffer.from([0x16, 0x03, 0x01, 0x00, 0x05, 0x02, 0, 0, 0, 0]).toString("base64") },
	{ "x-tls-clienthello": Buffer.from([0x16, 0x03, 0x01, 0x00, 0x05, 0x01, 0, 0]).toString("base64") },
	...hellos.map((hello) => ({ "x-tls-clienthello": hello.toString("base64") })),
	{ "x-tls-clienthello": hellos[0]?.toString("base64url") },
	{ "x-tls-clienthello": `  ${hellos[0]?.toString("base64")}\t` },
	{ "x-tls-clienthello": hellos[0]?.subarray(0, 40).toString("base64") },
];
const ja4: Json[] = [];
for (const headers of ja4Headers) ja4.push({ headers: headers as Json, ja4: (await getJA4(headers, quiet)).ja4PlusFingerprint });

const numbers = ["0", "1", "-1", "12abc", "abc", "", " 42", "255", "256", "65535", "65536", "4294967295", "4294967296", "9223372036854775807", "9223372036854775808", "9223372036854775809", "1e3", "0x10", "9".repeat(400), "1, 2"];
const timing = numbers.flatMap((value) => [
	{ headers: { "x-tls-tcp-to-chello-us": value }, timing: getHandshakeTiming({ "x-tls-tcp-to-chello-us": value }, quiet) },
	{ headers: { "x-tls-chello-to-handshake-us": value }, timing: getHandshakeTiming({ "x-tls-chello-to-handshake-us": value }, quiet) },
]);
const RAW_HEADERS = ["x-tls-syn-ns", "x-tls-synack-ns", "x-tls-ack-ns", "x-tls-observed-ttl", "x-tls-tcp-mss", "x-tls-tcp-wscale", "x-tls-tcp-window", "x-tls-tcp-opts-present", "x-tls-tcp-opts-count", "x-tls-tcp-tsval", "x-tls-tcp-tsecr", "x-tls-tcp-flags", "x-tls-tcp-data-offset-resv", "x-tls-tcp-urg-ptr", "x-tls-ip-ident", "x-tls-ip-total-len", "x-tls-ip-frag-flags", "x-tls-ip-tos", "x-tls-tcp-opts-flags", "x-tls-tcp-opts-order"];
const kinds = ["0", "1", "2", "578437695752307201", "18446744073709551615", "18446744073709551616", "65793", "256", "abc", "", "-1", " 1", "00000000000000000002", "3388997"];
const rawTls: Json[] = [];
for (const name of RAW_HEADERS) {
	for (const value of numbers) {
		const headers = { [name]: value };
		rawTls.push({ headers, signals: JSON.parse(JSON.stringify(getRawTlsSignals(headers, quiet))) });
	}
}
for (const value of kinds) {
	const headers = { "x-tls-tcp-opts-kinds": value };
	rawTls.push({ headers, signals: JSON.parse(JSON.stringify(getRawTlsSignals(headers, quiet))) });
}

const b64 = (value: unknown): string => Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");
const authorizations = [
	undefined,
	"",
	"Bearer ",
	"Bearer a.b",
	"Bearer a..c",
	`Bearer x.${b64({ sub: "alice" })}.y`,
	`x.${b64({ sub: "alice" })}.y`,
	`Token Bearer x.${b64({ sub: "alice" })}.y`,
	`Bearer x.${b64({ sub: 5 })}.y`,
	`Bearer x.${b64({ sub: 0 })}.y`,
	`Bearer x.${b64({ sub: "" })}.y`,
	`Bearer x.${b64({ sub: true })}.y`,
	`Bearer x.${b64({ sub: false })}.y`,
	`Bearer x.${b64({ sub: null })}.y`,
	`Bearer x.${b64({ nosub: 1 })}.y`,
	`Bearer x.${b64("null")}.y`,
	`Bearer x.${b64("5")}.y`,
	`Bearer x.${b64("not json")}.y`,
	`Bearer x.${Buffer.from(JSON.stringify({ sub: "plain base64 +/" })).toString("base64")}.y`,
];
const jwtSubjects = authorizations.map((authorization) => {
	const req = { headers: authorization === undefined ? {} : { authorization } } as unknown as Request;
	const sub = getUserFromJWT(req) as unknown;
	return { authorization: authorization ?? null, type: typeof sub, sub: sub === undefined ? null : (sub as Json) };
});

// ---------------------------------------------------------------- the app

interface Step {
	method: string;
	path: string;
	headers?: [string, string][];
	body?: string;
	compare?: boolean;
}

const json: [string, string] = ["Content-Type", "application/json"];
const auth = (sub: unknown): [string, string] => ["Authorization", `Bearer x.${b64({ sub })}.y`];
const client = (path: string): string => `/v1/prosopo/provider/client/${path}`;
const user: [string, string] = ["Prosopo-User", USER];
const siteKey: [string, string] = ["Prosopo-Site-Key", SITE_KEY];

const productionSteps: Step[] = [
	{ method: "OPTIONS", path: client("captcha/pow") },
	{ method: "GET", path: "/nowhere" },
	{ method: "HEAD", path: "/nowhere" },
	{ method: "POST", path: "/x", headers: [json], body: "{}" },
	{ method: "GET", path: "/" },
	{ method: "GET", path: "/HEALTHZ/x" },
	{ method: "GET", path: "/healthz/x" },
	{ method: "GET", path: "/x?a=/healthz" },
	{ method: "GET", path: "/v1/prosopo" },
	{ method: "GET", path: "/v1/prosopox" },
	{ method: "GET", path: "/x?q=/v1/prosopo" },
	{ method: "GET", path: "/v1/prosopo/unknown", headers: [["Accept-Language", "de-DE,de;q=0.9"]] },
	{ method: "GET", path: "/v1/prosopo/unknown", headers: [["X-Request-Id", "upstream-123"]] },
	{ method: "POST", path: client("captcha/image") },
	{ method: "POST", path: client("captcha/image"), headers: [user] },
	{ method: "POST", path: client("captcha/image"), headers: [["Prosopo-User", ""], siteKey] },
	{ method: "POST", path: client("captcha/image"), headers: [user, ["Prosopo-Site-Key", "not-a-key"]] },
	{ method: "POST", path: client("captcha/image"), headers: [user, ["Prosopo-Site-Key", "not-a-key"], ["Accept-Language", "de"]] },
	{ method: "POST", path: client("captcha/image?lng=es"), headers: [user, ["Prosopo-Site-Key", "not-a-key"]] },
	{ method: "POST", path: client("captcha/image"), headers: [["Prosopo-User", "nope"], siteKey] },
	{ method: "POST", path: client("captcha/image"), headers: [user, siteKey, ["Prosopo-Site-Key", SITE_KEY]] },
	{ method: "GET", path: "/V1/PROSOPO/provider/client/captcha/image" },
	{ method: "POST", path: client("captcha/image/extra") },
	{ method: "POST", path: client("events"), headers: [json], body: "{}" },
	{ method: "POST", path: client("captcha/image"), headers: [user, siteKey], compare: false },
	{ method: "POST", path: client("captcha/pow") },
	{ method: "POST", path: client("captcha/pow") },
	{ method: "POST", path: client("captcha/pow") },
	{ method: "HEAD", path: client("captcha/pow") },
	{ method: "POST", path: client("captcha/pow"), headers: [["X-Forwarded-For", "203.0.113.50"]] },
	{ method: "POST", path: client("spam/email"), headers: [json, siteKey], body: "{}", compare: false },
	{ method: "POST", path: client("spam/email"), headers: [json, siteKey], body: "{}" },
	{ method: "POST", path: client("pow/verify"), headers: [json, siteKey], body: "{}", compare: false },
	{ method: "POST", path: client("pow/verify"), headers: [json, siteKey], body: "{}" },
	{ method: "POST", path: client("pow/verify"), headers: [json, ["Prosopo-Site-Key", "other"]], body: "{}", compare: false },
	{ method: "POST", path: "/v1/prosopo/provider/admin/sitekey/register" },
	{ method: "POST", path: "/v1/prosopo/provider/admin/sitekey/register", headers: [["Authorization", "Bearer garbage"]] },
	{ method: "POST", path: "/v1/prosopo/provider/admin/sitekey/register", headers: [auth("alice")] },
	{ method: "POST", path: "/v1/prosopo/provider/admin/sitekey/register", headers: [auth("alice")] },
	{ method: "POST", path: "/v1/prosopo/provider/admin/sitekey/register", headers: [auth("alice")] },
	{ method: "POST", path: "/v1/prosopo/provider/admin/sitekey/register", headers: [auth("bob")] },
	{ method: "POST", path: "/v1/prosopo/provider/admin/sitekey/register", headers: [auth(5)] },
	{ method: "POST", path: "/v1/prosopo/provider/admin/sitekey/register", headers: [auth("5")] },
	{ method: "POST", path: "/v1/prosopo/provider/admin/sitekey/register", headers: [auth({ a: 1 })] },
	{ method: "POST", path: "/v1/prosopo/provider/admin/sitekey/register", headers: [auth({ a: 1 })] },
	{ method: "POST", path: "/v1/prosopo/provider/admin/sitekey/register", headers: [auth({ a: 1 })] },
	{ method: "POST", path: "/v1/prosopo/provider/admin/sitekeys/register", headers: [["Authorization", "Bearer {{ADMIN_JWT}}"]] },
	{ method: "GET", path: "/v1/prosopo/provider/admin/whatever", headers: [["Authorization", "Bearer {{ADMIN_JWT}}"]] },
	{ method: "GET", path: "/v1/prosopo/provider/administrator" },
	{ method: "POST", path: "/v1/prosopo/user-access-policy/rules/fetch-many", headers: [json], body: "{}" },
	{ method: "POST", path: "/v1/prosopo/user-access-policy/rules/fetch-many", headers: [json], body: "{}" },
	{ method: "POST", path: "/v1/prosopo/user-access-policy/rules/fetch-many/x" },
];

const developmentSteps: Step[] = [
	{ method: "GET", path: "/nowhere" },
	{ method: "GET", path: "/healthz/x" },
	{ method: "POST", path: client("captcha/pow") },
	{ method: "POST", path: client("captcha/pow") },
	{ method: "POST", path: client("captcha/pow") },
	{ method: "POST", path: "/v1/prosopo/provider/admin/sitekey/register", headers: [auth("alice")] },
	{ method: "POST", path: "/v1/prosopo/provider/admin/sitekey/register", headers: [auth("alice")] },
	{ method: "POST", path: "/v1/prosopo/provider/admin/sitekey/register", headers: [auth("alice")] },
];

const requestBytes = (step: Step): string => {
	const headers = [...(step.headers ?? [])];
	if (step.body !== undefined) headers.push(["Content-Length", String(Buffer.byteLength(step.body))]);
	return [`${step.method} ${step.path} HTTP/1.1`, "Host: h.example", ...headers.map(([n, v]) => `${n}: ${v}`), "Connection: close", "", step.body ?? ""].join("\r\n");
};
const send = (port: number, bytes: string): Promise<Buffer> =>
	new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		const socket = net.connect({ host: "127.0.0.1", port }, () => socket.write(Buffer.from(bytes, "latin1")));
		socket.on("data", (chunk: Buffer) => chunks.push(chunk));
		socket.on("end", () => resolve(Buffer.concat(chunks)));
		socket.on("error", reject);
	});

const BASE_ENV: Record<string, string> = {
	CADDY_DOMAIN: "pronode1.prosopo.io",
	PROSOPO_IPAPI_KEY: "k",
	PROSOPO_IPAPI_URL: "https://api.ipapi.is",
	PROSOPO_API_PORT: "0",
	PROSOPO_GET_POW_CAPTCHA_CHALLENGE_LIMIT: "2",
	PROSOPO_CHECK_SPAM_EMAIL_LIMIT: "1",
	PROSOPO_CHECK_SPAM_EMAIL_WINDOW: "1000",
	PROSOPO_VERIFY_POW_CAPTCHA_SOLUTION_LIMIT: "1",
	PROSOPO_SITE_KEY_REGISTER_LIMIT: "2",
	PROSOPO_USER_ACCESS_POLICY_RULE_FETCH_MANY_LIMIT: "1",
};

const runApp = async (defaultEnvironment: string, steps: Step[]): Promise<Json> => {
	const variables: Record<string, string> = { ...BASE_ENV, PROSOPO_DEFAULT_ENVIRONMENT: defaultEnvironment };
	Object.assign(process.env, variables);
	const config = getConfig();
	const pair = getPair(MNEMONIC);
	const env = {
		config,
		pair,
		authAccount: getPair(undefined, ADMIN),
		logger: quiet,
		ipInfoService: { isAvailable: () => false, country: () => undefined, lookup: async () => ({}) },
		getDb: () => {
			throw new Error("no db");
		},
		isReady: async () => {},
	} as unknown as ProviderEnvironment;
	const server: Server = await startProviderApi(env, false, 0);
	const port = (server.address() as AddressInfo).port;
	const exchanges: Json[] = [];
	for (const step of steps) {
		const bytes = requestBytes(step);
		const sent = bytes.replace("{{ADMIN_JWT}}", pair.jwtIssue({ expiresIn: 300 }));
		const response = await send(port, sent);
		exchanges.push({ request: Buffer.from(bytes, "latin1").toString("base64"), response: response.toString("base64"), compare: step.compare !== false });
	}
	await new Promise<void>((resolve) => server.close(() => resolve()));
	return { defaultEnvironment, variables, exchanges };
};

const apps: Json[] = [await runApp("production", productionSteps), await runApp("development", developmentSteps)];

writeFileSync(
	fileURLToPath(new URL("./pipeline-vectors.json", import.meta.url)),
	`${JSON.stringify({ mnemonic: MNEMONIC, admin: ADMIN, base64, ja4, timing, rawTls, jwtSubjects, apps })}\n`,
);
console.log(`wrote pipeline-vectors.json (${ja4.length} ja4, ${timing.length} timing, ${rawTls.length} raw TLS, ${jwtSubjects.length} JWT subjects, ${productionSteps.length + developmentSteps.length} requests)`);
process.exit(0);
