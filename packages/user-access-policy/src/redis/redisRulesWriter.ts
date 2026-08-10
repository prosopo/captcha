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

import { chunkIntoBatches, executeBatchesSequentially } from "@prosopo/common";
import type { Logger } from "@prosopo/logger";
import type { RedisClientType } from "redis";
import { REDIS_BATCH_SIZE } from "#policy/redis/redisClient.js";
import { type AccessRule, GLOBAL_CLIENT_SCOPE_SENTINEL } from "#policy/rule.js";
import type {
	AccessRuleEntry,
	AccessRulesWriter,
} from "#policy/rulesStorage.js";
import {
	ACCESS_RULE_REDIS_KEY_PREFIX,
	getAccessRuleRedisKey,
} from "./redisRuleIndex.js";

export class RedisRulesWriter implements AccessRulesWriter {
	constructor(
		private readonly client: RedisClientType,
		private readonly logger: Logger,
	) {}

	async insertRules(ruleEntries: AccessRuleEntry[]): Promise<string[]> {
		const entryBatches = chunkIntoBatches(ruleEntries, REDIS_BATCH_SIZE);

		const keyBatches = await executeBatchesSequentially(
			entryBatches,
			async (entriesBatch) => this.insertRuleEntries(entriesBatch),
		);

		return keyBatches.flatMap((ruleKey) =>
			ruleKey.slice(ACCESS_RULE_REDIS_KEY_PREFIX.length),
		);
	}

	async deleteRules(ruleIds: string[]): Promise<void> {
		const ruleKeys = ruleIds.map(
			(ruleId) => ACCESS_RULE_REDIS_KEY_PREFIX + ruleId,
		);

		const keyBatches = chunkIntoBatches(ruleKeys, REDIS_BATCH_SIZE);

		await executeBatchesSequentially(keyBatches, async (keysBatch) => {
			const queries = this.client.multi();

			for (const ruleKey of keysBatch) {
				queries.del(ruleKey);
			}

			await queries.exec();
		});
	}

	async deleteAllRules(): Promise<number> {
		let cursor = "0";
		let total = 0;

		do {
			const reply = await this.client.scan(cursor, {
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
	}

	protected async insertRuleEntries(
		ruleEntries: AccessRuleEntry[],
	): Promise<string[]> {
		const queries = this.client.multi();

		const ruleKeys = ruleEntries.map((ruleEntry) => {
			const { rule, expiresUnixTimestamp } = ruleEntry;

			const ruleKey = getAccessRuleRedisKey(rule);
			const ruleValue = getRedisRuleValue(rule);

			queries.hSet(ruleKey, ruleValue);

			if (expiresUnixTimestamp) {
				// Redis expireAt expects seconds. Validate that timestamp is in seconds, not milliseconds.
				// Unix timestamps in milliseconds (since 1970) are > 10 billion
				// Unix timestamps in seconds won't reach 10 billion until year 2286
				const MILLISECOND_THRESHOLD = 10_000_000_000;
				if (expiresUnixTimestamp > MILLISECOND_THRESHOLD) {
					throw new Error(
						`Invalid expiry timestamp: ${expiresUnixTimestamp}. Timestamp must be in seconds, not milliseconds.`,
					);
				}
				queries.expireAt(ruleKey, expiresUnixTimestamp);
			}

			return ruleKey;
		});

		await queries.exec();

		return ruleKeys;
	}
}

export const getRedisRuleValue = (rule: AccessRule): Record<string, string> => {
	const record: Record<string, string> = {};
	for (const [key, value] of Object.entries(rule)) {
		if (value === undefined) {
			continue;
		}
		record[key] = String(value);
	}
	// Global rules used to be stored with no clientId field at all and looked
	// up via `ismissing(@clientId)`. Stamp the sentinel so the read path can
	// probe `@clientId:{global}` instead — a posting-list intersection is
	// orders of magnitude cheaper than ismissing over a large rule set.
	// Rules with a real clientId are untouched.
	if (record.clientId === undefined) {
		record.clientId = GLOBAL_CLIENT_SCOPE_SENTINEL;
	}
	return record;
};

export class DummyRedisRulesWriter implements AccessRulesWriter {
	constructor(private readonly logger: Logger) {}

	async insertRules(ruleEntries: AccessRuleEntry[]): Promise<string[]> {
		this.logger.info(() => ({
			msg: "Dummy insertRules() has no effect (redis is not ready)",
			data: {
				ruleEntries,
			},
		}));

		return [];
	}

	async deleteRules(ruleIds: string[]): Promise<void> {
		this.logger.info(() => ({
			msg: "Dummy deleteRules() has no effect (redis is not ready)",
			data: {
				ruleIds,
			},
		}));
	}

	async deleteAllRules(): Promise<number> {
		this.logger.info(() => ({
			msg: "Dummy deleteAllRules() has no effect (redis is not ready)",
		}));

		return 0;
	}
}
