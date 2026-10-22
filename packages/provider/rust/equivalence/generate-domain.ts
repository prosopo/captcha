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

// Writes domain-vectors.json: the provider's real app, on a live environment (see
// live-harness.ts), checking the origins of client requests against seeded site settings.
// Run on Node 24 with the live stores up.
import { writeFileSync } from "node:fs";
import type { AddressInfo, Server } from "node:net";
import { fileURLToPath } from "node:url";
import { ALWAYS_PASS_SITE_KEY, type IUserDataSlim, Tier } from "@prosopo/types";
import { startProviderApi } from "../../src/api/startProviderApi.js";
import { type Json, type Step, dumpDatabase, fakeIpapi, liveEnvironment, liveVariables, requestBytes, resetStores, send } from "./live-harness.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

process.env.NODE_ENV = "production";
delete process.env.MAINTENANCE_MODE;
const DATABASE = "equivalence_domain";

const SITES: Record<string, { key: string; domains?: string[] }> = {
	exact: { key: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y", domains: ["example.com"] },
	any: { key: "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy", domains: ["*"] },
	sub: { key: "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw", domains: ["*.example.org"] },
	glob: { key: "5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL", domains: ["app-*.example.net", "other.test"] },
	local: { key: "5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY", domains: ["localhost"] },
	padded: { key: "5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc", domains: ["  EXAMPLE.COM  ", "example.com/path"] },
	none: { key: "5Ck5SLSHYac6WFt5UZRSsdJjwmpSZq85fd5TRNAdZQVzEAPT", domains: [] },
	unset: { key: "5HKPmK9GYtE1PSLsS1qiYU9xQ9Si1NcEhdeCq9sw5bqu4ns8" },
	spacedAny: { key: "5Dfis6XL8J2P6JHUnUtArnFWndn62SydeP8ee8sG2ky9nfm9", domains: [" * "] },
	capsGlob: { key: "5FCfAonRZgTFrTd9HREEyeJjDpT397KMzizE6T3DvebLFE7n", domains: ["APP-*.EXAMPLE.CO", "  LOCALHOST "] },
};
const UNREGISTERED = "5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu";

const clientPath = "/v1/prosopo/provider/client/unknown";
const json: [string, string] = ["Content-Type", "application/json"];
const site = (key: string): [string, string] => ["Prosopo-Site-Key", key];
const origin = (value: string): [string, string] => ["Origin", value];
const post = (headers: [string, string][]): Step => ({ method: "POST", path: clientPath, headers: [json, ...headers], body: "{}" });

const steps: Step[] = [
	post([]),
	post([site("not-a-key")]),
	post([site(UNREGISTERED), origin("https://example.com")]),
	post([site(ALWAYS_PASS_SITE_KEY)]),
	post([site(SITES.unset.key), origin("https://example.com")]),
	post([site(SITES.unset.key), origin("https://example.com"), ["Host", "other.example"]]),
	post([site(SITES.none.key), origin("https://example.com")]),
	post([site(SITES.exact.key)]),
	post([site(SITES.exact.key), origin("https://example.com")]),
	post([site(SITES.exact.key), origin("https://EXAMPLE.com:8443")]),
	post([site(SITES.exact.key), origin("https://www.example.com")]),
	post([site(SITES.exact.key), origin("https://sub.example.com")]),
	post([site(SITES.exact.key), origin("https://notexample.com")]),
	post([site(SITES.exact.key), origin("https://example.com.")]),
	post([site(SITES.exact.key), origin("https://example-com.translate.goog")]),
	post([site(SITES.exact.key), origin("https://evil-com.translate.goog")]),
	post([site(SITES.exact.key), origin("null")]),
	post([site(SITES.exact.key), origin("https://user@example.com")]),
	post([site(SITES.exact.key), origin("Accept-Language-test"), ["Accept-Language", "de"]]),
	post([site(SITES.any.key), origin("https://anything.at.all")]),
	post([site(SITES.any.key), origin("null")]),
	post([site(SITES.sub.key), origin("https://example.org")]),
	post([site(SITES.sub.key), origin("https://a.b.example.org")]),
	post([site(SITES.sub.key), origin("https://example.org.evil.com")]),
	post([site(SITES.glob.key), origin("https://app-1.example.net")]),
	post([site(SITES.glob.key), origin("https://app.example.net")]),
	post([site(SITES.glob.key), origin("https://APP-X.example.net")]),
	post([site(SITES.glob.key), origin("https://other.test")]),
	post([site(SITES.local.key), origin("http://localhost:3000")]),
	post([site(SITES.local.key), origin("http://127.0.0.1:3000")]),
	post([site(SITES.padded.key), origin("https://example.com")]),
	post([site(SITES.padded.key), origin("https://m.example.com")]),
	post([site(SITES.spacedAny.key), origin("https://anything.at.all")]),
	post([site(SITES.capsGlob.key), origin("https://app-1.example.co")]),
	post([site(SITES.capsGlob.key), origin("http://localhost:8080")]),
	{ method: "GET", path: "/v1/prosopo/provider/client", headers: [site(SITES.exact.key), origin("https://bad.com")] },
	{ method: "GET", path: "/v1/prosopo/provider/clientx", headers: [site(SITES.exact.key), origin("https://bad.com")] },
	{ method: "GET", path: "/V1/prosopo/provider/CLIENT/unknown", headers: [site(SITES.exact.key), origin("https://bad.com")] },
];

await resetStores(DATABASE);
const ipapi = await fakeIpapi({});
const variables = liveVariables(DATABASE, ipapi.url);
const env = await liveEnvironment(variables);
const records = Object.values(SITES).map(
	(entry): IUserDataSlim => ({ account: entry.key, settings: { ...(entry.domains && { domains: entry.domains }) }, tier: Tier.Free }) as unknown as IUserDataSlim,
);
await env.getDb().updateClientRecords(records);
const database = await dumpDatabase(DATABASE);

const server: Server = await startProviderApi(env, false, 0);
const port = (server.address() as AddressInfo).port;
const exchanges: Json[] = [];
for (const step of steps) {
	const bytes = requestBytes(step);
	const response = await send(port, bytes);
	exchanges.push({ request: bytes.toString("base64"), response: response.toString("base64"), compare: step.compare !== false });
}
await new Promise<void>((resolve) => server.close(() => resolve()));
await ipapi.close();

writeFileSync(
	fileURLToPath(new URL("./domain-vectors.json", import.meta.url)),
	`${JSON.stringify({ database: DATABASE, variables: { ...variables, PROSOPO_IPAPI_URL: "{{IPAPI_URL}}" }, ipapi: {}, seed: database, exchanges })}\n`,
);
console.log(`wrote domain-vectors.json (${Object.keys(database).join(", ")} seeded, ${steps.length} requests)`);
process.exit(0);
