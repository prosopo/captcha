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

// Records the server-side config schemas (config/config.ts, config/frictionless.ts) into
// config-vectors.json, which config_equivalence.rs replays against the Rust.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ZodTypeAny } from "zod";
import * as config from "../../src/config/config.js";
import * as frictionless from "../../src/config/frictionless.js";
import { ClientApiPaths } from "../../src/provider/api.js";

// The vectors are what Node 24, the production runtime, produces.
if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

type Result = { ok: Json } | { okUndefined: true } | { issues: Json };

const result = (schema: ZodTypeAny, input: Json | undefined): Result => {
	const parsed = schema.safeParse(input);
	if (!parsed.success) {
		return { issues: JSON.parse(JSON.stringify(parsed.error.issues)) as Json };
	}
	if (parsed.data === undefined) return { okUndefined: true };
	return { ok: JSON.parse(JSON.stringify(parsed.data)) as Json };
};

const WRONG_TYPES: Json[] = [null, 1, "", "zzz", [], {}, true];

const variants = (base: { [key: string]: Json }): Json[] => {
	const out: Json[] = [base, { ...base, extra: "stripped" }];
	for (const key of Object.keys(base)) {
		const { [key]: _removed, ...rest } = base;
		out.push(rest);
		for (const replacement of WRONG_TYPES) {
			out.push({ ...base, [key]: replacement });
		}
	}
	return out;
};

const minimal = { account: {}, host: "https://pronode.example", authAccount: {} };

const full: { [key: string]: Json } = {
	logLevel: "debug",
	defaultEnvironment: "staging",
	account: { address: "5C7b", secret: "//Alice", password: "p" },
	database: {
		production: { type: "mongo", endpoint: "mongodb://db:27017", dbname: "prod", authSource: "admin" },
		development: { type: "mongoMemory", endpoint: "" },
	},
	host: "https://pronode.example",
	captchas: { solved: { count: 3 }, unsolved: { count: 1 } },
	penalties: { PENALTY_OLD_TIMESTAMP: 0.3, PENALTY_ACCESS_RULE: 0.6, PENALTY_UNVERIFIED_HOST: 0.25, PENALTY_WEBVIEW: 0.15 },
	scheduledTasks: {
		captchaScheduler: { schedule: "*/5 * * * *" },
		clientListScheduler: {},
		clientEntropyScheduler: { schedule: "0 * * * *" },
		spamEmailDomainsScheduler: { schedule: "0 0 * * *" },
	},
	server: { baseURL: "http://localhost", port: 9230 },
	mongoEventsUri: "mongodb://events",
	mongoCaptchaUri: "mongodb://captcha",
	mongoClientUri: "mongodb://client",
	ipApi: { apiKey: "k", baseUrl: "https://ipapi.example" },
	spamEmailDomainsUrls: ["https://lists.example/a.txt"],
	redisConnection: { url: "redis://redis:6379", password: "pw", indexName: "idx" },
	rateLimits: { [ClientApiPaths.GetPowCaptchaChallenge]: { windowMs: "30000", limit: "100" } },
	proxyCount: 2,
	lRules: { "10": 1, a: 0.5 },
	maxmindDbPath: "/m/db",
	maxmindCityDbPath: "/m/city",
	maxmindAsnDbPath: "/m/asn",
	authAccount: { address: "5D", secret: "s" },
	dnsServers: ["1.1.1.1"],
};

const clientFull: { [key: string]: Json } = {
	logLevel: "warn",
	defaultEnvironment: "development",
	account: { address: "5C7b", secret: "//Alice" },
	userAccountAddress: "5Dapp",
	web2: false,
	solutionThreshold: 50,
	dappName: "dapp",
	serverUrl: "https://site.example",
};

const timeoutsFull: { [key: string]: Json } = {
	image: { challengeTimeout: 1, solutionTimeout: 2, verifiedTimeout: 3, cachedTimeout: 4 },
	pow: { verifiedTimeout: 5, solutionTimeout: 6, cachedTimeout: 7 },
	puzzle: { verifiedTimeout: 8, solutionTimeout: 9, cachedTimeout: 10 },
	audio: { verifiedTimeout: 11, solutionTimeout: 12, cachedTimeout: 13 },
	iconOrder: { verifiedTimeout: 14, solutionTimeout: 15, cachedTimeout: 16 },
	contract: { maxVerifiedTime: 17 },
};

const SCHEMAS: [string, ZodTypeAny, Json[]][] = [
	["frictionlessPenalties", frictionless.FrictionlessPenalties, [{}, { PENALTY_WEBVIEW: 0 }, ...variants({ PENALTY_OLD_TIMESTAMP: 1, PENALTY_ACCESS_RULE: 2, PENALTY_UNVERIFIED_HOST: 3, PENALTY_WEBVIEW: 4 })]],
	["databaseTypes", config.DatabaseTypes, ["mongo", "mongoMemory", "provider", "client", "captcha", "postgres"]],
	["environmentTypes", config.EnvironmentTypesSchema, ["development", "staging", "production", "test"]],
	["databaseConfig", config.DatabaseConfigSchema, [{}, { production: { type: "mongo", endpoint: "e" } }, { test: { type: "mongo", endpoint: "e" } }, { production: { type: "mongo" } }]],
	["prosopoBaseConfig", config.ProsopoBaseConfigSchema, [{ account: {} }, { logLevel: "verbose", account: {} }, { defaultEnvironment: "staging", account: { address: 1 } }]],
	["polkadotSecretJson", config.PolkadotSecretJSONSpec, variants({ encoded: "e", encoding: { content: ["pkcs8", "sr25519"], type: ["scrypt", "xsalsa20-poly1305"], version: "3" }, address: "5C", meta: { genesisHash: "", name: "n", whenCreated: 1 } })],
	["prosopoBasicConfig", config.ProsopoBasicConfigSchema, [{ account: {} }, { account: {}, database: { staging: { type: "mongo", endpoint: "e", dbname: "d" } } }]],
	["prosopoApiConfig", config.ProsopoApiConfigSchema, [{ baseURL: "http://localhost" }, { baseURL: "not a url" }, { baseURL: "https://x", port: "80" }]],
	["prosopoCaptchaSolutionConfig", config.ProsopoCaptchaSolutionConfigSchema, [...variants({ requiredNumberOfSolutions: 3, solutionWinningPercentage: 80, captchaBlockRecency: 10 }), { requiredNumberOfSolutions: 1, solutionWinningPercentage: 101, captchaBlockRecency: 1 }]],
	["ipApiService", config.IpApiServiceSpec, variants({ apiKey: "k", baseUrl: "https://x" })],
	["prosopoClientConfig", config.ProsopoClientConfigSchema, [{ account: {} }, ...variants(clientFull), { account: {}, solutionThreshold: 101 }, { account: {}, solutionThreshold: 0 }]],
	[
		"captchaTimeout",
		config.CaptchaTimeoutSchema,
		[
			...variants(timeoutsFull),
			{ pow: {} },
			{ pow: { challengeTimeout: 1 } },
			{ image: { challengeTimeout: -1 } },
			{ contract: { maxVerifiedTime: 0 } },
			{ iconOrder: { verifiedTimeout: 1.5 } },
		],
	],
	[
		"prosopoServerConfig",
		config.ProsopoServerConfigSchema,
		[
			{ account: {} },
			...variants({ ...clientFull, timeouts: timeoutsFull, providerRequestTimeoutMs: 2500 }),
			{ account: {}, serverUrl: "not a url" },
			{ account: {}, serverUrl: "http://localhost:9228" },
			{ account: {}, providerRequestTimeoutMs: 1.5 },
			{ account: {}, providerRequestTimeoutMs: 0 },
			{ account: {}, timeouts: {} },
			{ account: {}, timeouts: { pow: { cachedTimeout: 1 } } },
		],
	],
	[
		"prosopoConfig",
		config.ProsopoConfigSchema,
		[
			minimal,
			...variants(full),
			{ ...minimal, server: { baseURL: "ftp://x" } },
			{ ...minimal, rateLimits: { [ClientApiPaths.GetPowCaptchaChallenge]: { windowMs: "abc" } } },
			{ ...minimal, rateLimits: {} },
			{ ...minimal, redisConnection: { url: "redis://x" } },
			{ ...minimal, captchas: { solved: { count: 0 } } },
			{ ...minimal, lRules: { a: "1" } },
		],
	],
];

const GENERIC: Json[] = [null, 0, "", [], {}];

const schemaVectors: { schema: string; input?: Json; result: Result }[] = [];
for (const [name, schema, specific] of SCHEMAS) {
	schemaVectors.push({ schema: name, result: result(schema, undefined) });
	for (const input of [...GENERIC, ...specific]) {
		schemaVectors.push({ schema: name, input, result: result(schema, input) });
	}
}

const output = fileURLToPath(new URL("./config-vectors.json", import.meta.url));
writeFileSync(
	output,
	`${JSON.stringify(
		{
			penaltyDefaults: [
				frictionless.PENALTY_OLD_TIMESTAMP_DEFAULT,
				frictionless.PENALTY_ACCESS_RULE_DEFAULT,
				frictionless.PENALTY_UNVERIFIED_HOST_DEFAULT,
				frictionless.PENALTY_WEBVIEW_DEFAULT,
			],
			schemas: SCHEMAS.map(([name]) => name),
			schemaVectors,
		},
		null,
		"\t",
	)}\n`,
);
process.stdout.write(`wrote ${schemaVectors.length} config schema vectors\n`);
