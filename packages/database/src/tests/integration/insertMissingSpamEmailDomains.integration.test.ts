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
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ProviderDatabase } from "../../databases/provider.js";

// The spam domain sync used to upsert the full ~225k-domain list every six
// hours, rewriting every row on every provider at once. It now writes only
// the domains that are not stored yet. These tests pin that it still ends up
// with the full set, and that a repeat run with the same list writes nothing.

const logger = getLogger(
	LogLevel.enum.error,
	"insertMissingSpamEmailDomains.test",
);

// The spam domain path only touches Mongo, so skip the Redis connection.
class MongoOnlyProviderDatabase extends ProviderDatabase {
	protected override async setupRedis(): Promise<void> {}
}

const storedDomains = async (db: ProviderDatabase): Promise<string[]> => {
	const records: Array<{ domain: string }> = await db
		.getTables()
		.spamEmailDomain.find({}, { domain: 1, _id: 0 })
		.lean<Array<{ domain: string }>>();
	return records.map((record) => record.domain).sort();
};

describe("ProviderDatabase.insertMissingSpamEmailDomains", () => {
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

	it("stores every domain on an empty collection", async () => {
		const added = await db.insertMissingSpamEmailDomains([
			"a.example",
			"b.example",
		]);

		expect(added).toBe(2);
		expect(await storedDomains(db)).toEqual(["a.example", "b.example"]);
	});

	it("only writes domains that are not stored yet", async () => {
		await db.insertMissingSpamEmailDomains(["a.example", "b.example"]);

		const added = await db.insertMissingSpamEmailDomains(
			new Set(["a.example", "b.example", "c.example"]),
		);

		expect(added).toBe(1);
		expect(await storedDomains(db)).toEqual([
			"a.example",
			"b.example",
			"c.example",
		]);
	});

	it("writes nothing when the list is unchanged", async () => {
		await db.insertMissingSpamEmailDomains(["a.example", "b.example"]);
		const before: Array<{ _id: unknown; domain: string }> = await db
			.getTables()
			.spamEmailDomain.find({})
			.lean<Array<{ _id: unknown; domain: string }>>();

		const added = await db.insertMissingSpamEmailDomains([
			"b.example",
			"a.example",
		]);

		const after: Array<{ _id: unknown; domain: string }> = await db
			.getTables()
			.spamEmailDomain.find({})
			.lean<Array<{ _id: unknown; domain: string }>>();
		expect(added).toBe(0);
		expect(after).toEqual(before);
	});

	it("keeps domains that have dropped off the source lists", async () => {
		await db.insertMissingSpamEmailDomains(["a.example", "b.example"]);

		const added = await db.insertMissingSpamEmailDomains(["a.example"]);

		expect(added).toBe(0);
		expect(await storedDomains(db)).toEqual(["a.example", "b.example"]);
	});

	it("reads existing domains from the index without fetching documents", async () => {
		await db.insertMissingSpamEmailDomains(["a.example", "b.example"]);

		// Mongoose types `.explain()` as returning documents, so go through the
		// driver, which types it as the explain output.
		const explain = await db
			.getTables()
			.spamEmailDomain.collection.find(
				{},
				{ projection: { domain: 1, _id: 0 }, hint: { domain: 1 } },
			)
			.explain("executionStats");
		const stats: { totalDocsExamined: number; totalKeysExamined: number } =
			explain.executionStats;

		expect(stats.totalDocsExamined).toBe(0);
		expect(stats.totalKeysExamined).toBe(2);
	});

	it("does nothing for an empty list", async () => {
		expect(await db.insertMissingSpamEmailDomains([])).toBe(0);
		expect(await storedDomains(db)).toEqual([]);
	});
});
