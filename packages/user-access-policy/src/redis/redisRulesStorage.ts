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
import type { RedisConnection } from "@prosopo/redis-client";
import type {
	AccessRulesReader,
	AccessRulesStorage,
	AccessRulesWriter,
} from "#policy/rulesStorage.js";
import {
	DummyRedisRulesReader,
	RedisRulesReader,
} from "./reader/redisRulesReader.js";
import { DummyRedisRulesWriter, RedisRulesWriter } from "./redisRulesWriter.js";

export const createRedisAccessRulesStorage = (
	connection: RedisConnection,
	logger: Logger,
): AccessRulesStorage => {
	let storage: AccessRulesStorage = composeStorage(
		new DummyRedisRulesReader(logger),
		new DummyRedisRulesWriter(logger),
	);

	connection.getClient().then((client) => {
		storage = composeStorage(
			new RedisRulesReader(client, logger),
			new RedisRulesWriter(client, logger),
		);

		logger.info(() => ({
			msg: "RedisAccessRules storage got a ready Redis client",
		}));
	});

	return storage;
};

const composeStorage = (
	reader: AccessRulesReader,
	writer: AccessRulesWriter,
): AccessRulesStorage => ({
	// reader
	fetchRules: reader.fetchRules.bind(reader),
	getMissingRuleIds: reader.getMissingRuleIds.bind(reader),
	findRules: reader.findRules.bind(reader),
	findRuleIds: reader.findRuleIds.bind(reader),
	fetchAllRuleIds: reader.fetchAllRuleIds.bind(reader),
	// writer
	insertRules: writer.insertRules.bind(writer),
	deleteRules: writer.deleteRules.bind(writer),
	deleteAllRules: writer.deleteAllRules.bind(writer),
});
