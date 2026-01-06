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
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
	type RedisIndex,
	createRedisIndex,
	deleteRedisIndex,
} from "../redisIndex.js";
import {
	createTestRedisConnection,
	stopTestRedisContainer,
} from "./testRedisConnection.js";

const testIndexNames: string[] = [];
const getTestIndexName = () => {
	const indexName = `test-index:${testIndexNames.length}`;

	testIndexNames.push(indexName);

	return indexName;
};

describe("redisIndex", () => {
	let redisClient: RedisClientType;

	beforeAll(async () => {
		const connection = await createTestRedisConnection();
		redisClient = await connection.getClient();
	}, 60000);

	afterAll(async () => {
		const deleteIndexPromises = testIndexNames.map(
			async (indexName) => await deleteRedisIndex(redisClient, indexName),
		);

		await Promise.all(deleteIndexPromises);
		await stopTestRedisContainer();
	});

	test("creates new index", async () => {
		// given
		const redisIndex: RedisIndex = {
			name: getTestIndexName(),
			schema: {
				tagField: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		// when
		await createRedisIndex(redisClient, redisIndex);

		// then
		const indexNames = await redisClient.ft._LIST();

		expect(indexNames).toContain(redisIndex.name);
	});

	test("does not re-create existing index when no changes declared", async () => {
		// given
		const redisIndex: RedisIndex = {
			name: getTestIndexName(),
			schema: {
				tagField: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		// when
		await createRedisIndex(redisClient, redisIndex);

		await redisClient.ft.alter(redisIndex.name, {
			anotherField: SCHEMA_FIELD_TYPE.TAG,
		});

		// creation again with the old definition will override the manual changes if applied.
		await createRedisIndex(redisClient, redisIndex);

		// then
		const indexNames = await redisClient.ft._LIST();
		const actualIndexInfo = await redisClient.ft.info(redisIndex.name);

		expect(indexNames).toContain(redisIndex.name);
		// "2" fields means the second creation call was skipped,
		// and our manual changes are in the place.
		expect(actualIndexInfo.attributes.length).toBe(2);
	});

	test("re-creates existing index when schema changes made", async () => {
		// given
		const redisIndex: RedisIndex = {
			name: getTestIndexName(),
			schema: {
				tagField: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		// when
		await createRedisIndex(redisClient, redisIndex);

		redisIndex.schema = {
			...redisIndex.schema,
			newField: SCHEMA_FIELD_TYPE.TAG,
		};

		await createRedisIndex(redisClient, redisIndex);

		// then
		const indexNames = await redisClient.ft._LIST();
		const actualIndexInfo = await redisClient.ft.info(redisIndex.name);

		expect(indexNames).toContain(redisIndex.name);
		// "2" fields means the second creation call was executed
		expect(actualIndexInfo.attributes.length).toBe(2);
	});

	test("re-creates existing index when option changes made", async () => {
		// given
		const redisIndex: RedisIndex = {
			name: getTestIndexName(),
			schema: {
				tagField: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		// when
		await createRedisIndex(redisClient, redisIndex);

		redisIndex.options = {
			ON: "HASH" as const,
		};

		await createRedisIndex(redisClient, redisIndex);

		// then
		const indexNames = await redisClient.ft._LIST();
		const actualIndexInfo = await redisClient.ft.info(redisIndex.name);

		expect(indexNames).toContain(redisIndex.name);
		expect(actualIndexInfo.index_definition.key_type).toBe("HASH");
	});

	test("saves index hash after creating new index", async () => {
		const redisIndex: RedisIndex = {
			name: getTestIndexName(),
			schema: {
				tagField: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		await createRedisIndex(redisClient, redisIndex);

		const hash = await redisClient.hGet("_index_hashes", redisIndex.name);
		expect(hash).toBeTruthy();
		expect(typeof hash).toBe("string");
	});

	test("generates consistent hash for same index definition", async () => {
		const redisIndex: RedisIndex = {
			name: getTestIndexName(),
			schema: {
				tagField: SCHEMA_FIELD_TYPE.TAG,
				textField: SCHEMA_FIELD_TYPE.TEXT,
			},
			options: {
				ON: "HASH" as const,
			},
		};

		await createRedisIndex(redisClient, redisIndex);
		const hash1 = await redisClient.hGet("_index_hashes", redisIndex.name);

		await redisClient.ft.dropIndex(redisIndex.name);
		await redisClient.hDel("_index_hashes", redisIndex.name);

		await createRedisIndex(redisClient, redisIndex);
		const hash2 = await redisClient.hGet("_index_hashes", redisIndex.name);

		expect(hash1).toBe(hash2);
	});

	test("generates different hash for different index definitions", async () => {
		const redisIndex1: RedisIndex = {
			name: getTestIndexName(),
			schema: {
				tagField: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		const redisIndex2: RedisIndex = {
			name: getTestIndexName(),
			schema: {
				tagField: SCHEMA_FIELD_TYPE.TEXT,
			},
			options: {},
		};

		await createRedisIndex(redisClient, redisIndex1);
		const hash1 = await redisClient.hGet("_index_hashes", redisIndex1.name);

		await createRedisIndex(redisClient, redisIndex2);
		const hash2 = await redisClient.hGet("_index_hashes", redisIndex2.name);

		expect(hash1).not.toBe(hash2);
	});

	test("handles missing hash gracefully when index exists", async () => {
		const redisIndex: RedisIndex = {
			name: getTestIndexName(),
			schema: {
				tagField: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		await createRedisIndex(redisClient, redisIndex);
		await redisClient.hDel("_index_hashes", redisIndex.name);

		await createRedisIndex(redisClient, redisIndex);

		const indexNames = await redisClient.ft._LIST();
		expect(indexNames).toContain(redisIndex.name);
	});

	test("deleteRedisIndex drops index from Redis", async () => {
		const indexName = getTestIndexName();
		const redisIndex: RedisIndex = {
			name: indexName,
			schema: {
				tagField: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		await createRedisIndex(redisClient, redisIndex);

		await deleteRedisIndex(redisClient, indexName);

		const indexNames = await redisClient.ft._LIST();
		expect(indexNames).not.toContain(indexName);
	});

	test("deleteRedisIndex deletes index hash after dropping index", async () => {
		const indexName = getTestIndexName();
		const redisIndex: RedisIndex = {
			name: indexName,
			schema: {
				tagField: SCHEMA_FIELD_TYPE.TAG,
			},
			options: {},
		};

		await createRedisIndex(redisClient, redisIndex);
		await deleteRedisIndex(redisClient, indexName);

		const hash = await redisClient.hGet("_index_hashes", indexName);
		expect(hash).toBeNull();
	});

	test("deleteRedisIndex handles different index names", async () => {
		const indexNames = [
			getTestIndexName(),
			getTestIndexName(),
			getTestIndexName(),
		];

		for (const indexName of indexNames) {
			const redisIndex: RedisIndex = {
				name: indexName,
				schema: {
					tagField: SCHEMA_FIELD_TYPE.TAG,
				},
				options: {},
			};

			await createRedisIndex(redisClient, redisIndex);
			await deleteRedisIndex(redisClient, indexName);

			const existingIndexes = await redisClient.ft._LIST();
			expect(existingIndexes).not.toContain(indexName);
		}
	});
});
