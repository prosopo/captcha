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

// Writes admin-vectors.json: the provider's real app, on a live environment (see
// live-harness.ts), answering the admin routes behind the admin gate (site keys, decision
// machines, usage counters, maintenance mode, DNS events, session state), with what they leave
// in MongoDB and Redis. `{{ADMIN_JWT}}` stands for a token freshly issued by the provider's
// pair. Each request carries the time it was sent, for the Rust clock. Run on Node 24 with the
// live stores up.
import { writeFileSync } from "node:fs";
import type { AddressInfo, Server } from "node:net";
import { fileURLToPath } from "node:url";
import { RedisWriteQueue } from "@prosopo/database";
import { getPair } from "@prosopo/keyring";
import { CaptchaType, type IUserDataSlim, type Session, Tier } from "@prosopo/types";
import { startProviderApi } from "../../src/api/startProviderApi.js";
import { getCompositeIpAddress } from "../../src/compositeIpAddress.js";
import { UsageCounters } from "../../src/util/usageCounters.js";
import {
	type IpapiTable,
	type Json,
	MNEMONIC,
	type Step,
	dumpDatabase,
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
const DATABASE = "equivalence_admin";
const SITE = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y";
const SITE_B = "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy";
const SITE_C = "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw";
const ADMIN = "/v1/prosopo/provider/admin";

const location = (code: string, latitude: number, longitude: number) => ({ country: code, country_code: code, state: "S", city: "C", latitude, longitude, timezone: "UTC" });
const answer = (ip: string, flags: Record<string, boolean>, type: string): Json => ({
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
	...flags,
	company: { name: "Co", abuser_score: "0.4 (High)", domain: "co.example", type },
	asn: { asn: 3320, org: "AS3320", type, abuser_score: "0.0012 (Low)" },
	location: location("DE", 52.5, 13.4),
});
const IPAPI: IpapiTable = {
	"203.0.113.7": answer("203.0.113.7", {}, "isp"),
	"192.0.2.53": answer("192.0.2.53", { is_datacenter: true }, "hosting"),
	"192.0.2.54": answer("192.0.2.54", { is_abuser: true }, "isp"),
};

const json: [string, string] = ["Content-Type", "application/json"];
const auth: [string, string] = ["Authorization", "Bearer {{ADMIN_JWT}}"];
const admin = (route: string, body: unknown, headers: [string, string][] = [json, auth]): Step => ({
	method: "POST",
	path: `${ADMIN}/${route}`,
	headers,
	body: JSON.stringify(body),
});

await resetStores(DATABASE);
const ipapi = await fakeIpapi(IPAPI);
const variables = liveVariables(DATABASE, ipapi.url, { PROSOPO_METRICS_ENABLED: "true" });
const env = await liveEnvironment(variables);
const db = env.getDb();
const pair = getPair(MNEMONIC);

await db.updateClientRecords([{ account: SITE_C, settings: { domains: ["example.com"] }, tier: Tier.Free }] as unknown as IUserDataSlim[]);
const now = new Date();
for (const [scope, dappAccount, kind, language] of [
	["global", undefined, "decision", "js"],
	["dapp", SITE, "routing", "ts"],
	["dapp", SITE_B, "decision", "javascript"],
] as const) {
	await db.upsertDecisionMachineArtifact({ scope, dappAccount, kind, runtime: "node", language, source: `module.exports = () => ({ decision: "allow" }) // ${scope}`, name: `${scope}-machine`, version: "1.0.0", createdAt: now, updatedAt: now } as Parameters<typeof db.upsertDecisionMachineArtifact>[0]);
}
const artifacts = await db.getAllDecisionMachineArtifacts();
const ids = artifacts.map((artifact) => artifact._id.toString());
const session = (sessionId: string, extra: Partial<Session> = {}) =>
	({
		sessionId,
		createdAt: new Date(Date.now() - 10000),
		token: `token-${sessionId}`,
		score: 0.3,
		threshold: 0.5,
		scoreComponents: { baseScore: 0.25, lScore: 0.05 },
		ipAddress: getCompositeIpAddress("203.0.113.7"),
		ipInfo: { isValid: true, ip: "203.0.113.7", providerType: "isp", isDatacenter: false, isAbuser: false },
		captchaType: CaptchaType.pow,
		webView: false,
		iFrame: false,
		decryptedHeadHash: `head-${sessionId}`,
		...extra,
	}) as Session;
for (const sessionId of ["s-plain", "s-dns", "s-http", "s-both"]) await db.storeSessionRecord(session(sessionId));
const queue = new RedisWriteQueue(db.getRedisConnection(), env.logger);
await queue.cacheSession("s-cached-plain", { sessionId: "s-cached-plain", score: 0.5, nested: { a: 1 } });
await queue.cacheSession("s-cached-bigint", session("s-cached-bigint") as unknown as Record<string, unknown>);
await db.storeSessionRecord(session("s-cached-plain"));
const counters = new UsageCounters(db.getRedisConnection(), env.logger);
for (const [dapp, value] of [[SITE, "1.1.1.1"], [SITE, "2.2.2.2"], [SITE_B, "1.1.1.1"]] as const) {
	await counters.incr(dapp, { kind: "served", captchaType: "pow", dimension: "ip", window: "1h" }, value);
}

const database = await dumpDatabase(DATABASE);
const redis = await dumpRedisHashes();
const client = await db.getRedisConnection().getClient();
const strings = async (pattern: string): Promise<Json[]> => {
	const out: Json[] = [];
	for (const key of (await client.keys(pattern)).sort()) out.push({ key, value: await client.get(key) });
	return out;
};
const seededStrings = [...(await strings("cache:session:*")), ...(await strings("cnt:*"))];

const fullSettings = { captchaType: "pow", domains: ["example.com", "*.example.org"], frictionlessThreshold: 0.6, powDifficulty: 5 };
const steps: Step[] = [
	admin("sitekey/register", { siteKey: SITE, tier: Tier.Professional, settings: fullSettings }),
	admin("sitekey/register", { siteKey: SITE_B, tier: Tier.Free }),
	admin("sitekey/register", { siteKey: "not-a-key", tier: Tier.Free }),
	admin("sitekey/register", { siteKey: SITE, tier: "platinum" }),
	admin("sitekeys/register", [{ siteKey: SITE_B, tier: Tier.Enterprise }, { siteKey: SITE_C, tier: Tier.Free, settings: { domains: ["c.example"] } }]),
	admin("sitekeys/register", [{ siteKey: SITE_B, tier: Tier.Free }, { siteKey: "bad", tier: Tier.Free }]),
	admin("sitekey/remove", { siteKey: "not-a-key" }),
	admin("sitekey/remove", { siteKey: SITE_C }),
	admin("sitekeys/remove", [{ siteKey: SITE_B }, { siteKey: "bad" }]),
	admin("sitekeys/remove", [{ siteKey: SITE_B }]),
	admin("decision-machine/get", { id: ids[0] }),
	admin("decision-machine/get", { id: ids[2] }),
	admin("decision-machine/get-all", {}),
	admin("decision-machine/remove", { id: ids[2] }),
	admin("decision-machine/get-all", {}),
	admin("decision-machine/get", { id: "not-an-id" }),
	admin("decision-machine/get", { id: "0123456789abcdef01234567" }),
	admin("decision-machine/update", { decisionMachineScope: "dapp", decisionMachineRuntime: "node", decisionMachineSource: "x" }),
	admin("decision-machine/update", { decisionMachineScope: "global", decisionMachineRuntime: "node", decisionMachineSource: "module.exports = () => ({ decision: 'deny' })", decisionMachineKind: "decision", decisionMachineName: "replacement" }),
	admin("decision-machine/update", { decisionMachineScope: "dapp", dapp: SITE_B, decisionMachineRuntime: "node", decisionMachineLanguage: "typescript", decisionMachineSource: "export default () => null", decisionMachineCaptchaType: "pow" }),
	admin("decision-machine/get-all", {}),
	admin("decision-machine/remove", { id: ids[1] }),
	admin("decision-machine/remove", { id: ids[1] }),
	admin("decision-machine/remove", { id: "nope" }),
	admin("decision-machine/remove-all", {}),
	admin("decision-machine/get-all", {}),
	admin("counters/clear-all", { dapp: SITE }),
	admin("counters/clear-all", {}),
	admin("counters/clear-all", {}),
	admin("maintenance/toggle", { enabled: true, siteKeys: [SITE, SITE_B] }),
	admin("maintenance/toggle", { enabled: false, siteKeys: [SITE_B] }),
	admin("maintenance/toggle", { enabled: true }),
	{ method: "POST", path: "/v1/prosopo/provider/client/pow/verify", headers: [json], body: JSON.stringify({ token: "0x00", dappSignature: "0x00" }) },
	admin("maintenance/toggle", { enabled: false }),
	admin("maintenance/toggle", { enabled: false, siteKeys: [SITE] }),
	admin("dns/event", {
		events: [
			{ kind: "dns", src_ip: "192.0.2.53", ts: "2026-10-22T04:00:01.000Z", jti: "s-dns" },
			{ kind: "http", src_ip: "192.0.2.54", ts: "2026-10-22T04:00:02.000Z", jti: "s-http", path_valid: false },
			{ kind: "http", src_ip: "192.0.2.54", ts: "2026-10-22T04:00:03.000Z", jti: "s-both", path_valid: true },
			{ kind: "dns", src_ip: "192.0.2.53", ts: "2026-10-22T04:00:04.000Z", jti: "s-both" },
			{ kind: "dns", src_ip: "192.0.2.53", ts: "2026-10-22T04:00:05.000Z", jti: "s-unknown" },
			{ kind: "dns", src_ip: "192.0.2.53", ts: 6 },
			{ kind: "smtp", src_ip: "192.0.2.53", ts: "2026-10-22T04:00:07.000Z", jti: "s-dns" },
			{ kind: "dns", ts: "2026-10-22T04:00:08.000Z", jti: "s-dns" },
		],
	}),
	admin("dns/event", { events: [] }),
	admin("dns/event", { events: "nope" }),
	admin("session/get", { sessionId: "s-both" }),
	admin("session/get", { sessionId: "s-cached-plain" }),
	admin("session/get", { sessionId: "s-cached-bigint" }),
	admin("session/get", { sessionId: "s-missing" }),
	admin("session/get", {}),
	admin("session/get", { sessionId: "s-plain" }, [json]),
	{ ...admin("session/get", { sessionId: "s-plain" }), method: "GET" },
	{ ...admin("session/get", { sessionId: "s-plain" }), path: `${ADMIN}/session/get/` },
	admin("unknown", {}),
	admin("sitekeys/register", [{ siteKey: SITE_B, tier: Tier.Free }]),
];

const server: Server = await startProviderApi(env, false, 0);
const port = (server.address() as AddressInfo).port;
const exchanges: Json[] = [];
for (const step of steps) {
	const bytes = requestBytes(step);
	const at = Date.now();
	const response = await send(port, Buffer.from(bytes.toString("latin1").replace("{{ADMIN_JWT}}", pair.jwtIssue({ expiresIn: 300 })), "latin1"));
	exchanges.push({ request: bytes.toString("base64"), response: response.toString("base64"), compare: step.compare !== false, at });
}
await new Promise<void>((resolve) => setTimeout(resolve, 1000));
const metrics = (await send(port, requestBytes({ method: "GET", path: "/metrics" })))
	.toString("utf8")
	.split("\n")
	.filter((line) => line.startsWith("prosopo_maintenance_mode"));
const after = await dumpDatabase(DATABASE);
const afterStrings = [...(await strings("cache:session:*")), ...(await strings("cnt:*"))];
await client.quit();
await new Promise<void>((resolve) => server.close(() => resolve()));
await ipapi.close();

writeFileSync(
	fileURLToPath(new URL("./admin-vectors.json", import.meta.url)),
	`${JSON.stringify({ database: DATABASE, variables: { ...variables, PROSOPO_IPAPI_URL: "{{IPAPI_URL}}" }, ipapi: IPAPI, seed: database, redis, strings: seededStrings, exchanges, metrics, after: { clients: after.clients, decisionmachines: after.decisionmachines ?? [], sessions: after.sessions }, afterStrings })}\n`,
);
console.log(`wrote admin-vectors.json (${steps.length} requests)`);
process.exit(0);
