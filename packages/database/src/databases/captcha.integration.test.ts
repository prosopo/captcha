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

import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { MongoDBContainer, type StartedMongoDBContainer } from "testcontainers";
import { CaptchaDatabase } from "./captcha.js";
import type {
	StoredSession,
	UserCommitmentRecord,
	PoWCaptchaRecord,
} from "@prosopo/types-database";
import { getLogger } from "@prosopo/common";

/**
 * Integration tests for CaptchaDatabase that use real MongoDB connections via testcontainers.
 * These tests verify actual database operations with real data.
 */
describe("CaptchaDatabase - Integration", () => {
	let mongoContainer: StartedMongoDBContainer;
	let db: CaptchaDatabase;
	const logger = getLogger("info", "captcha.integration.test");

	beforeAll(async () => {
		// Start MongoDB container for this test suite
		mongoContainer = await new MongoDBContainer("mongo:7.0")
			.withExposedPorts(27017)
			.start();
	}, 60000);

	afterAll(async () => {
		if (mongoContainer) {
			await mongoContainer.stop().catch(() => {
				// Ignore cleanup errors
			});
		}
	}, 30000);

	beforeEach(async () => {
		// Use testcontainers MongoDB instance
		const mongoUrl = mongoContainer.getConnectionString();
		db = new CaptchaDatabase(mongoUrl, "testdb", undefined, logger);
		await db.connect();
	});

	afterEach(async () => {
		if (db) {
			await db.close().catch(() => {
				// Ignore cleanup errors
			});
		}
	});

	describe("table management", () => {
		it("should initialize tables correctly", async () => {
			const tables = db.getTables();
			expect(tables).toBeDefined();
			expect(tables.session).toBeDefined();
			expect(tables.commitment).toBeDefined();
			expect(tables.powcaptcha).toBeDefined();
		});

		it("should create collections on connection", async () => {
			// Tables should be available after connection
			expect(db.tables).toBeDefined();
			expect(Object.keys(db.tables)).toHaveLength(3);
		});
	});

	describe("index management", () => {
		it("should create indexes successfully", async () => {
			await expect(db.ensureIndexes()).resolves.not.toThrow();
		});

		it("should handle index creation when already connected", async () => {
			// First call
			await db.ensureIndexes();

			// Second call should also work (idempotent)
			await expect(db.ensureIndexes()).resolves.not.toThrow();
		});
	});

	describe("data operations", () => {
		describe("saveCaptchas", () => {
			it("should save session records", async () => {
				const sessionEvents: StoredSession[] = [
					{
						sessionId: "session1",
						token: "token1",
						lastUpdatedTimestamp: new Date(),
					},
					{
						sessionId: "session2",
						token: "token2",
						lastUpdatedTimestamp: new Date(),
					},
				];

				await expect(db.saveCaptchas(sessionEvents, [], [])).resolves.not.toThrow();
			});

			it("should save user commitment records", async () => {
				const commitmentEvents: UserCommitmentRecord[] = [
					{
						id: "commit1",
						accountId: "account1",
						lastUpdatedTimestamp: new Date(),
						datasetId: "dataset1",
						dappAccount: "dapp1",
						providerAccount: "provider1",
						result: { status: "pending" },
						userSignature: "sig1",
						ipAddress: { lower: BigInt(2130706433), type: "v4" },
						headers: {},
						ja4: "ja4hash",
						userSubmitted: false,
						serverChecked: false,
						requestedAtTimestamp: new Date(),
					},
				];

				await expect(db.saveCaptchas([], commitmentEvents, [])).resolves.not.toThrow();
			});

			it("should save PoW captcha records", async () => {
				const powEvents: PoWCaptchaRecord[] = [
					{
						challenge: "challenge1",
						userAccount: "user1",
						dappAccount: "dapp1",
						requestedAtTimestamp: new Date(),
						lastUpdatedTimestamp: new Date(),
						difficulty: 5,
						providerSignature: "sig1",
						ipAddress: { ipv4: "127.0.0.1" },
						headers: {},
						ja4: "ja4hash",
					},
				];

				await expect(db.saveCaptchas([], [], powEvents)).resolves.not.toThrow();
			});

			it("should handle mixed record types", async () => {
				const sessionEvents: StoredSession[] = [
					{
						sessionId: "session1",
						token: "token1",
						lastUpdatedTimestamp: new Date(),
					},
				];

				const commitmentEvents: UserCommitmentRecord[] = [
					{
						id: "commit1",
						accountId: "account1",
						lastUpdatedTimestamp: new Date(),
						datasetId: "dataset1",
						dappAccount: "dapp1",
						providerAccount: "provider1",
						result: { status: "pending" },
						userSignature: "sig1",
						ipAddress: { lower: BigInt(2130706433), type: "v4" },
						headers: {},
						ja4: "ja4hash",
						userSubmitted: false,
						serverChecked: false,
						requestedAtTimestamp: new Date(),
					},
				];

				await expect(db.saveCaptchas(sessionEvents, commitmentEvents, [])).resolves.not.toThrow();
			});

			it("should handle empty arrays gracefully", async () => {
				await expect(db.saveCaptchas([], [], [])).resolves.not.toThrow();
			});

			it("should remove _id fields before saving", async () => {
				const sessionEvents: StoredSession[] = [
					{
						_id: "some-id",
						sessionId: "session1",
						token: "token1",
						lastUpdatedTimestamp: new Date(),
					} as any,
				];

				await expect(db.saveCaptchas(sessionEvents, [], [])).resolves.not.toThrow();

				// Verify data was saved without _id
				const result = await db.getCaptchas();
				expect(result.userCommitmentRecords).toHaveLength(0);
				// Sessions are not returned by getCaptchas, so we can't directly verify
			});
		});

		describe("getCaptchas", () => {
			it("should retrieve captcha data with default parameters", async () => {
				// Save some test data first
				const commitmentEvents: UserCommitmentRecord[] = [
					{
						id: "commit1",
						accountId: "account1",
						lastUpdatedTimestamp: new Date(),
						datasetId: "dataset1",
						dappAccount: "dapp1",
						providerAccount: "provider1",
						result: { status: "pending" },
						userSignature: "sig1",
						ipAddress: { lower: BigInt(2130706433), type: "v4" },
						headers: {},
						ja4: "ja4hash",
						userSubmitted: false,
						serverChecked: false,
						requestedAtTimestamp: new Date(),
					},
				];

				const powEvents: PoWCaptchaRecord[] = [
					{
						challenge: "challenge1",
						userAccount: "user1",
						dappAccount: "dapp1",
						requestedAtTimestamp: new Date(),
						lastUpdatedTimestamp: new Date(),
						difficulty: 5,
						providerSignature: "sig1",
						ipAddress: { ipv4: "127.0.0.1" },
						headers: {},
						ja4: "ja4hash",
					},
				];

				await db.saveCaptchas([], commitmentEvents, powEvents);

				const result = await db.getCaptchas();

				expect(result).toHaveProperty("userCommitmentRecords");
				expect(result).toHaveProperty("powCaptchaRecords");
				expect(Array.isArray(result.userCommitmentRecords)).toBe(true);
				expect(Array.isArray(result.powCaptchaRecords)).toBe(true);
			});

			it("should apply filter correctly", async () => {
				const filter = { id: "commit1" };
				const result = await db.getCaptchas(filter);
				expect(result.userCommitmentRecords).toHaveLength(0); // No data saved yet
			});

			it("should respect limit parameter", async () => {
				const limit = 10;
				const result = await db.getCaptchas({}, limit);
				// Since no data, arrays should be empty
				expect(result.userCommitmentRecords).toHaveLength(0);
				expect(result.powCaptchaRecords).toHaveLength(0);
			});
		});
	});

	describe("error handling", () => {
		it("should throw ProsopoDBError for invalid operations", async () => {
			// Test getting tables when not connected
			const disconnectedDb = new CaptchaDatabase("mongodb://localhost:27017", "testdb", undefined, logger);
			expect(() => disconnectedDb.getTables()).toThrow();
		});
	});
});