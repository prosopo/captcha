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

function createTestConfig(
	mongoConnectionString: string,
	redisConnectionString: string,
) {
	return ProsopoConfigSchema.parse({
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
}

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

	describe("Environment", () => {
		test("implements ProsopoEnvironment interface", async () => {
			const config = createTestConfig(
				mongoConnectionString,
				redisConnectionString,
			);
			const env = new Environment(config);
			const prosopoEnv = env as unknown as ProsopoEnvironment;

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

		test("isReady initializes database and sets ready state", async () => {
			const config = createTestConfig(
				mongoConnectionString,
				redisConnectionString,
			);
			const env = new Environment(config);

			expect(env.db).toBeUndefined();

			await env.isReady();

			expect(env.db).toBeDefined();
			const db = env.getDb();
			expect(db).toBeDefined();
			expect(db.connected).toBe(true);
		});

		test("isReady is idempotent", async () => {
			const config = createTestConfig(
				mongoConnectionString,
				redisConnectionString,
			);
			const env = new Environment(config);

			await env.isReady();
			const db1 = env.getDb();

			await env.isReady();
			const db2 = env.getDb();

			expect(db1).toBe(db2);
		});

		test("importDatabase connects to database", async () => {
			const config = createTestConfig(
				mongoConnectionString,
				redisConnectionString,
			);
			const env = new Environment(config);

			expect(env.db).toBeUndefined();

			await env.importDatabase();

			expect(env.db).toBeDefined();
			const db = env.getDb();
			expect(db).toBeDefined();
			expect(db.connected).toBe(true);
		});

		test("getDb throws when database is not initialized", () => {
			const config = createTestConfig(
				mongoConnectionString,
				redisConnectionString,
			);
			const env = new Environment(config);

			expect(() => env.getDb()).toThrow();
		});

		test("has all required ProsopoEnvironment properties", async () => {
			const config = createTestConfig(
				mongoConnectionString,
				redisConnectionString,
			);
			const env = new Environment(config);
			await env.isReady();

			const prosopoEnv = env as unknown as ProsopoEnvironment;

			expect(prosopoEnv.config).toBeDefined();
			expect(prosopoEnv.db).toBeDefined();
			expect(prosopoEnv.defaultEnvironment).toBeDefined();
			expect(prosopoEnv.logger).toBeDefined();
			expect(prosopoEnv.keyring).toBeDefined();
			expect(prosopoEnv.pair).toBeDefined();
		});

		test("optional properties can be undefined", () => {
			const config = createTestConfig(
				mongoConnectionString,
				redisConnectionString,
			);
			const env = new Environment(config);

			const prosopoEnv = env as unknown as ProsopoEnvironment;

			expect(prosopoEnv.assetsResolver).toBeUndefined();
		});
	});

	describe("ProviderEnvironment", () => {
		test("implements ProviderEnvironment interface", async () => {
			const config = createTestConfig(
				mongoConnectionString,
				redisConnectionString,
			);
			const providerEnv = new ProviderEnvironment(config);
			const providerEnvType = providerEnv as unknown as ProviderEnvironmentType;

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

		test("extends ProsopoEnvironment", async () => {
			const config = createTestConfig(
				mongoConnectionString,
				redisConnectionString,
			);
			const providerEnv = new ProviderEnvironment(config);
			const prosopoEnv = providerEnv as unknown as ProsopoEnvironment;

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

		test("isReady initializes database", async () => {
			const config = createTestConfig(
				mongoConnectionString,
				redisConnectionString,
			);
			const providerEnv = new ProviderEnvironment(config);

			expect(providerEnv.db).toBeUndefined();

			await providerEnv.isReady();

			expect(providerEnv.db).toBeDefined();
			const db = providerEnv.getDb();
			expect(db).toBeDefined();
			expect(db.connected).toBe(true);
		});

		test("has cleanup method", () => {
			const config = createTestConfig(
				mongoConnectionString,
				redisConnectionString,
			);
			const providerEnv = new ProviderEnvironment(config);

			expect(typeof providerEnv.cleanup).toBe("function");
		});

		test("config is ProsopoConfigOutput type", () => {
			const config = createTestConfig(
				mongoConnectionString,
				redisConnectionString,
			);
			const providerEnv = new ProviderEnvironment(config);
			const providerEnvType = providerEnv as unknown as ProviderEnvironmentType;

			expect(providerEnvType.config).toBeDefined();
			expect(providerEnvType.config.defaultEnvironment).toBe("development");
		});
	});
});
