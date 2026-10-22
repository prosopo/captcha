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

// Writes public-vectors.json: the public router as the provider's express app serves it, the
// raw bytes of each request and of each answer, for a spread of app settings; and the healthz
// geo steering config and decisions. Run on Node 24.
import { writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { deflateSync, gzipSync } from "node:zlib";
import type { ProviderEnvironment } from "@prosopo/env";
import { getLogger } from "@prosopo/logger";
import type { IIpInfoService } from "@prosopo/types-env";
import { version } from "@prosopo/util";
import cors from "cors";
import express from "express";
import {
	HealthzGeoRouter,
	TargetHealthMonitor,
	readHealthzGeoConfig,
	resetHealthzGeoRouter,
} from "../../src/api/healthzGeo.js";
import { publicRouter } from "../../src/api/public.js";
import { providerCorsOptions } from "../../src/api/startProviderApi.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

// Production providers run with NODE_ENV=production (the ansible inventory), which is what
// decides whether express's error pages carry a stack trace.
process.env.NODE_ENV = "production";
const quiet = getLogger("error", "equivalence");

interface RedisStatus {
	ready: boolean;
	awaitingMs: number;
}

interface AppSettings {
	name: string;
	host: string;
	env: Record<string, string>;
	ipInfoAvailable: boolean;
	countries: Record<string, string>;
	healthyHosts: string[];
	db: "none" | "noRedis" | { general: RedisStatus; uap: RedisStatus };
}

const GEO_ROUTES = JSON.stringify({ de: "node-de.example.com", FR: "node-fr.example.com", gb: "pronode1.prosopo.io", us: "node-us.example.com" });
const COUNTRIES: Record<string, string> = {
	"203.0.113.7": "DE",
	"203.0.113.8": "fr",
	"203.0.113.9": "GB",
	"203.0.113.10": "US",
	"203.0.113.11": "JP",
	"::ffff:127.0.0.1": "DE",
	"2001:db8::1": "FR",
};

const settings: AppSettings[] = [
	{
		name: "plain",
		host: "pronode1.prosopo.io",
		env: {},
		ipInfoAvailable: true,
		countries: COUNTRIES,
		healthyHosts: [],
		db: { general: { ready: true, awaitingMs: 1234 }, uap: { ready: false, awaitingMs: 1001 } },
	},
	{
		name: "no host configured",
		host: "",
		env: {},
		ipInfoAvailable: true,
		countries: COUNTRIES,
		healthyHosts: [],
		db: { general: { ready: false, awaitingMs: 0 }, uap: { ready: true, awaitingMs: 999 } },
	},
	{
		name: "no database",
		host: "pronode2.prosopo.io",
		env: {},
		ipInfoAvailable: true,
		countries: COUNTRIES,
		healthyHosts: [],
		db: "none",
	},
	{
		name: "database without redis",
		host: "pronode2.prosopo.io",
		env: {},
		ipInfoAvailable: true,
		countries: COUNTRIES,
		healthyHosts: [],
		db: "noRedis",
	},
	{
		name: "geo steering",
		host: "pronode1.prosopo.io",
		env: { PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: GEO_ROUTES },
		ipInfoAvailable: true,
		countries: COUNTRIES,
		healthyHosts: ["node-de.example.com", "node-us.example.com"],
		db: { general: { ready: true, awaitingMs: 1 }, uap: { ready: true, awaitingMs: 1000 } },
	},
	{
		name: "geo steering without ip info",
		host: "pronode1.prosopo.io",
		env: { PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: GEO_ROUTES },
		ipInfoAvailable: false,
		countries: COUNTRIES,
		healthyHosts: ["node-de.example.com"],
		db: { general: { ready: true, awaitingMs: 0 }, uap: { ready: true, awaitingMs: 0 } },
	},
	{
		name: "geo steering flag with a bad map",
		host: "pronode1.prosopo.io",
		env: { PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: '{"de":"https://x"}' },
		ipInfoAvailable: true,
		countries: COUNTRIES,
		healthyHosts: ["node-de.example.com"],
		db: { general: { ready: true, awaitingMs: 0 }, uap: { ready: true, awaitingMs: 0 } },
	},
];

const HEALTHZ = "/healthz";
const DETAILS = "/v1/prosopo/provider/public/details";

const request = (method: string, path: string, headers: [string, string][] = [], body = ""): Buffer => {
	const head = [`${method} ${path} HTTP/1.1`, ...headers.map(([name, value]) => `${name}: ${value}`), "Connection: close", "", ""].join("\r\n");
	return Buffer.concat([Buffer.from(head, "latin1"), Buffer.from(body, "latin1")]);
};
const withBody = (method: string, path: string, headers: [string, string][], body: Buffer): Buffer => {
	const head = [`${method} ${path} HTTP/1.1`, ...headers, ["Content-Length", String(body.length)]].map((line) => (Array.isArray(line) ? `${line[0]}: ${line[1]}` : line));
	return Buffer.concat([Buffer.from([...head, "Connection: close", "", ""].join("\r\n"), "latin1"), body]);
};
const host = (value: string): [string, string] => ["Host", value];
const xff = (value: string): [string, string] => ["X-Forwarded-For", value];
const xfh = (value: string): [string, string] => ["X-Forwarded-Host", value];
const json = (text: string): [string, string] => ["Content-Type", "application/json"];

const assetQuery = (query: string): Buffer => request("GET", `/some/page?${query}`, [host("pronode1.prosopo.io")]);
const JSON_LIMIT = 1024 * 1024;
const big = Buffer.alloc(JSON_LIMIT + 1, 0x20);
big[0] = 0x7b;
big[big.length - 1] = 0x7d;

const requests: Buffer[] = [
	request("GET", HEALTHZ, [host("pronode1.prosopo.io")]),
	request("GET", HEALTHZ, [host("other.example:8443")]),
	request("GET", HEALTHZ, [host("[::1]:9229")]),
	request("GET", HEALTHZ, [host("[::1]")]),
	request("GET", HEALTHZ, [host("a:b:c")]),
	request("GET", HEALTHZ, [host("cafÃ©.example")]),
	request("GET", HEALTHZ, []),
	request("GET", HEALTHZ, [host("first.example"), host("second.example")]),
	request("GET", HEALTHZ, [host("h.example"), xfh("fwd.example:8080")]),
	request("GET", HEALTHZ, [host("h.example"), xfh("one.example , two.example")]),
	request("GET", HEALTHZ, [host("h.example"), xfh("")]),
	request("GET", HEALTHZ, [host("h.example"), xfh("x.example"), xfh("y.example")]),
	request("GET", `${HEALTHZ}?m=n&u=https://evil.example/`, [host("h.example")]),
	request("GET", `${HEALTHZ}/`, [host("h.example")]),
	request("GET", "/HEALTHZ", [host("h.example")]),
	request("GET", "//healthz", [host("h.example")]),
	request("HEAD", HEALTHZ, [host("h.example")]),
	request("POST", HEALTHZ, [host("h.example")]),
	request("OPTIONS", HEALTHZ, [host("h.example"), ["Origin", "https://site.example"], ["Access-Control-Request-Method", "GET"]]),
	request("OPTIONS", "/anything", [host("h.example")]),
	request("GET", HEALTHZ, [host("h.example"), ["Origin", "https://site.example"]]),
	request("GET", HEALTHZ, [host("h.example"), ["If-None-Match", 'W/"nope"']]),
	request("GET", HEALTHZ, [host("h.example"), xff("203.0.113.7")]),
	request("GET", HEALTHZ, [host("h.example"), xff("203.0.113.8")]),
	request("GET", HEALTHZ, [host("h.example"), xff("203.0.113.9")]),
	request("GET", HEALTHZ, [host("h.example"), xff("203.0.113.10")]),
	request("GET", HEALTHZ, [host("h.example"), xff("203.0.113.11")]),
	request("GET", HEALTHZ, [host("h.example"), xff("203.0.113.10, 203.0.113.7")]),
	request("GET", HEALTHZ, [host("h.example"), xff("203.0.113.7,203.0.113.10")]),
	request("GET", HEALTHZ, [host("h.example"), xff("203.0.113.10"), xff("203.0.113.7")]),
	request("GET", HEALTHZ, [host("h.example"), xff(" , 203.0.113.7 ,, ")]),
	request("GET", HEALTHZ, [host("h.example"), xff("2001:db8::1")]),
	request("GET", HEALTHZ, [host("h.example"), xff("not-an-ip")]),
	request("GET", HEALTHZ, [host("h.example"), xff("")]),
	request("GET", HEALTHZ, [host("h.example"), xff("10.0.0.1")]),
	request("GET", HEALTHZ, [xff("203.0.113.7")]),
	request("HEAD", HEALTHZ, [host("h.example"), xff("203.0.113.7")]),
	request("GET", DETAILS, [host("pronode1.prosopo.io")]),
	request("GET", DETAILS, [host("other.example:1"), xfh("fwd.example")]),
	request("GET", `${DETAILS}?x=1`, [host("h.example")]),
	request("HEAD", DETAILS, [host("h.example")]),
	request("POST", DETAILS, [host("h.example")]),
	request("GET", "/v1/prosopo/provider/public/nothing", [host("h.example")]),
	request("GET", "/", [host("h.example")]),
	request("GET", "/robots.txt", [host("h.example")]),
	request("GET", "/a%20b/<script>", [host("h.example")]),
	request("DELETE", "/x", [host("h.example")]),
	withBody("GET", HEALTHZ, [host("h.example"), json("")], Buffer.from('{"a":1}')),
	withBody("GET", HEALTHZ, [host("h.example"), json("")], Buffer.from("")),
	withBody("GET", HEALTHZ, [host("h.example"), json("")], Buffer.from("   ")),
	withBody("GET", HEALTHZ, [host("h.example"), json("")], Buffer.from("[1,2]")),
	withBody("GET", HEALTHZ, [host("h.example"), ["Content-Type", "text/plain"]], Buffer.from("{bad")),
	withBody("GET", HEALTHZ, [host("h.example"), ["Content-Type", "application/vnd.api+json"]], Buffer.from("{}")),
	withBody("GET", HEALTHZ, [host("h.example"), ["Content-Type", "application/json; charset=latin1"]], Buffer.from("{}")),
	withBody("GET", HEALTHZ, [host("h.example"), ["Content-Type", "application/json; charset=UTF-8"]], Buffer.from("{}")),
	withBody("GET", HEALTHZ, [host("h.example"), json(""), ["Content-Encoding", "gzip"]], gzipSync(Buffer.from('{"z":true}'))),
	withBody("GET", HEALTHZ, [host("h.example"), json(""), ["Content-Encoding", "identity"]], Buffer.from("{}")),
	withBody("GET", HEALTHZ, [host("h.example"), json(""), ["Content-Encoding", "compress"]], Buffer.from("{}")),
	withBody("GET", DETAILS, [host("h.example"), json("")], big),
	withBody("GET", "/elsewhere", [host("h.example"), json("")], Buffer.from("{}")),
	withBody("GET", HEALTHZ, [host("h.example"), json("")], Buffer.from('\ufeff{"bom":1}')),
	withBody("GET", HEALTHZ, [host("h.example"), json(""), ["Content-Encoding", "deflate"]], deflateSync(Buffer.from('{"d":1}'))),
	withBody("GET", HEALTHZ, [host("h.example"), json(""), ["Content-Encoding", "GZIP"]], gzipSync(Buffer.from('{"d":1}'))),
	withBody("GET", HEALTHZ, [host("h.example"), json(""), ["Content-Encoding", "gzip"]], Buffer.from("not gzip")),
	withBody("GET", HEALTHZ, [host("h.example"), json(""), ["Content-Encoding", "gzip"]], gzipSync(Buffer.alloc(JSON_LIMIT + 1, 0x20))),
	withBody("GET", HEALTHZ, [host("h.example"), ["Content-Type", "application/json; charset=utf-16le"]], Buffer.from('{"w":1}', "utf16le")),
	withBody("GET", HEALTHZ, [host("h.example"), ["Content-Type", "application/json; charset=utf-8x"]], Buffer.from("{}")),
	withBody("GET", HEALTHZ, [host("h.example"), json("")], Buffer.from('{"a":1,"a":2}')),
	withBody("GET", HEALTHZ, [host("h.example"), json("")], Buffer.from("[1,]")),
	withBody("GET", HEALTHZ, [host("h.example"), json("")], Buffer.from([0x7b, 0xff, 0x7d])),
	withBody("GET", HEALTHZ, [host("h.example"), json("")], Buffer.from(`[${"[".repeat(126)}${"]".repeat(126)}]`)),
	// Read by the TS, refused by the Rust (body.rs says why).
	withBody("GET", HEALTHZ, [host("h.example"), json("")], Buffer.from('{"a":"\\ud800"}')),
	withBody("GET", HEALTHZ, [host("h.example"), json("")], Buffer.from('{"a":1e400}')),
	withBody("GET", HEALTHZ, [host("h.example"), json("")], Buffer.from(`${"[".repeat(200)}${"]".repeat(200)}`)),
	withBody("GET", HEALTHZ, [host("h.example"), ["Content-Type", "application/json; charset=utf-7"]], Buffer.from("{}")),
	assetQuery("m=n&u=https://example.com/a?b=c&i=abc123"),
	assetQuery("m=n&u=http://example.com"),
	assetQuery("m=n&u=https%3A%2F%2Fexample.com%2F%3Cx%3E&i=ID"),
	assetQuery("m=n&u=https://exa%20mple.com"),
	assetQuery("m=n&u=https://EXAMPLE.com:443/./a/../b?q=%zz#frag"),
	assetQuery("m=n&u=https://example.com/</script><script>alert(1)</script>"),
	assetQuery("m=n&u=https://example.com/%20&i=" + "a".repeat(64)),
	assetQuery("m=n&u=https://example.com&i=" + "a".repeat(65)),
	assetQuery("m=n&u=https://example.com&i=a-b"),
	assetQuery("m=n&u=https://example.com&i=a&i=b"),
	assetQuery("m=n&u=ftp://example.com"),
	assetQuery("m=n&u=javascript:alert(1)"),
	assetQuery("m=n&u="),
	assetQuery("m=n"),
	assetQuery("m=x&u=https://example.com"),
	assetQuery("m=n&m=n&u=https://example.com"),
	assetQuery("m[]=n&u=https://example.com"),
	assetQuery("[m]=n&u=https://example.com"),
	assetQuery("%6D=n&u=https://example.com"),
	assetQuery("[m]x=n&u=https://example.com"),
	assetQuery("[m][x]=n&u=https://example.com"),
	assetQuery("m[x=n&u=https://example.com"),
	assetQuery("m=n&[u]=https://a.example&u=https://b.example"),
	assetQuery("m=n&u=https://a.example&i=%41%42"),
	assetQuery("m=n&u=https://a.example&i=%E2%82%AC"),
	assetQuery("m=%6E&u=https%3a%2f%2fa.example"),
	assetQuery("m=n&u=https://a.example&u=https://b.example"),
	assetQuery("m=n&u[0]=https://a.example"),
	assetQuery("m=n&u%5B%5D=https://a.example"),
	assetQuery("m=n&u=https://a.example/%E0%A4%A"),
	assetQuery("m=n&u=https://a.example/+plus+"),
	assetQuery("m=n&u=https://xn--nxasmq6b.example/"),
	assetQuery("m=n&u=https://Ã©.example/"),
	assetQuery("m=n&u=https://[::1]:8080/x"),
	assetQuery("m=n&u=HTTPS://example.com"),
	assetQuery("m=n&u=https:example.com"),
	assetQuery("m=n&u=https://user:pass@example.com/"),
	assetQuery("m=n&&u=https://example.com&"),
	assetQuery("u=https://example.com&m=n&i=Z9"),
	request("HEAD", "/p?m=n&u=https://example.com", [host("h.example")]),
	request("GET", "/p?m=n&u=https://example.com", [host("h.example"), ["If-None-Match", "*"]]),
	request("POST", "/p?m=n&u=https://example.com", [host("h.example")]),
];

interface Exchange {
	request: string;
	response: string;
}

const send = (port: number, bytes: Buffer): Promise<Buffer> =>
	new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		// Not half-closed: Node aborts a request whose client has sent FIN before the answer.
		const socket = net.connect({ host: "127.0.0.1", port }, () => socket.write(bytes));
		socket.on("data", (chunk: Buffer) => chunks.push(chunk));
		socket.on("end", () => resolve(Buffer.concat(chunks)));
		socket.on("error", reject);
	});

const fakeDb = (db: AppSettings["db"]) => {
	if (db === "none") return undefined;
	const connection = (status: RedisStatus) => ({ isReady: () => status.ready, getAwaitingTimeMs: () => status.awaitingMs });
	return {
		getRedisConnection: () => {
			if (db === "noRedis") throw new Error("no redis");
			return connection(db.general);
		},
		getRedisAccessRulesConnection: () => {
			if (db === "noRedis") throw new Error("no redis");
			return connection(db.uap);
		},
	};
};

const realFetch = globalThis.fetch;
const runApp = async (app: AppSettings): Promise<Exchange[]> => {
	resetHealthzGeoRouter();
	for (const key of Object.keys(process.env)) if (key.startsWith("PROSOPO_HEALTHZ_GEO_")) delete process.env[key];
	Object.assign(process.env, app.env);
	globalThis.fetch = (async (input: string | URL | Request): Promise<Response> => {
		const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
		if (app.healthyHosts.includes(url.hostname)) return new Response("{}", { status: 200 });
		throw new TypeError("fetch failed");
	}) as typeof fetch;
	const ipInfoService = {
		isAvailable: () => app.ipInfoAvailable,
		country: (ip: string) => app.countries[ip],
	} as unknown as IIpInfoService;
	const db = fakeDb(app.db);
	const env = {
		config: { host: app.host },
		logger: quiet,
		ipInfoService,
		getDb: () => {
			if (!db) throw new Error("db not setup! Please call isReady() first");
			return db;
		},
	} as unknown as ProviderEnvironment;

	const expressApp = express();
	expressApp.set("trust proxy", 1);
	expressApp.use(cors(providerCorsOptions));
	expressApp.use(express.json({ limit: "1mb" }));
	expressApp.use(publicRouter(env));
	const server = expressApp.listen(0, "::");
	await new Promise<void>((resolve) => server.once("listening", () => resolve()));
	await new Promise<void>((resolve) => setTimeout(resolve, 100));
	const port = (server.address() as AddressInfo).port;
	const exchanges: Exchange[] = [];
	for (const bytes of requests) {
		const response = await send(port, bytes);
		exchanges.push({ request: bytes.toString("base64"), response: response.toString("base64") });
	}
	await new Promise<void>((resolve) => server.close(() => resolve()));
	resetHealthzGeoRouter();
	globalThis.fetch = realFetch;
	return exchanges;
};

// ---------------------------------------------------------------- geo config and decisions

const GEO_ENVS: Record<string, string>[] = [
	{},
	{ PROSOPO_HEALTHZ_GEO_STEERING: "true" },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: GEO_ROUTES },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "TRUE", PROSOPO_HEALTHZ_GEO_ROUTES: GEO_ROUTES },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "1", PROSOPO_HEALTHZ_GEO_ROUTES: GEO_ROUTES },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: "{}" },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: "   " },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: "not json" },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: "[]" },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: "null" },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: '{"deu":"a.example"}' },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: '{"d1":"a.example"}' },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: '{"de":"a.example:80"}' },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: '{"de":"-a.example"}' },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: '{"de":"a-.example"}' },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: '{"de":"A.Example.COM"}' },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: '{"de":""}' },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: `{"de":"${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}"}` },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: `{"de":"${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(62)}"}` },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: '{"de":"x.example","DE":"y.example"}' },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: '{"de":"x.example","fr":"x.example"}' },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: '{"de":"x.example","fr":5}' },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: '{"__proto__":"x.example"}' },
	{ PROSOPO_HEALTHZ_GEO_STEERING: "true", PROSOPO_HEALTHZ_GEO_ROUTES: '{"de":"x.example"}', PROSOPO_HEALTHZ_GEO_PROBE_INTERVAL_MS: "500" },
	{ PROSOPO_HEALTHZ_GEO_ROUTES: GEO_ROUTES, PROSOPO_HEALTHZ_GEO_PROBE_INTERVAL_MS: "45000", PROSOPO_HEALTHZ_GEO_PROBE_TIMEOUT_MS: "750" },
	{ PROSOPO_HEALTHZ_GEO_PROBE_INTERVAL_MS: "0", PROSOPO_HEALTHZ_GEO_PROBE_TIMEOUT_MS: "-5" },
	{ PROSOPO_HEALTHZ_GEO_PROBE_INTERVAL_MS: "12abc", PROSOPO_HEALTHZ_GEO_PROBE_TIMEOUT_MS: "abc" },
	{ PROSOPO_HEALTHZ_GEO_PROBE_INTERVAL_MS: "", PROSOPO_HEALTHZ_GEO_PROBE_TIMEOUT_MS: "0x10" },
	{ PROSOPO_HEALTHZ_GEO_PROBE_INTERVAL_MS: "1e3", PROSOPO_HEALTHZ_GEO_PROBE_TIMEOUT_MS: " 2500" },
	{ PROSOPO_HEALTHZ_GEO_PROBE_INTERVAL_MS: "9".repeat(400) },
];

const geoConfigs: Json[] = GEO_ENVS.map((env) => {
	const config = readHealthzGeoConfig(env);
	return {
		env,
		enabled: config.enabled,
		routes: [...config.routes.entries()],
		probeIntervalMs: Number.isFinite(config.probeIntervalMs) ? config.probeIntervalMs : String(config.probeIntervalMs),
		probeTimeoutMs: config.probeTimeoutMs,
	};
});

const decisionIps: (string | undefined)[] = [undefined, "", "203.0.113.7", "203.0.113.8", "203.0.113.9", "203.0.113.10", "203.0.113.11", "2001:db8::1", "198.51.100.1"];
const decisions: Json[] = [];
for (const env of [GEO_ENVS[0], GEO_ENVS[2], GEO_ENVS[20]] as Record<string, string>[]) {
	for (const available of [true, false]) {
		for (const healthy of [[], ["node-de.example.com"], ["node-de.example.com", "node-fr.example.com", "node-us.example.com", "x.example"]]) {
			const config = readHealthzGeoConfig(env);
			const monitor = new TargetHealthMonitor({
				hosts: [...new Set(config.routes.values())],
				intervalMs: config.probeIntervalMs,
				timeoutMs: config.probeTimeoutMs,
				probe: async (target: string) => healthy.includes(target),
			});
			await monitor.pollAll();
			const ipInfoService = {
				isAvailable: () => available,
				country: (ip: string) => COUNTRIES[ip],
			} as unknown as IIpInfoService;
			const router = new HealthzGeoRouter(config, { ipInfoService }, monitor);
			for (const ownHost of ["pronode1.prosopo.io", "node-de.example.com"]) {
				for (const ip of decisionIps) {
					const decision = router.resolveHost(ip, ownHost);
					decisions.push({ env, available, healthy, ownHost, ip: ip ?? null, host: decision.host, outcome: decision.outcome });
				}
			}
		}
	}
}

const apps: Json[] = [];
for (const app of settings) {
	apps.push({ ...app, db: app.db as unknown as Json, exchanges: (await runApp(app)) as unknown as Json });
}

writeFileSync(
	fileURLToPath(new URL("./public-vectors.json", import.meta.url)),
	`${JSON.stringify({ version, countries: COUNTRIES, apps, geoConfigs, decisions })}\n`,
);
console.log(`wrote public-vectors.json (${apps.length} apps × ${requests.length} requests, ${geoConfigs.length} geo configs, ${decisions.length} decisions)`);
process.exit(0);
