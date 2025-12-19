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
import { RehashRulesEndpoint } from "#policy/api/write/rehashRules.js";
import { AccessPolicyType } from "#policy/rule.js";
import type {
	AccessRuleEntry,
	AccessRulesStorage,
} from "#policy/rulesStorage.js";
import { loggerMockedInstance } from "../../testLogger.js";

describe("RehashRulesEndpoint", () => {
	const mockLogger = loggerMockedInstance;

	it("should return success after rehashing rules", async () => {
		const mockRuleEntries: AccessRuleEntry[] = [
			{
				rule: {
					type: AccessPolicyType.Block,
					clientId: "client1",
				},
			},
		];

		const mockStorage: AccessRulesStorage = {
			fetchAllRuleIds: vi.fn().mockImplementation(async (handler) => {
				await handler(["id1"]);
			}),
			fetchRules: vi.fn().mockResolvedValue(mockRuleEntries),
			getMissingRuleIds: vi.fn(),
			findRules: vi.fn(),
			findRuleIds: vi.fn(),
			insertRules: vi.fn().mockResolvedValue(["id1"]),
			deleteRules: vi.fn().mockResolvedValue(undefined),
			deleteAllRules: vi.fn(),
		};

		const endpoint = new RehashRulesEndpoint(mockStorage, mockLogger);
		const response = await endpoint.processRequest();

		expect(response.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(mockStorage.fetchAllRuleIds).toHaveBeenCalled();
		expect(mockStorage.fetchRules).toHaveBeenCalledWith(["id1"]);
		expect(mockStorage.deleteRules).toHaveBeenCalledWith(["id1"]);
		expect(mockStorage.insertRules).toHaveBeenCalledWith(mockRuleEntries);
	});

	it("should handle multiple batches of rule IDs", async () => {
		const mockRuleEntries1: AccessRuleEntry[] = [
			{
				rule: {
					type: AccessPolicyType.Block,
					clientId: "client1",
				},
			},
		];
		const mockRuleEntries2: AccessRuleEntry[] = [
			{
				rule: {
					type: AccessPolicyType.Restrict,
					clientId: "client2",
				},
			},
		];

		const mockStorage: AccessRulesStorage = {
			fetchAllRuleIds: vi.fn().mockImplementation(async (handler) => {
				await handler(["id1"]);
				await handler(["id2"]);
			}),
			fetchRules: vi
				.fn()
				.mockResolvedValueOnce(mockRuleEntries1)
				.mockResolvedValueOnce(mockRuleEntries2),
			getMissingRuleIds: vi.fn(),
			findRules: vi.fn(),
			findRuleIds: vi.fn(),
			insertRules: vi
				.fn()
				.mockResolvedValueOnce(["id1"])
				.mockResolvedValueOnce(["id2"]),
			deleteRules: vi.fn().mockResolvedValue(undefined),
			deleteAllRules: vi.fn(),
		};

		const endpoint = new RehashRulesEndpoint(mockStorage, mockLogger);
		const response = await endpoint.processRequest();

		expect(response.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(mockStorage.fetchRules).toHaveBeenCalledTimes(2);
		expect(mockStorage.deleteRules).toHaveBeenCalledTimes(2);
		expect(mockStorage.insertRules).toHaveBeenCalledTimes(2);
	});

	it("should log warning when fetched rules count doesn't match requested count", async () => {
		const mockStorage: AccessRulesStorage = {
			fetchAllRuleIds: vi.fn().mockImplementation(async (handler) => {
				await handler(["id1", "id2"]);
			}),
			fetchRules: vi.fn().mockResolvedValue([
				{
					rule: {
						type: AccessPolicyType.Block,
					},
				},
			]),
			getMissingRuleIds: vi.fn(),
			findRules: vi.fn(),
			findRuleIds: vi.fn(),
			insertRules: vi.fn().mockResolvedValue(["id1"]),
			deleteRules: vi.fn().mockResolvedValue(undefined),
			deleteAllRules: vi.fn(),
		};

		const logger = getLogger(LogLevel.enum.info, "test");
		const warnSpy = vi.spyOn(logger, "warn");

		const endpoint = new RehashRulesEndpoint(mockStorage, logger);
		await endpoint.processRequest();

		expect(warnSpy).toHaveBeenCalled();
	});

	it("should validate request schema correctly", () => {
		const mockStorage: AccessRulesStorage = {
			fetchAllRuleIds: vi.fn(),
			fetchRules: vi.fn(),
			getMissingRuleIds: vi.fn(),
			findRules: vi.fn(),
			findRuleIds: vi.fn(),
			insertRules: vi.fn(),
			deleteRules: vi.fn(),
			deleteAllRules: vi.fn(),
		};

		const endpoint = new RehashRulesEndpoint(mockStorage, mockLogger);
		const schema = endpoint.getRequestArgsSchema();

		expect(schema).toBeUndefined();
	});

	it("should log information during rehashing process", async () => {
		const mockRuleEntries: AccessRuleEntry[] = [
			{
				rule: {
					type: AccessPolicyType.Block,
				},
			},
		];

		const mockStorage: AccessRulesStorage = {
			fetchAllRuleIds: vi.fn().mockImplementation(async (handler) => {
				await handler(["id1"]);
			}),
			fetchRules: vi.fn().mockResolvedValue(mockRuleEntries),
			getMissingRuleIds: vi.fn(),
			findRules: vi.fn(),
			findRuleIds: vi.fn(),
			insertRules: vi.fn().mockResolvedValue(["id1"]),
			deleteRules: vi.fn().mockResolvedValue(undefined),
			deleteAllRules: vi.fn(),
		};

		const logger = getLogger(LogLevel.enum.info, "test");
		const infoSpy = vi.spyOn(logger, "info");

		const endpoint = new RehashRulesEndpoint(mockStorage, logger);
		await endpoint.processRequest();

		expect(infoSpy).toHaveBeenCalledTimes(4); // batch, fetched, deleted, inserted
	});
});
