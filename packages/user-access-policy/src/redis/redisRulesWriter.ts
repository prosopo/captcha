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

import crypto from "node:crypto";
import type { RedisClientType } from "@prosopo/redis-client";
import type { AccessRule, AccessRulesWriter } from "#policy/accessRules.js";
import { redisRuleKeyPrefix } from "#policy/redis/redisRulesIndex.js";

const redisRuleContentHashAlgorithm = "md5";

// fixme proxy or another way? to avoid if() in every method.

export const createRedisAccessRulesWriter = (
	client: RedisClientType,
): AccessRulesWriter => {
	return {
		insertRule: async (
			rule: AccessRule,
			expirationTimestamp?: number,
		): Promise<string> => {
			const ruleKey = getRedisRuleKey(rule);
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
			const keys = await client.keys(`${redisRuleKeyPrefix}*`);

			if (keys.length === 0) return 0;

			return await client.del(keys);
		},
	};
};

export const getRedisRuleKey = (rule: AccessRule): string =>
	redisRuleKeyPrefix +
	crypto
		.createHash(redisRuleContentHashAlgorithm)
		.update(
			JSON.stringify(rule, (key, value) =>
				// JSON.stringify can't handle BigInt itself: throws "Do not know how to serialize a BigInt"
				"bigint" === typeof value ? value.toString() : value,
			),
		)
		.digest("hex");

export const getRedisRuleValue = (rule: AccessRule): Record<string, string> =>
	Object.fromEntries(
		Object.entries(rule).map(([key, value]) => [key, String(value)]),
	);
