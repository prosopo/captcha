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
// rules. A 30s window collapses N identical scopes to one Redis
// round-trip while keeping operator-added rules effective within a
// bounded lag. Tuned short enough that new rules take effect on the
// next few requests rather than needing an explicit flush.
export const DEFAULT_VERDICT_CACHE_TTL_MS = 30_000;

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
 * Bounded TTL cache for hard-block verdicts. Insertion-order eviction
 * (Map iteration order = insertion order) approximates LRU on the write
 * side; lazy expiry drops stale entries on read. Not a real LRU because
 * the hard-block workload is dominated by hot-scope repeat traffic where
 * insertion-order eviction and LRU converge — the extra bookkeeping
 * cost of a doubly-linked-list LRU would eat the win we're chasing.
 */
export class HardBlockVerdictCache {
	private readonly store = new Map<string, CacheEntry>();

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
		return entry.value;
	}

	set(key: string, value: AccessRule[]): void {
		if (this.store.size >= this.maxEntries) {
			// Map iteration order is insertion order — first entry is the
			// oldest. Drop until we're under the cap. Usually just one.
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

	// Test/ops hook — the running cache is not exposed on the wire, but
	// admin tooling (e.g. a rule-mutation notifier) may need to flush
	// after a bulk insert to bound the staleness window.
	clear(): void {
		this.store.clear();
	}

	size(): number {
		return this.store.size;
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
