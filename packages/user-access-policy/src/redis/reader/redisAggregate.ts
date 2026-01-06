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
import type { FtAggregateWithCursorOptions } from "@redis/search/dist/lib/commands/AGGREGATE_WITHCURSOR.js";
import type { RedisClientType } from "redis";
import { z } from "zod";
import { REDIS_QUERY_DIALECT } from "#policy/redis/reader/redisRulesQuery.js";
import {
	REDIS_BATCH_SIZE,
	parseRedisRecords,
} from "#policy/redis/redisClient.js";
import { ACCESS_RULES_REDIS_INDEX_NAME } from "#policy/redis/redisRuleIndex.js";

// aggregation is used for cases when we need to get "unlimited" search results
export const aggregateRedisKeys = async (
	client: RedisClientType,
	query: string,
	logger: Logger,
	batchHandler?: (keys: string[]) => Promise<void>,
): Promise<string[]> => {
	const keyField = "__key";

	const recordSchema = z.object({
		// it's a reserved name for the record key
		[keyField]: z.string(),
	});

	const foundKeys: string[] = [];

	const addRecordKeys = async (records: object[]) => {
		const parsedRecords = parseRedisRecords(records, recordSchema, logger);

		const recordKeys = parsedRecords.map((record) => record[keyField]);

		if (batchHandler) {
			await batchHandler(recordKeys);
		} else {
			foundKeys.push(...recordKeys);

			logger.debug(() => ({
				msg: "Processed aggregation batch",
				data: {
					size: recordKeys.length,
				},
			}));
		}
	};

	await executeAggregation(
		client,
		query,
		{
			// #2 is a required option when the 'ismissing()' function is in the query body
			DIALECT: REDIS_QUERY_DIALECT,
			COUNT: REDIS_BATCH_SIZE,
			LOAD: `@${keyField}`,
		},
		addRecordKeys,
	);

	return foundKeys;
};

const executeAggregation = async (
	client: RedisClientType,
	query: string,
	aggregateOptions: FtAggregateWithCursorOptions,
	handleBatch: (records: object[]) => Promise<void>,
): Promise<void> => {
	const initialReply = await client.ft.aggregateWithCursor(
		ACCESS_RULES_REDIS_INDEX_NAME,
		query,
		aggregateOptions,
	);

	await handleBatch(initialReply.results);

	let cursor = initialReply.cursor;

	while (0 !== cursor) {
		const batchReply = await client.ft.cursorRead(
			ACCESS_RULES_REDIS_INDEX_NAME,
			cursor,
			{ COUNT: aggregateOptions.COUNT },
		);

		await handleBatch(batchReply.results);

		cursor = batchReply.cursor;
	}
};
