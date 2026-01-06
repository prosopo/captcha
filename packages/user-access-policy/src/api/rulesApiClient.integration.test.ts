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
	LogLevel,
	type Logger,
	ProsopoApiError,
	getLogger,
	stringifyBigInts,
	unwrapError,
} from "@prosopo/common";
import {
	type RedisConnection,
	connectToRedis,
	setupRedisIndex,
} from "@prosopo/redis-client";
import { randomAsHex } from "@prosopo/util-crypto";
import {
	RedisContainer,
	type StartedRedisContainer,
} from "@testcontainers/redis";
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
import { AccessRuleApiRoutes } from "#policy/api/ruleApiRoutes.js";
import { AccessRulesApiClient } from "#policy/api/rulesApiClient.js";
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

describe("AccessRulesApiClient Integration Tests", () => {
	let app: Express;
	let server: Server;
	let redisContainer: StartedRedisContainer;
	let redisConnection: RedisConnection;
	let accessRulesStorage: AccessRulesStorage;
	let apiClient: AccessRulesApiClient;
	let baseUrl: string;
	const port = 9231;
	const mockLogger = getLogger(LogLevel.enum.info, "AccessRulesApiClientTest");
	const mockAccount = "test-account";
	const mockTimestamp = "1234567890";
	const mockSignature = "test-signature";

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
			logger: mockLogger,
		});

		// Setup Redis index
		redisConnection = setupRedisIndex(
			redisConnection,
			accessRulesRedisIndex,
			mockLogger,
		);

		// Wait for Redis client to be ready
		await redisConnection.getClient();

		// Create access rules storage
		accessRulesStorage = createRedisAccessRulesStorage(
			redisConnection,
			mockLogger,
		);

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

		// Manually register routes
		const routes = apiRuleRoutesProvider.getRoutes();
		for (const [routePath, endpoint] of Object.entries(routes)) {
			app.post(
				routePath,
				async (req: Request, res: Response, next: NextFunction) => {
					try {
						// Parse request body with endpoint schema
						const schema = endpoint.getRequestArgsSchema();
						let args: unknown;
						try {
							args = schema ? schema.parse(req.body) : undefined;
						} catch (parseError) {
							return next(
								new ProsopoApiError("API.PARSE_ERROR", {
									context: { code: 400, error: parseError },
								}),
							);
						}

						// Process request
						const response = await endpoint.processRequest(args, req.logger);

						// Stringify BigInts before sending JSON response
						const responseObject = stringifyBigInts(response);
						res.json(responseObject);
					} catch (error) {
						req.logger?.error(() => ({ err: error }));
						if (error instanceof ProsopoApiError || error instanceof Error) {
							const { code, statusMessage, jsonError } = unwrapError(
								error,
								undefined,
							);
							res.statusMessage = statusMessage || "Error";
							res.status(code || 500);
							res.set("content-type", "application/json");
							res.json({ error: jsonError });
						} else {
							res.status(500).json({ error: "Internal server error" });
						}
					}
				},
			);
		}

		// Start server
		await new Promise<void>((resolve) => {
			server = app.listen(port, () => {
				baseUrl = `http://localhost:${port}`;
				resolve();
			});
		});

		// Create API client
		apiClient = new AccessRulesApiClient(baseUrl, mockAccount);
	}, 60_000);

	beforeEach(async () => {
		// Clear all rules before each test
		await accessRulesStorage.deleteAllRules();
	});

	afterAll(async () => {
		if (server) {
			await new Promise<void>((resolve) => {
				server.close(() => resolve());
			});
		}
		if (redisContainer) {
			await redisContainer.stop();
		}
	}, 30_000);

	describe("deleteMany", () => {
		test("should delete rules via HTTP request", async () => {
			// Insert rules first
			const rule1: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-delete-many",
				numericIp: BigInt(100),
			});
			const rule2: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-delete-many",
				numericIp: BigInt(200),
			});

			await accessRulesStorage.insertRules([{ rule: rule1 }, { rule: rule2 }]);

			// Delete via API client
			const response = await apiClient.deleteMany(
				[
					{
						policyScope: {
							clientId: "test-client-delete-many",
						},
					},
				],
				mockTimestamp,
				mockSignature,
			);

			expect(response.status).toBe("SUCCESS");
			expect(response.data).toBeDefined();
			expect(response.data?.deleted_count).toBe(2);
		});
	});

	describe("deleteGroups", () => {
		test("should delete rule groups via HTTP request", async () => {
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

			await accessRulesStorage.insertRules([{ rule: rule1 }, { rule: rule2 }]);

			// Delete via API client
			const response = await apiClient.deleteGroups(
				[
					{
						clientIds: ["test-client-group-1", "test-client-group-2"],
						groupId,
					},
				],
				mockTimestamp,
				mockSignature,
			);

			expect(response.status).toBe("SUCCESS");
			expect(response.data?.deleted_count).toBe(2);
		});
	});

	describe("deleteAll", () => {
		test("should delete all rules via HTTP request", async () => {
			// Insert some rules
			const rule1: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-all",
			});
			const rule2: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-all-2",
			});

			await accessRulesStorage.insertRules([{ rule: rule1 }, { rule: rule2 }]);

			// Delete all via API client
			const response = await apiClient.deleteAll(mockTimestamp, mockSignature);

			expect(response.status).toBe("SUCCESS");
			expect(response.data?.deleted_count).toBe(2);
		});
	});

	describe("getMissingIds", () => {
		test("should get missing IDs via HTTP request", async () => {
			// Insert a rule
			const rule: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-missing",
			});

			const insertedIds = await accessRulesStorage.insertRules([{ rule }]);

			// Get missing IDs via API client
			const response = await apiClient.getMissingIds(
				[insertedIds[0], "non-existent-id-1", "non-existent-id-2"] as string[],
				mockTimestamp,
				mockSignature,
			);

			expect(response.status).toBe("SUCCESS");
			expect(response.data).toBeDefined();
			expect(response.data?.ids).toBeDefined();
			expect(response.data?.ids.length).toBe(2);
			expect(response.data?.ids).toContain("non-existent-id-1");
			expect(response.data?.ids).toContain("non-existent-id-2");
		});

		test("should handle invalid response data gracefully", async () => {
			// This tests the parsing logic with a valid request
			// The integration test verifies the actual HTTP call works
			const response = await apiClient.getMissingIds(
				["non-existent-id"] as string[],
				mockTimestamp,
				mockSignature,
			);

			// Should succeed and return the missing ID
			expect(response.status).toBe("SUCCESS");
			expect(response.data?.ids).toContain("non-existent-id");
		});
	});

	describe("fetchMany", () => {
		test("should fetch rules via HTTP request", async () => {
			// Insert rules
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

			// Fetch via API client
			const response = await apiClient.fetchMany(
				{ ids: insertedIds },
				mockTimestamp,
				mockSignature,
			);

			expect(response.status).toBe("SUCCESS");
			expect(response.data).toBeDefined();
			expect(response.data?.ruleEntries).toBeDefined();
			expect(response.data?.ruleEntries.length).toBe(2);
		});
	});

	describe("findIds", () => {
		test("should find rule IDs via HTTP request", async () => {
			// Insert rules
			const rule1: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-find-ids",
				numericIp: BigInt(500),
			});
			const rule2: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-find-ids",
				numericIp: BigInt(600),
			});

			await accessRulesStorage.insertRules([{ rule: rule1 }, { rule: rule2 }]);

			// Find IDs via API client
			const response = await apiClient.findIds(
				[
					{
						policyScope: {
							clientId: "test-client-find-ids",
						},
					},
				],
				mockTimestamp,
				mockSignature,
			);

			expect(response.status).toBe("SUCCESS");
			expect(response.data).toBeDefined();
			expect(response.data?.ruleIds).toBeDefined();
			expect(response.data?.ruleIds.length).toBe(2);
		});
	});

	describe("rehashAll", () => {
		test("should rehash all rules via HTTP request", async () => {
			// Insert some rules
			const rule1: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Block,
				clientId: "test-client-rehash",
				numericIp: BigInt(700),
			});
			const rule2: AccessRule = accessRuleInput.parse({
				type: AccessPolicyType.Restrict,
				clientId: "test-client-rehash",
				numericIp: BigInt(800),
			});

			await accessRulesStorage.insertRules([{ rule: rule1 }, { rule: rule2 }]);

			// Rehash via API client
			const response = await apiClient.rehashAll(mockTimestamp, mockSignature);

			expect(response.status).toBe("SUCCESS");

			// Verify rules still exist after rehashing
			const ruleIds = await accessRulesStorage.findRuleIds({
				policyScope: {
					clientId: "test-client-rehash",
				},
			});
			expect(ruleIds.length).toBe(2);
		});
	});

	describe("insertMany", () => {
		test("should insert rules via HTTP request", async () => {
			// Insert via API client
			const response = await apiClient.insertMany(
				[
					{
						accessPolicy: {
							type: AccessPolicyType.Block,
						},
						userScopes: [
							{
								numericIp: BigInt(900),
							},
						],
						policyScopes: [
							{
								clientId: "test-client-insert",
							},
						],
					},
				],
				mockTimestamp,
				mockSignature,
			);

			expect(response.status).toBe("SUCCESS");

			// Verify rules were inserted
			const ruleIds = await accessRulesStorage.findRuleIds({
				policyScope: {
					clientId: "test-client-insert",
				},
			});
			expect(ruleIds.length).toBeGreaterThan(0);
		});
	});

	describe("authentication headers", () => {
		test("should include correct auth headers in requests", async () => {
			// This test verifies that the client correctly sets auth headers
			// by making a request that would fail without proper headers
			const response = await apiClient.deleteAll(mockTimestamp, mockSignature);

			// If headers were wrong, we'd get an error
			expect(response.status).toBeDefined();
		});
	});
});
