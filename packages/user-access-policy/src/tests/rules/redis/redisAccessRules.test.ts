import { type RedisClientType, createClient } from "redis";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
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
	createAccessRulesIndex,
	getAccessRuleKey,
} from "#policy/rules/redis/redisAccessRulesIndex.js";
import { mockedLogger } from "#policy/tests/rules/mockedLogger.js";

describe("redisAccessRules", () => {
	let redisClient: RedisClientType;

	beforeAll(async () => {
		redisClient = (await createClient({
			// /docker/redis/redis-stack.docker-compose.yml
			url: "redis://localhost:6379",
			password: "root",
		})
			.on("error", (err) => console.log("Redis Client Error", err))
			.connect()) as RedisClientType;

		await createAccessRulesIndex(redisClient);

		await redisClient.flushAll();
	});

	describe("writer", () => {
		let writer: AccessRulesWriter;

		beforeAll(() => {
			writer = createAccessRulesWriter(redisClient);
		});

		test("inserts rule", async () => {
			// given
			const accessRule = {
				type: AccessPolicyType.Block,
				clientId: "_clientId",
			};
			const accessRuleKey = getAccessRuleKey(accessRule);

			// when
			await writer.insertRule(accessRule);

			// then
			const insertedAccessRule = await redisClient.hGetAll(accessRuleKey);

			expect(insertedAccessRule).toEqual(accessRule);
		});

		test("inserts rule with expiration", async () => {
			// given
			const accessRule = {
				type: AccessPolicyType.Block,
				clientId: "_clientId",
			};
			const accessRuleKey = getAccessRuleKey(accessRule);
			// 1 hour from now.
			const expirationTimestamp = Math.floor(Date.now() / 1000) + 60 * 60;

			// when
			await writer.insertRule(accessRule, expirationTimestamp);

			// then
			const insertedAccessRule = await redisClient.hGetAll(accessRuleKey);
			const insertedExpirationTimestamp =
				await redisClient.expireTime(accessRuleKey);

			expect(insertedAccessRule).toEqual(accessRule);
			expect(insertedExpirationTimestamp).toBe(expirationTimestamp);
		});

		test("deletes rules", () => {
			// fixme
		});

		test("deletes all rules", () => {
			// fixme
		});
	});

	describe("reader", () => {
		let reader: AccessRulesReader;

		beforeAll(() => {
			// fixme
			reader = createAccessRulesReader(redisClient, mockedLogger);
		});

		test("finds rules", async () => {
			// fixme
		});

		// fixme cover all variations

		test("finds rule ids", () => {
			// fixme reuse
		});
	});

	afterAll(async () => {
		await redisClient.flushAll();
	});
});
