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

	describe("Header-based Rules", () => {
		it("generates correct query for individual header fields", () => {
			const filter = {
				userScope: {
					headerAcceptLanguage: "en-US",
					headerSecChUa: '"Chrome";v="119"',
					headerSecChUaMobile: "?0",
				},
				userScopeMatch: FilterScopeMatch.Exact,
			} as AccessRulesFilter;

			const query = getRulesRedisQuery(filter, false);

			expect(query).toBe(
				"( @headerAcceptLanguage:{en-US} @headerSecChUa:{\"Chrome\";v=\"119\"} @headerSecChUaMobile:{?0} )",
			);
		});

		it("generates correct query for composite headers hash", () => {
			const filter = {
				userScope: {
					headersHash: "abc123def456789",
					ja4Hash: "ja4hash123",
				},
				userScopeMatch: FilterScopeMatch.Exact,
			} as AccessRulesFilter;

			const query = getRulesRedisQuery(filter, false);

			expect(query).toBe(
				"( @headersHash:{abc123def456789} @ja4Hash:{ja4hash123} )",
			);
		});

		it("generates correct query for duration with 'gt' operator", () => {
			const filter = {
				userScope: {
					headerXDurationMs: 500,
					headerXDurationMsOperator: "gt",
				},
				userScopeMatch: FilterScopeMatch.Exact,
			} as AccessRulesFilter;

			const query = getRulesRedisQuery(filter, false);

			expect(query).toBe("( @headerXDurationMs:[(500 +inf] )");
		});

		it("generates correct query for duration with 'lt' operator", () => {
			const filter = {
				userScope: {
					headerXDurationMs: 100,
					headerXDurationMsOperator: "lt",
				},
				userScopeMatch: FilterScopeMatch.Exact,
			} as AccessRulesFilter;

			const query = getRulesRedisQuery(filter, false);

			expect(query).toBe("( @headerXDurationMs:[-inf (100] )");
		});

		it("generates correct query for duration with 'eq' operator", () => {
			const filter = {
				userScope: {
					headerXDurationMs: 250,
					headerXDurationMsOperator: "eq",
				},
				userScopeMatch: FilterScopeMatch.Exact,
			} as AccessRulesFilter;

			const query = getRulesRedisQuery(filter, false);

			expect(query).toBe("( @headerXDurationMs:[250 250] )");
		});

		it("generates correct query for duration without operator (defaults to eq)", () => {
			const filter = {
				userScope: {
					headerXDurationMs: 150,
				},
				userScopeMatch: FilterScopeMatch.Exact,
			} as AccessRulesFilter;

			const query = getRulesRedisQuery(filter, false);

			expect(query).toBe("( @headerXDurationMs:[150 150] )");
		});

		it("handles missing duration fields correctly", () => {
			const filter = {
				userScope: {
					headerXDurationMs: undefined,
					headerAcceptLanguage: "en-US",
				},
				userScopeMatch: FilterScopeMatch.Exact,
			} as AccessRulesFilter;

			const query = getRulesRedisQuery(filter, false);

			expect(query).toBe(
				"( ismissing(@headerXDurationMs) @headerAcceptLanguage:{en-US} )",
			);
		});

		it("generates OR queries for greedy header matching", () => {
			const filter = {
				userScope: {
					headerAcceptLanguage: "en-US",
					headerSecChUa: '"Chrome";v="119"',
					headerXDurationMs: 150,
					headerXDurationMsOperator: "lt",
				},
				userScopeMatch: FilterScopeMatch.Greedy,
			} as AccessRulesFilter;

			const query = getRulesRedisQuery(filter, false);

			expect(query).toBe(
				"( @headerAcceptLanguage:{en-US} | @headerSecChUa:{\"Chrome\";v=\"119\"} | @headerXDurationMs:[-inf (150] )",
			);
		});

		it("combines header fields with other user scope fields", () => {
			const filter = {
				userScope: {
					userId: "user123",
					ja4Hash: "ja4abc123",
					headerAcceptLanguage: "fr-FR",
					headerXDurationMs: 200,
					headerXDurationMsOperator: "gt",
					numericIp: BigInt(167772161), // 10.0.0.1
				},
				userScopeMatch: FilterScopeMatch.Exact,
			} as AccessRulesFilter;

			const query = getRulesRedisQuery(filter, false);

			expect(query).toBe(
				"( @userId:{user123} @ja4Hash:{ja4abc123} @headerAcceptLanguage:{fr-FR} @headerXDurationMs:[(200 +inf] ( @numericIp:[167772161 167772161] | ( @numericIpMaskMin:[-inf 167772161] @numericIpMaskMax:[167772161 +inf] ) ) )",
			);
		});

		it("excludes operator field from query generation", () => {
			const filter = {
				userScope: {
					headerXDurationMsOperator: "gt",
					// Note: no headerXDurationMs value
					headerAcceptLanguage: "en-US",
				},
				userScopeMatch: FilterScopeMatch.Exact,
			} as AccessRulesFilter;

			const query = getRulesRedisQuery(filter, false);

			// Should only include headerAcceptLanguage, operator field should be skipped
			expect(query).toBe("( @headerAcceptLanguage:{en-US} )");
		});

		it("handles all header fields with ismissing for exact match", () => {
			const filter = {
				userScope: {
					headerAcceptLanguage: undefined,
					headerPriority: undefined,
					headerSecChUa: undefined,
					headerSecChUaMobile: undefined,
					headerSecChUaPlatform: undefined,
					headerXDurationMs: undefined,
					headersHash: "onlyhash123",
				},
				userScopeMatch: FilterScopeMatch.Exact,
			} as AccessRulesFilter;

			const query = getRulesRedisQuery(filter, true);

			expect(query).toContain("ismissing(@headerAcceptLanguage)");
			expect(query).toContain("ismissing(@headerPriority)");
			expect(query).toContain("ismissing(@headerSecChUa)");
			expect(query).toContain("ismissing(@headerSecChUaMobile)");
			expect(query).toContain("ismissing(@headerSecChUaPlatform)");
			expect(query).toContain("ismissing(@headerXDurationMs)");
			expect(query).toContain("@headersHash:{onlyhash123}");
		});
	});
});
