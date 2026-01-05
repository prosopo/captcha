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

import type { Logger } from "@prosopo/common";
import type { RedisClientType } from "redis";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectToRedis, setupRedisIndex } from "../redisClient.js";
import type { RedisIndex } from "../redisIndex.js";

const mockConnect = vi.fn();
const mockOn = vi.fn();

vi.mock("redis", () => ({
	createClient: vi.fn(() => ({
		connect: mockConnect,
		on: mockOn,
	})),
}));

vi.mock("../redisIndex.js", () => ({
	createRedisIndex: vi.fn().mockResolvedValue(undefined),
}));

describe("connectToRedis", () => {
	let mockLogger: Logger;

	beforeEach(async () => {
		vi.clearAllMocks();
		mockConnect.mockResolvedValue({
			connect: mockConnect,
			on: mockOn,
		} as unknown as RedisClientType);

		mockLogger = {
			info: vi.fn(),
			error: vi.fn(),
		} as unknown as Logger;
	});

	it("returns connection object with correct methods", () => {
		const connection = connectToRedis({
			url: "redis://localhost:6379",
			logger: mockLogger,
		});

		expect(connection).toHaveProperty("isReady");
		expect(connection).toHaveProperty("getClient");
		expect(connection).toHaveProperty("getAwaitingTimeMs");
		expect(typeof connection.isReady).toBe("function");
		expect(typeof connection.getClient).toBe("function");
		expect(typeof connection.getAwaitingTimeMs).toBe("function");
	});

	it("returns false for isReady before connection", () => {
		const connection = connectToRedis({
			url: "redis://localhost:6379",
			logger: mockLogger,
		});

		expect(connection.isReady()).toBe(false);
	});

	it("returns true for isReady after connection", async () => {
		const connection = connectToRedis({
			url: "redis://localhost:6379",
			logger: mockLogger,
		});

		await connection.getClient();

		expect(connection.isReady()).toBe(true);
	});

	it("returns client after connection", async () => {
		const connection = connectToRedis({
			url: "redis://localhost:6379",
			logger: mockLogger,
		});

		const client = await connection.getClient();

		expect(client).toBeDefined();
	});

	it("calculates awaiting time correctly before connection", () => {
		const connection = connectToRedis({
			url: "redis://localhost:6379",
			logger: mockLogger,
		});

		const time = connection.getAwaitingTimeMs();
		expect(time).toBeGreaterThanOrEqual(0);
	});

	it("calculates awaiting time correctly after connection", async () => {
		const connection = connectToRedis({
			url: "redis://localhost:6379",
			logger: mockLogger,
		});

		await connection.getClient();
		const time = connection.getAwaitingTimeMs();
		expect(time).toBeGreaterThanOrEqual(0);
	});

	it("logs connection attempt with url", () => {
		connectToRedis({
			url: "redis://localhost:6379",
			logger: mockLogger,
		});

		expect(mockLogger.info).toHaveBeenCalledWith(expect.any(Function));
		const logCall = (mockLogger.info as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		const logData = logCall();
		expect(logData.msg).toBe("Connecting to Redis");
		expect(logData.data.url).toBe("redis://localhost:6379");
	});

	it("logs successful connection with awaiting time", async () => {
		const connection = connectToRedis({
			url: "redis://localhost:6379",
			logger: mockLogger,
		});

		await connection.getClient();

		expect(mockLogger.info).toHaveBeenCalledTimes(2);
		const logCall = (mockLogger.info as ReturnType<typeof vi.fn>).mock
			.calls[1][0];
		const logData = logCall();
		expect(logData.msg).toBe("Redis connected");
		expect(logData.data.url).toBe("redis://localhost:6379");
		expect(logData.data.awaitingTimeMs).toBeGreaterThanOrEqual(0);
	});

	it("handles connection errors only after ready", async () => {
		let errorHandler: ((error: Error) => void) | undefined;
		mockOn.mockImplementation((event, handler) => {
			if (event === "error") {
				errorHandler = handler;
			}
		});

		const connection = connectToRedis({
			url: "redis://localhost:6379",
			logger: mockLogger,
		});

		const testError = new Error("Test error");
		if (errorHandler) {
			errorHandler(testError);
		}

		expect(mockLogger.error).not.toHaveBeenCalled();

		await connection.getClient();
		if (errorHandler) {
			errorHandler(testError);
		}

		expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
		const errorCall = (mockLogger.error as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		const errorData = errorCall();
		expect(errorData.err).toBe(testError);
		expect(errorData.msg).toBe("Redis client error");
	});

	it("handles connection with password", () => {
		const connection = connectToRedis({
			url: "redis://localhost:6379",
			password: "secret",
			logger: mockLogger,
		});

		expect(connection).toBeDefined();
	});

	it("handles connection without url", () => {
		const connection = connectToRedis({
			logger: mockLogger,
		});

		expect(connection).toBeDefined();
	});
});

describe("setupRedisIndex", () => {
	let mockLogger: Logger;
	let mockConnection: ReturnType<typeof connectToRedis>;
	let mockClient: RedisClientType;
	let mockIndex: RedisIndex;
	let createRedisIndex: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();
		mockClient = {} as unknown as RedisClientType;
		mockLogger = {
			info: vi.fn(),
			error: vi.fn(),
		} as unknown as Logger;

		mockIndex = {
			name: "test-index",
			schema: {},
			options: {},
		};

		mockConnection = {
			isReady: vi.fn(() => true),
			getClient: vi.fn().mockResolvedValue(mockClient),
			getAwaitingTimeMs: vi.fn(() => 100),
		};

		const redisIndexModule = await import("../redisIndex.js");
		createRedisIndex = redisIndexModule.createRedisIndex as ReturnType<
			typeof vi.fn
		>;
		vi.mocked(createRedisIndex).mockResolvedValue(undefined);
	});

	it("returns connection object with correct methods", () => {
		const result = setupRedisIndex(mockConnection, mockIndex, mockLogger);

		expect(result).toHaveProperty("isReady");
		expect(result).toHaveProperty("getClient");
		expect(result).toHaveProperty("getAwaitingTimeMs");
		expect(typeof result.isReady).toBe("function");
		expect(typeof result.getClient).toBe("function");
		expect(typeof result.getAwaitingTimeMs).toBe("function");
	});

	it("returns false for isReady before setup", () => {
		const result = setupRedisIndex(mockConnection, mockIndex, mockLogger);

		expect(result.isReady()).toBe(false);
	});

	it("returns true for isReady after setup", async () => {
		const result = setupRedisIndex(mockConnection, mockIndex, mockLogger);

		await result.getClient();

		expect(result.isReady()).toBe(true);
		expect(createRedisIndex).toHaveBeenCalledWith(mockClient, mockIndex);
	});

	it("returns client after setup", async () => {
		const result = setupRedisIndex(mockConnection, mockIndex, mockLogger);

		const client = await result.getClient();

		expect(client).toBe(mockClient);
	});

	it("calculates awaiting time correctly before setup", () => {
		const result = setupRedisIndex(mockConnection, mockIndex, mockLogger);

		const time = result.getAwaitingTimeMs();
		expect(time).toBeGreaterThanOrEqual(0);
	});

	it("calculates awaiting time correctly after setup", async () => {
		const result = setupRedisIndex(mockConnection, mockIndex, mockLogger);

		await result.getClient();
		const time = result.getAwaitingTimeMs();
		expect(time).toBeGreaterThanOrEqual(0);
	});

	it("logs index setup attempt", async () => {
		const result = setupRedisIndex(mockConnection, mockIndex, mockLogger);

		await result.getClient();

		expect(mockLogger.info).toHaveBeenCalledWith(expect.any(Function));
		const logCall = (mockLogger.info as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		const logData = logCall();
		expect(logData.msg).toBe("Setting up Redis index");
		expect(logData.data.name).toBe("test-index");
	});

	it("logs successful index setup with awaiting time", async () => {
		const result = setupRedisIndex(mockConnection, mockIndex, mockLogger);

		await result.getClient();

		expect(mockLogger.info).toHaveBeenCalledTimes(2);
		const logCall = (mockLogger.info as ReturnType<typeof vi.fn>).mock
			.calls[1][0];
		const logData = logCall();
		expect(logData.msg).toBe("Index setup");
		expect(logData.data.name).toBe("test-index");
		expect(logData.data.awaitingTimeMs).toBeGreaterThanOrEqual(0);
	});
});
