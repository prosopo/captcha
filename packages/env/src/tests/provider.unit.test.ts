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

// ProviderEnvironment.cleanup() runs at provider boot. It must never throw:
// a maintenance-mode or DB-down start would otherwise crash the process before
// the admin endpoints come up.

import type { KeyringPair } from "@prosopo/types";
import { ScheduledTaskStatus } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
	mockProviderDatabase,
	mockIpInfoInit,
	mockClearAllSessionRecords,
	mockRedisWriteQueue,
} = vi.hoisted(() => ({
	mockProviderDatabase: vi.fn(),
	mockIpInfoInit: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
	mockClearAllSessionRecords: vi.fn<() => Promise<void>>(),
	mockRedisWriteQueue: vi.fn(),
}));

vi.mock("@prosopo/database", () => ({
	ProviderDatabase: mockProviderDatabase,
	RedisWriteQueue: mockRedisWriteQueue,
}));

vi.mock("@prosopo/ipinfo", () => ({
	IpInfoService: vi.fn().mockImplementation(function () {
		return { initialize: mockIpInfoInit };
	}),
}));

vi.mock("@prosopo/keyring", () => ({
	Keyring: vi.fn().mockImplementation(function () {
		return { addPair: vi.fn((pair: KeyringPair) => pair) };
	}),
	getPair: vi.fn(() => ({ address: "addr", isLocked: false, unlock: vi.fn() })),
}));

import { ProviderEnvironment } from "../provider.js";

type MockDb = {
	connected: boolean;
	cleanupScheduledTaskStatus: (status: ScheduledTaskStatus) => Promise<void>;
	getRedisConnection: () => object;
};

const buildConfig = (): Record<string, unknown> => ({
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
});

const mockDb = (overrides: Partial<MockDb> = {}): MockDb => ({
	connected: true,
	cleanupScheduledTaskStatus: vi
		.fn<(status: ScheduledTaskStatus) => Promise<void>>()
		.mockResolvedValue(undefined),
	getRedisConnection: vi.fn(() => ({ redis: true })),
	...overrides,
});

const buildEnv = (db?: MockDb): ProviderEnvironment => {
	const env = new ProviderEnvironment(
		buildConfig() as never,
		{
			address: "addr",
			isLocked: false,
			unlock: vi.fn(),
		} as never,
	);
	// `with` returns a child logger and cleanup() logs through the result, so
	// the stub has to hand back something loggable. Returning the same object
	// keeps the child's calls on the same spies.
	const logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		with: vi.fn(() => logger),
	};
	env.logger = logger as never;
	if (db) {
		env.db = db as never;
	}
	return env;
};

beforeEach(() => {
	mockClearAllSessionRecords.mockReset();
	mockClearAllSessionRecords.mockResolvedValue(undefined);
	mockRedisWriteQueue.mockReset();
	mockRedisWriteQueue.mockImplementation(function () {
		return { clearAllSessionRecords: mockClearAllSessionRecords };
	});
	// biome-ignore lint/performance/noDelete: assigning undefined would leave the string "undefined" in the env
	delete process.env.MAINTENANCE_MODE;
});

afterEach(() => {
	// biome-ignore lint/performance/noDelete: assigning undefined would leave the string "undefined" in the env
	delete process.env.MAINTENANCE_MODE;
});

describe("ProviderEnvironment.cleanup", () => {
	it("skips both cleanups when there is no database", () => {
		const env = buildEnv();

		env.cleanup();

		expect(mockRedisWriteQueue).not.toHaveBeenCalled();
		expect(env.logger.warn).toHaveBeenCalled();
	});

	it("skips both cleanups when the database is not connected", () => {
		const db = mockDb({ connected: false });
		const env = buildEnv(db);

		env.cleanup();

		expect(db.cleanupScheduledTaskStatus).not.toHaveBeenCalled();
		expect(mockRedisWriteQueue).not.toHaveBeenCalled();
	});

	it("skips both cleanups in maintenance mode even with a connected database", () => {
		process.env.MAINTENANCE_MODE = "true";
		const db = mockDb();
		const env = buildEnv(db);

		env.cleanup();

		expect(db.cleanupScheduledTaskStatus).not.toHaveBeenCalled();
		expect(mockRedisWriteQueue).not.toHaveBeenCalled();
	});

	it("resets running scheduled tasks and clears redis sessions", () => {
		const db = mockDb();
		const env = buildEnv(db);

		env.cleanup();

		expect(db.cleanupScheduledTaskStatus).toHaveBeenCalledWith(
			ScheduledTaskStatus.Running,
		);
		expect(db.getRedisConnection).toHaveBeenCalled();
		expect(mockClearAllSessionRecords).toHaveBeenCalledTimes(1);
	});

	it("logs rather than rejecting when the scheduled task cleanup fails", async () => {
		const db = mockDb({
			cleanupScheduledTaskStatus: vi
				.fn<(status: ScheduledTaskStatus) => Promise<void>>()
				.mockRejectedValue(new Error("mongo down")),
		});
		const env = buildEnv(db);

		env.cleanup();
		// flush the rejection so its .catch runs inside the test
		await Promise.resolve();
		await Promise.resolve();

		expect(env.logger.error).toHaveBeenCalled();
	});

	it("logs rather than rejecting when the redis session wipe fails", async () => {
		mockClearAllSessionRecords.mockRejectedValue(new Error("redis down"));
		const env = buildEnv(mockDb());

		env.cleanup();
		await Promise.resolve();
		await Promise.resolve();

		expect(env.logger.error).toHaveBeenCalled();
	});

	it("warns and continues when there is no redis connection", () => {
		const db = mockDb({
			getRedisConnection: vi.fn(() => {
				throw new Error("no redis");
			}),
		});
		const env = buildEnv(db);

		expect(() => env.cleanup()).not.toThrow();
		expect(db.cleanupScheduledTaskStatus).toHaveBeenCalled();
		expect(env.logger.warn).toHaveBeenCalled();
	});
});
