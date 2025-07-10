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

import { LogLevel, getLogger } from "@prosopo/common";
import type { RedisClientType } from "redis";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "vitest";
import { AccessPolicyType } from "#policy/accessPolicy.js";
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
	accessRulesRedisIndexName,
	createRedisAccessRulesIndex,
	getRedisAccessRuleKey,
	getRedisAccessRuleValue,
} from "#policy/redis/redisAccessRulesIndex.js";
import { createTestRedisClient } from "./testRedisClient.js";

describe("redisAccessRules", () => {
	let redisClient: RedisClientType;

	const getUniqueString = () => Math.random().toString(36).substring(2, 15);
	const getIndexRecordsCount = async (): Promise<number> =>
		(await redisClient.ft.info(accessRulesRedisIndexName)).num_docs;

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
			const expirationSeconds = 60 * 60;

			// when
			await accessRulesWriter.insertRule(accessRule, expirationSeconds);
			const ruleKey = getRedisAccessRuleKey(accessRule);
			// then
			const insertedAccessRule = await redisClient.hGetAll(accessRuleKey);
			const insertedExpirationResult = await redisClient.expire(
				ruleKey,
				expirationSeconds,
			);
			const indexRecordsCount = await getIndexRecordsCount();

			const recordExpirySeconds = await redisClient.ttl(ruleKey);

			expect(insertedAccessRule).toEqual(accessRule);
			expect(insertedExpirationResult).toBe(1);
			expect(recordExpirySeconds).toBeLessThanOrEqual(expirationSeconds);

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
				type: AccessPolicyType.Block,
				clientId: getUniqueString(),
			};
			const doeAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
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
			accessRulesReader = createRedisAccessRulesReader(
				redisClient,
				getLogger(LogLevel.enum.info, "RedisAccessRulesReader"),
			);
		});

		test("finds client and global rules by greedy policy scope match", async () => {
			// given
			const johnId = getUniqueString();
			const johnAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: johnId,
			};
			const doeAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: getUniqueString(),
			};
			const globalAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
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
				type: AccessPolicyType.Block,
				clientId: johnId,
			};
			const doeAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: getUniqueString(),
			};
			const globalAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
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
				type: AccessPolicyType.Block,
				clientId: johnId,
				numericIp: BigInt(100),
			};
			const doeIpAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: getUniqueString(),
				numericIp: BigInt(100),
			};
			const johnHeaderAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				headersHash: "chrome",
			};
			const globalJa4AccessRule: AccessRule = {
				type: AccessPolicyType.Block,
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
				type: AccessPolicyType.Block,
				clientId: johnId,
				numericIp: BigInt(100),
				ja4Hash: "windows",
			};

			const doeTargetAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: getUniqueString(),
				numericIp: BigInt(100),
				ja4Hash: "windows",
			};

			const johnHeaderAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				headersHash: "chrome",
			};

			const globalTargetAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				numericIp: BigInt(100),
				ja4Hash: "windows",
			};

			const globalJa4AccessRule: AccessRule = {
				type: AccessPolicyType.Block,
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

		test("finds rules by greedy ip match", async () => {
			// given
			const johnId = getUniqueString();

			const johnIpMask_0_100_AccessRule: AccessRule = {
				clientId: johnId,
				type: AccessPolicyType.Block,
				numericIpMaskMin: BigInt(0),
				numericIpMaskMax: BigInt(100),
			};
			const johnIp_100_AccessRule: AccessRule = {
				clientId: johnId,
				type: AccessPolicyType.Block,
				numericIp: BigInt(100),
			};
			const globalIpMask_100_200_AccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				numericIpMaskMin: BigInt(100),
				numericIpMaskMax: BigInt(200),
			};
			const doeIpMask_200_300AccessRule: AccessRule = {
				clientId: getUniqueString(),
				type: AccessPolicyType.Block,
				numericIpMaskMin: BigInt(200),
				numericIpMaskMax: BigInt(300),
			};

			await insertRule(johnIpMask_0_100_AccessRule);
			await insertRule(johnIp_100_AccessRule);
			await insertRule(globalIpMask_100_200_AccessRule);
			await insertRule(doeIpMask_200_300AccessRule);

			// when
			const ip_0_accessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				userScope: {
					numericIp: BigInt(0),
				},
				userScopeMatch: ScopeMatch.Greedy,
			});
			const ip_99_accessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				userScope: {
					numericIp: BigInt(99),
				},
				userScopeMatch: ScopeMatch.Greedy,
			});
			const ip_100_accessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				userScope: {
					numericIp: BigInt(100),
				},
				userScopeMatch: ScopeMatch.Greedy,
			});
			const ip_101_accessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				userScope: {
					numericIp: BigInt(101),
				},
				userScopeMatch: ScopeMatch.Greedy,
			});
			const ip_201_accessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				userScope: {
					numericIp: BigInt(201),
				},
				userScopeMatch: ScopeMatch.Greedy,
			});

			// then
			const indexRecordsCount = await getIndexRecordsCount();

			expect(indexRecordsCount).toBe(4);

			expect(ip_0_accessRules).toEqual([johnIpMask_0_100_AccessRule]);
			expect(ip_99_accessRules).toEqual([johnIpMask_0_100_AccessRule]);
			expect(ip_100_accessRules).toEqual([
				johnIpMask_0_100_AccessRule,
				johnIp_100_AccessRule,
				globalIpMask_100_200_AccessRule,
			]);
			expect(ip_101_accessRules).toEqual([globalIpMask_100_200_AccessRule]);
			expect(ip_201_accessRules).toEqual([]);
		});

		test("finds rules by exact ip match", async () => {
			// given
			const johnId = getUniqueString();

			const johnIpMask_0_100_AccessRule: AccessRule = {
				clientId: johnId,
				type: AccessPolicyType.Block,
				numericIpMaskMin: BigInt(0),
				numericIpMaskMax: BigInt(100),
			};
			const johnIp_100_AccessRule: AccessRule = {
				clientId: johnId,
				type: AccessPolicyType.Block,
				numericIp: BigInt(100),
			};
			const globalIpMask_100_200_AccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				numericIpMaskMin: BigInt(100),
				numericIpMaskMax: BigInt(200),
			};
			const globalIp_100_AccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				numericIp: BigInt(100),
			};

			await insertRule(johnIpMask_0_100_AccessRule);
			await insertRule(johnIp_100_AccessRule);
			await insertRule(globalIpMask_100_200_AccessRule);
			await insertRule(globalIp_100_AccessRule);

			// when
			const ip_0_accessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				userScope: {
					numericIp: BigInt(0),
				},
				userScopeMatch: ScopeMatch.Exact,
			});
			const ip_100_accessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				userScope: {
					numericIp: BigInt(100),
				},
				userScopeMatch: ScopeMatch.Exact,
			});

			// then
			const indexRecordsCount = await getIndexRecordsCount();

			expect(indexRecordsCount).toBe(4);

			expect(ip_0_accessRules).toEqual([]);
			expect(ip_100_accessRules).toEqual([
				johnIp_100_AccessRule,
				globalIp_100_AccessRule,
			]);
		});
	});

	afterAll(async () => {
		await redisClient.flushAll();
	});
});
