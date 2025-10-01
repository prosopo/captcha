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

import { CaptchaType } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import { AccessPolicyType, type AccessRule } from "#policy/rule.js";
import {
	transformAccessRuleIntoRecord,
	transformAccessRuleRecordIntoRule,
} from "#policy/ruleInput.js";
import type { AccessRuleRecord } from "#policy/ruleRecord.js";

describe("transformRule", () => {
	const commonProperties = {
		type: AccessPolicyType.Restrict,
		captchaType: CaptchaType.frictionless,
		description: "test",
		solvedImagesCount: 1,
		imageThreshold: 1,
		powDifficulty: 1,
		unsolvedImagesCount: 1,
		frictionlessScore: 1,
		headersHash: "headersHash",
		ja4Hash: "js4Hash",
		clientId: "client",
		userId: "user",
	} satisfies AccessRule;

	it("should transform access rule record into rule", () => {
		const ruleRecord: Required<AccessRuleRecord> = {
			...commonProperties,
			ruleGroupId: "ruleGroupId",
			ipMask: "127.0.0.1/20",
			ip: "127.0.0.1",
			userAgent: "test",
		};

		const accessRule = transformAccessRuleRecordIntoRule({
			...ruleRecord,
			unwantedProperty: "bloatware",
		} as unknown as AccessRuleRecord);

		expect(accessRule).toEqual({
			...commonProperties,
			groupId: "ruleGroupId",
			numericIp: 2130706433n,
			numericIpMaskMax: 2130710527n,
			numericIpMaskMin: 2130706432n,
			userAgentHash:
				"9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
		});
	});

	it("should transform access rule into record", () => {
		const accessRule: Required<AccessRule> = {
			...commonProperties,
			groupId: "ruleGroupId",
			numericIp: 2130706433n,
			numericIpMaskMax: 2130710527n,
			numericIpMaskMin: 2130706432n,
			userAgentHash:
				"9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
		};

		const accessRuleRecord = transformAccessRuleIntoRecord({
			...accessRule,
			unwantedProperty: "bloatware",
		} as unknown as AccessRule);

		expect(accessRuleRecord).toEqual({
			...commonProperties,
			ruleGroupId: "ruleGroupId",
			ipMask: "127.0.0.1/20",
			ip: "127.0.0.1",
			userAgent:
				"9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
		});
	});

	it("should throw error if cannot transform access rule record into rule", () => {
		expect(() =>
			// required "type" property is skipped
			transformAccessRuleRecordIntoRule({
				ip: "127.0.0.1",
				userAgent: "test",
			} as unknown as AccessRuleRecord),
		).toThrow();
	});

	it("should throw error if cannot transform access rule into record", () => {
		expect(() =>
			// required "type" property is skipped
			transformAccessRuleIntoRecord({
				ip: "127.0.0.1",
				userAgent: "test",
			} as unknown as AccessRule),
		).toThrow();
	});
});
