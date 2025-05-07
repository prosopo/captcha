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

import crypto from "node:crypto";
import type { RediSearchSchema } from "@redis/search";
import type { RedisClientType } from "redis";

/*
 * Index command example:
 *
 * FT.CREATE index:test
 * ON HASH
 * SCHEMA
 * clientId TAG INDEXMISSING
 * id TAG
 * ip NUMERIC
 * ja4Fingerprint TAG
 * headersFingerprint TAG
 * */
export type RedisIndex = {
	name: string;
	schema: RediSearchSchema;
	options: object;
};

/**
 * Index re-creation is a priceful operation, especially on the large sets.
 * Using index hashes we avoid re-creation when the index definition is the same.
 */
const redisIndexHashesRecordKey = "_index_hashes";
const redisIndexHashAlgorithm = "sha256";

export const createRedisIndex = async (
	client: RedisClientType,
	index: RedisIndex,
): Promise<void> => {
	const indexHash = createIndexHash(index);

	const existingIndexes = await client.ft._LIST();

	if (existingIndexes.includes(index.name)) {
		const existingIndexHash = await fetchIndexHash(client, index.name);

		if (indexHash === existingIndexHash) {
			return;
		}

		await client.ft.dropIndex(index.name);
	}

	await client.ft.create(index.name, index.schema, index.options);

	await saveIndexHash(client, index.name, indexHash);
};

const createIndexHash = (index: RedisIndex): string =>
	crypto
		.createHash(redisIndexHashAlgorithm)
		.update(JSON.stringify(index))
		.digest("hex");

const fetchIndexHash = async (
	client: RedisClientType,
	indexName: string,
): Promise<string | null> => client.hGet(redisIndexHashesRecordKey, indexName);

const saveIndexHash = async (
	client: RedisClientType,
	indexName: string,
	indexHash: string,
): Promise<number> =>
	client.hSet(redisIndexHashesRecordKey, indexName, indexHash);
