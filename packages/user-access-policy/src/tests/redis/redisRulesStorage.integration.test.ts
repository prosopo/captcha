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

import { chunkIntoBatches, executeBatchesSequentially } from "@prosopo/common";
import { LogLevel, type Logger, getLogger } from "@prosopo/logger";
import {
	type RedisConnection,
	createTestRedisConnection,
	setupRedisIndex,
} from "@prosopo/redis-client";
import { randomAsHex } from "@prosopo/util-crypto";
import type { RedisClientType } from "redis";
import {
	afterAll,
	afterEach,
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

	// Move cleanup to afterEach
	afterEach(async () => {
		if (indexName) {
			try {
				// Drop index and all documents (DD) created by THIS specific test
				await redisClient.ft.dropIndex(indexName, { DD: true });
			} catch (e) {
				console.error(`Failed to cleanup index ${indexName}`, e);
			}
		}
	}, 120_000);

	beforeEach(async () => {
		indexName = randomAsHex(16);

		const result = setupRedisIndex(
			redisConnection,
			{ ...accessRulesRedisIndex, name: indexName },
			mockLogger,
		);
		redisClient = await result.getClient();
	});

	describe(
		"writer",
		() => {
			let accessRulesWriter: AccessRulesWriter;

			beforeAll(() => {
				accessRulesWriter = new RedisRulesWriter(redisClient, mockLogger);
			});

			test("inserts rule", async () => {
				const testIndexName = indexName;
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
				const indexRecordsCount = await getIndexRecordsCount(testIndexName);

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
		240_000,
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

		test("finds rules by countryCode with exact match", async () => {
			// given
			const countryCode1 = "US";
			const countryCode2 = "GB";

			const countryCodeAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: "clientId",
				countryCode: countryCode1,
			};
			const otherCountryCodeAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: "clientId",
				countryCode: countryCode2,
			};

			await insertRules([countryCodeAccessRule, otherCountryCodeAccessRule]);

			// when
			const foundAccessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: "clientId",
				},
				policyScopeMatch: FilterScopeMatch.Exact,
				userScope: {
					countryCode: countryCode1,
				},
				userScopeMatch: FilterScopeMatch.Exact,
			});

			// then
			expect(foundAccessRules).toEqual([countryCodeAccessRule]);
		});

		test("finds rules by combined countryCode and userId with exact match", async () => {
			// given
			const countryCode1 = "US";
			const userId1 = "user123";

			const combinedAccessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: "clientId",
				countryCode: countryCode1,
				userId: userId1,
			};
			const countryCodeOnlyAccessRule: AccessRule = {
				type: AccessPolicyType.Restrict,
				clientId: "clientId",
				countryCode: countryCode1,
			};

			await insertRules([combinedAccessRule, countryCodeOnlyAccessRule]);

			// when
			const foundAccessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: "clientId",
				},
				policyScopeMatch: FilterScopeMatch.Exact,
				userScope: {
					countryCode: countryCode1,
					userId: userId1,
				},
				userScopeMatch: FilterScopeMatch.Exact,
			});

			// then
			expect(foundAccessRules).toEqual([combinedAccessRule]);
		});

		test("returns remaining rules when a matched document's hash key has been deleted", async () => {
			// given
			const clientId = getUniqueString();

			const survivingRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: clientId,
				userId: "user1",
			};
			const deletedRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: clientId,
				userId: "user2",
			};

			await insertRules([survivingRule, deletedRule]);

			// Delete the hash key for deletedRule directly, bypassing the writer.
			// The index may still reference it briefly, simulating the race
			// condition that caused the @redis/search documentValue(null) crash.
			const deletedRuleKey = getAccessRuleRedisKey(deletedRule);
			await redisClient.del(deletedRuleKey);

			// when
			const foundAccessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: clientId,
				},
				policyScopeMatch: FilterScopeMatch.Exact,
				userScope: {
					userId: "user1",
				},
				userScopeMatch: FilterScopeMatch.Greedy,
			});

			// then - should not throw and should return the surviving rule
			expect(foundAccessRules).toEqual([survivingRule]);
		});

		test("returns empty array without throwing when all matched documents have been deleted", async () => {
			// given
			const clientId = getUniqueString();

			const rule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: clientId,
				userId: "user1",
			};

			await insertRules([rule]);

			// Delete the hash key directly
			const ruleKey = getAccessRuleRedisKey(rule);
			await redisClient.del(ruleKey);

			// when
			const foundAccessRules = await accessRulesReader.findRules({
				policyScope: {
					clientId: clientId,
				},
				policyScopeMatch: FilterScopeMatch.Exact,
				userScope: {
					userId: "user1",
				},
				userScopeMatch: FilterScopeMatch.Greedy,
			});

			// then - should not throw, should return empty array
			expect(foundAccessRules).toEqual([]);
		});

		test("returns all matches when the candidate set exceeds the FT.SEARCH page size", async () => {
			// Regression: under the production traffic profile of a high-volume
			// bot attack, the greedy `@field:{X} | @field:{Y}` query returns
			// thousands of candidate rules sharing the dominant ja4 fingerprint.
			// FT.SEARCH's LIMIT (1000) silently truncated the candidate set,
			// dropping less-frequent block rules — they never reached the
			// JS-side specificity sort, so verify let the bot through.
			// FT.AGGREGATE WITHCURSOR paginates the result and returns all of
			// them. This test inserts > 1000 rules so the old code would
			// truncate; the target block rule must still come back.
			const clientId = getUniqueString();
			const popularJa4 = `t13d1516h2_${getUniqueString()}`;

			const targetBlockRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: clientId,
				ja4Hash: popularJa4,
				coords: "[[[867,60]]]",
			};

			// 1500 noise rules sharing the popular ja4 but with distinct coords.
			// 1500 > REDIS_BATCH_SIZE (1000) — guarantees the targetBlockRule's
			// FT index position has at least a 1/3 chance of sitting past the
			// truncation boundary on any given run. With pagination, it must
			// always come back regardless of indexed order.
			const noiseRules: AccessRule[] = Array.from({ length: 1500 }, (_, i) => ({
				type: AccessPolicyType.Restrict,
				clientId: clientId,
				ja4Hash: popularJa4,
				coords: `[[[${i % 1024},${60 + (i % 32)}]]]`,
				description: `noise-${i}`,
			}));

			await insertRules([targetBlockRule, ...noiseRules]);

			const indexRecordsCount = await getIndexRecordsCount(indexName);
			expect(indexRecordsCount).toBe(1501);

			const found = await accessRulesReader.findRules({
				policyScope: { clientId: clientId },
				policyScopeMatch: FilterScopeMatch.Greedy,
				userScope: {
					ja4Hash: popularJa4,
					coords: "[[[867,60]]]",
				},
				userScopeMatch: FilterScopeMatch.Greedy,
			});

			expect(found.length).toBe(1501);
			expect(found).toContainEqual(targetBlockRule);
		}, 60_000);

		test("finds rules with matchingFieldsOnly when only userId is set and all IP fields are missing", async () => {
			// This is the exact scenario from the production error where the query
			// contained duplicate ismissing(@numericIpMaskMin) ismissing(@numericIpMaskMax)
			// given
			const clientId = getUniqueString();
			const userId = getUniqueString();

			const accessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: clientId,
				userId: userId,
			};

			await insertRules([accessRule]);

			// when - matchingFieldsOnly=true adds ismissing for all schema fields not in the scope
			const foundAccessRules = await accessRulesReader.findRules(
				{
					policyScope: {
						clientId: clientId,
					},
					policyScopeMatch: FilterScopeMatch.Exact,
					userScope: {
						userId: userId,
					},
					userScopeMatch: FilterScopeMatch.Exact,
				},
				true,
			);

			// then
			expect(foundAccessRules).toEqual([accessRule]);
		});

		test("findRulesRanked does not throw when a matched candidate is missing @type", async () => {
			// Production repro: under 3.6.40 we observed
			//   "Could not find the value for a parameter name, consider
			//    using EXISTS if applicable for type"
			// from the FT.AGGREGATE pipeline in findRulesRanked. The cause
			// is SEVERITY_EXPR = `(@type == "block")` — a bare @type
			// reference that fails when a candidate document lacks the
			// `type` field. Candidates can reach the pipeline without
			// `type` two ways: (a) a partial-write / rehash race in the
			// writer, (b) a stale RediSearch index entry pointing at a
			// hash whose `type` field has been HDEL'd. Either way the
			// whole aggregate fails and the catch in findRulesRanked
			// returns [], i.e. NO rules match — a Block rule that should
			// fire silently lets the request through.
			const clientId = getUniqueString();
			const userId = getUniqueString();

			const accessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: clientId,
				userId: userId,
			};

			await insertRules([accessRule]);

			// Simulate the malformed-doc scenario by removing the `type`
			// field from the hash. The RediSearch index still references
			// the doc (type is not part of the index schema) but the
			// APPLY LOAD will pull an undefined @type.
			const ruleKey = getAccessRuleRedisKey(accessRule);
			await redisClient.hDel(ruleKey, "type");

			// when - matchingFieldsOnly=true routes through findRulesRanked
			const foundAccessRules = await accessRulesReader.findRules(
				{
					policyScope: { clientId: clientId },
					policyScopeMatch: FilterScopeMatch.Exact,
					userScope: { userId: userId },
					userScopeMatch: FilterScopeMatch.Exact,
				},
				true,
			);

			// then - the typeless doc must not crash the pipeline.
			// `type` is required to reconstruct an AccessRule, so the
			// doc is dropped from the result rather than returned with
			// a default. The remaining valid rules (none here) come back.
			expect(foundAccessRules).toEqual([]);
		});

		test("findRulesRanked returns the valid rule and skips a typeless ghost candidate", async () => {
			// Same scenario as the previous test but with a co-resident
			// valid rule. The typeless ghost must not poison the
			// pipeline — the valid rule still has to come back so the
			// block decision sticks.
			const clientId = getUniqueString();
			const userId = getUniqueString();

			const validRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: clientId,
				userId: userId,
				ja4Hash: "t13d1313h2_valid",
			};
			const ghostRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: clientId,
				userId: userId,
				ja4Hash: "t13d1313h2_ghost",
			};

			await insertRules([validRule, ghostRule]);

			// Strip `type` from the ghost only.
			const ghostKey = getAccessRuleRedisKey(ghostRule);
			await redisClient.hDel(ghostKey, "type");

			const foundAccessRules = await accessRulesReader.findRules(
				{
					policyScope: { clientId: clientId },
					policyScopeMatch: FilterScopeMatch.Exact,
					userScope: { userId: userId },
					userScopeMatch: FilterScopeMatch.Greedy,
				},
				true,
			);

			expect(foundAccessRules).toEqual([validRule]);
		});

		test("findRulesRanked preserves bigint precision for IPv6 numericIp values", async () => {
			// Production repro: under 3.6.40.1 we saw
			//   "Cannot convert 5.59112965392e+37 to a BigInt"
			// from the FT.AGGREGATE path in findRulesRanked whenever a
			// matched candidate carries an IPv6 numericIp. The cause is
			// that RediSearch indexes NUMERIC fields as 8-byte doubles
			// and FT.AGGREGATE LOAD reads from that index buffer (not
			// the underlying hash), so any value past
			// Number.MAX_SAFE_INTEGER round-trips as scientific
			// notation. `z.coerce.bigint()` then throws and the whole
			// aggregate gets caught + returned as []. The aggregate is
			// now used purely as a ranker over @__key; the field values
			// come back via HGETALL, which preserves the original
			// 38-digit string stored in the hash. This test inserts a
			// rule with the same shape as the failing prod query — an
			// IPv6 numericIp + matching userScope — and asserts the
			// rule is returned with the bigint intact.
			const clientId = getUniqueString();
			const userId = getUniqueString();
			// 38-digit IPv6 value past Number.MAX_SAFE_INTEGER. Anything
			// > 2**53 demonstrates the precision loss; this specific
			// value matches the order of magnitude of the prod error.
			const ipv6NumericIp = 55878094658432211238406371356040233102n;

			const accessRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: clientId,
				userId: userId,
				numericIp: ipv6NumericIp,
			};

			await insertRules([accessRule]);

			const foundAccessRules = await accessRulesReader.findRules(
				{
					policyScope: { clientId: clientId },
					policyScopeMatch: FilterScopeMatch.Exact,
					userScope: { userId: userId, numericIp: ipv6NumericIp },
					userScopeMatch: FilterScopeMatch.Greedy,
				},
				true,
			);

			expect(foundAccessRules).toEqual([accessRule]);
			expect(foundAccessRules[0]?.numericIp).toBe(ipv6NumericIp);
		});

		test("findRulesRanked preserves rank order over multiple candidates", async () => {
			// Assumption under test: the FT.AGGREGATE -> HGETALL refactor
			// preserves the rank order produced by SORTBY @_rank DESC.
			// reply.results is rank-sorted; the for-of loop pushes
			// __key in iteration order; multi.exec() returns pipeline
			// results in queue order; the non-empty filter is stable;
			// parseRedisRecords' flatMap is stable. Verified end-to-end
			// here by inserting two rules whose specificity differs by
			// exactly one extra populated field, and asserting the more
			// specific rule comes back at index [0].
			const clientId = getUniqueString();
			const userId = getUniqueString();
			const ja4 = `t13d1313h2_${getUniqueString()}`;

			// 4 populated scalar fields ⇒ _spec = 4
			const moreSpecificRule: AccessRule = {
				type: AccessPolicyType.Restrict,
				clientId: clientId,
				userId: userId,
				ja4Hash: ja4,
				countryCode: "GB",
			};
			// 2 populated scalar fields ⇒ _spec = 2
			const lessSpecificRule: AccessRule = {
				type: AccessPolicyType.Restrict,
				clientId: clientId,
				ja4Hash: ja4,
			};

			// Insert deliberately in the LEAST-specific-first order so
			// that any accidental "preserve insertion order" code path
			// (e.g. forgetting SORTBY entirely) would produce
			// [lessSpecific, moreSpecific] and the assertion would
			// catch it.
			await insertRules([lessSpecificRule, moreSpecificRule]);

			const foundAccessRules = await accessRulesReader.findRules(
				{
					policyScope: { clientId: clientId },
					policyScopeMatch: FilterScopeMatch.Exact,
					userScope: {
						userId: userId,
						ja4Hash: ja4,
						countryCode: "GB",
					},
					userScopeMatch: FilterScopeMatch.Greedy,
				},
				true,
			);

			expect(foundAccessRules).toHaveLength(2);
			expect(foundAccessRules[0]).toEqual(moreSpecificRule);
			expect(foundAccessRules[1]).toEqual(lessSpecificRule);
		});

		test("findRulesRanked ranks Block over Restrict at equal specificity", async () => {
			// Assumption under test: SEVERITY_EXPR contributes its
			// weight correctly through the HGETALL retrieval — Block
			// rules tied on specificity with Restrict rules still come
			// back first. RANK_EXPR = (_spec * 2) + _sev so at equal
			// spec the Block (_sev = 1) outranks the Restrict (_sev = 0)
			// by 1 point.
			const clientId = getUniqueString();
			const userId = getUniqueString();

			const blockRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: clientId,
				userId: userId,
			};
			const restrictRule: AccessRule = {
				type: AccessPolicyType.Restrict,
				clientId: clientId,
				userId: userId,
				description: "tiebreaker-restrict",
			};

			// Insert restrict first; if SEVERITY tiebreaker is dropped
			// silently the result would lead with the restrict.
			await insertRules([restrictRule, blockRule]);

			const foundAccessRules = await accessRulesReader.findRules(
				{
					policyScope: { clientId: clientId },
					policyScopeMatch: FilterScopeMatch.Exact,
					userScope: { userId: userId },
					userScopeMatch: FilterScopeMatch.Greedy,
				},
				true,
			);

			expect(foundAccessRules).toHaveLength(2);
			expect(foundAccessRules[0]?.type).toBe(AccessPolicyType.Block);
			expect(foundAccessRules[1]?.type).toBe(AccessPolicyType.Restrict);
		});

		test("findRulesRanked: keys DEL'd between aggregate and HGETALL drop out without reordering survivors", async () => {
			// Assumption under test: the race window between
			// FT.AGGREGATE and the HGETALL fanout is handled by the
			// non-empty filter, AND the surviving entries keep their
			// relative rank order (Array.filter is stable). Mirrors the
			// existing greedy-path "returns remaining rules when a
			// matched document's hash key has been deleted" test but
			// asserts the matchingFieldsOnly=true (ranked) path.
			const clientId = getUniqueString();
			const userId = getUniqueString();

			// 3 specificity levels: the middle one will be DEL'd
			// mid-pipeline. The other two must still come back in the
			// correct rank order.
			const topRule: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: clientId,
				userId: userId,
				ja4Hash: "t13d_top",
				countryCode: "GB",
			};
			const middleRule: AccessRule = {
				type: AccessPolicyType.Restrict,
				clientId: clientId,
				userId: userId,
				ja4Hash: "t13d_mid",
			};
			const bottomRule: AccessRule = {
				type: AccessPolicyType.Restrict,
				clientId: clientId,
				userId: userId,
			};

			await insertRules([topRule, middleRule, bottomRule]);

			// Drop the middle rule's hash directly. The RediSearch
			// index still references it for a window; FT.AGGREGATE
			// returns 3 keys, HGETALL returns one empty + two
			// populated. The filter must drop the empty one and the
			// remaining two must stay in the {top, bottom} order.
			const middleKey = getAccessRuleRedisKey(middleRule);
			await redisClient.del(middleKey);

			const foundAccessRules = await accessRulesReader.findRules(
				{
					policyScope: { clientId: clientId },
					policyScopeMatch: FilterScopeMatch.Exact,
					userScope: {
						userId: userId,
						ja4Hash: "t13d_top",
						countryCode: "GB",
					},
					userScopeMatch: FilterScopeMatch.Greedy,
				},
				true,
			);

			expect(foundAccessRules).toHaveLength(2);
			expect(foundAccessRules[0]).toEqual(topRule);
			expect(foundAccessRules[1]).toEqual(bottomRule);
		});

		test("blockOnly filter returns only Block rules even when Restrict rules share the same user scope", async () => {
			// Mix the two policy types across the same (clientId, ja4Hash)
			// space so the strict-match query would otherwise return both.
			// Without blockOnly, the result includes Restrict rules; with
			// blockOnly the Redis-side `@type:{block}` clause excludes
			// them before the JS sees the candidates.
			const clientId = getUniqueString();
			const ja4Hash = "t13d_blockonly";

			const block1: AccessRule = {
				type: AccessPolicyType.Block,
				clientId,
				ja4Hash,
			};
			const block2: AccessRule = {
				type: AccessPolicyType.Block,
				clientId,
				ja4Hash,
				coords: "[[[1,2]]]",
			};
			const restrict1: AccessRule = {
				type: AccessPolicyType.Restrict,
				clientId,
				ja4Hash,
			};
			const restrict2: AccessRule = {
				type: AccessPolicyType.Restrict,
				clientId,
				ja4Hash,
				coords: "[[[3,4]]]",
			};
			const blockOtherClient: AccessRule = {
				type: AccessPolicyType.Block,
				clientId: getUniqueString(),
				ja4Hash,
			};

			await insertRules([
				block1,
				block2,
				restrict1,
				restrict2,
				blockOtherClient,
			]);

			// Greedy / no blockOnly → both Block and Restrict for this
			// clientId come back. The other-client rule is excluded by
			// the greedy policy scope match (different clientId AND set).
			const mixed = await accessRulesReader.findRules({
				policyScope: { clientId },
				policyScopeMatch: FilterScopeMatch.Greedy,
				userScope: { ja4Hash },
				userScopeMatch: FilterScopeMatch.Greedy,
			});
			const mixedTypes = mixed.map((r) => r.type).sort();
			expect(mixed).toHaveLength(4);
			expect(mixedTypes).toEqual([
				AccessPolicyType.Block,
				AccessPolicyType.Block,
				AccessPolicyType.Restrict,
				AccessPolicyType.Restrict,
			]);

			// Same query with blockOnly → only the two Block rules for
			// this clientId. Restrict rules must be filtered server-side.
			const blockOnly = await accessRulesReader.findRules({
				policyScope: { clientId },
				policyScopeMatch: FilterScopeMatch.Greedy,
				userScope: { ja4Hash },
				userScopeMatch: FilterScopeMatch.Greedy,
				blockOnly: true,
			});
			expect(blockOnly).toHaveLength(2);
			for (const rule of blockOnly) {
				expect(rule.type).toBe(AccessPolicyType.Block);
				expect(rule.clientId).toBe(clientId);
			}
			const blockHashes = new Set(blockOnly.map((r) => r.coords));
			expect(blockHashes).toEqual(new Set([undefined, "[[[1,2]]]"]));
		});

		test("blockOnly composes with matchingFieldsOnly on the ranked hot path — Restrict rules never come back", async () => {
			// Exercises the production hot path: greedy user-scope match
			// with matchingFieldsOnly=true (the FT.AGGREGATE-ranked
			// branch). The greedy ja4 query is permissive enough that
			// `ruleApplies` is still the last word on whether a rule
			// applies; the only guarantee this layer is supposed to
			// uphold is that Restrict candidates are gone before JS sees
			// them. That's what blockOnly is for.
			const clientId = getUniqueString();
			const ja4Hash = "t13d_hotpath";

			const blockMatch: AccessRule = {
				type: AccessPolicyType.Block,
				clientId,
				ja4Hash,
			};
			const restrictMatch: AccessRule = {
				type: AccessPolicyType.Restrict,
				clientId,
				ja4Hash,
			};
			const restrictMatchWithCoords: AccessRule = {
				type: AccessPolicyType.Restrict,
				clientId,
				ja4Hash,
				coords: "[[[5,6]]]",
			};

			await insertRules([blockMatch, restrictMatch, restrictMatchWithCoords]);

			const found = await accessRulesReader.findRules(
				{
					policyScope: { clientId },
					policyScopeMatch: FilterScopeMatch.Greedy,
					userScope: { ja4Hash },
					userScopeMatch: FilterScopeMatch.Greedy,
					blockOnly: true,
				},
				true, // matchingFieldsOnly — ranked path
			);

			// Restrict rules must not appear; at least the matching
			// Block rule must be present.
			expect(found.some((r) => r.type === AccessPolicyType.Restrict)).toBe(
				false,
			);
			expect(
				found.some(
					(r) => r.type === AccessPolicyType.Block && r.ja4Hash === ja4Hash,
				),
			).toBe(true);
		});

		test("specific-IP Restrict rule survives when many higher-specificity irrelevant rules co-exist (2026-07-10 Twickets regression)", async () => {
			// Regression guard for the 2026-07-10 Twickets incident: a
			// portal-authored Restrict rule with scope
			// `clientId + numericIp` (specificity 2, severity 0) was
			// silently dropped from the frictionless access-policy lookup
			// when the tenant had many higher-specificity irrelevant
			// rules on the same clientId. The old FT.AGGREGATE ranker
			// used for non-block lookups capped candidates at top-20 by
			// populated-field count; those 20 slots got filled by rules
			// with clientId + numericIp + numericIpMaskMin (SIMD_REPLAY
			// v6 shape, specificity 3, severity 1) or
			// clientId + ja4Hash + coords (SUDDEN_VOLUME_INCREASE shape,
			// specificity 3, severity 1) that all matched the greedy
			// `ismissing(@headHash) | ismissing(@coords) | ismissing(@headersHash)`
			// disjunction. None of them applied to the request under
			// `ruleApplies` — they were emitted from other users'
			// activity — so the JS-side ranker returned [] and the
			// frictionless decision fell through to `default_pow`.
			//
			// The split-query path can't hit that failure: each probe
			// hits a discriminating posting list, so the ip:exact probe
			// returns exactly the rules that literally match this IP.
			const clientId = getUniqueString();

			// The rule that must survive: a portal "Too Many Requests"
			// Restrict/image rule scoped only to (clientId, numericIp).
			const targetIp = 1376899398n; // 82.17.209.70 — Twickets rule
			const targetRule: AccessRule = {
				type: AccessPolicyType.Restrict,
				clientId,
				numericIp: targetIp,
				description: "Too Many Requests",
			};

			// 40 irrelevant Block rules with higher specificity than
			// the target rule. Two shapes drawn from the live Twickets
			// tenant that dominated the top-20:
			//
			//   (a) SIMD_REPLAY v6-style — clientId + numericIp +
			//       numericIpMaskMin. These have a *different* numericIp
			//       from the request, so the exact-IP probe skips them.
			//   (b) SUDDEN_VOLUME_INCREASE-style — clientId + ja4Hash +
			//       coords. Different ja4Hash from the request so those
			//       probes miss them too.
			//
			// Under the old ranker every one of these would fill the top
			// slots and push the target rule off the end.
			const irrelevantRules: AccessRule[] = [];
			for (let i = 0; i < 20; i++) {
				irrelevantRules.push({
					type: AccessPolicyType.Block,
					clientId,
					numericIp: BigInt(2000000000 + i),
					numericIpMaskMin: BigInt(2000000000 + i),
					numericIpMaskMax: BigInt(2000000000 + i),
					description: "SIMD_REPLAY",
				});
			}
			for (let i = 0; i < 20; i++) {
				irrelevantRules.push({
					type: AccessPolicyType.Block,
					clientId,
					ja4Hash: `t13d_other_${i}`,
					coords: `[[[${100 + i},${200 + i}]]]`,
					description: "SUDDEN_VOLUME_INCREASE",
				});
			}

			await insertRules([targetRule, ...irrelevantRules]);

			// Frictionless access-policy lookup shape — greedy match,
			// matchingFieldsOnly=true, no blockOnly.
			const found = await accessRulesReader.findRules(
				{
					policyScope: { clientId },
					policyScopeMatch: FilterScopeMatch.Greedy,
					userScope: {
						numericIp: targetIp,
						ja4Hash: "t13d1516h2_request_ja4",
						userAgentHash: "sha256:request_ua",
						userId: getUniqueString(),
					},
					userScopeMatch: FilterScopeMatch.Greedy,
				},
				true, // matchingFieldsOnly — production hot path
			);

			// The target rule MUST come back. Under the old ranker it
			// was truncated; under the split path the ip:exact probe
			// returns exactly this one rule, so it can't be crowded
			// out by irrelevant candidates from other probes.
			const targetFound = found.find(
				(r) =>
					r.type === AccessPolicyType.Restrict &&
					r.numericIp === targetIp &&
					r.description === "Too Many Requests",
			);
			expect(targetFound).toBeDefined();
		});
	});

	afterAll(async () => {
		await redisClient.flushAll();
	});
});
