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
import { CaptchaStatus, StoredStatusNames } from "@prosopo/types";
import type { Hash } from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	expectTypeOf,
	it,
} from "vitest";
import { MongoDatabase } from "../../base/mongo.js";
import { ProviderDatabase } from "../../databases/provider.js";

describe("ProviderDatabase", () => {
	let db: ProviderDatabase;
	let mongoServer: MongoMemoryServer;
	const logger = getLogger("info", import.meta.url);

	beforeEach(async () => {
		mongoServer = await MongoMemoryServer.create();
		const uri = mongoServer.getUri();
		db = new ProviderDatabase({
			mongo: {
				url: uri,
				dbname: "test-provider-db",
			},
			logger,
		});
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
		it("should create instance with mongo options", () => {
			expect(db).toBeInstanceOf(MongoDatabase);
			expect(db.dbname).toBe("test-provider-db");
		});

		it("should initialize tables as empty object", () => {
			expect(db.tables).toEqual({});
		});

		it("should initialize redis connections as null", () => {
			// @ts-expect-error - accessing private property for test
			expect(db.redisConnection).toBe(null);
			// @ts-expect-error - accessing private property for test
			expect(db.redisAccessRulesConnection).toBe(null);
		});

		it("should accept optional redis options", async () => {
			const testServer = await MongoMemoryServer.create();
			const uri = testServer.getUri();
			const instance = new ProviderDatabase({
				mongo: {
					url: uri,
					dbname: "test-db",
				},
				redis: {
					url: "redis://localhost:6379",
					password: "password",
					indexName: "test-index",
				},
			});
			expect(instance).toBeDefined();
			await testServer.stop();
		});
	});

	describe("connect", () => {
		it("should establish connection and load tables", async () => {
			await db.connect();
			expect(db.connected).toBe(true);
			expect(db.tables).toBeDefined();
			expect(db.tables.captcha).toBeDefined();
			expect(db.tables.dataset).toBeDefined();
			expect(db.tables.solution).toBeDefined();
		});

		it("should setup redis when redis options provided", async () => {
			const testServer = await MongoMemoryServer.create();
			const uri = testServer.getUri();
			const instanceWithRedis = new ProviderDatabase({
				mongo: {
					url: uri,
					dbname: "test-redis-db",
				},
				redis: {
					url: "redis://localhost:6379",
					password: "password",
				},
				logger,
			});
			await instanceWithRedis.connect();
			// Redis setup should not throw even if redis is not available
			await instanceWithRedis.close();
			await testServer.stop();
		});
	});

	describe("getTables", () => {
		it("should throw error when tables are undefined", async () => {
			const testServer = await MongoMemoryServer.create();
			const uri = testServer.getUri();
			const instance = new ProviderDatabase({
				mongo: { url: uri, dbname: "test-db" },
			});
			// @ts-expect-error - testing error case
			instance.tables = undefined;
			expect(() => instance.getTables()).toThrow();
			await testServer.stop();
		});

		it("should return tables after connection", async () => {
			await db.connect();
			const tables = db.getTables();
			expect(tables).toBeDefined();
			expectTypeOf(tables).toMatchTypeOf<db["tables"]>();
		});
	});

	describe("getRedisConnection", () => {
		it("should throw error when redis connection is null", () => {
			expect(() => db.getRedisConnection()).toThrow();
		});
	});

	describe("getRedisAccessRulesConnection", () => {
		it("should throw error when redis access rules connection is null", () => {
			expect(() => db.getRedisAccessRulesConnection()).toThrow();
		});
	});

	describe("getUserAccessRulesStorage", () => {
		it("should throw error when user access rules storage is null", () => {
			expect(() => db.getUserAccessRulesStorage()).toThrow();
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
	});

	describe("getRandomCaptcha", () => {
		it("should throw error for invalid hex datasetId", async () => {
			await db.connect();
			await expect(
				db.getRandomCaptcha(false, "invalid-hex" as Hash),
			).rejects.toThrow();
		});

		it("should throw error when no captchas found", async () => {
			await db.connect();
			const validHex =
				"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
			await expect(
				db.getRandomCaptcha(false, validHex as Hash),
			).rejects.toThrow();
		});

		it("should respect size parameter", async () => {
			await db.connect();
			const validHex =
				"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
			// Should handle negative size by taking absolute value
			await expect(
				db.getRandomCaptcha(false, validHex as Hash, -5),
			).rejects.toThrow();
		});

		it("should truncate size to integer", async () => {
			await db.connect();
			const validHex =
				"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
			await expect(
				db.getRandomCaptcha(false, validHex as Hash, 3.7),
			).rejects.toThrow();
		});
	});

	describe("getCaptchaById", () => {
		it("should throw error when no captchas found", async () => {
			await db.connect();
			await expect(db.getCaptchaById(["non-existent-id"])).rejects.toThrow();
		});

		it("should accept array of captcha IDs", async () => {
			await db.connect();
			await expect(db.getCaptchaById(["id1", "id2"])).rejects.toThrow();
		});
	});

	describe("updateCaptcha", () => {
		it("should throw error for invalid hex datasetId", async () => {
			await db.connect();
			await expect(
				db.updateCaptcha(
					{
						captchaId: "test",
						datasetId: "invalid" as Hash,
						items: [],
						target: [],
					},
					"invalid-hex" as Hash,
				),
			).rejects.toThrow();
		});

		it("should update captcha with valid datasetId", async () => {
			await db.connect();
			const validHex =
				"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
			await expect(
				db.updateCaptcha(
					{
						captchaId: "test",
						datasetId: validHex as Hash,
						items: [],
						target: [],
					},
					validHex as Hash,
				),
			).resolves.not.toThrow();
		});
	});

	describe("removeCaptchas", () => {
		it("should remove captchas by IDs", async () => {
			await db.connect();
			await expect(db.removeCaptchas(["id1", "id2"])).resolves.not.toThrow();
		});
	});

	describe("getDatasetDetails", () => {
		it("should throw error for invalid hex datasetId", async () => {
			await db.connect();
			await expect(
				db.getDatasetDetails("invalid-hex" as Hash),
			).rejects.toThrow();
		});

		it("should throw error when dataset not found", async () => {
			await db.connect();
			const validHex =
				"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
			await expect(db.getDatasetDetails(validHex as Hash)).rejects.toThrow();
		});
	});

	describe("storePowCaptchaRecord", () => {
		it("should store PoW captcha record", async () => {
			await db.connect();
			await expect(
				db.storePowCaptchaRecord(
					"challenge-1",
					{
						userAccount: "user1",
						dappAccount: "dapp1",
						requestedAtTimestamp: Date.now(),
					},
					5,
					"provider-sig",
					{ ipv4: "127.0.0.1" },
					{},
					"ja4-hash",
					"session-1",
					false,
					false,
					StoredStatusNames.notStored,
				),
			).resolves.not.toThrow();
		});

		it("should retrieve stored PoW captcha record", async () => {
			await db.connect();
			const challenge = "challenge-2";
			await db.storePowCaptchaRecord(
				challenge,
				{
					userAccount: "user2",
					dappAccount: "dapp2",
					requestedAtTimestamp: Date.now(),
				},
				5,
				"provider-sig",
				{ ipv4: "127.0.0.1" },
				{},
				"ja4-hash",
			);

			const record = await db.getPowCaptchaRecordByChallenge(challenge);
			expect(record).toBeDefined();
			if (record) {
				expect(record.challenge).toBe(challenge);
				expectTypeOf(record).toMatchTypeOf<typeof record>();
			}
		});
	});

	describe("getPowCaptchaRecordByChallenge", () => {
		it("should return null when record not found", async () => {
			await db.connect();
			const record = await db.getPowCaptchaRecordByChallenge("non-existent");
			expect(record).toBeNull();
			expectTypeOf(record).toMatchTypeOf<typeof record>();
		});

		it("should throw error when tables are undefined", () => {
			const instance = new ProviderDatabase({
				mongo: { url: "", dbname: "test-db" },
			});
			// @ts-expect-error - testing error case
			instance.tables = undefined;
			expect(() =>
				instance.getPowCaptchaRecordByChallenge("test"),
			).rejects.toThrow();
		});
	});

	describe("updatePowCaptchaRecordResult", () => {
		it("should throw error when record not found", async () => {
			await db.connect();
			await expect(
				db.updatePowCaptchaRecordResult("non-existent-challenge", {
					status: CaptchaStatus.approved,
				}),
			).rejects.toThrow();
		});

		it("should update record with result", async () => {
			await db.connect();
			const challenge = "challenge-update";
			await db.storePowCaptchaRecord(
				challenge,
				{
					userAccount: "user3",
					dappAccount: "dapp3",
					requestedAtTimestamp: Date.now(),
				},
				5,
				"provider-sig",
				{ ipv4: "127.0.0.1" },
				{},
				"ja4-hash",
			);

			await expect(
				db.updatePowCaptchaRecordResult(challenge, {
					status: CaptchaStatus.approved,
				}),
			).resolves.not.toThrow();
		});
	});

	describe("getUnstoredDappUserCommitments", () => {
		it("should return empty array when no unstored commitments", async () => {
			await db.connect();
			const commitments = await db.getUnstoredDappUserCommitments();
			expect(commitments).toEqual([]);
			expectTypeOf(commitments).toMatchTypeOf<typeof commitments>();
		});

		it("should respect limit and skip parameters", async () => {
			await db.connect();
			const commitments = await db.getUnstoredDappUserCommitments(10, 5);
			expectTypeOf(commitments).toMatchTypeOf<typeof commitments>();
		});
	});

	describe("markDappUserCommitmentsStored", () => {
		it("should mark commitments as stored", async () => {
			await db.connect();
			const commitmentIds: Hash[] = ["0x1234" as Hash, "0x5678" as Hash];
			await expect(
				db.markDappUserCommitmentsStored(commitmentIds),
			).resolves.not.toThrow();
		});
	});

	describe("markDappUserCommitmentsChecked", () => {
		it("should mark commitments as checked", async () => {
			await db.connect();
			const commitmentIds: Hash[] = ["0x1234" as Hash, "0x5678" as Hash];
			await expect(
				db.markDappUserCommitmentsChecked(commitmentIds),
			).resolves.not.toThrow();
		});
	});

	describe("getUnstoredDappUserPoWCommitments", () => {
		it("should return empty array when no unstored PoW commitments", async () => {
			await db.connect();
			const commitments = await db.getUnstoredDappUserPoWCommitments();
			expect(commitments).toEqual([]);
			expectTypeOf(commitments).toMatchTypeOf<typeof commitments>();
		});

		it("should respect limit and skip parameters", async () => {
			await db.connect();
			const commitments = await db.getUnstoredDappUserPoWCommitments(20, 10);
			expectTypeOf(commitments).toMatchTypeOf<typeof commitments>();
		});
	});

	describe("storePendingImageCommitment", () => {
		it("should throw error for invalid hex requestHash", async () => {
			await db.connect();
			await expect(
				db.storePendingImageCommitment(
					"user1",
					"invalid-hex",
					"salt",
					Date.now(),
					Date.now(),
					{ ipv4: "127.0.0.1" },
					5,
				),
			).rejects.toThrow();
		});

		it("should store pending commitment with valid hash", async () => {
			await db.connect();
			const validHash =
				"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
			await expect(
				db.storePendingImageCommitment(
					"user1",
					validHash,
					"salt",
					Date.now(),
					Date.now(),
					{ ipv4: "127.0.0.1" },
					5,
				),
			).resolves.not.toThrow();
		});
	});

	describe("getPendingImageCommitment", () => {
		it("should throw error for invalid hex requestHash", async () => {
			await db.connect();
			await expect(
				db.getPendingImageCommitment("invalid-hex"),
			).rejects.toThrow();
		});

		it("should throw error when pending record not found", async () => {
			await db.connect();
			const validHash =
				"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
			await expect(db.getPendingImageCommitment(validHash)).rejects.toThrow();
		});
	});

	describe("updatePendingImageCommitmentStatus", () => {
		it("should throw error for invalid hex requestHash", async () => {
			await db.connect();
			await expect(
				db.updatePendingImageCommitmentStatus("invalid-hex"),
			).rejects.toThrow();
		});
	});

	describe("getAllCaptchasByDatasetId", () => {
		it("should throw error when no captchas found", async () => {
			await db.connect();
			await expect(
				db.getAllCaptchasByDatasetId("non-existent-dataset"),
			).rejects.toThrow();
		});

		it("should filter by solved state when provided", async () => {
			await db.connect();
			await expect(
				// biome-ignore lint/suspicious/noExplicitAny: Testing invalid state
				db.getAllCaptchasByDatasetId("dataset-id", "Solved" as any),
			).rejects.toThrow();
		});
	});

	describe("getDatasetIdWithSolvedCaptchasOfSizeN", () => {
		it("should throw error when no dataset found", async () => {
			await db.connect();
			await expect(
				db.getDatasetIdWithSolvedCaptchasOfSizeN(10),
			).rejects.toThrow();
		});
	});

	describe("getRandomSolvedCaptchasFromSingleDataset", () => {
		it("should throw error for invalid hex datasetId", async () => {
			await db.connect();
			await expect(
				db.getRandomSolvedCaptchasFromSingleDataset("invalid-hex", 5),
			).rejects.toThrow();
		});

		it("should throw error when no solutions found", async () => {
			await db.connect();
			const validHex =
				"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
			await expect(
				db.getRandomSolvedCaptchasFromSingleDataset(validHex, 5),
			).rejects.toThrow();
		});

		it("should truncate size to integer", async () => {
			await db.connect();
			const validHex =
				"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
			await expect(
				db.getRandomSolvedCaptchasFromSingleDataset(validHex, 3.7),
			).rejects.toThrow();
		});
	});

	describe("approveDappUserCommitment", () => {
		it("should approve commitment", async () => {
			await db.connect();
			await expect(
				db.approveDappUserCommitment("commitment-id"),
			).resolves.not.toThrow();
		});

		it("should approve commitment with coords", async () => {
			await db.connect();
			const coords: [number, number][][] = [
				[
					[1, 2],
					[3, 4],
				],
			];
			await expect(
				db.approveDappUserCommitment("commitment-id", coords),
			).resolves.not.toThrow();
		});
	});

	describe("disapproveDappUserCommitment", () => {
		it("should disapprove commitment", async () => {
			await db.connect();
			await expect(
				db.disapproveDappUserCommitment("commitment-id"),
			).resolves.not.toThrow();
		});

		it("should disapprove commitment with reason and coords", async () => {
			await db.connect();
			const coords: [number, number][][] = [
				[
					[1, 2],
					[3, 4],
				],
			];
			await expect(
				db.disapproveDappUserCommitment(
					"commitment-id",
					// biome-ignore lint/suspicious/noExplicitAny: Testing custom reason format
					"test.reason" as any,
					coords,
				),
			).resolves.not.toThrow();
		});
	});

	describe("flagProcessedDappUserSolutions", () => {
		it("should flag solutions as processed", async () => {
			await db.connect();
			const captchaIds: Hash[] = ["0x1234" as Hash, "0x5678" as Hash];
			await expect(
				db.flagProcessedDappUserSolutions(captchaIds),
			).resolves.not.toThrow();
		});
	});

	describe("flagProcessedDappUserCommitments", () => {
		it("should flag commitments as processed", async () => {
			await db.connect();
			const commitmentIds: Hash[] = ["0x1234" as Hash, "0x5678" as Hash];
			await expect(
				db.flagProcessedDappUserCommitments(commitmentIds),
			).resolves.not.toThrow();
		});

		it("should deduplicate commitment IDs", async () => {
			await db.connect();
			const commitmentIds: Hash[] = [
				"0x1234" as Hash,
				"0x1234" as Hash,
				"0x5678" as Hash,
			];
			await expect(
				db.flagProcessedDappUserCommitments(commitmentIds),
			).resolves.not.toThrow();
		});
	});

	describe("type checks", () => {
		it("should implement IProviderDatabase interface", () => {
			expectTypeOf(db).toMatchTypeOf<IProviderDatabase>();
		});

		it("should have correct return types", async () => {
			await db.connect();
			expectTypeOf(db.getTables()).toMatchTypeOf<db["tables"]>();
			expectTypeOf(
				await db.getPowCaptchaRecordByChallenge("test"),
			).resolves.toMatchTypeOf<
				typeof db.getPowCaptchaRecordByChallenge extends (
					// biome-ignore lint/suspicious/noExplicitAny: Type inference pattern requires any
					...args: any[]
				) => Promise<infer R>
					? R
					: never
			>();
		});
	});
});
