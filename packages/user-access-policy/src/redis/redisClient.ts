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
import type { Logger } from "@prosopo/common";
import type { RedisClientType } from "redis";
import { type ZodType, z } from "zod";

export const REDIS_BATCH_SIZE = 1_000;

export const getMissingRedisKeys = async (
	client: RedisClientType,
	keys: string[],
): Promise<string[]> => {
	const queries = client.multi();

	keys.map((key) => {
		queries.exists(key);
	});

	const records: unknown[] = await queries.exec();

	const missingKeys: string[] = [];

	records.map((exists, recordIndex) => {
		if ("0" === String(exists)) {
			const key = keys[recordIndex];

			if (key) {
				missingKeys.push(key);
			}
		}
	});

	return missingKeys;
};

export const fetchRedisHashRecords = async (
	client: RedisClientType,
	keys: string[],
	logger: Logger,
): Promise<{ records: object[]; expirations: (number | undefined)[] }> => {
	const rulesPipe = client.multi();
	const expirationPipe = client.multi();

	for (const key of keys) {
		rulesPipe.hGetAll(key);
		expirationPipe.expireTime(key);
	}

	const records = (await rulesPipe.exec()) as object[];
	const expirationRecords = (await expirationPipe.exec()) as unknown[];

	return {
		records: records,
		expirations: parseExpirationRecords(expirationRecords, logger),
	};
};

export const parseRedisRecords = <T>(
	records: unknown[],
	recordSchema: ZodType<T>,
	logger: Logger,
): T[] =>
	records.flatMap((record) => {
		const parseResult = recordSchema.safeParse(record);

		if (parseResult.success) {
			return [parseResult.data];
		}

		logger.error(() => ({
			msg: "Failed to parse Redis record",
			data: { record, error: parseResult.error },
		}));

		return [];
	});

const expirationRecordSchema = z.coerce.number();
// Redis returns -1 when expiration is not set
const UNSET_EXPIRATION_VALUE = -1;

const parseExpirationRecords = <T>(
	records: unknown[],
	logger: Logger,
): (number | undefined)[] =>
	records.flatMap((record) => {
		const parseResult = expirationRecordSchema.safeParse(record);

		if (parseResult.success) {
			const expiration =
				UNSET_EXPIRATION_VALUE === parseResult.data
					? undefined
					: parseResult.data;

			return [expiration];
		}

		logger.error(() => ({
			msg: "Failed to parse Redis expiration record",
			data: {
				record,
				error: parseResult.error,
			},
		}));

		// ensure consistent output length
		return [undefined];
	});
