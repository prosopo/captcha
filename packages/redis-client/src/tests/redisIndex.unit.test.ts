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

import { SCHEMA_FIELD_TYPE } from "@redis/search";
import type { RedisClientType } from "redis";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	type RedisIndex,
	createRedisIndex,
	deleteRedisIndex,
} from "../redisIndex.js";

// Unit tests for Redis indexing functionality using mocks
// These tests cover the index creation, hashing, and management logic
describe("redisIndex", () => {
	let mockClient: RedisClientType;

	beforeEach(() => {
		mockClient = {
			ft: {
				_LIST: vi.fn(),
				create: vi.fn(),
				dropIndex: vi.fn(),
				info: vi.fn(),
				alter: vi.fn(),
			},
			hGet: vi.fn(),
			hSet: vi.fn(),
			hDel: vi.fn(),
		} as unknown as RedisClientType;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// Test that createRedisIndex creates a new index when none exists
	test("creates new index when no existing index", async () => {
		const redisIndex: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		vi.mocked(mockClient.ft._LIST).mockResolvedValue([]);
		vi.mocked(mockClient.hSet).mockResolvedValue(1);

		await createRedisIndex(mockClient, redisIndex);

		expect(mockClient.ft._LIST).toHaveBeenCalled();
		expect(mockClient.ft.create).toHaveBeenCalledWith("test-index", redisIndex.schema, redisIndex.options);
		expect(mockClient.hSet).toHaveBeenCalledWith("_index_hashes", "test-index", expect.any(String));
	});

	// Test that createRedisIndex recreates index when hash differs
	test("recreates index when hash differs", async () => {
		const redisIndex: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		vi.mocked(mockClient.ft._LIST).mockResolvedValue(["test-index"]);
		vi.mocked(mockClient.hGet).mockResolvedValue("old-hash");
		vi.mocked(mockClient.hSet).mockResolvedValue(1);

		await createRedisIndex(mockClient, redisIndex);

		expect(mockClient.ft.dropIndex).toHaveBeenCalledWith("test-index");
		expect(mockClient.ft.create).toHaveBeenCalledWith("test-index", redisIndex.schema, redisIndex.options);
		expect(mockClient.hSet).toHaveBeenCalledWith("_index_hashes", "test-index", expect.any(String));
	});

	// Test that createRedisIndex recreates index when hash is missing but index exists
	test("recreates index when hash is missing but index exists", async () => {
		const redisIndex: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		vi.mocked(mockClient.ft._LIST).mockResolvedValue(["test-index"]);
		vi.mocked(mockClient.hGet).mockResolvedValue(null);
		vi.mocked(mockClient.hSet).mockResolvedValue(1);

		await createRedisIndex(mockClient, redisIndex);

		expect(mockClient.ft.dropIndex).toHaveBeenCalledWith("test-index");
		expect(mockClient.ft.create).toHaveBeenCalledWith("test-index", redisIndex.schema, redisIndex.options);
		expect(mockClient.hSet).toHaveBeenCalledWith("_index_hashes", "test-index", expect.any(String));
	});

	// Test that deleteRedisIndex removes index and hash
	test("deleteRedisIndex removes index and hash", async () => {
		const indexName = "test-index";

		await deleteRedisIndex(mockClient, indexName);

		expect(mockClient.ft.dropIndex).toHaveBeenCalledWith(indexName);
		expect(mockClient.hDel).toHaveBeenCalledWith("_index_hashes", indexName);
	});

	// Test that createRedisIndex generates consistent hashes
	test("generates consistent hash for same index definition", async () => {
		const redisIndex1: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
				field2: SCHEMA_FIELD_TYPE.TEXT,
			},
			options: { ON: "HASH" as const },
		};

		const redisIndex2: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
				field2: SCHEMA_FIELD_TYPE.TEXT,
			},
			options: { ON: "HASH" as const },
		};

		vi.mocked(mockClient.ft._LIST).mockResolvedValue([]);
		vi.mocked(mockClient.hGet).mockResolvedValue(null);
		vi.mocked(mockClient.hSet).mockResolvedValue(1);

		await createRedisIndex(mockClient, redisIndex1);
		const hash1 = vi.mocked(mockClient.hSet).mock.calls[0][2];

		vi.clearAllMocks();
		vi.mocked(mockClient.ft._LIST).mockResolvedValue([]);
		vi.mocked(mockClient.hGet).mockResolvedValue(null);
		vi.mocked(mockClient.hSet).mockResolvedValue(1);

		await createRedisIndex(mockClient, redisIndex2);
		const hash2 = vi.mocked(mockClient.hSet).mock.calls[0][2];

		expect(hash1).toBe(hash2);
		expect(typeof hash1).toBe("string");
	});

	// Test that createRedisIndex generates different hashes for different definitions
	test("generates different hashes for different index definitions", async () => {
		const redisIndex1: RedisIndex = {
			name: "test-index-1",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		const redisIndex2: RedisIndex = {
			name: "test-index-2",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TEXT,
			},
			options: {},
		};

		vi.mocked(mockClient.ft._LIST).mockResolvedValue([]);
		vi.mocked(mockClient.hGet).mockResolvedValue(null);
		vi.mocked(mockClient.hSet).mockResolvedValue(1);

		await createRedisIndex(mockClient, redisIndex1);
		const hash1 = vi.mocked(mockClient.hSet).mock.calls[0][2];

		vi.clearAllMocks();
		vi.mocked(mockClient.ft._LIST).mockResolvedValue([]);
		vi.mocked(mockClient.hGet).mockResolvedValue(null);
		vi.mocked(mockClient.hSet).mockResolvedValue(1);

		await createRedisIndex(mockClient, redisIndex2);
		const hash2 = vi.mocked(mockClient.hSet).mock.calls[0][2];

		expect(hash1).not.toBe(hash2);
		expect(typeof hash1).toBe("string");
		expect(typeof hash2).toBe("string");
	});
});