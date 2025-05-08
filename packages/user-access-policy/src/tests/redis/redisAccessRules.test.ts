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
import { PolicyType } from "#policy/accessPolicy.js";
import { ScopeMatch } from "#policy/accessPolicyResolver.js";
import type {
	AccessRule,
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
	getRedisAccessRuleValue,
	redisAccessRulesIndexName,
} from "#policy/redis/redisAccessRulesIndex.js";
import { createTestRedisClient } from "#policy/tests/redis/testRedisClient.js";
import { testLogger } from "#policy/tests/testLogger.js";

describe("redisAccessRules", () => {
	let redisClient: RedisClientType;

	const getUniqueString = () => Math.random().toString(36).substring(2, 15);
	const getIndexRecordsCount = async (): Promise<number> =>
		(await redisClient.ft.info(redisAccessRulesIndexName)).num_docs;

	const insertRule = async (rule: AccessRule) => {
		const ruleKey = getRedisAccessRuleKey(rule);
		const ruleValue = getRedisAccessRuleValue(rule);

		await redisClient.hSet(ruleKey, ruleValue);
	};

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
				type: PolicyType.Block,
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
				type: PolicyType.Block,
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
				type: PolicyType.Block,
				clientId: getUniqueString(),
			};
			const johnAccessRuleKey = getRedisAccessRuleKey(johnAccessRule);

			const doeAccessRule: AccessRule = {
				type: PolicyType.Block,
				clientId: getUniqueString(),
			};
			const doeAccessRuleKey = getRedisAccessRuleKey(doeAccessRule);

			await insertRule(johnAccessRule);
			await insertRule(doeAccessRule);

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
				type: PolicyType.Block,
				clientId: getUniqueString(),
			};
			const doeAccessRule: AccessRule = {
				type: PolicyType.Block,
				clientId: getUniqueString(),
			};

			await insertRule(johnAccessRule);
			await insertRule(doeAccessRule);

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

		test("finds client and global rules by greedy policy scope match", async () => {
			// given
			const johnId = getUniqueString();
			const johnAccessRule: AccessRule = {
				type: PolicyType.Block,
				clientId: johnId,
			};
			const doeAccessRule: AccessRule = {
				type: PolicyType.Block,
				clientId: getUniqueString(),
			};
			const globalAccessRule: AccessRule = {
				type: PolicyType.Block,
			};

			await insertRule(johnAccessRule);
			await insertRule(doeAccessRule);
			await insertRule(globalAccessRule);

			// when
			const foundByClientAccessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				policyScopeMatch: ScopeMatch.Greedy,
			});
			const foundAccessRules = await accessRulesReader.findRules({
				policyScopeMatch: ScopeMatch.Greedy,
			});

			// then
			const indexRecordsCount = await getIndexRecordsCount();

			expect(indexRecordsCount).toBe(3);
			expect(foundByClientAccessRules).toEqual([
				johnAccessRule,
				globalAccessRule,
			]);
			expect(foundAccessRules).toEqual([
				johnAccessRule,
				doeAccessRule,
				globalAccessRule,
			]);
		});

		test("finds client or global rules by exact policy scope match", async () => {
			// given
			const johnId = getUniqueString();

			const johnAccessRule: AccessRule = {
				type: PolicyType.Block,
				clientId: johnId,
			};
			const doeAccessRule: AccessRule = {
				type: PolicyType.Block,
				clientId: getUniqueString(),
			};
			const globalAccessRule: AccessRule = {
				type: PolicyType.Block,
			};

			await insertRule(johnAccessRule);
			await insertRule(doeAccessRule);
			await insertRule(globalAccessRule);

			// when
			const foundClientAccessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				policyScopeMatch: ScopeMatch.Exact,
			});
			const foundGlobalAccessRules = await accessRulesReader.findRules({
				policyScopeMatch: ScopeMatch.Exact,
			});

			// then
			const indexRecordsCount = await getIndexRecordsCount();

			expect(indexRecordsCount).toBe(3);
			expect(foundClientAccessRules).toEqual([johnAccessRule]);
			expect(foundGlobalAccessRules).toEqual([globalAccessRule]);
		});

		test("finds rules by greedy user scope match", async () => {
			// given

			const johnId = getUniqueString();
			const johnIpAccessRule: AccessRule = {
				type: PolicyType.Block,
				clientId: johnId,
				numericIp: BigInt(100),
			};
			const doeIpAccessRule: AccessRule = {
				type: PolicyType.Block,
				clientId: getUniqueString(),
				numericIp: BigInt(100),
			};
			const johnHeaderAccessRule: AccessRule = {
				type: PolicyType.Block,
				headersHash: "chrome",
			};
			const globalJa4AccessRule: AccessRule = {
				type: PolicyType.Block,
				ja4Hash: "windows",
			};

			await insertRule(johnIpAccessRule);
			await insertRule(doeIpAccessRule);
			await insertRule(johnHeaderAccessRule);
			await insertRule(globalJa4AccessRule);

			// when
			const foundAccessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				userScope: {
					numericIp: BigInt(100),
					ja4Hash: "windows",
				},
				userScopeMatch: ScopeMatch.Greedy,
			});

			// then
			const indexRecordsCount = await getIndexRecordsCount();

			expect(indexRecordsCount).toBe(4);
			expect(foundAccessRules).toEqual([johnIpAccessRule, globalJa4AccessRule]);
		});

		test("finds rules by exact user scope match", async () => {
			// given

			const johnId = getUniqueString();

			const johnTargetAccessRule: AccessRule = {
				type: PolicyType.Block,
				clientId: johnId,
				numericIp: BigInt(100),
				ja4Hash: "windows",
			};

			const doeTargetAccessRule: AccessRule = {
				type: PolicyType.Block,
				clientId: getUniqueString(),
				numericIp: BigInt(100),
				ja4Hash: "windows",
			};

			const johnHeaderAccessRule: AccessRule = {
				type: PolicyType.Block,
				headersHash: "chrome",
			};

			const globalTargetAccessRule: AccessRule = {
				type: PolicyType.Block,
				numericIp: BigInt(100),
				ja4Hash: "windows",
			};

			const globalJa4AccessRule: AccessRule = {
				type: PolicyType.Block,
				ja4Hash: "windows",
			};

			await insertRule(johnTargetAccessRule);
			await insertRule(doeTargetAccessRule);
			await insertRule(johnHeaderAccessRule);
			await insertRule(globalTargetAccessRule);
			await insertRule(globalJa4AccessRule);

			// when
			const foundAccessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				userScope: {
					numericIp: BigInt(100),
					ja4Hash: "windows",
				},
				userScopeMatch: ScopeMatch.Exact,
			});

			// then
			const indexRecordsCount = await getIndexRecordsCount();

			expect(indexRecordsCount).toBe(5);
			expect(foundAccessRules).toEqual([
				johnTargetAccessRule,
				globalTargetAccessRule,
			]);
		});

		test("finds rules by ip", async () => {
			// given
			const johnId = getUniqueString();

			const johnIpMask_0_100_AccessRule: AccessRule = {
				clientId: johnId,
				type: PolicyType.Block,
				numericIpMaskMin: BigInt(0),
				numericIpMaskMax: BigInt(100),
			};
			const johnIp_100_AccessRule: AccessRule = {
				type: PolicyType.Block,
				numericIp: BigInt(100),
			};
			const globalIpMask_100_200_AccessRule: AccessRule = {
				type: PolicyType.Block,
				numericIpMaskMin: BigInt(100),
				numericIpMaskMax: BigInt(200),
			};
			const doeIpMask_200_300AccessRule: AccessRule = {
				clientId: getUniqueString(),
				type: PolicyType.Block,
				numericIpMaskMin: BigInt(200),
				numericIpMaskMax: BigInt(300),
			};

			await insertRule(johnIpMask_0_100_AccessRule);
			await insertRule(johnIp_100_AccessRule);
			await insertRule(globalIpMask_100_200_AccessRule);
			await insertRule(doeIpMask_200_300AccessRule);

			// when
			const ip_0_AccessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				userScope: {
					numericIp: BigInt(0),
				},
			});
			const ip_99_AccessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				userScope: {
					numericIp: BigInt(99),
				},
			});
			const ip_100_AccessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				userScope: {
					numericIp: BigInt(100),
				},
			});
			const ip_101_AccessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				userScope: {
					numericIp: BigInt(101),
				},
			});
			const ip_201_AccessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				userScope: {
					numericIp: BigInt(201),
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
