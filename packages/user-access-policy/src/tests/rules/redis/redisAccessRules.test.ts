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

import { type RedisClientType, createClient } from "redis";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "vitest";
import { AccessPolicyType } from "#policy/accessPolicy.js";
import type {
	AccessRulesReader,
	AccessRulesWriter,
} from "#policy/rules/accessRules.js";
import {
	createAccessRulesReader,
	createAccessRulesWriter,
} from "#policy/rules/redis/redisAccessRules.js";
import {
	accessRuleIndexName,
	createAccessRulesIndex,
	getAccessRuleKey,
} from "#policy/rules/redis/redisAccessRulesIndex.js";
import { testLogger } from "#policy/tests/rules/testLogger.js";

describe("redisAccessRules", () => {
	let redisClient: RedisClientType;

	const getUniqueString = () => Math.random().toString(36).substring(2, 15);
	const getIndexRecordsCount = async (): Promise<number> =>
		(await redisClient.ft.info(accessRuleIndexName)).num_docs;

	beforeAll(async () => {
		redisClient = (await createClient({
			// /docker/redis/redis-stack.docker-compose.yml
			url: "redis://localhost:6379",
			password: "root",
		})
			.on("error", (err) => console.log("Redis Client Error", err))
			.connect()) as RedisClientType;

		await createAccessRulesIndex(redisClient);
	});

	beforeEach(async () => {
		const keys = await redisClient.keys(accessRuleIndexName);

		if (keys.length > 0) {
			await redisClient.del(keys);
		}
	});

	describe("writer", () => {
		let accessRulesWriter: AccessRulesWriter;

		beforeAll(() => {
			accessRulesWriter = createAccessRulesWriter(redisClient);
		});

		test("inserts rule", async () => {
			// given
			const accessRule = {
				type: AccessPolicyType.Block,
				clientId: "clientId",
			};
			const accessRuleKey = getAccessRuleKey(accessRule);

			// when
			await accessRulesWriter.insertRule(accessRule);

			// then
			const insertedAccessRule = await redisClient.hGetAll(accessRuleKey);
			const indexRecordsCount = await getIndexRecordsCount();

			expect(insertedAccessRule).toEqual(accessRule);
			expect(indexRecordsCount).toEqual(1);
		});

		test("inserts time limited rule", async () => {
			// given
			const accessRule = {
				type: AccessPolicyType.Block,
				clientId: "clientId",
			};
			const accessRuleKey = getAccessRuleKey(accessRule);
			// 1 hour from now.
			const expirationTimestamp = Math.floor(Date.now() / 1000) + 60 * 60;

			// when
			await accessRulesWriter.insertRule(accessRule, expirationTimestamp);

			// then
			const insertedAccessRule = await redisClient.hGetAll(accessRuleKey);
			const insertedExpirationTimestamp =
				await redisClient.expireTime(accessRuleKey);
			const indexRecordsCount = await getIndexRecordsCount();

			expect(insertedAccessRule).toEqual(accessRule);
			expect(insertedExpirationTimestamp).toBe(expirationTimestamp);
			expect(indexRecordsCount).toBe(1);
		});

		test("deletes rules", async () => {
			// given
			const firstAccessRule = {
				type: AccessPolicyType.Block,
				clientId: getUniqueString(),
			};
			const firstAccessRuleKey = getAccessRuleKey(firstAccessRule);
			const secondAccessRule = {
				type: AccessPolicyType.Block,
				clientId: getUniqueString(),
			};
			const secondAccessRuleKey = getAccessRuleKey(secondAccessRule);

			await redisClient.hSet(firstAccessRuleKey, firstAccessRule);
			await redisClient.hSet(secondAccessRuleKey, secondAccessRule);

			// when
			await accessRulesWriter.deleteRules([firstAccessRuleKey]);

			// then
			const presentSecondAccessRule =
				await redisClient.hGetAll(secondAccessRuleKey);
			const indexRecordsCount = await getIndexRecordsCount();

			expect(presentSecondAccessRule).toEqual(secondAccessRule);
			expect(indexRecordsCount).toBe(1);
		});

		test("deletes all rules", async () => {
			// given
			const firstAccessRule = {
				type: AccessPolicyType.Block,
				clientId: getUniqueString(),
			};
			const firstAccessRuleKey = getAccessRuleKey(firstAccessRule);
			const secondAccessRule = {
				type: AccessPolicyType.Block,
				clientId: getUniqueString(),
			};
			const secondAccessRuleKey = getAccessRuleKey(secondAccessRule);

			await redisClient.hSet(firstAccessRuleKey, firstAccessRule);
			await redisClient.hSet(secondAccessRuleKey, secondAccessRule);

			// when
			await accessRulesWriter.deleteRules([
				firstAccessRuleKey,
				secondAccessRuleKey,
			]);

			// then
			const indexRecordsCount = await getIndexRecordsCount();

			expect(indexRecordsCount).toBe(0);
		});
	});

	describe("reader", () => {
		let accessRulesReader: AccessRulesReader;

		beforeAll(() => {
			accessRulesReader = createAccessRulesReader(redisClient, testLogger);
		});

		test("finds rule by client id", async () => {
			// given
			const clientId = getUniqueString();
			const accessRule = {
				type: AccessPolicyType.Block,
				clientId: clientId,
			};
			const accessRuleKey = getAccessRuleKey(accessRule);

			await redisClient.hSet(accessRuleKey, accessRule);

			// when
			const foundAccessRules = await accessRulesReader.findRules({
				clientId: clientId,
			});

			// then
			const indexRecordsCount = await getIndexRecordsCount();

			expect(indexRecordsCount).toBe(1);
			expect(foundAccessRules).toEqual([accessRule]);
		});

		test("finds global rule by client id", async () => {
			// fixme
		});

		// fixme cover all key search variations

		test("finds rule ids", () => {
			// fixme reuse
		});
	});

	afterAll(async () => {
		await redisClient.flushAll();
	});
});
