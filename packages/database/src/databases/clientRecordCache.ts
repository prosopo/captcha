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

import type { ClientRecord } from "@prosopo/types-database";

/**
 * Every client-record write in this process clears the cache, so the TTL only
 * bounds staleness from writes made outside it, such as a hand edit in Mongo.
 * Settings already take minutes to reach a provider through the client-list
 * sync, so 30s is well inside what operators see today.
 */
export const CLIENT_RECORD_CACHE_TTL_MS = 30_000;
const CLIENT_RECORD_CACHE_MAX_ENTRIES = 50_000;

type Entry = { record: ClientRecord; expiresAt: number };

/**
 * Shared by every database instance in the process, because the client-list
 * scheduler writes through its own instance and those writes must clear the
 * entries the request path reads. Missing records are never cached, so a site
 * key registered elsewhere is found as soon as it lands.
 */
class ClientRecordCache {
	private readonly entries = new Map<string, Entry>();

	get(key: string): ClientRecord | undefined {
		const entry = this.entries.get(key);
		if (!entry) return undefined;
		if (entry.expiresAt <= Date.now()) {
			this.entries.delete(key);
			return undefined;
		}
		// A copy, so a caller that edits its record cannot change what the
		// next caller reads.
		return structuredClone(entry.record);
	}

	set(key: string, record: ClientRecord): void {
		if (this.entries.size >= CLIENT_RECORD_CACHE_MAX_ENTRIES) {
			this.entries.clear();
		}
		this.entries.set(key, {
			record: structuredClone(record),
			expiresAt: Date.now() + CLIENT_RECORD_CACHE_TTL_MS,
		});
	}

	clear(): void {
		this.entries.clear();
	}
}

export const clientRecordCache = new ClientRecordCache();
