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
import {
	type Logger,
	chunkIntoBatches,
	executeBatchesSequentially,
} from "@prosopo/common";
import type { SearchReply } from "@redis/search";
import type { RedisClientType } from "redis";
import {
	REDIS_QUERY_DIALECT,
	getRulesRedisQuery,
} from "#policy/redis/reader/redisRulesQuery.js";
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
			async (keysBatch: string[]) =>
				getMissingRedisKeys(this.client, keysBatch),
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
			async (keysBatch: string[]) => this.fetchRuleEntries(keysBatch),
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

		let searchReply: SearchReply;

		try {
			// https://redis.io/docs/latest/commands/ft.search/
			searchReply = await this.client.ft.search(
				ACCESS_RULES_REDIS_INDEX_NAME,
				query,
				{
					DIALECT: REDIS_QUERY_DIALECT,
					// FT.search doesn't support "unlimited" selects
					LIMIT: {
						from: 0,
						size: REDIS_BATCH_SIZE,
					},
				},
			);

			if (searchReply.total > 0) {
				this.logger.debug(() => ({
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

		const records = searchReply.documents.map(({ value }) => value);

		return parseRedisRecords(records, accessRuleInput, this.logger);
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
