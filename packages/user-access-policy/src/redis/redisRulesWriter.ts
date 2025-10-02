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
import type { RedisClientType } from "redis";
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
		insertRule: async (ruleEntry: AccessRuleEntry): Promise<string> => {
			const { rule, expiresUnixTimestamp } = ruleEntry;

			const ruleKey = getAccessRuleRedisKey(rule);
			const ruleValue = getRedisRuleValue(rule);

			await client.hSet(ruleKey, ruleValue);

			if (expiresUnixTimestamp) {
				await client.expireAt(ruleKey, expiresUnixTimestamp);
			}

			return ruleKey;
		},

		deleteRules: async (ruleIds: string[]): Promise<void> => {
			const ruleKeys = ruleIds.map(
				(ruleId) => ACCESS_RULE_REDIS_KEY_PREFIX + ruleId,
			);

			await client.del(ruleKeys);
		},

		deleteAllRules: async (): Promise<number> => {
			const keys = await client.keys(`${ACCESS_RULE_REDIS_KEY_PREFIX}*`);

			if (keys.length === 0) return 0;

			return await client.del(keys);
		},
	};
};

export const getDummyRedisRulesWriter = (logger: Logger): AccessRulesWriter => {
	return {
		insertRule: async (ruleEntry: AccessRuleEntry): Promise<string> => {
			logger.info(() => ({
				msg: "Dummy insertRule() has no effect (redis is not ready)",
				data: {
					ruleEntry,
				},
			}));

			return "";
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

export const getRedisRuleValue = (rule: AccessRule): Record<string, string> =>
	Object.fromEntries(
		Object.entries(rule).map(([key, value]) => [key, String(value)]),
	);
