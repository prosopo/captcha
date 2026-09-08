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
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ClientDatabase } from "../../databases/client.js";

// `getUpdatedClients` reads the portal's `accounts` collection, where `sites`
// is an ARRAY. It used to map `record.sites.siteKey` — a property that does
// not exist on an array — so every record came back as
// `{ account: undefined }`. Downstream, `updateClientRecords` upserts filtered
// on `account`, so an entire poll's worth of sites collapsed into one row and
// no site's settings were ever carried to a provider.
//
// These tests pin the flattening: one record per site, with the account's
// tier attached and the site's own settings.

const logger = getLogger(LogLevel.enum.error, "getUpdatedClients.test");

const settingsFor = (domain: string) =>
	ClientSettingsSchema.parse({ domains: [domain] });

describe("ClientDatabase.getUpdatedClients", () => {
	let mongo: MongoMemoryServer;
	let uri: string;

	beforeAll(async () => {
		mongo = await MongoMemoryServer.create();
		uri = mongo.getUri();
	});

	afterAll(async () => {
		await mongo.stop();
	});

	const seed = async (): Promise<ClientDatabase> => {
		const db = new ClientDatabase(uri, "prosopo", undefined, logger);
		await db.connect();
		await db.tables.accounts.deleteMany({});
		return db;
	};

	it("returns one record per site, not one per account", async () => {
		const db = await seed();
		await db.tables.accounts.create({
			signupEmail: "two-sites@example.com",
			tier: Tier.Professional,
			users: [{ email: "two-sites@example.com", status: "active" }],
			sites: [
				{
					name: "a",
					siteKey: "siteKeyA",
					secretKey: "secretA",
					settings: settingsFor("a.example.com"),
					createdAt: 1,
					updatedAt: 500,
					active: true,
				},
				{
					name: "b",
					siteKey: "siteKeyB",
					secretKey: "secretB",
					settings: settingsFor("b.example.com"),
					createdAt: 1,
					updatedAt: 500,
					active: true,
				},
			],
		});

		const records = await db.getUpdatedClients(100);

		expect(records).toHaveLength(2);
		// The original bug produced `undefined` here for every record.
		expect(records.map((r) => r.account).sort()).toEqual([
			"siteKeyA",
			"siteKeyB",
		]);
		expect(records.every((r) => r.account !== undefined)).toBe(true);
		expect(records.map((r) => r.tier)).toEqual([
			Tier.Professional,
			Tier.Professional,
		]);
		const a = records.find((r) => r.account === "siteKeyA");
		expect(a?.settings.domains).toEqual(["a.example.com"]);
	});

	it("carries only the sites newer than the cutoff", async () => {
		const db = await seed();
		await db.tables.accounts.create({
			signupEmail: "mixed@example.com",
			tier: Tier.Free,
			users: [{ email: "mixed@example.com", status: "active" }],
			sites: [
				{
					name: "stale",
					siteKey: "staleKey",
					secretKey: "s1",
					settings: settingsFor("stale.example.com"),
					createdAt: 1,
					updatedAt: 100,
					active: true,
				},
				{
					name: "fresh",
					siteKey: "freshKey",
					secretKey: "s2",
					settings: settingsFor("fresh.example.com"),
					createdAt: 1,
					updatedAt: 900,
					active: true,
				},
			],
		});

		const records = await db.getUpdatedClients(500);

		// The account matches at document level because of `freshKey`; the
		// per-site test is what keeps `staleKey` out.
		expect(records.map((r) => r.account)).toEqual(["freshKey"]);
	});

	it("skips accounts with no active user", async () => {
		const db = await seed();
		await db.tables.accounts.create({
			signupEmail: "inactive@example.com",
			tier: Tier.Free,
			users: [{ email: "inactive@example.com", status: "pending" }],
			sites: [
				{
					name: "x",
					siteKey: "inactiveKey",
					secretKey: "s",
					settings: settingsFor("x.example.com"),
					createdAt: 1,
					updatedAt: 900,
					active: true,
				},
			],
		});

		expect(await db.getUpdatedClients(100)).toHaveLength(0);
	});
});
