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
import { generateMnemonic, getPair } from "@prosopo/keyring";
import { describe, expect, test, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { processArgs } from "../argv.js";
import getConfig from "../prosopo.config.js";
import { TestContainers, setupTestContainers, teardownTestContainers } from "./testcontainers.js";

/**
 * Integration tests for the main CLI functionality
 * Tests different execution paths and error scenarios
 */
describe("CLI main functionality - integration", () => {
	let mongoUri: string;
	let redisUri: string;

	beforeAll(async () => {
		// Start containers for integration testing
		await setupTestContainers();
		mongoUri = TestContainers.getMongoDBConnectionString();
		redisUri = TestContainers.getRedisConnectionString();
	}, 60000);

	afterAll(async () => {
		// Clean up containers
		await teardownTestContainers();
	}, 30000);

	beforeEach(() => {
		// Reset environment variables for each test
		delete process.env.PROSOPO_DATABASE_HOST;
		delete process.env.PROSOPO_REDIS_URL;
		delete process.env.PROSOPO_PROVIDER_ADDRESS;
		delete process.env.PROSOPO_PROVIDER_MNEMONIC;
		delete process.env.PROSOPO_AUTH_ACCOUNT_ADDRESS;
		delete process.env.PROSOPO_AUTH_ACCOUNT_MNEMONIC;
	});

	test("should process CLI args correctly for command execution", async () => {
		// Set up environment variables
		process.env.PROSOPO_DATABASE_HOST = "localhost";
		process.env.PROSOPO_REDIS_URL = redisUri;
		process.env.PROSOPO_PROVIDER_MNEMONIC = "test test test test test test test test test test test junk";
		process.env.PROSOPO_PROVIDER_ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8";
		process.env.PROSOPO_AUTH_ACCOUNT_MNEMONIC = "test test test test test test test test test test test junk";
		process.env.PROSOPO_AUTH_ACCOUNT_ADDRESS = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

		// Create test config
		const config = getConfig();

		// Create key pairs
		const pair = getPair(config.account.secret, config.account.address);
		const authAccount = getPair(config.authAccount.secret, config.authAccount.address);

		// Test processing args for version command
		const args = ["node", "cli.js", "version"];
		const processedArgs = await processArgs(args, pair, authAccount, config);

		expect(processedArgs).toHaveProperty("_");
		expect(processedArgs._).toContain("version");
		expect(processedArgs).toHaveProperty("api", false);
	}, 10000);

	test("should process CLI args correctly for API mode", async () => {
		// Set up environment variables
		process.env.PROSOPO_DATABASE_HOST = "localhost";
		process.env.PROSOPO_REDIS_URL = redisUri;
		process.env.PROSOPO_PROVIDER_MNEMONIC = "test test test test test test test test test test test junk";
		process.env.PROSOPO_PROVIDER_ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8";
		process.env.PROSOPO_AUTH_ACCOUNT_MNEMONIC = "test test test test test test test test test test test junk";
		process.env.PROSOPO_AUTH_ACCOUNT_ADDRESS = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

		// Create test config
		const config = getConfig();

		// Create key pairs
		const pair = getPair(config.account.secret, config.account.address);
		const authAccount = getPair(config.authAccount.secret, config.authAccount.address);

		// Test processing args for API mode
		const args = ["node", "cli.js", "--api"];
		const processedArgs = await processArgs(args, pair, authAccount, config);

		expect(processedArgs).toHaveProperty("api", true);
		expect(processedArgs).toHaveProperty("_");
		expect(processedArgs._).toEqual([]);
	}, 10000);

	test("should handle invalid CLI arguments gracefully", async () => {
		// Set up environment variables
		process.env.PROSOPO_DATABASE_HOST = "localhost";
		process.env.PROSOPO_REDIS_URL = redisUri;
		process.env.PROSOPO_PROVIDER_MNEMONIC = "test test test test test test test test test test test junk";
		process.env.PROSOPO_PROVIDER_ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8";
		process.env.PROSOPO_AUTH_ACCOUNT_MNEMONIC = "test test test test test test test test test test test junk";
		process.env.PROSOPO_AUTH_ACCOUNT_ADDRESS = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

		// Create test config
		const config = getConfig();

		// Create key pairs
		const pair = getPair(config.account.secret, config.account.address);
		const authAccount = getPair(config.authAccount.secret, config.authAccount.address);

		// Test processing args with invalid command
		const args = ["node", "cli.js", "invalid-command"];
		const processedArgs = await processArgs(args, pair, authAccount, config);

		expect(processedArgs).toHaveProperty("_");
		expect(processedArgs._).toContain("invalid-command");
	}, 10000);

	test("should handle environment variable errors gracefully", async () => {
		// Don't set required environment variables to test error handling
		// This should not crash but handle missing env vars appropriately

		expect(() => {
			// This should throw due to missing database host
			getConfig();
		}).toThrow();
	}, 5000);
});