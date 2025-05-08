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
import type { AccessPolicyFilter } from "#policy/accessPolicyResolver.js";
import { type AccessRule, accessRuleSchema } from "#policy/accessRule.js";
import type {
	AccessRulesReader,
	AccessRulesStorage,
	AccessRulesWriter,
} from "#policy/accessRules.js";
import {
	getRedisAccessRuleKey,
	getRedisAccessRuleQuery,
	redisAccessRuleIndexName,
	redisAccessRuleKeyPrefix,
	redisAccessRuleSearchOptions,
} from "#policy/redis/redisAccessRule.js";

export const createRedisAccessRulesReader = (
	client: RedisClientType,
	logger: Logger,
): AccessRulesReader => {
	return {
		findRules: async (filter: AccessPolicyFilter): Promise<AccessRule[]> => {
			const query = getRedisAccessRuleQuery(filter);

			let searchReply: SearchReply;

			try {
				searchReply = await client.ft.search(
					redisAccessRuleIndexName,
					query,
					redisAccessRuleSearchOptions,
				);

				logger.debug("executed search query", {
					filter: filter,
					searchReply: searchReply,
					query: query,
				});
			} catch (e) {
				logger.error("failed to execute search query", {
					query: query,
					filter: filter,
				});

				return [];
			}

			return extractAccessRulesFromSearchReply(searchReply, logger);
		},

		findRuleIds: async (filter: AccessPolicyFilter): Promise<string[]> => {
			const query = getRedisAccessRuleQuery(filter);

			let searchReply: SearchNoContentReply;

			try {
				searchReply = await client.ft.searchNoContent(
					redisAccessRuleIndexName,
					query,
					redisAccessRuleSearchOptions,
				);

				logger.debug("executed searchNoContent query", {
					filter: filter,
					searchReply: searchReply,
					query: query,
				});
			} catch (e) {
				logger.error("failed to execute searchNoContent query", {
					query: query,
					filter: filter,
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

			const stringifiedRule = Object.fromEntries(
				Object.entries(rule).map(([key, value]) => [key, String(value)]),
			);

			await client.hSet(ruleKey, stringifiedRule);

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
			logger.debug("failed to parse access rule", {
				document: document,
				error: parsedDocument.error,
			});
		}
	});

	return accessRules;
};
