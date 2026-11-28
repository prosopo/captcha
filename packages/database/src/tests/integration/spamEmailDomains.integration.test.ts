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

import { LogLevel, getLogger } from "@prosopo/logger";
import type {
	SpamEmailDomain,
	SpamEmailDomainUpdate,
	StoredSpamEmailDomain,
} from "@prosopo/types-database";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ProviderDatabase } from "../../databases/provider.js";

const logger = getLogger(LogLevel.enum.error, "spamEmailDomains.test");

class MongoOnlyProviderDatabase extends ProviderDatabase {
	protected override async setupRedis(): Promise<void> {}
}

const LIST = "https://lists.example/blocklist.txt";
const NOW = new Date("2026-11-28T00:00:00Z");

const change = (
	domain: string,
	missingSince: Date | null = null,
): SpamEmailDomainUpdate => ({
	domain,
	sources: missingSince ? [] : [LIST],
	firstSeenAt: NOW,
	missingSince,
});

const storedRows = async (
	db: ProviderDatabase,
): Promise<StoredSpamEmailDomain[]> => {
	const rows: StoredSpamEmailDomain[] = [];
	for await (const row of db.getAllSpamEmailDomains()) {
		rows.push(row);
	}
	return rows.sort((a, b) => a.domain.localeCompare(b.domain));
};

describe("ProviderDatabase spam email domains", () => {
	let mongo: MongoMemoryServer;
	let db: ProviderDatabase;

	beforeAll(async () => {
		mongo = await MongoMemoryServer.create();
		db = new MongoOnlyProviderDatabase({
			mongo: { url: mongo.getUri(), dbname: "prosopo" },
			logger,
		});
		await db.connect();
		await db.getTables().spamEmailDomain.syncIndexes();
	});

	afterAll(async () => {
		await db.close();
		await mongo.stop();
	});

	beforeEach(async () => {
		await db.getTables().spamEmailDomain.deleteMany({});
	});

	it("inserts, updates and deletes in one pass", async () => {
		await db.writeSpamEmailDomainChanges({
			inserts: [change("a.example"), change("b.example"), change("c.example")],
			updates: [],
			deletes: [],
		});
		await db.writeSpamEmailDomainChanges({
			inserts: [],
			updates: [change("a.example", NOW)],
			deletes: ["b.example"],
		});

		const rows = await storedRows(db);
		expect(rows.map((row) => row.domain)).toEqual(["a.example", "c.example"]);
		expect(rows[0]?.missingSince).toEqual(NOW);
		expect(rows[0]?.sources).toEqual([]);
		expect(rows[1]?.sources).toEqual([LIST]);
		expect(rows[1]?.missingSince).toBeUndefined();
	});

	it("clears missingSince when a list carries the domain again", async () => {
		await db.writeSpamEmailDomainChanges({
			inserts: [change("a.example", NOW)],
			updates: [],
			deletes: [],
		});
		await db.writeSpamEmailDomainChanges({
			inserts: [],
			updates: [change("a.example")],
			deletes: [],
		});

		const [row] = await storedRows(db);
		expect(row?.missingSince).toBeUndefined();
		expect(row?.sources).toEqual([LIST]);
	});

	it("dates rows from before firstSeenAt existed by their insert time", async () => {
		await db.getTables().spamEmailDomain.create({ domain: "old.example" });

		const [row] = await storedRows(db);
		expect(row?.firstSeenAt).toBeInstanceOf(Date);
		expect(
			Math.abs((row?.firstSeenAt.getTime() ?? 0) - Date.now()),
		).toBeLessThan(60_000);
	});

	it("never updates or deletes hand-added rows", async () => {
		const handAdded: SpamEmailDomain[] = [
			{ domain: "manual.example", manual: true },
			{ domain: "allowed.example", allow: true },
		];
		await db.getTables().spamEmailDomain.insertMany(handAdded);

		await db.writeSpamEmailDomainChanges({
			inserts: [],
			updates: [change("manual.example", NOW)],
			deletes: ["manual.example", "allowed.example"],
		});

		const rows = await storedRows(db);
		expect(rows.map((row) => row.domain)).toEqual([
			"allowed.example",
			"manual.example",
		]);
		expect(rows[1]?.missingSince).toBeUndefined();
	});

	it("writes more rows than one batch holds", async () => {
		const domains = Array.from(
			{ length: 2500 },
			(_, i) => `d${i.toString()}.example`,
		);
		await db.writeSpamEmailDomainChanges({
			inserts: domains.map((domain) => change(domain)),
			updates: [],
			deletes: [],
		});
		await db.writeSpamEmailDomainChanges({
			inserts: [],
			updates: [],
			deletes: domains.slice(0, 2100),
		});

		expect(await db.getTables().spamEmailDomain.countDocuments()).toBe(400);
	});

	it("does not flag an allowlisted domain or its subdomains", async () => {
		const rows: SpamEmailDomain[] = [
			{ domain: "spam.example" },
			{ domain: "fastmail.example", allow: true },
		];
		await db.getTables().spamEmailDomain.insertMany(rows);

		expect((await db.getSpamEmailDomain("spam.example"))?.domain).toBe(
			"spam.example",
		);
		expect(await db.getSpamEmailDomain("fastmail.example")).toBeNull();
		expect(await db.getSpamEmailDomain("mail.fastmail.example")).toBeNull();
	});

	it("hand-adds a domain so the sync never touches it", async () => {
		await db.writeSpamEmailDomainChanges({
			inserts: [change("kept.example", NOW)],
			updates: [],
			deletes: [],
		});

		await db.setHandAddedSpamEmailDomain("kept.example", "block");
		await db.setHandAddedSpamEmailDomain("real.example", "allow");
		await db.writeSpamEmailDomainChanges({
			inserts: [],
			updates: [change("kept.example", NOW)],
			deletes: ["kept.example", "real.example"],
		});

		const rows = await storedRows(db);
		expect(rows.map((row) => [row.domain, row.manual, row.allow])).toEqual([
			["kept.example", true, undefined],
			["real.example", undefined, true],
		]);
		expect(rows[0]?.missingSince).toBeUndefined();
		expect((await db.getSpamEmailDomain("kept.example"))?.domain).toBe(
			"kept.example",
		);
		expect(await db.getSpamEmailDomain("real.example")).toBeNull();
	});
});
