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
import { type PolicyFilter, ScopeMatch } from "#policy/accessPolicyResolver.js";
import {getRedisAccessRulesQuery} from "#policy/redis/redisAccesRulesQuery.js";

// fixme policyScope tests

describe("getPolicyScopeQuery", () => {
    it("puts ismissing(x) for field x passed in as `undefined` when policy scope match is exact", () => {
        const filter = {
            policyScope: {

            },
            policyScopeMatch: ScopeMatch.Exact,
        } as PolicyFilter;

        const query = getRedisAccessRulesQuery(filter, false);

        expect(query).toBe(
            "ismissing(@clientId) ismissing(@groupId)",
        );
    });

});


describe("getUserScopeQuery", () => {
	it("puts ismissing(x) for field x passed in as `undefined` when user scope match is exact", () => {
		const filter = {
			userScope: {
				numericIp: BigInt(100),
				ja4Hash: "ja4Hash",
				userAgentHash: undefined,
			},
			userScopeMatch: ScopeMatch.Exact,
		} as PolicyFilter;

		const query = getRedisAccessRulesQuery(filter, false);

		expect(query).toBe(
			"( ( @numericIp:[100] | ( @numericIpMaskMin:[-inf 100] @numericIpMaskMax:[100 +inf] ) ) @ja4Hash:{ja4Hash} ismissing(@userAgentHash) )",
		);
	});
	it("puts ismissing(x) for field x passed in as `undefined` when user scope match is exact and for missing fields when matchingFieldsOnly is set", () => {
		const filter = {
			userScope: {
				numericIp: BigInt(100),
				ja4Hash: "ja4Hash",
				userAgentHash: undefined,
			},
			userScopeMatch: ScopeMatch.Exact,
		} as PolicyFilter;

		const query = getRedisAccessRulesQuery(filter, true);

		expect(query).toBe(
			"( ( @numericIp:[100] | ( @numericIpMaskMin:[-inf 100] @numericIpMaskMax:[100 +inf] ) ) @ja4Hash:{ja4Hash} ismissing(@userAgentHash) ismissing(@userId) ismissing(@headersHash) )",
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
			userScopeMatch: ScopeMatch.Exact,
		} as PolicyFilter;

		const query = getRedisAccessRulesQuery(filter, false);

		expect(query).toBe(
			"( ( @numericIp:[100] | ( @numericIpMaskMin:[-inf 100] @numericIpMaskMax:[100 +inf] ) ) @ja4Hash:{ja4Hash} ismissing(@userAgentHash) ismissing(@headersHash) ismissing(@userId) )",
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
			userScopeMatch: ScopeMatch.Greedy,
		} as PolicyFilter;

		const query = getRedisAccessRulesQuery(filter, false);

		expect(query).toBe(
			"( ( @numericIp:[100] | ( @numericIpMaskMin:[-inf 100] @numericIpMaskMax:[100 +inf] ) ) | @ja4Hash:{ja4Hash} )",
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
			userScopeMatch: ScopeMatch.Exact,
		} as PolicyFilter;

		const query = getRedisAccessRulesQuery(filter, false);

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
			userScopeMatch: ScopeMatch.Exact,
		} as PolicyFilter;

		const query = getRedisAccessRulesQuery(filter, true);

		expect(query).toBe(
			"( ( @numericIp:[100] | ( @numericIpMaskMin:[-inf 100] @numericIpMaskMax:[100 +inf] ) ) @ja4Hash:{ja4Hash} ismissing(@userAgentHash) ismissing(@headersHash) ismissing(@userId) )",
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
			userScopeMatch: ScopeMatch.Exact,
		} as PolicyFilter;

		const query = getRedisAccessRulesQuery(filter, true);

		expect(query).toBe(
			"( @numericIpMaskMin:[-inf 100] @numericIpMaskMax:[200 +inf] @ja4Hash:{ja4Hash} ismissing(@userAgentHash) ismissing(@headersHash) ismissing(@userId) )",
		);
	});
});
