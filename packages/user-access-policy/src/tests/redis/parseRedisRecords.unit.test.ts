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

import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseRedisRecords } from "#policy/redis/redisClient.js";
import { AccessPolicyType, type AccessRule } from "#policy/rule.js";
import { accessRuleInput } from "#policy/ruleInput/ruleInput.js";
import { loggerMockedInstance } from "../testLogger.js";

const goodRecord: Record<string, string> = {
	type: AccessPolicyType.Block,
	clientId: "a",
};

describe("parseRedisRecords", () => {
	it.each([
		["an invalid ip", { type: AccessPolicyType.Block, ip: "999.1.1.1" }],
		[
			"an invalid ip mask",
			{ type: AccessPolicyType.Block, ipMask: "1.2.3.4/99" },
		],
		["a non-numeric ip", { type: AccessPolicyType.Block, numericIp: "abc" }],
	])("skips a record with %s and keeps the others", (_label, badRecord) => {
		const rules: AccessRule[] = parseRedisRecords(
			[goodRecord, badRecord, goodRecord],
			accessRuleInput,
			loggerMockedInstance,
		);

		expect(rules).toHaveLength(2);
		expect(rules.every((rule) => rule.clientId === "a")).toBe(true);
	});

	it("skips a record whose schema throws while parsing", () => {
		const throwingSchema = z.string().transform((value: string): string => {
			if ("bad" === value) {
				throw new Error("transform failed");
			}
			return value;
		});

		const values: string[] = parseRedisRecords(
			["one", "bad", "two"],
			throwingSchema,
			loggerMockedInstance,
		);

		expect(values).toEqual(["one", "two"]);
	});
});

describe("accessRuleInput", () => {
	it("reports an invalid ip as a validation issue rather than throwing", () => {
		const result = accessRuleInput.safeParse({
			type: AccessPolicyType.Block,
			ip: "999.1.1.1",
		});

		expect(result.success).toBe(false);
	});

	it("still converts a valid ip and ip mask", () => {
		const result = accessRuleInput.safeParse({
			type: AccessPolicyType.Block,
			ip: "1.2.3.4",
			ipMask: "10.0.0.0/8",
		});

		expect(result.success).toBe(true);
		expect(result.data?.numericIp).toBe(16909060n);
		expect(result.data?.numericIpMaskMin).toBe(167772160n);
		expect(result.data?.numericIpMaskMax).toBe(184549375n);
	});
});
