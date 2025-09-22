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

import { describe, expect, test } from "vitest";
import { AccessPolicyType } from "#policy/accessPolicy.js";
import { transformExtendedRuleIntoAccessRule } from "#policy/accessRules.js";
import {
	type AccessRuleRecord,
	transformAccessRuleRecordIntoRule,
} from "#policy/rules/accessRule.js";

describe("transformAccessRuleRecordIntoRule", () => {
	test("should transform record fields", () => {
		const accessRule = transformExtendedRuleIntoAccessRule({
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

	test("should throw an error for the wrong input", () => {
		expect(() =>
			// required "type" property is skipped
			transformExtendedRuleIntoAccessRule({
				ip: "127.0.0.1",
				userAgent: "test",
			}),
		).toThrow();
	});
});
