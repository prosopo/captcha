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

import { CaptchaType, MatchedAccessRuleSchema } from "@prosopo/types";
import { Address4 } from "ip-address";
import { describe, expect, it } from "vitest";
import { describeMatchedRule } from "#policy/matchedRule.js";
import { AccessPolicyType, type AccessRule } from "#policy/rule.js";
import { userScopeRecordFields } from "#policy/ruleRecord.js";
import { makeAccessRuleHash } from "#policy/transformRule.js";

describe("describeMatchedRule", () => {
	it("carries the policy half of the rule", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Restrict,
			captchaType: CaptchaType.image,
			description: "6 rounds for this ASN",
			deferToVerify: true,
			clientId: "site-key",
			groupId: "group-1",
			ja4Hash: "t13d1516h2_8daaf6152771_b186095e22b6",
		};

		expect(describeMatchedRule(rule)).toEqual({
			ruleHash: makeAccessRuleHash(rule),
			policyType: AccessPolicyType.Restrict,
			captchaType: CaptchaType.image,
			description: "6 rounds for this ASN",
			deferToVerify: true,
			clientId: "site-key",
			// `groupId` on the rule is `ruleGroupId` everywhere else — the
			// portal joins the audit row back to its Access Control entry on
			// this, so the rename has to happen here.
			ruleGroupId: "group-1",
			conditions: [
				{
					field: "ja4Hash",
					value: "t13d1516h2_8daaf6152771_b186095e22b6",
				},
			],
		});
	});

	it("omits policy fields the rule did not set rather than emitting undefined", () => {
		const described = describeMatchedRule({ type: AccessPolicyType.Block });

		expect(described).toEqual({
			ruleHash: makeAccessRuleHash({ type: AccessPolicyType.Block }),
			policyType: AccessPolicyType.Block,
			conditions: [],
		});
		expect(Object.keys(described)).not.toContain("description");
		expect(Object.keys(described)).not.toContain("ruleGroupId");
	});

	it("reports a single IP in the form the operator typed, not the numeric one", () => {
		const { conditions } = describeMatchedRule({
			type: AccessPolicyType.Block,
			numericIp: new Address4("192.0.2.44").bigInt(),
		});

		expect(conditions).toEqual([{ field: "ip", value: "192.0.2.44" }]);
	});

	it("collapses an IP range back to its CIDR", () => {
		const { conditions } = describeMatchedRule({
			type: AccessPolicyType.Block,
			numericIpMaskMin: new Address4("198.51.100.64").bigInt(),
			numericIpMaskMax: new Address4("198.51.100.127").bigInt(),
		});

		expect(conditions).toEqual([
			{ field: "ipMask", value: "198.51.100.64/26" },
		]);
	});

	it("stringifies a numeric asn", () => {
		const { conditions } = describeMatchedRule({
			type: AccessPolicyType.Block,
			asn: 205016,
		});

		expect(conditions).toEqual([{ field: "asn", value: "205016" }]);
	});

	it("reports every populated scope field, in record vocabulary", () => {
		const { conditions } = describeMatchedRule({
			type: AccessPolicyType.Block,
			userId: "user",
			ja4Hash: "ja4",
			headersHash: "headers",
			// Hashed on the rule, but surfaces under the record-side name the
			// portal labels conditions with.
			userAgentHash: "ua",
			headHash: "head",
			coords: "[[1,2]]",
			countryCode: "GB",
			asn: 1,
			os: "macos",
			numericIp: new Address4("203.0.113.5").bigInt(),
		});

		expect(conditions.map((condition) => condition.field)).toEqual([
			"userId",
			"ja4Hash",
			"headersHash",
			"userAgent",
			"headHash",
			"coords",
			"countryCode",
			"asn",
			"os",
			"ip",
		]);
		// Every emitted field is one the portal knows how to label.
		for (const condition of conditions) {
			expect(userScopeRecordFields).toContain(condition.field);
		}
	});

	it("truncates an oversized coords polygon and flags it", () => {
		const coords = JSON.stringify([Array.from({ length: 200 }, () => [1, 2])]);
		const { conditions } = describeMatchedRule({
			type: AccessPolicyType.Block,
			coords,
		});

		const [condition] = conditions;
		expect(condition?.truncated).toBe(true);
		expect(condition?.value.length).toBe(257);
		expect(coords.startsWith(condition?.value.slice(0, -1) ?? "")).toBe(true);
	});

	it("leaves a value at the cap untruncated", () => {
		const coords = "x".repeat(256);
		const { conditions } = describeMatchedRule({
			type: AccessPolicyType.Block,
			coords,
		});

		expect(conditions).toEqual([{ field: "coords", value: coords }]);
	});

	it("still describes a rule whose scope cannot be transformed", () => {
		// An inverted mask range makes the record transform throw. Enforcement
		// must not care: the block still happens, the snapshot just lacks
		// conditions.
		const rule: AccessRule = {
			type: AccessPolicyType.Block,
			description: "unrepresentable range",
			numericIpMaskMin: new Address4("198.51.100.200").bigInt(),
			numericIpMaskMax: new Address4("198.51.100.1").bigInt(),
		};

		expect(() => describeMatchedRule(rule)).not.toThrow();
		expect(describeMatchedRule(rule)).toEqual({
			ruleHash: makeAccessRuleHash(rule),
			policyType: AccessPolicyType.Block,
			description: "unrepresentable range",
			conditions: [],
		});
	});

	it("produces a value the persisted schema accepts", () => {
		const described = describeMatchedRule({
			type: AccessPolicyType.Restrict,
			captchaType: CaptchaType.pow,
			countryCode: "CN",
		});

		expect(MatchedAccessRuleSchema.safeParse(described).success).toBe(true);
	});
});
