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

import {
	type Logger,
	chunkIntoBatches,
	executeBatchesSequentially,
} from "@prosopo/common";
import type { RedisClientType } from "redis";
import { REDIS_BATCH_SIZE } from "#policy/redis/redisClient.js";
import type { AccessRule } from "#policy/rule.js";
import type {
	AccessRuleEntry,
	AccessRulesWriter,
} from "#policy/rulesStorage.js";
import {
	ACCESS_RULE_REDIS_KEY_PREFIX,
	getAccessRuleRedisKey,
} from "./redisRuleIndex.js";

export const createRedisRulesWriter = (
	client: RedisClientType,
	logger: Logger,
): AccessRulesWriter => {
	return {
		async insertRules(ruleEntries: AccessRuleEntry[]): Promise<string[]> {
			const entryBatches = chunkIntoBatches(ruleEntries, REDIS_BATCH_SIZE);

			const keyBatches = await executeBatchesSequentially(
				entryBatches,
				async (entriesBatch) => insertRuleEntries(client, entriesBatch),
			);

			return keyBatches
				.flat()
				.map((ruleKey) => ruleKey.slice(ACCESS_RULE_REDIS_KEY_PREFIX.length));
		},

		async deleteRules(ruleIds: string[]): Promise<void> {
			const ruleKeys = ruleIds.map(
				(ruleId) => ACCESS_RULE_REDIS_KEY_PREFIX + ruleId,
			);

			const keyBatches = chunkIntoBatches(ruleKeys, REDIS_BATCH_SIZE);

			await executeBatchesSequentially(keyBatches, async (keysBatch) => {
				const queries = client.multi();

				keysBatch.map((ruleKey) => {
					queries.del(ruleKey);
				});

				await queries.exec();
			});
		},

		async deleteAllRules(): Promise<number> {
			let cursor = "0";
			let total = 0;

			do {
				const reply = await client.scan(cursor, {
					MATCH: `${ACCESS_RULE_REDIS_KEY_PREFIX}*`,
					COUNT: REDIS_BATCH_SIZE,
				});

				const ids = reply.keys.map((key) =>
					key.slice(ACCESS_RULE_REDIS_KEY_PREFIX.length),
				);
				await this.deleteRules(ids);

				total += ids.length;
				cursor = reply.cursor;
			} while ("0" !== cursor);

			return total;
		},
	};
};

export const insertRuleEntries = async (
	client: RedisClientType,
	ruleEntries: AccessRuleEntry[],
): Promise<string[]> => {
	const queries = client.multi();

	const ruleKeys = ruleEntries.map((ruleEntry) => {
		const { rule, expiresUnixTimestamp } = ruleEntry;

		const ruleKey = getAccessRuleRedisKey(rule);
		const ruleValue = getRedisRuleValue(rule);

		queries.hSet(ruleKey, ruleValue);

		if (expiresUnixTimestamp) {
			queries.expireAt(ruleKey, expiresUnixTimestamp);
		}

		return ruleKey;
	});

	await queries.exec();

	return ruleKeys;
};

export const getRedisRuleValue = (rule: AccessRule): Record<string, string> =>
	Object.fromEntries(
		Object.entries(rule).map(([key, value]) => [key, String(value)]),
	);

export const getDummyRedisRulesWriter = (logger: Logger): AccessRulesWriter => {
	return {
		insertRules: async (ruleEntries: AccessRuleEntry[]): Promise<string[]> => {
			logger.info(() => ({
				msg: "Dummy insertRules() has no effect (redis is not ready)",
				data: {
					ruleEntries,
				},
			}));

			return [];
		},

		deleteRules: async (ruleIds: string[]): Promise<void> => {
			logger.info(() => ({
				msg: "Dummy deleteRules() has no effect (redis is not ready)",
				data: {
					ruleIds,
				},
			}));
		},

		deleteAllRules: async (): Promise<number> => {
			logger.info(() => ({
				msg: "Dummy deleteAllRules() has no effect (redis is not ready)",
			}));

			return 0;
		},
	};
};
