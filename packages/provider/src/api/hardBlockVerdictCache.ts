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
	// Keyed by cache key; each Promise resolves to the value the
	// computer produced. Populated at getOrCompute call time and cleared
	// in a finally so a rejected computation doesn't wedge future
	// callers on the same key. See getOrCompute for the ordering
	// guarantees.
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
		// LRU move-to-tail. delete + set is O(1) and re-orders the key
		// to the end of the Map's iteration order without touching
		// `expiresAt` — the absolute TTL is preserved so a hot key
		// can't outlive its freshness window.
		this.store.delete(key);
		this.store.set(key, entry);
		return entry.value;
	}

	set(key: string, value: AccessRule[]): void {
		// If the key already exists, delete first so the re-insert
		// lands at the tail (as an LRU update) rather than in its old
		// slot. Size check runs against the post-delete state so an
		// update never triggers a spurious eviction.
		this.store.delete(key);
		if (this.store.size >= this.maxEntries) {
			// Map iteration order is insertion order — with move-to-tail
			// in get() this makes the first entry the least-recently-
			// used. Drop until we're under the cap. Usually just one.
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
	 * Cache lookup with singleflight dedupe of concurrent misses.
	 *
	 * Fast path: cache hit → return immediately (with LRU move-to-tail
	 * via `get()`).
	 *
	 * Slow path: cache miss →
	 *   1. If an in-flight Promise exists for this key, join it. This
	 *      is the coalescing behaviour — N concurrent identical misses
	 *      all await the same underlying storage call.
	 *   2. Otherwise, invoke `compute()`, register the Promise, and
	 *      populate the cache with the result on resolve. The Promise
	 *      is removed from the in-flight map in a `finally` so a
	 *      rejection doesn't wedge future callers.
	 *
	 * Rejection semantics: if `compute()` throws, all joined waiters
	 * see the same rejection. Callers should handle it — the underlying
	 * `getPrioritisedAccessRule` catches its own storage errors and
	 * returns `[]` (fail-open), so in practice this never propagates.
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
			// Only delete our own entry — a subsequent unrelated
			// getOrCompute for the same key could have already
			// replaced it in the map (race not possible in single-
			// threaded Node event loop, but defensive against future
			// changes).
			if (this.inflight.get(key) === promise) {
				this.inflight.delete(key);
			}
		}
	}

	// Test/ops hook — the running cache is not exposed on the wire, but
	// admin tooling (e.g. a rule-mutation notifier) may need to flush
	// after a bulk insert to bound the staleness window. Clears both
	// the stored entries and any in-flight Promises so a rule mutation
	// can't leave a stale computation in flight.
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

// A stable string key from (clientId, userScope, blockOnly). Any two
// requests whose access-rule inputs are equal must hash to the same key,
// so BigInts are serialised as strings and fields are enumerated in a
// fixed order — do NOT change without also flushing all in-flight
// caches on the deploy.
export const hardBlockCacheKey = (
	clientId: string | undefined,
	userScope: UserScope,
	blockOnly: boolean,
): string => {
	const bo = blockOnly ? "1" : "0";
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
