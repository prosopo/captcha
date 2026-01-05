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

import type { KeyringPair } from "@prosopo/types";
import type { ProsopoConfigOutput } from "@prosopo/types";
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

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
import { ProviderDatabase } from "@prosopo/database";
import { getPair } from "@prosopo/keyring";
import { Environment } from "./env.js";

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
			const env = new Environment(mockConfig);
			expect(env.config).toBe(mockConfig);
			expect(env.defaultEnvironment).toBe("development");
			expect(env.keyring).toBeDefined();
			expect(env.envId).toBeDefined();
			expect(env.envId).toHaveLength(32);
		});

		it("initializes environment with provided pair", () => {
			const env = new Environment(mockConfig, testPair);
			expect(env.pair).toBe(testPair);
		});

		it("initializes environment with authAccount", () => {
			const env = new Environment(mockConfig, testPair, testPair2);
			expect(env.authAccount).toBe(testPair2);
		});

		it("creates pair from config secret when pair not provided", () => {
			vi.mocked(getPair).mockReturnValue(testPair);
			const env = new Environment(mockConfig);
			expect(getPair).toHaveBeenCalledWith(mockConfig.account.secret);
		});

		it("adds pair to keyring when pair is provided", () => {
			const env = new Environment(mockConfig, testPair);
			expect(env.keyring).toBeDefined();
			expect(env.pair).toBe(testPair);
		});
	});

	describe("getSigner", () => {
		it("returns pair when pair is defined", async () => {
			const env = new Environment(mockConfig, testPair);
			const signer = await env.getSigner();
			expect(signer).toBe(testPair);
		});

		it("throws error when pair is undefined", async () => {
			const env = new Environment({
				...mockConfig,
				account: {},
			});
			env.pair = undefined;
			await expect(env.getSigner()).rejects.toThrow(ProsopoEnvError);
		});

		it("adds pair to keyring when getting signer", async () => {
			const env = new Environment(mockConfig, testPair);
			const addPairSpy = vi.spyOn(env.keyring, "addPair");
			await env.getSigner();
			expect(addPairSpy).toHaveBeenCalledWith(testPair);
		});

		it("throws error when adding pair to keyring fails", async () => {
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
			// @ts-expect-error - Mock resolver for testing
			const mockResolver = {};
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

	describe("isReady", () => {
		it("returns immediately when already ready", async () => {
			const env = new Environment(mockConfig, testPair);
			env.ready = true;
			await env.isReady();
			expect(env.ready).toBe(true);
		});

		it("unlocks pair when password is provided and pair is locked", async () => {
			// @ts-expect-error - Partial mock for testing
			const lockedPair = {
				...testPair,
				isLocked: true,
				unlock: vi.fn(),
			} as KeyringPair;
			const env = new Environment(
				{
					...mockConfig,
					account: {
						...mockConfig.account,
						password: "testpass",
					},
				},
				lockedPair,
			);
			env.db = undefined;
			await env.isReady();
			expect(lockedPair.unlock).toHaveBeenCalledWith("testpass");
		});

		it("does not unlock pair when password is not provided", async () => {
			const env = new Environment(mockConfig, testPair);
			testPair.lock();
			const unlockSpy = vi.spyOn(testPair, "unlock");
			env.db = undefined;
			await env.isReady();
			expect(unlockSpy).not.toHaveBeenCalled();
		});

		it("does not unlock pair when pair is not locked", async () => {
			const env = new Environment(
				{
					...mockConfig,
					account: {
						...mockConfig.account,
						password: "testpass",
					},
				},
				testPair,
			);
			const unlockSpy = vi.spyOn(testPair, "unlock");
			env.db = undefined;
			await env.isReady();
			expect(unlockSpy).not.toHaveBeenCalled();
		});

		it("calls getSigner", async () => {
			const env = new Environment(mockConfig, testPair);
			const getSignerSpy = vi.spyOn(env, "getSigner");
			env.db = undefined;
			await env.isReady();
			expect(getSignerSpy).toHaveBeenCalled();
		});

		it("imports database when db is undefined", async () => {
			const env = new Environment(mockConfig, testPair);
			const importDbSpy = vi.spyOn(env, "importDatabase").mockResolvedValue();
			await env.isReady();
			expect(importDbSpy).toHaveBeenCalled();
		});

		it("does not import database when db is already defined", async () => {
			const env = new Environment(mockConfig, testPair);
			// @ts-expect-error - Partial mock for testing
			const mockDb = {
				connected: true,
			};
			env.db = mockDb;
			const importDbSpy = vi.spyOn(env, "importDatabase");
			await env.isReady();
			expect(importDbSpy).not.toHaveBeenCalled();
		});

		it("connects to database when not connected", async () => {
			const env = new Environment(mockConfig, testPair);
			// @ts-expect-error - Partial mock for testing
			const mockDb = {
				connected: false,
				connect: vi.fn().mockResolvedValue(undefined),
			};
			env.db = mockDb;
			await env.isReady();
			expect(mockDb.connect).toHaveBeenCalled();
		});

		it("does not connect to database when already connected", async () => {
			const env = new Environment(mockConfig, testPair);
			// @ts-expect-error - Partial mock for testing
			const mockDb = {
				connected: true,
				connect: vi.fn(),
			};
			env.db = mockDb;
			await env.isReady();
			expect(mockDb.connect).not.toHaveBeenCalled();
		});

		it("sets ready to true on success", async () => {
			const env = new Environment(mockConfig, testPair);
			env.db = undefined;
			await env.isReady();
			expect(env.ready).toBe(true);
		});

		it("throws error when getSigner fails", async () => {
			const env = new Environment(mockConfig, testPair);
			vi.spyOn(env, "getSigner").mockRejectedValue(new Error("Signer error"));
			await expect(env.isReady()).rejects.toThrow(ProsopoEnvError);
		});

		it("throws error when importDatabase fails", async () => {
			const env = new Environment(mockConfig, testPair);
			vi.spyOn(env, "importDatabase").mockRejectedValue(
				new Error("Database error"),
			);
			await expect(env.isReady()).rejects.toThrow(ProsopoEnvError);
		});
	});

	describe("importDatabase", () => {
		it("creates and connects database when config has database", async () => {
			const mockDb = {
				connect: vi.fn().mockResolvedValue(undefined),
			};
			(ProviderDatabase as unknown as Mock).mockImplementation(() => mockDb);

			const env = new Environment(
				{
					...mockConfig,
					database: {
						development: {
							type: "mongo",
							endpoint: "mongodb://localhost:27017",
							dbname: "test",
							authSource: "admin",
						},
					},
				},
				testPair,
			);

			await env.importDatabase();
			expect(ProviderDatabase).toHaveBeenCalled();
			expect(mockDb.connect).toHaveBeenCalled();
			expect(env.db).toBe(mockDb);
		});

		it("does not create database when config has no database", async () => {
			const env = new Environment(
				{
					...mockConfig,
					database: undefined,
				},
				testPair,
			);

			await env.importDatabase();
			expect(ProviderDatabase).not.toHaveBeenCalled();
			expect(env.db).toBeUndefined();
		});

		it("does not create database when database config for environment is missing", async () => {
			const env = new Environment(
				{
					...mockConfig,
					database: {
						production: {
							type: "mongo",
							endpoint: "mongodb://localhost:27017",
							dbname: "test",
							authSource: "admin",
						},
					},
				},
				testPair,
			);

			await env.importDatabase();
			expect(ProviderDatabase).not.toHaveBeenCalled();
			expect(env.db).toBeUndefined();
		});

		it("throws error when database creation fails", async () => {
			(ProviderDatabase as unknown as Mock).mockImplementation(() => {
				throw new Error("Database creation failed");
			});

			const env = new Environment(
				{
					...mockConfig,
					database: {
						development: {
							type: "mongo",
							endpoint: "mongodb://localhost:27017",
							dbname: "test",
							authSource: "admin",
						},
					},
				},
				testPair,
			);

			await expect(env.importDatabase()).rejects.toThrow(ProsopoEnvError);
		});

		it("throws error when database connection fails", async () => {
			const mockDb = {
				connect: vi.fn().mockRejectedValue(new Error("Connection failed")),
			};
			(ProviderDatabase as unknown as Mock).mockImplementation(() => mockDb);

			const env = new Environment(
				{
					...mockConfig,
					database: {
						development: {
							type: "mongo",
							endpoint: "mongodb://localhost:27017",
							dbname: "test",
							authSource: "admin",
						},
					},
				},
				testPair,
			);

			await expect(env.importDatabase()).rejects.toThrow(ProsopoEnvError);
		});
	});
});
