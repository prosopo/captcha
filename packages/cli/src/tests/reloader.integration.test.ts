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
import type { ProsopoConfigOutput } from "@prosopo/types";
import { describe, expect, test, beforeAll, afterAll, vi } from "vitest";
import getConfig from "../prosopo.config.js";
import ReloadingAPI from "../reloader.js";
import { TestContainers, setupTestContainers, teardownTestContainers } from "./testcontainers.js";

/**
 * Integration tests for ReloadingAPI class
 * Tests the API server lifecycle with real databases
 */
describe("ReloadingAPI - integration", () => {
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

	test("should start and stop API server successfully", async () => {
		// Generate proper mnemonics for key pairs
		const [providerMnemonic, providerAddress] = await generateMnemonic();
		const [authMnemonic, authAddress] = await generateMnemonic();

		// Create test configuration
		const config = {
			logLevel: LogLevel.enum.info,
			account: {
				address: providerAddress,
				secret: providerMnemonic,
			},
			authAccount: {
				address: authAddress,
				secret: authMnemonic,
			},
			server: {
				port: 0, // Use port 0 for automatic assignment
			},
			mongoCaptchaUri: mongoUri,
			database: {
				uri: mongoUri,
			},
			redisConnection: {
				url: redisUri,
				password: "testpass",
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
		const authAccount = getPair(config.authAccount.secret, config.authAccount.address);

		// Create processed args for API mode
		const processedArgs = {
			api: true,
			adminApi: false,
			_: [],
			$0: "cli.js",
		};

		// Create ReloadingAPI instance
		const reloadingAPI = new ReloadingAPI("/tmp", config, pair, authAccount, processedArgs);

		// Test starting the API
		await expect(reloadingAPI.start()).resolves.not.toThrow();

		// Test stopping the API
		await expect(reloadingAPI.stop()).resolves.not.toThrow();
	}, 60000); // 60 second timeout for full server lifecycle

	test("should reload environment when requested", async () => {
		// Generate proper mnemonics for key pairs
		const [providerMnemonic, providerAddress] = await generateMnemonic();
		const [authMnemonic, authAddress] = await generateMnemonic();

		// Create test configuration
		const config = {
			logLevel: LogLevel.enum.info,
			account: {
				address: providerAddress,
				secret: providerMnemonic,
			},
			authAccount: {
				address: authAddress,
				secret: authMnemonic,
			},
			server: {
				port: 0,
			},
			mongoCaptchaUri: mongoUri,
			database: {
				uri: mongoUri,
			},
			redisConnection: {
				url: redisUri,
				password: "testpass",
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
		const authAccount = getPair(config.authAccount.secret, config.authAccount.address);

		// Create processed args
		const processedArgs = {
			api: true,
			adminApi: false,
			_: [],
			$0: "cli.js",
		};

		// Create ReloadingAPI instance
		const reloadingAPI = new ReloadingAPI("/tmp", config, pair, authAccount, processedArgs);

		// Start the API initially
		await reloadingAPI.start();

		// Reload environment
		await expect(reloadingAPI.start(true)).resolves.not.toThrow();

		// Stop the API
		await reloadingAPI.stop();
	}, 60000);

	test("should handle environment access before initialization", () => {
		// Create ReloadingAPI instance without starting
		const reloadingAPI = new ReloadingAPI("/tmp", {} as any, {} as any, {} as any, {
			api: false,
			_: [],
			$0: "cli.js",
		});

		// Accessing env before start should throw
		expect(() => reloadingAPI.env).toThrow("Environment not initialized");
	}, 5000);

	test("should handle stop when API not started", async () => {
		// Create ReloadingAPI instance without starting
		const reloadingAPI = new ReloadingAPI("/tmp", {} as any, {} as any, {} as any, {
			api: false,
			_: [],
			$0: "cli.js",
		});

		// Stopping when not started should not throw
		await expect(reloadingAPI.stop()).resolves.not.toThrow();
	}, 5000);
});