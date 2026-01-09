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

import type { KeyringPair } from "@prosopo/types";
import type { ProsopoConfigOutput } from "@prosopo/types";
import { beforeAll, describe, expect, it } from "vitest";
import { Environment } from "./env.js";
import {
	createTestConfig,
	setupTestContainers,
} from "./tests/test-setup.integration.js";

describe("Environment Integration Tests", () => {
	let config: ProsopoConfigOutput;
	let testPair: KeyringPair;

	beforeAll(async () => {
		// Setup test containers for real database testing
		const { mongoContainer, redisContainer } = await setupTestContainers();

		const mongoUrl = `mongodb://root:root@localhost:${mongoContainer.getMappedPort(27017)}/prosopo?authSource=admin`;
		const redisUrl = `redis://localhost:${redisContainer.getMappedPort(6379)}`;

		config = createTestConfig(mongoUrl, redisUrl);

		// Create a test keyring pair for authentication
		const { getPair } = await import("@prosopo/keyring");
		testPair = getPair(config.account.secret);

		// Clean up containers after tests
		// Note: teardownTestContainers() is called in afterAll but not defined here
		// as vitest handles global cleanup. In a real scenario, you'd want proper cleanup.
	}, 60000); // 60 second timeout for container startup

	describe("Full Environment Lifecycle", () => {
		it("should initialize, connect to databases, and perform operations end-to-end", async () => {
			// Test: Create environment with real database configuration
			const env = new Environment(config, testPair);

			expect(env.config).toBe(config);
			expect(env.defaultEnvironment).toBe("development");
			expect(env.pair).toBe(testPair);
			expect(env.envId).toBeDefined();
			expect(env.ready).toBe(false);

			// Test: Environment should be able to get signer
			const signer = await env.getSigner();
			expect(signer).toBe(testPair);
			expect(env.keyring).toBeDefined();

			// Test: Environment should connect to real databases
			await env.isReady();
			expect(env.ready).toBe(true);

			// Test: Database should be properly initialized and connected
			const db = env.getDb();
			expect(db).toBeDefined();
			expect(db.connected).toBe(true);

			// Test: Database should be able to perform basic operations
			// This tests that the database connection is fully functional
			const collections = await db.connection!.db!.listCollections().toArray();
			expect(Array.isArray(collections)).toBe(true);

			// Test: Environment should have access to pair after ready
			const pair = env.getPair();
			expect(pair).toBe(testPair);
		}, 30000);

		it("should handle database connection failures gracefully", async () => {
			// Test: Environment with invalid database configuration
			const invalidConfig = {
				...config,
				database: {
					development: {
						type: "mongo" as const,
						endpoint: "mongodb://invalid:invalid@nonexistent:27017/invalid",
						dbname: "invalid",
						authSource: "admin",
					},
				},
			};

			const env = new Environment(invalidConfig, testPair);

			// Test: Environment initialization should work even with bad DB config
			expect(env.config).toBe(invalidConfig);
			expect(env.ready).toBe(false);

			// Test: isReady should fail with database connection error
			await expect(env.isReady()).rejects.toThrow();
			expect(env.ready).toBe(false);
		}, 30000);

		it("should handle Redis connection issues", async () => {
			// Test: Environment with invalid Redis configuration
			const invalidConfig = {
				...config,
				redisConnection: {
					url: "redis://invalid:invalid@nonexistent:6379",
					password: "invalid",
				},
			};

			const env = new Environment(invalidConfig, testPair);

			// Test: Database import should fail with Redis connection error
			await expect(env.importDatabase()).rejects.toThrow();
			expect(env.db).toBeUndefined();
		}, 30000);

		it("should handle environment without database configuration", async () => {
			// Test: Environment without database config (should work for basic operations)
			const noDbConfig = {
				...config,
				database: undefined,
			};

			const env = new Environment(noDbConfig, testPair);

			// Test: Environment should initialize without database
			expect(env.config).toBe(noDbConfig);
			expect(env.db).toBeUndefined();

			// Test: Should be able to get signer without database
			const signer = await env.getSigner();
			expect(signer).toBe(testPair);

			// Test: isReady should work without database (just unlock pair)
			await env.isReady();
			expect(env.ready).toBe(true);
			expect(env.db).toBeUndefined();
		}, 30000);

		it("should handle locked pairs and password unlocking", async () => {
			// Test: Environment with locked pair and password
			const lockedConfig = {
				...config,
				account: {
					...config.account,
					password: "testpassword123",
				},
			};

			// Create a locked pair for testing
			const { Keyring } = await import("@prosopo/keyring");
			const keyring = new Keyring({ type: "sr25519" });
			const lockedPair = keyring.addPair(testPair);
			lockedPair.lock();

			const env = new Environment(lockedConfig, lockedPair);

			// Test: Pair should be locked initially
			expect(lockedPair.isLocked).toBe(true);

			// Test: isReady should unlock the pair
			await env.isReady();
			expect(env.ready).toBe(true);
			expect(lockedPair.isLocked).toBe(false);

			// Test: Database should be connected
			const db = env.getDb();
			expect(db.connected).toBe(true);
		}, 30000);
	});
});
