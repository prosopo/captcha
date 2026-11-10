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
import {
	ClientSettingsSchema,
	Tier,
	TrafficFilterAction,
} from "@prosopo/types";
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

	it("carries an unstamped site whose account's other sites are older than the cutoff", async () => {
		const db = await seed();
		await db.tables.accounts.collection.insertOne({
			signupEmail: "unstamped@example.com",
			tier: Tier.Free,
			users: [{ email: "unstamped@example.com", status: "active" }],
			sites: [
				{
					name: "a",
					siteKey: "stampedKeyA",
					secretKey: "s1",
					settings: settingsFor("a.example.com"),
					createdAt: 1,
					updatedAt: 500,
					active: true,
				},
				{
					name: "b",
					siteKey: "stampedKeyB",
					secretKey: "s2",
					settings: settingsFor("b.example.com"),
					createdAt: 1,
					updatedAt: 100,
					active: true,
				},
				{
					name: "c",
					siteKey: "unstampedKey",
					secretKey: "s3",
					settings: settingsFor("c.example.com"),
					createdAt: 1,
					active: true,
				},
			],
		});

		const records = await db.getUpdatedClients(1000);

		expect(records.map((r) => r.account)).toEqual(["unstampedKey"]);
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

	it("puts the account's market countries into the site's traffic filter", async () => {
		const db = await seed();
		// Inserted raw: this read-side schema declares only some settings
		// fields, and the portal writes the full settings object.
		await db.tables.accounts.collection.insertOne({
			signupEmail: "market@example.com",
			tier: Tier.Professional,
			marketCountries: ["GB", "IE"],
			users: [{ email: "market@example.com", status: "active" }],
			sites: [
				{
					name: "m",
					siteKey: "marketKey",
					secretKey: "s",
					settings: ClientSettingsSchema.parse({
						domains: ["m.example.com"],
						trafficFilter: {
							proxy: {
								action: TrafficFilterAction.Block,
								exceptions: [
									{ inMarket: true, action: TrafficFilterAction.Challenge },
								],
							},
						},
					}),
					createdAt: 1,
					updatedAt: 900,
					active: true,
				},
			],
		});

		const [record] = await db.getUpdatedClients(100);

		expect(record?.settings.trafficFilter?.marketCountries).toEqual([
			"GB",
			"IE",
		]);
		expect(record?.settings.trafficFilter?.proxy?.exceptions).toEqual([
			{ inMarket: true, action: TrafficFilterAction.Challenge },
		]);
	});

	it("skips a disabled account even when its site is inside the window", async () => {
		const db = await seed();
		await db.tables.accounts.create({
			signupEmail: "banned@example.com",
			tier: Tier.Free,
			accountDisabled: true,
			users: [{ email: "banned@example.com", status: "active" }],
			sites: [
				{
					name: "b",
					siteKey: "bannedKey",
					secretKey: "s",
					settings: settingsFor("b.example.com"),
					createdAt: 1,
					updatedAt: 900,
					active: true,
				},
			],
		});

		expect(await db.getUpdatedClients(100)).toHaveLength(0);
	});

	it("skips an inactive site on a live account", async () => {
		const db = await seed();
		await db.tables.accounts.create({
			signupEmail: "deleted-site@example.com",
			tier: Tier.Free,
			users: [{ email: "deleted-site@example.com", status: "active" }],
			sites: [
				{
					name: "gone",
					siteKey: "deletedKey",
					secretKey: "s1",
					settings: settingsFor("gone.example.com"),
					createdAt: 1,
					updatedAt: 900,
					active: false,
				},
				{
					name: "live",
					siteKey: "liveKey",
					secretKey: "s2",
					settings: settingsFor("live.example.com"),
					createdAt: 1,
					updatedAt: 900,
					active: true,
				},
			],
		});

		const records = await db.getUpdatedClients(100);

		expect(records.map((r) => r.account)).toEqual(["liveKey"]);
	});
});

describe("ClientDatabase.getRevokedSiteKeys", () => {
	let mongo: MongoMemoryServer;
	let uri: string;

	beforeAll(async () => {
		mongo = await MongoMemoryServer.create();
		uri = mongo.getUri();
	});

	afterAll(async () => {
		await mongo.stop();
	});

	it("returns every site of a disabled account and inactive sites of live accounts", async () => {
		const db = new ClientDatabase(uri, "prosopo", undefined, logger);
		await db.connect();
		await db.tables.accounts.deleteMany({});
		await db.tables.accounts.create([
			{
				signupEmail: "banned@example.com",
				tier: Tier.Free,
				accountDisabled: true,
				users: [{ email: "banned@example.com", status: "active" }],
				sites: [
					{ name: "a", siteKey: "bannedA", active: true, updatedAt: 1 },
					{ name: "b", siteKey: "bannedB", active: true, updatedAt: 1 },
				],
			},
			{
				signupEmail: "live@example.com",
				tier: Tier.Free,
				accountDisabled: false,
				users: [{ email: "live@example.com", status: "active" }],
				sites: [
					{ name: "c", siteKey: "deletedC", active: false, updatedAt: 1 },
					{ name: "d", siteKey: "liveD", active: true, updatedAt: 1 },
				],
			},
			{
				signupEmail: "untouched@example.com",
				tier: Tier.Free,
				users: [{ email: "untouched@example.com", status: "active" }],
				sites: [{ name: "e", siteKey: "liveE", active: true, updatedAt: 1 }],
			},
		]);

		const revoked = await db.getRevokedSiteKeys();

		expect(revoked.sort()).toEqual(["bannedA", "bannedB", "deletedC"]);
	});

	it("can run after getUpdatedClients on the same instance", async () => {
		const db = new ClientDatabase(uri, "prosopo", undefined, logger);
		await db.connect();
		await db.tables.accounts.deleteMany({});
		await db.tables.accounts.create({
			signupEmail: "banned-late@example.com",
			tier: Tier.Free,
			accountDisabled: true,
			users: [{ email: "banned-late@example.com", status: "active" }],
			sites: [
				{
					name: "x",
					siteKey: "bannedLate",
					secretKey: "s",
					settings: settingsFor("x.example.com"),
					active: true,
					updatedAt: 900,
				},
			],
		});

		expect(await db.getUpdatedClients(100)).toHaveLength(0);
		expect(await db.getRevokedSiteKeys()).toEqual(["bannedLate"]);
	});
});
