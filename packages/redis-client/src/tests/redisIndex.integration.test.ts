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
import { beforeAll, describe, expect, test } from "vitest";
import { type RedisIndex, createRedisIndex } from "../../redis/redisIndex.js";
import { createTestRedisClient } from "./testRedisClient.js";

let indexCount = 0;
const getTestIndexName = () => `index:${indexCount++}`;

describe("redisIndex", () => {
	let redisClient: RedisClientType;

	beforeAll(async () => {
		redisClient = await createTestRedisClient();
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
});
