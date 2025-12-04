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

import { LogLevel, getLogger } from "@prosopo/common";
import { describe, expect, it, vi } from "vitest";
import { DummyRedisRulesReader } from "#policy/redis/reader/redisRulesReader.js";
import { FilterScopeMatch } from "#policy/rulesStorage.js";

describe("DummyRedisRulesReader", () => {
	const logger = getLogger(LogLevel.enum.info, "test");

	it("should return empty array for getMissingRuleIds", async () => {
		const reader = new DummyRedisRulesReader(logger);
		const infoSpy = vi.spyOn(logger, "info");

		const result = await reader.getMissingRuleIds(["id1", "id2"]);

		expect(result).toEqual([]);
		expect(infoSpy).toHaveBeenCalled();
	});

	it("should return empty array for fetchRules", async () => {
		const reader = new DummyRedisRulesReader(logger);
		const infoSpy = vi.spyOn(logger, "info");

		const result = await reader.fetchRules(["id1", "id2"]);

		expect(result).toEqual([]);
		expect(infoSpy).toHaveBeenCalled();
	});

	it("should return empty array for findRules", async () => {
		const reader = new DummyRedisRulesReader(logger);
		const infoSpy = vi.spyOn(logger, "info");

		const result = await reader.findRules({
			policyScope: { clientId: "client1" },
			policyScopeMatch: FilterScopeMatch.Exact,
		});

		expect(result).toEqual([]);
		expect(infoSpy).toHaveBeenCalled();
	});

	it("should return empty array for findRuleIds", async () => {
		const reader = new DummyRedisRulesReader(logger);
		const infoSpy = vi.spyOn(logger, "info");

		const result = await reader.findRuleIds({
			policyScope: { clientId: "client1" },
			policyScopeMatch: FilterScopeMatch.Exact,
		});

		expect(result).toEqual([]);
		expect(infoSpy).toHaveBeenCalled();
	});

	it("should complete fetchAllRuleIds without error", async () => {
		const reader = new DummyRedisRulesReader(logger);
		const infoSpy = vi.spyOn(logger, "info");
		const batchHandler = vi.fn().mockResolvedValue(undefined);

		await reader.fetchAllRuleIds(batchHandler);

		expect(batchHandler).not.toHaveBeenCalled();
		expect(infoSpy).toHaveBeenCalled();
	});
});

