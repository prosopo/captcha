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
			"( ( @numericIp:[100 100] | ( @numericIpMaskMin:[-inf 100] @numericIpMaskMax:[100 +inf] ) ) @ja4Hash:{ja4Hash} ismissing(@userAgentHash) ismissing(@userId) ismissing(@headersHash) )",
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
			"( ( @numericIp:[100 100] | ( @numericIpMaskMin:[-inf 100] @numericIpMaskMax:[100 +inf] ) ) @ja4Hash:{ja4Hash} ismissing(@userAgentHash) ismissing(@headersHash) ismissing(@userId) )",
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
			"( @numericIpMaskMin:[-inf 100] @numericIpMaskMax:[200 +inf] @ja4Hash:{ja4Hash} ismissing(@userAgentHash) ismissing(@headersHash) ismissing(@userId) )",
		);
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

	it("includes coords in query when provided", () => {
		const filter = {
			userScope: {
				coords: "[[[100,200]]]",
			},
			userScopeMatch: FilterScopeMatch.Exact,
		} as AccessRulesFilter;

		const query = getRulesRedisQuery(filter, false);

		expect(query).toContain("@coords:");
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
		expect(query).toContain("@coords:");
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
