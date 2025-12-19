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
import {
	DummyRedisRulesWriter,
	getRedisRuleValue,
} from "#policy/redis/redisRulesWriter.js";
import { AccessPolicyType, type AccessRule } from "#policy/rule.js";

describe("DummyRedisRulesWriter", () => {
	const logger = getLogger(LogLevel.enum.info, "test");

	it("should return empty array for insertRules", async () => {
		const writer = new DummyRedisRulesWriter(logger);
		const infoSpy = vi.spyOn(logger, "info");

		const result = await writer.insertRules([
			{
				rule: {
					type: AccessPolicyType.Block,
				},
			},
		]);

		expect(result).toEqual([]);
		expect(infoSpy).toHaveBeenCalled();
	});

	it("should complete deleteRules without error", async () => {
		const writer = new DummyRedisRulesWriter(logger);
		const infoSpy = vi.spyOn(logger, "info");

		await writer.deleteRules(["id1", "id2"]);

		expect(infoSpy).toHaveBeenCalled();
	});

	it("should return zero for deleteAllRules", async () => {
		const writer = new DummyRedisRulesWriter(logger);
		const infoSpy = vi.spyOn(logger, "info");

		const result = await writer.deleteAllRules();

		expect(result).toBe(0);
		expect(infoSpy).toHaveBeenCalled();
	});
});

describe("getRedisRuleValue", () => {
	it("should convert rule to Redis hash value", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Block,
			clientId: "client1",
			numericIp: BigInt(100),
		};

		const value = getRedisRuleValue(rule);

		expect(value).toEqual({
			type: "block",
			clientId: "client1",
			numericIp: "100",
		});
	});

	it("should convert all values to strings", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Restrict,
			solvedImagesCount: 5,
			imageThreshold: 0.8,
			numericIp: BigInt(100),
		};

		const value = getRedisRuleValue(rule);

		expect(value.type).toBe("restrict");
		expect(value.solvedImagesCount).toBe("5");
		expect(value.imageThreshold).toBe("0.8");
		expect(value.numericIp).toBe("100");
	});

	it("should handle undefined values", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Block,
		};

		const value = getRedisRuleValue(rule);

		expect(value).toEqual({
			type: "block",
		});
	});
});
