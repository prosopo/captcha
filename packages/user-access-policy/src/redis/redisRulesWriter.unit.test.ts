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
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
	RedisRulesWriter,
	getRedisRuleValue,
} from "#policy/redis/redisRulesWriter.js";
import { AccessPolicyType, type AccessRule } from "#policy/rule.js";
import { loggerMockedInstance } from "../testLogger.js";

describe("RedisRulesWriter", () => {
	let writer: RedisRulesWriter;
	let mockClient: RedisClientType;

	beforeEach(() => {
		// Mock Redis client with multi/pipeline support
		mockClient = {
			multi: vi.fn().mockReturnValue({
				hSet: vi.fn().mockReturnThis(),
				expireAt: vi.fn().mockReturnThis(),
				del: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue([]),
			}),
			scan: vi.fn(),
		} as unknown as RedisClientType;

		writer = new RedisRulesWriter(mockClient, loggerMockedInstance);
	});

	describe("insertRules", () => {
		it("should call hSet for each rule entry", async () => {
			const multiMock = {
				hSet: vi.fn().mockReturnThis(),
				expireAt: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue([]),
			};
			mockClient.multi = vi.fn().mockReturnValue(multiMock);

			const ruleEntries = [
				{
					rule: {
						type: AccessPolicyType.Block,
						clientId: "client1",
					},
				},
			];

			await writer.insertRules(ruleEntries);

			expect(multiMock.hSet).toHaveBeenCalledTimes(1);
			expect(multiMock.hSet).toHaveBeenCalledWith(
				expect.stringContaining("uar:"),
				expect.objectContaining({
					type: "block",
					clientId: "client1",
				}),
			);
			expect(multiMock.exec).toHaveBeenCalled();
		});

		it("should call hSet for each of multiple rule entries", async () => {
			const multiMock = {
				hSet: vi.fn().mockReturnThis(),
				expireAt: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue([]),
			};
			mockClient.multi = vi.fn().mockReturnValue(multiMock);

			const ruleEntries = [
				{
					rule: {
						type: AccessPolicyType.Block,
						clientId: "client1",
					},
				},
				{
					rule: {
						type: AccessPolicyType.Restrict,
						clientId: "client2",
					},
				},
			];

			await writer.insertRules(ruleEntries);

			expect(multiMock.hSet).toHaveBeenCalledTimes(2);
			expect(multiMock.exec).toHaveBeenCalled();
		});

		it("should set expiration when expiresUnixTimestamp is provided", async () => {
			const multiMock = {
				hSet: vi.fn().mockReturnThis(),
				expireAt: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue([]),
			};
			mockClient.multi = vi.fn().mockReturnValue(multiMock);

			const expirationTime = Math.floor(Date.now() / 1000) + 3600;
			const ruleEntries = [
				{
					rule: {
						type: AccessPolicyType.Block,
					},
					expiresUnixTimestamp: expirationTime,
				},
			];

			await writer.insertRules(ruleEntries);

			expect(multiMock.expireAt).toHaveBeenCalledWith(
				expect.stringContaining("uar:"),
				expirationTime,
			);
		});

		it("should not set expiration when expiresUnixTimestamp is not provided", async () => {
			const multiMock = {
				hSet: vi.fn().mockReturnThis(),
				expireAt: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue([]),
			};
			mockClient.multi = vi.fn().mockReturnValue(multiMock);

			const ruleEntries = [
				{
					rule: {
						type: AccessPolicyType.Block,
					},
				},
			];

			await writer.insertRules(ruleEntries);

			expect(multiMock.expireAt).not.toHaveBeenCalled();
		});

		it("should store rules with correct Redis key prefix", async () => {
			const multiMock = {
				hSet: vi.fn().mockReturnThis(),
				expireAt: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue([]),
			};
			mockClient.multi = vi.fn().mockReturnValue(multiMock);

			const ruleEntries = [
				{
					rule: {
						type: AccessPolicyType.Block,
					},
				},
			];

			await writer.insertRules(ruleEntries);

			// Verify that hSet was called with a key starting with "uar:"
			expect(multiMock.hSet).toHaveBeenCalledWith(
				expect.stringMatching(/^uar:/),
				expect.any(Object),
			);
		});

		it("should handle empty rule entries array", async () => {
			const result = await writer.insertRules([]);

			expect(result).toEqual([]);
		});
	});

	describe("deleteRules", () => {
		it("should delete single rule", async () => {
			const multiMock = {
				del: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue([]),
			};
			mockClient.multi = vi.fn().mockReturnValue(multiMock);

			await writer.deleteRules(["rule-id-1"]);

			expect(multiMock.del).toHaveBeenCalledWith("uar:rule-id-1");
			expect(multiMock.exec).toHaveBeenCalled();
		});

		it("should delete multiple rules", async () => {
			const multiMock = {
				del: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue([]),
			};
			mockClient.multi = vi.fn().mockReturnValue(multiMock);

			await writer.deleteRules(["rule-id-1", "rule-id-2", "rule-id-3"]);

			expect(multiMock.del).toHaveBeenCalledTimes(3);
			expect(multiMock.exec).toHaveBeenCalled();
		});

		it("should handle empty rule IDs array", async () => {
			const multiMock = {
				del: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue([]),
			};
			mockClient.multi = vi.fn().mockReturnValue(multiMock);

			await writer.deleteRules([]);

			expect(multiMock.del).not.toHaveBeenCalled();
		});
	});

	describe("deleteAllRules", () => {
		it("should scan and delete all rules with matching prefix", async () => {
			const multiMock = {
				del: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue([]),
			};
			mockClient.multi = vi.fn().mockReturnValue(multiMock);
			
			// Mock scan to return keys in first call, then indicate completion
			mockClient.scan = vi
				.fn()
				.mockResolvedValueOnce({
					cursor: "1",
					keys: ["uar:key1", "uar:key2"],
				})
				.mockResolvedValueOnce({
					cursor: "0",
					keys: [],
				});

			const total = await writer.deleteAllRules();

			expect(mockClient.scan).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					MATCH: "uar:*",
				}),
			);
			expect(total).toBe(2);
		});

		it("should return zero when no rules exist", async () => {
			mockClient.scan = vi.fn().mockResolvedValue({
				cursor: "0",
				keys: [],
			});

			const total = await writer.deleteAllRules();

			expect(total).toBe(0);
		});

		it("should handle multiple scan iterations", async () => {
			const multiMock = {
				del: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue([]),
			};
			mockClient.multi = vi.fn().mockReturnValue(multiMock);

			mockClient.scan = vi
				.fn()
				.mockResolvedValueOnce({
					cursor: "1",
					keys: ["uar:key1"],
				})
				.mockResolvedValueOnce({
					cursor: "2",
					keys: ["uar:key2"],
				})
				.mockResolvedValueOnce({
					cursor: "0",
					keys: [],
				});

			const total = await writer.deleteAllRules();

			expect(mockClient.scan).toHaveBeenCalledTimes(3);
			expect(total).toBe(2);
		});
	});
});

describe("getRedisRuleValue", () => {
	it("should convert all rule fields to strings", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Block,
			clientId: "client1",
			solvedImagesCount: 5,
		};

		const result = getRedisRuleValue(rule);

		expect(result.type).toBe("block");
		expect(result.clientId).toBe("client1");
		expect(result.solvedImagesCount).toBe("5");
	});

	it("should handle numeric fields", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Restrict,
			imageThreshold: 0.75,
			powDifficulty: 100000,
		};

		const result = getRedisRuleValue(rule);

		expect(result.imageThreshold).toBe("0.75");
		expect(result.powDifficulty).toBe("100000");
	});

	it("should handle bigint fields", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Block,
			numericIp: BigInt("167772160"),
		};

		const result = getRedisRuleValue(rule);

		expect(result.numericIp).toBe("167772160");
	});

	it("should handle minimal rule with only type", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Block,
		};

		const result = getRedisRuleValue(rule);

		expect(result.type).toBe("block");
		expect(Object.keys(result)).toHaveLength(1);
	});

	it("should convert all field types to string", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Restrict,
			clientId: "client1",
			userId: "user1",
			solvedImagesCount: 3,
			imageThreshold: 0.8,
			numericIp: BigInt("167772160"),
		};

		const result = getRedisRuleValue(rule);

		// All values should be strings
		Object.values(result).forEach((value) => {
			expect(typeof value).toBe("string");
		});
	});
});
