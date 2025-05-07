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

import type { RedisClientType } from "redis";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "vitest";
import { AccessPolicyType, type AccessRule } from "#policy/accessPolicy.js";
import type {
	AccessRulesReader,
	AccessRulesWriter,
} from "#policy/accessRules.js";
import {
	createRedisAccessRulesReader,
	createRedisAccessRulesWriter,
} from "#policy/redis/redisAccessRules.js";
import {
	createRedisAccessRulesIndex,
	getRedisAccessRuleKey,
	redisAccessRuleIndexName,
} from "#policy/redis/redisAccessRulesIndex.js";
import { createTestRedisClient } from "#policy/tests/redis/testRedisClient.js";
import { testLogger } from "#policy/tests/testLogger.js";

describe("redisAccessRules", () => {
	let redisClient: RedisClientType;

	const getUniqueString = () => Math.random().toString(36).substring(2, 15);
	const getIndexRecordsCount = async (): Promise<number> =>
		(await redisClient.ft.info(redisAccessRuleIndexName)).num_docs;

	beforeAll(async () => {
		redisClient = await createTestRedisClient();

		await createRedisAccessRulesIndex(redisClient);
	});

	beforeEach(async () => {
		const keys = await redisClient.keys("*");

		if (keys.length > 0) {
			await redisClient.del(keys);
		}
	});

	describe("writer", () => {
		let accessRulesWriter: AccessRulesWriter;

		beforeAll(() => {
			accessRulesWriter = createRedisAccessRulesWriter(redisClient);
		});

		test("inserts rule", async () => {
			// given
			const accessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: "clientId",
			};
			const accessRuleKey = getRedisAccessRuleKey(accessRule);

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
			const accessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: "clientId",
			};
			const accessRuleKey = getRedisAccessRuleKey(accessRule);
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
			const johnAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: getUniqueString(),
			};
			const johnAccessRuleKey = getRedisAccessRuleKey(johnAccessRule);

			const doeAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: getUniqueString(),
			};
			const doeAccessRuleKey = getRedisAccessRuleKey(doeAccessRule);

			await redisClient.hSet(johnAccessRuleKey, johnAccessRule);
			await redisClient.hSet(doeAccessRuleKey, doeAccessRule);

			// when
			await accessRulesWriter.deleteRules([johnAccessRuleKey]);

			// then
			const presentAccessRule = await redisClient.hGetAll(doeAccessRuleKey);
			const indexRecordsCount = await getIndexRecordsCount();

			expect(presentAccessRule).toEqual(doeAccessRule);
			expect(indexRecordsCount).toBe(1);
		});

		test("deletes all rules", async () => {
			// given
			const johnAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: getUniqueString(),
			};
			const johnAccessRuleKey = getRedisAccessRuleKey(johnAccessRule);

			const doeAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: getUniqueString(),
			};
			const doeAccessRuleKey = getRedisAccessRuleKey(doeAccessRule);

			await redisClient.hSet(johnAccessRuleKey, johnAccessRule);
			await redisClient.hSet(doeAccessRuleKey, doeAccessRule);

			// when
			await accessRulesWriter.deleteAllRules();

			// then
			const indexRecordsCount = await getIndexRecordsCount();

			expect(indexRecordsCount).toBe(0);
		});
	});

	describe("reader", () => {
		let accessRulesReader: AccessRulesReader;

		beforeAll(() => {
			accessRulesReader = createRedisAccessRulesReader(redisClient, testLogger);
		});

		test("finds client and global rules when client id is defined", async () => {
			// given
			const johnId = getUniqueString();
			const johnAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: johnId,
			};
			const johnAccessRuleKey = getRedisAccessRuleKey(johnAccessRule);

			const doeAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: getUniqueString(),
			};
			const doeAccessRuleKey = getRedisAccessRuleKey(doeAccessRule);

			const globalAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
			};
			const globalAccessRuleKey = getRedisAccessRuleKey(globalAccessRule);

			await redisClient.hSet(johnAccessRuleKey, johnAccessRule);
			await redisClient.hSet(doeAccessRuleKey, doeAccessRule);
			await redisClient.hSet(globalAccessRuleKey, globalAccessRule);

			// when
			const foundAccessRules = await accessRulesReader.findRules({
				clientId: johnId,
			});

			// then
			const indexRecordsCount = await getIndexRecordsCount();

			expect(indexRecordsCount).toBe(3);
			expect(foundAccessRules).toEqual([johnAccessRule, globalAccessRule]);
		});

		test("finds global only rules when client id is not defined", async () => {
			// given
			const johnAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: getUniqueString(),
			};
			const johnAccessRuleKey = getRedisAccessRuleKey(johnAccessRule);

			const doeAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: getUniqueString(),
			};
			const doeAccessRuleKey = getRedisAccessRuleKey(doeAccessRule);

			const globalAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
			};
			const globalAccessRuleKey = getRedisAccessRuleKey(globalAccessRule);

			await redisClient.hSet(johnAccessRuleKey, johnAccessRule);
			await redisClient.hSet(doeAccessRuleKey, doeAccessRule);
			await redisClient.hSet(globalAccessRuleKey, globalAccessRule);

			// when
			const foundAccessRules = await accessRulesReader.findRules({});

			// then
			const indexRecordsCount = await getIndexRecordsCount();

			expect(indexRecordsCount).toBe(3);
			expect(foundAccessRules).toEqual([globalAccessRule]);
		});

		test("finds client and global rules by [any] user attribute match", async () => {
			// given

			const johnId = getUniqueString();

			const johnIpAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: johnId,
				numericIp: "100",
			};
			const johnIpAccessRuleKey = getRedisAccessRuleKey(johnIpAccessRule);

			const doeIpAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: getUniqueString(),
				numericIp: "100",
			};
			const doeIpAccessRuleKey = getRedisAccessRuleKey(doeIpAccessRule);

			const johnHeaderAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				headersHash: "chrome",
			};
			const johnHeaderAccessRuleKey =
				getRedisAccessRuleKey(johnHeaderAccessRule);

			const globalJa4AccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				ja4Hash: "windows",
			};
			const globalJa4AccessRuleKey = getRedisAccessRuleKey(globalJa4AccessRule);

			await redisClient.hSet(johnIpAccessRuleKey, johnIpAccessRule);
			await redisClient.hSet(doeIpAccessRuleKey, doeIpAccessRule);
			await redisClient.hSet(johnHeaderAccessRuleKey, johnHeaderAccessRule);
			await redisClient.hSet(globalJa4AccessRuleKey, globalJa4AccessRule);

			// when
			const foundAccessRules = await accessRulesReader.findRules({
				clientId: johnId,
				policyScope: {
					numericIp: "100",
					ja4Hash: "windows",
				},
			});

			// then
			const indexRecordsCount = await getIndexRecordsCount();

			expect(indexRecordsCount).toBe(4);
			expect(foundAccessRules).toEqual([johnIpAccessRule, globalJa4AccessRule]);
		});

		test("finds client and global rules by ip", async () => {
			// given
			const johnId = getUniqueString();

			const johnIpMask_0_100_AccessRule: AccessRule = {
				clientId: johnId,
				type: AccessPolicyType.Block,
				numericIpMaskMin: "0",
				numericIpMaskMax: "100",
			};
			const johnIpMask_0_100_AccessRuleKey = getRedisAccessRuleKey(
				johnIpMask_0_100_AccessRule,
			);

			const johnIp_100_AccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				numericIp: "100",
			};
			const johnIp_100_AccessRuleKey = getRedisAccessRuleKey(
				johnIp_100_AccessRule,
			);

			const globalIpMask_100_200_AccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				numericIpMaskMin: "100",
				numericIpMaskMax: "200",
			};
			const globalIpMask_100_200_AccessRuleKey = getRedisAccessRuleKey(
				globalIpMask_100_200_AccessRule,
			);

			const doeIpMask_200_300AccessRule: AccessRule = {
				clientId: getUniqueString(),
				type: AccessPolicyType.Block,
				numericIpMaskMin: "200",
				numericIpMaskMax: "300",
			};
			const doeIpMask_200_300AccessRuleKey = getRedisAccessRuleKey(
				doeIpMask_200_300AccessRule,
			);

			await redisClient.hSet(
				johnIpMask_0_100_AccessRuleKey,
				johnIpMask_0_100_AccessRule,
			);
			await redisClient.hSet(johnIp_100_AccessRuleKey, johnIp_100_AccessRule);
			await redisClient.hSet(
				globalIpMask_100_200_AccessRuleKey,
				globalIpMask_100_200_AccessRule,
			);
			await redisClient.hSet(
				doeIpMask_200_300AccessRuleKey,
				doeIpMask_200_300AccessRule,
			);

			// when
			const ip_0_AccessRules = await accessRulesReader.findRules({
				clientId: johnId,
				policyScope: {
					numericIp: "0",
				},
			});
			const ip_99_AccessRules = await accessRulesReader.findRules({
				clientId: johnId,
				policyScope: {
					numericIp: "99",
				},
			});
			const ip_100_AccessRules = await accessRulesReader.findRules({
				clientId: johnId,
				policyScope: {
					numericIp: "100",
				},
			});
			const ip_101_AccessRules = await accessRulesReader.findRules({
				clientId: johnId,
				policyScope: {
					numericIp: "101",
				},
			});
			const ip_201_AccessRules = await accessRulesReader.findRules({
				clientId: johnId,
				policyScope: {
					numericIp: "201",
				},
			});

			// then
			const indexRecordsCount = await getIndexRecordsCount();

			expect(indexRecordsCount).toBe(4);

			expect(ip_0_AccessRules).toEqual([johnIpMask_0_100_AccessRule]);
			expect(ip_99_AccessRules).toEqual([johnIpMask_0_100_AccessRule]);
			expect(ip_100_AccessRules).toEqual([
				johnIpMask_0_100_AccessRule,
				johnIp_100_AccessRule,
				globalIpMask_100_200_AccessRule,
			]);
			expect(ip_101_AccessRules).toEqual([globalIpMask_100_200_AccessRule]);
			expect(ip_201_AccessRules).toEqual([]);
		});
	});

	afterAll(async () => {
		await redisClient.flushAll();
	});
});
