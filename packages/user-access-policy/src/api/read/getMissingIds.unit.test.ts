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
import { GetMissingIdsEndpoint } from "#policy/api/read/getMissingIds.js";
import type { AccessRulesStorage } from "#policy/rulesStorage.js";
import { loggerMockedInstance } from "../../testLogger.js";

describe("GetMissingIdsEndpoint", () => {
	const mockLogger = loggerMockedInstance;

	it("should return success with missing IDs", async () => {
		const mockStorage: AccessRulesStorage = {
			fetchRules: vi.fn(),
			getMissingRuleIds: vi.fn().mockResolvedValue(["id2", "id4"]),
			findRules: vi.fn(),
			findRuleIds: vi.fn(),
			fetchAllRuleIds: vi.fn(),
			insertRules: vi.fn(),
			deleteRules: vi.fn(),
			deleteAllRules: vi.fn(),
		};

		const endpoint = new GetMissingIdsEndpoint(mockStorage, mockLogger);
		const response = await endpoint.processRequest([
			"id1",
			"id2",
			"id3",
			"id4",
		]);

		expect(response.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(response.data?.ids).toEqual(["id2", "id4"]);
		expect(mockStorage.getMissingRuleIds).toHaveBeenCalledWith([
			"id1",
			"id2",
			"id3",
			"id4",
		]);
	});

	it("should return empty array when all IDs exist", async () => {
		const mockStorage: AccessRulesStorage = {
			fetchRules: vi.fn(),
			getMissingRuleIds: vi.fn().mockResolvedValue([]),
			findRules: vi.fn(),
			findRuleIds: vi.fn(),
			fetchAllRuleIds: vi.fn(),
			insertRules: vi.fn(),
			deleteRules: vi.fn(),
			deleteAllRules: vi.fn(),
		};

		const endpoint = new GetMissingIdsEndpoint(mockStorage, mockLogger);
		const response = await endpoint.processRequest(["id1", "id2"]);

		expect(response.status).toBe(ApiEndpointResponseStatus.SUCCESS);
		expect(response.data?.ids).toEqual([]);
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

		const endpoint = new GetMissingIdsEndpoint(mockStorage, mockLogger);
		const schema = endpoint.getRequestArgsSchema();

		expect(schema.parse(["id1", "id2"])).toEqual(["id1", "id2"]);
		expect(() => schema.parse("not-an-array")).toThrow();
		expect(() => schema.parse(123)).toThrow();
	});

	it("should log information when checking missing IDs", async () => {
		const mockStorage: AccessRulesStorage = {
			fetchRules: vi.fn(),
			getMissingRuleIds: vi.fn().mockResolvedValue(["id2"]),
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

		const endpoint = new GetMissingIdsEndpoint(mockStorage, logger);
		await endpoint.processRequest(["id1", "id2"]);

		expect(infoSpy).toHaveBeenCalled();
		expect(debugSpy).toHaveBeenCalled();
	});
});
