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

// Writes config-vectors.json: the config getConfig builds, and the rate limits
// getRateLimitConfig reads, for a spread of environments. Run on Node 24.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getRateLimitConfig } from "../../src/RateLimiter.js";
import { getAddress, getDB, getPassword, getSecret } from "../../src/process.env.js";
import getConfig from "../../src/prosopo.config.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

let seed = 0xc0ffee;
const random = (): number => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = seed;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;

const pool: Record<string, readonly (string | undefined)[]> = {
	PROSOPO_LOG_LEVEL: [undefined, "debug", "warn,database=trace", "nonsense", ""],
	CADDY_DOMAIN: ["pronode1.prosopo.io", "pronode2.prosopo.io", "pronode1.prosopo.io", "pronode2.prosopo.io", "pronode3.prosopo.io", "pronode4.prosopo.io", "pronode5.prosopo.io", "pronode6.prosopo.io", "pronode7.prosopo.io", undefined, ""],
	PROSOPO_DEFAULT_ENVIRONMENT: [undefined, "development", "staging", "production", ""],
	PROSOPO_PROVIDER_ADDRESS: [undefined, "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"],
	PROSOPO_PROVIDER_ACCOUNT_PASSWORD: [undefined, "hunter2", ""],
	PROSOPO_PROVIDER_MNEMONIC: [undefined, "bottom drive obey lake curtain smoke basket hold race lonely fit walk"],
	PROSOPO_PROVIDER_SEED: [undefined, "0x01"],
	PROSOPO_PROVIDER_URI: [undefined, "//Alice"],
	PROSOPO_PROVIDER_JSON: [undefined, '{"encoded":"x"}'],
	PROSOPO_ADMIN_ADDRESS: [undefined, "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"],
	PROSOPO_ADMIN_URI: [undefined, "//Bob"],
	PROSOPO_DATABASE_PROTOCOL: [undefined, "mongodb", "mongodb+srv"],
	PROSOPO_DATABASE_PASSWORD: [undefined, "p@ss"],
	PROSOPO_DATABASE_USERNAME: [undefined, "admin"],
	PROSOPO_DATABASE_HOST: [undefined, "mongo.internal"],
	PROSOPO_DATABASE_PORT: [undefined, "27018"],
	PROSOPO_DATABASE_NAME: [undefined, "prosopo"],
	PROSOPO_DATABASE_AUTH_SOURCE: [undefined, "admin"],
	PROSOPO_API_BASE_URL: [undefined, "https://pronode1.prosopo.io"],
	PROSOPO_API_PORT: [undefined, "9238", "80"],
	PROSOPO_MONGO_EVENTS_URI: [undefined, "mongodb://events"],
	PROSOPO_MONGO_CAPTCHA_URI: [undefined, "mongodb://captcha"],
	PROSOPO_MONGO_CLIENT_URI: [undefined, "mongodb://client"],
	REDIS_CONNECTION_URL: [undefined, "redis://redis:6379"],
	REDIS_CONNECTION_PASSWORD: [undefined, "root"],
	PROSOPO_PROXY_COUNT: [undefined, "1", "2"],
	CAPTCHA_STORAGE_SCHEDULE: [undefined, "*/5 * * * *"],
	CLIENT_LIST_SCHEDULE: [undefined, "0 * * * *"],
	CLIENT_ENTROPY_SCHEDULE: [undefined, "0 0 * * *"],
	SPAM_EMAIL_DOMAINS_SCHEDULE: [undefined, "0 3 * * *"],
	L_RULES: [undefined, '{"a":1,"b":0.5}', "{not json", undefined, '{"c":2}', undefined, "[]"],
	SPAM_EMAIL_DOMAINS_URLS: [undefined, '["https://a.example/list"]', "[1,2]", "{bad"],
	PROSOPO_IPAPI_KEY: ["key", "other-key"],
	PROSOPO_IPAPI_URL: ["https://api.ipapi.is", "https://ipapi.example"],
	MAXMIND_DB_PATH: [undefined, "/geo/city.mmdb"],
	MAXMIND_ASN_DB_PATH: [undefined, "/geo/asn.mmdb"],
	PROSOPO_DNS_SERVERS: [undefined, '["1.1.1.1","8.8.8.8"]', '["1.1.1.1",2]', "nope"],
	PROSOPO_GET_POW_CAPTCHA_CHALLENGE_WINDOW: [undefined, "60000"],
	PROSOPO_GET_POW_CAPTCHA_CHALLENGE_LIMIT: [undefined, "30"],
	PROSOPO_CHECK_SPAM_EMAIL_WINDOW: [undefined, "1000"],
	PROSOPO_CHECK_SPAM_EMAIL_LIMIT: [undefined, "5"],
	PROSOPO_DNS_EVENT_LIMIT: [undefined, "100"],
};
const extra = ["PENALTY_OLD_TIMESTAMP", "PENALTY_ACCESS_RULE", "PENALTY_UNVERIFIED_HOST"];
const clear = (): void => {
	for (const key of [...Object.keys(pool), ...extra]) delete process.env[key];
};
const read = (environment: Record<string, string>) => {
	clear();
	Object.assign(process.env, environment);
	const outcome = (run: () => unknown) => {
		try {
			return { ok: JSON.parse(JSON.stringify(run() ?? null)) };
		} catch (error) {
			const e = error as { name?: string; translationKey?: string; issues?: unknown };
			return { error: e.translationKey ?? e.name ?? String(error), ...(e.issues ? { issues: e.issues } : {}) };
		}
	};
	return {
		config: outcome(() => getConfig()),
		configWithCaptchas: outcome(() => getConfig(undefined, { solved: { count: 2 }, unsolved: { count: 0 } })),
		rateLimits: outcome(() => getRateLimitConfig()),
		provider: { address: getAddress() ?? null, password: getPassword() ?? null, secret: getSecret() ?? null },
		admin: { address: getAddress("admin") ?? null, password: getPassword("admin") ?? null, secret: getSecret("admin") ?? null },
		db: outcome(() => getDB()),
	};
};

// The ones the TS refuses: no ipapi settings, a penalty given (env values are strings, the
// schema wants numbers), an unknown environment name.
const environments: Record<string, string>[] = [
	{},
	{ PROSOPO_IPAPI_KEY: "key" },
	{ PROSOPO_IPAPI_KEY: "key", PROSOPO_IPAPI_URL: "https://api.ipapi.is", PENALTY_OLD_TIMESTAMP: "0.2" },
	{ PROSOPO_IPAPI_KEY: "key", PROSOPO_IPAPI_URL: "https://api.ipapi.is", PROSOPO_DEFAULT_ENVIRONMENT: "qa" },
];
const base = { CADDY_DOMAIN: "pronode1.prosopo.io", PROSOPO_IPAPI_KEY: "key", PROSOPO_IPAPI_URL: "https://api.ipapi.is" };
for (const edge of [
	{ PROSOPO_PROXY_COUNT: "abc" },
	{ PROSOPO_PROXY_COUNT: "12px" },
	{ PROSOPO_PROXY_COUNT: "-1" },
	{ PROSOPO_PROXY_COUNT: "" },
	{ PROSOPO_API_PORT: "abc" },
	{ PROSOPO_API_PORT: "0x10" },
	{ PROSOPO_API_PORT: "" },
	{ L_RULES: "null" },
	{ L_RULES: "1" },
	{ L_RULES: '"text"' },
	{ L_RULES: '{"a":"x"}' },
	{ L_RULES: '{"a":1e400}' },
	{ L_RULES: "" },
	{ L_RULES: '{"en":0.5,"de":-1}' },
	{ PROSOPO_API_PORT: "9".repeat(400) },
	{ PROSOPO_PROXY_COUNT: "9".repeat(400) },
	{ SPAM_EMAIL_DOMAINS_URLS: "null" },
	{ SPAM_EMAIL_DOMAINS_URLS: "[]" },
	{ PROSOPO_DNS_SERVERS: "null" },
	{ PROSOPO_DNS_SERVERS: "[]" },
	{ PROSOPO_DEFAULT_ENVIRONMENT: "Production" },
	{ PROSOPO_PROVIDER_MNEMONIC: "", PROSOPO_PROVIDER_SEED: "0x02" },
	{ PROSOPO_PROVIDER_ADDRESS: "" },
	{ PROSOPO_DATABASE_HOST: "" },
	{ PROSOPO_DATABASE_PROTOCOL: "mongodb+srv", PROSOPO_DATABASE_PORT: "1" },
	{ PROSOPO_IPAPI_KEY: "" },
	{ PENALTY_ACCESS_RULE: "" },
]) {
	environments.push({ ...base, ...edge });
}
const full: Record<string, string> = {};
for (const [key, values] of Object.entries(pool)) {
	const value = values.find((candidate) => candidate !== undefined);
	if (value !== undefined) full[key] = value;
}
environments.push(full);
for (let i = 0; i < 200; i++) {
	const environment: Record<string, string> = {};
	for (const [key, values] of Object.entries(pool)) {
		const value = pick(values);
		if (value !== undefined) environment[key] = value;
	}
	environments.push(environment);
}
const cases = environments.map((environment) => ({ environment, ...read(environment) }));
writeFileSync(fileURLToPath(new URL("./config-vectors.json", import.meta.url)), `${JSON.stringify(cases)}\n`);
console.log(`wrote config-vectors.json (${cases.length} environments, ${cases.filter((c) => "error" in c.config).length} refused)`);
