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
import type { RedisClientType } from "redis";
import { describe, expect, it, vi } from "vitest";
import {
	fetchRedisHashRecords,
	getMissingRedisKeys,
	parseRedisRecords,
} from "#policy/redis/redisClient.js";
import { loggerMockedInstance } from "../testLogger.js";
import { z } from "zod";

describe("getMissingRedisKeys", () => {
	it("should return empty array when all keys exist", async () => {
		const mockClient = {
			multi: vi.fn().mockReturnValue({
				exists: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue([1, 1, 1]),
			}),
		} as unknown as RedisClientType;

		const result = await getMissingRedisKeys(mockClient, [
			"key1",
			"key2",
			"key3",
		]);

		expect(result).toEqual([]);
	});

	it("should return missing keys when some keys don't exist", async () => {
		const mockClient = {
			multi: vi.fn().mockReturnValue({
				exists: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue([1, "0", 1, "0"]),
			}),
		} as unknown as RedisClientType;

		const result = await getMissingRedisKeys(mockClient, [
			"key1",
			"key2",
			"key3",
			"key4",
		]);

		expect(result).toEqual(["key2", "key4"]);
	});

	it("should return all keys when none exist", async () => {
		const mockClient = {
			multi: vi.fn().mockReturnValue({
				exists: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue(["0", "0"]),
			}),
		} as unknown as RedisClientType;

		const result = await getMissingRedisKeys(mockClient, ["key1", "key2"]);

		expect(result).toEqual(["key1", "key2"]);
	});

	it("should handle empty keys array", async () => {
		const mockClient = {
			multi: vi.fn().mockReturnValue({
				exists: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue([]),
			}),
		} as unknown as RedisClientType;

		const result = await getMissingRedisKeys(mockClient, []);

		expect(result).toEqual([]);
	});
});

describe("fetchRedisHashRecords", () => {
	it("should fetch records and expirations successfully", async () => {
		const mockRecords = [
			{ field1: "value1" },
			{ field2: "value2" },
		];
		const mockExpirations = [1234567890, -1];

		const mockClient = {
			multi: vi.fn()
				.mockReturnValueOnce({
					hGetAll: vi.fn().mockReturnThis(),
					exec: vi.fn().mockResolvedValue(mockRecords),
				})
				.mockReturnValueOnce({
					expireTime: vi.fn().mockReturnThis(),
					exec: vi.fn().mockResolvedValue(mockExpirations),
				}),
		} as unknown as RedisClientType;

		const result = await fetchRedisHashRecords(
			mockClient,
			["key1", "key2"],
			loggerMockedInstance,
		);

		expect(result.records).toEqual(mockRecords);
		expect(result.expirations).toEqual([1234567890, undefined]);
	});

	it("should handle records with no expiration", async () => {
		const mockRecords = [{ field1: "value1" }];
		const mockExpirations = [-1];

		const mockClient = {
			multi: vi.fn()
				.mockReturnValueOnce({
					hGetAll: vi.fn().mockReturnThis(),
					exec: vi.fn().mockResolvedValue(mockRecords),
				})
				.mockReturnValueOnce({
					expireTime: vi.fn().mockReturnThis(),
					exec: vi.fn().mockResolvedValue(mockExpirations),
				}),
		} as unknown as RedisClientType;

		const result = await fetchRedisHashRecords(
			mockClient,
			["key1"],
			loggerMockedInstance,
		);

		expect(result.expirations).toEqual([undefined]);
	});

	it("should handle invalid expiration records gracefully", async () => {
		const mockRecords = [{ field1: "value1" }, { field2: "value2" }];
		const mockExpirations = [1234567890, "invalid"];

		const mockClient = {
			multi: vi.fn()
				.mockReturnValueOnce({
					hGetAll: vi.fn().mockReturnThis(),
					exec: vi.fn().mockResolvedValue(mockRecords),
				})
				.mockReturnValueOnce({
					expireTime: vi.fn().mockReturnThis(),
					exec: vi.fn().mockResolvedValue(mockExpirations),
				}),
		} as unknown as RedisClientType;

		const logger = getLogger(LogLevel.enum.info, "test");
		const errorSpy = vi.spyOn(logger, "error");

		const result = await fetchRedisHashRecords(mockClient, ["key1", "key2"], logger);

		expect(result.expirations).toHaveLength(2);
		expect(result.expirations[0]).toBe(1234567890);
		expect(result.expirations[1]).toBeUndefined();
		expect(errorSpy).toHaveBeenCalled();
	});

	it("should handle empty keys array", async () => {
		const mockClient = {
			multi: vi.fn()
				.mockReturnValueOnce({
					hGetAll: vi.fn().mockReturnThis(),
					exec: vi.fn().mockResolvedValue([]),
				})
				.mockReturnValueOnce({
					expireTime: vi.fn().mockReturnThis(),
					exec: vi.fn().mockResolvedValue([]),
				}),
		} as unknown as RedisClientType;

		const result = await fetchRedisHashRecords(
			mockClient,
			[],
			loggerMockedInstance,
		);

		expect(result.records).toEqual([]);
		expect(result.expirations).toEqual([]);
	});
});

describe("parseRedisRecords", () => {
	const testSchema = z.object({
		id: z.string(),
		value: z.number(),
	});

	it("should parse valid records successfully", () => {
		const records = [
			{ id: "1", value: 100 },
			{ id: "2", value: 200 },
		];

		const result = parseRedisRecords(records, testSchema, loggerMockedInstance);

		expect(result).toEqual(records);
	});

	it("should filter out invalid records and log errors", () => {
		const records = [
			{ id: "1", value: 100 },
			{ id: "2", value: "invalid" },
			{ id: "3", value: 300 },
		];

		const logger = getLogger(LogLevel.enum.info, "test");
		const errorSpy = vi.spyOn(logger, "error");

		const result = parseRedisRecords(records, testSchema, logger);

		expect(result).toHaveLength(2);
		expect(result).toEqual([
			{ id: "1", value: 100 },
			{ id: "3", value: 300 },
		]);
		expect(errorSpy).toHaveBeenCalledTimes(1);
	});

	it("should return empty array when all records are invalid", () => {
		const records = [
			{ id: "1", value: "invalid" },
			{ id: 2, value: 200 },
		];

		const logger = getLogger(LogLevel.enum.info, "test");
		const errorSpy = vi.spyOn(logger, "error");

		const result = parseRedisRecords(records, testSchema, logger);

		expect(result).toEqual([]);
		expect(errorSpy).toHaveBeenCalledTimes(2);
	});

	it("should handle empty records array", () => {
		const result = parseRedisRecords([], testSchema, loggerMockedInstance);

		expect(result).toEqual([]);
	});

	it("should handle records with extra fields", () => {
		const records = [
			{ id: "1", value: 100, extra: "ignored" },
		];

		const result = parseRedisRecords(records, testSchema, loggerMockedInstance);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({ id: "1", value: 100 });
	});
});
