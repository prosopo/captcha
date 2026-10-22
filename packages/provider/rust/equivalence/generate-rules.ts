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

// Writes rules-vectors.json: the provider's real app, on a live environment (see
// live-harness.ts), answering the access-rule routes behind the admin gate (insert, fetch,
// find, missing ids, delete by filter, group and all, rehash), and a request the block stage
// lets through, blocks once a rule is inserted and lets through again once it is deleted, so
// the verdict cache is shown to be cleared. `{{ADMIN_JWT}}` stands for a token freshly issued
// by the provider's pair. Run on Node 24 with the live stores up.
import { writeFileSync } from "node:fs";
import type { AddressInfo, Server } from "node:net";
import { fileURLToPath } from "node:url";
import { getPair } from "@prosopo/keyring";
import { startProviderApi } from "../../src/api/startProviderApi.js";
import {
	type Json,
	MNEMONIC,
	type Step,
	dumpRedisHashes,
	fakeIpapi,
	liveEnvironment,
	liveVariables,
	requestBytes,
	resetStores,
	send,
} from "./live-harness.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

process.env.NODE_ENV = "production";
delete process.env.MAINTENANCE_MODE;
const DATABASE = "equivalence_rules";
const SITE = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y";
const OTHER_SITE = "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy";
const RULES = "/v1/prosopo/user-access-policy/rules";

const json: [string, string] = ["Content-Type", "application/json"];
const admin: [string, string] = ["Authorization", "Bearer {{ADMIN_JWT}}"];
const rules = (route: string, body: unknown, headers: [string, string][] = [json, admin]): Step => ({
	method: "POST",
	path: `${RULES}/${route}`,
	headers,
	body: JSON.stringify(body),
});
const probe = (ip: string): Step => ({ method: "POST", path: "/v1/prosopo/provider/x", headers: [json, ["X-Forwarded-For", ip]], body: "{}" });

const blockIp = { accessPolicy: { type: "block", description: "probe" }, userScopes: [{ ip: "203.0.113.80" }] };
const grouped = {
	accessPolicy: { type: "restrict", captchaType: "pow", powDifficulty: 6 },
	policyScopes: [{ clientId: SITE }, { clientId: OTHER_SITE }],
	groupId: "campaign-1",
	userScopes: [{ countryCode: "RU" }, { ja4Hash: "t13d1516h2_8daaf6152771_02713d6af862" }, { userId: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY" }],
};
const expiring = { accessPolicy: { type: "block" }, userScopes: [{ asn: 64512 }], expiresUnixTimestamp: 4102444800 };

const steps: Step[] = [
	probe("203.0.113.80"),
	rules("insert-many", [blockIp]),
	probe("203.0.113.80"),
	rules("insert-many", [grouped, expiring]),
	rules("find-ids", [{ policyScope: { clientId: SITE }, policyScopeMatch: "exact" }]),
	rules("find-ids", [{ groupId: "campaign-1" }]),
	rules("find-ids", [{ userScope: { ip: "203.0.113.80" }, userScopeMatch: "exact" }]),
	rules("find-ids", []),
	rules("get-missing-ids", ["{{ID_BLOCK}}", "missing-id"]),
	rules("fetch-many", { ids: ["{{ID_BLOCK}}", "missing-id"] }),
	rules("delete-many", [{ userScope: { ip: "203.0.113.80" }, userScopeMatch: "exact" }]),
	probe("203.0.113.80"),
	rules("delete-groups", [{ clientIds: [SITE], groupId: "campaign-1" }]),
	rules("find-ids", [{ groupId: "campaign-1" }]),
	rules("rehash-all", {}),
	rules("delete-all", {}),
	rules("find-ids", []),
	rules("insert-many", [{ accessPolicy: { type: "block", captchaType: "pow" }, userScopes: [{ ip: "203.0.113.81" }] }]),
	rules("insert-many", [{ accessPolicy: { type: "nonsense" }, userScopes: [] }]),
	rules("insert-many", "not an array"),
	rules("find-ids", [], [json]),
	rules("find-ids", [], [json, ["Authorization", "Bearer not-a-jwt"]]),
	{ ...rules("find-ids", []), method: "GET" },
	{ ...rules("find-ids", []), path: `${RULES}/find-ids/` },
	{ ...rules("find-ids", []), path: `${RULES.toUpperCase()}/FIND-IDS` },
	rules("unknown-route", []),
	{ method: "OPTIONS", path: `${RULES}/find-ids`, headers: [["Origin", "https://portal.example"], ["Access-Control-Request-Method", "POST"]] },
];

await resetStores(DATABASE);
const ipapi = await fakeIpapi({});
const variables = liveVariables(DATABASE, ipapi.url);
const env = await liveEnvironment(variables);
const pair = getPair(MNEMONIC);
const redis = await dumpRedisHashes();

const server: Server = await startProviderApi(env, false, 0);
const port = (server.address() as AddressInfo).port;
const exchanges: Json[] = [];
let blockId = "";
for (const step of steps) {
	const bytes = requestBytes({ ...step, ...(step.body !== undefined && { body: step.body.replaceAll("{{ID_BLOCK}}", blockId) }) });
	const sent = Buffer.from(bytes.toString("latin1").replace("{{ADMIN_JWT}}", pair.jwtIssue({ expiresIn: 300 })), "latin1");
	const response = await send(port, sent);
	exchanges.push({ request: bytes.toString("base64"), response: response.toString("base64"), compare: step.compare !== false });
	const text = response.toString("utf8");
	const ids = text.match(/"ruleIds":\["([^"]+)"/);
	if (!blockId && step.path.endsWith("find-ids") && ids?.[1]) blockId = ids[1];
}
await new Promise<void>((resolve) => setTimeout(resolve, 500));
const after = await dumpRedisHashes();
await new Promise<void>((resolve) => server.close(() => resolve()));
await ipapi.close();

writeFileSync(
	fileURLToPath(new URL("./rules-vectors.json", import.meta.url)),
	`${JSON.stringify({ database: DATABASE, variables: { ...variables, PROSOPO_IPAPI_URL: "{{IPAPI_URL}}" }, redis, exchanges, after })}\n`,
);
console.log(`wrote rules-vectors.json (${steps.length} requests, ${(after as Json[]).length} rule hashes after)`);
process.exit(0);
