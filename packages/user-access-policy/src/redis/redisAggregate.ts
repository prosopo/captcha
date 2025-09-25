import type {
    AggregateWithCursorReply,
    FtAggregateWithCursorOptions
} from "@redis/search/dist/lib/commands/AGGREGATE_WITHCURSOR.js";
import type {RedisClientType} from "redis";
import {z} from "zod";
import {ACCESS_RULES_REDIS_INDEX_NAME} from "#policy/redis/redisRulesStorage.js";

const BATCH_SIZE = 1000;

// aggregation is used for cases when we need to get "unlimited" search results
const aggregateOptions: FtAggregateWithCursorOptions = {
    // #2 is a required option when the 'ismissing()' function is in the query body
    DIALECT: 2,
    COUNT: BATCH_SIZE,
};

const aggregateRecordSchema=z.object({
    "@__key": z.string(),
})

const aggregateKeys = async (
    client: RedisClientType,
    query: string,
): Promise<string[]> => {
    const keys:string[];
    let reply: AggregateWithCursorReply;

    const addKeys= (reply: AggregateWithCursorReply) => {

    }

    reply = await client.ft.aggregateWithCursor(
        ACCESS_RULES_REDIS_INDEX_NAME,
        query,
        {
            ...aggregateOptions,
            // it's a reserved name for the record key
            LOAD: "@__key",
        },
    );

    addKeys(reply);

    while(0!==reply.cursor){
        addKeys(reply);
    }

    reply = await client.ft.cursorRead(
        ACCESS_RULES_REDIS_INDEX_NAME,
        reply.cursor,
        { COUNT: BATCH_SIZE },
    );

    return keys;
};