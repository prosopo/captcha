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

import { Environment } from "@prosopo/env";
import { ProviderEnvironment } from "@prosopo/env";
import { DatabaseTypes, ProsopoConfigSchema } from "@prosopo/types";
import { randomAsHex } from "@prosopo/util-crypto";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { ProsopoEnvironment } from "./env.js";
import type { ProviderEnvironment as ProviderEnvironmentType } from "./provider.js";

describe("ProsopoEnvironment integration tests", () => {
	let mongoContainer: StartedTestContainer;
	let redisContainer: StartedTestContainer;
	let mongoConnectionString: string;
	let redisConnectionString: string;

	beforeAll(async () => {
		mongoContainer = await new GenericContainer("mongo:7")
			.withExposedPorts(27017)
			.start();
		redisContainer = await new GenericContainer("redis:7-alpine")
			.withExposedPorts(6379)
			.start();

		const mongoHost = mongoContainer.getHost();
		const mongoPort = mongoContainer.getMappedPort(27017);
		mongoConnectionString = `mongodb://${mongoHost}:${mongoPort}`;

		const redisHost = redisContainer.getHost();
		const redisPort = redisContainer.getMappedPort(6379);
		redisConnectionString = `redis://${redisHost}:${redisPort}`;
	}, 180000);

	afterAll(async () => {
		await mongoContainer.stop();
		await redisContainer.stop();
	});

	test("Environment implements ProsopoEnvironment interface", async () => {
		const config = ProsopoConfigSchema.parse({
			defaultEnvironment: "development",
			host: "http://localhost:9229",
			account: {
				secret:
					"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			},
			database: {
				development: {
					type: DatabaseTypes.enum.provider,
					endpoint: mongoConnectionString,
					dbname: "prosopo_test",
				},
			},
			redisConnection: {
				url: redisConnectionString,
				password: "",
				indexName: randomAsHex(16),
			},
			authAccount: {
				secret:
					"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			},
			ipApi: {
				baseUrl: "https://dummyUrl.com",
				apiKey: "dummyKey",
			},
		});

		const env = new Environment(config);

		const prosopoEnv: ProsopoEnvironment = env;

		expect(prosopoEnv.config).toBeDefined();
		expect(prosopoEnv.defaultEnvironment).toBe("development");
		expect(prosopoEnv.logger).toBeDefined();
		expect(prosopoEnv.keyring).toBeDefined();
		expect(typeof prosopoEnv.getDb).toBe("function");
		expect(typeof prosopoEnv.isReady).toBe("function");
		expect(typeof prosopoEnv.importDatabase).toBe("function");

		await env.isReady();

		expect(prosopoEnv.db).toBeDefined();
		const db = prosopoEnv.getDb();
		expect(db).toBeDefined();
	});

	test("Environment isReady method initializes database", async () => {
		const config = ProsopoConfigSchema.parse({
			defaultEnvironment: "development",
			host: "http://localhost:9229",
			account: {
				secret:
					"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			},
			database: {
				development: {
					type: DatabaseTypes.enum.provider,
					endpoint: mongoConnectionString,
					dbname: "prosopo_test",
				},
			},
			redisConnection: {
				url: redisConnectionString,
				password: "",
				indexName: randomAsHex(16),
			},
			authAccount: {
				secret:
					"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			},
			ipApi: {
				baseUrl: "https://dummyUrl.com",
				apiKey: "dummyKey",
			},
		});

		const env = new Environment(config);

		expect(env.db).toBeUndefined();

		await env.isReady();

		expect(env.db).toBeDefined();
		const db = env.getDb();
		expect(db).toBeDefined();
		expect(db.connected).toBe(true);
	});

	test("Environment importDatabase method connects to database", async () => {
		const config = ProsopoConfigSchema.parse({
			defaultEnvironment: "development",
			host: "http://localhost:9229",
			account: {
				secret:
					"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			},
			database: {
				development: {
					type: DatabaseTypes.enum.provider,
					endpoint: mongoConnectionString,
					dbname: "prosopo_test",
				},
			},
			redisConnection: {
				url: redisConnectionString,
				password: "",
				indexName: randomAsHex(16),
			},
			authAccount: {
				secret:
					"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			},
			ipApi: {
				baseUrl: "https://dummyUrl.com",
				apiKey: "dummyKey",
			},
		});

		const env = new Environment(config);

		expect(env.db).toBeUndefined();

		await env.importDatabase();

		expect(env.db).toBeDefined();
		const db = env.getDb();
		expect(db).toBeDefined();
	});

	test("ProviderEnvironment implements ProviderEnvironment interface", async () => {
		const config = ProsopoConfigSchema.parse({
			defaultEnvironment: "development",
			host: "http://localhost:9229",
			account: {
				secret:
					"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			},
			database: {
				development: {
					type: DatabaseTypes.enum.provider,
					endpoint: mongoConnectionString,
					dbname: "prosopo_test",
				},
			},
			redisConnection: {
				url: redisConnectionString,
				password: "",
				indexName: randomAsHex(16),
			},
			authAccount: {
				secret:
					"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			},
			ipApi: {
				baseUrl: "https://dummyUrl.com",
				apiKey: "dummyKey",
			},
		});

		const providerEnv = new ProviderEnvironment(config);

		const providerEnvType: ProviderEnvironmentType = providerEnv;

		expect(providerEnvType.config).toBeDefined();
		expect(providerEnvType.defaultEnvironment).toBe("development");
		expect(providerEnvType.logger).toBeDefined();
		expect(providerEnvType.keyring).toBeDefined();
		expect(typeof providerEnvType.getDb).toBe("function");
		expect(typeof providerEnvType.isReady).toBe("function");
		expect(typeof providerEnvType.importDatabase).toBe("function");

		await providerEnv.isReady();

		expect(providerEnvType.db).toBeDefined();
		const db = providerEnvType.getDb();
		expect(db).toBeDefined();
	});

	test("ProviderEnvironment extends ProsopoEnvironment", async () => {
		const config = ProsopoConfigSchema.parse({
			defaultEnvironment: "development",
			host: "http://localhost:9229",
			account: {
				secret:
					"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			},
			database: {
				development: {
					type: DatabaseTypes.enum.provider,
					endpoint: mongoConnectionString,
					dbname: "prosopo_test",
				},
			},
			redisConnection: {
				url: redisConnectionString,
				password: "",
				indexName: randomAsHex(16),
			},
			authAccount: {
				secret:
					"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			},
			ipApi: {
				baseUrl: "https://dummyUrl.com",
				apiKey: "dummyKey",
			},
		});

		const providerEnv = new ProviderEnvironment(config);

		const prosopoEnv: ProsopoEnvironment = providerEnv;

		expect(prosopoEnv.config).toBeDefined();
		expect(prosopoEnv.defaultEnvironment).toBe("development");
		expect(prosopoEnv.logger).toBeDefined();
		expect(prosopoEnv.keyring).toBeDefined();
		expect(typeof prosopoEnv.getDb).toBe("function");
		expect(typeof prosopoEnv.isReady).toBe("function");
		expect(typeof prosopoEnv.importDatabase).toBe("function");

		await providerEnv.isReady();

		expect(prosopoEnv.db).toBeDefined();
		const db = prosopoEnv.getDb();
		expect(db).toBeDefined();
	});

	test("ProviderEnvironment isReady method initializes database", async () => {
		const config = ProsopoConfigSchema.parse({
			defaultEnvironment: "development",
			host: "http://localhost:9229",
			account: {
				secret:
					"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			},
			database: {
				development: {
					type: DatabaseTypes.enum.provider,
					endpoint: mongoConnectionString,
					dbname: "prosopo_test",
				},
			},
			redisConnection: {
				url: redisConnectionString,
				password: "",
				indexName: randomAsHex(16),
			},
			authAccount: {
				secret:
					"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			},
			ipApi: {
				baseUrl: "https://dummyUrl.com",
				apiKey: "dummyKey",
			},
		});

		const providerEnv = new ProviderEnvironment(config);

		expect(providerEnv.db).toBeUndefined();

		await providerEnv.isReady();

		expect(providerEnv.db).toBeDefined();
		const db = providerEnv.getDb();
		expect(db).toBeDefined();
		expect(db.connected).toBe(true);
	});
});
