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

import type { Server } from "node:net";
import { datasetWithSolutionHashes } from "@prosopo/datasets";
import { ProviderEnvironment } from "@prosopo/env";
import { generateMnemonic, getPair } from "@prosopo/keyring";
import { Tasks, startProviderApi } from "@prosopo/provider";
import {
	AdminApiPaths,
	ApiParams,
	CaptchaType,
	ClientSettingsSchema,
	DatabaseTypes,
	DecisionMachineLanguage,
	DecisionMachineRuntime,
	DecisionMachineScope,
	type GetAllDecisionMachinesResponseType,
	type GetDecisionMachineResponseType,
	ProsopoConfigSchema,
	type RemoveDecisionMachineResponseType,
	Tier,
} from "@prosopo/types";
import { randomAsHex } from "@prosopo/util-crypto";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Function to get a random available port
function getRandomPort(): number {
	// Use a random port in the range 10000-60000 to avoid conflicts
	return Math.floor(Math.random() * 50000) + 10000;
}

/**
 * Register a site key directly in the database using Tasks
 * This mimics the setup script's registerSiteKey functionality
 */
async function registerSiteKeyInDb(
	env: ProviderEnvironment,
	siteKey: string,
	captchaType: CaptchaType,
): Promise<void> {
	const tasks = new Tasks(env);
	await tasks.clientTaskManager.registerSiteKey(
		siteKey,
		Tier.Free,
		ClientSettingsSchema.parse({
			captchaType,
			domains: ["localhost", "0.0.0.0", "127.0.0.0", "example.com"],
			frictionlessThreshold: 0.5,
			powDifficulty: 4,
		}),
	);
}

describe("Decision Machine Database Integration Tests", () => {
	let env: ProviderEnvironment;
	let mongoContainer: StartedTestContainer;
	let redisContainer: StartedTestContainer;
	let server: Server;
	let dappAccount: string;
	let mnemonic: string;
	let tasks: Tasks;
	let testPort: number;
	let baseUrl: string;
	let adminJwt: string;

	beforeAll(async () => {
		// Get a unique port for this test suite
		testPort = getRandomPort();
		baseUrl = `http://localhost:${testPort}`;

		// Start MongoDB container
		mongoContainer = await new GenericContainer("mongo:6.0.17")
			.withExposedPorts(27017)
			.withEnvironment({
				MONGO_INITDB_ROOT_USERNAME: "root",
				MONGO_INITDB_ROOT_PASSWORD: "root",
				MONGO_INITDB_DATABASE: "prosopo_test",
			})
			.start();

		// Start Redis container
		redisContainer = await new GenericContainer("redis/redis-stack:latest")
			.withExposedPorts(6379)
			.withEnvironment({
				REDIS_ARGS: "--requirepass root",
			})
			.start();

		const mongoHost = mongoContainer.getHost();
		const mongoPort = mongoContainer.getMappedPort(27017);
		const redisHost = redisContainer.getHost();
		const redisPort = redisContainer.getMappedPort(6379);

		const config = ProsopoConfigSchema.parse({
			defaultEnvironment: "development",
			host: `http://localhost:${testPort}`,
			account: {
				secret:
					process.env.PROVIDER_MNEMONIC ||
					"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			},
			authAccount: {
				secret:
					process.env.ADMIN_MNEMONIC ||
					"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			},
			database: {
				development: {
					type: DatabaseTypes.enum.provider,
					endpoint: `mongodb://root:root@${mongoHost}:${mongoPort}`,
					dbname: "prosopo_test",
					authSource: "admin",
				},
			},
			redisConnection: {
				url: `redis://:${encodeURIComponent("root")}@${redisHost}:${redisPort}`,
				password: "root",
				indexName: randomAsHex(16),
			},
			ipApi: {
				baseUrl: "https://dummyUrl.com",
				apiKey: "dummyKey",
			},
			server: {
				baseURL: "http://localhost",
				port: testPort,
			},
		});

		env = new ProviderEnvironment(config);
		await env.isReady();

		const db = env.getDb();

		// Wait until Redis is ready with retry logic
		const maxRetries = 10;
		let retries = 0;
		let redisReady = false;

		while (!redisReady && retries < maxRetries) {
			try {
				const client = await db.getRedisAccessRulesConnection().getClient();
				// Try a simple ping to verify connection
				await client.ping();
				redisReady = true;
				env.logger.info(() => ({ msg: "Redis connection verified" }));
			} catch (error) {
				retries++;
				env.logger.warn(() => ({
					msg: `Redis not ready, retrying... (${retries}/${maxRetries})`,
					err: error,
				}));
				if (retries < maxRetries) {
					await new Promise((resolve) => setTimeout(resolve, 1000));
				} else {
					throw new Error(
						`Redis failed to become ready after ${maxRetries} attempts`,
					);
				}
			}
		}

		// Setup provider dataset
		tasks = new Tasks(env);
		env.logger.info(() => ({ msg: "Setting up provider dataset" }));
		await tasks.datasetManager.providerSetDataset(datasetWithSolutionHashes);

		// Create a site key for testing
		[mnemonic, dappAccount] = await generateMnemonic();
		await registerSiteKeyInDb(env, dappAccount, CaptchaType.image);

		// Get admin JWT for authentication
		const adminPair = getPair(
			process.env.ADMIN_MNEMONIC ||
				"puppy cream effort carbon despair leg pyramid cotton endorse immense drill peasant",
			undefined,
			"sr25519",
			42,
		);
		adminJwt = adminPair.jwtIssue();

		// Start the provider API server
		env.logger.info(() => ({
			msg: `Starting provider API on port ${testPort}`,
		}));
		server = await startProviderApi(env, true, testPort);
	});

	afterAll(async () => {
		if (server) {
			await new Promise<void>((resolve, reject) => {
				server.close((err) => {
					if (err) reject(err);
					else resolve();
				});
			});
		}
		if (env) {
			await env.getDb().close();
		}
		if (mongoContainer) {
			await mongoContainer.stop();
		}
		if (redisContainer) {
			await redisContainer.stop();
		}
	});

	describe("getAllDecisionMachineArtifacts - _id field tests", () => {
		it("should return _id field for each decision machine in getAllDecisionMachines", async () => {
			// Create a test decision machine
			const testSource = `
				export default function decide(input) {
					return { decision: 'allow', reason: 'Test machine' };
				}
			`;

			const createResponse = await fetch(
				`${baseUrl}${AdminApiPaths.UpdateDecisionMachine}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Prosopo-Site-Key": dappAccount,
						Authorization: `Bearer ${adminJwt}`,
					},
					body: JSON.stringify({
						[ApiParams.decisionMachineScope]: DecisionMachineScope.Global,
						[ApiParams.decisionMachineRuntime]: DecisionMachineRuntime.Node,
						[ApiParams.decisionMachineSource]: testSource,
						[ApiParams.decisionMachineLanguage]:
							DecisionMachineLanguage.JavaScript,
						[ApiParams.decisionMachineName]: "Test Machine",
						[ApiParams.decisionMachineVersion]: "1.0.0",
					}),
				},
			);

			expect(createResponse.status).toBe(200);

			// Get all decision machines
			const getAllResponse = await fetch(
				`${baseUrl}${AdminApiPaths.GetAllDecisionMachines}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Prosopo-Site-Key": dappAccount,
						Authorization: `Bearer ${adminJwt}`,
					},
					body: JSON.stringify({}),
				},
			);

			expect(getAllResponse.status).toBe(200);

			const rawResponse = await getAllResponse.text();
			console.log("getAllDecisionMachines response:", rawResponse);

			const machines = JSON.parse(
				rawResponse,
			) as GetAllDecisionMachinesResponseType;

			// Verify that at least one machine exists
			expect(Array.isArray(machines)).toBe(true);
			expect(machines.length).toBeGreaterThan(0);

			// Verify that each machine has an _id field
			for (const machine of machines) {
				expect(machine).toHaveProperty("_id");
				expect(typeof machine._id).toBe("string");
				expect(machine._id.length).toBeGreaterThan(0);

				// Verify other required fields
				expect(machine).toHaveProperty("scope");
				expect(machine).toHaveProperty("runtime");
				expect(machine).toHaveProperty("createdAt");
				expect(machine).toHaveProperty("updatedAt");
			}

			// Find the machine we just created
			const createdMachine = machines.find(
				(m) =>
					m.scope === DecisionMachineScope.Global && m.name === "Test Machine",
			);
			expect(createdMachine).toBeDefined();
			expect(createdMachine?._id).toBeDefined();
			expect(createdMachine?.runtime).toBe(DecisionMachineRuntime.Node);
			expect(createdMachine?.language).toBe(DecisionMachineLanguage.JavaScript);
			expect(createdMachine?.version).toBe("1.0.0");
		});

		it("should return valid MongoDB ObjectId format for _id in getAllDecisionMachines", async () => {
			const getAllResponse = await fetch(
				`${baseUrl}${AdminApiPaths.GetAllDecisionMachines}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Prosopo-Site-Key": dappAccount,
						Authorization: `Bearer ${adminJwt}`,
					},
					body: JSON.stringify({}),
				},
			);

			const machines =
				(await getAllResponse.json()) as GetAllDecisionMachinesResponseType;
			expect(machines.length).toBeGreaterThan(0);

			// MongoDB ObjectId is a 24-character hex string
			const objectIdRegex = /^[0-9a-fA-F]{24}$/;

			for (const machine of machines) {
				expect(machine._id).toMatch(objectIdRegex);
			}
		});
	});

	describe("getDecisionMachineArtifactById - _id field tests", () => {
		it("should return _id when getting a specific decision machine by ID", async () => {
			// First, get all machines to get an ID
			const getAllResponse = await fetch(
				`${baseUrl}${AdminApiPaths.GetAllDecisionMachines}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Prosopo-Site-Key": dappAccount,
						Authorization: `Bearer ${adminJwt}`,
					},
					body: JSON.stringify({}),
				},
			);

			const allMachines =
				(await getAllResponse.json()) as GetAllDecisionMachinesResponseType;
			expect(allMachines.length).toBeGreaterThan(0);

			const firstMachine = allMachines[0];
			expect(firstMachine?._id).toBeDefined();

			// Get specific decision machine by ID
			const getByIdResponse = await fetch(
				`${baseUrl}${AdminApiPaths.GetDecisionMachine}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Prosopo-Site-Key": dappAccount,
						Authorization: `Bearer ${adminJwt}`,
					},
					body: JSON.stringify({
						id: firstMachine?._id,
					}),
				},
			);

			expect(getByIdResponse.status).toBe(200);

			const machine =
				(await getByIdResponse.json()) as GetDecisionMachineResponseType;

			// Verify _id is present and matches
			expect(machine).toHaveProperty("_id");
			expect(machine._id).toBe(firstMachine?._id);

			// Verify other fields
			expect(machine).toHaveProperty("scope");
			expect(machine).toHaveProperty("runtime");
			expect(machine).toHaveProperty("source"); // Full source should be included
			expect(machine).toHaveProperty("createdAt");
			expect(machine).toHaveProperty("updatedAt");

			// Verify the source field is present (not included in getAll)
			expect(typeof machine.source).toBe("string");
			expect(machine.source.length).toBeGreaterThan(0);
		});

		it("should verify _id persistence across multiple operations", async () => {
			// Create a new decision machine with specific properties
			const uniqueName = `Test Machine ${Date.now()}`;
			const testSource = `
				export default function decide(input) {
					return { decision: 'deny', reason: 'Test persistence' };
				}
			`;

			await fetch(`${baseUrl}${AdminApiPaths.UpdateDecisionMachine}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Prosopo-Site-Key": dappAccount,
					Authorization: `Bearer ${adminJwt}`,
				},
				body: JSON.stringify({
					[ApiParams.decisionMachineScope]: DecisionMachineScope.Global,
					[ApiParams.decisionMachineRuntime]: DecisionMachineRuntime.Node,
					[ApiParams.decisionMachineSource]: testSource,
					[ApiParams.decisionMachineName]: uniqueName,
					[ApiParams.decisionMachineVersion]: "2.0.0",
				}),
			});

			// Get all machines and find our new one
			const getAllResponse1 = await fetch(
				`${baseUrl}${AdminApiPaths.GetAllDecisionMachines}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Prosopo-Site-Key": dappAccount,
						Authorization: `Bearer ${adminJwt}`,
					},
					body: JSON.stringify({}),
				},
			);

			const machines1 =
				(await getAllResponse1.json()) as GetAllDecisionMachinesResponseType;
			const newMachine1 = machines1.find((m) => m.name === uniqueName);
			expect(newMachine1).toBeDefined();
			const machineId = newMachine1?._id;
			expect(machineId).toBeDefined();

			// Get the same machine by ID
			const getByIdResponse = await fetch(
				`${baseUrl}${AdminApiPaths.GetDecisionMachine}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Prosopo-Site-Key": dappAccount,
						Authorization: `Bearer ${adminJwt}`,
					},
					body: JSON.stringify({
						id: machineId,
					}),
				},
			);

			const machineById =
				(await getByIdResponse.json()) as GetDecisionMachineResponseType;
			expect(machineById._id).toBe(machineId);

			// Get all machines again and verify the ID is consistent
			const getAllResponse2 = await fetch(
				`${baseUrl}${AdminApiPaths.GetAllDecisionMachines}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Prosopo-Site-Key": dappAccount,
						Authorization: `Bearer ${adminJwt}`,
					},
					body: JSON.stringify({}),
				},
			);

			const machines2 =
				(await getAllResponse2.json()) as GetAllDecisionMachinesResponseType;
			const newMachine2 = machines2.find((m) => m.name === uniqueName);
			expect(newMachine2?._id).toBe(machineId);
		});

		it("should handle delete operations using _id correctly", async () => {
			// Create a machine to delete
			const deleteTestName = `Delete Test ${Date.now()}`;
			await fetch(`${baseUrl}${AdminApiPaths.UpdateDecisionMachine}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Prosopo-Site-Key": dappAccount,
					Authorization: `Bearer ${adminJwt}`,
				},
				body: JSON.stringify({
					[ApiParams.decisionMachineScope]: DecisionMachineScope.Global,
					[ApiParams.decisionMachineRuntime]: DecisionMachineRuntime.Node,
					[ApiParams.decisionMachineSource]:
						"export default function decide() {}",
					[ApiParams.decisionMachineName]: deleteTestName,
				}),
			});

			// Get all machines to find the ID
			const getAllResponse = await fetch(
				`${baseUrl}${AdminApiPaths.GetAllDecisionMachines}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Prosopo-Site-Key": dappAccount,
						Authorization: `Bearer ${adminJwt}`,
					},
					body: JSON.stringify({}),
				},
			);

			const machines =
				(await getAllResponse.json()) as GetAllDecisionMachinesResponseType;
			const machineToDelete = machines.find((m) => m.name === deleteTestName);
			expect(machineToDelete).toBeDefined();
			const machineId = machineToDelete?._id;

			// Delete using _id
			const deleteResponse = await fetch(
				`${baseUrl}${AdminApiPaths.RemoveDecisionMachine}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Prosopo-Site-Key": dappAccount,
						Authorization: `Bearer ${adminJwt}`,
					},
					body: JSON.stringify({
						id: machineId,
					}),
				},
			);

			expect(deleteResponse.status).toBe(200);
			const deleteResult =
				(await deleteResponse.json()) as RemoveDecisionMachineResponseType;
			expect(deleteResult.success).toBe(true);
			expect(deleteResult.deletedId).toBe(machineId);

			// Verify it's actually deleted
			const verifyResponse = await fetch(
				`${baseUrl}${AdminApiPaths.GetDecisionMachine}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Prosopo-Site-Key": dappAccount,
						Authorization: `Bearer ${adminJwt}`,
					},
					body: JSON.stringify({
						id: machineId,
					}),
				},
			);

			expect(verifyResponse.status).toBe(400); // Should fail - machine not found
		});
	});
});
