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
import { DeleteRulesEndpoint } from "#policy/api/delete/deleteRules.js";

describe("DeleteRulesEndpoint", () => {
	let mockAccessRulesStorage: AccessRulesStorage;
	let mockLogger: ReturnType<typeof getLogger>;
	let endpoint: DeleteRulesEndpoint;

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

		endpoint = new DeleteRulesEndpoint(mockAccessRulesStorage, mockLogger);
	});

	describe("getRequestArgsSchema", () => {
		it("should return a valid Zod schema for delete rules filters", () => {
			const schema = endpoint.getRequestArgsSchema();
			expect(schema).toBeDefined();
			expect(typeof schema.parse).toBe("function");
		});

		it("should validate correct delete rules filter structure", () => {
			const schema = endpoint.getRequestArgsSchema();

			const validInput = [
				{
					policyScope: {
						clientId: "client1",
					},
				},
			];

			expect(() => schema.parse(validInput)).not.toThrow();
		});

		it("should reject invalid delete rules filter structure", () => {
			const schema = endpoint.getRequestArgsSchema();

			const invalidInput = [
				{
					// Invalid: groupId should be string, not number
					groupId: 123,
				},
			];

			expect(() => schema.parse(invalidInput)).toThrow();
		});
	});

	describe("processRequest", () => {
		it("should successfully delete rules matching filters and return success with count", async () => {
			// Mock finding rule IDs
			mockAccessRulesStorage.findRuleIds
				.mockResolvedValueOnce(["rule1", "rule2"])
				.mockResolvedValueOnce(["rule2", "rule3"]); // rule2 is duplicated

			// Mock successful deletion
			mockAccessRulesStorage.deleteRules.mockResolvedValue();

			const input = [
				{
					policyScope: { clientId: "client1" },
				},
				{
					policyScope: { clientId: "client2" },
				},
			];

			const result = await endpoint.processRequest(input);

			expect(result).toEqual({
				status: ApiEndpointResponseStatus.SUCCESS,
				data: {
					deleted_count: 3, // rule1, rule2, rule3 (deduplicated)
				},
			});

			// Should call findRuleIds for each filter
			expect(mockAccessRulesStorage.findRuleIds).toHaveBeenCalledTimes(2);

			// Should call deleteRules with deduplicated IDs
			expect(mockAccessRulesStorage.deleteRules).toHaveBeenCalledWith([
				"rule1",
				"rule2",
				"rule3",
			]);

			// Should log the operation
			expect(mockLogger.info).toHaveBeenCalledWith(
				expect.any(Function), // Logger uses function for lazy evaluation
			);
		});

		it("should handle empty filter results gracefully", async () => {
			// Mock finding no rule IDs
			mockAccessRulesStorage.findRuleIds.mockResolvedValue([]);

			const input = [
				{
					policyScope: { clientId: "nonexistent" },
				},
			];

			const result = await endpoint.processRequest(input);

			expect(result).toEqual({
				status: ApiEndpointResponseStatus.SUCCESS,
				data: {
					deleted_count: 0,
				},
			});

			// Should not call deleteRules when no rules found
			expect(mockAccessRulesStorage.deleteRules).not.toHaveBeenCalled();

			// Should not log anything
			expect(mockLogger.info).not.toHaveBeenCalled();
		});

		it("should deduplicate rule IDs across multiple filters", async () => {
			mockAccessRulesStorage.findRuleIds
				.mockResolvedValueOnce(["rule1", "rule2"])
				.mockResolvedValueOnce(["rule2", "rule3"])
				.mockResolvedValueOnce(["rule1", "rule4"]);

			mockAccessRulesStorage.deleteRules.mockResolvedValue();

			const input = [
				{ policyScope: { clientId: "client1" } },
				{ policyScope: { clientId: "client2" } },
				{ policyScope: { clientId: "client3" } },
			];

			const result = await endpoint.processRequest(input);

			expect(result).toEqual({
				status: ApiEndpointResponseStatus.SUCCESS,
				data: {
					deleted_count: 4, // rule1, rule2, rule3, rule4
				},
			});

			expect(mockAccessRulesStorage.deleteRules).toHaveBeenCalledWith([
				"rule1",
				"rule2",
				"rule3",
				"rule4",
			]);
		});

		it("should handle complex filter combinations", async () => {
			mockAccessRulesStorage.findRuleIds.mockResolvedValue(["rule1"]);

			const input = [
				{
					policyScope: { clientId: "client1" },
					userScope: { userId: "user1" },
				},
			];

			await endpoint.processRequest(input);

			expect(mockAccessRulesStorage.findRuleIds).toHaveBeenCalledWith({
				policyScope: { clientId: "client1" },
				userScope: { userId: "user1" },
				policyScopeMatch: undefined,
			});
		});

		it("should process multiple filters sequentially using executeBatchesSequentially", async () => {
			mockAccessRulesStorage.findRuleIds
				.mockResolvedValueOnce(["rule1"])
				.mockResolvedValueOnce(["rule2"]);

			mockAccessRulesStorage.deleteRules.mockResolvedValue();

			const input = [
				{ policyScope: { clientId: "client1" } },
				{ policyScope: { clientId: "client2" } },
			];

			await endpoint.processRequest(input);

			// Should call findRuleIds for each filter
			expect(mockAccessRulesStorage.findRuleIds).toHaveBeenCalledTimes(2);
			expect(mockAccessRulesStorage.findRuleIds).toHaveBeenNthCalledWith(1, {
				policyScope: { clientId: "client1" },
				policyScopeMatch: undefined,
			});
			expect(mockAccessRulesStorage.findRuleIds).toHaveBeenNthCalledWith(2, {
				policyScope: { clientId: "client2" },
				policyScopeMatch: undefined,
			});
		});

		it("should handle empty input array", async () => {
			const input: any[] = [];

			const result = await endpoint.processRequest(input);

			expect(result).toEqual({
				status: ApiEndpointResponseStatus.SUCCESS,
				data: {
					deleted_count: 0,
				},
			});

			expect(mockAccessRulesStorage.findRuleIds).not.toHaveBeenCalled();
			expect(mockAccessRulesStorage.deleteRules).not.toHaveBeenCalled();
		});
	});
});