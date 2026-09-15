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
import { BYPASS_KEY_HASH_PATTERN, hashBypassKey } from "#policy/bypassKey.js";
import { AccessPolicyType } from "#policy/rule.js";
import { accessRuleInput } from "#policy/ruleInput/ruleInput.js";
import { userScopeInput } from "#policy/ruleInput/userScopeInput.js";

describe("hashBypassKey", () => {
	it("is the lowercase hex SHA-256 of the key", () => {
		expect(hashBypassKey("test")).toBe(
			"9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
		);
	});

	it("produces a value the rule schema accepts", () => {
		expect(hashBypassKey("pbk_anything")).toMatch(BYPASS_KEY_HASH_PATTERN);
	});
});

describe("bypassKeyHash scope field", () => {
	const hash = hashBypassKey("pbk_example");

	it("parses a site-scoped Allow rule carrying a bypass key hash", () => {
		const rule = accessRuleInput.parse({
			type: AccessPolicyType.Allow,
			clientId: "site-key",
			bypassKeyHash: hash,
		});

		expect(rule.type).toBe(AccessPolicyType.Allow);
		expect(rule.clientId).toBe("site-key");
		expect(rule.bypassKeyHash).toBe(hash);
	});

	it.each([
		["a raw key", "pbk_example"],
		["an uppercase hash", hash.toUpperCase()],
		["a truncated hash", hash.slice(0, 63)],
	])("rejects %s", (_label: string, bypassKeyHash: string) => {
		expect(userScopeInput.safeParse({ bypassKeyHash }).success).toBe(false);
	});
});
