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
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@prosopo/database", () => ({
	ProviderDatabase: vi.fn(),
}));

vi.mock("@prosopo/keyring", async () => {
	const actual = await vi.importActual("@prosopo/keyring");
	const mockKeyring = {
		addPair: vi.fn((pair) => pair),
		getPairs: vi.fn(() => []),
		encodeAddress: vi.fn(
			(key) => "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		),
	};
	return {
		...actual,
		Keyring: vi.fn(() => mockKeyring),
		getPair: vi.fn(),
	};
});

import { ProsopoEnvError } from "@prosopo/common";
import type { ProviderDatabase } from "@prosopo/database";
import { getPair } from "@prosopo/keyring";
import { Environment } from "./env.js";

/**
 * Unit tests for Environment class
 * These tests focus on constructor validation, basic property access,
 * and error conditions that don't require database connections.
 * Integration tests cover full lifecycle with real databases.
 */
describe("Environment", () => {
	let mockConfig: ProsopoConfigOutput;
	let testPair: KeyringPair;
	let testPair2: KeyringPair;

	beforeEach(() => {
		vi.clearAllMocks();

		// @ts-expect-error - Partial mock for testing
		testPair = {
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			publicKey: new Uint8Array(32).fill(1),
			meta: {},
			isLocked: false,
			lock: vi.fn(),
			unlock: vi.fn(),
		} as KeyringPair;

		// @ts-expect-error - Partial mock for testing
		testPair2 = {
			address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
			publicKey: new Uint8Array(32).fill(2),
			meta: {},
			isLocked: false,
			lock: vi.fn(),
			unlock: vi.fn(),
		} as KeyringPair;

		mockConfig = {
			logLevel: "info",
			defaultEnvironment: "development",
			account: {
				secret:
					"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
			},
			host: "http://localhost:9229",
			ipApi: {
				apiKey: "test-key",
				baseUrl: "https://api.test.com",
			},
			redisConnection: {
				url: "redis://localhost:6379",
				password: "root",
			},
		} as ProsopoConfigOutput;
	});

	describe("constructor", () => {
		it("initializes environment with config", () => {
			// Test: Basic constructor validation - covered by integration tests but kept for quick validation
			const env = new Environment(mockConfig);
			expect(env.config).toBe(mockConfig);
			expect(env.defaultEnvironment).toBe("development");
			expect(env.keyring).toBeDefined();
			expect(env.envId).toBeDefined();
			expect(env.envId).toHaveLength(32);
			expect(env.ready).toBe(false);
		});

		it("initializes environment with provided pair", () => {
			// Test: Constructor parameter handling
			const env = new Environment(mockConfig, testPair);
			expect(env.pair).toBe(testPair);
		});

		it("initializes environment with authAccount", () => {
			// Test: Constructor parameter handling
			const env = new Environment(mockConfig, testPair, testPair2);
			expect(env.authAccount).toBe(testPair2);
		});

		it("creates pair from config secret when pair not provided", () => {
			// Test: Keyring integration for pair creation
			vi.mocked(getPair).mockReturnValue(testPair);
			const env = new Environment(mockConfig);
			expect(getPair).toHaveBeenCalledWith(mockConfig.account.secret);
		});

		it("adds pair to keyring when pair is provided", () => {
			// Test: Keyring integration
			const env = new Environment(mockConfig, testPair);
			expect(env.keyring).toBeDefined();
			expect(env.pair).toBe(testPair);
		});
	});

	describe("getSigner", () => {
		it("throws error when pair is undefined", async () => {
			// Test: Error case for undefined pair - basic validation covered by integration tests
			const env = new Environment({
				...mockConfig,
				account: {},
			});
			env.pair = undefined;
			await expect(env.getSigner()).rejects.toThrow(ProsopoEnvError);
		});

		it("throws error when adding pair to keyring fails", async () => {
			// Test: Error case for keyring failure - basic validation
			const env = new Environment(mockConfig, testPair);
			const originalAddPair = env.keyring.addPair;
			env.keyring.addPair = vi.fn(() => {
				throw new Error("Failed to add pair");
			});
			await expect(env.getSigner()).rejects.toThrow(ProsopoEnvError);
			env.keyring.addPair = originalAddPair;
		});
	});

	describe("getDb", () => {
		it("returns database when db is defined", () => {
			const env = new Environment(mockConfig);
			const mockDb = {} as ProviderDatabase;
			env.db = mockDb;
			expect(env.getDb()).toBe(mockDb);
		});

		it("throws error when db is undefined", () => {
			const env = new Environment(mockConfig);
			env.db = undefined;
			expect(() => env.getDb()).toThrow(ProsopoEnvError);
		});
	});

	describe("getAssetsResolver", () => {
		it("returns assetsResolver when defined", () => {
			const env = new Environment(mockConfig);
			const mockResolver = {} as any; // Mock resolver for testing
			env.assetsResolver = mockResolver;
			expect(env.getAssetsResolver()).toBe(mockResolver);
		});

		it("throws error when assetsResolver is undefined", () => {
			const env = new Environment(mockConfig);
			env.assetsResolver = undefined;
			expect(() => env.getAssetsResolver()).toThrow(ProsopoEnvError);
		});
	});

	describe("getPair", () => {
		it("returns pair when pair is defined", () => {
			const env = new Environment(mockConfig, testPair);
			expect(env.getPair()).toBe(testPair);
		});

		it("throws error when pair is undefined", () => {
			const env = new Environment({
				...mockConfig,
				account: {},
			});
			env.pair = undefined;
			expect(() => env.getPair()).toThrow(ProsopoEnvError);
		});
	});
});
