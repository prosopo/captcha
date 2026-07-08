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
import {
	AccessPolicyType,
	type AccessRule,
	type AccessRulesStorage,
} from "@prosopo/user-access-policy";
import {
	accessRulesRedisIndex,
	createRedisAccessRulesStorage,
} from "@prosopo/user-access-policy/redis";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import {
	getPrioritisedAccessRule,
	getVerdictCache,
} from "../../../api/blacklistRequestInspector.js";

// End-to-end realism test for the block-lookup hot path.
//
// This exercises the production caller — `getPrioritisedAccessRule` —
// with the process-wide `HardBlockVerdictCache` live, so behaviour under
// concurrency includes both the cache's absorption of repeat scopes
// AND the cache-miss stampede on wave 1 (identical concurrent requests
// all miss simultaneously before the first has populated the cache).
//
// Seeded rule population mirrors the shape of the 2026-07-07 bulk-ban
// incident: ~17k individual IP-blocks + ~1.3k CIDR-blocks + ~1k mixed
// client-scoped rules.
//
// Two traffic patterns:
//   1. Pure retry storm — every request in every wave has the same
//      banned scope. Wave 1 is a cache-miss stampede; waves 2..N are
//      pure cache hits. Reproduces the frontend-retry-loop shape.
//   2. Mixed realistic — each wave contains ~30% hot-scope repeats
//      (retry loop) + ~70% varied scopes (long-tail normal traffic).
//      Cache absorbs the retry portion; the unique portion still has
//      to hit Redis every time.

const IP_RULE_COUNT = 17_000;
const CIDR_RULE_COUNT = 1_300;
const MIXED_RULE_COUNT = 1_000;

// Per-process production shape: burst RPS with concurrent in-flight
// commands multiplexed on a single Redis TCP connection.
const STORM_CONCURRENCY = 100;
const STORM_WAVE_COUNT = 10;

// Mixed-workload wave sizing. Larger per-wave count so the unique-
// scope portion is measurable independently of the hot-scope portion.
const MIXED_CONCURRENCY = 200;
const MIXED_WAVE_COUNT = 8;
const MIXED_HOT_SCOPE_RATIO = 0.3;

// CI thresholds. Localhost warm-cache numbers land well under these;
// they exist to catch order-of-magnitude regressions, not to enforce
// a performance target.
const PURE_STORM_P50_LATENCY_MS = 200;
const PURE_STORM_P99_LATENCY_MS = 800;
const MIXED_P50_LATENCY_MS = 400;
const MIXED_P99_LATENCY_MS = 1600;

const ipv4 = (i: number): bigint => {
	const base = 10n << 24n;
	return base + BigInt(i);
};

const ipv4CidrRange = (i: number): { min: bigint; max: bigint } => {
	const octet = i % 256;
	const base = (192n << 24n) + (168n << 16n) + (BigInt(octet) << 8n);
	return { min: base, max: base + 255n };
};

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

// Generates unique-scope requests. Each scope has a fresh numericIp
// well outside the seeded ban range so it never matches — mirrors
// normal traffic against the block index. ja4/UA/country vary so no
// two requests coalesce in the cache.
let uniqueCounter = 0;
const buildUniqueScope = () => {
	const seq = uniqueCounter++;
	return {
		clientId: `client${seq % 30}`,
		userScope: {
			numericIp: ipv4(1_000_000 + seq),
			ja4Hash: `unique_ja4_${seq}`,
			userAgentHash: `unique_ua_${seq}`,
			countryCode: `C${seq % 30}`,
			asn: 5000 + (seq % 300),
		},
	};
};

// The hot retry-loop scope: one banned request every session keeps
// retrying. Same scope across every use so the verdict cache absorbs
// it after the first miss.
const HOT_SCOPE = {
	clientId: "client1",
	userScope: {
		numericIp: ipv4(42),
		ja4Hash: "t13d_load_1",
		userAgentHash: "ua5",
		countryCode: "C5",
		asn: 1005,
	},
};

describe("blacklistRequestInspector storm behaviour", () => {
	let redisConnection: RedisConnection;
	let accessRulesStorage: AccessRulesStorage;

	const mockLogger = new Proxy(
		{},
		{
			get: () => () => {},
		},
	) as unknown as Logger;

	beforeAll(async () => {
		redisConnection = createTestRedisConnection();
		await setupRedisIndex(
			redisConnection,
			accessRulesRedisIndex,
			mockLogger,
		).getClient();
		accessRulesStorage = createRedisAccessRulesStorage(
			redisConnection,
			mockLogger,
		);
		// createRedisAccessRulesStorage starts as a dummy and swaps in
		// the real client asynchronously — force the wait so seed goes
		// to the real storage, not the dummy.
		await redisConnection.getClient();

		const rules: AccessRule[] = [];
		for (let i = 0; i < IP_RULE_COUNT; i++) rules.push(buildIpBlockRule(i));
		for (let i = 0; i < CIDR_RULE_COUNT; i++) rules.push(buildCidrBlockRule(i));
		for (let i = 0; i < MIXED_RULE_COUNT; i++) rules.push(buildMixedRule(i));

		await executeBatchesSequentially(
			chunkIntoBatches(rules, 1000),
			async (batch) => {
				await accessRulesStorage.insertRules(
					batch.map((rule) => ({ rule })),
				);
			},
		);
	}, 300_000);

	afterAll(async () => {
		// The rules seeded here share the shared Redis instance with
		// other integration tests; clean them all up rather than
		// tracking individual keys.
		await accessRulesStorage.deleteAllRules();
	}, 120_000);

	beforeEach(() => {
		// Verdict cache is a process-wide singleton — reset it between
		// tests so cache-hit/miss shape is deterministic per test.
		getVerdictCache().clear();
	});

	test(
		`pure retry storm: ${STORM_CONCURRENCY} in-flight × ${STORM_WAVE_COUNT} waves through getPrioritisedAccessRule`,
		async () => {
			// Warm-up: page the FT index in and let the redis-client
			// pipeline settle.
			await getPrioritisedAccessRule(
				accessRulesStorage,
				{ numericIp: ipv4(999_997) },
				"warmup",
				{ blockOnly: true },
			);
			// Warm-up populated the cache with a "no match" verdict for
			// the warm-up scope; clear so subsequent measurements aren't
			// affected by any of it.
			getVerdictCache().clear();

			const allSamples: number[] = [];
			type WaveStat = {
				wave: number;
				cacheSizeAfter: number;
				p50: number;
				p99: number;
				min: number;
				max: number;
				elapsedMs: number;
			};
			const perWave: WaveStat[] = [];

			for (let wave = 0; wave < STORM_WAVE_COUNT; wave++) {
				const waveStart = performance.now();
				const waveSamples: number[] = [];

				await Promise.all(
					Array.from({ length: STORM_CONCURRENCY }, async () => {
						const start = performance.now();
						const results = await getPrioritisedAccessRule(
							accessRulesStorage,
							HOT_SCOPE.userScope,
							HOT_SCOPE.clientId,
							{ blockOnly: true },
						);
						const dur = performance.now() - start;
						waveSamples.push(dur);
						// The hot scope's numericIp matches a seeded
						// bulk-ban rule — every response must include it.
						expect(
							results.find(
								(r) => r.numericIp === HOT_SCOPE.userScope.numericIp,
							),
						).toBeDefined();
					}),
				);

				waveSamples.sort((a, b) => a - b);
				perWave.push({
					wave: wave + 1,
					cacheSizeAfter: getVerdictCache().size(),
					p50: percentile(waveSamples, 0.5),
					p99: percentile(waveSamples, 0.99),
					min: waveSamples[0] ?? 0,
					max: waveSamples[waveSamples.length - 1] ?? 0,
					elapsedMs: performance.now() - waveStart,
				});
				allSamples.push(...waveSamples);
			}

			allSamples.sort((a, b) => a - b);
			const overallP50 = percentile(allSamples, 0.5);
			const overallP99 = percentile(allSamples, 0.99);
			const overallAvg =
				allSamples.reduce((a, b) => a + b, 0) / allSamples.length;
			const totalRequests = STORM_CONCURRENCY * STORM_WAVE_COUNT;
			const totalElapsed = perWave.reduce((sum, w) => sum + w.elapsedMs, 0);
			const throughput = (totalRequests * 1000) / totalElapsed;

			console.log(
				`pure storm ${STORM_CONCURRENCY}×${STORM_WAVE_COUNT}: avg=${overallAvg.toFixed(2)}ms  ` +
					`p50=${overallP50.toFixed(2)}ms  p99=${overallP99.toFixed(2)}ms  ` +
					`throughput=${throughput.toFixed(0)} req/s`,
			);
			for (const w of perWave) {
				console.log(
					`  wave ${w.wave.toString().padStart(2)}: ` +
						`p50=${w.p50.toFixed(2)}ms  p99=${w.p99.toFixed(2)}ms  ` +
						`min=${w.min.toFixed(2)}ms  max=${w.max.toFixed(2)}ms  ` +
						`elapsed=${w.elapsedMs.toFixed(0)}ms  ` +
						`cacheSize=${w.cacheSizeAfter}`,
				);
			}

			expect(overallP50).toBeLessThan(PURE_STORM_P50_LATENCY_MS);
			expect(overallP99).toBeLessThan(PURE_STORM_P99_LATENCY_MS);

			// Steady-state (wave 2..N) must be materially faster than
			// wave 1. If it isn't, the cache is broken — every wave
			// would be hitting Redis. Threshold is generous because
			// cache lookups are ~microseconds vs 20ms wave-1 tail;
			// even a modest 2x improvement means the cache is engaged.
			const firstWave = perWave[0];
			const steadyStateSamples: number[] = [];
			for (let i = 1; i < perWave.length; i++) {
				// perWave[i] doesn't retain the raw sample list; use
				// the p50 as a proxy since we asserted its correctness
				// implicitly via the overall thresholds.
				const w = perWave[i];
				if (w) steadyStateSamples.push(w.p50);
			}
			const steadyStateAvgP50 =
				steadyStateSamples.reduce((a, b) => a + b, 0) /
				steadyStateSamples.length;
			expect(firstWave).toBeDefined();
			if (firstWave) {
				// Cache must give at least 2x on the steady-state p50 vs
				// wave 1 p50, or something's wrong (cache disabled, TTL
				// 0, keying broken, etc.).
				expect(steadyStateAvgP50 * 2).toBeLessThan(firstWave.p50);
			}

			// After the storm, the cache holds exactly one entry — the
			// hot scope. Confirms the cache key is stable and the same
			// scope always coalesces onto the same entry.
			expect(getVerdictCache().size()).toBe(1);
		},
		300_000,
	);

	test(
		`mixed realistic: ${MIXED_CONCURRENCY} in-flight × ${MIXED_WAVE_COUNT} waves with ${Math.round(MIXED_HOT_SCOPE_RATIO * 100)}% hot-scope`,
		async () => {
			// Reset the unique-scope counter so runs are deterministic.
			uniqueCounter = 0;

			await getPrioritisedAccessRule(
				accessRulesStorage,
				{ numericIp: ipv4(999_996) },
				"warmup",
				{ blockOnly: true },
			);
			getVerdictCache().clear();
			uniqueCounter = 0;

			const hotPerWave = Math.floor(
				MIXED_CONCURRENCY * MIXED_HOT_SCOPE_RATIO,
			);
			const uniquePerWave = MIXED_CONCURRENCY - hotPerWave;

			const hotSamples: number[] = [];
			const uniqueSamples: number[] = [];
			type WaveStat = {
				wave: number;
				hotP99: number;
				uniqueP99: number;
				cacheSizeAfter: number;
				elapsedMs: number;
			};
			const perWave: WaveStat[] = [];

			for (let wave = 0; wave < MIXED_WAVE_COUNT; wave++) {
				const waveStart = performance.now();
				const waveHot: number[] = [];
				const waveUnique: number[] = [];

				// Build the request set for this wave. Interleave hot
				// and unique so they don't run in sequential blocks —
				// production traffic doesn't batch by scope.
				type Req = { kind: "hot" | "unique"; scope: typeof HOT_SCOPE };
				const requests: Req[] = [];
				for (let i = 0; i < hotPerWave; i++) {
					requests.push({ kind: "hot", scope: HOT_SCOPE });
				}
				for (let i = 0; i < uniquePerWave; i++) {
					requests.push({ kind: "unique", scope: buildUniqueScope() });
				}
				// Deterministic shuffle so hot/unique interleave.
				for (let i = requests.length - 1; i > 0; i--) {
					const j = (i * 2654435761) % (i + 1);
					const a = requests[i];
					const b = requests[j];
					if (a !== undefined && b !== undefined) {
						requests[i] = b;
						requests[j] = a;
					}
				}

				await Promise.all(
					requests.map(async (req) => {
						const start = performance.now();
						await getPrioritisedAccessRule(
							accessRulesStorage,
							req.scope.userScope,
							req.scope.clientId,
							{ blockOnly: true },
						);
						const dur = performance.now() - start;
						if (req.kind === "hot") {
							waveHot.push(dur);
						} else {
							waveUnique.push(dur);
						}
					}),
				);

				waveHot.sort((a, b) => a - b);
				waveUnique.sort((a, b) => a - b);
				perWave.push({
					wave: wave + 1,
					hotP99: percentile(waveHot, 0.99),
					uniqueP99: percentile(waveUnique, 0.99),
					cacheSizeAfter: getVerdictCache().size(),
					elapsedMs: performance.now() - waveStart,
				});
				hotSamples.push(...waveHot);
				uniqueSamples.push(...waveUnique);
			}

			hotSamples.sort((a, b) => a - b);
			uniqueSamples.sort((a, b) => a - b);
			const hotP50 = percentile(hotSamples, 0.5);
			const hotP99 = percentile(hotSamples, 0.99);
			const uniqueP50 = percentile(uniqueSamples, 0.5);
			const uniqueP99 = percentile(uniqueSamples, 0.99);
			const totalRequests = MIXED_CONCURRENCY * MIXED_WAVE_COUNT;
			const totalElapsed = perWave.reduce((sum, w) => sum + w.elapsedMs, 0);
			const throughput = (totalRequests * 1000) / totalElapsed;

			console.log(
				`mixed ${MIXED_CONCURRENCY}×${MIXED_WAVE_COUNT} ` +
					`(${Math.round(MIXED_HOT_SCOPE_RATIO * 100)}% hot / ` +
					`${100 - Math.round(MIXED_HOT_SCOPE_RATIO * 100)}% unique):  ` +
					`throughput=${throughput.toFixed(0)} req/s`,
			);
			console.log(
				`  hot    (n=${hotSamples.length}): p50=${hotP50.toFixed(2)}ms  p99=${hotP99.toFixed(2)}ms`,
			);
			console.log(
				`  unique (n=${uniqueSamples.length}): p50=${uniqueP50.toFixed(2)}ms  p99=${uniqueP99.toFixed(2)}ms`,
			);
			for (const w of perWave) {
				console.log(
					`  wave ${w.wave.toString().padStart(2)}: ` +
						`hot p99=${w.hotP99.toFixed(2)}ms  ` +
						`unique p99=${w.uniqueP99.toFixed(2)}ms  ` +
						`elapsed=${w.elapsedMs.toFixed(0)}ms  ` +
						`cacheSize=${w.cacheSizeAfter}`,
				);
			}

			// Both hot and unique paths must stay under the ceilings;
			// unique is allowed a higher tail because every request hits
			// Redis under the wave's concurrency load.
			expect(uniqueP50).toBeLessThan(MIXED_P50_LATENCY_MS);
			expect(uniqueP99).toBeLessThan(MIXED_P99_LATENCY_MS);

			// Hot-path lookups must be materially faster than unique on
			// average — cache hits are microseconds, cache misses are
			// milliseconds. Threshold is a modest 2x because the hot-
			// scope p50 is dragged up by the wave-1 stampede: every
			// hot request in wave 1 misses the cache simultaneously
			// (no in-flight dedupe today), so ~1/N_waves of hot samples
			// pay the cache-miss cost. Even with that drag, the hot
			// path stays well ahead — 2x is the alarm threshold, not
			// the performance target.
			expect(hotP50 * 2).toBeLessThan(uniqueP50);

			// Cache grew by roughly (unique requests + 1 hot entry).
			// Cache correctness under concurrency: no dupes for the same
			// key. Size must equal the total unique scopes plus the
			// hot scope's single entry.
			const expectedCacheSize = uniquePerWave * MIXED_WAVE_COUNT + 1;
			expect(getVerdictCache().size()).toBe(expectedCacheSize);
		},
		600_000,
	);

	test(
		"cache-miss stampede: N concurrent identical requests all miss cache on wave 1",
		async () => {
			// Explicitly measures the wave-1 stampede shape — the case
			// the cache does NOT currently protect against. If a later
			// change adds singleflight / in-flight dedupe to the cache,
			// this test would need updating to expect fewer storage
			// calls than concurrent requests.
			getVerdictCache().clear();

			let storageCallCount = 0;
			const originalFindRules = accessRulesStorage.findRules.bind(
				accessRulesStorage,
			);
			accessRulesStorage.findRules = async (...args) => {
				storageCallCount++;
				return originalFindRules(...args);
			};

			try {
				const concurrency = 50;
				await Promise.all(
					Array.from({ length: concurrency }, () =>
						getPrioritisedAccessRule(
							accessRulesStorage,
							HOT_SCOPE.userScope,
							HOT_SCOPE.clientId,
							{ blockOnly: true },
						),
					),
				);

				console.log(
					`stampede: ${concurrency} concurrent identical requests → ${storageCallCount} storage calls`,
				);

				// Documented current behaviour: no in-flight dedupe.
				// Every wave-1 request that arrives before the first
				// resolves goes to storage. This is the shape the
				// process-wide cache does NOT absorb.
				expect(storageCallCount).toBe(concurrency);
				expect(getVerdictCache().size()).toBe(1);
			} finally {
				accessRulesStorage.findRules = originalFindRules;
			}
		},
		60_000,
	);
});
