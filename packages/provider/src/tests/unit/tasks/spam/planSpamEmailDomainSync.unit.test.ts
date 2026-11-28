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
	StoredSpamEmailDomain,
} from "@prosopo/types-database";
import { describe, expect, it } from "vitest";
import {
	type SpamEmailDomainSyncInput,
	type SpamEmailDomainSyncPlan,
	planSpamEmailDomainSync,
} from "../../../../tasks/spam/planSpamEmailDomainSync.js";

const A = "https://lists.example/a.txt";
const B = "https://lists.example/b.txt";
const DAY_MS = 24 * 60 * 60 * 1000;
const START = new Date("2026-11-01T00:00:00Z");
const EXPIRY_DAYS = 14;

const daysAfterStart = (days: number): Date =>
	new Date(START.getTime() + days * DAY_MS);

const lists = (entries: Array<[string, string[]]>): Map<string, Set<string>> =>
	new Map(entries.map(([url, domains]) => [url, new Set(domains)]));

/** Applies a plan to an in-memory store the way writeSpamEmailDomainChanges does. */
const apply = (
	stored: StoredSpamEmailDomain[],
	changes: SpamEmailDomainChanges,
): StoredSpamEmailDomain[] => {
	const byDomain = new Map(stored.map((row) => [row.domain, { ...row }]));
	for (const change of [...changes.inserts, ...changes.updates]) {
		const row = byDomain.get(change.domain);
		if (row?.manual || row?.allow) {
			continue;
		}
		byDomain.set(change.domain, {
			domain: change.domain,
			sources: change.sources,
			firstSeenAt: change.firstSeenAt,
			missingSince: change.missingSince ?? undefined,
		});
	}
	for (const domain of changes.deletes) {
		const row = byDomain.get(domain);
		if (!row?.manual && !row?.allow) {
			byDomain.delete(domain);
		}
	}
	return Array.from(byDomain.values());
};

const sync = (
	stored: StoredSpamEmailDomain[],
	input: Omit<SpamEmailDomainSyncInput, "stored" | "expiryDays">,
): { plan: SpamEmailDomainSyncPlan; stored: StoredSpamEmailDomain[] } => {
	const plan = planSpamEmailDomainSync({
		...input,
		stored,
		expiryDays: EXPIRY_DAYS,
	});
	return { plan, stored: apply(stored, plan) };
};

const domains = (stored: StoredSpamEmailDomain[]): string[] =>
	stored.map((row) => row.domain).sort();

describe("planSpamEmailDomainSync", () => {
	it("records which lists carry each new domain", () => {
		const { plan, stored } = sync([], {
			blocklists: lists([
				[A, ["x.example", "y.example"]],
				[B, ["y.example"]],
			]),
			allowlist: new Set(),
			now: START,
		});

		expect(plan.inserts).toHaveLength(2);
		expect(stored.find((row) => row.domain === "y.example")?.sources).toEqual([
			A,
			B,
		]);
		expect(plan.countAfter).toBe(2);
	});

	it("writes nothing when the lists are unchanged", () => {
		const input = {
			blocklists: lists([[A, ["x.example"]]]),
			allowlist: new Set<string>(),
		};
		const first = sync([], { ...input, now: START });

		const { plan } = sync(first.stored, { ...input, now: daysAfterStart(1) });

		expect(plan.inserts).toEqual([]);
		expect(plan.updates).toEqual([]);
		expect(plan.deletes).toEqual([]);
	});

	it("keeps a domain that dropped off every list for the expiry window, then removes it", () => {
		let stored = sync([], {
			blocklists: lists([[A, ["keep.example", "drop.example"]]]),
			allowlist: new Set(),
			now: START,
		}).stored;
		const dropped = lists([[A, ["keep.example"]]]);

		for (const day of [0.25, 7, EXPIRY_DAYS]) {
			stored = sync(stored, {
				blocklists: dropped,
				allowlist: new Set(),
				now: daysAfterStart(day),
			}).stored;
			expect(domains(stored)).toContain("drop.example");
		}
		stored = sync(stored, {
			blocklists: dropped,
			allowlist: new Set(),
			now: daysAfterStart(EXPIRY_DAYS + 0.25),
		}).stored;

		expect(domains(stored)).toEqual(["keep.example"]);
	});

	it("starts the expiry clock again when a list carries the domain back", () => {
		let stored = sync([], {
			blocklists: lists([[A, ["back.example"]]]),
			allowlist: new Set(),
			now: START,
		}).stored;
		stored = sync(stored, {
			blocklists: lists([[A, []]]),
			allowlist: new Set(),
			now: daysAfterStart(1),
		}).stored;
		stored = sync(stored, {
			blocklists: lists([[A, ["back.example", "other.example"]]]),
			allowlist: new Set(),
			now: daysAfterStart(2),
		}).stored;
		expect(
			stored.find((row) => row.domain === "back.example")?.missingSince,
		).toBe(undefined);

		stored = sync(stored, {
			blocklists: lists([[A, ["other.example"]]]),
			allowlist: new Set(),
			now: daysAfterStart(10),
		}).stored;
		stored = sync(stored, {
			blocklists: lists([[A, ["other.example"]]]),
			allowlist: new Set(),
			now: daysAfterStart(20),
		}).stored;

		expect(domains(stored)).toContain("back.example");
	});

	it("starts the clock on rows stored before sources were tracked", () => {
		const legacy: StoredSpamEmailDomain[] = [
			{ domain: "listed.example", firstSeenAt: START },
			{ domain: "unlisted.example", firstSeenAt: START },
		];

		const first = sync(legacy, {
			blocklists: lists([[A, ["listed.example"]]]),
			allowlist: new Set(),
			now: daysAfterStart(100),
		});

		expect(first.plan.deletes).toEqual([]);
		expect(first.plan.missing).toBe(1);
		expect(
			first.stored.find((row) => row.domain === "unlisted.example")
				?.missingSince,
		).toEqual(daysAfterStart(100));
		expect(
			first.stored.find((row) => row.domain === "listed.example")?.firstSeenAt,
		).toEqual(START);

		const later = sync(first.stored, {
			blocklists: lists([[A, ["listed.example"]]]),
			allowlist: new Set(),
			now: daysAfterStart(100 + EXPIRY_DAYS),
		});
		expect(domains(later.stored)).toEqual(["listed.example"]);
	});

	it("never changes or removes hand-added domains", () => {
		const stored: StoredSpamEmailDomain[] = [
			{
				domain: "manual.example",
				manual: true,
				firstSeenAt: START,
				missingSince: START,
			},
		];

		const { plan } = sync(stored, {
			blocklists: lists([[A, ["x.example"]]]),
			allowlist: new Set(["manual.example"]),
			now: daysAfterStart(365),
		});

		expect(plan.updates).toEqual([]);
		expect(plan.deletes).toEqual([]);
		expect(plan.countAfter).toBe(2);
	});

	it("does not store an allowlisted domain even when a blocklist carries it", () => {
		const { plan } = sync([], {
			blocklists: lists([[A, ["fastmail.example", "spam.example"]]]),
			allowlist: new Set(["fastmail.example"]),
			now: START,
		});

		expect(plan.inserts.map((insert) => insert.domain)).toEqual([
			"spam.example",
		]);
	});

	it("removes a stored domain once it is allowlisted", () => {
		const stored = sync([], {
			blocklists: lists([[A, ["fastmail.example", "spam.example"]]]),
			allowlist: new Set(),
			now: START,
		}).stored;

		const { plan } = sync(stored, {
			blocklists: lists([[A, ["fastmail.example", "spam.example"]]]),
			allowlist: new Set(["fastmail.example"]),
			now: daysAfterStart(1),
		});

		expect(plan.deletes).toEqual(["fastmail.example"]);
		expect(plan.allowlisted).toBe(1);
	});

	it("treats our own allow rows as allowlisted", () => {
		const stored: StoredSpamEmailDomain[] = [
			{ domain: "ours.example", allow: true, firstSeenAt: START },
		];

		const { plan } = sync(stored, {
			blocklists: lists([[A, ["ours.example"]]]),
			allowlist: new Set(),
			now: START,
		});

		expect(plan.inserts).toEqual([]);
		expect(plan.updates).toEqual([]);
		expect(plan.deletes).toEqual([]);
	});

	it("skips expiry and keeps a shrunken list's domains when that list shrinks sharply", () => {
		const full = Array.from(
			{ length: 10 },
			(_, i) => `d${i.toString()}.example`,
		);
		let stored = sync([], {
			blocklists: lists([
				[A, full],
				[B, ["old.example", "b1.example", "b2.example"]],
			]),
			allowlist: new Set(),
			now: START,
		}).stored;
		stored = sync(stored, {
			blocklists: lists([
				[A, full],
				[B, ["b1.example", "b2.example"]],
			]),
			allowlist: new Set(),
			now: daysAfterStart(1),
		}).stored;

		const truncated = sync(stored, {
			blocklists: lists([
				[A, full.slice(0, 2)],
				[B, ["b1.example", "b2.example"]],
			]),
			allowlist: new Set(),
			now: daysAfterStart(1 + EXPIRY_DAYS),
		});

		expect(truncated.plan.shrunkBlocklists).toEqual([A]);
		expect(truncated.plan.deletes).toEqual([]);
		expect(domains(truncated.stored)).toEqual(
			[...full, "b1.example", "b2.example", "old.example"].sort(),
		);
		expect(
			truncated.stored.find((row) => row.domain === "d9.example")?.sources,
		).toEqual([A]);
	});

	it("expires as normal once the shrunken list recovers", () => {
		const full = Array.from(
			{ length: 10 },
			(_, i) => `d${i.toString()}.example`,
		);
		const stored = sync([], {
			blocklists: lists([[A, full]]),
			allowlist: new Set(),
			now: START,
		}).stored;

		const smaller = sync(stored, {
			blocklists: lists([[A, full.slice(0, 6)]]),
			allowlist: new Set(),
			now: daysAfterStart(1),
		});
		expect(smaller.plan.shrunkBlocklists).toEqual([]);

		const later = sync(smaller.stored, {
			blocklists: lists([[A, full.slice(0, 6)]]),
			allowlist: new Set(),
			now: daysAfterStart(1 + EXPIRY_DAYS),
		});
		expect(domains(later.stored)).toEqual(full.slice(0, 6).sort());
	});
});
