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

import type { Logger, LogLevel } from "@prosopo/common";
import type { RedisClientType } from "redis";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	type RedisConnection,
	connectToRedis,
	setupRedisIndex,
} from "../redisClient.js";
import type { RedisIndex } from "../redisIndex.js";

// Mock redis module
const mockClientInstance = {
	connect: vi.fn(),
	on: vi.fn(),
	ft: {
		_LIST: vi.fn(),
		create: vi.fn(),
		dropIndex: vi.fn(),
		info: vi.fn(),
	},
	hGet: vi.fn(),
	hSet: vi.fn(),
	hDel: vi.fn(),
};

const mockCreateClient = vi.fn(() => mockClientInstance);

vi.mock("redis", () => ({
	createClient: mockCreateClient,
}));

// Mock redisIndex module
const mockCreateRedisIndex = vi.fn().mockResolvedValue(undefined);

vi.mock("../redisIndex.js", async () => {
	const actual = await vi.importActual<typeof import("../redisIndex.js")>(
		"../redisIndex.js",
	);
	return {
		...actual,
		createRedisIndex: mockCreateRedisIndex,
	};
});

describe("connectToRedis", () => {
	let mockLogger: Logger;

	beforeEach(() => {
		vi.clearAllMocks();
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

		mockClientInstance.connect.mockResolvedValue(mockClientInstance);
		mockCreateClient.mockReturnValue(mockClientInstance);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("types", () => {
		// Test return type is RedisConnection
		const connection: RedisConnection = connectToRedis({
			logger: mockLogger,
		});

		// Test isReady returns boolean
		const isReady: boolean = connection.isReady();

		// Test getClient returns Promise<RedisClientType>
		const clientPromise: Promise<RedisClientType> = connection.getClient();

		// Test getAwaitingTimeMs returns number
		const awaitingTime: number = connection.getAwaitingTimeMs();

		// Type assertions to ensure types are correct
		expect(typeof isReady).toBe("boolean");
		expect(clientPromise).toBeInstanceOf(Promise);
		expect(typeof awaitingTime).toBe("number");
	});

	test("returns connection with correct interface", () => {
		const connection = connectToRedis({
			logger: mockLogger,
		});

		expect(connection).toHaveProperty("isReady");
		expect(connection).toHaveProperty("getClient");
		expect(connection).toHaveProperty("getAwaitingTimeMs");
		expect(typeof connection.isReady).toBe("function");
		expect(typeof connection.getClient).toBe("function");
		expect(typeof connection.getAwaitingTimeMs).toBe("function");
	});

	test("isReady returns false initially", () => {
		const connection = connectToRedis({
			logger: mockLogger,
		});

		expect(connection.isReady()).toBe(false);
	});

	test("isReady returns true after connection", async () => {
		const connection = connectToRedis({
			logger: mockLogger,
		});

		expect(connection.isReady()).toBe(false);

		await connection.getClient();

		expect(connection.isReady()).toBe(true);
	});

	test("getClient returns the connected client", async () => {
		const connection = connectToRedis({
			logger: mockLogger,
		});

		const client = await connection.getClient();

		expect(client).toBe(mockClientInstance);
		expect(mockClientInstance.connect).toHaveBeenCalledTimes(1);
	});

	test("getClient can be called multiple times and returns same promise", async () => {
		const connection = connectToRedis({
			logger: mockLogger,
		});

		const promise1 = connection.getClient();
		const promise2 = connection.getClient();
		const promise3 = connection.getClient();

		// All should be the same promise instance
		expect(promise1).toBe(promise2);
		expect(promise2).toBe(promise3);

		await promise1;

		// After resolution, should still return same promise
		const promise4 = connection.getClient();
		expect(promise4).toBe(promise1);
	});

	test("getAwaitingTimeMs returns time difference when ready", async () => {
		mockClientInstance.connect.mockImplementation(
			() =>
				new Promise((resolve) => {
					setTimeout(() => {
						resolve(mockClientInstance);
					}, 10);
				}),
		);

		const connection = connectToRedis({
			logger: mockLogger,
		});

		await connection.getClient();

		const awaitingTime = connection.getAwaitingTimeMs();
		expect(awaitingTime).toBeGreaterThanOrEqual(0);
		expect(awaitingTime).toBeLessThan(100);
	});

	test("getAwaitingTimeMs returns time since initialization when not ready", () => {
		mockClientInstance.connect.mockImplementation(
			() => new Promise(() => { }), // Never resolves
		);

		const connection = connectToRedis({
			logger: mockLogger,
		});

		const awaitingTime1 = connection.getAwaitingTimeMs();
		expect(awaitingTime1).toBeGreaterThanOrEqual(0);

		// Wait a bit
		return new Promise<void>((resolve) => {
			setTimeout(() => {
				const awaitingTime2 = connection.getAwaitingTimeMs();
				expect(awaitingTime2).toBeGreaterThan(awaitingTime1);
				resolve();
			}, 10);
		});
	});

	test("logs connection attempt with url", () => {
		const url = "redis://localhost:6379";
		connectToRedis({
			url,
			logger: mockLogger,
		});

		expect(mockLogger.info).toHaveBeenCalled();
		const logCall = vi.mocked(mockLogger.info).mock.calls[0]?.[0];
		const logData = logCall?.();
		expect(logData?.data && typeof logData.data === "object" && "url" in logData.data && logData.data.url).toBe(url);
	});

	test("logs successful connection with awaiting time", async () => {
		const connection = connectToRedis({
			logger: mockLogger,
		});

		await connection.getClient();

		expect(mockLogger.info).toHaveBeenCalledTimes(2);
		const logCalls = vi.mocked(mockLogger.info).mock.calls;
		const connectionLog = logCalls[1]?.[0]?.();
		expect(connectionLog?.msg).toBe("Redis connected");
		expect(connectionLog?.data && typeof connectionLog.data === "object" && "awaitingTimeMs" in connectionLog.data).toBe(true);
		expect(typeof (connectionLog?.data && typeof connectionLog.data === "object" && "awaitingTimeMs" in connectionLog.data ? connectionLog.data.awaitingTimeMs : undefined)).toBe("number");
	});

	test("handles connection errors only when ready", async () => {
		const errorHandler = vi.fn();
		mockClientInstance.on.mockImplementation(
			(event: string, handler: () => void) => {
				if (event === "error") {
					errorHandler.mockImplementation(handler);
				}
			},
		);
		mockClientInstance.connect.mockResolvedValue(mockClientInstance);

		const connection = connectToRedis({
			logger: mockLogger,
		});

		// Error before ready should not be logged
		const testError = new Error("Test error");
		errorHandler(testError);
		expect(mockLogger.error).not.toHaveBeenCalled();

		// Connect first
		await connection.getClient();

		// Error after ready should be logged
		errorHandler(testError);
		expect(mockLogger.error).toHaveBeenCalled();
		const errorCall = vi.mocked(mockLogger.error).mock.calls[0]?.[0];
		const errorData = errorCall?.();
		expect(errorData?.err).toBe(testError);
		expect(errorData?.msg).toBe("Redis client error");
	});

	test("accepts optional url and password", () => {
		const url = "redis://localhost:6379";
		const password = "secret";

		connectToRedis({
			url,
			password,
			logger: mockLogger,
		});

		expect(mockCreateClient).toHaveBeenCalledWith({
			url,
			password,
		});
	});

	test("calls indexSetup when provided", async () => {
		const indexSetup = vi.fn().mockResolvedValue(undefined);

		const connection = connectToRedis({
			logger: mockLogger,
			indexSetup,
		});

		await connection.getClient();

		expect(indexSetup).toHaveBeenCalledWith(mockClientInstance);
		expect(indexSetup).toHaveBeenCalledTimes(1);
	});

	test("handles indexSetup errors", async () => {
		const indexSetupError = new Error("Index setup failed");
		const indexSetup = vi.fn().mockRejectedValue(indexSetupError);

		const connection = connectToRedis({
			logger: mockLogger,
			indexSetup,
		});

		await expect(connection.getClient()).rejects.toThrow("Index setup failed");
	});
});

describe("setupRedisIndex", () => {
	let mockLogger: Logger;
	let mockConnection: RedisConnection;
	let mockClient: RedisClientType;

	beforeEach(() => {
		vi.clearAllMocks();
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

		mockClient = {
			ft: {
				_LIST: vi.fn(),
				create: vi.fn(),
				dropIndex: vi.fn(),
				info: vi.fn(),
			},
			hGet: vi.fn(),
			hSet: vi.fn(),
			hDel: vi.fn(),
		} as unknown as RedisClientType;

		mockConnection = {
			isReady: vi.fn(() => true),
			getClient: vi.fn().mockResolvedValue(mockClient),
			getAwaitingTimeMs: vi.fn(() => 100),
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("types", async () => {
		const mockIndex: RedisIndex = {
			name: "test-index",
			schema: {},
			options: {},
		};

		// Test return type is RedisConnection
		const connection: RedisConnection = setupRedisIndex(
			mockConnection,
			mockIndex,
			mockLogger,
		);

		// Test isReady returns boolean
		const isReady: boolean = connection.isReady();

		// Test getClient returns Promise<RedisClientType>
		const clientPromise: Promise<RedisClientType> = connection.getClient();

		// Test getAwaitingTimeMs returns number
		const awaitingTime: number = connection.getAwaitingTimeMs();

		// Type assertions
		expect(typeof isReady).toBe("boolean");
		expect(clientPromise).toBeInstanceOf(Promise);
		expect(typeof awaitingTime).toBe("number");
	});

	test("returns connection with correct interface", () => {
		const mockIndex: RedisIndex = {
			name: "test-index",
			schema: {},
			options: {},
		};

		const connection = setupRedisIndex(
			mockConnection,
			mockIndex,
			mockLogger,
		);

		expect(connection).toHaveProperty("isReady");
		expect(connection).toHaveProperty("getClient");
		expect(connection).toHaveProperty("getAwaitingTimeMs");
		expect(typeof connection.isReady).toBe("function");
		expect(typeof connection.getClient).toBe("function");
		expect(typeof connection.getAwaitingTimeMs).toBe("function");
	});

	test("isReady returns false initially", () => {
		const mockIndex: RedisIndex = {
			name: "test-index",
			schema: {},
			options: {},
		};

		const connection = setupRedisIndex(
			mockConnection,
			mockIndex,
			mockLogger,
		);

		expect(connection.isReady()).toBe(false);
	});

	test("isReady returns true after index setup", async () => {
		const mockIndex: RedisIndex = {
			name: "test-index",
			schema: {},
			options: {},
		};

		const connection = setupRedisIndex(
			mockConnection,
			mockIndex,
			mockLogger,
		);

		expect(connection.isReady()).toBe(false);

		await connection.getClient();

		expect(connection.isReady()).toBe(true);
	});

	test("getClient returns the client from underlying connection", async () => {
		const mockIndex: RedisIndex = {
			name: "test-index",
			schema: {},
			options: {},
		};

		const connection = setupRedisIndex(
			mockConnection,
			mockIndex,
			mockLogger,
		);

		const client = await connection.getClient();

		expect(client).toBe(mockClient);
		expect(mockConnection.getClient).toHaveBeenCalled();
		expect(mockCreateRedisIndex).toHaveBeenCalledWith(mockClient, mockIndex);
	});

	test("logs index setup start", async () => {
		const mockIndex: RedisIndex = {
			name: "test-index",
			schema: {},
			options: {},
		};

		const connection = setupRedisIndex(
			mockConnection,
			mockIndex,
			mockLogger,
		);

		await connection.getClient();

		expect(mockLogger.info).toHaveBeenCalled();
		const logCalls = vi.mocked(mockLogger.info).mock.calls;
		const setupLog = logCalls[0]?.[0]?.();
		expect(setupLog?.msg).toBe("Setting up Redis index");
		expect(setupLog?.data && typeof setupLog.data === "object" && "name" in setupLog.data && setupLog.data.name).toBe("test-index");
	});

	test("logs index setup completion with awaiting time", async () => {
		const mockIndex: RedisIndex = {
			name: "test-index",
			schema: {},
			options: {},
		};

		const connection = setupRedisIndex(
			mockConnection,
			mockIndex,
			mockLogger,
		);

		await connection.getClient();

		const logCalls = vi.mocked(mockLogger.info).mock.calls;
		const completionLog = logCalls[1]?.[0]?.();
		expect(completionLog?.msg).toBe("Index setup");
		expect(completionLog?.data && typeof completionLog.data === "object" && "name" in completionLog.data && completionLog.data.name).toBe("test-index");
		expect(completionLog?.data && typeof completionLog.data === "object" && "awaitingTimeMs" in completionLog.data).toBe(true);
		expect(typeof (completionLog?.data && typeof completionLog.data === "object" && "awaitingTimeMs" in completionLog.data ? completionLog.data.awaitingTimeMs : undefined)).toBe("number");
	});

	test("getAwaitingTimeMs returns time difference when ready", async () => {
		const mockIndex: RedisIndex = {
			name: "test-index",
			schema: {},
			options: {},
		};

		const connection = setupRedisIndex(
			mockConnection,
			mockIndex,
			mockLogger,
		);

		await connection.getClient();

		const awaitingTime = connection.getAwaitingTimeMs();
		expect(awaitingTime).toBeGreaterThanOrEqual(0);
	});

	test("getAwaitingTimeMs returns time since initialization when not ready", () => {
		const mockIndex: RedisIndex = {
			name: "test-index",
			schema: {},
			options: {},
		};

		mockConnection.getClient = vi.fn(
			(): Promise<RedisClientType> => new Promise(() => { }), // Never resolves
		);

		const connection = setupRedisIndex(
			mockConnection,
			mockIndex,
			mockLogger,
		);

		const awaitingTime1 = connection.getAwaitingTimeMs();
		expect(awaitingTime1).toBeGreaterThanOrEqual(0);

		return new Promise<void>((resolve) => {
			setTimeout(() => {
				const awaitingTime2 = connection.getAwaitingTimeMs();
				expect(awaitingTime2).toBeGreaterThan(awaitingTime1);
				resolve();
			}, 10);
		});
	});

	test("getClient can be called multiple times and returns same promise", async () => {
		const mockIndex: RedisIndex = {
			name: "test-index",
			schema: {},
			options: {},
		};

		const connection = setupRedisIndex(
			mockConnection,
			mockIndex,
			mockLogger,
		);

		const promise1 = connection.getClient();
		const promise2 = connection.getClient();
		const promise3 = connection.getClient();

		// All should be the same promise instance
		expect(promise1).toBe(promise2);
		expect(promise2).toBe(promise3);

		await promise1;

		// After resolution, should still return same promise
		const promise4 = connection.getClient();
		expect(promise4).toBe(promise1);
	});
});
