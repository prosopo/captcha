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

import { describe, expect, it, test } from "vitest";
import { AccessPolicyType } from "#policy/rule.js";
import {
	accessRuleInput,
	transformAccessRuleIntoRecord,
	transformAccessRuleRecordIntoRule,
} from "#policy/ruleInput.js";
import type { AccessRuleRecord } from "#policy/ruleRecord.js";

describe("accessRuleInput", () => {
	test("turns ip into numericIp", () => {
		const userScope = accessRuleInput.parse({
			ip: "127.0.0.1",
			numericIp: "123",
		});

		expect(userScope).toEqual({
			numericIp: BigInt(2130706433),
		});
	});

	test("turns ipMask into numericIpMask", () => {
		const userScope = accessRuleInput.parse({
			ipMask: "127.0.0.1/24",
			numericIpMaskMin: 1,
			numericIpMaskMax: 2,
		});

		expect(userScope).toEqual({
			numericIpMaskMin: BigInt(2130706432),
			numericIpMaskMax: BigInt(2130706687),
		});
	});
});

describe("transformAccessRuleRecordIntoRule", () => {
	it("should transform record fields", () => {
		const accessRule = transformAccessRuleRecordIntoRule({
			type: AccessPolicyType.Restrict,
			ip: "127.0.0.1",
			userAgent: "test",
			unwantedProperty: "bloatware",
		} as unknown as AccessRuleRecord);

		expect(accessRule).toEqual({
			type: AccessPolicyType.Restrict,
			numericIp: BigInt(2130706433),
			userAgentHash:
				"9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
		});
	});

	it("should throw an error for the wrong input", () => {
		expect(() =>
			// required "type" property is skipped
			transformAccessRuleRecordIntoRule({
				ip: "127.0.0.1",
				userAgent: "test",
			} as unknown as AccessRuleRecord),
		).toThrow();
	});
});

describe("transformAccessRuleIntoRecord", () => {
	// fixme
	it("should transform record fields", () => {
		const accessRuleRecord = transformAccessRuleIntoRecord({
			type: AccessPolicyType.Restrict,
			ip: "127.0.0.1",
			userAgent: "test",
			unwantedProperty: "bloatware",
		} as unknown as AccessRuleRecord);

		expect(accessRuleRecord).toEqual({
			type: AccessPolicyType.Restrict,
			numericIp: BigInt(2130706433),
			userAgentHash:
				"9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
		});
	});

	it("should throw an error for the wrong input", () => {
		expect(() =>
			// required "type" property is skipped
			transformAccessRuleRecordIntoRule({
				ip: "127.0.0.1",
				userAgent: "test",
			} as unknown as AccessRuleRecord),
		).toThrow();
	});
});
