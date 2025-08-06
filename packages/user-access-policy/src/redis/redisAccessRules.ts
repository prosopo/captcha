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
import type { Logger } from "@prosopo/common";
import type { SearchReply } from "@redis/search";
import type { SearchNoContentReply } from "@redis/search/dist/lib/commands/SEARCH_NOCONTENT.js";
import type { RedisClientType } from "redis";
import type { PolicyFilter } from "#policy/accessPolicyResolver.js";
import {
	type AccessRule,
	type AccessRulesReader,
	type AccessRulesStorage,
	type AccessRulesWriter,
	accessRuleSchema,
} from "#policy/accessRules.js";
import {
	accessRuleRedisKeyPrefix,
	accessRulesRedisIndexName,
	accessRulesRedisSearchOptions,
	getRedisAccessRuleKey,
	getRedisAccessRuleValue,
} from "#policy/redis/redisAccessRulesIndex.js";
import {getRedisAccessRulesQuery} from "#policy/redis/redisAccesRulesQuery.js";

export const createRedisAccessRulesReader = (
	client: RedisClientType,
	logger: Logger,
): AccessRulesReader => {
	return {
		findRules: async (
			filter: PolicyFilter,
			matchingFieldsOnly = false,
			skipEmptyUserScopes = true,
		): Promise<AccessRule[]> => {
			const query = getRedisAccessRulesQuery(filter, matchingFieldsOnly);

			if (skipEmptyUserScopes && query === "ismissing(@clientId)") {
				// We don't want to accidentally return all rules when the filter is empty
				return [];
			}

			let searchReply: SearchReply;

			try {
				searchReply = await client.ft.search(
					accessRulesRedisIndexName,
					query,
					accessRulesRedisSearchOptions,
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
								{ depth: null },
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

			return extractAccessRulesFromSearchReply(searchReply, logger);
		},

		findRuleIds: async (
			filter: PolicyFilter,
			matchingFieldsOnly = false,
		): Promise<string[]> => {
			const query = getRedisAccessRulesQuery(filter, matchingFieldsOnly);

			let searchReply: SearchNoContentReply;

			try {
				searchReply = await client.ft.searchNoContent(
					accessRulesRedisIndexName,
					query,
					accessRulesRedisSearchOptions,
				);
			} catch (e) {
				// 	debug(fn: LogRecordFn): void;
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

			return searchReply.documents;
		},
	};
};

export const createRedisAccessRulesWriter = (
	client: RedisClientType,
): AccessRulesWriter => {
	return {
		insertRule: async (
			rule: AccessRule,
			expirationTimestamp?: number,
		): Promise<string> => {
			const ruleKey = getRedisAccessRuleKey(rule);
			const ruleValue = getRedisAccessRuleValue(rule);

			await client.hSet(ruleKey, ruleValue);

			if (expirationTimestamp) {
				const expiryDate = new Date(expirationTimestamp);
				if (expiryDate.getUTCFullYear() === 1970) {
					// timestamp is already in seconds
					await client.expireAt(ruleKey, expirationTimestamp);
				} else {
					const timestampInSeconds = Math.floor(expirationTimestamp / 1000);
					await client.expireAt(ruleKey, timestampInSeconds);
				}
			}

			return ruleKey;
		},

		deleteRules: async (ruleIds: string[]): Promise<void> =>
			void (await client.del(ruleIds)),

		deleteAllRules: async (): Promise<number> => {
			const keys = await client.keys(`${accessRuleRedisKeyPrefix}*`);

			if (keys.length === 0) return 0;

			return await client.del(keys);
		},
	};
};

export const createRedisAccessRulesStorage = (
	client: RedisClientType,
	logger: Logger,
): AccessRulesStorage => {
	return {
		...createRedisAccessRulesReader(client, logger),
		...createRedisAccessRulesWriter(client),
	};
};

const extractAccessRulesFromSearchReply = (
	searchReply: SearchReply,
	logger: Logger,
): AccessRule[] => {
	const accessRules: AccessRule[] = [];

	searchReply.documents.map(({ id, value: document }) => {
		const parsedDocument = accessRuleSchema.safeParse(document);

		if (parsedDocument.success) {
			accessRules.push(parsedDocument.data);
		} else {
			logger.debug(() => ({
				msg: "Failed to parse access rule from search reply",
				id: id,
				error: parsedDocument.error,
			}));
		}
	});

	return accessRules;
};
