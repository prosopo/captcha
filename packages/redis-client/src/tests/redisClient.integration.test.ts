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

import type { LogLevel, Logger } from "@prosopo/common";
import { SCHEMA_FIELD_TYPE } from "@redis/search";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import { type RedisConnection, setupRedisIndex } from "../redisClient.js";
import type { RedisIndex } from "../redisIndex.js";
import {
	createTestRedisConnection,
	stopTestRedisContainer,
} from "./testRedisConnection.js";

describe("connectToRedis", () => {
	let mockLogger: Logger;
	let connection: RedisConnection;

	beforeAll(async () => {
		mockLogger = {
			info: vi.fn(),
			debug: vi.fn(),
			trace: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			fatal: vi.fn(),
			log: vi.fn(),
			setLogLevel: vi.fn(),
			getLogLevel: vi.fn((): LogLevel => "info"),
			getScope: vi.fn(() => "test"),
			with: vi.fn(() => mockLogger),
			getPretty: vi.fn(() => false),
			setPretty: vi.fn(),
			getPrintStack: vi.fn(() => false),
			setPrintStack: vi.fn(),
			getFormat: vi.fn(),
			setFormat: vi.fn(),
		};
		connection = await createTestRedisConnection(mockLogger);
		await connection.getClient();
	}, 300000);

	afterAll(async () => {
		await stopTestRedisContainer();
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	test("returns connection with correct interface", () => {
		expect(connection).toHaveProperty("isReady");
		expect(connection).toHaveProperty("getClient");
		expect(connection).toHaveProperty("getAwaitingTimeMs");
		expect(typeof connection.isReady).toBe("function");
		expect(typeof connection.getClient).toBe("function");
		expect(typeof connection.getAwaitingTimeMs).toBe("function");
	});

	test("isReady returns true after connection", () => {
		expect(connection.isReady()).toBe(true);
	});

	test("getClient returns the connected client", async () => {
		const client = await connection.getClient();
		expect(client).toBeDefined();
		expect(typeof client.ping).toBe("function");
		const pong = await client.ping();
		expect(pong).toBe("PONG");
	}, 30000);

	test("getClient can be called multiple times and returns same promise", async () => {
		const promise1 = connection.getClient();
		const promise2 = connection.getClient();
		const promise3 = connection.getClient();

		expect(promise1).toBe(promise2);
		expect(promise2).toBe(promise3);

		await promise1;

		const promise4 = connection.getClient();
		expect(promise4).toBe(promise1);
	}, 30000);

	test("getAwaitingTimeMs returns time difference when ready", async () => {
		const awaitingTime = connection.getAwaitingTimeMs();
		expect(awaitingTime).toBeGreaterThanOrEqual(0);
		expect(awaitingTime).toBeLessThan(10000);
	});

	test("logs connection attempt with url", async () => {
		expect(mockLogger.info).toHaveBeenCalled();
		const logCalls = vi.mocked(mockLogger.info).mock.calls;
		const connectionLog = logCalls.find(
			(call) => call[0]?.()?.msg === "Connecting to Redis",
		);
		expect(connectionLog).toBeDefined();
	});

	test("logs successful connection with awaiting time", () => {
		const logCalls = vi.mocked(mockLogger.info).mock.calls;
		const connectionLog = logCalls.find(
			(call) => call[0]?.()?.msg === "Redis connected",
		);
		expect(connectionLog).toBeDefined();
		const logData = connectionLog?.[0]?.();
		expect(
			logData?.data &&
				typeof logData.data === "object" &&
				"awaitingTimeMs" in logData.data,
		).toBe(true);
	});

	test("handles connection errors only when ready", async () => {
		const client = await connection.getClient();
		const error = new Error("Test error");

		client.emit("error", error);

		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(mockLogger.error).toHaveBeenCalled();
		const errorCall = vi.mocked(mockLogger.error).mock.calls[0]?.[0];
		const errorData = errorCall?.();
		expect(errorData?.msg).toBe("Redis client error");
	}, 30000);

	test("accepts optional url and password", async () => {
		const testConnection = await createTestRedisConnection(mockLogger);
		const client = await testConnection.getClient();
		const pong = await client.ping();
		expect(pong).toBe("PONG");
	}, 30000);

	test("can perform Redis operations", async () => {
		const client = await connection.getClient();
		await client.set("test:key", "test:value");
		const value = await client.get("test:key");
		expect(value).toBe("test:value");
		await client.del("test:key");
	}, 30000);
});

describe("setupRedisIndex", () => {
	let mockLogger: Logger;
	let baseConnection: RedisConnection;
	let mockIndex: RedisIndex;

	beforeAll(async () => {
		mockLogger = {
			info: vi.fn(),
			debug: vi.fn(),
			trace: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			fatal: vi.fn(),
			log: vi.fn(),
			setLogLevel: vi.fn(),
			getLogLevel: vi.fn((): LogLevel => "info"),
			getScope: vi.fn(() => "test"),
			with: vi.fn(() => mockLogger),
			getPretty: vi.fn(() => false),
			setPretty: vi.fn(),
			getPrintStack: vi.fn(() => false),
			setPrintStack: vi.fn(),
			getFormat: vi.fn(),
			setFormat: vi.fn(),
		};
		baseConnection = await createTestRedisConnection(mockLogger);
		await baseConnection.getClient();
		mockIndex = {
			name: `test-index-${Date.now()}`,
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};
	}, 300000);

	afterAll(async () => {
		await stopTestRedisContainer();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		mockIndex.name = `test-index-${Date.now()}`;
	});

	test("returns connection with correct interface", () => {
		const connection = setupRedisIndex(baseConnection, mockIndex, mockLogger);

		expect(connection).toHaveProperty("isReady");
		expect(connection).toHaveProperty("getClient");
		expect(connection).toHaveProperty("getAwaitingTimeMs");
		expect(typeof connection.isReady).toBe("function");
		expect(typeof connection.getClient).toBe("function");
		expect(typeof connection.getAwaitingTimeMs).toBe("function");
	});

	test("isReady returns false initially", () => {
		const connection = setupRedisIndex(baseConnection, mockIndex, mockLogger);

		expect(connection.isReady()).toBe(false);
	});

	test("isReady returns true after index setup", async () => {
		const connection = setupRedisIndex(baseConnection, mockIndex, mockLogger);

		expect(connection.isReady()).toBe(false);

		await connection.getClient();

		expect(connection.isReady()).toBe(true);
	}, 30000);

	test("getClient returns the client from underlying connection", async () => {
		const connection = setupRedisIndex(baseConnection, mockIndex, mockLogger);

		const client = await connection.getClient();
		const baseClient = await baseConnection.getClient();

		expect(client).toBe(baseClient);
	}, 30000);

	test("creates index in Redis", async () => {
		const connection = setupRedisIndex(baseConnection, mockIndex, mockLogger);

		await connection.getClient();

		const client = await baseConnection.getClient();
		const indexNames = await client.ft._LIST();
		expect(indexNames).toContain(mockIndex.name);
	}, 30000);

	test("logs index setup start", async () => {
		const connection = setupRedisIndex(baseConnection, mockIndex, mockLogger);

		await connection.getClient();

		expect(mockLogger.info).toHaveBeenCalled();
		const logCalls = vi.mocked(mockLogger.info).mock.calls;
		const setupLog = logCalls.find(
			(call) => call[0]?.()?.msg === "Setting up Redis index",
		);
		expect(setupLog).toBeDefined();
		const logData = setupLog?.[0]?.();
		expect(
			logData?.data &&
				typeof logData.data === "object" &&
				"name" in logData.data &&
				logData.data.name,
		).toBe(mockIndex.name);
	}, 30000);

	test("logs index setup completion with awaiting time", async () => {
		const connection = setupRedisIndex(baseConnection, mockIndex, mockLogger);

		await connection.getClient();

		const logCalls = vi.mocked(mockLogger.info).mock.calls;
		const completionLog = logCalls.find(
			(call) => call[0]?.()?.msg === "Index setup",
		);
		expect(completionLog).toBeDefined();
		const logData = completionLog?.[0]?.();
		expect(
			logData?.data &&
				typeof logData.data === "object" &&
				"name" in logData.data &&
				logData.data.name,
		).toBe(mockIndex.name);
		expect(
			logData?.data &&
				typeof logData.data === "object" &&
				"awaitingTimeMs" in logData.data,
		).toBe(true);
	}, 30000);

	test("getAwaitingTimeMs returns time difference when ready", async () => {
		const connection = setupRedisIndex(baseConnection, mockIndex, mockLogger);

		await connection.getClient();

		const awaitingTime = connection.getAwaitingTimeMs();
		expect(awaitingTime).toBeGreaterThanOrEqual(0);
	}, 30000);

	test("getAwaitingTimeMs returns time since initialization when not ready", () => {
		const connection = setupRedisIndex(baseConnection, mockIndex, mockLogger);

		const awaitingTime1 = connection.getAwaitingTimeMs();
		expect(awaitingTime1).toBeGreaterThanOrEqual(0);
	});

	test("getClient can be called multiple times and returns same promise", async () => {
		const connection = setupRedisIndex(baseConnection, mockIndex, mockLogger);

		const promise1 = connection.getClient();
		const promise2 = connection.getClient();
		const promise3 = connection.getClient();

		expect(promise1).toBe(promise2);
		expect(promise2).toBe(promise3);

		await promise1;

		const promise4 = connection.getClient();
		expect(promise4).toBe(promise1);
	}, 30000);

	test("does not recreate index when called again with same definition", async () => {
		const connection1 = setupRedisIndex(baseConnection, mockIndex, mockLogger);

		await connection1.getClient();

		vi.clearAllMocks();

		const connection2 = setupRedisIndex(baseConnection, mockIndex, mockLogger);

		await connection2.getClient();

		const client = await baseConnection.getClient();
		const indexNames = await client.ft._LIST();
		expect(indexNames.filter((name) => name === mockIndex.name).length).toBe(1);
	}, 30000);
});
