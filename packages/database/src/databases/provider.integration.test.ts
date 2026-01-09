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

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { ProviderDatabase } from "./provider.js";
import type { Dataset, Captcha, SolutionRecord } from "@prosopo/types-database";
import { getLogger } from "@prosopo/common";
import { connectToRedis, setupRedisIndex } from "@prosopo/redis-client";

/**
 * Integration tests for ProviderDatabase that use real MongoDB and Redis connections via testcontainers.
 * These tests verify actual database operations with real data.
 */
describe("ProviderDatabase - Integration", () => {
	let db: ProviderDatabase;
	const logger = getLogger("info", "provider.integration.test");

	beforeEach(async () => {
		// Use testcontainers instances
		const mongoUrl = process.env.MONGODB_URL || "mongodb://127.0.0.1:27017";
		const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

		db = new ProviderDatabase({
			mongo: {
				url: mongoUrl,
				dbname: "testdb",
			},
			redis: {
				url: redisUrl,
			},
			logger,
		});

		await db.connect();
	});

	afterEach(async () => {
		if (db) {
			await db.close().catch(() => {
				// Ignore cleanup errors
			});
		}
	});

	describe("connection management", () => {
		it("should connect to both MongoDB and Redis successfully", async () => {
			expect(db.connected).toBe(true);
			expect(db.getTables()).toBeDefined();
		});

		it("should initialize all required collections", async () => {
			const tables = db.getTables();
			const expectedCollections = [
				"captcha",
				"dataset",
				"solution",
				"commitment",
				"usersolution",
				"pending",
				"scheduler",
				"client",
				"session",
				"detector",
				"powcaptcha",
				"clientContextEntropy",
			];

			expectedCollections.forEach(collection => {
				expect(tables).toHaveProperty(collection);
			});
		});

		it("should create indexes successfully", async () => {
			await expect(db.ensureIndexes()).resolves.not.toThrow();
		});
	});

	describe("dataset operations", () => {
		it("should store and retrieve dataset successfully", async () => {
			const dataset: Dataset = {
				datasetId: "0x1234567890123456789012345678901234567890",
				datasetContentId: "0x0987654321098765432109876543210987654321",
				format: "SelectAll",
				captchas: [
					{
						captchaId: "captcha1",
						captchaContentId: "content1",
						items: [],
						target: ["item1"],
						salt: "salt1",
						solution: [0],
					},
				],
				contentTree: [[]],
				solutionTree: [[]],
			};

			await expect(db.storeDataset(dataset)).resolves.not.toThrow();

			const retrieved = await db.getDataset(dataset.datasetId);
			expect(retrieved.datasetId).toBe(dataset.datasetId);
			expect(retrieved.captchas).toHaveLength(1);
		});

		it("should handle invalid dataset ID format", async () => {
			const invalidDataset: Dataset = {
				datasetId: "invalid-hex",
				datasetContentId: "0x0987654321098765432109876543210987654321",
				format: "SelectAll",
				captchas: [],
				contentTree: [[]],
				solutionTree: [[]],
			};

			await expect(db.storeDataset(invalidDataset)).rejects.toThrow();
		});
	});

	describe("captcha operations", () => {
		it("should retrieve random captcha successfully", async () => {
			// First store a dataset with captchas
			const dataset: Dataset = {
				datasetId: "0x1234567890123456789012345678901234567890",
				datasetContentId: "0x0987654321098765432109876543210987654321",
				format: "SelectAll",
				captchas: [
					{
						captchaId: "captcha1",
						captchaContentId: "content1",
						items: [],
						target: ["item1"],
						salt: "salt1",
						solution: [0],
						solved: false,
					},
				],
				contentTree: [[]],
				solutionTree: [[]],
			};

			await db.storeDataset(dataset);

			const captcha = await db.getRandomCaptcha(false, dataset.datasetId, 1);
			expect(captcha).toBeDefined();
			expect(captcha![0].captchaId).toBe("captcha1");
		});

		it("should retrieve captcha by ID", async () => {
			const dataset: Dataset = {
				datasetId: "0x1234567890123456789012345678901234567890",
				datasetContentId: "0x0987654321098765432109876543210987654321",
				format: "SelectAll",
				captchas: [
					{
						captchaId: "captcha1",
						captchaContentId: "content1",
						items: [],
						target: ["item1"],
						salt: "salt1",
						solution: [0],
						solved: false,
					},
				],
				contentTree: [[]],
				solutionTree: [[]],
			};

			await db.storeDataset(dataset);

			const captchas = await db.getCaptchaById(["captcha1"]);
			expect(captchas).toBeDefined();
			expect(captchas![0].captchaId).toBe("captcha1");
		});
	});

	describe("solution operations", () => {
		it("should store and retrieve solutions", async () => {
			const datasetId = "0x1234567890123456789012345678901234567890";

			// Store a dataset first
			const dataset: Dataset = {
				datasetId,
				datasetContentId: "0x0987654321098765432109876543210987654321",
				format: "SelectAll",
				captchas: [
					{
						captchaId: "captcha1",
						captchaContentId: "content1",
						items: [],
						target: ["item1"],
						salt: "salt1",
						solution: [0],
						solved: true,
					},
				],
				contentTree: [[]],
				solutionTree: [[]],
			};

			await db.storeDataset(dataset);

			const solutions = await db.getSolutions(datasetId);
			expect(Array.isArray(solutions)).toBe(true);
		});

		it("should retrieve solution by captcha ID", async () => {
			const datasetId = "0x1234567890123456789012345678901234567890";

			const dataset: Dataset = {
				datasetId,
				datasetContentId: "0x0987654321098765432109876543210987654321",
				format: "SelectAll",
				captchas: [
					{
						captchaId: "captcha1",
						captchaContentId: "content1",
						items: [],
						target: ["item1"],
						salt: "salt1",
						solution: [0],
						solved: true,
					},
				],
				contentTree: [[]],
				solutionTree: [[]],
			};

			await db.storeDataset(dataset);

			const solution = await db.getSolutionByCaptchaId("captcha1");
			expect(solution).toBeDefined();
		});
	});

	describe("session operations", () => {
		it("should store and retrieve session records", async () => {
			const sessionRecord = {
				sessionId: "session1",
				token: "token1",
			};

			await expect(db.storeSessionRecord(sessionRecord)).resolves.not.toThrow();

			const retrieved = await db.getSessionRecordBySessionId("session1");
			expect(retrieved?.sessionId).toBe("session1");
			expect(retrieved?.token).toBe("token1");
		});

		it("should handle session token lookup", async () => {
			const sessionRecord = {
				sessionId: "session1",
				token: "token1",
			};

			await db.storeSessionRecord(sessionRecord);

			const retrieved = await db.getSessionRecordByToken("token1");
			expect(retrieved?.sessionId).toBe("session1");
		});
	});

	describe("commitment operations", () => {
		it("should store and retrieve user commitments", async () => {
			const commitment = {
				id: "commit1",
				userAccount: "user1",
				dappAccount: "dapp1",
				datasetId: "0x1234567890123456789012345678901234567890",
				providerAccount: "provider1",
				result: { status: "pending" },
				userSignature: "sig1",
				ipAddress: { lower: BigInt(2130706433), type: "v4" },
				headers: {},
				ja4: "ja4hash",
				userSubmitted: false,
				serverChecked: false,
				requestedAtTimestamp: new Date(),
				lastUpdatedTimestamp: new Date(),
			};

			await db.storeUserImageCaptchaSolution([], commitment);

			const retrieved = await db.getDappUserCommitmentById("commit1");
			expect(retrieved?.id).toBe("commit1");
		});
	});

	describe("error handling", () => {
		it("should throw errors for invalid operations", async () => {
			// Test invalid hex dataset ID
			await expect(db.getRandomCaptcha(true, "invalid-hex", 1)).rejects.toThrow();
		});

		it("should handle missing data gracefully", async () => {
			const result = await db.getDataset("0x1234567890123456789012345678901234567890");
			await expect(Promise.resolve(result)).rejects.toThrow();
		});
	});
});