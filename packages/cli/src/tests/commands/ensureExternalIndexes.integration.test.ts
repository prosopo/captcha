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
import { generateMnemonic, getPair } from "@prosopo/keyring";
import type { ProsopoConfigOutput } from "@prosopo/types";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import commandEnsureExternalIndexes from "../../commands/ensureExternalIndexes.js";
import {
	TestContainers,
	setupTestContainers,
	teardownTestContainers,
} from "../testcontainers.js";

/**
 * Integration test for ensureExternalIndexes command using real MongoDB container
 * This tests the actual external database index creation functionality
 */
describe("ensureExternalIndexes command - integration", () => {
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

	test("should successfully create external database indexes", async () => {
		// Generate proper mnemonics for key pairs
		const [providerMnemonic, providerAddress] = await generateMnemonic();

		// Create test configuration with real MongoDB URI
		const config: ProsopoConfigOutput = {
			logLevel: LogLevel.enum.info,
			account: {
				address: providerAddress,
				secret: providerMnemonic,
			},
			authAccount: {
				address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty", // Using fixed address for auth account
				secret: providerMnemonic, // Reuse mnemonic for simplicity
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

		// Create logger
		const logger: ReturnType<typeof getLogger> = getLogger(
			LogLevel.enum.info,
			"cli.ensure_external_indexes_integration",
		);

		// Execute the ensure external indexes command
		const command = commandEnsureExternalIndexes(pair, config, { logger });

		// This should not throw an error
		await expect(command.handler()).resolves.not.toThrow();

		// Verify that the environment can be created and is ready
		const env = new ProviderEnvironment(config, pair);
		await expect(env.isReady()).resolves.not.toThrow();

		// Clean up
		await env.cleanup();
	}, 30000); // 30 second timeout for database operations

	test("should handle missing mongoCaptchaUri gracefully", async () => {
		// Generate proper mnemonic for key pair
		const [providerMnemonic, providerAddress] = await generateMnemonic();

		// Create test configuration without MongoDB URI
		const config: ProsopoConfigOutput = {
			logLevel: LogLevel.enum.info,
			account: {
				address: providerAddress,
				secret: providerMnemonic,
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
		const logger: ReturnType<typeof getLogger> = getLogger(
			LogLevel.enum.error,
			"cli.ensure_external_indexes_error_test",
		);

		// Execute the command - this should handle the error gracefully
		const command = commandEnsureExternalIndexes(pair, config, { logger });

		// The command should not throw, but log an error
		await expect(command.handler()).resolves.not.toThrow();
	}, 30000);
});
