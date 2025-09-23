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
import type { FtSearchOptions, SearchReply } from "@redis/search";
import type { SearchNoContentReply } from "@redis/search/dist/lib/commands/SEARCH_NOCONTENT.js";
import type { RedisClientType } from "redis";
import {
	type AccessRule,
	accessRuleSchema,
	getAccessRuleRedisQuery,
} from "#policy/accessRule.js";
import type {
	AccessRulesFilter,
	AccessRulesReader,
} from "#policy/storage/accessRulesStorage.js";
import { redisRulesIndexName } from "./redisRulesIndex.js";

const DEFAULT_SEARCH_LIMIT = 1000;

// https://redis.io/docs/latest/commands/ft.search/
export const redisRulesSearchOptions: FtSearchOptions = {
	// #2 is a required option when the 'ismissing()' function is in the query body
	DIALECT: 2,
	LIMIT: {
		from: 0,
		size: DEFAULT_SEARCH_LIMIT,
	},
};

export const createRedisRulesReader = (
	client: RedisClientType,
	logger: Logger,
): AccessRulesReader => {
	return {
		findRules: async (
			filter: AccessRulesFilter,
			matchingFieldsOnly = false,
			skipEmptyUserScopes = true,
		): Promise<AccessRule[]> => {
			const query = getAccessRuleRedisQuery(filter, matchingFieldsOnly);

			if (skipEmptyUserScopes && query === "ismissing(@clientId)") {
				// We don't want to accidentally return all rules when the filter is empty
				return [];
			}

			let searchReply: SearchReply;

			try {
				searchReply = await client.ft.search(
					redisRulesIndexName,
					query,
					redisRulesSearchOptions,
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

			return extractRulesFromSearchReply(searchReply, logger);
		},

		findRuleIds: async (
			filter: AccessRulesFilter,
			matchingFieldsOnly = false,
		): Promise<string[]> => {
			const query = getAccessRuleRedisQuery(filter, matchingFieldsOnly);

			let searchReply: SearchNoContentReply;

			try {
				searchReply = await client.ft.searchNoContent(
					redisRulesIndexName,
					query,
					redisRulesSearchOptions,
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

			logger.debug(() => ({
				msg: "Executed search query for rule IDs",
				data: {
					query: query,
					found: searchReply.documents,
				},
			}));

			return searchReply.documents;
		},
	};
};

export const getDummyRedisRulesReader = (logger: Logger): AccessRulesReader => {
	return {
		findRules: async (
			filter: AccessRulesFilter,
			matchingFieldsOnly = false,
			skipEmptyUserScopes = true,
		): Promise<AccessRule[]> => {
			logger.info(() => ({
				msg: "Dummy findRules() has no effect (redis is not ready)",
				data: {
					filter: filter,
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
					filter: filter,
				},
			}));

			return [];
		},
	};
};

const extractRulesFromSearchReply = (
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
