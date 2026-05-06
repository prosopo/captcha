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
import {
	type AccessRulesFilter,
	FilterScopeMatch,
} from "#policy/rulesStorage.js";

describe("getRulesRedisQuery", () => {
	it("puts ismissing(x) for field x passed in as `undefined` when user scope match is exact", () => {
		const filter = {
			userScope: {
				numericIp: BigInt(100),
				ja4Hash: "ja4Hash",
				userAgentHash: undefined,
			},
			userScopeMatch: FilterScopeMatch.Exact,
		} as AccessRulesFilter;

		const query = getRulesRedisQuery(filter, false);

		expect(query).toBe(
			"( ( @numericIp:[100 100] | ( @numericIpMaskMin:[-inf 100] @numericIpMaskMax:[100 +inf] ) ) @ja4Hash:{ja4Hash} ismissing(@userAgentHash) )",
		);
	});

	it("puts ismissing(x) for field x passed in as `undefined` when user scope match is exact and for missing fields when matchingFieldsOnly is set", () => {
		const filter = {
			userScope: {
				numericIp: BigInt(100),
				ja4Hash: "ja4Hash",
				userAgentHash: undefined,
			},
			userScopeMatch: FilterScopeMatch.Exact,
		} as AccessRulesFilter;

		const query = getRulesRedisQuery(filter, true);

		expect(query).toBe(
			"( ( @numericIp:[100 100] | ( @numericIpMaskMin:[-inf 100] @numericIpMaskMax:[100 +inf] ) ) @ja4Hash:{ja4Hash} ismissing(@userAgentHash) ismissing(@userId) ismissing(@headersHash) ismissing(@headHash) ismissing(@coords) ismissing(@countryCode) )",
		);
	});

	it("puts ismissing(x) for multiple fields passed in as `undefined` when user scope match is exact", () => {
		const filter = {
			userScope: {
				numericIp: BigInt(100),
				ja4Hash: "ja4Hash",
				userAgentHash: undefined,
				headersHash: undefined,
				userId: undefined,
			},
			userScopeMatch: FilterScopeMatch.Exact,
		} as AccessRulesFilter;

		const query = getRulesRedisQuery(filter, false);

		expect(query).toBe(
			"( ( @numericIp:[100 100] | ( @numericIpMaskMin:[-inf 100] @numericIpMaskMax:[100 +inf] ) ) @ja4Hash:{ja4Hash} ismissing(@userAgentHash) ismissing(@headersHash) ismissing(@userId) )",
		);
	});

	it("does not put ismissing(x) for multiple fields passed in as `undefined` when user scope match is greedy", () => {
		const filter = {
			userScope: {
				numericIp: BigInt(100),
				ja4Hash: "ja4Hash",
				userAgentHash: undefined,
				headersHash: undefined,
				userId: undefined,
			},
			userScopeMatch: FilterScopeMatch.Greedy,
		} as AccessRulesFilter;

		const query = getRulesRedisQuery(filter, false);

		expect(query).toBe(
			"( ( @numericIp:[100 100] | ( @numericIpMaskMin:[-inf 100] @numericIpMaskMax:[100 +inf] ) ) | @ja4Hash:{ja4Hash} )",
		);
	});

	it("puts ismissing(x) for multiple fields passed in as `undefined` when user scope match is exact 2", () => {
		const filter = {
			userScope: {
				numericIp: undefined,
				ja4Hash: "ja4Hash",
				userAgentHash: undefined,
				headersHash: undefined,
				userId: undefined,
			},
			userScopeMatch: FilterScopeMatch.Exact,
		} as AccessRulesFilter;

		const query = getRulesRedisQuery(filter, false);

		expect(query).toBe(
			"( ismissing(@numericIp) ismissing(@numericIpMaskMin) ismissing(@numericIpMaskMax) @ja4Hash:{ja4Hash} ismissing(@userAgentHash) ismissing(@headersHash) ismissing(@userId) )",
		);
	});

	it("does not put ismissing(numericIpMaskMin) and does not put ismissing(numericIpMaskMax) when numericIp is passed in", () => {
		const filter = {
			userScope: {
				numericIp: BigInt(100),
				ja4Hash: "ja4Hash",
				userAgentHash: undefined,
				headersHash: undefined,
				userId: undefined,
			},
			userScopeMatch: FilterScopeMatch.Exact,
		} as AccessRulesFilter;

		const query = getRulesRedisQuery(filter, true);

		expect(query).toBe(
			"( ( @numericIp:[100 100] | ( @numericIpMaskMin:[-inf 100] @numericIpMaskMax:[100 +inf] ) ) @ja4Hash:{ja4Hash} ismissing(@userAgentHash) ismissing(@headersHash) ismissing(@userId) ismissing(@headHash) ismissing(@coords) ismissing(@countryCode) )",
		);
	});

	it("does not put ismissing(numericIp) when numericIpMaskMin and numericIpMaskMax are passed in", () => {
		const filter = {
			userScope: {
				numericIpMaskMin: BigInt(100),
				numericIpMaskMax: BigInt(200),
				ja4Hash: "ja4Hash",
				userAgentHash: undefined,
				headersHash: undefined,
				userId: undefined,
			},
			userScopeMatch: FilterScopeMatch.Exact,
		} as AccessRulesFilter;

		const query = getRulesRedisQuery(filter, true);

		expect(query).toBe(
			"( @numericIpMaskMin:[-inf 100] @numericIpMaskMax:[200 +inf] @ja4Hash:{ja4Hash} ismissing(@userAgentHash) ismissing(@headersHash) ismissing(@userId) ismissing(@headHash) ismissing(@coords) ismissing(@countryCode) )",
		);
	});

	it("does not duplicate ismissing for numericIpMaskMin and numericIpMaskMax when matchingFieldsOnly is true and all IP fields are undefined", () => {
		const filter = {
			userScope: {
				userId: "user123",
			},
			userScopeMatch: FilterScopeMatch.Exact,
		} as AccessRulesFilter;

		const query = getRulesRedisQuery(filter, true);

		// numericIp handler emits all three ismissing clauses when all IP fields are undefined.
		// The individual numericIpMaskMin and numericIpMaskMax handlers should not duplicate them.
		const numericIpMaskMinMatches = query.match(
			/ismissing\(@numericIpMaskMin\)/g,
		);
		const numericIpMaskMaxMatches = query.match(
			/ismissing\(@numericIpMaskMax\)/g,
		);

		expect(numericIpMaskMinMatches).toHaveLength(1);
		expect(numericIpMaskMaxMatches).toHaveLength(1);
		expect(query).toContain("ismissing(@numericIp)");
		expect(query).toContain("@userId:{user123}");
	});

	it("emits ismissing for numericIpMaskMin when numericIpMaskMax is defined but numericIpMaskMin is not", () => {
		const filter = {
			userScope: {
				numericIpMaskMax: BigInt(200),
			},
			userScopeMatch: FilterScopeMatch.Exact,
		} as AccessRulesFilter;

		const query = getRulesRedisQuery(filter, true);

		// numericIp handler returns "" because numericIpMaskMax is defined.
		// numericIpMaskMin handler should still emit ismissing since the numericIp handler didn't cover it.
		expect(query).toContain("ismissing(@numericIpMaskMin)");
		expect(query).toContain("@numericIpMaskMax:[200 +inf]");
		expect(query).not.toContain("ismissing(@numericIpMaskMax)");
	});

	it("emits ismissing for numericIpMaskMax when numericIpMaskMin is defined but numericIpMaskMax is not", () => {
		const filter = {
			userScope: {
				numericIpMaskMin: BigInt(100),
			},
			userScopeMatch: FilterScopeMatch.Exact,
		} as AccessRulesFilter;

		const query = getRulesRedisQuery(filter, true);

		expect(query).toContain("@numericIpMaskMin:[-inf 100]");
		expect(query).toContain("ismissing(@numericIpMaskMax)");
		expect(query).not.toContain("ismissing(@numericIpMaskMin)");
	});

	it("includes headHash in query when provided", () => {
		const filter = {
			userScope: {
				headHash: "abc123def456",
			},
			userScopeMatch: FilterScopeMatch.Exact,
		} as AccessRulesFilter;

		const query = getRulesRedisQuery(filter, false);

		expect(query).toBe("( @headHash:{abc123def456} )");
	});

	it("includes coords in query when provided with escaped special characters", () => {
		const filter = {
			userScope: {
				coords: "[[[100,200]]]",
			},
			userScopeMatch: FilterScopeMatch.Exact,
		} as AccessRulesFilter;

		const query = getRulesRedisQuery(filter, false);

		// Special characters like [, ], and , should be escaped
		expect(query).toContain("@coords:{\\[\\[\\[100\\,200\\]\\]\\]}");
	});

	it("includes both headHash and coords when both provided", () => {
		const filter = {
			userScope: {
				headHash: "abc123def456",
				coords: "[[[100,200]]]",
			},
			userScopeMatch: FilterScopeMatch.Exact,
		} as AccessRulesFilter;

		const query = getRulesRedisQuery(filter, false);

		expect(query).toContain("@headHash:{abc123def456}");
		expect(query).toContain("@coords:{\\[\\[\\[100\\,200\\]\\]\\]}");
	});

	it("puts ismissing(headHash) and ismissing(coords) when not provided and matchingFieldsOnly is true", () => {
		const filter = {
			userScope: {
				ja4Hash: "ja4Hash",
			},
			userScopeMatch: FilterScopeMatch.Exact,
		} as AccessRulesFilter;

		const query = getRulesRedisQuery(filter, true);

		expect(query).toContain("ismissing(@headHash)");
		expect(query).toContain("ismissing(@coords)");
	});

	it("combines headHash with other fields correctly in exact match", () => {
		const filter = {
			userScope: {
				numericIp: BigInt(100),
				ja4Hash: "ja4Hash",
				headHash: "abc123def456",
				userAgentHash: undefined,
			},
			userScopeMatch: FilterScopeMatch.Exact,
		} as AccessRulesFilter;

		const query = getRulesRedisQuery(filter, false);

		expect(query).toContain("@numericIp:[100 100]");
		expect(query).toContain("@ja4Hash:{ja4Hash}");
		expect(query).toContain("@headHash:{abc123def456}");
		expect(query).toContain("ismissing(@userAgentHash)");
	});
});
