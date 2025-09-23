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
import type { AccessRule } from "#policy/accessRule.js";
import type { AccessRulesWriter } from "#policy/accessRulesStorage.js";
import {
	ACCESS_RULE_REDIS_KEY_PREFIX,
	getAccessRuleRedisKey,
} from "./redisRulesStorage.js";

export const createRedisRulesWriter = (
	client: RedisClientType,
): AccessRulesWriter => {
	return {
		insertRule: async (
			rule: AccessRule,
			expirationTimestamp?: number,
		): Promise<string> => {
			const ruleKey = getAccessRuleRedisKey(rule);
			const ruleValue = getRedisRuleValue(rule);

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
			const keys = await client.keys(`${ACCESS_RULE_REDIS_KEY_PREFIX}*`);

			if (keys.length === 0) return 0;

			return await client.del(keys);
		},
	};
};

export const getDummyRedisRulesWriter = (logger: Logger): AccessRulesWriter => {
	return {
		insertRule: async (
			rule: AccessRule,
			expirationTimestamp?: number,
		): Promise<string> => {
			logger.info(() => ({
				msg: "Dummy insertRule() has no effect (redis is not ready)",
				data: {
					rule,
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
