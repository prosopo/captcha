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

import type { Logger } from "@prosopo/common";
import { vi, describe, expect, test, beforeEach, afterEach } from "vitest";
import { connectToRedis, setupRedisIndex } from "../redisClient.js";
import type { RedisIndex } from "../redisIndex.js";

// Mock the Redis client with proper promise returns
const mockCreateClient = vi.fn();
const mockRedisClient = {
	connect: vi.fn(),
	on: vi.fn(),
	ping: vi.fn(),
};

vi.mock("redis", () => ({
	createClient: (...args: any[]) => {
		mockCreateClient(...args);
		return mockRedisClient;
	},
}));

// Mock the redisIndex module to avoid actual index creation
vi.mock("../redisIndex.js", () => ({
	createRedisIndex: vi.fn().mockResolvedValue(undefined),
}));

// Unit tests for Redis client connection logic
// These tests cover timing calculations, error handling, and connection state management
describe("connectToRedis", () => {
	let mockLogger: Logger;

	beforeEach(() => {
		mockLogger = {
			info: vi.fn(),
			debug: vi.fn(),
			trace: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			fatal: vi.fn(),
			log: vi.fn(),
			setLogLevel: vi.fn(),
			getLogLevel: vi.fn((): any => "info"),
			getScope: vi.fn(() => "test"),
			with: vi.fn(() => mockLogger),
			getPretty: vi.fn(() => false),
			setPretty: vi.fn(),
			getPrintStack: vi.fn(() => false),
			setPrintStack: vi.fn(),
			getFormat: vi.fn(),
			setFormat: vi.fn(),
		};

		// Reset mocks
		vi.clearAllMocks();
		// Setup connect to return a promise that resolves
		mockRedisClient.connect.mockResolvedValue(mockRedisClient);
	});

	test("returns connection object with correct interface", () => {
		const connection = connectToRedis({
			url: "redis://localhost:6379",
			password: "test",
			logger: mockLogger,
		});

		expect(connection).toHaveProperty("isReady");
		expect(connection).toHaveProperty("getClient");
		expect(connection).toHaveProperty("getAwaitingTimeMs");
		expect(typeof connection.isReady).toBe("function");
		expect(typeof connection.getClient).toBe("function");
		expect(typeof connection.getAwaitingTimeMs).toBe("function");
	});

	test("creates Redis client with correct configuration", () => {
		connectToRedis({
			url: "redis://localhost:6379",
			password: "testpass",
			logger: mockLogger,
		});

		expect(mockCreateClient).toHaveBeenCalledWith({
			url: "redis://localhost:6379",
			password: "testpass",
		});
	});

	test("logs connection attempt", () => {
		connectToRedis({
			url: "redis://test:1234",
			password: "test",
			logger: mockLogger,
		});

		expect(mockLogger.info).toHaveBeenCalledWith(expect.any(Function));
		const logCall = vi.mocked(mockLogger.info).mock.calls[0][0]();
		expect(logCall.msg).toBe("Connecting to Redis");
		expect(logCall.data.url).toBe("redis://test:1234");
	});

	test("logs successful connection", async () => {
		const connection = connectToRedis({
			url: "redis://localhost:6379",
			password: "test",
			logger: mockLogger,
		});

		// Wait for connection to complete
		await connection.getClient();

		// Should have logged successful connection
		expect(mockLogger.info).toHaveBeenCalledTimes(2);
		const logCalls = vi.mocked(mockLogger.info).mock.calls;
		const successLog = logCalls.find(call => {
			const logData = call[0]();
			return logData.msg === "Redis connected";
		});
		expect(successLog).toBeDefined();
		const logData = successLog![0]();
		expect(logData.data).toHaveProperty("url");
		expect(logData.data).toHaveProperty("awaitingTimeMs");
	});

	test("sets up error handler that only logs after connection", async () => {
		const connection = connectToRedis({
			url: "redis://localhost:6379",
			password: "test",
			logger: mockLogger,
		});

		// Get the error handler
		const errorHandler = vi.mocked(mockRedisClient.on).mock.calls.find(
			call => call[0] === "error"
		)?.[1];
		expect(errorHandler).toBeDefined();

		// Error before connection should not be logged
		errorHandler!(new Error("Connection refused"));
		expect(mockLogger.error).not.toHaveBeenCalled();

		// Wait for connection to complete
		await connection.getClient();

		// Now error should be logged
		errorHandler!(new Error("Connection error"));
		expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
		const errorLog = vi.mocked(mockLogger.error).mock.calls[0][0]();
		expect(errorLog.msg).toBe("Redis client error");
	});

	test("getAwaitingTimeMs returns connection time when ready", async () => {
		const connection = connectToRedis({
			url: "redis://localhost:6379",
			password: "test",
			logger: mockLogger,
		});

		// Initially not ready
		expect(connection.isReady()).toBe(false);

		// Wait for connection
		await connection.getClient();

		// Now should be ready
		expect(connection.isReady()).toBe(true);
		const connectionTime = connection.getAwaitingTimeMs();
		expect(connectionTime).toBeGreaterThanOrEqual(0);
	});

	test("getAwaitingTimeMs returns elapsed time when not ready", () => {
		const connection = connectToRedis({
			url: "redis://localhost:6379",
			password: "test",
			logger: mockLogger,
		});

		// Not connected yet
		expect(connection.isReady()).toBe(false);
		const elapsedTime = connection.getAwaitingTimeMs();
		expect(elapsedTime).toBeGreaterThanOrEqual(0);
	});

	test("handles connection options without password", () => {
		connectToRedis({
			url: "redis://localhost:6379",
			logger: mockLogger,
		});

		expect(mockCreateClient).toHaveBeenCalledWith({
			url: "redis://localhost:6379",
			password: undefined,
		});
	});

	test("getClient returns the same promise on multiple calls", async () => {
		const connection = connectToRedis({
			url: "redis://localhost:6379",
			password: "test",
			logger: mockLogger,
		});

		const promise1 = connection.getClient();
		const promise2 = connection.getClient();
		const promise3 = connection.getClient();

		expect(promise1).toBe(promise2);
		expect(promise2).toBe(promise3);

		await promise1;
		const promise4 = connection.getClient();
		expect(promise4).toBe(promise1);
	});
});

describe("setupRedisIndex", () => {
	let mockLogger: Logger;
	let mockConnection: any;

	beforeEach(() => {
		mockLogger = {
			info: vi.fn(),
			debug: vi.fn(),
			trace: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			fatal: vi.fn(),
			log: vi.fn(),
			setLogLevel: vi.fn(),
			getLogLevel: vi.fn((): any => "info"),
			getScope: vi.fn(() => "test"),
			with: vi.fn(() => mockLogger),
			getPretty: vi.fn(() => false),
			setPretty: vi.fn(),
			getPrintStack: vi.fn(() => false),
			setPrintStack: vi.fn(),
			getFormat: vi.fn(),
			setFormat: vi.fn(),
		};

		mockConnection = {
			getClient: vi.fn().mockResolvedValue(mockRedisClient),
			isReady: vi.fn(() => true),
			getAwaitingTimeMs: vi.fn(() => 100),
		};

		vi.clearAllMocks();
	});

	test("returns connection object with correct interface", () => {
		const index: RedisIndex = {
			name: "test-index",
			schema: {},
			options: {},
		};

		const connection = setupRedisIndex(mockConnection, index, mockLogger);

		expect(connection).toHaveProperty("isReady");
		expect(connection).toHaveProperty("getClient");
		expect(connection).toHaveProperty("getAwaitingTimeMs");
	});

	test("initially returns not ready", () => {
		const index: RedisIndex = {
			name: "test-index",
			schema: {},
			options: {},
		};

		const connection = setupRedisIndex(mockConnection, index, mockLogger);

		expect(connection.isReady()).toBe(false);
	});

	test("logs index setup start and completion", async () => {
		const index: RedisIndex = {
			name: "my-test-index",
			schema: {},
			options: {},
		};

		const connection = setupRedisIndex(mockConnection, index, mockLogger);

		// Wait for setup to complete
		await connection.getClient();

		expect(mockLogger.info).toHaveBeenCalled();
		const logCalls = vi.mocked(mockLogger.info).mock.calls;

		// Should have logged setup start
		const setupStartLog = logCalls.find(call => {
			const logData = call[0]();
			return logData.msg === "Setting up Redis index";
		});
		expect(setupStartLog).toBeDefined();

		// Should have logged setup completion
		const setupCompleteLog = logCalls.find(call => {
			const logData = call[0]();
			return logData.msg === "Index setup";
		});
		expect(setupCompleteLog).toBeDefined();

		const completeLogData = setupCompleteLog![0]();
		expect(completeLogData.data).toHaveProperty("name", "my-test-index");
		expect(completeLogData.data).toHaveProperty("awaitingTimeMs");
	});

	test("getAwaitingTimeMs returns setup time when ready", async () => {
		const index: RedisIndex = {
			name: "test-index",
			schema: {},
			options: {},
		};

		const connection = setupRedisIndex(mockConnection, index, mockLogger);

		// Initially not ready
		expect(connection.isReady()).toBe(false);

		// Wait for setup
		await connection.getClient();

		// Now should be ready
		expect(connection.isReady()).toBe(true);
		const setupTime = connection.getAwaitingTimeMs();
		expect(setupTime).toBeGreaterThanOrEqual(0);
	});

	test("getAwaitingTimeMs returns elapsed time when not ready", () => {
		const index: RedisIndex = {
			name: "test-index",
			schema: {},
			options: {},
		};

		const connection = setupRedisIndex(mockConnection, index, mockLogger);

		expect(connection.isReady()).toBe(false);
		const elapsedTime = connection.getAwaitingTimeMs();
		expect(elapsedTime).toBeGreaterThanOrEqual(0);
	});

	test("getClient returns promise that resolves to client from underlying connection", async () => {
		const index: RedisIndex = {
			name: "test-index",
			schema: {},
			options: {},
		};

		const expectedClient = { test: "client" };
		mockConnection.getClient.mockResolvedValue(expectedClient);

		const connection = setupRedisIndex(mockConnection, index, mockLogger);

		const client = await connection.getClient();
		expect(client).toBe(expectedClient);
	});

	test("getClient can be called multiple times and returns same promise", async () => {
		const index: RedisIndex = {
			name: "test-index",
			schema: {},
			options: {},
		};

		const connection = setupRedisIndex(mockConnection, index, mockLogger);

		const promise1 = connection.getClient();
		const promise2 = connection.getClient();
		const promise3 = connection.getClient();

		expect(promise1).toBe(promise2);
		expect(promise2).toBe(promise3);

		await promise1;
		const promise4 = connection.getClient();
		expect(promise4).toBe(promise1);
	});
});