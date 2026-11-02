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
import { ClientSettingsSchema, Tier } from "@prosopo/types";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clientRecordCache } from "../../databases/clientRecordCache.js";
import { ProviderDatabase } from "../../databases/provider.js";

// Every verify reads the site's client record. These pin that a repeat read
// is served from memory, and that every way this process writes a client
// record makes the next read see the write.

const logger = getLogger(LogLevel.enum.error, "clientRecordCache.test");

class TestProviderDatabase extends ProviderDatabase {
	protected override async setupRedis(): Promise<void> {
		// intentionally empty
	}
}

const ACCOUNT = "site-key";

const record = (domain: string) => ({
	account: ACCOUNT,
	tier: Tier.Professional,
	settings: ClientSettingsSchema.parse({ domains: [domain] }),
});

describe("ProviderDatabase.getClientRecord cache", () => {
	let mongod: MongoMemoryServer;
	let db: TestProviderDatabase;

	beforeAll(async () => {
		mongod = await MongoMemoryServer.create({
			instance: { launchTimeout: 60_000 },
		});
		db = new TestProviderDatabase({
			mongo: { url: mongod.getUri(), dbname: "provider" },
			logger,
		});
		await db.connect();
	}, 90_000);

	afterAll(async () => {
		await db.close();
		await mongod.stop();
	});

	beforeEach(async () => {
		await db.tables.client.deleteMany({});
		clientRecordCache.clear();
	});

	const writeBehindTheCache = (domain: string) =>
		db.tables.client.updateOne(
			{ account: ACCOUNT },
			{ $set: { "settings.domains": [domain] } },
		);

	it("serves a repeat read without going back to Mongo", async () => {
		await db.updateClientRecords([record("first.example")]);
		await db.getClientRecord(ACCOUNT);

		await writeBehindTheCache("second.example");

		const cached = await db.getClientRecord(ACCOUNT);
		expect(cached?.settings.domains).toEqual(["first.example"]);
	});

	it("sees a write made through updateClientRecords straight away", async () => {
		await db.updateClientRecords([record("first.example")]);
		await db.getClientRecord(ACCOUNT);

		await db.updateClientRecords([record("second.example")]);

		const fresh = await db.getClientRecord(ACCOUNT);
		expect(fresh?.settings.domains).toEqual(["second.example"]);
	});

	it("sees a write made through another database instance", async () => {
		const other = new TestProviderDatabase({
			mongo: { url: mongod.getUri(), dbname: "provider" },
			logger,
		});
		await other.connect();
		await db.updateClientRecords([record("first.example")]);
		await db.getClientRecord(ACCOUNT);

		await other.updateClientRecords([record("second.example")]);

		const fresh = await db.getClientRecord(ACCOUNT);
		expect(fresh?.settings.domains).toEqual(["second.example"]);
		await other.close();
	});

	it("stops returning a removed site", async () => {
		await db.updateClientRecords([record("first.example")]);
		await db.getClientRecord(ACCOUNT);

		await db.removeClientRecords([ACCOUNT]);

		expect(await db.getClientRecord(ACCOUNT)).toBeUndefined();
	});

	it("does not remember that a site was missing", async () => {
		expect(await db.getClientRecord(ACCOUNT)).toBeUndefined();

		await db.tables.client.create(record("first.example"));

		const found = await db.getClientRecord(ACCOUNT);
		expect(found?.settings.domains).toEqual(["first.example"]);
	});

	it("hands each caller its own copy", async () => {
		await db.updateClientRecords([record("first.example")]);
		const first = await db.getClientRecord(ACCOUNT);
		first?.settings.domains.push("edited.example");

		const second = await db.getClientRecord(ACCOUNT);
		expect(second?.settings.domains).toEqual(["first.example"]);
	});
});
