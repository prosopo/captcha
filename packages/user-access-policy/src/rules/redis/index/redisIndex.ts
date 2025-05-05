import crypto from "node:crypto";
import type {RediSearchSchema} from "@redis/search";
import type {RedisClientType} from "redis";

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
    name: string,
    schema: RediSearchSchema,
    options: object
}

/**
 * Index re-creation is a priceful operation, especially on the large sets.
 * Using index hashes we avoid re-creation when the index definition is the same.
 */
const indexHashesRecordKey = "_index_hashes";
const indexHashAlgorithm = "sha256";

export const createRedisIndex = async (
    client: RedisClientType,
    index: RedisIndex
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

const createIndexHash =
    (index: RedisIndex): string =>
        crypto
            .createHash(indexHashAlgorithm)
            .update(JSON.stringify(index))
            .digest("hex");


const fetchIndexHash =
    async (client: RedisClientType, indexName: string): Promise<string | null> =>
        client.hGet(
            indexHashesRecordKey,
            indexName,
        );

const saveIndexHash =
    async (client: RedisClientType, indexName: string, indexHash: string): Promise<number> =>
        client.hSet(
            indexHashesRecordKey,
            indexName,
            indexHash,
        );
