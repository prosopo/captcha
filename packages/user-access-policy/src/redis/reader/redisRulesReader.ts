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

import * as util from "node:util";
import { chunkIntoBatches, executeBatchesSequentially } from "@prosopo/common";
import type { Logger } from "@prosopo/logger";
import type { RedisClientType } from "redis";
import { getRulesRedisQuery } from "#policy/redis/reader/redisRulesQuery.js";
import {
	REDIS_BATCH_SIZE,
	fetchRedisHashRecords,
	getMissingRedisKeys,
	parseRedisRecords,
} from "#policy/redis/redisClient.js";
import {
	ACCESS_RULES_REDIS_INDEX_NAME,
	ACCESS_RULE_REDIS_KEY_PREFIX,
} from "#policy/redis/redisRuleIndex.js";
import type { AccessRule } from "#policy/rule.js";
import { accessRuleInput } from "#policy/ruleInput/ruleInput.js";
import type {
	AccessRuleEntry,
	AccessRulesFilter,
	AccessRulesReader,
} from "#policy/rulesStorage.js";
import { aggregateRedisKeys } from "./redisAggregate.js";

// Verify-time lookup safety cap. The greedy `userScopeMatch` OR-query can match
// thousands of candidates on bot-attack-scale accounts; we still need to bring
// every candidate back so JS-side specificity ranking can pick the right rule,
// but a hard cap prevents a pathological match (e.g. an attacker crafting a
// userScope that hits the entire account's rule index) from spiralling the
// per-request cost. 10× the page size leaves comfortable headroom over the
// observed worst case (~2k candidates).
export const FIND_RULES_MAX_CANDIDATES = REDIS_BATCH_SIZE * 10;

export class RedisRulesReader implements AccessRulesReader {
	constructor(
		private readonly client: RedisClientType,
		private readonly logger: Logger,
	) {}

	async getMissingRuleIds(ruleIds: string[]): Promise<string[]> {
		const ruleKeys = this.getRuleKeys(ruleIds);
		const keyBatches = chunkIntoBatches(ruleKeys, REDIS_BATCH_SIZE);

		const missingKeyBatches = await executeBatchesSequentially(
			keyBatches,
			async (keysBatch) => getMissingRedisKeys(this.client, keysBatch),
		);

		return missingKeyBatches
			.flat()
			.map((ruleKey) => ruleKey.slice(ACCESS_RULE_REDIS_KEY_PREFIX.length));
	}

	async fetchRules(ruleIds: string[]): Promise<AccessRuleEntry[]> {
		const ruleKeys = this.getRuleKeys(ruleIds);

		const keyBatches = chunkIntoBatches(ruleKeys, REDIS_BATCH_SIZE);

		const entryBatches = await executeBatchesSequentially(
			keyBatches,
			(keysBatch) => this.fetchRuleEntries(keysBatch),
		);

		return entryBatches.flat();
	}

	async findRules(
		filter: AccessRulesFilter,
		matchingFieldsOnly = false,
		skipEmptyUserScopes = true,
	): Promise<AccessRule[]> {
		const query = getRulesRedisQuery(filter, matchingFieldsOnly);

		if (skipEmptyUserScopes && query === "ismissing(@clientId)") {
			// We don't want to accidentally return all rules when the filter is empty
			return [];
		}

		try {
			// FT.AGGREGATE WITHCURSOR (via aggregateRedisKeys) instead of
			// FT.SEARCH. FT.SEARCH's LIMIT caps the candidate set at
			// REDIS_BATCH_SIZE (1000), silently dropping anything past that.
			// Under the greedy `userScopeMatch` mode (#2657), the OR-of-fields
			// query for a popular ja4 hash returns thousands of candidates —
			// matches sitting past offset 1000 (block rules emitted by
			// less-frequent detectors like SUDDEN_VOLUME_INCREASE) were lost,
			// so verify-time ranking only saw the high-volume rules and the
			// most-specific block rule for the request never reached the
			// JS-side specificity sort.
			const ruleKeys = await aggregateRedisKeys(
				this.client,
				query,
				this.logger,
				undefined,
				FIND_RULES_MAX_CANDIDATES,
			);

			if (ruleKeys.length === 0) {
				return [];
			}

			this.logger.debug(() => ({
				msg: "Executed search query",
				data: {
					inspect: util.inspect(
						{
							filter: filter,
							foundCount: ruleKeys.length,
							query: query,
						},
						{ depth: null },
					),
				},
			}));

			const { records } = await fetchRedisHashRecords(
				this.client,
				ruleKeys,
				this.logger,
			);

			const nonEmptyRecords = records.filter(
				(record) => Object.keys(record).length > 0,
			);

			return parseRedisRecords(nonEmptyRecords, accessRuleInput, this.logger);
		} catch (e) {
			this.logger.error(() => ({
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
	}

	async findRuleIds(
		filter: AccessRulesFilter,
		matchingFieldsOnly = false,
	): Promise<string[]> {
		const query = getRulesRedisQuery(filter, matchingFieldsOnly);

		let ruleIds: string[] = [];

		try {
			// aggregation is used instead ft.search to overcome the limitation on search results number
			const ruleKeys = await aggregateRedisKeys(
				this.client,
				query,
				this.logger,
			);

			ruleIds = ruleKeys.map((ruleKey) =>
				ruleKey.slice(ACCESS_RULE_REDIS_KEY_PREFIX.length),
			);
		} catch (e) {
			this.logger.error(() => ({
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

		this.logger.debug(() => ({
			msg: "Executed search query for rule IDs",
			data: {
				query: query,
				foundCount: ruleIds.length,
				foundIds: ruleIds,
			},
		}));

		return ruleIds;
	}

	async fetchAllRuleIds(
		batchHandler: (ruleIds: string[]) => Promise<void>,
	): Promise<void> {
		const keysBatchHandler = async (keys: string[]) => {
			const ids = keys.map((ruleKey) =>
				ruleKey.slice(ACCESS_RULE_REDIS_KEY_PREFIX.length),
			);

			await batchHandler(ids);
		};

		await aggregateRedisKeys(this.client, "*", this.logger, keysBatchHandler);
	}

	protected async fetchRuleEntries(keys: string[]): Promise<AccessRuleEntry[]> {
		const { records, expirations } = await fetchRedisHashRecords(
			this.client,
			keys,
			this.logger,
		);
		const entries: AccessRuleEntry[] = [];

		for (const [index, ruleData] of records.entries()) {
			const isRulePresent = Object.keys(ruleData).length > 0;

			if (isRulePresent) {
				const rule = parseRedisRecords(
					[ruleData],
					accessRuleInput,
					this.logger,
				)[0];

				if (rule) {
					entries.push({
						rule: rule,
						expiresUnixTimestamp: expirations[index],
					});
				}
			}
		}

		return entries;
	}

	protected getRuleKeys(ruleIds: string[]): string[] {
		return ruleIds.map((id) => `${ACCESS_RULE_REDIS_KEY_PREFIX}${id}`);
	}
}

export class DummyRedisRulesReader implements AccessRulesReader {
	constructor(private readonly logger: Logger) {}

	async getMissingRuleIds(ruleIds: string[]): Promise<string[]> {
		this.logger.info(() => ({
			msg: "Dummy getMissingRuleIds() has no effect (redis is not ready)",
			data: {
				ruleIds,
			},
		}));

		return [];
	}

	async fetchRules(ruleIds: string[]): Promise<AccessRuleEntry[]> {
		this.logger.info(() => ({
			msg: "Dummy fetchRule() has no effect (redis is not ready)",
			data: {
				ruleIds,
			},
		}));

		return [];
	}

	async findRules(
		filter: AccessRulesFilter,
		matchingFieldsOnly = false,
		skipEmptyUserScopes = true,
	): Promise<AccessRule[]> {
		this.logger.info(() => ({
			msg: "Dummy findRules() has no effect (redis is not ready)",
			data: {
				filter,
			},
		}));

		return [];
	}

	async findRuleIds(
		filter: AccessRulesFilter,
		matchingFieldsOnly = false,
	): Promise<string[]> {
		this.logger.info(() => ({
			msg: "Dummy findRuleIds() has no effect (redis is not ready)",
			data: {
				filter,
			},
		}));

		return [];
	}

	async fetchAllRuleIds(
		batchHandler: (ruleIds: string[]) => Promise<void>,
	): Promise<void> {
		this.logger.info(() => ({
			msg: "Dummy fetchAllRuleIds() has no effect (redis is not ready)",
		}));
	}
}
