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

import type {Logger} from "@prosopo/common";
import type {RedisConnection} from "@prosopo/redis-client";
import {z, type ZodType} from "zod";
import type {AccessRulesStorage} from "#policy/rulesStorage.js";
import {
    createRedisRulesReader,
    getDummyRedisRulesReader,
} from "./reader/redisRulesReader.js";
import {
    createRedisRulesWriter,
    getDummyRedisRulesWriter,
} from "./redisRulesWriter.js";

export const createRedisAccessRulesStorage = (
    connection: RedisConnection,
    logger: Logger,
): AccessRulesStorage => {
    const storage: AccessRulesStorage = {
        ...getDummyRedisRulesReader(logger),
        ...getDummyRedisRulesWriter(logger),
    };

    connection.getClient().then((client) => {
        Object.assign(storage, {
            ...createRedisRulesReader(client, logger),
            ...createRedisRulesWriter(client, logger),
        });

        logger.info(() => ({
            msg: "RedisAccessRules storage got a ready Redis client",
        }));
    });

    return storage;
};

export const parseRedisRecords = <T>(
    records: unknown[],
    recordSchema: ZodType<T>,
    logger: Logger,
): T[] => {
    const parsedRecords: T[] = [];

    records.map((record) => {
        const parseResult = recordSchema.safeParse(record);

        if (parseResult.success) {
            parsedRecords.push(parseResult.data);
            return;
        }

        logger.error(() => ({
            msg: "Failed to parse Redis record",
            data: {
                record,
                error: parseResult.error,
            },
        }));
    });

    return parsedRecords;
};

const expirationRecordSchema = z.coerce.number();

// Redis returns -1 when expiration is not set
const UNSET_EXPIRATION_VALUE = -1;

export const parseExpirationRecords = <T>(
    records: unknown[],
    logger: Logger,
): (number | undefined)[] => {
    const parsedRecords: (number | undefined)[] = [];

    records.map((record) => {
        const parseResult = expirationRecordSchema.safeParse(record);


        if (parseResult.success) {
            const expiration = UNSET_EXPIRATION_VALUE === parseResult.data ?
                undefined :
                parseResult.data;

            parsedRecords.push(expiration);

            return;
        }

        // ensure consistent output length
        parsedRecords.push(undefined);

        logger.error(() => ({
            msg: "Failed to parse Redis expiration record",
            data: {
                record,
                error: parseResult.error,
            },
        }));
    });

    return parsedRecords;
};
