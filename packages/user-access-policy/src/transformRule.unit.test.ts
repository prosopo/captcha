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
import { Address4 } from "ip-address";
import { describe, expect, it } from "vitest";
import { AccessPolicyType, type AccessRule } from "#policy/rule.js";
import type { AccessRuleRecord } from "#policy/ruleRecord.js";
import {
	getCidrFromNumericIpRange,
	makeAccessRuleHash,
	transformAccessRuleIntoRecord,
	transformAccessRuleRecordIntoRule,
} from "#policy/transformRule.js";

describe("makeAccessRuleHash", () => {
	it("should make md5 rule hash", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Restrict,
		};

		const hash = makeAccessRuleHash(rule);

		expect(hash).toEqual("755f7123e8f766b6692218b1014b85ca");
	});

	it("should handle bigint rule properties", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Restrict,
			numericIp: 100n,
		};

		const hash = makeAccessRuleHash(rule);

		expect(hash).toEqual("ab3fea02b8ef3309fb3fa6f6f703c55a");
	});

	it("should make same hash for same values regardless of properties order", () => {
		const rule1: AccessRule = {
			type: AccessPolicyType.Restrict,
			description: "description",
		};
		const rule2: AccessRule = {
			description: "description",
			type: AccessPolicyType.Restrict,
		};

		const hash1 = makeAccessRuleHash(rule1);
		const hash2 = makeAccessRuleHash(rule2);

		expect(hash1).toEqual("5ed2f7de7ba1c6acc617f9246f19d35b");

		expect(hash1).toEqual(hash2);
	});

	it("should make same hash for 'undefined' and missing properties", () => {
		const rule1: AccessRule = {
			type: AccessPolicyType.Restrict,
			description: undefined,
		};
		const rule2: AccessRule = {
			type: AccessPolicyType.Restrict,
		};

		const hash1 = makeAccessRuleHash(rule1);
		const hash2 = makeAccessRuleHash(rule2);

		expect(hash1).toEqual("755f7123e8f766b6692218b1014b85ca");

		expect(hash1).toEqual(hash2);
	});

	it("should handle empty rule with only type", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Block,
		};

		const hash = makeAccessRuleHash(rule);

		expect(hash).toBeTypeOf("string");
		expect(hash.length).toBe(32);
	});

	it("should handle rule with all optional properties", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Restrict,
			captchaType: CaptchaType.frictionless,
			description: "test description",
			solvedImagesCount: 5,
			imageThreshold: 0.8,
			powDifficulty: 10,
			unsolvedImagesCount: 3,
			frictionlessScore: 0.9,
			clientId: "client123",
			userId: "user456",
			ja4Hash: "ja4hash123",
			headersHash: "headershash456",
			userAgentHash: "useragenthash789",
			headHash: "headhash012",
			coords: "[[[100,200]]]",
			numericIp: 2130706432n,
			numericIpMaskMin: 2130706432n,
			numericIpMaskMax: 2130710527n,
			groupId: "group789",
		};

		const hash = makeAccessRuleHash(rule);

		expect(hash).toBeTypeOf("string");
		expect(hash.length).toBe(32);
	});

	it("should produce different hashes for different rules", () => {
		const rule1: AccessRule = {
			type: AccessPolicyType.Block,
			description: "rule1",
		};
		const rule2: AccessRule = {
			type: AccessPolicyType.Block,
			description: "rule2",
		};

		const hash1 = makeAccessRuleHash(rule1);
		const hash2 = makeAccessRuleHash(rule2);

		expect(hash1).not.toEqual(hash2);
	});

	it("should handle numeric values correctly in hash", () => {
		const rule1: AccessRule = {
			type: AccessPolicyType.Restrict,
			solvedImagesCount: 5,
		};
		const rule2: AccessRule = {
			type: AccessPolicyType.Restrict,
			solvedImagesCount: 10,
		};

		const hash1 = makeAccessRuleHash(rule1);
		const hash2 = makeAccessRuleHash(rule2);

		expect(hash1).not.toEqual(hash2);
	});
});

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
		headHash: "headHash",
		coords: "[[1,2]]",
	} satisfies AccessRule;

	it("should transform access rule record into rule", () => {
		const ruleRecord: Required<AccessRuleRecord> = {
			...commonProperties,
			ruleGroupId: "ruleGroupId",
			ipMask: "127.0.0.0/20",
			ip: "127.0.0.0",
			userAgent: "test",
		};

		const accessRule = transformAccessRuleRecordIntoRule({
			...ruleRecord,
			unwantedProperty: "bloatware",
		} as unknown as AccessRuleRecord);

		expect(accessRule).toEqual({
			...commonProperties,
			groupId: "ruleGroupId",
			numericIp: 2130706432n,
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
			numericIp: 2130706432n,
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
			ipMask: "127.0.0.0/20",
			ip: "127.0.0.0",
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

	it("should transform rule with only groupId", () => {
		const accessRule: AccessRule = {
			type: AccessPolicyType.Block,
			groupId: "test-group",
		};

		const record = transformAccessRuleIntoRecord(accessRule);

		expect(record.ruleGroupId).toBe("test-group");
		expect(record.type).toBe(AccessPolicyType.Block);
	});

	it("should transform rule with only numericIp", () => {
		const accessRule: AccessRule = {
			type: AccessPolicyType.Block,
			numericIp: 2130706432n,
		};

		const record = transformAccessRuleIntoRecord(accessRule);

		expect(record.ip).toBe("127.0.0.0");
		expect(record.type).toBe(AccessPolicyType.Block);
	});

	it("should transform rule with only userAgentHash", () => {
		const accessRule: AccessRule = {
			type: AccessPolicyType.Block,
			userAgentHash: "test-hash",
		};

		const record = transformAccessRuleIntoRecord(accessRule);

		expect(record.userAgent).toBe("test-hash");
		expect(record.type).toBe(AccessPolicyType.Block);
	});

	it("should transform rule with ipMask range", () => {
		const accessRule: AccessRule = {
			type: AccessPolicyType.Block,
			numericIpMaskMin: 2130706432n,
			numericIpMaskMax: 2130710527n,
		};

		const record = transformAccessRuleIntoRecord(accessRule);

		expect(record.ipMask).toBe("127.0.0.0/20");
		expect(record.type).toBe(AccessPolicyType.Block);
	});

	it("should not include undefined fields in record", () => {
		const accessRule: AccessRule = {
			type: AccessPolicyType.Block,
		};

		const record = transformAccessRuleIntoRecord(accessRule);

		expect(record.ruleGroupId).toBeUndefined();
		expect(record.ip).toBeUndefined();
		expect(record.ipMask).toBeUndefined();
		expect(record.userAgent).toBeUndefined();
	});

	it("should transform record with only ruleGroupId", () => {
		const ruleRecord: AccessRuleRecord = {
			type: AccessPolicyType.Block,
			ruleGroupId: "test-group",
		};

		const rule = transformAccessRuleRecordIntoRule(ruleRecord);

		expect(rule.groupId).toBe("test-group");
		expect(rule.type).toBe(AccessPolicyType.Block);
	});

	it("should transform record with only ip", () => {
		const ruleRecord: AccessRuleRecord = {
			type: AccessPolicyType.Block,
			ip: "127.0.0.0",
		};

		const rule = transformAccessRuleRecordIntoRule(ruleRecord);

		expect(rule.numericIp).toBe(2130706432n);
		expect(rule.type).toBe(AccessPolicyType.Block);
	});

	it("should transform record with only userAgent", () => {
		const ruleRecord: AccessRuleRecord = {
			type: AccessPolicyType.Block,
			userAgent: "test-agent",
		};

		const rule = transformAccessRuleRecordIntoRule(ruleRecord);

		expect(rule.userAgentHash).toBeDefined();
		expect(rule.type).toBe(AccessPolicyType.Block);
	});

	it("should transform record with ipMask", () => {
		const ruleRecord: AccessRuleRecord = {
			type: AccessPolicyType.Block,
			ipMask: "127.0.0.0/20",
		};

		const rule = transformAccessRuleRecordIntoRule(ruleRecord);

		expect(rule.numericIpMaskMin).toBeDefined();
		expect(rule.numericIpMaskMax).toBeDefined();
		expect(rule.type).toBe(AccessPolicyType.Block);
	});
});

describe("getCidrFromNumericIpRange", () => {
	type CirdExample = {
		cidr: string;
		startIp: string;
		endIp: string;
		description: string;
	};

	const cirdsSet: CirdExample[] = [
		{
			cidr: "127.0.0.0/20",
			startIp: "127.0.0.0",
			endIp: "127.0.15.255",
			description: "/20 network - 4096 addresses",
		},
		{
			cidr: "192.168.1.0/24",
			startIp: "192.168.1.0",
			endIp: "192.168.1.255",
			description: "/24 network - 256 addresses (Class C)",
		},
		{
			cidr: "10.0.0.0/8",
			startIp: "10.0.0.0",
			endIp: "10.255.255.255",
			description: "/8 network - 16M addresses (Class A)",
		},
		{
			cidr: "172.16.0.0/12",
			startIp: "172.16.0.0",
			endIp: "172.31.255.255",
			description: "/12 network - 1M addresses",
		},
		{
			cidr: "192.168.0.0/16",
			startIp: "192.168.0.0",
			endIp: "192.168.255.255",
			description: "/16 network - 65536 addresses (Class B)",
		},
		{
			cidr: "192.168.1.128/25",
			startIp: "192.168.1.128",
			endIp: "192.168.1.255",
			description: "/25 network - 128 addresses (subnet)",
		},
		{
			cidr: "10.20.30.0/28",
			startIp: "10.20.30.0",
			endIp: "10.20.30.15",
			description: "/28 network - 16 addresses (small subnet)",
		},
		{
			cidr: "8.8.8.8/32",
			startIp: "8.8.8.8",
			endIp: "8.8.8.8",
			description: "/32 network - single IP address",
		},
		{
			cidr: "203.0.113.0/30",
			startIp: "203.0.113.0",
			endIp: "203.0.113.3",
			description: "/30 network - 4 addresses (point-to-point)",
		},
		{
			cidr: "198.51.100.64/26",
			startIp: "198.51.100.64",
			endIp: "198.51.100.127",
			description: "/26 network - 64 addresses",
		},
	];

	it.each(cirdsSet)("should convert $description to $cidr", (cirdExample) => {
		const cird = getCidrFromNumericIpRange(
			new Address4(cirdExample.startIp).bigInt(),
			new Address4(cirdExample.endIp).bigInt(),
		);

		expect(cird).toEqual(cirdExample.cidr);
	});

	it("should return undefined for invalid IP range", () => {
		const startIp = new Address4("192.168.1.10").bigInt();
		const endIp = new Address4("192.168.1.5").bigInt();

		const cidr = getCidrFromNumericIpRange(startIp, endIp);

		expect(cidr).toBeUndefined();
	});

	it("should handle single IP address range", () => {
		const ip = new Address4("192.168.1.1").bigInt();

		const cidr = getCidrFromNumericIpRange(ip, ip);

		expect(cidr).toBe("192.168.1.1/32");
	});

	it("should handle non-CIDR aligned ranges", () => {
		const startIp = new Address4("192.168.1.5").bigInt();
		const endIp = new Address4("192.168.1.10").bigInt();

		const cidr = getCidrFromNumericIpRange(startIp, endIp);

		expect(cidr).toBeDefined();
		expect(cidr).toBeTypeOf("string");
	});
});
