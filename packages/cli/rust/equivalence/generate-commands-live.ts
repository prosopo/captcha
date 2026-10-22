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

// Writes commands-live-vectors.json: the CLI's commands run through argv.ts's real handlers
// against the live MongoDB (see packages/provider/rust/equivalence/live-harness.ts), one command
// line at a time from a seeded database, with the stores dumped after each line, every index
// listed at the end, and what `site_key_register_api` sent to a stand-in provider. Run on Node 24.
import { writeFileSync } from "node:fs";
import { type IncomingMessage, type ServerResponse, createServer } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPair } from "@prosopo/keyring";
import {
	ADMIN,
	type Json,
	MNEMONIC,
	MONGO_PORT,
	dumpDatabase,
	fakeIpapi,
	liveVariables,
	resetStores,
	withMongo,
} from "../../../provider/rust/equivalence/live-harness.js";
import { processArgs } from "../../src/argv.js";
import getConfig from "../../src/prosopo.config.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

process.env.NODE_ENV = "production";
const DATABASE = "equivalence_cli_commands";
const CENTRAL = "equivalence_cli_commands_central";
const SITE = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y";
const SITE_B = "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy";
const SITE_C = "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw";
const SITE_GENERIC = "1FRMM8PEiWXYax7rpS6X4XZX1aAAxSWx1CrKTyrVYhV24fg";
// Relative to packages/cli, where this runs and where cargo runs the Rust test.
const FIXTURES = "rust/equivalence/fixtures";
const uri = (database: string) => `mongodb://root:root@127.0.0.1:${MONGO_PORT}/${database}?authSource=admin`;

type Received = { method: string; url: string; contentType: string | null; siteKey: string | null; body: string; jwt: Json };
const received: Received[] = [];
const decodeJwt = (header: string | undefined): Json => {
	const token = header?.replace(/^Bearer /, "") ?? "";
	const [head, payload] = token.split(".").slice(0, 2).map((part) => JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<string, Json>);
	const times = Object.fromEntries(Object.entries(payload ?? {}).map(([name, value]) => [name, typeof value === "number" ? "<time>" : value]));
	return { header: head ?? null, payload: times, verified: getPair(MNEMONIC).jwtVerify(token).isValid };
};
const provider = createServer((req: IncomingMessage, res: ServerResponse) => {
	const chunks: Buffer[] = [];
	req.on("data", (chunk: Buffer) => chunks.push(chunk));
	req.on("end", () => {
		received.push({
			method: req.method ?? "",
			url: req.url ?? "",
			contentType: req.headers["content-type"] ?? null,
			siteKey: (req.headers["prosopo-site-key"] as string | undefined) ?? null,
			body: Buffer.concat(chunks).toString("utf8"),
			jwt: decodeJwt(req.headers.authorization),
		});
		res.setHeader("Content-Type", "application/json");
		res.end(JSON.stringify({ status: "ok" }));
	});
});
await new Promise<void>((resolve) => provider.listen(0, "127.0.0.1", () => resolve()));
const providerUrl = `http://127.0.0.1:${(provider.address() as AddressInfo).port}`;

await resetStores(DATABASE);
await withMongo(async (mongo) => {
	await mongo.db(CENTRAL).dropDatabase();
	await mongo
		.db(DATABASE)
		.collection("clients")
		.insertMany([
			{ account: SITE_B, tier: "free", settings: { domains: ["b.example"], trafficFilter: { blockVpn: true } } },
			{ account: SITE_C, tier: "professional", settings: { domains: ["c.example"], trafficFilter: { blockVpn: false, abuserScoreThreshold: 5 } } },
			{ account: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", tier: "free", settings: { domains: ["d.example"] } },
			{ account: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty", tier: "enterprise", settings: { domains: [], trafficFilter: {} } },
		]);
});
const seed = await dumpDatabase(DATABASE);

const ipapi = await fakeIpapi({});
const variables = liveVariables(DATABASE, ipapi.url, { PROSOPO_MONGO_CAPTCHA_URI: uri(CENTRAL) });
Object.assign(process.env, variables);
const config = getConfig();
const pair = getPair(MNEMONIC);
const authAccount = getPair(undefined, ADMIN);

const base = ["--captcha_type", "pow", "--frictionless_threshold", "0.5", "--pow_difficulty", "4", "--domains", "a.example", "b.example", "--image_threshold", "0.8"];
const lines: string[][] = [
	["migrate_abuser_score_threshold", "--dryRun"],
	["migrate_abuser_score_threshold"],
	["migrate_abuser_score_threshold"],
	["site_key_register", SITE, "free", ...base],
	["site_key_register", SITE, "professional", ...base, "--image_max_rounds", "10", "--image_min_rounds", "3", "--frictionless_image_threshold", "0.9"],
	["site_key_register", SITE_B, "free", "--captcha_type=puzzle", "--frictionless_threshold=0", "--pow_difficulty=1", "--domains=one.example", "--image_threshold=1"],
	["site_key_register", SITE_C, "enterprise", "--captcha_type", "image", "--frictionless_threshold", "1e-7", "--pow_difficulty", "2.5", "--domains", "--image_threshold", "0x1", "--frictionless_image_threshold", "3"],
	["site_key_register", SITE, "free", "--captcha_type", "image", "--frictionless_threshold", "1.5", "--pow_difficulty", "4", "--domains", "x.example", "--image_threshold", "0.8"],
	["site_key_register", SITE_GENERIC, "free", ...base, "--domains", "c.example"],
	["site_key_register", SITE, "free", ...base, "--image_max_rounds", "2.5"],
	["provider_set_data_set", "--file", path.join(FIXTURES, "dataset.json")],
	["provider_set_data_set", "--file", path.join(FIXTURES, "dataset-unsolved.json")],
	["provider_set_data_set", "--file", path.join(FIXTURES, "not-json.txt")],
	["provider_set_data_set", "--file", path.join(FIXTURES, "missing.json")],
	["provider_set_data_set", "--file", path.join(FIXTURES, "dataset.json")],
	["ensure_indexes"],
	["ensure_external_indexes"],
	["version"],
	["site_key_register_api", SITE, providerUrl, "--tier", "free", ...base],
	["site_key_register_api", SITE_C, providerUrl, "--tier", "professional", "--captcha_type", "image", "--frictionless_threshold", "1e-7", "--pow_difficulty", "2.5", "--domains", "--image_threshold", "1", "--frictionless_image_threshold", "3", "--image_max_rounds", "7"],
	["site_key_register_api", SITE, providerUrl, "--tier", "free", "--captcha_type", "pow"],
];

const steps: Json[] = [];
for (const line of lines) {
	const sent = received.length;
	await processArgs(["node", "cli", ...line], pair, authAccount, config);
	steps.push({ line: line.map((token) => token.replace(providerUrl, "<provider>")), after: await dumpDatabase(DATABASE), sent: received.slice(sent) as unknown as Json });
}

const indexes = (database: string): Promise<Json> =>
	withMongo(async (mongo) => {
		const out: Record<string, Json> = {};
		for (const { name } of (await mongo.db(database).listCollections().toArray()).sort((a, b) => a.name.localeCompare(b.name))) {
			const list = await mongo.db(database).collection(name).listIndexes().toArray();
			out[name] = list.sort((a, b) => String(a.name).localeCompare(String(b.name))) as unknown as Json;
		}
		return out;
	});
const allIndexes = { provider: await indexes(DATABASE), central: await indexes(CENTRAL) };
await ipapi.close();
await new Promise<void>((resolve) => provider.close(() => resolve()));

writeFileSync(
	fileURLToPath(new URL("./commands-live-vectors.json", import.meta.url)),
	`${JSON.stringify({ database: DATABASE, central: CENTRAL, variables, seed, steps, indexes: allIndexes }, null, "\t")}\n`,
);
console.log(`wrote commands-live-vectors.json (${steps.length} command lines)`);
process.exit(0);
