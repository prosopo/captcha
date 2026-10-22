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

// Writes spam-vectors.json: the provider's real app, on a live environment (see
// live-harness.ts) with a stand-in DNS server, checking emails against a seeded spam list
// directly and through CNAME and MX records. The test domains sit under `.zz`, which no public
// resolver knows, so the website redirect check finds nothing on either side.
// Run on Node 24 with the live stores up.
import { writeFileSync } from "node:fs";
import type { AddressInfo, Server } from "node:net";
import { fileURLToPath } from "node:url";
import { type IUserDataSlim, Tier } from "@prosopo/types";
import { startProviderApi } from "../../src/api/startProviderApi.js";
import {
	type DnsTable,
	type Json,
	type Step,
	dumpDatabase,
	fakeDns,
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
const DATABASE = "equivalence_spam";
const ON = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y";
const OFF = "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy";
const UNREGISTERED = "5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu";

const DNS: DnsTable = {
	"clean.eqv.zz": {},
	"cname.eqv.zz": { cname: "spam-target.zz" },
	"cname-clean.eqv.zz": { cname: "Clean-Target.zz" },
	"mx.eqv.zz": { mx: [{ preference: 10, exchange: "mail.spam-mx.zz" }, { preference: 20, exchange: "backup.clean.zz" }] },
	"mx-clean.eqv.zz": { mx: [{ preference: 5, exchange: "mail.clean.zz" }] },
	"both.eqv.zz": { cname: "clean-target.zz", mx: [{ preference: 1, exchange: "mail.spam-mx.zz" }] },
};
const SPAM_LIST = ["spam-direct.zz", "spam-target.zz", "mail.spam-mx.zz", "parent-spam.zz"];

const path = "/v1/prosopo/provider/client/spam/email";
const headers = (siteKey: string): [string, string][] => [
	["Content-Type", "application/json"],
	["Prosopo-Site-Key", siteKey],
	["Origin", "https://example.com"],
];
const check = (email: unknown, dapp: unknown = ON, siteKey: string = ON, extra: [string, string][] = []): Step => ({
	method: "POST",
	path,
	headers: [...headers(siteKey), ...extra],
	body: JSON.stringify({ ...(email !== undefined && { email }), ...(dapp !== undefined && { dapp }) }),
});

const steps: Step[] = [
	check("a@spam-direct.zz"),
	check(" A@SPAM-DIRECT.ZZ "),
	check("a@sub.parent-spam.zz"),
	check("a@clean.eqv.zz"),
	check("a@nowhere.eqv.zz"),
	check("a@cname.eqv.zz"),
	check("a@cname-clean.eqv.zz"),
	check("a@mx.eqv.zz"),
	check("a@mx-clean.eqv.zz"),
	check("a@both.eqv.zz"),
	check("no-at-sign.eqv.zz"),
	check("a@localhost"),
	check("a@x.test"),
	check("a@10.0.0.1"),
	check("a@"),
	check(""),
	check("a\nb@spam-direct.zz"),
	check(`${"a".repeat(310)}@spam-direct.zz`),
	check(undefined),
	check("a@spam-direct.zz", undefined),
	check(5),
	check("a@spam-direct.zz", UNREGISTERED),
	check("a@spam-direct.zz", OFF),
	check("a@spam-direct.zz", ON, ON, [["Accept-Language", "es"]]),
	check("a@spam-direct.zz", OFF, ON, [["Accept-Language", "es"]]),
	{ method: "GET", path, headers: headers(ON) },
	{ method: "POST", path: `${path}/`, headers: headers(ON), body: JSON.stringify({ email: "a@spam-direct.zz", dapp: ON }) },
	{ method: "POST", path, headers: [["Prosopo-Site-Key", ON], ["Origin", "https://example.com"], ["Content-Type", "text/plain"]], body: "x" },
];

await resetStores(DATABASE);
const ipapi = await fakeIpapi({});
const dns = await fakeDns(DNS);
const variables = liveVariables(DATABASE, ipapi.url, { PROSOPO_DNS_SERVERS: JSON.stringify([dns.server]) });
const env = await liveEnvironment(variables);
const records = [
	{ account: ON, settings: { domains: ["example.com"], spamEmailDomainCheckEnabled: true }, tier: Tier.Free },
	{ account: OFF, settings: { domains: ["example.com"], spamEmailDomainCheckEnabled: false }, tier: Tier.Free },
] as unknown as IUserDataSlim[];
await env.getDb().updateClientRecords(records);
await env.getDb().bulkUpdateSpamEmailDomains(SPAM_LIST.map((domain) => ({ filter: { domain }, update: { domain } })), true);
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
await dns.close();

writeFileSync(
	fileURLToPath(new URL("./spam-vectors.json", import.meta.url)),
	`${JSON.stringify({ database: DATABASE, variables: { ...variables, PROSOPO_IPAPI_URL: "{{IPAPI_URL}}", PROSOPO_DNS_SERVERS: "{{DNS_SERVERS}}" }, ipapi: {}, dns: DNS, seed: database, exchanges })}\n`,
);
console.log(`wrote spam-vectors.json (${Object.keys(database).join(", ")} seeded, ${steps.length} requests)`);
process.exit(0);
