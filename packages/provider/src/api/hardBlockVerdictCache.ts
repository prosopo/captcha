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

import type { AccessRule, UserScope } from "@prosopo/user-access-policy";

// Process-wide TTL for cached hard-block verdicts. Under burst traffic
// against a large bulk-banned scope population, every identical request
// otherwise re-runs the full FT.AGGREGATE against tens of thousands of
// rules. A 10s window still absorbs typical retry-loop bursts (which
// complete in single-digit seconds) while bounding operator-response
// lag: a rule add/remove is reflected in at most 10s of cached
// "stale" verdicts. For true zero-lag invalidation the write path
// would need to broadcast a flush signal (Redis pub/sub); the 10s TTL
// is the no-broadcast fallback.
export const DEFAULT_VERDICT_CACHE_TTL_MS = 10_000;

// Bounded so a wide-open unique-scope attack can't grow the map
// unboundedly. 50k entries × ~1 KiB per rule payload ≈ 50 MiB
// worst case per provider process — well within budget for this
// workload and enough coverage for realistic per-tenant scope
// cardinality (unique {ip, ja4, ua, country, asn} tuples).
export const DEFAULT_VERDICT_CACHE_MAX_ENTRIES = 50_000;

type CacheEntry = {
	value: AccessRule[];
	expiresAt: number;
};

/**
 * Bounded LRU + TTL cache for hard-block verdicts, with singleflight
 * dedupe of concurrent misses.
 *
 * Eviction is real LRU: `get()` moves the hit entry to the tail of the
 * Map's iteration order (Map iteration = insertion order in JS), so
 * `set()` drops the least-recently-used entry once the cap is reached.
 * Absolute TTL is preserved on hit — `expiresAt` is set at insert and
 * never refreshed, so a hot key can't stay stale beyond ttlMs no matter
 * how often it's accessed.
 *
 * `getOrCompute()` is the singleflight entry point: if a concurrent
 * caller is already computing the value for `key`, joiners return the
 * same in-flight Promise instead of racing to the underlying storage.
 * Kills the wave-1 stampede where N identical concurrent requests all
 * miss the cache simultaneously and all hit Redis before the first has
 * populated the entry.
 */
export class HardBlockVerdictCache {
	private readonly store = new Map<string, CacheEntry>();
	private readonly inflight = new Map<string, Promise<AccessRule[]>>();

	constructor(
		private readonly ttlMs: number = DEFAULT_VERDICT_CACHE_TTL_MS,
		private readonly maxEntries: number = DEFAULT_VERDICT_CACHE_MAX_ENTRIES,
	) {}

	get(key: string): AccessRule[] | undefined {
		const entry = this.store.get(key);
		if (entry === undefined) {
			return undefined;
		}
		if (entry.expiresAt <= Date.now()) {
			this.store.delete(key);
			return undefined;
		}
		// LRU move-to-tail, keeping the original `expiresAt`.
		this.store.delete(key);
		this.store.set(key, entry);
		return entry.value;
	}

	set(key: string, value: AccessRule[]): void {
		// Delete first so an update lands at the tail and the size check
		// below never evicts on an update.
		this.store.delete(key);
		if (this.store.size >= this.maxEntries) {
			const oldest = this.store.keys().next().value;
			if (oldest !== undefined) {
				this.store.delete(oldest);
			}
		}
		this.store.set(key, {
			value,
			expiresAt: Date.now() + this.ttlMs,
		});
	}

	/**
	 * Cache lookup with singleflight dedupe of concurrent misses. On a miss,
	 * joins an in-flight computation for the key if there is one; otherwise
	 * runs `compute()` and caches its result. The in-flight entry is removed in
	 * a `finally` so a rejection doesn't wedge future callers.
	 *
	 * If `compute()` rejects, every joined waiter sees the same rejection and
	 * nothing is cached.
	 */
	async getOrCompute(
		key: string,
		compute: () => Promise<AccessRule[]>,
	): Promise<AccessRule[]> {
		const cached = this.get(key);
		if (cached !== undefined) {
			return cached;
		}
		const existing = this.inflight.get(key);
		if (existing !== undefined) {
			return existing;
		}
		const promise = (async () => {
			const value = await compute();
			this.set(key, value);
			return value;
		})();
		this.inflight.set(key, promise);
		try {
			return await promise;
		} finally {
			// Only delete our own entry: clear() may have dropped it while we
			// awaited, and a newer call for the same key registered its own.
			if (this.inflight.get(key) === promise) {
				this.inflight.delete(key);
			}
		}
	}

	// Flushed after rule mutations to bound the staleness window. Clears
	// in-flight Promises too so a mutation can't leave a stale computation
	// to repopulate lookups.
	clear(): void {
		this.store.clear();
		this.inflight.clear();
	}

	size(): number {
		return this.store.size;
	}

	// Test hook: number of in-flight computations. Not on the hot path.
	inflightSize(): number {
		return this.inflight.size;
	}
}

// A stable string key from (clientId, userScope, blockOnly,
// includeDeferred). Any two requests whose access-rule inputs are equal
// must hash to the same key, so BigInts are serialised as strings and
// fields are enumerated in a fixed order — do NOT change without also
// flushing all in-flight caches on the deploy.
//
// `includeDeferred` is part of the key because it widens the candidate
// pool: the middleware's blockOnly lookup and the verify-time lookup
// share a scope but must not share a cached result.
export const hardBlockCacheKey = (
	clientId: string | undefined,
	userScope: UserScope,
	blockOnly: boolean,
	includeDeferred = false,
): string => {
	const bo = `${blockOnly ? "1" : "0"}${includeDeferred ? "d" : ""}`;
	const parts = [
		clientId ?? "",
		userScope.numericIp === undefined ? "" : userScope.numericIp.toString(),
		userScope.numericIpMaskMin === undefined
			? ""
			: userScope.numericIpMaskMin.toString(),
		userScope.numericIpMaskMax === undefined
			? ""
			: userScope.numericIpMaskMax.toString(),
		userScope.userId ?? "",
		userScope.ja4Hash ?? "",
		userScope.headersHash ?? "",
		userScope.userAgentHash ?? "",
		userScope.headHash ?? "",
		userScope.coords ?? "",
		userScope.countryCode ?? "",
		userScope.asn === undefined ? "" : String(userScope.asn),
	];
	return `${bo}|${parts.join("|")}`;
};
