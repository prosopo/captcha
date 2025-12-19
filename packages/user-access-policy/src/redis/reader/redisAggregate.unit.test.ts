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
import { describe, expect, it, vi, beforeEach } from "vitest";
import { aggregateRedisKeys } from "#policy/redis/reader/redisAggregate.js";
import { loggerMockedInstance } from "../../testLogger.js";

describe("aggregateRedisKeys", () => {
	const mockLogger = loggerMockedInstance;
	let mockClient: RedisClientType;

	beforeEach(() => {
		mockClient = {
			ft: {
				aggregateWithCursor: vi.fn(),
				cursorRead: vi.fn(),
			},
		} as unknown as RedisClientType;
	});

	it("should return keys from single batch", async () => {
		(mockClient.ft.aggregateWithCursor as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				results: [
					{ __key: "key1" },
					{ __key: "key2" },
				],
				cursor: 0,
			});

		const keys = await aggregateRedisKeys(mockClient, "*", mockLogger);

		expect(keys).toEqual(["key1", "key2"]);
	});

	it("should handle multiple batches with cursor", async () => {
		(mockClient.ft.aggregateWithCursor as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				results: [{ __key: "key1" }],
				cursor: 123,
			});

		(mockClient.ft.cursorRead as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				results: [{ __key: "key2" }],
				cursor: 0,
			});

		const keys = await aggregateRedisKeys(mockClient, "*", mockLogger);

		expect(keys).toEqual(["key1", "key2"]);
		expect(mockClient.ft.cursorRead).toHaveBeenCalledWith(
			expect.any(String),
			123,
			{ COUNT: expect.any(Number) },
		);
	});

	it("should call batch handler when provided", async () => {
		const batchHandler = vi.fn().mockResolvedValue(undefined);

		(mockClient.ft.aggregateWithCursor as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				results: [{ __key: "key1" }],
				cursor: 0,
			});

		await aggregateRedisKeys(mockClient, "*", mockLogger, batchHandler);

		expect(batchHandler).toHaveBeenCalledWith(["key1"]);
	});

	it("should handle empty results", async () => {
		(mockClient.ft.aggregateWithCursor as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				results: [],
				cursor: 0,
			});

		const keys = await aggregateRedisKeys(mockClient, "*", mockLogger);

		expect(keys).toEqual([]);
	});

	it("should use correct query dialect and options", async () => {
		(mockClient.ft.aggregateWithCursor as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({
				results: [],
				cursor: 0,
			});

		await aggregateRedisKeys(mockClient, "test-query", mockLogger);

		expect(mockClient.ft.aggregateWithCursor).toHaveBeenCalledWith(
			expect.any(String),
			"test-query",
			expect.objectContaining({
				DIALECT: expect.any(Number),
				COUNT: expect.any(Number),
				LOAD: "@__key",
			}),
		);
	});
});

