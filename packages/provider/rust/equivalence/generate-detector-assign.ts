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

// Writes detector-assign-vectors.json: the provider's real app, on a live environment (see
// live-harness.ts), assigning detector bundles: callers at several addresses over a pool of
// three bundles with its assign secret, a site with and without its client URL and asset
// origin, bodies that do not parse, and a provider whose pool is empty. Each answer's detector
// session id is random, so the Rust masks it and checks the Redis binding it names instead.
// Run on Node 24 with the live stores up.
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPair } from "@prosopo/keyring";
import { type IUserDataSlim, Tier } from "@prosopo/types";
import { startProviderApi } from "../../src/api/startProviderApi.js";
import {
	type Json,
	type Step,
	dumpDatabase,
	fakeIpapi,
	liveEnvironment,
	liveVariables,
	requestBytes,
	resetStores,
	send,
} from "./live-harness.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(
		`this generator must run on Node 24 (the production runtime), not ${process.version}`,
	);
}

process.env.NODE_ENV = "production";
Reflect.deleteProperty(process.env, "MAINTENANCE_MODE");
const DATABASE = "equivalence_detector_assign";
const CONFIGURED = getPair("//Alice");
const PLAIN = getPair("//Bob");

const poolDir = mkdtempSync(join(tmpdir(), "detector-assign-pool-"));
for (const id of ["bundle-a", "bundle-b", "bundle-c"]) {
	writeFileSync(join(poolDir, `${id}.js`), `/* detector ${id} */`);
	writeFileSync(
		join(poolDir, `${id}.json`),
		JSON.stringify({ privateKey: `pk-${id}`, innerConfig: "" }),
	);
}

await resetStores(DATABASE);
const ipapi = await fakeIpapi({});
const variables = liveVariables(DATABASE, ipapi.url, {
	PROSOPO_DETECTOR_POOL_DIR: poolDir,
});
process.env.PROSOPO_DETECTOR_POOL_DIR = poolDir;
const env = await liveEnvironment(variables);
const db = env.getDb();
await db.updateClientRecords([
	{
		account: CONFIGURED.address,
		settings: {
			domains: ["example.com"],
			captchaType: "frictionless",
			clientUrl: "https://shop.example.com",
			assetOrigin: "https://assets.example.com",
		},
		tier: Tier.Professional,
	},
	{
		account: PLAIN.address,
		settings: {
			domains: ["example.com"],
			captchaType: "frictionless",
			clientUrl: "https://plain.example.com",
		},
		tier: Tier.Professional,
	},
] as unknown as IUserDataSlim[]);

const server: Server = await startProviderApi(env, false, 0);
const port = (server.address() as AddressInfo).port;
const path = "/v1/prosopo/provider/client/detector/assign";
const assign = (ip: string, body?: unknown): Step => ({
	method: "POST",
	path,
	headers: [
		["Content-Type", "application/json"],
		["Origin", "https://example.com"],
		["Prosopo-Site-Key", CONFIGURED.address],
		["Prosopo-User", PLAIN.address],
		["X-Forwarded-For", ip],
	],
	...(body !== undefined && { body: JSON.stringify(body) }),
});
const steps: Step[] = [
	assign("203.0.113.7", { dapp: CONFIGURED.address }),
	assign("203.0.113.7", { dapp: CONFIGURED.address }),
	assign("203.0.113.8", { dapp: CONFIGURED.address }),
	assign("198.51.100.20", { dapp: PLAIN.address }),
	assign("2001:db8::1", { dapp: CONFIGURED.address }),
	assign("192.0.2.200", { dapp: "not-registered" }),
	assign("192.0.2.201", { dapp: 7 }),
	assign("192.0.2.202", {}),
	assign("192.0.2.203"),
];
const exchanges: Json[] = [];
for (const step of steps) {
	const bytes = requestBytes(step);
	const sentAt = Date.now();
	exchanges.push({
		request: bytes.toString("base64"),
		response: (await send(port, bytes)).toString("base64"),
		at: sentAt,
	});
}
const client = await db.getRedisConnection().getClient();
const bindings: Json[] = [];
for (const key of (await client.keys("*")).sort())
	if (key.includes("detector"))
		bindings.push({
			key,
			value: await client.get(key),
			ttl: await client.ttl(key),
		});
await client.quit();
const poolFiles: Record<string, string> = {};
for (const name of readdirSync(poolDir))
	poolFiles[name] = readFileSync(join(poolDir, name)).toString("base64");
const database = await dumpDatabase(DATABASE);
await new Promise<void>((resolve) => server.close(() => resolve()));
await ipapi.close();
writeFileSync(
	fileURLToPath(new URL("./detector-assign-vectors.json", import.meta.url)),
	`${JSON.stringify({ database: DATABASE, variables: { ...variables, PROSOPO_IPAPI_URL: "{{IPAPI_URL}}", PROSOPO_DETECTOR_POOL_DIR: "{{POOL_DIR}}" }, poolFiles, seed: database, exchanges, bindings })}\n`,
);
console.log(`wrote detector-assign-vectors.json (${steps.length} requests)`);
process.exit(0);
