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

import { ApiEndpointResponseStatus } from "@prosopo/api-route";
import { LogLevel, getLogger } from "@prosopo/common";
import { describe, expect, it, vi } from "vitest";
import { FindRuleIdsEndpoint } from "#policy/api/read/findRuleIds.js";
import { FilterScopeMatch } from "#policy/rulesStorage.js";
import type { AccessRulesStorage } from "#policy/rulesStorage.js";
import { loggerMockedInstance } from "../../testLogger.js";

describe("FindRuleIdsEndpoint", () => {
	const mockLogger = loggerMockedInstance;

	it("should return success with unique rule IDs", async () => {
		const mockStorage: AccessRulesStorage = {
			fetchRules: vi.fn(),
			getMissingRuleIds: vi.fn(),
			findRules: vi.fn(),
			findRuleIds: vi
				.fn()
				.mockResolvedValueOnce(["id1", "id2"])
				.mockResolvedValueOnce(["id2", "id3"]),
			fetchAllRuleIds: vi.fn(),
			insertRules: vi.fn(),
			deleteRules: vi.fn(),
			deleteAllRules: vi.fn(),
		};

		const endpoint = new FindRuleIdsEndpoint(mockStorage, mockLogger);
		const response = await endpoint.processRequest([
			{
				policyScope: { clientId: "client1" },
				policyScopeMatch: FilterScopeMatch.Exact,
			},
			{
				policyScope: { clientId: "client2" },
				policyScopeMatch: FilterScopeMatch.Exact,
			},
		]);

		expect(response.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(response.data?.ruleIds).toEqual(["id1", "id2", "id3"]);
	});

	it("should remove duplicate rule IDs", async () => {
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
			deleteRules: vi.fn(),
			deleteAllRules: vi.fn(),
		};

		const endpoint = new FindRuleIdsEndpoint(mockStorage, mockLogger);
		const response = await endpoint.processRequest([
			{
				policyScope: { clientId: "client1" },
			},
			{
				policyScope: { clientId: "client2" },
			},
		]);

		expect(response.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(response.data?.ruleIds).toEqual(["id1", "id2"]);
	});

	it("should return empty array when no rules are found", async () => {
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

		const endpoint = new FindRuleIdsEndpoint(mockStorage, mockLogger);
		const response = await endpoint.processRequest([
			{
				policyScope: { clientId: "client1" },
			},
		]);

		expect(response.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(response.data?.ruleIds).toEqual([]);
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

		const endpoint = new FindRuleIdsEndpoint(mockStorage, mockLogger);
		const schema = endpoint.getRequestArgsSchema();

		expect(
			schema.parse([
				{
					policyScope: { clientId: "client1" },
				},
			]),
		).toEqual([
			{
				policyScope: { clientId: "client1" },
				policyScopeMatch: FilterScopeMatch.Exact,
				userScopeMatch: FilterScopeMatch.Exact,
			},
		]);
	});

	it("should handle multiple policy scopes in filter input", async () => {
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
			deleteRules: vi.fn(),
			deleteAllRules: vi.fn(),
		};

		const endpoint = new FindRuleIdsEndpoint(mockStorage, mockLogger);
		const response = await endpoint.processRequest([
			{
				policyScopes: [{ clientId: "client1" }, { clientId: "client2" }],
			},
		]);

		expect(response.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(response.data?.ruleIds).toEqual(["id1", "id2"]);
	});

	it("should log information when finding rules", async () => {
		const mockStorage: AccessRulesStorage = {
			fetchRules: vi.fn(),
			getMissingRuleIds: vi.fn(),
			findRules: vi.fn(),
			findRuleIds: vi.fn().mockResolvedValue(["id1"]),
			fetchAllRuleIds: vi.fn(),
			insertRules: vi.fn(),
			deleteRules: vi.fn(),
			deleteAllRules: vi.fn(),
		};

		const logger = getLogger(LogLevel.enum.info, "test");
		const infoSpy = vi.spyOn(logger, "info");

		const endpoint = new FindRuleIdsEndpoint(mockStorage, logger);
		await endpoint.processRequest([
			{
				policyScope: { clientId: "client1" },
			},
		]);

		expect(infoSpy).toHaveBeenCalled();
	});
});
