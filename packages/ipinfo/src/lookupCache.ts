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

import type { IPInfoResponse } from "@prosopo/types";

export type LookupCacheConfig = {
	ttlMs: number;
	maxEntries: number;
};

/**
 * The sidecar answers from a database that only changes on redeploy, so a
 * few minutes of staleness costs nothing, while the same address is looked
 * up repeatedly: by the challenge request and then its verify, and up to
 * three times within one verify.
 */
export const DEFAULT_LOOKUP_CACHE: LookupCacheConfig = {
	ttlMs: 10 * 60 * 1000,
	maxEntries: 20_000,
};

type Entry = { value: IPInfoResponse; expiresAt: number };

/**
 * Bounded LRU + TTL cache of successful lookups. Concurrent lookups of one
 * address share a single call. Failed lookups are never stored, so a sidecar
 * timeout is retried by the next caller rather than remembered.
 */
export class LookupCache {
	private readonly entries = new Map<string, Entry>();
	private readonly inflight = new Map<string, Promise<IPInfoResponse>>();

	constructor(private readonly config: LookupCacheConfig) {}

	async getOrLookup(
		ip: string,
		lookup: (ip: string) => Promise<IPInfoResponse>,
	): Promise<IPInfoResponse> {
		const entry = this.entries.get(ip);
		if (entry && entry.expiresAt > Date.now()) {
			this.entries.delete(ip);
			this.entries.set(ip, entry);
			return entry.value;
		}
		if (entry) this.entries.delete(ip);

		const pending = this.inflight.get(ip);
		if (pending) return pending;

		const promise = lookup(ip)
			.then((value) => {
				if (value.isValid) this.store(ip, value);
				return value;
			})
			.finally(() => this.inflight.delete(ip));
		this.inflight.set(ip, promise);
		return promise;
	}

	private store(ip: string, value: IPInfoResponse): void {
		if (this.entries.size >= this.config.maxEntries) {
			const oldest = this.entries.keys().next().value;
			if (oldest !== undefined) this.entries.delete(oldest);
		}
		this.entries.set(ip, { value, expiresAt: Date.now() + this.config.ttlMs });
	}
}
