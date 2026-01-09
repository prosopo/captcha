// Copyright 2021-2025 Prosopo (UK) Ltd.
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
import { ProviderEnvironment } from "@prosopo/env";
import { getPair } from "@prosopo/keyring";
import type { KeyringPair, ProsopoConfigOutput } from "@prosopo/types";
import { describe, expect, test, beforeAll, afterAll } from "vitest";
import commandEnsureIndexes from "../../commands/ensureIndexes.js";
import { TestContainers, setupTestContainers, teardownTestContainers } from "../testcontainers.js";

/**
 * Integration test for ensureIndexes command using real MongoDB container
 * This tests the actual database index creation functionality
 */
describe("ensureIndexes command - integration", () => {
	let mongoUri: string;

	beforeAll(async () => {
		// Start MongoDB container for integration testing
		await setupTestContainers();
		mongoUri = TestContainers.getMongoDBConnectionString();
	}, 60000); // 60 second timeout for container startup

	afterAll(async () => {
		// Clean up containers
		await teardownTestContainers();
	}, 30000);

	test("should successfully create database indexes", async () => {
		// Create test configuration with real MongoDB URI
		const config: ProsopoConfigOutput = {
			logLevel: LogLevel.enum.info,
			account: {
				address: "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8",
				secret: "0x1234567890abcdef",
			},
			authAccount: {
				address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
				secret: "0xabcdef1234567890",
			},
			server: {
				port: 9229,
			},
			mongoCaptchaUri: mongoUri,
			database: {
				uri: mongoUri,
			},
			scheduledTasks: {},
			networks: {
				substrate: {
					endpoint: "wss://archive.substrate.network",
				},
			},
		} as ProsopoConfigOutput;

		// Create keyring pairs
		const pair = getPair(config.account.secret, config.account.address);
		const authAccount = getPair(
			config.authAccount.secret,
			config.authAccount.address,
		);

		// Create logger
		const logger = getLogger(LogLevel.enum.info, "cli.ensure_indexes_integration");

		// Execute the ensure indexes command
		const command = commandEnsureIndexes(pair, config, { logger });

		// This should not throw an error
		await expect(command.handler()).resolves.not.toThrow();

		// Verify that the environment can be created and is ready
		const env = new ProviderEnvironment(config, pair, authAccount);
		await expect(env.isReady()).resolves.not.toThrow();

		// Clean up
		await env.cleanup();
	}, 30000); // 30 second timeout for database operations

	test("should handle missing mongoCaptchaUri gracefully", async () => {
		// Create test configuration without MongoDB URI
		const config: ProsopoConfigOutput = {
			logLevel: LogLevel.enum.info,
			account: {
				address: "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8",
				secret: "0x1234567890abcdef",
			},
			// mongoCaptchaUri is intentionally omitted
			database: {
				uri: mongoUri,
			},
			scheduledTasks: {},
			networks: {
				substrate: {
					endpoint: "wss://archive.substrate.network",
				},
			},
		} as ProsopoConfigOutput;

		const pair = getPair(config.account.secret, config.account.address);
		const logger = getLogger(LogLevel.enum.error, "cli.ensure_indexes_error_test");

		// Execute the command - this should handle the error gracefully
		const command = commandEnsureIndexes(pair, config, { logger });

		// The command should not throw, but log an error
		await expect(command.handler()).resolves.not.toThrow();
	}, 30000);
});