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

import { SCHEMA_FIELD_TYPE } from "@redis/search";
import type { RedisClientType } from "redis";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	type RedisIndex,
	createRedisIndex,
	deleteRedisIndex,
} from "../redisIndex.js";

describe("createRedisIndex", () => {
	let mockClient: RedisClientType;

	beforeEach(() => {
		vi.clearAllMocks();
		mockClient = {
			ft: {
				_LIST: vi.fn().mockResolvedValue([]),
				create: vi.fn().mockResolvedValue("OK"),
				dropIndex: vi.fn().mockResolvedValue("OK"),
				info: vi.fn(),
			},
			hGet: vi.fn().mockResolvedValue(null),
			hSet: vi.fn().mockResolvedValue(1),
			hDel: vi.fn().mockResolvedValue(1),
		} as unknown as RedisClientType;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("types", async () => {
		const mockIndex: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		// Test return type is Promise<void>
		const result: Promise<void> = createRedisIndex(mockClient, mockIndex);
		await result;

		// Test parameter types
		const clientParam: RedisClientType = mockClient;
		const indexParam: RedisIndex = mockIndex;

		// Type assertions
		expect(result).toBeInstanceOf(Promise);
		expect(typeof clientParam).toBe("object");
		expect(typeof indexParam.name).toBe("string");
	});

	test("creates new index when index does not exist", async () => {
		const mockIndex: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		await createRedisIndex(mockClient, mockIndex);

		expect(mockClient.ft._LIST).toHaveBeenCalled();
		expect(mockClient.ft.create).toHaveBeenCalledWith(
			mockIndex.name,
			mockIndex.schema,
			mockIndex.options,
		);
		expect(mockClient.ft.dropIndex).not.toHaveBeenCalled();
	});

	test("saves index hash after creating new index", async () => {
		const mockIndex: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		await createRedisIndex(mockClient, mockIndex);

		expect(mockClient.hSet).toHaveBeenCalled();
		const hSetCall = vi.mocked(mockClient.hSet).mock.calls[0];
		expect(hSetCall?.[0]).toBe("_index_hashes");
		expect(hSetCall?.[1]).toBe(mockIndex.name);
		expect(typeof hSetCall?.[2]).toBe("string"); // hash string
	});

	test("does not recreate index when hash matches existing index", async () => {
		const mockIndex: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		// First create the index
		await createRedisIndex(mockClient, mockIndex);
		const firstHash = vi.mocked(mockClient.hSet).mock.calls[0]?.[2] as string;

		// Reset mocks but keep the hash
		vi.clearAllMocks();
		vi.mocked(mockClient.ft._LIST).mockResolvedValue([mockIndex.name]);
		vi.mocked(mockClient.hGet).mockResolvedValue(firstHash);

		// Try to create again with same definition
		await createRedisIndex(mockClient, mockIndex);

		// Should check for existing index
		expect(mockClient.ft._LIST).toHaveBeenCalled();
		// Should fetch existing hash
		expect(mockClient.hGet).toHaveBeenCalledWith(
			"_index_hashes",
			mockIndex.name,
		);
		// Should not drop or create
		expect(mockClient.ft.dropIndex).not.toHaveBeenCalled();
		expect(mockClient.ft.create).not.toHaveBeenCalled();
		// Should not save hash again
		expect(mockClient.hSet).not.toHaveBeenCalled();
	});

	test("recreates index when hash does not match", async () => {
		const mockIndex: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		// First create the index
		await createRedisIndex(mockClient, mockIndex);

		// Reset mocks
		vi.clearAllMocks();
		vi.mocked(mockClient.ft._LIST).mockResolvedValue([mockIndex.name]);
		vi.mocked(mockClient.hGet).mockResolvedValue("different-hash");

		// Modify the index
		const modifiedIndex: RedisIndex = {
			...mockIndex,
			schema: {
				...mockIndex.schema,
				field2: SCHEMA_FIELD_TYPE.TAG,
			},
		};

		// Try to create again with different definition
		await createRedisIndex(mockClient, modifiedIndex);

		// Should check for existing index
		expect(mockClient.ft._LIST).toHaveBeenCalled();
		// Should fetch existing hash
		expect(mockClient.hGet).toHaveBeenCalledWith(
			"_index_hashes",
			mockIndex.name,
		);
		// Should drop existing index
		expect(mockClient.ft.dropIndex).toHaveBeenCalledWith(mockIndex.name);
		// Should create new index
		expect(mockClient.ft.create).toHaveBeenCalledWith(
			modifiedIndex.name,
			modifiedIndex.schema,
			modifiedIndex.options,
		);
		// Should save new hash
		expect(mockClient.hSet).toHaveBeenCalled();
	});

	test("recreates index when schema changes", async () => {
		const mockIndex: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		await createRedisIndex(mockClient, mockIndex);
		const firstHash = vi.mocked(mockClient.hSet).mock.calls[0]?.[2] as string;

		vi.clearAllMocks();
		vi.mocked(mockClient.ft._LIST).mockResolvedValue([mockIndex.name]);
		vi.mocked(mockClient.hGet).mockResolvedValue(firstHash);

		const modifiedIndex: RedisIndex = {
			name: mockIndex.name,
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
				field2: SCHEMA_FIELD_TYPE.TEXT,
			},
			options: {},
		};

		await createRedisIndex(mockClient, modifiedIndex);

		expect(mockClient.ft.dropIndex).toHaveBeenCalled();
		expect(mockClient.ft.create).toHaveBeenCalled();
	});

	test("recreates index when options change", async () => {
		const mockIndex: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		await createRedisIndex(mockClient, mockIndex);
		const firstHash = vi.mocked(mockClient.hSet).mock.calls[0]?.[2] as string;

		vi.clearAllMocks();
		vi.mocked(mockClient.ft._LIST).mockResolvedValue([mockIndex.name]);
		vi.mocked(mockClient.hGet).mockResolvedValue(firstHash);

		const modifiedIndex: RedisIndex = {
			name: mockIndex.name,
			schema: mockIndex.schema,
			options: {
				ON: "HASH" as const,
			},
		};

		await createRedisIndex(mockClient, modifiedIndex);

		expect(mockClient.ft.dropIndex).toHaveBeenCalled();
		expect(mockClient.ft.create).toHaveBeenCalled();
	});

	test("handles missing hash gracefully when index exists", async () => {
		const mockIndex: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		vi.mocked(mockClient.ft._LIST).mockResolvedValue([mockIndex.name]);
		vi.mocked(mockClient.hGet).mockResolvedValue(null); // No hash stored

		await createRedisIndex(mockClient, mockIndex);

		// Should recreate since hash doesn't match (null vs computed hash)
		expect(mockClient.ft.dropIndex).toHaveBeenCalledWith(mockIndex.name);
		expect(mockClient.ft.create).toHaveBeenCalled();
	});

	test("generates consistent hash for same index definition", async () => {
		const mockIndex: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
				field2: SCHEMA_FIELD_TYPE.TEXT,
			},
			options: {
				ON: "HASH" as const,
			},
		};

		await createRedisIndex(mockClient, mockIndex);
		const hash1 = vi.mocked(mockClient.hSet).mock.calls[0]?.[2] as string;

		vi.clearAllMocks();
		mockClient.ft._LIST = vi.fn().mockResolvedValue([]);

		await createRedisIndex(mockClient, mockIndex);
		const hash2 = vi.mocked(mockClient.hSet).mock.calls[0]?.[2] as string;

		// Same index definition should produce same hash
		expect(hash1).toBe(hash2);
	});

	test("generates different hash for different index definitions", async () => {
		const mockIndex1: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		const mockIndex2: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TEXT, // Different field type
			},
			options: {},
		};

		await createRedisIndex(mockClient, mockIndex1);
		const hash1 = vi.mocked(mockClient.hSet).mock.calls[0]?.[2] as string;

		vi.clearAllMocks();
		mockClient.ft._LIST = vi.fn().mockResolvedValue([]);

		await createRedisIndex(mockClient, mockIndex2);
		const hash2 = vi.mocked(mockClient.hSet).mock.calls[0]?.[2] as string;

		// Different index definitions should produce different hashes
		expect(hash1).not.toBe(hash2);
	});
});

describe("deleteRedisIndex", () => {
	let mockClient: RedisClientType;

	beforeEach(() => {
		vi.clearAllMocks();
		mockClient = {
			ft: {
				_LIST: vi.fn(),
				create: vi.fn(),
				dropIndex: vi.fn().mockResolvedValue("OK"),
				info: vi.fn(),
			},
			hGet: vi.fn(),
			hSet: vi.fn(),
			hDel: vi.fn().mockResolvedValue(1),
		} as unknown as RedisClientType;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("types", async () => {
		const indexName = "test-index";

		// Test return type is Promise<void>
		const result: Promise<void> = deleteRedisIndex(mockClient, indexName);
		await result;

		// Test parameter types
		const clientParam: RedisClientType = mockClient;
		const indexNameParam: string = indexName;

		// Type assertions
		expect(result).toBeInstanceOf(Promise);
		expect(typeof clientParam).toBe("object");
		expect(typeof indexNameParam).toBe("string");
	});

	test("drops index from Redis", async () => {
		const indexName = "test-index";

		await deleteRedisIndex(mockClient, indexName);

		expect(mockClient.ft.dropIndex).toHaveBeenCalledWith(indexName);
		expect(mockClient.ft.dropIndex).toHaveBeenCalledTimes(1);
	});

	test("deletes index hash after dropping index", async () => {
		const indexName = "test-index";

		await deleteRedisIndex(mockClient, indexName);

		expect(mockClient.hDel).toHaveBeenCalledWith("_index_hashes", indexName);
		expect(mockClient.hDel).toHaveBeenCalledTimes(1);
	});

	test("drops index before deleting hash", async () => {
		const indexName = "test-index";
		const callOrder: string[] = [];

		vi.mocked(mockClient.ft.dropIndex).mockImplementation(async () => {
			callOrder.push("dropIndex");
			return "OK";
		});
		vi.mocked(mockClient.hDel).mockImplementation(async () => {
			callOrder.push("hDel");
			return 1;
		});

		await deleteRedisIndex(mockClient, indexName);

		expect(callOrder[0]).toBe("dropIndex");
		expect(callOrder[1]).toBe("hDel");
	});

	test("handles different index names", async () => {
		const indexNames = ["index1", "index2", "test:index:3"];

		for (const indexName of indexNames) {
			vi.clearAllMocks();
			await deleteRedisIndex(mockClient, indexName);

			expect(mockClient.ft.dropIndex).toHaveBeenCalledWith(indexName);
			expect(mockClient.hDel).toHaveBeenCalledWith(
				"_index_hashes",
				indexName,
			);
		}
	});
});
