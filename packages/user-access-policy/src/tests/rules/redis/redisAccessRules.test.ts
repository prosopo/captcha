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
		let accessRulesWriter: AccessRulesWriter;

		beforeAll(() => {
			accessRulesWriter = createAccessRulesWriter(redisClient);
		});

		test("inserts rule", async () => {
			// given
			const accessRule = {
				type: AccessPolicyType.Block,
				// fixme random string, so it gets a unique key
				clientId: "_clientId",
			};
			const accessRuleKey = getAccessRuleKey(accessRule);

			// when
			await accessRulesWriter.insertRule(accessRule);

			// then
			const insertedAccessRule = await redisClient.hGetAll(accessRuleKey);

			expect(insertedAccessRule).toEqual(accessRule);

			// fixme check presence in the index
		});

		test("inserts time limited rule", async () => {
			// given
			const accessRule = {
				type: AccessPolicyType.Block,
				// fixme random string, so it gets a unique key
				clientId: "_clientId",
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

			expect(insertedAccessRule).toEqual(accessRule);
			expect(insertedExpirationTimestamp).toBe(expirationTimestamp);

			// fixme check presence in the index
		});

		test("deletes rules", () => {
			// fixme
		});

		test("deletes all rules", () => {
			// fixme
		});
	});

	describe("reader", () => {
		let accessRulesReader: AccessRulesReader;

		beforeAll(() => {
			// fixme
			accessRulesReader = createAccessRulesReader(redisClient, mockedLogger);
		});

		test("finds rules", async () => {
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
