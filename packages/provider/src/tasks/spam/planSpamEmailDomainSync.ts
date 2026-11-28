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

import type {
	SpamEmailDomainChanges,
	SpamEmailDomainUpdate,
	StoredSpamEmailDomain,
} from "@prosopo/types-database";

const DAY_MS = 24 * 60 * 60 * 1000;

/** A blocklist that returns under this share of its previous size is treated as broken. */
export const MIN_BLOCKLIST_RETAINED_RATIO = 0.5;

export type SpamEmailDomainSyncInput = {
	stored: Iterable<StoredSpamEmailDomain>;
	/** Domains per blocklist URL, as downloaded this run. */
	blocklists: Map<string, Set<string>>;
	/** Domains on the upstream allowlists. */
	allowlist: Set<string>;
	now: Date;
	expiryDays: number;
};

export type SpamEmailDomainSyncPlan = SpamEmailDomainChanges & {
	/** Blocklists that shrank below the retained ratio; nothing expires while any did. */
	shrunkBlocklists: string[];
	storedCount: number;
	countAfter: number;
	allowlisted: number;
	expired: number;
	missing: number;
};

const sameSources = (a: string[] | undefined, b: string[]): boolean =>
	(a ?? []).length === b.length && b.every((source, i) => a?.[i] === source);

/**
 * Works out the writes that bring the stored spam email domains in line with
 * the downloaded lists. Each domain records which blocklists carry it. One no
 * blocklist carries is marked missing, and removed once it has been missing
 * for `expiryDays`. Allowlisted domains are removed outright. Hand-added rows
 * are left alone. If a blocklist shrinks sharply it is assumed broken: its
 * previous domains count as still carried and nothing expires that run.
 */
export const planSpamEmailDomainSync = ({
	stored,
	blocklists,
	allowlist,
	now,
	expiryDays,
}: SpamEmailDomainSyncInput): SpamEmailDomainSyncPlan => {
	const storedRows = Array.from(stored);
	const allowed = new Set(allowlist);
	const previousSizes = new Map<string, number>();
	for (const row of storedRows) {
		if (row.allow) {
			allowed.add(row.domain);
		}
		if (row.manual || row.allow) {
			continue;
		}
		for (const source of row.sources ?? []) {
			previousSizes.set(source, (previousSizes.get(source) ?? 0) + 1);
		}
	}

	const shrunkBlocklists = Array.from(blocklists)
		.filter(([url, domains]) => {
			const previous = previousSizes.get(url) ?? 0;
			return (
				previous > 0 && domains.size < previous * MIN_BLOCKLIST_RETAINED_RATIO
			);
		})
		.map(([url]) => url);
	const shrunk = new Set(shrunkBlocklists);

	const carriedBy = new Map<string, string[]>();
	for (const [url, domains] of blocklists) {
		for (const domain of domains) {
			if (allowed.has(domain)) {
				continue;
			}
			const sources = carriedBy.get(domain);
			if (sources) {
				sources.push(url);
			} else {
				carriedBy.set(domain, [url]);
			}
		}
	}
	const configuredOrder = Array.from(blocklists.keys());

	const expireBefore = now.getTime() - expiryDays * DAY_MS;
	const updates: SpamEmailDomainUpdate[] = [];
	const deletes: string[] = [];
	let allowlisted = 0;
	let expired = 0;
	let missing = 0;
	let kept = 0;

	for (const row of storedRows) {
		const carried = carriedBy.get(row.domain) ?? [];
		carriedBy.delete(row.domain);
		if (row.manual || row.allow) {
			kept++;
			continue;
		}
		if (allowed.has(row.domain)) {
			deletes.push(row.domain);
			allowlisted++;
			continue;
		}

		const heldOver = (row.sources ?? []).filter(
			(source) => shrunk.has(source) && !carried.includes(source),
		);
		const sources = configuredOrder.filter(
			(url) => carried.includes(url) || heldOver.includes(url),
		);
		const missingSince = sources.length > 0 ? null : (row.missingSince ?? now);
		if (
			missingSince !== null &&
			shrunk.size === 0 &&
			missingSince.getTime() <= expireBefore
		) {
			deletes.push(row.domain);
			expired++;
			continue;
		}

		kept++;
		if (missingSince !== null) {
			missing++;
		}
		const changed =
			!sameSources(row.sources, sources) ||
			(row.missingSince?.getTime() ?? null) !==
				(missingSince?.getTime() ?? null);
		if (changed) {
			updates.push({
				domain: row.domain,
				sources,
				firstSeenAt: row.firstSeenAt,
				missingSince,
			});
		}
	}

	const inserts: SpamEmailDomainUpdate[] = Array.from(
		carriedBy,
		([domain, sources]) => ({
			domain,
			sources,
			firstSeenAt: now,
			missingSince: null,
		}),
	);

	return {
		inserts,
		updates,
		deletes,
		shrunkBlocklists,
		storedCount: storedRows.length,
		countAfter: kept + inserts.length,
		allowlisted,
		expired,
		missing,
	};
};
