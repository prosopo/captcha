import type { Logger } from "@prosopo/common";
import type { FtAggregateWithCursorOptions } from "@redis/search/dist/lib/commands/AGGREGATE_WITHCURSOR.js";
import type { RedisClientType } from "redis";
import { z } from "zod";
import { ACCESS_RULES_REDIS_INDEX_NAME } from "#policy/redis/redisRuleIndex.js";
import { parseRedisRecords } from "#policy/redis/redisRulesStorage.js";

const BATCH_SIZE = 1000;

// aggregation is used for cases when we need to get "unlimited" search results
const aggregateOptions: FtAggregateWithCursorOptions = {
	// #2 is a required option when the 'ismissing()' function is in the query body
	DIALECT: 2,
	COUNT: BATCH_SIZE,
};

export const aggregateRedisKeys = async (
	client: RedisClientType,
	query: string,
	logger: Logger,
): Promise<string[]> => {
	const keyField = "__key";

	const recordSchema = z.object({
		// it's a reserved name for the record key
		[keyField]: z.string(),
	});

	const foundKeys: string[] = [];

	const addRecordKeys = (records: object[]) => {
		const parsedRecords = parseRedisRecords(records, recordSchema, logger);

		const recordKeys = parsedRecords.map((record) => record[keyField]);

		foundKeys.push(...recordKeys);

		logger.debug(() => ({
			msg: "Processed aggregation batch",
			data: {
				size: recordKeys.length,
			},
		}));
	};

	await executeAggregation(
		client,
		query,
		{
			...aggregateOptions,
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
	handleBatch: (records: object[]) => void,
): Promise<void> => {
	const initialReply = await client.ft.aggregateWithCursor(
		ACCESS_RULES_REDIS_INDEX_NAME,
		query,
		aggregateOptions,
	);

	handleBatch(initialReply.results);

	let cursor = initialReply.cursor;

	while (0 !== cursor) {
		const batchReply = await client.ft.cursorRead(
			ACCESS_RULES_REDIS_INDEX_NAME,
			cursor,
			{ COUNT: BATCH_SIZE },
		);

		handleBatch(batchReply.results);

		cursor = batchReply.cursor;
	}
};
