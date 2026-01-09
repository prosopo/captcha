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

import { LogLevel, getLogger } from "@prosopo/common";
import { ApiEndpointResponseStatus } from "@prosopo/api-route";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AccessRulesStorage } from "#policy/rulesStorage.js";
import { FetchRulesEndpoint } from "#policy/api/read/fetchRules.js";

describe("FetchRulesEndpoint", () => {
	let mockAccessRulesStorage: AccessRulesStorage;
	let mockLogger: ReturnType<typeof getLogger>;
	let endpoint: FetchRulesEndpoint;

	beforeEach(() => {
		mockAccessRulesStorage = {
			insertRules: vi.fn(),
			deleteRules: vi.fn(),
			deleteAllRules: vi.fn(),
			fetchRules: vi.fn(),
			findRules: vi.fn(),
			findRuleIds: vi.fn(),
			fetchAllRuleIds: vi.fn(),
			getMissingRuleIds: vi.fn(),
		};

		mockLogger = {
			info: vi.fn(),
			debug: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			getLogLevel: vi.fn().mockReturnValue(LogLevel.enum.info),
		} as ReturnType<typeof getLogger>;

		endpoint = new FetchRulesEndpoint(mockAccessRulesStorage, mockLogger);
	});

	describe("getRequestArgsSchema", () => {
		it("should return a valid Zod schema for fetch rules options", () => {
			const schema = endpoint.getRequestArgsSchema();
			expect(schema).toBeDefined();
			expect(typeof schema.parse).toBe("function");
		});

		it("should validate correct fetch rules options structure", () => {
			const schema = endpoint.getRequestArgsSchema();

			const validInput = {
				ids: ["rule1", "rule2", "rule3"],
			};

			expect(() => schema.parse(validInput)).not.toThrow();
		});

		it("should reject invalid fetch rules options structure", () => {
			const schema = endpoint.getRequestArgsSchema();

			const invalidInput = {
				// Invalid: ids should be array of strings, not string
				ids: "not-an-array",
			};

			expect(() => schema.parse(invalidInput)).toThrow();
		});

	});

	describe("processRequest", () => {
		it("should successfully fetch rules and return success response", async () => {
			const mockRuleEntries = [
				{
					rule: { type: "block" as const, userId: "user1" },
					expiresUnixTimestamp: undefined,
				},
				{
					rule: { type: "restrict" as const, userId: "user2" },
					expiresUnixTimestamp: 1234567890,
				},
			];

			mockAccessRulesStorage.fetchRules.mockResolvedValue(mockRuleEntries);

			const input = {
				ids: ["rule1", "rule2"],
			};

			const result = await endpoint.processRequest(input);

			expect(result).toEqual({
				status: ApiEndpointResponseStatus.SUCCESS,
				data: {
					ruleEntries: mockRuleEntries,
				},
			});

			expect(mockAccessRulesStorage.fetchRules).toHaveBeenCalledWith(["rule1", "rule2"]);

			expect(mockLogger.info).toHaveBeenCalledWith(
				expect.any(Function), // Logger uses function for lazy evaluation
			);
		});

		it("should handle empty rule results", async () => {
			mockAccessRulesStorage.fetchRules.mockResolvedValue([]);

			const input = {
				ids: ["nonexistent1", "nonexistent2"],
			};

			const result = await endpoint.processRequest(input);

			expect(result).toEqual({
				status: ApiEndpointResponseStatus.SUCCESS,
				data: {
					ruleEntries: [],
				},
			});

			expect(mockLogger.info).toHaveBeenCalledWith(
				expect.any(Function), // Logger uses function for lazy evaluation
			);
		});

		it("should handle single rule ID", async () => {
			const mockRuleEntries = [
				{
					rule: { type: "block" as const, userId: "user1" },
					expiresUnixTimestamp: undefined,
				},
			];

			mockAccessRulesStorage.fetchRules.mockResolvedValue(mockRuleEntries);

			const input = {
				ids: ["single-rule"],
			};

			const result = await endpoint.processRequest(input);

			expect(result).toEqual({
				status: ApiEndpointResponseStatus.SUCCESS,
				data: {
					ruleEntries: mockRuleEntries,
				},
			});

			expect(mockAccessRulesStorage.fetchRules).toHaveBeenCalledWith(["single-rule"]);
		});

		it("should handle large number of rule IDs", async () => {
			const mockRuleEntries = Array.from({ length: 100 }, (_, i) => ({
				rule: { type: "block" as const, userId: `user${i}` },
				expiresUnixTimestamp: undefined,
			}));

			const ruleIds = Array.from({ length: 100 }, (_, i) => `rule${i}`);

			mockAccessRulesStorage.fetchRules.mockResolvedValue(mockRuleEntries);

			const input = {
				ids: ruleIds,
			};

			const result = await endpoint.processRequest(input);

			expect(result.status).toBe(ApiEndpointResponseStatus.SUCCESS);
			expect(result.data?.ruleEntries).toHaveLength(100);

			expect(mockAccessRulesStorage.fetchRules).toHaveBeenCalledWith(ruleIds);
		});

		it("should log debug information when log level is debug", async () => {
			mockLogger.getLogLevel.mockReturnValue(LogLevel.enum.debug);
			mockAccessRulesStorage.fetchRules.mockResolvedValue([]);

			const input = {
				ids: ["rule1"],
			};

			await endpoint.processRequest(input);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.any(Function), // Should include detailed rule information
			);
		});
	});
});