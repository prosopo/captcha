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

// Regression barrier for the block-lookup hot path against the shape
// of a large bulk-ban rule population.
//
// What this test defends against:
//   1. A bulk-ban script inserts on the order of 17k access-policy
//      rules, mostly IP-only (individual IPs plus a few CIDR aggregates,
//      no other scope fields).
//   2. Every incoming captcha request runs FT.AGGREGATE against
//      `index:user-access-rules` with a strict-match ranked query. That
//      query's LOAD + APPLY(exists()×11) + SORTBY step scales linearly
//      in the tenant's total rule count. At 17k rules under production
//      traffic the tail latency degrades sharply and upstream 502s
//      cascade.
//   3. This benchmark seeds a matching rule shape and asserts the
//      split-query path's latency stays flat regardless of population
//      size — every probe hits its own index posting list (numericIp,
//      numericIpMaskMin) so the cost is O(matches for this request),
//      not O(total rules).

const IP_RULE_COUNT = 17_000;
const CIDR_RULE_COUNT = 1_300;
const MIXED_RULE_COUNT = 1_000;
const QUERY_COUNT = 300;

// CI thresholds. Localhost warm-cache measurements land around
// p50 = 5-15 ms, p99 = 30-50 ms; thresholds set well above that to
// absorb noisy shared runners. A regression to the single-query design
// against this rule population would blow through both by
// order-of-magnitude margins, so the ceilings are the alarm not a
// performance target.
const P50_LATENCY_MS = 120;
const P99_LATENCY_MS = 400;

const ipv4 = (i: number): bigint => {
	// 10.0.0.0/8 range — private, unambiguous, plenty of room to spread
	// out over 17k unique addresses without wrapping past /8.
	const base = 10n << 24n;
	return base + BigInt(i);
};

const ipv4CidrRange = (i: number): { min: bigint; max: bigint } => {
	// 192.168.<i%256>.0/24 style ranges. Deterministic and disjoint from
	// the individual-IP range above so tests can target either shape
	// unambiguously.
	const octet = i % 256;
	const base = (192n << 24n) + (168n << 16n) + (BigInt(octet) << 8n);
	return { min: base, max: base + 255n };
};

// Deterministic rule generators matched to the incident population shape.
const buildIpBlockRule = (i: number): AccessRule => ({
	type: AccessPolicyType.Block,
	description: `bulk-ban-ip-${i}`,
	numericIp: ipv4(i),
});

const buildCidrBlockRule = (i: number): AccessRule => {
	const { min, max } = ipv4CidrRange(i);
	return {
		type: AccessPolicyType.Block,
		description: `bulk-ban-cidr-${i}`,
		numericIpMaskMin: min,
		numericIpMaskMax: max,
	};
};

// A handful of "normal" client-scoped rules so the rule set isn't
// homogeneous — matches production's mixed anomaly-detector +
// manual-rule shape.
const buildMixedRule = (i: number): AccessRule => {
	const variant = i % 4;
	if (variant === 0) {
		return {
			type: AccessPolicyType.Block,
			description: `mixed-${i}`,
			clientId: `client${i % 30}`,
			ja4Hash: `t13d_load_${i % 50}`,
		};
	}
	if (variant === 1) {
		return {
			type: AccessPolicyType.Restrict,
			description: `mixed-${i}`,
			countryCode: `C${i % 30}`,
		};
	}
	if (variant === 2) {
		return {
			type: AccessPolicyType.Block,
			description: `mixed-${i}`,
			asn: 1000 + (i % 500),
		};
	}
	return {
		type: AccessPolicyType.Block,
		description: `mixed-${i}`,
		clientId: `client${i % 30}`,
		userAgentHash: `ua${i % 100}`,
	};
};

const percentile = (sortedMs: number[], q: number): number => {
	if (sortedMs.length === 0) return 0;
	const idx = Math.min(
		sortedMs.length - 1,
		Math.floor((sortedMs.length - 1) * q),
	);
	return sortedMs[idx] ?? 0;
};

describe("redisRulesReader load-shape benchmark (17k IP-only rules)", () => {
	let redisConnection: RedisConnection;
	let redisClient: RedisClientType;
	let reader: RedisRulesReader;

	const mockLogger = new Proxy(
		{},
		{
			get: () => () => {},
		},
	) as unknown as Logger;

	const seededKeys: string[] = [];

	beforeAll(async () => {
		redisConnection = createTestRedisConnection();
		redisClient = await setupRedisIndex(
			redisConnection,
			accessRulesRedisIndex,
			mockLogger,
		).getClient();
		reader = new RedisRulesReader(redisClient, mockLogger);

		const rules: AccessRule[] = [];
		for (let i = 0; i < IP_RULE_COUNT; i++) rules.push(buildIpBlockRule(i));
		for (let i = 0; i < CIDR_RULE_COUNT; i++) rules.push(buildCidrBlockRule(i));
		for (let i = 0; i < MIXED_RULE_COUNT; i++) rules.push(buildMixedRule(i));

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
		// Description is unique per rule so every rule should own its
		// key; allow 10% margin for any incidental dedupe.
		const expectedRules = IP_RULE_COUNT + CIDR_RULE_COUNT + MIXED_RULE_COUNT;
		expect(indexInfo.num_docs).toBeGreaterThan(expectedRules * 0.9);
	}, 300_000);

	afterAll(async () => {
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
	}, 60_000);

	test(
		`split-query hot path stays flat under ${IP_RULE_COUNT + CIDR_RULE_COUNT + MIXED_RULE_COUNT} rules`,
		async () => {
			// Warm-up: first call pays for RediSearch index page-in.
			await reader.findRules(
				{
					policyScope: { clientId: "warmup" },
					policyScopeMatch: FilterScopeMatch.Greedy,
					userScope: { numericIp: ipv4(999_999) },
					userScopeMatch: FilterScopeMatch.Greedy,
					blockOnly: true,
				},
				true,
			);

			const samples: number[] = [];
			for (let i = 0; i < QUERY_COUNT; i++) {
				// Half the queries target seeded IPs (hits), half target IPs
				// outside the seeded range (misses). Both must be fast.
				const isHit = i % 2 === 0;
				const numericIp = isHit
					? ipv4(i % IP_RULE_COUNT)
					: ipv4(IP_RULE_COUNT + i + 1_000_000);

				const start = performance.now();
				await reader.findRules(
					{
						policyScope: { clientId: `client${i % 30}` },
						policyScopeMatch: FilterScopeMatch.Greedy,
						userScope: {
							numericIp,
							ja4Hash: `t13d_load_${i % 50}`,
							userAgentHash: `ua${i % 100}`,
							countryCode: `C${i % 30}`,
							asn: 1000 + (i % 500),
						},
						userScopeMatch: FilterScopeMatch.Greedy,
						blockOnly: true,
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
				`split-query load: avg=${avg.toFixed(2)}ms  p50=${p50.toFixed(2)}ms  p99=${p99.toFixed(2)}ms  n=${samples.length}  (${IP_RULE_COUNT} IPs + ${CIDR_RULE_COUNT} CIDRs + ${MIXED_RULE_COUNT} mixed)`,
			);

			expect(p50).toBeLessThan(P50_LATENCY_MS);
			expect(p99).toBeLessThan(P99_LATENCY_MS);
		},
		300_000,
	);

	test(
		"finds exact-IP bulk-ban rule for matching request",
		async () => {
			// Pick an IP known to have been seeded as an individual-IP ban.
			const targetIp = ipv4(42);
			const results = await reader.findRules(
				{
					policyScope: { clientId: "client1" },
					policyScopeMatch: FilterScopeMatch.Greedy,
					userScope: {
						numericIp: targetIp,
						ja4Hash: "t13d_load_1",
					},
					userScopeMatch: FilterScopeMatch.Greedy,
					blockOnly: true,
				},
				true,
			);

			// The exact-IP rule must be among the returned candidates —
			// this is the "rule that must never be missed" property.
			const found = results.find((r) => r.numericIp === targetIp);
			expect(found).toBeDefined();
			expect(found?.type).toBe(AccessPolicyType.Block);
		},
		60_000,
	);

	test(
		"finds CIDR-range bulk-ban rule for request IP inside the range",
		async () => {
			// Pick a CIDR range and a request IP known to fall inside it.
			const { min, max } = ipv4CidrRange(7);
			const requestIp = min + 42n;
			expect(requestIp).toBeLessThanOrEqual(max);

			const results = await reader.findRules(
				{
					policyScope: { clientId: "client1" },
					policyScopeMatch: FilterScopeMatch.Greedy,
					userScope: { numericIp: requestIp },
					userScopeMatch: FilterScopeMatch.Greedy,
					blockOnly: true,
				},
				true,
			);

			const found = results.find(
				(r) =>
					r.numericIpMaskMin === min &&
					r.numericIpMaskMax === max &&
					r.type === AccessPolicyType.Block,
			);
			expect(found).toBeDefined();
		},
		60_000,
	);

	test(
		"finds ja4-scoped rule via the split-query ja4 probe",
		async () => {
			// The mixed population includes ja4-scoped rules; a request
			// with matching ja4Hash must surface the rule even when the
			// request IP has no matching numericIp entry.
			const results = await reader.findRules(
				{
					policyScope: { clientId: "client0" },
					policyScopeMatch: FilterScopeMatch.Greedy,
					userScope: {
						numericIp: ipv4(999_998),
						ja4Hash: "t13d_load_0",
					},
					userScopeMatch: FilterScopeMatch.Greedy,
					blockOnly: true,
				},
				true,
			);

			const ja4Rule = results.find(
				(r) => r.ja4Hash === "t13d_load_0" && r.clientId === "client0",
			);
			expect(ja4Rule).toBeDefined();
		},
		60_000,
	);

	test(
		"returns no match when request IP is outside every rule range",
		async () => {
			// Way outside every seeded range.
			const results = await reader.findRules(
				{
					policyScope: { clientId: "client99" },
					policyScopeMatch: FilterScopeMatch.Greedy,
					userScope: { numericIp: ipv4(9_999_999) },
					userScopeMatch: FilterScopeMatch.Greedy,
					blockOnly: true,
				},
				true,
			);

			// No IP-scoped rule should apply; only fall-through matches
			// (mixed rules keyed on other fields) could surface here, and
			// we're not populating any of those on this request.
			const ipMatch = results.find(
				(r) =>
					r.numericIp !== undefined ||
					(r.numericIpMaskMin !== undefined &&
						r.numericIpMaskMax !== undefined),
			);
			expect(ipMatch).toBeUndefined();
		},
		60_000,
	);
});
