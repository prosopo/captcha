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
import { getRulesRedisQuery } from "#policy/redis/reader/redisRulesQuery.js";
import { buildScopedRulesSubQueries } from "#policy/redis/reader/redisRulesSplitQuery.js";
import { FilterScopeMatch } from "#policy/rulesStorage.js";

const INJECTED_CLIENT_ID = "x} | @clientId:{victim";
const ESCAPED_CLIENT_ID = "x\\}\\ \\|\\ \\@clientId\\:\\{victim";

// Braces that are not preceded by a backslash are query syntax; a value
// that adds or removes any has escaped its clause.
const countUnescaped = (query: string, char: string): number =>
	query.split("").filter((c, i) => c === char && query[i - 1] !== "\\").length;

describe("split rule sub-queries escape request-supplied values", () => {
	const subQueries = buildScopedRulesSubQueries(
		{
			userId: "user-1.two}",
			ja4Hash: "t13d1516h2_8daaf6152771_02713d6af862",
			countryCode: "GB",
			os: "Mac OS X",
		},
		INJECTED_CLIENT_ID,
		{ blockOnly: true },
	);

	it("escapes the client id in every probe", () => {
		expect(subQueries.length).toBeGreaterThan(0);
		for (const { query } of subQueries) {
			expect(query).toContain(`@clientId:{${ESCAPED_CLIENT_ID}}`);
			expect(query).not.toContain("@clientId:{victim}");
			expect(countUnescaped(query, "{")).toBe(countUnescaped(query, "}"));
		}
	});

	it("escapes scalar user-scope values", () => {
		const queries = subQueries.map((sub) => sub.query).join("\n");
		expect(queries).toContain("@userId:{user\\-1\\.two\\}}");
		expect(queries).toContain(
			"@ja4Hash:{t13d1516h2_8daaf6152771_02713d6af862}",
		);
		expect(queries).toContain("@os:{Mac\\ OS\\ X}");
		expect(queries).toContain("@countryCode:{GB}");
	});

	it("leaves the global scope clause untouched", () => {
		const [first] = subQueries;
		expect(first?.query).toContain("@clientId:{global} | ismissing(@clientId)");
	});
});

describe("greedy rule query escapes request-supplied values", () => {
	it("escapes client id, group id and user id", () => {
		const query = getRulesRedisQuery(
			{
				policyScope: { clientId: INJECTED_CLIENT_ID },
				policyScopeMatch: FilterScopeMatch.Exact,
				userScope: { userId: "a b|c" },
				userScopeMatch: FilterScopeMatch.Exact,
				groupId: "g} | @type:{block",
			},
			false,
		);
		expect(query).toContain(`@clientId:{${ESCAPED_CLIENT_ID}}`);
		expect(query).toContain("@groupId:{g\\}\\ \\|\\ \\@type\\:\\{block}");
		expect(query).toContain("@userId:{a\\ b\\|c}");
		expect(countUnescaped(query, "{")).toBe(countUnescaped(query, "}"));
	});
});
