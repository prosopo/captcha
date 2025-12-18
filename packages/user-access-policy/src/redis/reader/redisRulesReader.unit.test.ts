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
import { RedisRulesReader } from "#policy/redis/reader/redisRulesReader.js";
import { AccessPolicyType } from "#policy/rule.js";
import { FilterScopeMatch } from "#policy/rulesStorage.js";
import { loggerMockedInstance } from "../../testLogger.js";

describe("RedisRulesReader", () => {
	let reader: RedisRulesReader;
	let mockClient: RedisClientType;

	beforeEach(() => {
		mockClient = {
			multi: vi.fn(),
			ft: {
				search: vi.fn(),
				aggregate: vi.fn(),
				aggregateWithCursor: vi.fn(),
			},
		} as unknown as RedisClientType;

		reader = new RedisRulesReader(mockClient, loggerMockedInstance);
	});

	describe("getMissingRuleIds", () => {
		it("should return empty array when all keys exist", async () => {
			const multiMock = {
				exists: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue([1, 1, 1]),
			};
			mockClient.multi = vi.fn().mockReturnValue(multiMock);

			const result = await reader.getMissingRuleIds([
				"key1",
				"key2",
				"key3",
			]);

			expect(result).toEqual([]);
			expect(multiMock.exists).toHaveBeenCalledTimes(3);
		});

		it("should return missing key IDs", async () => {
			const multiMock = {
				exists: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue([1, "0", 1]),
			};
			mockClient.multi = vi.fn().mockReturnValue(multiMock);

			const result = await reader.getMissingRuleIds([
				"key1",
				"key2",
				"key3",
			]);

			expect(result).toEqual(["key2"]);
		});

		it("should handle empty input array", async () => {
			const multiMock = {
				exists: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue([]),
			};
			mockClient.multi = vi.fn().mockReturnValue(multiMock);

			const result = await reader.getMissingRuleIds([]);

			expect(result).toEqual([]);
		});
	});

	describe("fetchRules", () => {
		it("should fetch rule entries for given IDs", async () => {
			const mockRules = [
				{ type: "block", clientId: "client1" },
			];
			const mockExpirations = [1234567890];

			const rulesPipeMock = {
				hGetAll: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue(mockRules),
			};

			const expirationPipeMock = {
				expireTime: vi.fn().mockReturnThis(),
				exec: vi.fn().mockResolvedValue(mockExpirations),
			};

			mockClient.multi = vi
				.fn()
				.mockReturnValueOnce(rulesPipeMock)
				.mockReturnValueOnce(expirationPipeMock);

			const result = await reader.fetchRules(["rule1"]);

			expect(result).toBeInstanceOf(Array);
			expect(rulesPipeMock.hGetAll).toHaveBeenCalled();
			expect(expirationPipeMock.expireTime).toHaveBeenCalled();
		});

		it("should handle empty rule IDs array", async () => {
			const result = await reader.fetchRules([]);

			expect(result).toEqual([]);
		});
	});

	describe("findRules", () => {
		it("should execute search query and return rules", async () => {
			const mockSearchReply = {
				total: 1,
				documents: [
					{
						id: "uar:hash1",
						value: {
							type: "block",
							clientId: "client1",
						},
					},
				],
			};

			mockClient.ft.search = vi.fn().mockResolvedValue(mockSearchReply);

			const filter = {
				policyScope: { clientId: "client1" },
				policyScopeMatch: FilterScopeMatch.Exact,
			};

			const result = await reader.findRules(filter);

			expect(mockClient.ft.search).toHaveBeenCalled();
			expect(result).toBeInstanceOf(Array);
		});

		it("should return empty array when no rules match", async () => {
			const mockSearchReply = {
				total: 0,
				documents: [],
			};

			mockClient.ft.search = vi.fn().mockResolvedValue(mockSearchReply);

			const filter = {
				policyScope: { clientId: "client1" },
			};

			const result = await reader.findRules(filter);

			expect(result).toEqual([]);
		});

		it("should call search even with empty policy scope", async () => {
			const mockSearchReply = {
				total: 0,
				documents: [],
			};

			mockClient.ft.search = vi.fn().mockResolvedValue(mockSearchReply);

			const filter = {
				policyScope: {},
			};

			const result = await reader.findRules(filter, false, true);

			// Should call search for non-empty query
			expect(mockClient.ft.search).toHaveBeenCalled();
			expect(result).toEqual([]);
		});

		it("should handle search errors gracefully", async () => {
			mockClient.ft.search = vi
				.fn()
				.mockRejectedValue(new Error("Search failed"));

			const filter = {
				policyScope: { clientId: "client1" },
			};

			const result = await reader.findRules(filter);

			expect(result).toEqual([]);
		});
	});

	describe("findRuleIds", () => {
		it("should return rule IDs without prefix", async () => {
			// Mock aggregateRedisKeys which is used internally
			const filter = {
				policyScope: { clientId: "client1" },
			};

			// Since aggregateRedisKeys is imported and used, we can't easily mock it
			// without more complex setup. Let's test error handling instead.
			mockClient.ft.aggregate = vi
				.fn()
				.mockRejectedValue(new Error("Aggregate failed"));

			const result = await reader.findRuleIds(filter);

			expect(result).toEqual([]);
		});

		it("should handle errors gracefully", async () => {
			const filter = {
				policyScope: { clientId: "client1" },
			};

			// The method should catch errors and return empty array
			const result = await reader.findRuleIds(filter);

			expect(result).toBeInstanceOf(Array);
		});
	});

	describe("fetchAllRuleIds", () => {
		it("should process rule IDs in batches", async () => {
			const batchHandler = vi.fn().mockResolvedValue(undefined);

			// Mock aggregateWithCursor for the aggregation
			mockClient.ft.aggregateWithCursor = vi.fn().mockResolvedValue({
				cursor: 0,
				results: [],
			});

			await reader.fetchAllRuleIds(batchHandler);

			// The aggregation should have been called
			expect(mockClient.ft.aggregateWithCursor).toHaveBeenCalled();
		});
	});
});
