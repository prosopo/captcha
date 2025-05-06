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
import type { RedisClientType } from "redis";
import type { AccessPolicyScope } from "#policy/accessPolicy.js";
import { type AccessRule, accessRuleSchema } from "#policy/rules/accessRule.js";
import type {
	AccessRulesReader,
	AccessRulesWriter,
} from "#policy/rules/accessRules.js";
import {
	accessRuleIndexName,
	accessRuleKeyPrefix,
	accessRuleSearchOptions,
	getAccessRuleKey,
	getAccessRulesQuery,
} from "#policy/rules/redis/redisAccessRulesIndex.js";

export const createAccessRulesReader = (
	client: RedisClientType,
	logger: Logger,
): AccessRulesReader => {
	return {
		findRules: async (
			policyScope: AccessPolicyScope,
		): Promise<AccessRule[]> => {
			const query = getAccessRulesQuery(policyScope);

			// fixme move into function
			try {
				const searchReply = await client.ft.search(
					accessRuleIndexName,
					query,
					accessRuleSearchOptions,
				);
			} catch (e) {
				logger.error("failed to execute search query", {
					query: query,
					policyScope: policyScope,
				});

				return [];
			}

			const accessRules = extractRulesFromSearchReply(searchReply, logger);

			logger.debug("found access rules", {
				policyScope: policyScope,
				accessRules: accessRules,
				query: query,
			});

			return accessRules;
		},

		findRuleIds: async (policyScope: AccessPolicyScope): Promise<string[]> => {
			const query = getAccessRulesQuery(policyScope);

			const records = await client.ft.searchNoContent(
				accessRuleIndexName,
				query,
				accessRuleSearchOptions,
			);

			const ruleIds = records.documents;

			logger.debug("found access rule ids", {
				ruleIds: ruleIds,
				policyScope: policyScope,
				query: query,
			});

			return ruleIds;
		},
	};
};

export const createAccessRulesWriter = (
	client: RedisClientType,
): AccessRulesWriter => {
	return {
		insertRule: async (
			rule: AccessRule,
			expirationTimestamp?: number,
		): Promise<string> => {
			const ruleKey = getAccessRuleKey(rule);

			await client.hSet(ruleKey, rule);

			if (expirationTimestamp) {
				await client.expireAt(ruleKey, expirationTimestamp);
			}

			return ruleKey;
		},

		deleteRules: async (ruleIds: string[]): Promise<void> =>
			void (await client.del(ruleIds)),

		deleteAllRules: async (): Promise<void> => {
			const keys = await client.keys(accessRuleKeyPrefix);

			if (keys.length > 0) {
				await client.del(keys);
			}
		},
	};
};

const extractRulesFromSearchReply = (
	searchReply: SearchReply,
	logger: Logger,
): AccessRule[] => {
	const accessRules: AccessRule[] = [];

	searchReply.documents.map((document) => {
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
