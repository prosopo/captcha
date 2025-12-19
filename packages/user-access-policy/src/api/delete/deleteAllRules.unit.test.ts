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
import { DeleteAllRulesEndpoint } from "#policy/api/delete/deleteAllRules.js";
import type { AccessRulesStorage } from "#policy/rulesStorage.js";
import { loggerMockedInstance } from "../../testLogger.js";

describe("DeleteAllRulesEndpoint", () => {
	const mockLogger = loggerMockedInstance;

	it("should return success with deleted count", async () => {
		const mockStorage: AccessRulesStorage = {
			fetchRules: vi.fn(),
			getMissingRuleIds: vi.fn(),
			findRules: vi.fn(),
			findRuleIds: vi.fn(),
			fetchAllRuleIds: vi.fn(),
			insertRules: vi.fn(),
			deleteRules: vi.fn(),
			deleteAllRules: vi.fn().mockResolvedValue(5),
		};

		const endpoint = new DeleteAllRulesEndpoint(mockStorage, mockLogger);
		const response = await endpoint.processRequest();

		expect(response.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(response.data?.deleted_count).toBe(5);
		expect(mockStorage.deleteAllRules).toHaveBeenCalled();
	});

	it("should return zero when no rules exist", async () => {
		const mockStorage: AccessRulesStorage = {
			fetchRules: vi.fn(),
			getMissingRuleIds: vi.fn(),
			findRules: vi.fn(),
			findRuleIds: vi.fn(),
			fetchAllRuleIds: vi.fn(),
			insertRules: vi.fn(),
			deleteRules: vi.fn(),
			deleteAllRules: vi.fn().mockResolvedValue(0),
		};

		const endpoint = new DeleteAllRulesEndpoint(mockStorage, mockLogger);
		const response = await endpoint.processRequest();

		expect(response.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(response.data?.deleted_count).toBe(0);
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

		const endpoint = new DeleteAllRulesEndpoint(mockStorage, mockLogger);
		const schema = endpoint.getRequestArgsSchema();

		expect(schema).toBeUndefined();
	});

	it("should log information when deleting all rules", async () => {
		const mockStorage: AccessRulesStorage = {
			fetchRules: vi.fn(),
			getMissingRuleIds: vi.fn(),
			findRules: vi.fn(),
			findRuleIds: vi.fn(),
			fetchAllRuleIds: vi.fn(),
			insertRules: vi.fn(),
			deleteRules: vi.fn(),
			deleteAllRules: vi.fn().mockResolvedValue(10),
		};

		const logger = getLogger(LogLevel.enum.info, "test");
		const infoSpy = vi.spyOn(logger, "info");

		const endpoint = new DeleteAllRulesEndpoint(mockStorage, logger);
		await endpoint.processRequest();

		expect(infoSpy).toHaveBeenCalled();
	});
});
