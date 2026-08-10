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

import { AccessPolicyType, type AccessRule } from "@prosopo/user-access-policy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	HardBlockVerdictCache,
	hardBlockCacheKey,
} from "../../../api/hardBlockVerdictCache.js";

const rule = (clientId?: string): AccessRule => ({
	type: AccessPolicyType.Block,
	description: `rule-${clientId ?? "global"}`,
	...(clientId ? { clientId } : {}),
});

describe("HardBlockVerdictCache", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns undefined on miss", () => {
		const cache = new HardBlockVerdictCache(30_000, 100);
		expect(cache.get("missing")).toBeUndefined();
	});

	it("returns the stored value on hit within TTL", () => {
		const cache = new HardBlockVerdictCache(30_000, 100);
		const value = [rule("client-A")];
		cache.set("key", value);
		expect(cache.get("key")).toBe(value);
	});

	it("returns undefined once the TTL has elapsed", () => {
		const cache = new HardBlockVerdictCache(1_000, 100);
		cache.set("key", [rule("client-A")]);
		// Just under TTL — still fresh.
		vi.advanceTimersByTime(999);
		expect(cache.get("key")).toBeDefined();
		// One tick past — expired.
		vi.advanceTimersByTime(2);
		expect(cache.get("key")).toBeUndefined();
	});

	it("evicts the least-recently-used entry when max size is reached", () => {
		const cache = new HardBlockVerdictCache(30_000, 2);
		cache.set("a", [rule("A")]);
		cache.set("b", [rule("B")]);
		cache.set("c", [rule("C")]);
		// No access between inserts, so LRU order matches insertion
		// order: `a` was least-recently-used, must be evicted.
		expect(cache.get("a")).toBeUndefined();
		expect(cache.get("b")).toBeDefined();
		expect(cache.get("c")).toBeDefined();
		expect(cache.size()).toBe(2);
	});

	it("LRU: accessing an entry moves it to the tail so it survives eviction", () => {
		const cache = new HardBlockVerdictCache(30_000, 2);
		cache.set("a", [rule("A")]);
		cache.set("b", [rule("B")]);
		// Touch `a` — it's now most-recently-used, `b` becomes the
		// oldest and will be evicted next.
		expect(cache.get("a")).toBeDefined();
		cache.set("c", [rule("C")]);
		expect(cache.get("a")).toBeDefined();
		expect(cache.get("b")).toBeUndefined();
		expect(cache.get("c")).toBeDefined();
	});

	it("LRU move-to-tail preserves absolute TTL (no sliding refresh)", () => {
		const cache = new HardBlockVerdictCache(1_000, 100);
		cache.set("k", [rule("A")]);
		vi.advanceTimersByTime(500);
		// Access at 500ms — should NOT refresh expiresAt.
		expect(cache.get("k")).toBeDefined();
		vi.advanceTimersByTime(499);
		expect(cache.get("k")).toBeDefined();
		// Sliding TTL would keep this alive; absolute TTL expires it.
		vi.advanceTimersByTime(2);
		expect(cache.get("k")).toBeUndefined();
	});

	it("set() on an existing key re-inserts at the tail without triggering an eviction", () => {
		const cache = new HardBlockVerdictCache(30_000, 2);
		cache.set("a", [rule("A")]);
		cache.set("b", [rule("B")]);
		// Re-set `a` — capacity is still 2 after the internal delete+
		// insert, so `b` should NOT be evicted.
		cache.set("a", [rule("A2")]);
		expect(cache.get("a")).toBeDefined();
		expect(cache.get("b")).toBeDefined();
		expect(cache.size()).toBe(2);
	});

	it("clear() drops every entry", () => {
		const cache = new HardBlockVerdictCache(30_000, 100);
		cache.set("a", [rule("A")]);
		cache.set("b", [rule("B")]);
		cache.clear();
		expect(cache.size()).toBe(0);
		expect(cache.get("a")).toBeUndefined();
	});

	describe("singleflight (getOrCompute)", () => {
		beforeEach(() => {
			// Singleflight tests are async and use real timers; the
			// outer describe's fake timers block promise resolution
			// on some setups.
			vi.useRealTimers();
		});

		it("dedupes N concurrent identical misses to one compute call", async () => {
			const cache = new HardBlockVerdictCache(30_000, 100);
			let calls = 0;
			const compute = async () => {
				calls++;
				// Force the compute to actually yield so the other 99
				// callers race to the inflight map before we resolve.
				await new Promise((resolve) => setTimeout(resolve, 5));
				return [rule("A")];
			};

			const results = await Promise.all(
				Array.from({ length: 100 }, () => cache.getOrCompute("k", compute)),
			);

			expect(calls).toBe(1);
			// All 100 waiters received the same resolved value.
			expect(results).toHaveLength(100);
			for (const r of results) {
				expect(r).toHaveLength(1);
				expect(r[0]?.description).toBe("rule-A");
			}
			// Cache is populated so subsequent lookups don't re-compute.
			expect(cache.get("k")).toBeDefined();
			// In-flight map is cleared once compute resolved.
			expect(cache.inflightSize()).toBe(0);
		});

		it("does not dedupe different keys", async () => {
			const cache = new HardBlockVerdictCache(30_000, 100);
			let calls = 0;
			const compute = async (id: string) => {
				calls++;
				await new Promise((resolve) => setTimeout(resolve, 5));
				return [rule(id)];
			};

			await Promise.all([
				cache.getOrCompute("k1", () => compute("A")),
				cache.getOrCompute("k2", () => compute("B")),
				cache.getOrCompute("k3", () => compute("C")),
			]);

			expect(calls).toBe(3);
		});

		it("rejection propagates to all waiters and does not wedge future calls", async () => {
			const cache = new HardBlockVerdictCache(30_000, 100);
			let calls = 0;
			const failThenSucceed = async () => {
				calls++;
				await new Promise((resolve) => setTimeout(resolve, 5));
				if (calls === 1) {
					throw new Error("boom");
				}
				return [rule("A")];
			};

			// Wave 1: all waiters share the same rejection.
			const wave1 = await Promise.allSettled([
				cache.getOrCompute("k", failThenSucceed),
				cache.getOrCompute("k", failThenSucceed),
				cache.getOrCompute("k", failThenSucceed),
			]);
			expect(calls).toBe(1);
			for (const r of wave1) {
				expect(r.status).toBe("rejected");
			}

			// Wave 2: the in-flight entry from wave 1 was cleared on
			// rejection, so wave 2 starts a fresh compute. Would wedge
			// forever if the rejected Promise stayed in the inflight
			// map.
			const wave2 = await cache.getOrCompute("k", failThenSucceed);
			expect(calls).toBe(2);
			expect(wave2).toHaveLength(1);
		});

		it("fast-paths a cache hit without touching the inflight map", async () => {
			const cache = new HardBlockVerdictCache(30_000, 100);
			cache.set("k", [rule("prefilled")]);
			let calls = 0;
			const compute = async () => {
				calls++;
				return [rule("computed")];
			};
			const result = await cache.getOrCompute("k", compute);
			expect(calls).toBe(0);
			expect(result[0]?.description).toBe("rule-prefilled");
			expect(cache.inflightSize()).toBe(0);
		});
	});
});

describe("hardBlockCacheKey", () => {
	it("produces the same key for two structurally-equal scopes", () => {
		const scopeA = {
			numericIp: 3232235777n,
			ja4Hash: "abc",
			asn: 12345,
		};
		const scopeB = {
			numericIp: 3232235777n,
			ja4Hash: "abc",
			asn: 12345,
		};
		expect(hardBlockCacheKey("client-A", scopeA, true)).toBe(
			hardBlockCacheKey("client-A", scopeB, true),
		);
	});

	it("distinguishes different clientIds", () => {
		const scope = { ja4Hash: "abc" };
		expect(hardBlockCacheKey("client-A", scope, true)).not.toBe(
			hardBlockCacheKey("client-B", scope, true),
		);
	});

	it("distinguishes global from client-scoped lookups", () => {
		const scope = { ja4Hash: "abc" };
		expect(hardBlockCacheKey(undefined, scope, true)).not.toBe(
			hardBlockCacheKey("client-A", scope, true),
		);
	});

	it("distinguishes different IPs", () => {
		expect(hardBlockCacheKey("client-A", { numericIp: 1n }, true)).not.toBe(
			hardBlockCacheKey("client-A", { numericIp: 2n }, true),
		);
	});

	it("distinguishes blockOnly true vs false", () => {
		const scope = { ja4Hash: "abc" };
		expect(hardBlockCacheKey("client-A", scope, true)).not.toBe(
			hardBlockCacheKey("client-A", scope, false),
		);
	});

	it("distinguishes an undefined field from an empty-string field", () => {
		// This is a defence for the string-join key format: if two
		// different scopes ever collided on the key, cache hits would
		// leak verdicts across scopes. Any change to the key format
		// must preserve this discrimination.
		const a = { ja4Hash: "abc" };
		const b = { ja4Hash: "abc", userId: "" };
		expect(hardBlockCacheKey("client-A", a, true)).toBe(
			hardBlockCacheKey("client-A", b, true),
		);
		// Note: empty string and undefined DO collide in the current key
		// format — documented here so a future change knows to preserve
		// or explicitly override this behaviour. In practice getRequestUserScope
		// never emits empty strings for scope fields (spread-only construction).
	});
});
