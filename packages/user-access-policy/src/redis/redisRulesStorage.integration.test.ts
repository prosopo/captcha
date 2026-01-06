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

import { LogLevel, getLogger } from "@prosopo/common";
import {
	type RedisConnection,
	connectToRedis,
	setupRedisIndex,
} from "@prosopo/redis-client";
import {
	RedisContainer,
	type StartedRedisContainer,
} from "@testcontainers/redis";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "vitest";
import { accessRulesRedisIndex } from "#policy/redis/redisRuleIndex.js";
import { createRedisAccessRulesStorage } from "#policy/redis/redisRulesStorage.js";
import { AccessPolicyType, type AccessRule } from "#policy/rule.js";
import { accessRuleInput } from "#policy/ruleInput/ruleInput.js";
import type { AccessRulesStorage } from "#policy/rulesStorage.js";

describe("createRedisAccessRulesStorage Integration Tests", () => {
	let redisContainer: StartedRedisContainer;
	let redisConnection: RedisConnection;
	let accessRulesStorage: AccessRulesStorage;
	const logger = getLogger(
		LogLevel.enum.info,
		"RedisRulesStorageIntegrationTest",
	);

	beforeAll(async () => {
		// Start Redis container using testcontainers
		redisContainer = await new RedisContainer("redis/redis-stack:latest")
			.withCommand(["--requirepass", "root"])
			.start();

		// Get Redis connection details
		const redisHost = redisContainer.getHost();
		const redisPort = redisContainer.getMappedPort(6379);
		const redisPassword = "root";
		// Construct URL with password
		const redisUrl = `redis://:${redisPassword}@${redisHost}:${redisPort}`;

		// Create Redis connection
		redisConnection = connectToRedis({
			url: redisUrl,
			password: redisPassword,
			logger,
		});

		// Setup Redis index
		redisConnection = setupRedisIndex(
			redisConnection,
			accessRulesRedisIndex,
			logger,
		);
	}, 60_000);

	beforeEach(async () => {
		// Create fresh storage for each test to test initialization
		accessRulesStorage = createRedisAccessRulesStorage(redisConnection, logger);

		// Wait for Redis client to be ready
		await redisConnection.getClient();

		// Clear all rules before each test
		await accessRulesStorage.deleteAllRules();
	});

	afterAll(async () => {
		if (redisContainer) {
			await redisContainer.stop();
		}
	}, 30_000);

	describe("async initialization", () => {
		test("should start with dummy implementations and switch to real Redis", async () => {
			// Create storage - initially uses dummy implementations
			const storage = createRedisAccessRulesStorage(redisConnection, logger);

			// Initially, operations should work but return empty results (dummy implementation)
			const initialRules = await storage.findRules({});
			expect(initialRules).toEqual([]);

			// Wait for Redis client to be ready
			await redisConnection.getClient();
			// Give time for the promise handler to execute
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Now insert a rule - should work with real Redis
			const rule: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-init",
				numericIp: BigInt(100),
			});

			const insertedIds = await storage.insertRules([{ rule }]);
			expect(insertedIds.length).toBe(1);

			// Verify rule can be found - real Redis is working
			const foundRules = await storage.findRules({
				policyScope: {
					clientId: "test-client-init",
				},
			});
			expect(foundRules.length).toBe(1);
			const foundRule = foundRules[0];
			expect(foundRule).toBeDefined();
			expect(foundRule).toMatchObject({
				type: AccessPolicyType.Block,
				clientId: "test-client-init",
			});
		});

		test("should handle operations during transition period", async () => {
			const storage = createRedisAccessRulesStorage(redisConnection, logger);

			// Try to insert a rule immediately (before Redis is ready)
			const rule: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-transition",
			});

			// This should not throw, even if Redis isn't ready yet
			const insertPromise = storage.insertRules([{ rule }]);

			// Wait for Redis to be ready
			await redisConnection.getClient();
			await new Promise((resolve) => setTimeout(resolve, 100));

			// The insert should complete successfully
			const insertedIds = await insertPromise;
			expect(insertedIds.length).toBe(1);

			// Verify the rule was actually inserted
			const foundRules = await storage.findRules({
				policyScope: {
					clientId: "test-client-transition",
				},
			});
			expect(foundRules.length).toBe(1);
		});

		test("should maintain object reference after transition", async () => {
			const storage = createRedisAccessRulesStorage(redisConnection, logger);
			const originalStorage = storage;

			// Wait for Redis to be ready
			await redisConnection.getClient();
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Storage object reference should remain the same
			expect(storage).toBe(originalStorage);

			// All methods should still be available
			expect(storage.fetchRules).toBeDefined();
			expect(storage.insertRules).toBeDefined();
			expect(storage.findRules).toBeDefined();
			expect(storage.deleteRules).toBeDefined();
		});
	});

	describe("storage operations after initialization", () => {
		test("should insert and fetch rules", async () => {
			const rule1: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-1",
				numericIp: BigInt(200),
			});
			const rule2: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Restrict,
				clientId: "test-client-2",
				numericIp: BigInt(300),
			});

			const insertedIds = await accessRulesStorage.insertRules([
				{ rule: rule1 },
				{ rule: rule2 },
			]);

			expect(insertedIds.length).toBe(2);

			const fetchedRules = await accessRulesStorage.fetchRules(insertedIds);
			expect(fetchedRules.length).toBe(2);
			const fetchedRule1 = fetchedRules[0];
			const fetchedRule2 = fetchedRules[1];
			expect(fetchedRule1).toBeDefined();
			expect(fetchedRule2).toBeDefined();
			if (fetchedRule1) {
				expect(fetchedRule1.rule).toMatchObject({
					type: AccessPolicyType.Block,
					clientId: "test-client-1",
				});
			}
			if (fetchedRule2) {
				expect(fetchedRule2.rule).toMatchObject({
					type: AccessPolicyType.Restrict,
					clientId: "test-client-2",
				});
			}
		});

		test("should find rules by filter", async () => {
			const rule1: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-find",
				numericIp: BigInt(400),
			});
			const rule2: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-find",
				numericIp: BigInt(500),
			});
			const rule3: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "other-client",
				numericIp: BigInt(400),
			});

			await accessRulesStorage.insertRules([
				{ rule: rule1 },
				{ rule: rule2 },
				{ rule: rule3 },
			]);

			const foundRules = await accessRulesStorage.findRules({
				policyScope: {
					clientId: "test-client-find",
				},
			});

			expect(foundRules.length).toBe(2);
		});

		test("should delete rules", async () => {
			const rule: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-delete",
			});

			const insertedIds = await accessRulesStorage.insertRules([{ rule }]);
			expect(insertedIds.length).toBe(1);

			await accessRulesStorage.deleteRules(insertedIds);

			const foundRules = await accessRulesStorage.findRules({
				policyScope: {
					clientId: "test-client-delete",
				},
			});
			expect(foundRules.length).toBe(0);
		});

		test("should delete all rules", async () => {
			const rule1: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-all-1",
			});
			const rule2: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-all-2",
			});

			await accessRulesStorage.insertRules([{ rule: rule1 }, { rule: rule2 }]);

			const deletedCount = await accessRulesStorage.deleteAllRules();
			expect(deletedCount).toBe(2);

			const allRules = await accessRulesStorage.findRules({});
			expect(allRules.length).toBe(0);
		});

		test("should get missing rule IDs", async () => {
			const rule: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-missing",
			});

			const insertedIds = await accessRulesStorage.insertRules([{ rule }]);
			expect(insertedIds.length).toBe(1);
			const insertedId = insertedIds[0];
			expect(insertedId).toBeDefined();

			const missingIds = await accessRulesStorage.getMissingRuleIds([
				insertedId!,
				"non-existent-id-1",
				"non-existent-id-2",
			]);

			expect(missingIds.length).toBe(2);
			expect(missingIds).toContain("non-existent-id-1");
			expect(missingIds).toContain("non-existent-id-2");
		});

		test("should find rule IDs by filter", async () => {
			const rule1: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-ids",
				numericIp: BigInt(600),
			});
			const rule2: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-ids",
				numericIp: BigInt(700),
			});

			await accessRulesStorage.insertRules([{ rule: rule1 }, { rule: rule2 }]);

			const ruleIds = await accessRulesStorage.findRuleIds({
				policyScope: {
					clientId: "test-client-ids",
				},
			});

			expect(ruleIds.length).toBe(2);
		});
	});
});
