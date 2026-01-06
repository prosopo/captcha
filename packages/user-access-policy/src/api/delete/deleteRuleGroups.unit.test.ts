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

import { ApiEndpointResponseStatus } from "@prosopo/api-route";
import { LogLevel, getLogger } from "@prosopo/common";
import { describe, expect, it, vi } from "vitest";
import { DeleteRuleGroupsEndpoint } from "#policy/api/delete/deleteRuleGroups.js";
import { FilterScopeMatch } from "#policy/rulesStorage.js";
import type { AccessRulesStorage } from "#policy/rulesStorage.js";
import { loggerMockedInstance } from "../../testLogger.js";

describe("DeleteRuleGroupsEndpoint", () => {
	const mockLogger = loggerMockedInstance;

	it("should return success after deleting rule groups", async () => {
		const mockStorage: AccessRulesStorage = {
			fetchRules: vi.fn(),
			getMissingRuleIds: vi.fn(),
			findRules: vi.fn(),
			findRuleIds: vi
				.fn()
				.mockResolvedValueOnce(["id1"])
				.mockResolvedValueOnce(["id2"]),
			fetchAllRuleIds: vi.fn(),
			insertRules: vi.fn(),
			deleteRules: vi.fn().mockResolvedValue(undefined),
			deleteAllRules: vi.fn(),
		};

		const endpoint = new DeleteRuleGroupsEndpoint(mockStorage, mockLogger);
		const response = await endpoint.processRequest([
			{
				clientIds: ["client1", "client2"],
				groupId: "group1",
			},
		]);

		expect(response.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(response.data?.deleted_count).toBe(2);
		expect(mockStorage.deleteRules).toHaveBeenCalledWith(["id1", "id2"]);
	});

	it("should remove duplicate rule IDs before deleting", async () => {
		const mockStorage: AccessRulesStorage = {
			fetchRules: vi.fn(),
			getMissingRuleIds: vi.fn(),
			findRules: vi.fn(),
			findRuleIds: vi
				.fn()
				.mockResolvedValueOnce(["id1", "id2"])
				.mockResolvedValueOnce(["id1", "id2"]),
			fetchAllRuleIds: vi.fn(),
			insertRules: vi.fn(),
			deleteRules: vi.fn().mockResolvedValue(undefined),
			deleteAllRules: vi.fn(),
		};

		const endpoint = new DeleteRuleGroupsEndpoint(mockStorage, mockLogger);
		const response = await endpoint.processRequest([
			{
				clientIds: ["client1", "client2"],
				groupId: "group1",
			},
		]);

		expect(response.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(response.data?.deleted_count).toBe(2);
		expect(mockStorage.deleteRules).toHaveBeenCalledWith(["id1", "id2"]);
	});

	it("should return zero deleted count when no rules are found", async () => {
		const mockStorage: AccessRulesStorage = {
			fetchRules: vi.fn(),
			getMissingRuleIds: vi.fn(),
			findRules: vi.fn(),
			findRuleIds: vi.fn().mockResolvedValue([]),
			fetchAllRuleIds: vi.fn(),
			insertRules: vi.fn(),
			deleteRules: vi.fn(),
			deleteAllRules: vi.fn(),
		};

		const endpoint = new DeleteRuleGroupsEndpoint(mockStorage, mockLogger);
		const response = await endpoint.processRequest([
			{
				clientIds: ["client1"],
				groupId: "group1",
			},
		]);

		expect(response.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(response.data?.deleted_count).toBe(0);
		expect(mockStorage.deleteRules).not.toHaveBeenCalled();
	});

	it("should handle multiple rule groups", async () => {
		const mockStorage: AccessRulesStorage = {
			fetchRules: vi.fn(),
			getMissingRuleIds: vi.fn(),
			findRules: vi.fn(),
			findRuleIds: vi
				.fn()
				.mockResolvedValueOnce(["id1"])
				.mockResolvedValueOnce(["id2"]),
			fetchAllRuleIds: vi.fn(),
			insertRules: vi.fn(),
			deleteRules: vi.fn().mockResolvedValue(undefined),
			deleteAllRules: vi.fn(),
		};

		const endpoint = new DeleteRuleGroupsEndpoint(mockStorage, mockLogger);
		const response = await endpoint.processRequest([
			{
				clientIds: ["client1"],
				groupId: "group1",
			},
			{
				clientIds: ["client2"],
				groupId: "group2",
			},
		]);

		expect(response.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(response.data?.deleted_count).toBe(2);
		expect(mockStorage.deleteRules).toHaveBeenCalledTimes(1);
		expect(mockStorage.deleteRules).toHaveBeenCalledWith(["id1", "id2"]);
	});

	it("should use exact policy scope match when finding rules", async () => {
		const mockStorage: AccessRulesStorage = {
			fetchRules: vi.fn(),
			getMissingRuleIds: vi.fn(),
			findRules: vi.fn(),
			findRuleIds: vi.fn().mockResolvedValue(["id1"]),
			fetchAllRuleIds: vi.fn(),
			insertRules: vi.fn(),
			deleteRules: vi.fn().mockResolvedValue(undefined),
			deleteAllRules: vi.fn(),
		};

		const endpoint = new DeleteRuleGroupsEndpoint(mockStorage, mockLogger);
		await endpoint.processRequest([
			{
				clientIds: ["client1"],
				groupId: "group1",
			},
		]);

		expect(mockStorage.findRuleIds).toHaveBeenCalledWith({
			policyScope: { clientId: "client1" },
			policyScopeMatch: FilterScopeMatch.Exact,
			groupId: "group1",
		});
	});

	it("should validate request schema correctly", () => {
		const mockStorage: AccessRulesStorage = {
			fetchRules: vi.fn(),
			getMissingRuleIds: vi.fn(),
			findRules: vi.fn(),
			findRuleIds: vi.fn(),
			fetchAllRuleIds: vi.fn(),
			insertRules: vi.fn(),
			deleteRules: vi.fn(),
			deleteAllRules: vi.fn(),
		};

		const endpoint = new DeleteRuleGroupsEndpoint(mockStorage, mockLogger);
		const schema = endpoint.getRequestArgsSchema();

		expect(
			schema.parse([
				{
					clientIds: ["client1"],
					groupId: "group1",
				},
			]),
		).toBeDefined();

		expect(() =>
			schema.parse([
				{
					clientIds: "not-an-array",
					groupId: "group1",
				},
			]),
		).toThrow();
	});

	it("should log information when deleting rule groups", async () => {
		const mockStorage: AccessRulesStorage = {
			fetchRules: vi.fn(),
			getMissingRuleIds: vi.fn(),
			findRules: vi.fn(),
			findRuleIds: vi.fn().mockResolvedValue(["id1"]),
			fetchAllRuleIds: vi.fn(),
			insertRules: vi.fn(),
			deleteRules: vi.fn().mockResolvedValue(undefined),
			deleteAllRules: vi.fn(),
		};

		const logger = getLogger(LogLevel.enum.info, "test");
		const infoSpy = vi.spyOn(logger, "info");

		const endpoint = new DeleteRuleGroupsEndpoint(mockStorage, logger);
		await endpoint.processRequest([
			{
				clientIds: ["client1"],
				groupId: "group1",
			},
		]);

		expect(infoSpy).toHaveBeenCalled();
	});
});
