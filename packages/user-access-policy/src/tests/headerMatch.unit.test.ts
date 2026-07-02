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
import {
	type HeaderOperator,
	accessRuleHeaderMatches,
	evaluateHeaderCondition,
	isHeaderOperator,
} from "#policy/headerMatch.js";

describe("isHeaderOperator", () => {
	it("accepts the four known operators", () => {
		for (const op of ["equals", "contains", "notEquals", "notContains"]) {
			expect(isHeaderOperator(op)).toBe(true);
		}
	});

	it("rejects unknown / undefined values", () => {
		expect(isHeaderOperator("startsWith")).toBe(false);
		expect(isHeaderOperator("")).toBe(false);
		expect(isHeaderOperator(undefined)).toBe(false);
	});
});

describe("evaluateHeaderCondition", () => {
	const headers: Record<string, string> = {
		"x-app-version": "1.2.3-beta",
		"cf-worker": "example.com",
	};

	const cases: ReadonlyArray<{
		name: string;
		op: HeaderOperator;
		value: string;
		header: string;
		expected: boolean;
	}> = [
		// equals: present + exact
		{
			name: "equals hit",
			op: "equals",
			value: "example.com",
			header: "cf-worker",
			expected: true,
		},
		{
			name: "equals miss (different value)",
			op: "equals",
			value: "evil.com",
			header: "cf-worker",
			expected: false,
		},
		{
			name: "equals miss (header absent)",
			op: "equals",
			value: "anything",
			header: "x-missing",
			expected: false,
		},
		// contains: substring
		{
			name: "contains hit",
			op: "contains",
			value: "beta",
			header: "x-app-version",
			expected: true,
		},
		{
			name: "contains miss (no substring)",
			op: "contains",
			value: "alpha",
			header: "x-app-version",
			expected: false,
		},
		{
			name: "contains miss (header absent)",
			op: "contains",
			value: "beta",
			header: "x-missing",
			expected: false,
		},
		// notEquals: allow-list "equals" — blocks when NOT exactly equal
		{
			name: "notEquals blocks a different value",
			op: "notEquals",
			value: "example.com",
			header: "cf-worker",
			expected: false,
		},
		{
			name: "notEquals lets an exact match through",
			op: "notEquals",
			value: "evil.com",
			header: "cf-worker",
			expected: true,
		},
		{
			name: "notEquals blocks an absent header",
			op: "notEquals",
			value: "secret",
			header: "x-secret",
			expected: true,
		},
		// notContains: allow-list "contains" — blocks when substring absent
		{
			name: "notContains blocks when substring present",
			op: "notContains",
			value: "beta",
			header: "x-app-version",
			expected: false,
		},
		{
			name: "notContains lets a substring hit through",
			op: "notContains",
			value: "alpha",
			header: "x-app-version",
			expected: true,
		},
		{
			name: "notContains blocks an absent header",
			op: "notContains",
			value: "beta",
			header: "x-missing",
			expected: true,
		},
	];

	for (const c of cases) {
		it(c.name, () => {
			expect(evaluateHeaderCondition(c.header, c.op, c.value, headers)).toBe(
				c.expected,
			);
		});
	}

	it("matches header names case-insensitively", () => {
		expect(
			evaluateHeaderCondition("CF-Worker", "equals", "example.com", headers),
		).toBe(true);
	});
});

describe("accessRuleHeaderMatches", () => {
	const headers: Record<string, string> = { "x-debug": "1" };

	it("passes trivially when the rule has no header condition", () => {
		expect(accessRuleHeaderMatches({}, headers)).toBe(true);
	});

	it("evaluates a well-formed header condition", () => {
		expect(
			accessRuleHeaderMatches(
				{ headerName: "x-debug", headerOperator: "equals", headerValue: "1" },
				headers,
			),
		).toBe(true);
		expect(
			accessRuleHeaderMatches(
				{ headerName: "x-debug", headerOperator: "equals", headerValue: "0" },
				headers,
			),
		).toBe(false);
	});

	it("never matches a rule with a header name but an invalid operator", () => {
		expect(
			accessRuleHeaderMatches(
				{ headerName: "x-debug", headerOperator: "wat", headerValue: "1" },
				headers,
			),
		).toBe(false);
	});

	it("treats a missing headerValue as an empty string", () => {
		// "contains empty string" is always true for a present header.
		expect(
			accessRuleHeaderMatches(
				{ headerName: "x-debug", headerOperator: "contains" },
				headers,
			),
		).toBe(true);
	});
});
