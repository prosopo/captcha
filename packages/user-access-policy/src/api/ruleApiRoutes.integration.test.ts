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

import type { Server } from "node:http";
import {
	apiExpressRouterFactory,
	createApiExpressDefaultEndpointAdapter,
} from "@prosopo/api-express-router";
import { LogLevel, type Logger, getLogger } from "@prosopo/common";
import {
	type RedisConnection,
	createTestRedisConnection,
	setupRedisIndex,
} from "@prosopo/redis-client";
import { randomAsHex } from "@prosopo/util-crypto";
import express, {
	type Express,
	type Request,
	type Response,
	type NextFunction,
} from "express";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "vitest";
import {
	AccessRuleApiRoutes,
	accessRuleApiPaths,
} from "#policy/api/ruleApiRoutes.js";
import { accessRulesRedisIndex } from "#policy/redis/redisRuleIndex.js";
import {
	type AccessRulesStorage,
	createRedisAccessRulesStorage,
} from "#policy/redis/redisRulesStorage.js";
import {
	AccessPolicyType,
	type AccessRule,
	accessRuleInput,
} from "#policy/rule.js";

// Extend Express Request to include logger
declare module "express-serve-static-core" {
	interface Request {
		logger?: Logger;
	}
}

describe("AccessRuleApiRoutes HTTP Integration Tests", () => {
	let app: Express;
	let server: Server;
	let redisConnection: RedisConnection;
	let accessRulesStorage: AccessRulesStorage;
	let baseUrl: string;
	const port = 9230;
	const mockLogger = getLogger(LogLevel.enum.info, "AccessRuleApiRoutesTest");

	beforeAll(async () => {
		// Setup Redis connection
		redisConnection = createTestRedisConnection(mockLogger);
		const redisClient = await setupRedisIndex(
			redisConnection,
			accessRulesRedisIndex,
			mockLogger,
		).getClient();

		// Create access rules storage
		accessRulesStorage = createRedisAccessRulesStorage(
			redisConnection,
			mockLogger,
		);

		// Wait for Redis client to be ready
		await redisClient;

		// Setup Express server
		app = express();
		app.use(express.json());

		// Add request logger middleware
		app.use((req: Request, _res: Response, next: NextFunction) => {
			req.logger = mockLogger;
			next();
		});

		const apiRuleRoutesProvider = new AccessRuleApiRoutes(
			accessRulesStorage,
			mockLogger,
		);

		const apiEndpointAdapter = createApiExpressDefaultEndpointAdapter(
			LogLevel.enum.info,
		);

		app.use(
			apiExpressRouterFactory.createRouter(
				apiRuleRoutesProvider,
				apiEndpointAdapter,
			),
		);

		// Start server
		await new Promise<void>((resolve) => {
			server = app.listen(port, () => {
				baseUrl = `http://localhost:${port}`;
				resolve();
			});
		});
	}, 30_000);

	beforeEach(async () => {
		// Clear all rules before each test
		await accessRulesStorage.deleteAllRules();
	});

	afterAll(async () => {
		// Cleanup
		if (server) {
			await new Promise<void>((resolve) => {
				server.close(() => resolve());
			});
		}
		if (redisConnection) {
			const client = await redisConnection.getClient();
			await client.flushAll();
			await client.quit();
		}
	}, 10_000);

	describe("INSERT_MANY endpoint", () => {
		test("should insert rules successfully", async () => {
			const requestBody = [
				{
					accessPolicy: {
						type: AccessPolicyType.Block,
					},
					userScopes: [
						{
							numericIp: "100",
						},
					],
					policyScopes: [
						{
							clientId: "test-client-1",
						},
					],
				},
			];

			const response = await fetch(
				`${baseUrl}${accessRuleApiPaths.INSERT_MANY}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestBody),
				},
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.status).toBe("SUCCESS");

			// Verify rules were inserted
			const ruleIds = await accessRulesStorage.findRuleIds({
				policyScope: {
					clientId: "test-client-1",
				},
			});
			expect(ruleIds.length).toBeGreaterThan(0);
		});

		test("should insert rules with expiration", async () => {
			const expiresIn = 3600; // 1 hour
			const expirationTimestamp = Math.floor(
				(Date.now() + expiresIn * 1000) / 1000,
			);

			const requestBody = [
				{
					accessPolicy: {
						type: AccessPolicyType.Restrict,
						captchaType: "image",
					},
					userScopes: [
						{
							numericIp: "200",
						},
					],
					policyScopes: [
						{
							clientId: "test-client-2",
						},
					],
					expiresUnixTimestamp: expirationTimestamp,
				},
			];

			const response = await fetch(
				`${baseUrl}${accessRuleApiPaths.INSERT_MANY}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestBody),
				},
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.status).toBe("SUCCESS");
		});

		test("should return error for invalid request body", async () => {
			const requestBody = [
				{
					accessPolicy: {
						type: "invalid-type",
					},
					userScopes: [],
				},
			];

			const response = await fetch(
				`${baseUrl}${accessRuleApiPaths.INSERT_MANY}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestBody),
				},
			);

			expect(response.status).toBe(400);
		});
	});

	describe("FETCH_MANY endpoint", () => {
		test("should fetch rules by IDs", async () => {
			// First, insert some rules
			const rule1: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-fetch",
				numericIp: BigInt(300),
			});
			const rule2: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Restrict,
				clientId: "test-client-fetch",
				numericIp: BigInt(400),
			});

			const insertedIds = await accessRulesStorage.insertRules([
				{ rule: rule1 },
				{ rule: rule2 },
			]);

			// Fetch the rules
			const requestBody = {
				ids: insertedIds,
			};

			const response = await fetch(
				`${baseUrl}${accessRuleApiPaths.FETCH_MANY}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestBody),
				},
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.status).toBe("SUCCESS");
			expect(data.data).toBeDefined();
			expect(data.data.ruleEntries).toBeDefined();
			expect(data.data.ruleEntries.length).toBe(2);
		});

		test("should return empty array for non-existent IDs", async () => {
			const requestBody = {
				ids: ["non-existent-id-1", "non-existent-id-2"],
			};

			const response = await fetch(
				`${baseUrl}${accessRuleApiPaths.FETCH_MANY}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestBody),
				},
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.status).toBe("SUCCESS");
			expect(data.data.ruleEntries).toEqual([]);
		});
	});

	describe("FIND_IDS endpoint", () => {
		test("should find rule IDs by filter", async () => {
			// Insert rules
			const rule1: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-find",
				numericIp: BigInt(500),
			});
			const rule2: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-find",
				numericIp: BigInt(600),
			});
			const rule3: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "other-client",
				numericIp: BigInt(500),
			});

			await accessRulesStorage.insertRules([
				{ rule: rule1 },
				{ rule: rule2 },
				{ rule: rule3 },
			]);

			// Find rules by clientId
			const requestBody = [
				{
					policyScope: {
						clientId: "test-client-find",
					},
				},
			];

			const response = await fetch(`${baseUrl}${accessRuleApiPaths.FIND_IDS}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBody),
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.status).toBe("SUCCESS");
			expect(data.data.ruleIds).toBeDefined();
			expect(data.data.ruleIds.length).toBe(2);
		});
	});

	describe("GET_MISSING_IDS endpoint", () => {
		test("should return missing IDs", async () => {
			// Insert a rule
			const rule: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-missing",
			});

			const insertedIds = await accessRulesStorage.insertRules([{ rule }]);

			// Check for missing IDs
			const requestBody = [
				insertedIds[0],
				"non-existent-id-1",
				"non-existent-id-2",
			];

			const response = await fetch(
				`${baseUrl}${accessRuleApiPaths.GET_MISSING_IDS}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestBody),
				},
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.status).toBe("SUCCESS");
			expect(data.data.ids).toBeDefined();
			expect(data.data.ids.length).toBe(2);
			expect(data.data.ids).toContain("non-existent-id-1");
			expect(data.data.ids).toContain("non-existent-id-2");
		});
	});

	describe("DELETE_MANY endpoint", () => {
		test("should delete rules by filter", async () => {
			// Insert rules
			const rule1: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-delete",
				numericIp: BigInt(700),
			});
			const rule2: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-delete",
				numericIp: BigInt(800),
			});
			const rule3: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-delete-keep",
				numericIp: BigInt(700),
			});

			await accessRulesStorage.insertRules([
				{ rule: rule1 },
				{ rule: rule2 },
				{ rule: rule3 },
			]);

			// Delete rules by filter
			const requestBody = [
				{
					policyScope: {
						clientId: "test-client-delete",
					},
				},
			];

			const response = await fetch(
				`${baseUrl}${accessRuleApiPaths.DELETE_MANY}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestBody),
				},
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.status).toBe("SUCCESS");
			expect(data.data.deleted_count).toBe(2);

			// Verify rules were deleted
			const remainingIds = await accessRulesStorage.findRuleIds({
				policyScope: {
					clientId: "test-client-delete",
				},
			});
			expect(remainingIds.length).toBe(0);

			// Verify other rule still exists
			const keptIds = await accessRulesStorage.findRuleIds({
				policyScope: {
					clientId: "test-client-delete-keep",
				},
			});
			expect(keptIds.length).toBe(1);
		});
	});

	describe("DELETE_GROUPS endpoint", () => {
		test("should delete rules by group ID", async () => {
			const groupId = randomAsHex(16);

			// Insert rules with groupId
			const rule1: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-group-1",
				groupId,
			});
			const rule2: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-group-2",
				groupId,
			});
			const rule3: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-group-1",
				groupId: "different-group",
			});

			await accessRulesStorage.insertRules([
				{ rule: rule1 },
				{ rule: rule2 },
				{ rule: rule3 },
			]);

			// Delete rules by group
			const requestBody = [
				{
					clientIds: ["test-client-group-1", "test-client-group-2"],
					groupId,
				},
			];

			const response = await fetch(
				`${baseUrl}${accessRuleApiPaths.DELETE_GROUPS}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestBody),
				},
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.status).toBe("SUCCESS");
			expect(data.data.deleted_count).toBe(2);

			// Verify rules with groupId were deleted
			const remainingIds = await accessRulesStorage.findRuleIds({
				policyScope: {
					clientId: "test-client-group-1",
				},
			});
			expect(remainingIds.length).toBe(1); // Only the rule with different groupId remains
		});
	});

	describe("DELETE_ALL endpoint", () => {
		test("should delete all rules", async () => {
			// Insert some rules
			const rule1: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-all-1",
			});
			const rule2: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-all-2",
			});

			await accessRulesStorage.insertRules([{ rule: rule1 }, { rule: rule2 }]);

			// Delete all rules
			const response = await fetch(
				`${baseUrl}${accessRuleApiPaths.DELETE_ALL}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({}),
				},
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.status).toBe("SUCCESS");
			expect(data.data.deleted_count).toBe(2);

			// Verify all rules were deleted
			const allIds = await accessRulesStorage.findRuleIds({});
			expect(allIds.length).toBe(0);
		});
	});

	describe("REHASH_ALL endpoint", () => {
		test("should rehash all rules", async () => {
			// Insert some rules
			const rule1: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-rehash",
				numericIp: BigInt(900),
			});
			const rule2: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Restrict,
				clientId: "test-client-rehash",
				numericIp: BigInt(1000),
			});

			await accessRulesStorage.insertRules([{ rule: rule1 }, { rule: rule2 }]);

			// Rehash all rules
			const response = await fetch(
				`${baseUrl}${accessRuleApiPaths.REHASH_ALL}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({}),
				},
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.status).toBe("SUCCESS");

			// Verify rules still exist after rehashing
			const ruleIds = await accessRulesStorage.findRuleIds({
				policyScope: {
					clientId: "test-client-rehash",
				},
			});
			expect(ruleIds.length).toBe(2);
		});
	});
});
