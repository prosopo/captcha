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

// Writes pool-replace-vectors.json: the provider's real app, on a live environment (see
// live-harness.ts), taking detector pool pushes on the admin route: with and without an admin
// token, a body the schema refuses, and bodies over and under the default 1 MB limit, each
// followed by an assignment that shows which pool is live, and the pool directory as the pushes
// left it. `{{ADMIN_JWT}}` stands for a token freshly issued by the provider's pair. Run on
// Node 24 with the live stores up.
import { randomBytes } from "node:crypto";
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
const DATABASE = "equivalence_pool_replace";
const SITE = getPair("//Alice");

const poolDir = mkdtempSync(join(tmpdir(), "pool-replace-"));
writeFileSync(join(poolDir, "old.js"), "/* detector old */");
writeFileSync(
	join(poolDir, "old.json"),
	JSON.stringify({ privateKey: "pk-old", innerConfig: "" }),
);
writeFileSync(join(poolDir, ".assign-secret"), randomBytes(32), {
	mode: 0o600,
});
const readPool = (): Record<string, string> => {
	const files: Record<string, string> = {};
	for (const name of readdirSync(poolDir).sort())
		files[name] = readFileSync(join(poolDir, name)).toString("base64");
	return files;
};
const poolBefore = readPool();

await resetStores(DATABASE);
const ipapi = await fakeIpapi({});
const variables = liveVariables(DATABASE, ipapi.url, {
	PROSOPO_DETECTOR_POOL_DIR: poolDir,
});
process.env.PROSOPO_DETECTOR_POOL_DIR = poolDir;
const env = await liveEnvironment(variables);
await env.getDb().updateClientRecords([
	{
		account: SITE.address,
		settings: { domains: ["example.com"], captchaType: "frictionless" },
		tier: Tier.Professional,
	},
] as unknown as IUserDataSlim[]);
const pair = env.pair;
if (!pair) throw new Error("no provider pair");

const server: Server = await startProviderApi(env, false, 0);
const port = (server.address() as AddressInfo).port;
const replacePath = "/v1/prosopo/provider/admin/detector/pool/replace";
const json: [string, string] = ["Content-Type", "application/json"];
const auth: [string, string] = ["Authorization", "Bearer {{ADMIN_JWT}}"];
const push = (body: unknown, withToken = true): Step => ({
	method: "POST",
	path: replacePath,
	headers: [json, ...(withToken ? [auth] : [])],
	body: JSON.stringify(body),
});
const assign: Step = {
	method: "POST",
	path: "/v1/prosopo/provider/client/detector/assign",
	headers: [
		json,
		["Origin", "https://example.com"],
		["Prosopo-Site-Key", SITE.address],
		["Prosopo-User", SITE.address],
		["X-Forwarded-For", "203.0.113.7"],
	],
	body: JSON.stringify({ dapp: SITE.address }),
};
const bundle = (id: string, extra: Record<string, string> = {}) => ({
	js: `/* detector ${id} */`,
	privateKey: `pk-${id}`,
	innerConfig: `cfg-${id}`,
	...extra,
});
const big = "x".repeat(1_500_000);
const steps: Step[] = [
	assign,
	push({
		bundles: {
			"new-a": bundle("new-a", { release: "r1" }),
			"new-b": bundle("new-b", { payloadLayout: "TFY=", keyMap: "km" }),
		},
	}),
	assign,
	push({ bundles: { broken: { js: "x" } } }),
	push({ bundles: { "no-token": bundle("no-token") } }, false),
	push({ bundles: { "too-big": { ...bundle("too-big"), js: big } } }, false),
	push({ bundles: { "big-c": { ...bundle("big-c"), js: big } } }),
	assign,
	push({ bundles: {} }),
	assign,
];
const exchanges: Json[] = [];
for (const step of steps) {
	const bytes = requestBytes(step);
	const sent = Buffer.from(
		bytes
			.toString("latin1")
			.replace("{{ADMIN_JWT}}", pair.jwtIssue({ expiresIn: 300 })),
		"latin1",
	);
	exchanges.push({
		request: bytes.toString("base64"),
		response: (await send(port, sent)).toString("base64"),
		at: Date.now(),
		pool: readPool(),
	});
}
const poolAfter = readPool();
const database = await dumpDatabase(DATABASE);
await new Promise<void>((resolve) => server.close(() => resolve()));
await ipapi.close();
writeFileSync(
	fileURLToPath(new URL("./pool-replace-vectors.json", import.meta.url)),
	`${JSON.stringify({ database: DATABASE, variables: { ...variables, PROSOPO_IPAPI_URL: "{{IPAPI_URL}}", PROSOPO_DETECTOR_POOL_DIR: "{{POOL_DIR}}" }, poolBefore, poolAfter, seed: database, exchanges })}\n`,
);
console.log(`wrote pool-replace-vectors.json (${steps.length} requests)`);
process.exit(0);
