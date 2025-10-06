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

import * as util from "node:util";
import type {Logger} from "@prosopo/common";
import type {FtSearchOptions, SearchReply} from "@redis/search";
import type {RedisClientType} from "redis";
import {getRulesRedisQuery} from "#policy/redis/reader/redisRulesQuery.js";
import {
    ACCESS_RULES_REDIS_INDEX_NAME,
    ACCESS_RULE_REDIS_KEY_PREFIX,
} from "#policy/redis/redisRuleIndex.js";
import {parseRedisRecords} from "#policy/redis/redisRulesStorage.js";
import type {AccessRule} from "#policy/rule.js";
import {accessRuleInput} from "#policy/ruleInput/ruleInput.js";
import type {
    AccessRuleEntry,
    AccessRulesFilter,
    AccessRulesReader,
} from "#policy/rulesStorage.js";
import {aggregateRedisKeys} from "./redisAggregate.js";

// maximum is 10K
const DEFAULT_SEARCH_LIMIT = 1000;

// https://redis.io/docs/latest/commands/ft.search/
const redisSearchOptions: FtSearchOptions = {
    // #2 is a required option when the 'ismissing()' function is in the query body
    DIALECT: 2,
    // FT.search doesn't support "unlimited" selects
    LIMIT: {
        from: 0,
        size: DEFAULT_SEARCH_LIMIT,
    },
};

// Redis returns -1 when expiration is not set
const UNSET_EXPIRATION_VALUE = -1;

export const createRedisRulesReader = (
    client: RedisClientType,
    logger: Logger,
): AccessRulesReader => {
    return {
        getMissingRuleIds: async (ruleIds: string[]): Promise<string[]> => {
            const ruleKeys = ruleIds.map(id => `${ACCESS_RULE_REDIS_KEY_PREFIX}${id}`);

            const multi = client.multi();

            ruleKeys.forEach(key => {
                multi.exists(key);
            });

            const records: unknown[] = await multi.exec();

            const missingIds: string[] = [];

            records.forEach((exists, index) => {
                if ("0" === String(exists)) {
                    const ruleId = ruleIds[index];

                    if (ruleId) {
                        missingIds.push(ruleId);
                    }
                }
            });

            return missingIds;
        },

        fetchRule: async (ruleId: string): Promise<AccessRuleEntry | undefined> => {
            const ruleKey = `${ACCESS_RULE_REDIS_KEY_PREFIX}${ruleId}`;

            const ruleData = await client.hGetAll(ruleKey);

            const isRulePresent = Object.keys(ruleData).length > 0;

            if (isRulePresent) {
                const rules = parseRedisRecords([ruleData], accessRuleInput, logger);
                const rule = rules.pop();
                const expiresUnixTimestamp = await client.expireTime(ruleKey);

                if (rule) {
                    return {
                        rule: rule,
                        expiresUnixTimestamp:
                            UNSET_EXPIRATION_VALUE === expiresUnixTimestamp
                                ? undefined
                                : expiresUnixTimestamp,
                    };
                }
            }

            return undefined;
        },

        findRules: async (
            filter: AccessRulesFilter,
            matchingFieldsOnly = false,
            skipEmptyUserScopes = true,
        ): Promise<AccessRule[]> => {
            const query = getRulesRedisQuery(filter, matchingFieldsOnly);

            if (skipEmptyUserScopes && query === "ismissing(@clientId)") {
                // We don't want to accidentally return all rules when the filter is empty
                return [];
            }

            let searchReply: SearchReply;

            try {
                searchReply = await client.ft.search(
                    ACCESS_RULES_REDIS_INDEX_NAME,
                    query,
                    redisSearchOptions,
                );

                if (searchReply.total > 0) {
                    logger.debug(() => ({
                        msg: "Executed search query",
                        data: {
                            inspect: util.inspect(
                                {
                                    filter: filter,
                                    searchReply: searchReply,
                                    query: query,
                                },
                                {depth: null},
                            ),
                        },
                    }));
                }
            } catch (e) {
                logger.error(() => ({
                    err: e,
                    data: {
                        inspect: util.inspect(
                            {
                                query: query,
                                filter: filter,
                            },
                            {
                                depth: null,
                            },
                        ),
                    },
                    msg: "failed to execute search query",
                }));

                return [];
            }

            const records = searchReply.documents.map(({value}) => value);

            return parseRedisRecords(records, accessRuleInput, logger);
        },

        findRuleIds: async (
            filter: AccessRulesFilter,
            matchingFieldsOnly = false,
        ): Promise<string[]> => {
            const query = getRulesRedisQuery(filter, matchingFieldsOnly);

            let ruleIds: string[] = [];

            try {
                // aggregation is used instead ft.search to overcome the limitation on search results number
                const ruleKeys = await aggregateRedisKeys(client, query, logger);

                ruleIds = ruleKeys.map((ruleKey) =>
                    ruleKey.slice(ACCESS_RULE_REDIS_KEY_PREFIX.length),
                );
            } catch (e) {
                logger.error(() => ({
                    err: e,
                    data: {
                        inspect: util.inspect(
                            {
                                query: query,
                                filter: filter,
                            },
                            {
                                depth: null,
                            },
                        ),
                    },
                    msg: "Failed to execute search query for rule IDs",
                }));

                return [];
            }

            logger.debug(() => ({
                msg: "Executed search query for rule IDs",
                data: {
                    query: query,
                    foundCount: ruleIds.length,
                    foundIds: ruleIds,
                },
            }));

            return ruleIds;
        },
    };
};

export const getDummyRedisRulesReader = (logger: Logger): AccessRulesReader => {
    return {
        getMissingRuleIds: async (ruleIds: string[]): Promise<string[]> => {
            logger.info(() => ({
                msg: "Dummy getMissingRuleIds() has no effect (redis is not ready)",
                data: {
                    ruleIds,
                },
            }));

            return [];
        },

        fetchRule: async (ruleId: string): Promise<AccessRuleEntry | undefined> => {
            logger.info(() => ({
                msg: "Dummy fetchRule() has no effect (redis is not ready)",
                data: {
                    ruleId,
                },
            }));

            return undefined;
        },

        findRules: async (
            filter: AccessRulesFilter,
            matchingFieldsOnly = false,
            skipEmptyUserScopes = true,
        ): Promise<AccessRule[]> => {
            logger.info(() => ({
                msg: "Dummy findRules() has no effect (redis is not ready)",
                data: {
                    filter,
                },
            }));

            return [];
        },

        findRuleIds: async (
            filter: AccessRulesFilter,
            matchingFieldsOnly = false,
        ): Promise<string[]> => {
            logger.info(() => ({
                msg: "Dummy findRuleIds() has no effect (redis is not ready)",
                data: {
                    filter,
                },
            }));

            return [];
        },
    };
};
