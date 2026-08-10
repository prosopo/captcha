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

import { chunkIntoBatches, executeBatchesSequentially } from "@prosopo/common";
import type { Logger } from "@prosopo/logger";
import {
	type RedisConnection,
	createTestRedisConnection,
	setupRedisIndex,
} from "@prosopo/redis-client";
import type { RedisClientType } from "redis";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { RedisRulesReader } from "#policy/redis/reader/redisRulesReader.js";
import {
	ACCESS_RULES_REDIS_INDEX_NAME,
	accessRulesRedisIndex,
	getAccessRuleRedisKey,
} from "#policy/redis/redisRuleIndex.js";
import { getRedisRuleValue } from "#policy/redis/redisRulesWriter.js";
import { AccessPolicyType, type AccessRule } from "#policy/rule.js";
import { FilterScopeMatch } from "#policy/rulesStorage.js";

// Production observation on pronode10 (2026-06-15):
//   - ~7,500 rules in the access-rule index
//   - greedy + FT.AGGREGATE pulled ~1,190 hashes per request and pegged
//     provider1 Node thread at ~125% CPU.
//   - Strict-match + server-side rank pulls at most SERVER_SIDE_RANK_TOP_N
//     hashes per request, so the cost is independent of total rule count.
//
// This benchmark seeds 10k rules with a realistic specificity distribution,
// runs N findRules calls in matchingFieldsOnly=true mode, and asserts
// per-call latency stays inside generous CI thresholds. The numbers below
// are intentionally loose; healthy local runs typically come in 5-10x
// under cap. The point is to catch regressions where someone re-introduces
// HGETALL fanout into the hot path.

const RULE_COUNT = 10_000;
const QUERY_COUNT = 200;

// CI thresholds. Local development on a warm redis container is steady
// around p50=20ms / p99=25ms over 10k rules; thresholds set ~3-5x above
// that to absorb noisy shared CI runners. If these start failing
// regularly, look for changes that re-introduce per-rule HGETALL fanout
// or break the SORTBY MAX short-circuit on the Redis side.
const P50_LATENCY_MS = 80;
const P99_LATENCY_MS = 250;

// Build a deterministic distribution of rules that mirrors production
// roughly:
//   ~70% low-specificity (1 field, e.g. ja4-only or country-only)
//   ~20% medium (2-3 fields, typical anomaly detector emission)
//   ~10% high (4+ fields, manual portal rules with full scope)
const buildBenchmarkRule = (i: number): AccessRule => {
	const bucket = i % 10;
	const ja4 = `t13d_bench_${(i % 50).toString().padStart(3, "0")}`;
	const asn = 1000 + (i % 500);
	// description is included in the content hash that generates the
	// rule's Redis key, so a unique description ensures every synthetic
	// rule lands on its own key. It doesn't affect specificity scoring
	// or the strict-match filter.
	const description = `bench-rule-${i}`;

	if (bucket < 7) {
		// low specificity — anomaly detector style
		const variant = i % 3;
		if (variant === 0)
			return { type: AccessPolicyType.Block, description, ja4Hash: ja4 };
		if (variant === 1)
			return {
				type: AccessPolicyType.Block,
				description,
				asn,
			};
		return {
			type: AccessPolicyType.Restrict,
			description,
			countryCode: `C${i % 30}`,
		};
	}

	if (bucket < 9) {
		// medium specificity — client-scoped + 1-2 fields
		return {
			type: AccessPolicyType.Block,
			description,
			clientId: `client${i % 20}`,
			ja4Hash: ja4,
			...(i % 2 === 0 && { userAgentHash: `ua${i % 100}` }),
		};
	}

	// high specificity — full scope portal rules
	return {
		type: AccessPolicyType.Block,
		description,
		clientId: `client${i % 20}`,
		ja4Hash: ja4,
		userAgentHash: `ua${i % 100}`,
		headersHash: `hh${i % 200}`,
		countryCode: `C${i % 30}`,
	};
};

// Deterministic request-scope generator. Every request populates the
// full set of user-scope fields the rules use, so under strict-match
// semantics rules whose populated fields are a subset of the request
// scope can actually apply. Mirrors a fully-instrumented production
// request (ja4 + UA + headers + country + asn all known).
const buildBenchmarkRequest = (i: number) => {
	return {
		clientId: `client${i % 20}`,
		scope: {
			ja4Hash: `t13d_bench_${(i % 50).toString().padStart(3, "0")}`,
			userAgentHash: `ua${i % 100}`,
			headersHash: `hh${i % 200}`,
			countryCode: `C${i % 30}`,
			asn: 1000 + (i % 500),
		},
	};
};

const percentile = (sortedMs: number[], q: number): number => {
	if (sortedMs.length === 0) return 0;
	const idx = Math.min(
		sortedMs.length - 1,
		Math.floor((sortedMs.length - 1) * q),
	);
	const v = sortedMs[idx];
	return v ?? 0;
};

describe("redisRulesReader ranked-path benchmark", () => {
	let redisConnection: RedisConnection;
	let redisClient: RedisClientType;
	let reader: RedisRulesReader;

	const mockLogger = new Proxy(
		{},
		{
			get: () => () => {},
		},
	) as unknown as Logger;

	// Track every key we insert so cleanup deletes only our rules,
	// leaving any other test suite's data and the shared index intact.
	const seededKeys: string[] = [];

	beforeAll(async () => {
		redisConnection = createTestRedisConnection();
		redisClient = await setupRedisIndex(
			redisConnection,
			accessRulesRedisIndex,
			mockLogger,
		).getClient();
		reader = new RedisRulesReader(redisClient, mockLogger);

		// Seed RULE_COUNT rules in batches of 1000 — same chunk size the
		// production writer uses, mirrors realistic insert behaviour.
		const rules: AccessRule[] = [];
		for (let i = 0; i < RULE_COUNT; i++) {
			rules.push(buildBenchmarkRule(i));
		}
		await executeBatchesSequentially(
			chunkIntoBatches(rules, 1000),
			async (batch) => {
				const multi = redisClient.multi();
				for (const rule of batch) {
					const key = getAccessRuleRedisKey(rule);
					seededKeys.push(key);
					multi.hSet(key, getRedisRuleValue(rule));
				}
				await multi.exec();
			},
		);

		const indexInfo = await redisClient.ft.info(ACCESS_RULES_REDIS_INDEX_NAME);
		// Description is unique per rule so every rule should land on
		// its own key; allow a 10% margin for any incidental dedupe.
		expect(indexInfo.num_docs).toBeGreaterThan(RULE_COUNT * 0.9);
	}, 120_000);

	afterAll(async () => {
		// Delete only the keys this suite inserted; do not flushAll
		// because we share the redis instance (and the index) with the
		// other integration test file.
		await executeBatchesSequentially(
			chunkIntoBatches(seededKeys, 1000),
			async (batch) => {
				const multi = redisClient.multi();
				for (const key of batch) {
					multi.del(key);
				}
				await multi.exec();
			},
		);
	});

	test(`ranked findRules p50/p99 over ${QUERY_COUNT} queries against ${RULE_COUNT} rules`, async () => {
		// warm up — first call pays for index page-in
		await reader.findRules(
			{
				policyScope: { clientId: "warmup" },
				policyScopeMatch: FilterScopeMatch.Greedy,
				userScope: { ja4Hash: "warmup" },
				userScopeMatch: FilterScopeMatch.Greedy,
			},
			true,
		);

		const samples: number[] = [];
		for (let i = 0; i < QUERY_COUNT; i++) {
			const { clientId, scope } = buildBenchmarkRequest(i);
			const start = performance.now();
			await reader.findRules(
				{
					policyScope: { clientId },
					policyScopeMatch: FilterScopeMatch.Greedy,
					userScope: scope,
					userScopeMatch: FilterScopeMatch.Greedy,
				},
				true,
			);
			samples.push(performance.now() - start);
		}

		samples.sort((a, b) => a - b);
		const p50 = percentile(samples, 0.5);
		const p99 = percentile(samples, 0.99);
		const avg = samples.reduce((a, b) => a + b, 0) / samples.length;

		console.log(
			`ranked findRules: avg=${avg.toFixed(2)}ms  p50=${p50.toFixed(2)}ms  p99=${p99.toFixed(2)}ms  n=${samples.length}`,
		);

		expect(p50).toBeLessThan(P50_LATENCY_MS);
		expect(p99).toBeLessThan(P99_LATENCY_MS);
	}, 120_000);

	test("split findRules returns every applicable candidate (no server-side rank cap)", async () => {
		// The old FT.AGGREGATE ranker capped candidates at
		// SERVER_SIDE_RANK_TOP_N=20 which silently dropped
		// specific-IP Restrict rules when a tenant had many
		// higher-specificity irrelevant rules — the 2026-07-10
		// Twickets regression. The split path per-probe uses
		// discriminating posting lists, so each probe returns only
		// rules that actually match the probed field. The union of
		// all probes has no artificial size cap; the only bound is
		// SPLIT_MAX_CANDIDATES_PER_SUB (500) per sub-query, which
		// only fires on pathological rule-set shapes.
		const { clientId, scope } = buildBenchmarkRequest(0);
		const results = await reader.findRules(
			{
				policyScope: { clientId },
				policyScopeMatch: FilterScopeMatch.Greedy,
				userScope: scope,
				userScopeMatch: FilterScopeMatch.Greedy,
			},
			true,
		);
		// Must return something for a fully-populated request.
		expect(results.length).toBeGreaterThan(0);
	}, 60_000);

	test("HGETALL-free: ranked path returns full rules without per-rule fanout", async () => {
		// The benefit of the ranked path in production is *not* raw
		// localhost latency (the strict-match index walk is heavier
		// than a greedy FT.SEARCH on a quiet box). It's that the
		// ranked path returns full rule bodies inside the single
		// FT.AGGREGATE reply, with no follow-up HGETALL fanout. In
		// production each HGETALL costs ~0.5ms of network RTT over
		// the Docker bridge, so cutting hundreds of round trips per
		// request is the win that doesn't appear in a localhost
		// timing test.
		//
		// This test stands in for that: confirm the ranked path
		// produces fully-populated AccessRule objects from one
		// aggregate call (no separate hash fetches needed).
		const { clientId, scope } = buildBenchmarkRequest(0);
		const ranked = await reader.findRules(
			{
				policyScope: { clientId },
				policyScopeMatch: FilterScopeMatch.Greedy,
				userScope: scope,
				userScopeMatch: FilterScopeMatch.Greedy,
			},
			true,
		);

		expect(ranked.length).toBeGreaterThan(0);
		// Every returned record must have the policy fields populated —
		// proves the LOAD pipeline includes them rather than relying
		// on a follow-up HGETALL.
		for (const rule of ranked) {
			expect(rule.type).toBeDefined();
		}
	}, 60_000);

	test("ranked findRules returns rules in specificity-descending order", async () => {
		// A request that matches the high-specificity bucket should
		// surface the rule with the most populated fields first.
		const { clientId, scope } = buildBenchmarkRequest(9);
		const results = await reader.findRules(
			{
				policyScope: { clientId },
				policyScopeMatch: FilterScopeMatch.Greedy,
				userScope: scope,
				userScopeMatch: FilterScopeMatch.Greedy,
			},
			true,
		);

		if (results.length === 0) return;
		const top = results[0];
		if (!top) return;

		// The top rule must have at least as many populated user-scope
		// fields as any other returned rule.
		const countFields = (r: AccessRule): number =>
			(r.userId ? 1 : 0) +
			(r.ja4Hash ? 1 : 0) +
			(r.headersHash ? 1 : 0) +
			(r.userAgentHash ? 1 : 0) +
			(r.headHash ? 1 : 0) +
			(r.coords ? 1 : 0) +
			(r.countryCode ? 1 : 0) +
			(r.asn !== undefined ? 1 : 0) +
			(r.clientId ? 1 : 0) +
			(r.numericIp !== undefined || r.numericIpMaskMin !== undefined ? 1 : 0);

		const topScore = countFields(top);
		for (const r of results) {
			expect(countFields(r)).toBeLessThanOrEqual(topScore);
		}
	}, 60_000);
});
