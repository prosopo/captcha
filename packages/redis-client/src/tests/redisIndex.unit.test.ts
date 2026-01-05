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
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type RedisIndex,
	createRedisIndex,
	deleteRedisIndex,
} from "../redisIndex.js";

describe("createRedisIndex", () => {
	let mockClient: RedisClientType;
	let mockFtList: ReturnType<typeof vi.fn>;
	let mockFtCreate: ReturnType<typeof vi.fn>;
	let mockFtDropIndex: ReturnType<typeof vi.fn>;
	let mockHGet: ReturnType<typeof vi.fn>;
	let mockHSet: ReturnType<typeof vi.fn>;
	let mockHDel: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockFtList = vi.fn();
		mockFtCreate = vi.fn();
		mockFtDropIndex = vi.fn();
		mockHGet = vi.fn();
		mockHSet = vi.fn();
		mockHDel = vi.fn();

		mockClient = {
			ft: {
				_LIST: mockFtList,
				create: mockFtCreate,
				dropIndex: mockFtDropIndex,
			},
			hGet: mockHGet,
			hSet: mockHSet,
			hDel: mockHDel,
		} as unknown as RedisClientType;
	});

	it("creates new index when index does not exist", async () => {
		const index: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		mockFtList.mockResolvedValue([]);
		mockHSet.mockResolvedValue(1);

		await createRedisIndex(mockClient, index);

		expect(mockFtList).toHaveBeenCalled();
		expect(mockFtCreate).toHaveBeenCalledWith(
			index.name,
			index.schema,
			index.options,
		);
		expect(mockHSet).toHaveBeenCalled();
		expect(mockFtDropIndex).not.toHaveBeenCalled();
	});

	it("skips creation when index exists with same hash", async () => {
		const index: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		const indexHash = "abc123";
		mockFtList.mockResolvedValue([index.name]);
		mockHGet.mockResolvedValue(indexHash);

		await createRedisIndex(mockClient, index);

		expect(mockFtList).toHaveBeenCalled();
		expect(mockHGet).toHaveBeenCalledWith("_index_hashes", index.name);
		expect(mockFtCreate).not.toHaveBeenCalled();
		expect(mockFtDropIndex).not.toHaveBeenCalled();
		expect(mockHSet).not.toHaveBeenCalled();
	});

	it("re-creates index when index exists with different hash", async () => {
		const index: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		mockFtList.mockResolvedValue([index.name]);
		mockHGet.mockResolvedValue("different-hash");
		mockHSet.mockResolvedValue(1);

		await createRedisIndex(mockClient, index);

		expect(mockFtList).toHaveBeenCalled();
		expect(mockHGet).toHaveBeenCalledWith("_index_hashes", index.name);
		expect(mockFtDropIndex).toHaveBeenCalledWith(index.name);
		expect(mockFtCreate).toHaveBeenCalledWith(
			index.name,
			index.schema,
			index.options,
		);
		expect(mockHSet).toHaveBeenCalled();
	});

	it("re-creates index when existing hash is null", async () => {
		const index: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		mockFtList.mockResolvedValue([index.name]);
		mockHGet.mockResolvedValue(null);
		mockHSet.mockResolvedValue(1);

		await createRedisIndex(mockClient, index);

		expect(mockFtDropIndex).toHaveBeenCalledWith(index.name);
		expect(mockFtCreate).toHaveBeenCalledWith(
			index.name,
			index.schema,
			index.options,
		);
	});

	it("handles index with different schema fields", async () => {
		const index: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
				field2: SCHEMA_FIELD_TYPE.NUMERIC,
			},
			options: {},
		};

		mockFtList.mockResolvedValue([]);
		mockHSet.mockResolvedValue(1);

		await createRedisIndex(mockClient, index);

		expect(mockFtCreate).toHaveBeenCalledWith(
			index.name,
			index.schema,
			index.options,
		);
	});

	it("handles index with options", async () => {
		const index: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {
				ON: "HASH",
			},
		};

		mockFtList.mockResolvedValue([]);
		mockHSet.mockResolvedValue(1);

		await createRedisIndex(mockClient, index);

		expect(mockFtCreate).toHaveBeenCalledWith(
			index.name,
			index.schema,
			index.options,
		);
	});

	it("generates consistent hash for same index definition", async () => {
		const index: RedisIndex = {
			name: "test-index",
			schema: {
				field1: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		mockFtList.mockResolvedValue([index.name]);
		mockHGet.mockResolvedValue("same-hash");
		mockHSet.mockResolvedValue(1);

		await createRedisIndex(mockClient, index);
		await createRedisIndex(mockClient, index);

		expect(mockHGet).toHaveBeenCalledTimes(2);
		expect(mockHGet).toHaveBeenNthCalledWith(1, "_index_hashes", index.name);
		expect(mockHGet).toHaveBeenNthCalledWith(2, "_index_hashes", index.name);
		expect(mockFtCreate).not.toHaveBeenCalled();
	});
});

describe("deleteRedisIndex", () => {
	let mockClient: RedisClientType;
	let mockFtDropIndex: ReturnType<typeof vi.fn>;
	let mockHDel: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockFtDropIndex = vi.fn();
		mockHDel = vi.fn();

		mockClient = {
			ft: {
				dropIndex: mockFtDropIndex,
			},
			hDel: mockHDel,
		} as unknown as RedisClientType;
	});

	it("deletes index and hash", async () => {
		const indexName = "test-index";

		mockFtDropIndex.mockResolvedValue("OK");
		mockHDel.mockResolvedValue(1);

		await deleteRedisIndex(mockClient, indexName);

		expect(mockFtDropIndex).toHaveBeenCalledWith(indexName);
		expect(mockHDel).toHaveBeenCalledWith("_index_hashes", indexName);
	});

	it("handles deletion of non-existent index", async () => {
		const indexName = "non-existent-index";

		mockFtDropIndex.mockResolvedValue("OK");
		mockHDel.mockResolvedValue(0);

		await deleteRedisIndex(mockClient, indexName);

		expect(mockFtDropIndex).toHaveBeenCalledWith(indexName);
		expect(mockHDel).toHaveBeenCalledWith("_index_hashes", indexName);
	});
});
