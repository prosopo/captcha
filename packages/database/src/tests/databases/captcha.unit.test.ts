// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { getLogger } from "@prosopo/common";
import type {
	CaptchaProperties,
	ICaptchaDatabase,
	PoWCaptchaRecord,
	StoredSession,
	UserCommitmentRecord,
} from "@prosopo/types-database";
import { MongoMemoryServer } from "mongodb-memory-server";
import type { RootFilterQuery } from "mongoose";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	expectTypeOf,
	it,
} from "vitest";
import { MongoDatabase } from "../../base/mongo.js";
import { CaptchaDatabase } from "../../databases/captcha.js";

describe("CaptchaDatabase", () => {
	let db: CaptchaDatabase;
	let mongoServer: MongoMemoryServer;
	const logger = getLogger("info", import.meta.url);

	beforeEach(async () => {
		mongoServer = await MongoMemoryServer.create();
		const uri = mongoServer.getUri();
		db = new CaptchaDatabase(uri, "test-captcha-db", undefined, logger);
	});

	afterEach(async () => {
		if (db.connected) {
			await db.close();
		}
		if (mongoServer) {
			await mongoServer.stop();
		}
	});

	describe("constructor", () => {
		it("should create instance extending MongoDatabase", () => {
			expect(db).toBeInstanceOf(MongoDatabase);
		});

		it("should initialize tables as empty object", () => {
			expect(db.tables).toEqual({});
		});

		it("should initialize indexesEnsured as false", () => {
			// @ts-expect-error - accessing private property for test
			expect(db.indexesEnsured).toBe(false);
		});
	});

	describe("connect", () => {
		it("should establish connection and load tables", async () => {
			await db.connect();
			expect(db.connected).toBe(true);
			expect(db.tables).toBeDefined();
			expect(db.tables.session).toBeDefined();
			expect(db.tables.powcaptcha).toBeDefined();
			expect(db.tables.commitment).toBeDefined();
		});
	});

	describe("getTables", () => {
		it("should throw error when tables are undefined", () => {
			const instance = new CaptchaDatabase("", "test-db", undefined, logger);
			// @ts-expect-error - testing error case
			instance.tables = undefined;
			expect(() => instance.getTables()).toThrow();
		});

		it("should return tables after connection", async () => {
			await db.connect();
			const tables = db.getTables();
			expect(tables).toBeDefined();
			expectTypeOf(tables).toMatchTypeOf<db["tables"]>();
		});
	});

	describe("ensureIndexes", () => {
		it("should ensure indexes for all collections", async () => {
			await db.connect();
			await db.ensureIndexes();
			// @ts-expect-error - accessing private property for test
			expect(db.indexesEnsured).toBe(true);
		});

		it("should only ensure indexes once", async () => {
			await db.connect();
			await db.ensureIndexes();
			// @ts-expect-error - accessing private property for test
			const firstEnsured = db.indexesEnsured;
			await db.ensureIndexes();
			// @ts-expect-error - accessing private property for test
			expect(db.indexesEnsured).toBe(firstEnsured);
		});

		it("should handle index creation errors gracefully", async () => {
			await db.connect();
			// Should not throw even if indexes fail
			await expect(db.ensureIndexes()).resolves.not.toThrow();
		});
	});

	describe("saveCaptchas", () => {
		it("should save session events", async () => {
			await db.connect();
			const sessionEvents: StoredSession[] = [
				{
					sessionId: "test-session-1",
					token: "test-token",
					userSitekeyIpHash: "hash",
					lastUpdatedTimestamp: new Date(),
				} as StoredSession,
			];

			await db.saveCaptchas(sessionEvents, [], []);
			const saved = await db.tables.session.findOne({
				sessionId: "test-session-1",
			});
			expect(saved).toBeDefined();
		});

		it("should upsert image captcha events", async () => {
			await db.connect();
			const imageEvents: UserCommitmentRecord[] = [
				{
					id: "test-commitment-1",
					userAccount: "user1",
					dappAccount: "dapp1",
					lastUpdatedTimestamp: new Date(),
				} as UserCommitmentRecord,
			];

			await db.saveCaptchas([], imageEvents, []);
			const saved = await db.tables.commitment.findOne({
				id: "test-commitment-1",
			});
			expect(saved).toBeDefined();
		});

		it("should upsert PoW captcha events", async () => {
			await db.connect();
			const powEvents: PoWCaptchaRecord[] = [
				{
					challenge: "test-challenge-1",
					userAccount: "user1",
					dappAccount: "dapp1",
					requestedAtTimestamp: new Date(),
					ipAddress: { ipv4: "127.0.0.1" },
					headers: {},
					ja4: "test-ja4",
					result: { status: "pending" },
					userSubmitted: false,
					serverChecked: false,
					difficulty: 1,
					providerSignature: "sig",
					lastUpdatedTimestamp: new Date(),
				} as PoWCaptchaRecord,
			];

			await db.saveCaptchas([], [], powEvents);
			const saved = await db.tables.powcaptcha.findOne({
				challenge: "test-challenge-1",
			});
			expect(saved).toBeDefined();
		});

		it("should handle empty arrays", async () => {
			await db.connect();
			await expect(db.saveCaptchas([], [], [])).resolves.not.toThrow();
		});

		it("should remove _id field from documents before saving", async () => {
			await db.connect();
			const sessionEvents: StoredSession[] = [
				{
					// biome-ignore lint/suspicious/noExplicitAny: Testing _id field removal
					_id: "should-be-removed" as any,
					sessionId: "test-session-2",
					token: "test-token-2",
					userSitekeyIpHash: "hash-2",
					lastUpdatedTimestamp: new Date(),
				} as StoredSession,
			];

			await db.saveCaptchas(sessionEvents, [], []);
			const saved = await db.tables.session.findOne({
				sessionId: "test-session-2",
			});
			expect(saved).toBeDefined();
		});

		it("should close connection after saving", async () => {
			await db.connect();
			await db.saveCaptchas([], [], []);
			expect(db.connected).toBe(false);
		});
	});

	describe("getCaptchas", () => {
		it("should return empty arrays when no captchas found", async () => {
			await db.connect();
			const result = await db.getCaptchas();
			expect(result.userCommitmentRecords).toEqual([]);
			expect(result.powCaptchaRecords).toEqual([]);
			expectTypeOf(result).toMatchTypeOf<{
				userCommitmentRecords: UserCommitmentRecord[];
				powCaptchaRecords: PoWCaptchaRecord[];
			}>();
		});

		it("should respect limit parameter", async () => {
			await db.connect();
			const result = await db.getCaptchas({}, 5);
			expectTypeOf(result).toMatchTypeOf<{
				userCommitmentRecords: UserCommitmentRecord[];
				powCaptchaRecords: PoWCaptchaRecord[];
			}>();
		});

		it("should apply filter to queries", async () => {
			await db.connect();
			const filter: RootFilterQuery<CaptchaProperties> = {
				userAccount: "test-user",
			};
			const result = await db.getCaptchas(filter, 10);
			expectTypeOf(result).toMatchTypeOf<{
				userCommitmentRecords: UserCommitmentRecord[];
				powCaptchaRecords: PoWCaptchaRecord[];
			}>();
		});

		it("should throw error on query failure", async () => {
			await db.connect();
			// Close connection to cause error
			await db.close();
			// Reconnect but with invalid state
			await expect(db.getCaptchas()).rejects.toThrow();
		});

		it("should close connection after query", async () => {
			await db.connect();
			await db.getCaptchas();
			expect(db.connected).toBe(false);
		});
	});

	describe("type checks", () => {
		it("should implement ICaptchaDatabase interface", () => {
			expectTypeOf(db).toMatchTypeOf<ICaptchaDatabase>();
		});

		it("should have correct return types", async () => {
			await db.connect();
			expectTypeOf(db.getTables()).toMatchTypeOf<db["tables"]>();
			expectTypeOf(await db.getCaptchas()).resolves.toMatchTypeOf<{
				userCommitmentRecords: UserCommitmentRecord[];
				powCaptchaRecords: PoWCaptchaRecord[];
			}>();
		});
	});
});
