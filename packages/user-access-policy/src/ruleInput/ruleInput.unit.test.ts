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
	accessRuleInput,
	accessRulesFilterInput,
	getAccessRuleFiltersFromInput,
	ruleEntryInput,
} from "#policy/ruleInput/ruleInput.js";
import { AccessPolicyType } from "#policy/rule.js";
import { FilterScopeMatch } from "#policy/rulesStorage.js";

describe("accessRuleInput", () => {
	it("should parse valid access rule", () => {
		const result = accessRuleInput.parse({
			type: AccessPolicyType.Block,
			clientId: "client1",
			numericIp: BigInt(100),
		});

		expect(result.type).toBe(AccessPolicyType.Block);
		expect(result.clientId).toBe("client1");
		expect(result.numericIp).toBe(BigInt(100));
	});

	it("should transform ruleGroupId to groupId", () => {
		const result = accessRuleInput.parse({
			type: AccessPolicyType.Block,
			ruleGroupId: "group1",
		});

		expect(result.groupId).toBe("group1");
		expect(result.ruleGroupId).toBeUndefined();
	});

	it("should handle groupId directly", () => {
		const result = accessRuleInput.parse({
			type: AccessPolicyType.Block,
			groupId: "group1",
		});

		expect(result.groupId).toBe("group1");
	});

	it("should prioritize groupId over ruleGroupId", () => {
		const result = accessRuleInput.parse({
			type: AccessPolicyType.Block,
			groupId: "group1",
			ruleGroupId: "group2",
		});

		expect(result.groupId).toBe("group1");
	});
});

describe("ruleEntryInput", () => {
	it("should parse valid rule entry", () => {
		const result = ruleEntryInput.parse({
			rule: {
				type: AccessPolicyType.Block,
			},
		});

		expect(result.rule.type).toBe(AccessPolicyType.Block);
		expect(result.expiresUnixTimestamp).toBeUndefined();
	});

	it("should parse rule entry with expiration", () => {
		const expiration = Date.now();
		const result = ruleEntryInput.parse({
			rule: {
				type: AccessPolicyType.Block,
			},
			expiresUnixTimestamp: expiration,
		});

		expect(result.expiresUnixTimestamp).toBe(expiration);
	});

	it("should coerce expiration timestamp to number", () => {
		const result = ruleEntryInput.parse({
			rule: {
				type: AccessPolicyType.Block,
			},
			expiresUnixTimestamp: "1234567890",
		});

		expect(result.expiresUnixTimestamp).toBe(1234567890);
	});
});

describe("accessRulesFilterInput", () => {
	it("should parse valid filter input", () => {
		const result = accessRulesFilterInput.parse({
			policyScope: {
				clientId: "client1",
			},
		});

		expect(result.policyScope?.clientId).toBe("client1");
		expect(result.policyScopeMatch).toBe(FilterScopeMatch.Exact);
		expect(result.userScopeMatch).toBe(FilterScopeMatch.Exact);
	});

	it("should parse filter with user scope", () => {
		const result = accessRulesFilterInput.parse({
			policyScope: {
				clientId: "client1",
			},
			userScope: {
				numericIp: BigInt(100),
			},
		});

		expect(result.userScope?.numericIp).toBe(BigInt(100));
	});

	it("should parse filter with groupId", () => {
		const result = accessRulesFilterInput.parse({
			groupId: "group1",
		});

		expect(result.groupId).toBe("group1");
	});

	it("should parse filter with multiple policy scopes", () => {
		const result = accessRulesFilterInput.parse({
			policyScopes: [
				{ clientId: "client1" },
				{ clientId: "client2" },
			],
		});

		expect(result.policyScopes).toHaveLength(2);
		expect(result.policyScopes?.[0].clientId).toBe("client1");
		expect(result.policyScopes?.[1].clientId).toBe("client2");
	});

	it("should default to exact match for scope matches", () => {
		const result = accessRulesFilterInput.parse({});

		expect(result.policyScopeMatch).toBe(FilterScopeMatch.Exact);
		expect(result.userScopeMatch).toBe(FilterScopeMatch.Exact);
	});
});

describe("getAccessRuleFiltersFromInput", () => {
	it("should return single filter when only policyScope is provided", () => {
		const filters = getAccessRuleFiltersFromInput({
			policyScope: {
				clientId: "client1",
			},
		});

		expect(filters).toHaveLength(1);
		expect(filters[0].policyScope?.clientId).toBe("client1");
	});

	it("should return single filter when only policyScopes is provided", () => {
		const filters = getAccessRuleFiltersFromInput({
			policyScopes: [
				{ clientId: "client1" },
				{ clientId: "client2" },
			],
		});

		expect(filters).toHaveLength(2);
		expect(filters[0].policyScope?.clientId).toBe("client1");
		expect(filters[1].policyScope?.clientId).toBe("client2");
	});

	it("should combine policyScope and policyScopes", () => {
		const filters = getAccessRuleFiltersFromInput({
			policyScope: {
				clientId: "client1",
			},
			policyScopes: [
				{ clientId: "client2" },
			],
		});

		expect(filters).toHaveLength(2);
		expect(filters[0].policyScope?.clientId).toBe("client1");
		expect(filters[1].policyScope?.clientId).toBe("client2");
	});

	it("should return single filter when no policy scopes are provided", () => {
		const filters = getAccessRuleFiltersFromInput({
			groupId: "group1",
		});

		expect(filters).toHaveLength(1);
		expect(filters[0].groupId).toBe("group1");
		expect(filters[0].policyScope).toBeUndefined();
	});

	it("should preserve other filter properties", () => {
		const filters = getAccessRuleFiltersFromInput({
			policyScope: {
				clientId: "client1",
			},
			userScope: {
				numericIp: BigInt(100),
			},
			groupId: "group1",
			policyScopeMatch: FilterScopeMatch.Greedy,
			userScopeMatch: FilterScopeMatch.Greedy,
		});

		expect(filters).toHaveLength(1);
		expect(filters[0].userScope?.numericIp).toBe(BigInt(100));
		expect(filters[0].groupId).toBe("group1");
		expect(filters[0].policyScopeMatch).toBe(FilterScopeMatch.Greedy);
		expect(filters[0].userScopeMatch).toBe(FilterScopeMatch.Greedy);
	});
});

