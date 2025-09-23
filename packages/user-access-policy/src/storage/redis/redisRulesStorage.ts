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
import type { RedisConnection, RedisIndex } from "@prosopo/redis-client";
import {
	type AccessRule,
	accessRuleRedisSchema,
	makeAccessRuleHash,
} from "#policy/accessRule.js";
import type { AccessRulesStorage } from "#policy/storage/accessRulesStorage.js";
import {
	createRedisRulesReader,
	getDummyRedisRulesReader,
} from "./redisRulesReader.js";
import {
	createRedisRulesWriter,
	getDummyRedisRulesWriter,
} from "./redisRulesWriter.js";

export const ACCESS_RULES_REDIS_INDEX_NAME = "index:user-access-rules";

// names take space, so we use an acronym instead of the long-tailed one
export const ACCESS_RULE_REDIS_KEY_PREFIX = "uar:";

export const accessRulesRedisIndex: RedisIndex = {
	name: ACCESS_RULES_REDIS_INDEX_NAME,
	schema: accessRuleRedisSchema,
	options: {
		ON: "HASH" as const,
		PREFIX: [ACCESS_RULE_REDIS_KEY_PREFIX],
	},
};

export const getAccessRuleRedisKey = (rule: AccessRule): string =>
	ACCESS_RULE_REDIS_KEY_PREFIX + makeAccessRuleHash(rule);

export const createRedisAccessRulesStorage = (
	connection: RedisConnection,
	logger: Logger,
): AccessRulesStorage => {
	const storage: AccessRulesStorage = {
		...getDummyRedisRulesReader(logger),
		...getDummyRedisRulesWriter(logger),
	};

	connection.getClient().then((client) => {
		Object.assign(storage, {
			...createRedisRulesReader(client, logger),
			...createRedisRulesWriter(client),
		});

		logger.info(() => ({
			msg: "RedisAccessRules storage got a ready Redis client",
		}));
	});

	return storage;
};
