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
import { FetchRulesEndpoint } from "#policy/api/read/fetchRules.js";
import { AccessPolicyType } from "#policy/rule.js";
import type {
	AccessRuleEntry,
	AccessRulesStorage,
} from "#policy/rulesStorage.js";
import { loggerMockedInstance } from "../../testLogger.js";

describe("FetchRulesEndpoint", () => {
	const mockLogger = loggerMockedInstance;

	it("should return success with rule entries when rules are found", async () => {
		const mockRuleEntries: AccessRuleEntry[] = [
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
				expiresUnixTimestamp: Date.now() + 3600000,
			},
		];

		const mockStorage: AccessRulesStorage = {
			fetchRules: vi.fn().mockResolvedValue(mockRuleEntries),
			getMissingRuleIds: vi.fn(),
			findRules: vi.fn(),
			findRuleIds: vi.fn(),
			fetchAllRuleIds: vi.fn(),
			insertRules: vi.fn(),
			deleteRules: vi.fn(),
			deleteAllRules: vi.fn(),
		};

		const endpoint = new FetchRulesEndpoint(mockStorage, mockLogger);
		const response = await endpoint.processRequest({ ids: ["id1", "id2"] });

		expect(response.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(response.data?.ruleEntries).toEqual(mockRuleEntries);
		expect(mockStorage.fetchRules).toHaveBeenCalledWith(["id1", "id2"]);
	});

	it("should return success with empty array when no rules are found", async () => {
		const mockStorage: AccessRulesStorage = {
			fetchRules: vi.fn().mockResolvedValue([]),
			getMissingRuleIds: vi.fn(),
			findRules: vi.fn(),
			findRuleIds: vi.fn(),
			fetchAllRuleIds: vi.fn(),
			insertRules: vi.fn(),
			deleteRules: vi.fn(),
			deleteAllRules: vi.fn(),
		};

		const endpoint = new FetchRulesEndpoint(mockStorage, mockLogger);
		const response = await endpoint.processRequest({ ids: ["id1"] });

		expect(response.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(response.data?.ruleEntries).toEqual([]);
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

		const endpoint = new FetchRulesEndpoint(mockStorage, mockLogger);
		const schema = endpoint.getRequestArgsSchema();

		expect(schema.parse({ ids: ["id1", "id2"] })).toEqual({
			ids: ["id1", "id2"],
		});
		expect(() => schema.parse({ ids: "not-an-array" })).toThrow();
		expect(() => schema.parse({})).toThrow();
	});

	it("should log information when fetching rules", async () => {
		const mockRuleEntries: AccessRuleEntry[] = [
			{
				rule: {
					type: AccessPolicyType.Block,
				},
			},
		];

		const mockStorage: AccessRulesStorage = {
			fetchRules: vi.fn().mockResolvedValue(mockRuleEntries),
			getMissingRuleIds: vi.fn(),
			findRules: vi.fn(),
			findRuleIds: vi.fn(),
			fetchAllRuleIds: vi.fn(),
			insertRules: vi.fn(),
			deleteRules: vi.fn(),
			deleteAllRules: vi.fn(),
		};

		const logger = getLogger(LogLevel.enum.info, "test");
		const infoSpy = vi.spyOn(logger, "info");
		const debugSpy = vi.spyOn(logger, "debug");

		const endpoint = new FetchRulesEndpoint(mockStorage, logger);
		await endpoint.processRequest({ ids: ["id1"] });

		expect(infoSpy).toHaveBeenCalled();
		expect(debugSpy).toHaveBeenCalled();
	});
});
