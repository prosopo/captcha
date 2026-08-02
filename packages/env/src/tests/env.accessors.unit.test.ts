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

// Covers the accessors and the non-maintenance branches of Environment:
// getSigner/getDb/getAssetsResolver/getPair guards, buildDatabase's
// missing-config paths, the isReady short-circuits, dataset resolution, and
// importDatabase error wrapping.

import type { AssetsResolver, KeyringPair } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockDb = {
	connect: () => Promise<void>;
	connected: boolean;
	connection: { readyState: number };
	getMostRecentDatasetId: () => Promise<string | undefined>;
};

const { mockProviderDatabase, mockIpInfoInit, mockAddPair, mockGetPair } =
	vi.hoisted(() => ({
		mockProviderDatabase: vi.fn(),
		mockIpInfoInit: vi.fn<() => Promise<void>>(),
		mockAddPair: vi.fn(),
		mockGetPair: vi.fn(),
	}));

vi.mock("@prosopo/database", () => ({
	ProviderDatabase: mockProviderDatabase,
}));

vi.mock("@prosopo/ipinfo", () => ({
	IpInfoService: vi.fn().mockImplementation(function () {
		return { initialize: mockIpInfoInit };
	}),
}));

vi.mock("@prosopo/keyring", () => ({
	Keyring: vi.fn().mockImplementation(function () {
		return { addPair: mockAddPair };
	}),
	getPair: mockGetPair,
}));

import { Environment } from "../env.js";

type Config = {
	defaultEnvironment: string;
	logLevel: string;
	account: { secret: string; password?: string };
	database?: Record<
		string,
		| {
				endpoint: string;
				dbname: string;
				authSource: string;
				type: string;
		  }
		| undefined
	>;
	redisConnection: { url: string; password: string };
	maxmindDbPath?: string;
	ipApi?: { baseUrl: string; apiKey: string };
};

const buildConfig = (overrides: Partial<Config> = {}): Config => ({
	defaultEnvironment: "test",
	logLevel: "info",
	account: { secret: "//Alice", password: undefined },
	database: {
		test: {
			endpoint: "mongodb://127.0.0.1:27017",
			dbname: "test",
			authSource: "admin",
			type: "mongo",
		},
	},
	redisConnection: { url: "redis://localhost", password: "" },
	maxmindDbPath: undefined,
	ipApi: undefined,
	...overrides,
});

const stubPair = (overrides: Partial<KeyringPair> = {}): KeyringPair =>
	({
		address: "addr",
		isLocked: false,
		unlock: vi.fn(),
		...overrides,
	}) as unknown as KeyringPair;

const buildEnv = (config: Config = buildConfig()): Environment => {
	const env = new Environment(config as never, stubPair() as never);
	env.logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	} as never;
	return env;
};

const mockDb = (overrides: Partial<MockDb> = {}): MockDb => ({
	connect: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
	connected: true,
	connection: { readyState: 1 },
	getMostRecentDatasetId: vi
		.fn<() => Promise<string | undefined>>()
		.mockResolvedValue("0xdataset"),
	...overrides,
});

beforeEach(() => {
	mockProviderDatabase.mockReset();
	mockIpInfoInit.mockReset();
	mockIpInfoInit.mockResolvedValue(undefined);
	mockAddPair.mockReset();
	mockAddPair.mockImplementation((pair: KeyringPair) => pair);
	mockGetPair.mockReset();
	mockGetPair.mockImplementation(() => stubPair());
	delete process.env.MAINTENANCE_MODE;
});

afterEach(() => {
	delete process.env.MAINTENANCE_MODE;
});

describe("Environment construction", () => {
	it("derives the pair from the config secret when none is supplied", () => {
		const env = new Environment(buildConfig() as never);

		expect(mockGetPair).toHaveBeenCalledWith("//Alice");
		expect(env.getPair()).toBeDefined();
	});

	it("registers the supplied pair with the keyring", () => {
		buildEnv();

		expect(mockAddPair).toHaveBeenCalled();
	});

	it("assigns a 32 character env id", () => {
		expect(buildEnv().envId).toHaveLength(32);
	});
});

describe("Environment accessors", () => {
	it("throws from getDb before the DB is set up", () => {
		expect(() => buildEnv().getDb()).toThrow();
	});

	it("returns the db once it is set", () => {
		const env = buildEnv();
		const db = mockDb();
		env.db = db as never;

		expect(env.getDb()).toBe(db);
	});

	it("throws from getAssetsResolver before it is set up", () => {
		expect(() => buildEnv().getAssetsResolver()).toThrow();
	});

	it("returns the assets resolver once it is set", () => {
		const env = buildEnv();
		const resolver = {} as AssetsResolver;
		env.assetsResolver = resolver;

		expect(env.getAssetsResolver()).toBe(resolver);
	});

	it("throws from getPair when there is no pair", () => {
		const env = buildEnv();
		env.pair = undefined;

		expect(() => env.getPair()).toThrow();
	});

	it("throws from getSigner when there is no pair", async () => {
		const env = buildEnv();
		env.pair = undefined;

		await expect(env.getSigner()).rejects.toMatchObject({
			translationKey: "CONTRACT.SIGNER_UNDEFINED",
		});
	});

	it("wraps a keyring failure from getSigner", async () => {
		const env = buildEnv();
		mockAddPair.mockImplementation(() => {
			throw new Error("bad pair");
		});

		await expect(env.getSigner()).rejects.toMatchObject({
			translationKey: "CONTRACT.SIGNER_UNDEFINED",
		});
	});

	it("returns the re-registered pair from getSigner", async () => {
		const env = buildEnv();
		const registered = stubPair({ address: "registered" });
		mockAddPair.mockImplementation(() => registered);

		await expect(env.getSigner()).resolves.toBe(registered);
	});
});

describe("Environment.buildDatabase", () => {
	it("returns undefined when no database is configured at all", () => {
		const env = buildEnv(buildConfig({ database: undefined }));

		expect(env.buildDatabase()).toBeUndefined();
		expect(mockProviderDatabase).not.toHaveBeenCalled();
	});

	it("returns undefined when the current environment has no database", () => {
		const env = buildEnv(buildConfig({ database: { other: undefined } }));

		expect(env.buildDatabase()).toBeUndefined();
	});

	it("passes the mongo and redis config through to the database", () => {
		mockProviderDatabase.mockImplementation(function () {
			return mockDb();
		});

		buildEnv().buildDatabase();

		expect(mockProviderDatabase.mock.calls[0]?.[0]).toMatchObject({
			mongo: {
				url: "mongodb://127.0.0.1:27017",
				dbname: "test",
				authSource: "admin",
			},
			redis: { url: "redis://localhost", password: "" },
		});
	});
});

describe("Environment.importDatabase", () => {
	it("wraps a construction failure in a DATABASE_IMPORT_FAILED error", async () => {
		mockProviderDatabase.mockImplementation(function () {
			throw new Error("bad config");
		});

		await expect(buildEnv().importDatabase()).rejects.toMatchObject({
			translationKey: "DATABASE.DATABASE_IMPORT_FAILED",
		});
	});

	it("is a no-op when there is no database configured", async () => {
		const env = buildEnv(buildConfig({ database: undefined }));

		await expect(env.importDatabase()).resolves.toBeUndefined();
		expect(env.db).toBeUndefined();
	});
});

describe("Environment.isReady", () => {
	it("returns immediately when already ready", async () => {
		const env = buildEnv();
		env.ready = true;

		await env.isReady();

		expect(mockProviderDatabase).not.toHaveBeenCalled();
		expect(mockIpInfoInit).not.toHaveBeenCalled();
	});

	it("unlocks a locked pair using the configured password", async () => {
		const unlock = vi.fn();
		const config = buildConfig({
			account: { secret: "//Alice", password: "hunter2" },
		});
		const env = buildEnv(config);
		env.pair = stubPair({ isLocked: true, unlock });
		mockProviderDatabase.mockImplementation(function () {
			return mockDb();
		});

		await env.isReady();

		expect(unlock).toHaveBeenCalledWith("hunter2");
	});

	it("resolves and records the most recent dataset id", async () => {
		mockProviderDatabase.mockImplementation(function () {
			return mockDb();
		});

		const env = buildEnv();
		await env.isReady();

		expect(env.datasetId).toBe("0xdataset");
	});

	it("warns but stays ready when there are no datasets", async () => {
		mockProviderDatabase.mockImplementation(function () {
			return mockDb({
				getMostRecentDatasetId: vi
					.fn<() => Promise<string | undefined>>()
					.mockResolvedValue(undefined),
			});
		});

		const env = buildEnv();
		await env.isReady();

		expect(env.ready).toBe(true);
		expect(env.datasetId).toBeUndefined();
		expect(env.logger.warn).toHaveBeenCalled();
	});

	it("tolerates a failing dataset lookup", async () => {
		mockProviderDatabase.mockImplementation(function () {
			return mockDb({
				getMostRecentDatasetId: vi
					.fn<() => Promise<string | undefined>>()
					.mockRejectedValue(new Error("mongo down")),
			});
		});

		const env = buildEnv();
		await env.isReady();

		expect(env.ready).toBe(true);
		expect(env.logger.warn).toHaveBeenCalled();
	});

	it("reconnects an existing but disconnected database", async () => {
		const connect = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
		const env = buildEnv();
		env.db = mockDb({
			connect,
			connected: false,
			connection: { readyState: 0 },
		}) as never;

		await env.isReady();

		expect(connect).toHaveBeenCalledTimes(1);
		// the handle already existed, so no new database is constructed
		expect(mockProviderDatabase).not.toHaveBeenCalled();
		expect(env.ready).toBe(true);
	});

	it("leaves an already connected database alone", async () => {
		const connect = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
		const env = buildEnv();
		env.db = mockDb({ connect }) as never;

		await env.isReady();

		expect(connect).not.toHaveBeenCalled();
	});

	it("skips the dataset lookup once a dataset id is known", async () => {
		const getMostRecentDatasetId = vi
			.fn<() => Promise<string | undefined>>()
			.mockResolvedValue("0xother");
		const env = buildEnv();
		env.db = mockDb({ getMostRecentDatasetId }) as never;
		env.datasetId = "0xalready";

		await env.isReady();

		expect(getMostRecentDatasetId).not.toHaveBeenCalled();
		expect(env.datasetId).toBe("0xalready");
	});

	it("wraps an ip info initialisation failure", async () => {
		mockProviderDatabase.mockImplementation(function () {
			return mockDb();
		});
		mockIpInfoInit.mockRejectedValue(new Error("maxmind missing"));

		await expect(buildEnv().isReady()).rejects.toMatchObject({
			translationKey: "GENERAL.ENVIRONMENT_NOT_READY",
		});
	});

	it("does not build a database when none is configured", async () => {
		const env = buildEnv(buildConfig({ database: undefined }));

		await env.isReady();

		expect(env.ready).toBe(true);
		expect(env.db).toBeUndefined();
	});
});

describe("Environment.connectDatabaseInBackground", () => {
	it("does nothing when no database is configured", () => {
		const env = buildEnv(buildConfig({ database: undefined }));

		env.connectDatabaseInBackground();

		expect(env.db).toBeUndefined();
	});

	it("warns rather than throwing when the handle cannot be built", () => {
		mockProviderDatabase.mockImplementation(function () {
			throw new Error("bad config");
		});
		const env = buildEnv();

		expect(() => env.connectDatabaseInBackground()).not.toThrow();
		expect(env.logger.warn).toHaveBeenCalled();
		expect(env.db).toBeUndefined();
	});
});
