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

// Writes block-vectors.json: the provider's real app, on a live environment (MongoDB and Redis
// Stack, see live-harness.ts), answering requests that access-policy rules block or let through,
// and the blocked sessions it stores. The Rust side restores the same Redis hashes and replays.
// Run on Node 24 with the live stores up.
import { writeFileSync } from "node:fs";
import type { AddressInfo, Server } from "node:net";
import { fileURLToPath } from "node:url";
import { ALWAYS_PASS_SITE_KEY } from "@prosopo/types";
import { type AccessRuleEntry, accessRuleInput } from "@prosopo/user-access-policy";
import { getJA4 } from "../../src/api/ja4Middleware.js";
import { startProviderApi } from "../../src/api/startProviderApi.js";
import {
	type IpapiTable,
	type Json,
	type Step,
	alpn,
	clientHello,
	dumpCollection,
	dumpRedisHashes,
	fakeIpapi,
	liveEnvironment,
	liveVariables,
	requestBytes,
	resetStores,
	send,
	sni,
} from "./live-harness.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

process.env.NODE_ENV = "production";
delete process.env.MAINTENANCE_MODE;
const DATABASE = "equivalence_block";
const SITE_A = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y";
const SITE_B = "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy";
const SITE_C = "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw";
const USER_BAD = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const HELLO = clientHello(0x0303, [0x1301, 0x1302, 0xc02b], [
	{ id: 0, data: sni("example.com") },
	{ id: 16, data: alpn(["h2"]) },
]).toString("base64");

const JA4 = (await getJA4({ "x-tls-clienthello": HELLO })).ja4PlusFingerprint;
if (JA4 === "ja4") throw new Error("the ClientHello does not parse");

const location = (country: string, code: string) => ({ country, country_code: code, state: "S", city: "C", latitude: 1.5, longitude: -2.25, timezone: "UTC" });
const asn = (number: number) => ({ asn: number, org: `AS${number} Org`, type: "isp", abuser_score: "0.0012 (Low)" });
const answer = (ip: string, code: string, number: number): Json => ({
	ip,
	is_bogon: false,
	is_mobile: false,
	is_satellite: false,
	is_crawler: false,
	is_datacenter: false,
	is_tor: false,
	is_proxy: false,
	is_vpn: false,
	is_abuser: false,
	company: { name: "Example ISP", abuser_score: "0.0034 (Low)", domain: "example.net", type: "isp" },
	asn: asn(number),
	location: location(code === "RU" ? "Russia" : "Somewhere", code),
});
const IPAPI: IpapiTable = {
	"203.0.113.7": answer("203.0.113.7", "DE", 3320),
	"203.0.113.9": answer("203.0.113.9", "RU", 12389),
	"203.0.113.10": answer("203.0.113.10", "NL", 64512),
	"203.0.113.66": answer("203.0.113.66", "US", 7922),
	"198.51.100.7": answer("198.51.100.7", "GB", 2856),
};

const rules: unknown[] = [
	{ type: "block", ip: "203.0.113.66", messageKey: "API.VPN_BLOCKED", description: "a known bad address" },
	{ type: "block", ipMask: "198.51.100.0/24", description: "cidr" },
	{ type: "block", countryCode: "RU", messageKey: "API.SPAM_EMAIL_DOMAIN" },
	{ type: "block", asn: 64512 },
	{ type: "restrict", ip: "203.0.113.20", captchaType: "pow", powDifficulty: 5 },
	{ type: "block", ip: "203.0.113.21", deferToVerify: true },
	{ type: "block", ip: "203.0.113.22", excludedClientIds: [SITE_A] },
	{ type: "block", ip: "203.0.113.23" },
	{ type: "restrict", ip: "203.0.113.23", clientId: SITE_B, captchaType: "image", solvedImagesCount: 3 },
	{ type: "block", userId: USER_BAD, clientId: SITE_A },
	{ type: "block", ja4Hash: JA4 },
	{ type: "block", browser: "firefox", clientId: SITE_B },
	{ type: "block", headerMatch: "1", headerName: "x-bot", headerValue: "evil", headerOperator: "contains" },
	{ type: "block", userAgent: "BadBot/1.0" },
	{ type: "restrict", os: "linux", captchaType: "puzzle" },
];

const json: [string, string] = ["Content-Type", "application/json"];
const from = (ip: string): [string, string] => ["X-Forwarded-For", ip];
const post = (headers: [string, string][], body: Record<string, string> = {}): Step => ({
	method: "POST",
	path: "/v1/prosopo/provider/x",
	headers: [json, ...headers],
	body: JSON.stringify(body),
});
const FIREFOX = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0";

const steps: Step[] = [
	post([]),
	post([from("203.0.113.7")]),
	post([from("203.0.113.66")]),
	post([from("203.0.113.66"), ["Accept-Language", "de"]]),
	post([from("198.51.100.7")]),
	post([from("198.51.101.7")]),
	post([from("203.0.113.9")]),
	post([from("203.0.113.10")]),
	post([from("203.0.113.20")]),
	post([from("203.0.113.21")]),
	post([from("203.0.113.22")], { dapp: SITE_A }),
	post([from("203.0.113.22")], { dapp: SITE_B }),
	post([from("203.0.113.22")]),
	post([from("203.0.113.23")], { dapp: SITE_B }),
	post([from("203.0.113.23")], { dapp: SITE_C }),
	post([], { user: USER_BAD, dapp: SITE_A }),
	post([], { user: USER_BAD, dapp: SITE_C }),
	post([["Prosopo-User", USER_BAD], ["Prosopo-Site-Key", SITE_A]]),
	post([["X-TLS-ClientHello", HELLO]]),
	post([["User-Agent", FIREFOX]], { dapp: SITE_B }),
	post([["User-Agent", FIREFOX]]),
	post([["X-Bot", "a very evil bot"]]),
	post([["X-Bot", "nice"]]),
	post([["User-Agent", "BadBot/1.0"]]),
	post([from("not-an-ip")]),
	post([from("2001:db8::1")]),
	post([from("203.0.113.66"), ["Prosopo-Site-Key", ALWAYS_PASS_SITE_KEY]]),
	{ method: "GET", path: "/x", headers: [from("203.0.113.66")] },
	{ method: "GET", path: "/v1/prosopo/provider/x?m=1", headers: [from("203.0.113.66")] },
	{ method: "POST", path: "/v1/prosopo/provider/x", headers: [["Content-Type", "text/plain"], from("203.0.113.22")], body: "dapp" },
	{ method: "OPTIONS", path: "/v1/prosopo/provider/x", headers: [from("203.0.113.66")] },
];

await resetStores(DATABASE);
const ipapi = await fakeIpapi(IPAPI);
const variables = liveVariables(DATABASE, ipapi.url);
const env = await liveEnvironment(variables);
const entries: AccessRuleEntry[] = rules.map((rule) => ({ rule: accessRuleInput.parse(rule) }));
await env.getDb().getUserAccessRulesStorage().insertRules(entries);
const redis = await dumpRedisHashes();

const server: Server = await startProviderApi(env, false, 0);
const port = (server.address() as AddressInfo).port;
const exchanges: Json[] = [];
for (const step of steps) {
	const bytes = requestBytes(step);
	const response = await send(port, bytes);
	exchanges.push({ request: bytes.toString("base64"), response: response.toString("base64"), compare: step.compare !== false });
}
await new Promise<void>((resolve) => setTimeout(resolve, 1000));
const sessions = await dumpCollection(DATABASE, "sessions");
await new Promise<void>((resolve) => server.close(() => resolve()));
await ipapi.close();

writeFileSync(
	fileURLToPath(new URL("./block-vectors.json", import.meta.url)),
	`${JSON.stringify({ database: DATABASE, variables: { ...variables, PROSOPO_IPAPI_URL: "{{IPAPI_URL}}" }, ipapi: IPAPI, redis, exchanges, sessions })}\n`,
);
console.log(`wrote block-vectors.json (${(redis as Json[]).length} Redis hashes, ${steps.length} requests, ${(sessions as Json[]).length} blocked sessions)`);
process.exit(0);
