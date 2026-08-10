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
	buildScopedBlockSubQueries,
	buildScopedRulesSubQueries,
} from "#policy/redis/reader/redisRulesSplitQuery.js";

describe("buildScopedBlockSubQueries", () => {
	it("emits one sub-query per populated user-scope field", () => {
		const subs = buildScopedBlockSubQueries(
			{
				ja4Hash: "abc",
				userAgentHash: "def",
			},
			"client-A",
		);

		const kinds = subs.map((s) => s.kind).sort();
		// Two field probes + one fall-through for "no user-scope
		// constraint" rules. No IP sub-queries because request has no IP.
		expect(kinds).toEqual([
			"field:ja4Hash",
			"field:userAgentHash",
			"no-user-scope",
		]);
	});

	it("emits both ip-exact and ip-mask sub-queries when request has an IP", () => {
		const subs = buildScopedBlockSubQueries(
			{
				numericIp: 3232235777n, // 192.168.1.1
			},
			"client-A",
		);

		const kinds = subs.map((s) => s.kind);
		expect(kinds).toContain("ip:exact");
		expect(kinds).toContain("ip:mask");

		const ipExact = subs.find((s) => s.kind === "ip:exact");
		expect(ipExact?.query).toContain("@numericIp:[3232235777 3232235777]");

		const ipMask = subs.find((s) => s.kind === "ip:mask");
		expect(ipMask?.query).toContain("@numericIpMaskMin:[-inf 3232235777]");
		expect(ipMask?.query).toContain("@numericIpMaskMax:[3232235777 +inf]");
	});

	it("scopes every sub-query with @type:{block} and @clientId probe", () => {
		const subs = buildScopedBlockSubQueries({ ja4Hash: "abc" }, "client-A");

		for (const sub of subs) {
			expect(sub.query).toContain("@type:{block}");
			// Every sub-query must include the client-or-global scope
			// probe. `@clientId:{client-A}` matches client-scoped rules;
			// `@clientId:{global}` matches new-format global rules;
			// `ismissing(@clientId)` matches legacy pre-sentinel rules.
			expect(sub.query).toMatch(/@clientId:\{client-A\}/);
			expect(sub.query).toMatch(/@clientId:\{global\}/);
			expect(sub.query).toMatch(/ismissing\(@clientId\)/);
		}
	});

	it("skips the client-specific probe when no clientId is passed", () => {
		const subs = buildScopedBlockSubQueries({ ja4Hash: "abc" }, undefined);

		for (const sub of subs) {
			// No client-scoped probe — request is scoped to global rules
			// only. `global` sentinel and `ismissing()` fallback remain.
			expect(sub.query).toMatch(/@clientId:\{global\}/);
			expect(sub.query).toMatch(/ismissing\(@clientId\)/);
		}
	});

	it("emits a no-user-scope fall-through query with ismissing() over every user-scope field", () => {
		const subs = buildScopedBlockSubQueries({ ja4Hash: "abc" }, "client-A");

		const fallThrough = subs.find((s) => s.kind === "no-user-scope");
		expect(fallThrough).toBeDefined();
		// Every user-scope field must be constrained as missing so the
		// probe returns only rules that are truly client-wide blocks
		// (no user-scope constraint at all).
		for (const field of [
			"userId",
			"ja4Hash",
			"headersHash",
			"userAgentHash",
			"headHash",
			"coords",
			"countryCode",
			"asn",
			"numericIp",
			"numericIpMaskMin",
			"numericIpMaskMax",
		]) {
			expect(fallThrough?.query).toContain(`ismissing(@${field})`);
		}
	});

	it("uses NUMERIC range syntax for asn, not TAG syntax", () => {
		const subs = buildScopedBlockSubQueries({ asn: 205016 }, "client-A");

		const asnSub = subs.find((s) => s.kind === "field:asn");
		expect(asnSub).toBeDefined();
		// asn is indexed as NUMERIC; TAG syntax (@asn:{...}) would
		// silently fail to match. Must use range syntax.
		expect(asnSub?.query).toContain("@asn:[205016 205016]");
		expect(asnSub?.query).not.toContain("@asn:{");
	});

	it("escapes JSON special characters in coords tag queries", () => {
		const subs = buildScopedBlockSubQueries(
			{ coords: "[[[100,200]]]" },
			"client-A",
		);

		const coordsSub = subs.find((s) => s.kind === "field:coords");
		expect(coordsSub).toBeDefined();
		// Coords hold JSON with brackets and commas — every one must be
		// backslash-escaped or the TAG query silently returns no matches.
		expect(coordsSub?.query).toContain("@coords:{\\[\\[\\[100\\,200\\]\\]\\]}");
	});
});

describe("buildScopedRulesSubQueries", () => {
	it("omits @type:{block} when blockOnly is not set", () => {
		// The non-block path — used by the frictionless access-policy
		// lookup — must not filter on rule type so both Block and
		// Restrict rules are returned. JS-side rankCandidateRules then
		// picks the right one via severity + specificity.
		const subs = buildScopedRulesSubQueries(
			{ numericIp: 1376899398n },
			"client-A",
		);

		for (const sub of subs) {
			expect(sub.query).not.toContain("@type:{block}");
		}
	});

	it("includes @type:{block} when blockOnly is true", () => {
		const subs = buildScopedRulesSubQueries(
			{ numericIp: 1376899398n },
			"client-A",
			{ blockOnly: true },
		);

		for (const sub of subs) {
			expect(sub.query).toContain("@type:{block}");
		}
	});

	it("emits the same probe kinds regardless of blockOnly", () => {
		// The probe set is driven by populated request scope, not by
		// rule-type filter. blockOnly only narrows what each probe
		// returns; the shape of the split stays identical.
		const withoutBlock = buildScopedRulesSubQueries(
			{ numericIp: 1376899398n, ja4Hash: "abc" },
			"client-A",
		);
		const withBlock = buildScopedRulesSubQueries(
			{ numericIp: 1376899398n, ja4Hash: "abc" },
			"client-A",
			{ blockOnly: true },
		);

		expect(withoutBlock.map((s) => s.kind).sort()).toEqual(
			withBlock.map((s) => s.kind).sort(),
		);
	});

	it("produces an ip-exact probe that hits the numericIp posting list", () => {
		// This is the regression guard for the Twickets rule-lookup bug:
		// a request with a specific IP must generate a probe that hits
		// the @numericIp posting list, so a Restrict rule scoped only
		// to `clientId + numericIp` is fetched even when the tenant has
		// thousands of higher-specificity irrelevant rules on other
		// scopes. The previous FT.AGGREGATE ranker capped candidates at
		// top-20 by populated-field count and truncated the specific-IP
		// rule below higher-specificity SUDDEN_VOLUME_INCREASE / SIMD
		// rules that also matched the greedy `ismissing(@field)`
		// disjunction.
		const subs = buildScopedRulesSubQueries(
			{ numericIp: 1376899398n },
			"5EZVvsHMrKCFKp5NYNoTyDjTjetoVo1Z4UNNbTwJf1GfN6Xm",
		);

		const ipExact = subs.find((s) => s.kind === "ip:exact");
		expect(ipExact).toBeDefined();
		expect(ipExact?.query).toContain("@numericIp:[1376899398 1376899398]");
		expect(ipExact?.query).toContain(
			"@clientId:{5EZVvsHMrKCFKp5NYNoTyDjTjetoVo1Z4UNNbTwJf1GfN6Xm}",
		);
	});
});
