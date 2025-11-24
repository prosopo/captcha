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

import { describe, expect, it, vi } from "vitest";
import { getPrioritisedAccessRule, getRequestUserScope } from "../../../api/blacklistRequestInspector.js";
import { AccessPolicyType, FilterScopeMatch } from "@prosopo/user-access-policy";

describe("Optimized getPrioritisedAccessRule", () => {
	it("should use greedy matching to fetch all rules in single query", async () => {
		const mockStorage = {
			findRules: vi.fn().mockResolvedValue([
				{
					type: AccessPolicyType.Block,
					userId: "user123",
					clientId: "client123",
					ip: "1.2.3.4",
				},
				{
					type: AccessPolicyType.Block,
					userId: "user123",
					clientId: "client123",
				},
				{
					type: AccessPolicyType.Block,
					ip: "1.2.3.4",
				},
			]),
		} as any;

		const userScope = {
			userId: "user123",
			ip: "1.2.3.4",
			ja4Hash: "abc123",
		};

		await getPrioritisedAccessRule(mockStorage, userScope, "client123");

		// Should only call findRules once (instead of multiple times)
		expect(mockStorage.findRules).toHaveBeenCalledTimes(1);

		// Should use greedy matching
		expect(mockStorage.findRules).toHaveBeenCalledWith(
			{
				policyScopeMatch: FilterScopeMatch.Greedy,
				userScopeMatch: FilterScopeMatch.Greedy,
				userScope,
				policyScope: {
					clientId: "client123",
				},
			},
			true,
			true,
		);
	});

	it("should sort results by priority - most specific first", async () => {
		const mockStorage = {
			findRules: vi.fn().mockResolvedValue([
				// Less specific rule
				{
					type: AccessPolicyType.Block,
					ip: "1.2.3.4",
					ruleId: "rule1",
				},
				// More specific rule
				{
					type: AccessPolicyType.Block,
					userId: "user123",
					ip: "1.2.3.4",
					ja4Hash: "abc123",
					ruleId: "rule2",
				},
				// Client-specific rule (should be highest priority)
				{
					type: AccessPolicyType.Block,
					userId: "user123",
					clientId: "client123",
					ruleId: "rule3",
				},
			]),
		} as any;

		const userScope = {
			userId: "user123",
			ip: "1.2.3.4",
			ja4Hash: "abc123",
		};

		const result = await getPrioritisedAccessRule(mockStorage, userScope, "client123");

		// Should return client rule first (highest priority)
		expect(result[0].ruleId).toBe("rule3");
		// Then most specific rule
		expect(result[1].ruleId).toBe("rule2");
		// Then least specific rule
		expect(result[2].ruleId).toBe("rule1");
	});
});

describe("Header Processing with Numeric Duration", () => {
	it("should extract individual header fields with proper type conversion", () => {
		const requestHeaders = {
			"accept-language": "en-US,en;q=0.9",
			"priority": "u=1, i",
			"sec-ch-ua": '"Chromium";v="119", "Not?A_Brand";v="24"',
			"sec-ch-ua-mobile": "?0",
			"sec-ch-ua-platform": '"Windows"',
			"x-duration-ms": "232.689µs", // Real-world example with microseconds
			"user-agent": "Mozilla/5.0 Chrome/119.0",
		};

		const userScope = getRequestUserScope(requestHeaders, "ja4hash123", "1.2.3.4", "user123");

		expect(userScope).toMatchObject({
			userId: "user123",
			ja4Hash: "ja4hash123",
			ip: "1.2.3.4",
			userAgent: "Mozilla/5.0 Chrome/119.0",
			headerAcceptLanguage: "en-US,en;q=0.9",
			headerPriority: "u=1, i",
			headerSecChUa: '"Chromium";v="119", "Not?A_Brand";v="24"',
			headerSecChUaMobile: "?0",
			headerSecChUaPlatform: '"Windows"',
		});

		// Verify microsecond to millisecond conversion: 232.689µs = 0.232689ms
		expect(userScope.headerXDurationMs).toBeCloseTo(0.232689, 6);
		expect(typeof userScope.headerXDurationMs).toBe("number");

		// Operator field should not be present in request scope
		expect(userScope.headerXDurationMsOperator).toBeUndefined();
	});

	it("should handle invalid duration values gracefully", () => {
		const requestHeaders = {
			"x-duration-ms": "invalid-number",
			"accept-language": "en-US",
		};

		const userScope = getRequestUserScope(requestHeaders, "ja4hash123", "1.2.3.4");

		// Should include other headers but exclude invalid numeric field
		expect(userScope.headerAcceptLanguage).toBe("en-US");
		expect(userScope.headerXDurationMs).toBeUndefined();
	});

	it("should handle missing headers gracefully", () => {
		const requestHeaders = {
			"user-agent": "Mozilla/5.0",
		};

		const userScope = getRequestUserScope(requestHeaders, "ja4hash123", "1.2.3.4");

		expect(userScope).toMatchObject({
			ja4Hash: "ja4hash123",
			ip: "1.2.3.4",
			userAgent: "Mozilla/5.0",
		});

		// All header fields should be undefined
		expect(userScope.headerAcceptLanguage).toBeUndefined();
		expect(userScope.headerXDurationMs).toBeUndefined();
		expect(userScope.headerXDurationMsOperator).toBeUndefined();
	});

	it("should demonstrate duration operator usage in rules", () => {
		// This test shows how rules would use the operator field
		const exampleRules = [
			{
				// Rule to block requests slower than 500ms
				type: AccessPolicyType.Block,
				headerXDurationMs: 500,
				headerXDurationMsOperator: 'gt' as const,
				description: "Block slow requests"
			},
			{
				// Rule to challenge suspiciously fast requests (< 50ms)
				type: AccessPolicyType.Restrict,
				headerXDurationMs: 50,
				headerXDurationMsOperator: 'lt' as const,
				description: "Challenge fast automated requests"
			},
			{
				// Rule to target exact timing
				type: AccessPolicyType.Block,
				headerXDurationMs: 250,
				headerXDurationMsOperator: 'eq' as const, // or undefined for default
				description: "Block specific timing pattern"
			}
		];

		// Verify rule structure
		expect(exampleRules[0].headerXDurationMsOperator).toBe('gt');
		expect(exampleRules[1].headerXDurationMsOperator).toBe('lt');
		expect(exampleRules[2].headerXDurationMsOperator).toBe('eq');
	});
});

