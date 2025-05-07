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

import type { Logger } from "@prosopo/common";
import type { SearchReply } from "@redis/search";
import type { SearchNoContentReply } from "@redis/search/dist/lib/commands/SEARCH_NOCONTENT.js";
import type { RedisClientType } from "redis";
import {
	type AccessRule,
	type AccessRulesFilter,
	accessRuleSchema,
} from "#policy/accessPolicy.js";
import type {
	AccessRulesReader,
	AccessRulesWriter,
} from "#policy/accessRules.js";
import {
	getRedisAccessRuleKey,
	getRedisAccessRulesQuery,
	redisAccessRuleIndexName,
	redisAccessRuleKeyPrefix,
	redisAccessRuleSearchOptions,
} from "#policy/redis/redisAccessRulesIndex.js";

export const createRedisAccessRulesReader = (
	client: RedisClientType,
	logger: Logger,
): AccessRulesReader => {
	return {
		findRules: async (
			rulesFilter: AccessRulesFilter,
		): Promise<AccessRule[]> => {
			const query = getRedisAccessRulesQuery(rulesFilter);

			let searchReply: SearchReply;

			try {
				searchReply = await client.ft.search(
					redisAccessRuleIndexName,
					query,
					redisAccessRuleSearchOptions,
				);

				logger.debug("executed search query", {
					rulesFilter: rulesFilter,
					searchReply: searchReply,
					query: query,
				});
			} catch (e) {
				logger.error("failed to execute search query", {
					query: query,
					rulesFilter: rulesFilter,
				});

				return [];
			}

			return extractAccessRulesFromSearchReply(searchReply, logger);
		},

		findRuleIds: async (rulesFilter: AccessRulesFilter): Promise<string[]> => {
			const query = getRedisAccessRulesQuery(rulesFilter);

			let searchReply: SearchNoContentReply;

			try {
				searchReply = await client.ft.searchNoContent(
					redisAccessRuleIndexName,
					query,
					redisAccessRuleSearchOptions,
				);

				logger.debug("executed searchNoContent query", {
					rulesFilter: rulesFilter,
					searchReply: searchReply,
					query: query,
				});
			} catch (e) {
				logger.error("failed to execute searchNoContent query", {
					query: query,
					rulesFilter: rulesFilter,
				});

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

			await client.hSet(ruleKey, rule);

			if (expirationTimestamp) {
				await client.expireAt(ruleKey, expirationTimestamp);
			}

			return ruleKey;
		},

		deleteRules: async (ruleIds: string[]): Promise<void> =>
			void (await client.del(ruleIds)),

		deleteAllRules: async (): Promise<void> => {
			const keys = await client.keys(`${redisAccessRuleKeyPrefix}*`);

			if (keys.length > 0) {
				await client.del(keys);
			}
		},
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
			logger.debug("failed to parse access rule", {
				document: document,
				error: parsedDocument.error,
			});
		}
	});

	return accessRules;
};
