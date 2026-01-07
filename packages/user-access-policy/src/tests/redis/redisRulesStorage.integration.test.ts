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

import {
	LogLevel,
	type Logger,
	chunkIntoBatches,
	executeBatchesSequentially,
	getLogger,
} from "@prosopo/common";
import {
	type RedisConnection,
	createTestRedisConnection,
	setupRedisIndex,
} from "@prosopo/redis-client";
import { randomAsHex } from "@prosopo/util-crypto";
import type { RedisClientType } from "redis";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "vitest";
import { RedisRulesReader } from "#policy/redis/reader/redisRulesReader.js";
import {
	ACCESS_RULE_REDIS_KEY_PREFIX,
	accessRulesRedisIndex,
	getAccessRuleRedisKey,
} from "#policy/redis/redisRuleIndex.js";
import {
	RedisRulesWriter,
	getRedisRuleValue,
} from "#policy/redis/redisRulesWriter.js";
import { AccessPolicyType, type AccessRule } from "#policy/rule.js";
import {
	type AccessRulesReader,
	type AccessRulesWriter,
	FilterScopeMatch,
} from "#policy/rulesStorage.js";

describe("redisAccessRulesStorage", () => {
	let redisConnection: RedisConnection;
	let redisClient: RedisClientType;
	let indexName: string;

	const mockLogger = new Proxy(
		{},
		{
			get: () => () => {},
		},
	) as unknown as Logger;

	const getUniqueString = () => Math.random().toString(36).substring(2, 15);
	const getIndexRecordsCount = async (indexName: string): Promise<number> =>
		(await redisClient.ft.info(indexName)).num_docs;

	const insertRules = async (rules: AccessRule[]) => {
		const ruleBatches = chunkIntoBatches(rules, 1000);

		await executeBatchesSequentially(ruleBatches, async (batchRules) => {
			const queries = redisClient.multi();

			batchRules.map((rule) => {
				const ruleKey = getAccessRuleRedisKey(rule);
				const ruleValue = getRedisRuleValue(rule);

				queries.hSet(ruleKey, ruleValue);
			});

			await queries.exec();
		});
	};

	beforeAll(async () => {
		redisConnection = createTestRedisConnection();

		redisClient = await setupRedisIndex(
			redisConnection,
			accessRulesRedisIndex,
			mockLogger,
		).getClient();
	});

	beforeEach(async () => {
		// Delete all keys using SCAN to avoid stack overflow with large datasets
		let cursor = "0";
		do {
			const reply = await redisClient.scan(cursor, {
				MATCH: "*",
				COUNT: 1000,
			});

			if (reply.keys.length > 0) {
				// Delete keys in batches to avoid stack overflow
				const keyBatches = chunkIntoBatches(reply.keys, 1000);
				await executeBatchesSequentially(keyBatches, async (batch) => {
					await redisClient.del(batch);
				});
			}

			cursor = reply.cursor;
		} while (cursor !== "0");

		// Get a new index name for each test
		indexName = randomAsHex(16);

		// setup a new index for each test
		redisClient = await setupRedisIndex(
			redisConnection,
			{ ...accessRulesRedisIndex, name: indexName },
			mockLogger,
		).getClient();
	}, 120_000);

	describe(
		"writer",
		() => {
			let accessRulesWriter: AccessRulesWriter;

			beforeAll(() => {
				accessRulesWriter = new RedisRulesWriter(redisClient, mockLogger);
			});

			test("inserts rule", async () => {
				// given
				const accessRule: AccessRule = {
					type: AccessPolicyType.Block,
					clientId: "clientId",
				};
				const accessRuleKey = getAccessRuleRedisKey(accessRule);

				// when
				await accessRulesWriter.insertRules([
					{
						rule: accessRule,
					},
				]);

				// then
				const insertedAccessRule = await redisClient.hGetAll(accessRuleKey);
				const indexRecordsCount = await getIndexRecordsCount(indexName);

				expect(insertedAccessRule).toEqual(accessRule);
				expect(indexRecordsCount).toEqual(1);
			});

			test("inserts time limited rule", async () => {
				// given
				const accessRule: AccessRule = {
					type: AccessPolicyType.Block,
					clientId: "clientId",
				};
				const accessRuleKey = getAccessRuleRedisKey(accessRule);
				// 1 hour from now.
				const expireIn = 60 * 60; // seconds
				const expirationTimestamp = new Date(
					Date.now() + expireIn * 1000,
				).getTime();
				const expirationTimestampInSeconds = Math.floor(
					expirationTimestamp / 1000,
				);

				// when
				await accessRulesWriter.insertRules([
					{
						rule: accessRule,
						expiresUnixTimestamp: expirationTimestampInSeconds,
					},
				]);
				const ruleKey = getAccessRuleRedisKey(accessRule);
				// then
				const insertedAccessRule = await redisClient.hGetAll(accessRuleKey);
				const insertedExpirationResult = await redisClient.expireAt(
					ruleKey,
					expirationTimestampInSeconds,
				);
				const indexRecordsCount = await getIndexRecordsCount(indexName);

				const recordExpirySeconds = await redisClient.ttl(ruleKey);

				expect(insertedAccessRule).toEqual(accessRule);
				expect(insertedExpirationResult).toBe(1);
				expect(recordExpirySeconds).toBeLessThanOrEqual(
					expirationTimestampInSeconds,
				);

				expect(indexRecordsCount).toBe(1);
			});

			test("deletes rules", async () => {
				// given
				const johnAccessRule: AccessRule = {
					type: AccessPolicyType.Block,
					clientId: getUniqueString(),
				};
				const johnAccessRuleKey = getAccessRuleRedisKey(johnAccessRule);

				const doeAccessRule: AccessRule = {
					type: AccessPolicyType.Block,
					clientId: getUniqueString(),
				};
				const doeAccessRuleKey = getAccessRuleRedisKey(doeAccessRule);

				await insertRules([johnAccessRule, doeAccessRule]);

				// when
				await accessRulesWriter.deleteRules([
					johnAccessRuleKey.slice(ACCESS_RULE_REDIS_KEY_PREFIX.length),
				]);

				// then
				const presentAccessRule = await redisClient.hGetAll(doeAccessRuleKey);
				const indexRecordsCount = await getIndexRecordsCount(indexName);

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

				await insertRules([johnAccessRule, doeAccessRule]);

				// when
				await accessRulesWriter.deleteAllRules();

				// then
				const indexRecordsCount = await getIndexRecordsCount(indexName);

				expect(indexRecordsCount).toBe(0);
			});

			test("deletes all rules when there are 1 million rules", async () => {
				// given
				const rulesCount = 1_000_000;
				const batchSize = 10_000;
				const numBatches = Math.ceil(rulesCount / batchSize);

				// Insert rules in batches to avoid memory exhaustion
				// Don't create 1M objects in memory at once!
				for (let i = 0; i < numBatches; i++) {
					const currentBatchSize = Math.min(
						batchSize,
						rulesCount - i * batchSize,
					);
					const batchRules: AccessRule[] = Array.from(
						{ length: currentBatchSize },
						() => ({
							type: AccessPolicyType.Block,
							clientId: getUniqueString(),
						}),
					);

					await insertRules(batchRules);
				}

				// verify that there are 1 million rules in the database
				const beforeDeleteIndexRecordsCount =
					await getIndexRecordsCount(indexName);
				expect(beforeDeleteIndexRecordsCount).toBe(rulesCount);

				// when
				await accessRulesWriter.deleteAllRules();

				// then
				const afterDeleteIndexRecordsCount =
					await getIndexRecordsCount(indexName);

				expect(afterDeleteIndexRecordsCount).toBe(0);
			});
		},
		{
			timeout: 1_000_000,
		},
	);

	describe("reader", () => {
		let accessRulesReader: AccessRulesReader;

		beforeAll(async () => {
			accessRulesReader = new RedisRulesReader(
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

			await insertRules([johnAccessRule, doeAccessRule, globalAccessRule]);

			// when
			const foundByClientAccessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				policyScopeMatch: FilterScopeMatch.Greedy,
			});
			const foundAccessRules = await accessRulesReader.findRules({
				policyScopeMatch: FilterScopeMatch.Greedy,
			});

			// then
			const indexRecordsCount = await getIndexRecordsCount(indexName);

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

			await insertRules([johnAccessRule, doeAccessRule, globalAccessRule]);

			// when
			const foundClientAccessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				policyScopeMatch: FilterScopeMatch.Exact,
			});
			const foundGlobalAccessRules = await accessRulesReader.findRules(
				{
					policyScopeMatch: FilterScopeMatch.Exact,
				},
				false,
				false,
			);

			// then
			const indexRecordsCount = await getIndexRecordsCount(indexName);

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
				headersHash:
					"00110110100001111101001101100101101101001000011111010011011001010101000110000111110100110110010111010100100011011101101010000011",
			};
			const globalJa4AccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				ja4Hash: "windows",
			};

			await insertRules([
				johnIpAccessRule,
				doeIpAccessRule,
				johnHeaderAccessRule,
				globalJa4AccessRule,
			]);

			// when
			const foundAccessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				userScope: {
					numericIp: BigInt(100),
					ja4Hash: "windows",
				},
				userScopeMatch: FilterScopeMatch.Greedy,
			});

			// then
			const indexRecordsCount = await getIndexRecordsCount(indexName);

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
				headersHash:
					"00110110100001111101001101100101101101001000011111010011011001010101000110000111110100110110010111010100100011011101101010000011",
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

			await insertRules([
				johnTargetAccessRule,
				doeTargetAccessRule,
				johnHeaderAccessRule,
				globalTargetAccessRule,
				globalJa4AccessRule,
			]);

			// when
			const foundAccessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				userScope: {
					numericIp: BigInt(100),
					ja4Hash: "windows",
				},
				userScopeMatch: FilterScopeMatch.Exact,
			});

			// then
			const indexRecordsCount = await getIndexRecordsCount(indexName);

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

			await insertRules([
				johnIpMask_0_100_AccessRule,
				johnIp_100_AccessRule,
				globalIpMask_100_200_AccessRule,
				doeIpMask_200_300AccessRule,
			]);

			// when
			const ip_0_accessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				userScope: {
					numericIp: BigInt(0),
				},
				userScopeMatch: FilterScopeMatch.Greedy,
			});
			const ip_99_accessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				userScope: {
					numericIp: BigInt(99),
				},
				userScopeMatch: FilterScopeMatch.Greedy,
			});
			const ip_100_accessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				userScope: {
					numericIp: BigInt(100),
				},
				userScopeMatch: FilterScopeMatch.Greedy,
			});
			const ip_101_accessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				userScope: {
					numericIp: BigInt(101),
				},
				userScopeMatch: FilterScopeMatch.Greedy,
			});
			const ip_201_accessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				userScope: {
					numericIp: BigInt(201),
				},
				userScopeMatch: FilterScopeMatch.Greedy,
			});

			// then
			const indexRecordsCount = await getIndexRecordsCount(indexName);

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

		test("finds rules by exact ip match with exact policy match", async () => {
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

			await insertRules([
				johnIpMask_0_100_AccessRule,
				johnIp_100_AccessRule,
				globalIpMask_100_200_AccessRule,
				globalIp_100_AccessRule,
			]);

			// when
			const ip_0_accessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				policyScopeMatch: FilterScopeMatch.Exact,
				userScope: {
					numericIp: BigInt(0),
				},
				userScopeMatch: FilterScopeMatch.Exact,
			});
			const ip_100_accessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				policyScopeMatch: FilterScopeMatch.Exact,
				userScope: {
					numericIp: BigInt(100),
				},
				userScopeMatch: FilterScopeMatch.Exact,
			});

			// then
			const indexRecordsCount = await getIndexRecordsCount(indexName);

			expect(indexRecordsCount).toBe(4);

			expect(ip_0_accessRules).toEqual([johnIpMask_0_100_AccessRule]);
			expect(ip_100_accessRules).toEqual([
				johnIpMask_0_100_AccessRule,
				johnIp_100_AccessRule,
			]);
		});

		test("finds rules by exact ip match with exact policy match 2", async () => {
			// given
			const johnId = getUniqueString();
			const johnIp = BigInt(100);

			const johnIpMask_0_100_AccessRule: AccessRule = {
				clientId: johnId,
				type: AccessPolicyType.Block,
				numericIpMaskMin: BigInt(0),
				numericIpMaskMax: johnIp,
			};
			const johnIp_100_AccessRule: AccessRule = {
				clientId: johnId,
				type: AccessPolicyType.Block,
				numericIp: johnIp,
			};
			const globalIpMask_100_200_AccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				numericIpMaskMin: johnIp,
				numericIpMaskMax: BigInt(200),
			};
			const globalIp_100_AccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				numericIp: johnIp,
			};

			await insertRules([
				johnIpMask_0_100_AccessRule,
				johnIp_100_AccessRule,
				globalIpMask_100_200_AccessRule,
				globalIp_100_AccessRule,
			]);

			// when
			const ip_0_accessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: johnId,
				},
				policyScopeMatch: FilterScopeMatch.Exact,
				userScope: {
					numericIp: BigInt(0),
				},
				userScopeMatch: FilterScopeMatch.Exact,
			});
			const ip_100_accessRules = await accessRulesReader.findRules({
				policyScopeMatch: FilterScopeMatch.Exact,
				userScope: {
					numericIp: johnIp,
				},
				userScopeMatch: FilterScopeMatch.Exact,
			});

			// then
			const indexRecordsCount = await getIndexRecordsCount(indexName);

			expect(indexRecordsCount).toBe(4);

			expect(ip_0_accessRules).toEqual([johnIpMask_0_100_AccessRule]);
			expect(ip_100_accessRules).toEqual([
				globalIpMask_100_200_AccessRule,
				globalIp_100_AccessRule,
			]);
		});

		test("does not find rules when some criteria do not match and user scope match is exact", async () => {
			// given
			const accessRule: AccessRule = {
				type: AccessPolicyType.Restrict,
				clientId: "clientId",
				userAgentHash: "userAgentHash1",
				ja4Hash: "ja4Hash",
			};

			// when
			await insertRules([accessRule]);

			// then
			const query = {
				policyScope: {
					clientId: "clientId",
				},
				policyScopeMatch: FilterScopeMatch.Exact,
				userScope: {
					ja4Hash: "ja4Hash",
					userAgentHash: "userAgentHash2",
				},
				userScopeMatch: FilterScopeMatch.Exact,
			};

			const foundAccessRules = await accessRulesReader.findRules(query);
			expect(foundAccessRules).toEqual([]);
		});

		test("does not find rules when query is more exact than rule and user scope match is exact", async () => {
			// given
			const accessRule: AccessRule = {
				type: AccessPolicyType.Restrict,
				clientId: "clientId",
				ja4Hash: "ja4Hash",
			};

			// when
			await insertRules([accessRule]);

			// then
			const query = {
				policyScope: {
					clientId: "clientId",
				},
				policyScopeMatch: FilterScopeMatch.Exact,
				userScope: {
					ja4Hash: "ja4Hash",
					userAgentHash: "userAgentHash",
				},
				userScopeMatch: FilterScopeMatch.Exact,
			};

			const foundAccessRules = await accessRulesReader.findRules(query);
			expect(foundAccessRules).toEqual([]);
		});

		test("does find rules when query is more exact than rule and user scope match is greedy", async () => {
			// given
			const accessRule: AccessRule = {
				type: AccessPolicyType.Restrict,
				clientId: "clientId",
				ja4Hash: "ja4Hash",
			};

			// when
			await insertRules([accessRule]);

			// then
			const query = {
				policyScope: {
					clientId: "clientId",
				},
				policyScopeMatch: FilterScopeMatch.Exact,
				userScope: {
					ja4Hash: "ja4Hash",
					userAgentHash: "userAgentHash",
				},
				userScopeMatch: FilterScopeMatch.Greedy,
			};

			const foundAccessRules = await accessRulesReader.findRules(query);
			expect(foundAccessRules).toEqual([accessRule]);
		});

		test("does find rules when some criteria do not match and user scope match is exact", async () => {
			// given
			const accessRule: AccessRule = {
				type: AccessPolicyType.Restrict,
				clientId: "clientId",
				userAgentHash: "userAgentHash",
				ja4Hash: "ja4Hash",
			};

			// when
			getAccessRuleRedisKey(accessRule);
			await insertRules([accessRule]);

			// then
			const query = {
				policyScope: {
					clientId: "clientId",
				},
				policyScopeMatch: FilterScopeMatch.Exact,
				userScope: {
					ja4Hash: "ja4Hash",
					userAgentHash: "userAgentHash",
				},
				userScopeMatch: FilterScopeMatch.Greedy,
			};

			const foundAccessRules = await accessRulesReader.findRules(query);
			expect(foundAccessRules).toEqual([accessRule]);
		});

		test("if an ip rule and an ip mask rule is applied for a single IP at client level, both rules are returned with the more specific IP rule being first in the list", async () => {
			// given
			const accessRule: AccessRule = {
				type: AccessPolicyType.Restrict,
				clientId: "clientId",
				numericIp: BigInt(10),
			};
			const ipRangeAccessRule: AccessRule = {
				type: AccessPolicyType.Restrict,
				clientId: "clientId",
				numericIpMaskMin: BigInt(10),
				numericIpMaskMax: BigInt(20),
			};

			// when
			await insertRules([accessRule, ipRangeAccessRule]);

			// then

			const query = {
				policyScope: {
					clientId: "clientId",
				},
				policyScopeMatch: FilterScopeMatch.Exact,
				userScope: {
					numericIp: BigInt(10),
				},
				userScopeMatch: FilterScopeMatch.Exact,
			};

			const foundAccessRules = await accessRulesReader.findRules(query);
			expect(foundAccessRules).toEqual([accessRule, ipRangeAccessRule]);
		});

		test("finds rules by headHash with exact match", async () => {
			// given
			const headHash1 = "abc123def456";
			const headHash2 = "xyz789ghi012";

			const headHashAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: "clientId",
				headHash: headHash1,
			};
			const otherHeadHashAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: "clientId",
				headHash: headHash2,
			};

			await insertRules([headHashAccessRule, otherHeadHashAccessRule]);

			// when
			const foundAccessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: "clientId",
				},
				policyScopeMatch: FilterScopeMatch.Exact,
				userScope: {
					headHash: headHash1,
				},
				userScopeMatch: FilterScopeMatch.Exact,
			});

			// then
			expect(foundAccessRules).toEqual([headHashAccessRule]);
		});

		test("finds rules by coords with exact match", async () => {
			// given
			const coords1 = "[[[100,200]]]";
			const coords2 = "[[[300,400]]]";

			const coordsAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: "clientId",
				coords: coords1,
			};
			const otherCoordsAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: "clientId",
				coords: coords2,
			};

			await insertRules([coordsAccessRule, otherCoordsAccessRule]);

			// when
			const foundAccessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: "clientId",
				},
				policyScopeMatch: FilterScopeMatch.Exact,
				userScope: {
					coords: coords1,
				},
				userScopeMatch: FilterScopeMatch.Exact,
			});

			// then
			expect(foundAccessRules).toEqual([coordsAccessRule]);
		});

		test("finds rules by combined headHash and coords with exact match", async () => {
			// given
			const headHash1 = "abc123def456";
			const coords1 = "[[[100,200]]]";

			const combinedAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: "clientId",
				headHash: headHash1,
				coords: coords1,
			};
			const headHashOnlyAccessRule: AccessRule = {
				type: AccessPolicyType.Restrict,
				clientId: "clientId",
				headHash: headHash1,
			};

			await insertRules([combinedAccessRule, headHashOnlyAccessRule]);

			// when
			const foundAccessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: "clientId",
				},
				policyScopeMatch: FilterScopeMatch.Exact,
				userScope: {
					headHash: headHash1,
					coords: coords1,
				},
				userScopeMatch: FilterScopeMatch.Exact,
			});

			// then
			expect(foundAccessRules).toEqual([combinedAccessRule]);
		});
	});

	afterAll(async () => {
		await redisClient.flushAll();
	});
});
