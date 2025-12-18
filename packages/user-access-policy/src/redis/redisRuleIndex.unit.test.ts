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

import { describe, expect, it } from "vitest";
import {
	ACCESS_RULE_REDIS_KEY_PREFIX,
	getAccessRuleRedisKey,
} from "#policy/redis/redisRuleIndex.js";
import { AccessPolicyType, type AccessRule } from "#policy/rule.js";

describe("getAccessRuleRedisKey", () => {
	it("should generate redis key with correct prefix", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Block,
		};

		const key = getAccessRuleRedisKey(rule);

		expect(key).toMatch(/^uar:/);
		expect(key.startsWith(ACCESS_RULE_REDIS_KEY_PREFIX)).toBe(true);
	});

	it("should generate consistent keys for identical rules", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Block,
			clientId: "client1",
		};

		const key1 = getAccessRuleRedisKey(rule);
		const key2 = getAccessRuleRedisKey(rule);

		expect(key1).toBe(key2);
	});

	it("should generate different keys for different rules", () => {
		const rule1: AccessRule = {
			type: AccessPolicyType.Block,
			clientId: "client1",
		};

		const rule2: AccessRule = {
			type: AccessPolicyType.Block,
			clientId: "client2",
		};

		const key1 = getAccessRuleRedisKey(rule1);
		const key2 = getAccessRuleRedisKey(rule2);

		expect(key1).not.toBe(key2);
	});

	it("should generate keys for rules with user scope", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Restrict,
			userId: "user123",
			ja4Hash: "hash123",
		};

		const key = getAccessRuleRedisKey(rule);

		expect(key).toMatch(/^uar:/);
		expect(key.length).toBeGreaterThan(ACCESS_RULE_REDIS_KEY_PREFIX.length);
	});

	it("should generate keys for rules with numeric IP fields", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Block,
			numericIp: BigInt("167772160"),
		};

		const key = getAccessRuleRedisKey(rule);

		expect(key).toMatch(/^uar:/);
		expect(key.length).toBeGreaterThan(ACCESS_RULE_REDIS_KEY_PREFIX.length);
	});

	it("should handle rule with all possible fields", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Restrict,
			captchaType: "image",
			description: "Test rule",
			solvedImagesCount: 3,
			imageThreshold: 0.75,
			powDifficulty: 100000,
			unsolvedImagesCount: 6,
			frictionlessScore: 0.9,
			clientId: "client1",
			userId: "user1",
			ja4Hash: "ja4hash",
			headersHash: "headershash",
			userAgentHash: "uahash",
			headHash: "headhash",
			coords: "[[[100,200]]]",
			numericIp: BigInt("167772160"),
			numericIpMaskMin: BigInt("167772160"),
			numericIpMaskMax: BigInt("167772415"),
			groupId: "group1",
		};

		const key = getAccessRuleRedisKey(rule);

		expect(key).toMatch(/^uar:/);
		expect(key.length).toBeGreaterThan(ACCESS_RULE_REDIS_KEY_PREFIX.length);
	});

	it("should generate different keys when field order changes", () => {
		// Rules with same fields but different order should still generate same key
		const rule1: AccessRule = {
			type: AccessPolicyType.Block,
			clientId: "client1",
			userId: "user1",
		};

		const rule2: AccessRule = {
			userId: "user1",
			clientId: "client1",
			type: AccessPolicyType.Block,
		};

		const key1 = getAccessRuleRedisKey(rule1);
		const key2 = getAccessRuleRedisKey(rule2);

		// Keys should be the same since the hash should normalize field order
		expect(key1).toBe(key2);
	});

	it("should generate keys for minimal rule with only type", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Block,
		};

		const key = getAccessRuleRedisKey(rule);

		expect(key).toMatch(/^uar:/);
		expect(key.length).toBeGreaterThan(ACCESS_RULE_REDIS_KEY_PREFIX.length);
	});
});
