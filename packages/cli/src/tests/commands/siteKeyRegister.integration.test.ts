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
import { describe, expect, test, beforeAll, afterAll } from "vitest";
import commandSiteKeyRegister from "../../commands/siteKeyRegister.js";
import { TestContainers, setupTestContainers, teardownTestContainers } from "../testcontainers.js";

/**
 * Integration test for siteKeyRegister command using real MongoDB container
 * This tests the actual site key registration functionality with database operations
 */
describe("siteKeyRegister command - integration", () => {
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

	test("should successfully register a site key", async () => {
		// Generate proper mnemonics for key pairs
		const [providerMnemonic, providerAddress] = await generateMnemonic();

		// Create test configuration with real MongoDB URI
		const config = {
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
		} as any as ProsopoConfigOutput;

		// Create keyring pairs
		const pair = getPair(config.account.secret, config.account.address);

		// Create logger
		const logger: ReturnType<typeof getLogger> = getLogger(
			LogLevel.enum.info,
			"cli.site_key_register_integration",
		);

		// Execute the site key register command with test parameters
		const command = commandSiteKeyRegister(pair, config, { logger });

		// Mock argv for the command handler
		const argv = {
			sitekey: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
			tier: "free" as const,
			captcha_type: "image",
			frictionless_threshold: 0.5,
			pow_difficulty: 1000,
			domains: ["example.com"],
			image_threshold: 0.8,
		};

		// This should not throw an error - the command handles environment setup internally
		await expect(command.handler(argv as any)).resolves.not.toThrow();
	}, 30000); // 30 second timeout for database operations

	test("should handle missing mongoCaptchaUri gracefully", async () => {
		// Generate proper mnemonic for key pair
		const [providerMnemonic, providerAddress] = await generateMnemonic();

		// Create test configuration without MongoDB URI
		const config = {
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
		} as any as ProsopoConfigOutput;

		const pair = getPair(config.account.secret, config.account.address);
		const logger: ReturnType<typeof getLogger> = getLogger(
			LogLevel.enum.error,
			"cli.site_key_register_error_test",
		);

		// Execute the command with test parameters
		const command = commandSiteKeyRegister(pair, config, { logger });
		const argv = {
			sitekey: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
			tier: "free" as const,
		};

		// The command should not throw, but log an error
		await expect(command.handler(argv as any)).resolves.not.toThrow();
	}, 30000);
});