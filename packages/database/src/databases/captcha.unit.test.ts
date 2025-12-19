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

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { Connection, Model } from "mongoose";
import { ProsopoDBError } from "@prosopo/common";
import { CaptchaDatabase } from "./captcha.js";
import { MongoDatabase } from "../base/mongo.js";
import type {
	StoredSession,
	UserCommitmentRecord,
	PoWCaptchaRecord,
} from "@prosopo/types-database";

vi.mock("../base/mongo.js", () => {
	return {
		MongoDatabase: vi.fn().mockImplementation(() => ({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
			url: "mongodb://localhost:27017",
			dbname: "testdb",
			logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
			connected: false,
			connection: undefined,
		})),
	};
});

describe("CaptchaDatabase", () => {
	let db: CaptchaDatabase;
	let mockConnection: Connection;
	let mockSessionModel: Model<any>;
	let mockCommitmentModel: Model<any>;
	let mockPowCaptchaModel: Model<any>;
	const mockLogger = {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	} as any;

	beforeEach(() => {
		vi.clearAllMocks();

		mockSessionModel = {
			bulkWrite: vi.fn(),
			collection: {
				dropIndexes: vi.fn().mockResolvedValue(undefined),
			},
			ensureIndexes: vi.fn().mockResolvedValue(undefined),
		} as any;

		mockCommitmentModel = {
			bulkWrite: vi.fn(),
			find: vi.fn().mockReturnValue({
				limit: vi.fn().mockReturnValue({
					lean: vi.fn().mockResolvedValue([]),
				}),
			}),
			collection: {
				dropIndexes: vi.fn().mockResolvedValue(undefined),
			},
			ensureIndexes: vi.fn().mockResolvedValue(undefined),
		} as any;

		mockPowCaptchaModel = {
			bulkWrite: vi.fn(),
			find: vi.fn().mockReturnValue({
				limit: vi.fn().mockReturnValue({
					lean: vi.fn().mockResolvedValue([]),
				}),
			}),
			collection: {
				dropIndexes: vi.fn().mockResolvedValue(undefined),
			},
			ensureIndexes: vi.fn().mockResolvedValue(undefined),
		} as any;

		mockConnection = {
			model: vi.fn((modelName: string) => {
				if (modelName === "Session") return mockSessionModel;
				if (modelName === "UserCommitment") return mockCommitmentModel;
				if (modelName === "PowCaptcha") return mockPowCaptchaModel;
				return null;
			}),
		} as any;

		(MongoDatabase as any).mockImplementation(() => ({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
			url: "mongodb://localhost:27017",
			dbname: "testdb",
			logger: mockLogger,
			connected: true,
			connection: mockConnection,
		}));

		db = new CaptchaDatabase("mongodb://localhost:27017", "testdb", undefined, mockLogger);
	});

	afterEach(async () => {
		if (db) {
			await db.close().catch(() => {
				// Ignore errors during cleanup
			});
		}
	});

	describe("constructor", () => {
		it("should initialize with empty tables object", () => {
			expect(db.tables).toEqual({});
		});

		it("should call super constructor with correct parameters", () => {
			const url = "mongodb://localhost:27017";
			const dbname = "testdb";
			const authSource = "admin";
			const logger = mockLogger;
			new CaptchaDatabase(url, dbname, authSource, logger);
			expect(MongoDatabase).toHaveBeenCalledWith(url, dbname, authSource, logger);
		});
	});

	describe("connect", () => {
		it("should call super connect and load tables", async () => {
			await db.connect();
			expect(MongoDatabase.prototype.connect).toHaveBeenCalled();
			expect(mockConnection.model).toHaveBeenCalledTimes(3);
			expect(db.tables.session).toBe(mockSessionModel);
			expect(db.tables.commitment).toBe(mockCommitmentModel);
			expect(db.tables.powcaptcha).toBe(mockPowCaptchaModel);
		});

		it("should not load tables if connection is undefined", async () => {
			(MongoDatabase as any).mockImplementationOnce(() => ({
				connect: vi.fn().mockResolvedValue(undefined),
				close: vi.fn().mockResolvedValue(undefined),
				url: "mongodb://localhost:27017",
				dbname: "testdb",
				logger: mockLogger,
				connected: true,
				connection: undefined,
			}));
			const testDb = new CaptchaDatabase(
				"mongodb://localhost:27017",
				"testdb",
				undefined,
				mockLogger,
			);
			await testDb.connect();
			expect(testDb.tables).toEqual({});
		});
	});

	describe("getTables", () => {
		it("should return tables when they exist", () => {
			db.tables = {
				session: mockSessionModel,
				commitment: mockCommitmentModel,
				powcaptcha: mockPowCaptchaModel,
			} as any;
			expect(db.getTables()).toBe(db.tables);
		});

		it("should throw ProsopoDBError when tables are undefined", () => {
			db.tables = undefined as any;
			expect(() => db.getTables()).toThrow(ProsopoDBError);
		});
	});

	describe("ensureIndexes", () => {
		it("should ensure indexes for all collections when connected", async () => {
			db.connected = true;
			db.tables = {
				session: mockSessionModel,
				commitment: mockCommitmentModel,
				powcaptcha: mockPowCaptchaModel,
			} as any;

			await db.ensureIndexes();

			expect(mockSessionModel.collection.dropIndexes).toHaveBeenCalled();
			expect(mockSessionModel.ensureIndexes).toHaveBeenCalled();
			expect(mockCommitmentModel.collection.dropIndexes).toHaveBeenCalled();
			expect(mockCommitmentModel.ensureIndexes).toHaveBeenCalled();
			expect(mockPowCaptchaModel.collection.dropIndexes).toHaveBeenCalled();
			expect(mockPowCaptchaModel.ensureIndexes).toHaveBeenCalled();
		});

		it("should skip index creation when not connected", async () => {
			db.connected = false;
			db.tables = {
				session: mockSessionModel,
				commitment: mockCommitmentModel,
				powcaptcha: mockPowCaptchaModel,
			} as any;

			await db.ensureIndexes();

			expect(mockSessionModel.ensureIndexes).not.toHaveBeenCalled();
			expect(mockCommitmentModel.ensureIndexes).not.toHaveBeenCalled();
			expect(mockPowCaptchaModel.ensureIndexes).not.toHaveBeenCalled();
		});

		it("should handle errors during index creation gracefully", async () => {
			db.connected = true;
			const error = new Error("Index creation failed");
			mockSessionModel.ensureIndexes = vi.fn().mockRejectedValue(error);
			db.tables = {
				session: mockSessionModel,
				commitment: mockCommitmentModel,
				powcaptcha: mockPowCaptchaModel,
			} as any;

			await expect(db.ensureIndexes()).resolves.not.toThrow();
			expect(mockLogger.warn).toHaveBeenCalled();
		});

		it("should only ensure indexes once", async () => {
			db.connected = true;
			db.tables = {
				session: mockSessionModel,
				commitment: mockCommitmentModel,
				powcaptcha: mockPowCaptchaModel,
			} as any;

			await db.ensureIndexes();
			await db.ensureIndexes();

			expect(mockSessionModel.ensureIndexes).toHaveBeenCalledTimes(1);
		});
	});

	describe("saveCaptchas", () => {
		it("should save session events", async () => {
			const sessionEvents: StoredSession[] = [
				{
					sessionId: "session1",
					token: "token1",
					lastUpdatedTimestamp: new Date(),
				} as StoredSession,
			];
			mockSessionModel.bulkWrite = vi.fn().mockResolvedValue({
				insertedCount: 1,
			});

			await db.saveCaptchas(sessionEvents, [], []);

			expect(mockSessionModel.bulkWrite).toHaveBeenCalledWith([
				{
					insertOne: {
						document: {
							sessionId: "session1",
							token: "token1",
							lastUpdatedTimestamp: expect.any(Date),
						},
					},
				},
			]);
		});

		it("should not save session events when array is empty", async () => {
			await db.saveCaptchas([], [], []);
			expect(mockSessionModel.bulkWrite).not.toHaveBeenCalled();
		});

		it("should remove _id from session events before saving", async () => {
			const sessionEvents: StoredSession[] = [
				{
					_id: "id1",
					sessionId: "session1",
					token: "token1",
					lastUpdatedTimestamp: new Date(),
				} as any,
			];
			mockSessionModel.bulkWrite = vi.fn().mockResolvedValue({
				insertedCount: 1,
			});

			await db.saveCaptchas(sessionEvents, [], []);

			expect(mockSessionModel.bulkWrite).toHaveBeenCalledWith([
				{
					insertOne: {
						document: expect.not.objectContaining({ _id: "id1" }),
					},
				},
			]);
		});

		it("should save image captcha events", async () => {
			const imageEvents: UserCommitmentRecord[] = [
				{
					id: "commit1",
					accountId: "account1",
					lastUpdatedTimestamp: new Date(),
				} as UserCommitmentRecord,
			];
			mockCommitmentModel.bulkWrite = vi.fn().mockResolvedValue({
				upsertedCount: 1,
				matchedCount: 0,
				modifiedCount: 0,
			});

			await db.saveCaptchas([], imageEvents, []);

			expect(mockCommitmentModel.bulkWrite).toHaveBeenCalledWith([
				{
					updateOne: {
						filter: { id: "commit1" },
						update: { $set: expect.objectContaining({ id: "commit1" }) },
						upsert: true,
					},
				},
			]);
		});

		it("should remove _id from image captcha events before saving", async () => {
			const imageEvents: UserCommitmentRecord[] = [
				{
					_id: "id1",
					id: "commit1",
					accountId: "account1",
					lastUpdatedTimestamp: new Date(),
				} as any,
			];
			mockCommitmentModel.bulkWrite = vi.fn().mockResolvedValue({
				upsertedCount: 1,
				matchedCount: 0,
				modifiedCount: 0,
			});

			await db.saveCaptchas([], imageEvents, []);

			expect(mockCommitmentModel.bulkWrite).toHaveBeenCalledWith([
				{
					updateOne: {
						filter: { id: "commit1" },
						update: { $set: expect.not.objectContaining({ _id: "id1" }) },
						upsert: true,
					},
				},
			]);
		});

		it("should save PoW captcha events", async () => {
			const powEvents: PoWCaptchaRecord[] = [
				{
					challenge: "challenge1",
					userAccount: "user1",
					dappAccount: "dapp1",
					requestedAtTimestamp: new Date(),
					lastUpdatedTimestamp: new Date(),
				} as PoWCaptchaRecord,
			];
			mockPowCaptchaModel.bulkWrite = vi.fn().mockResolvedValue({
				upsertedCount: 1,
				matchedCount: 0,
				modifiedCount: 0,
			});

			await db.saveCaptchas([], [], powEvents);

			expect(mockPowCaptchaModel.bulkWrite).toHaveBeenCalledWith([
				{
					updateOne: {
						filter: { challenge: "challenge1" },
						update: { $set: expect.objectContaining({ challenge: "challenge1" }) },
						upsert: true,
					},
				},
			]);
		});

		it("should remove _id from PoW captcha events before saving", async () => {
			const powEvents: PoWCaptchaRecord[] = [
				{
					_id: "id1",
					challenge: "challenge1",
					userAccount: "user1",
					dappAccount: "dapp1",
					requestedAtTimestamp: new Date(),
					lastUpdatedTimestamp: new Date(),
				} as any,
			];
			mockPowCaptchaModel.bulkWrite = vi.fn().mockResolvedValue({
				upsertedCount: 1,
				matchedCount: 0,
				modifiedCount: 0,
			});

			await db.saveCaptchas([], [], powEvents);

			expect(mockPowCaptchaModel.bulkWrite).toHaveBeenCalledWith([
				{
					updateOne: {
						filter: { challenge: "challenge1" },
						update: { $set: expect.not.objectContaining({ _id: "id1" }) },
						upsert: true,
					},
				},
			]);
		});

		it("should close connection after saving", async () => {
			await db.saveCaptchas([], [], []);
			expect(MongoDatabase.prototype.close).toHaveBeenCalled();
		});
	});

	describe("getCaptchas", () => {
		it("should return captchas with default filter and limit", async () => {
			const commitmentResults: UserCommitmentRecord[] = [
				{ id: "commit1" } as UserCommitmentRecord,
			];
			const powResults: PoWCaptchaRecord[] = [
				{ challenge: "challenge1" } as PoWCaptchaRecord,
			];

			mockCommitmentModel.find = vi.fn().mockReturnValue({
				limit: vi.fn().mockReturnValue({
					lean: vi.fn().mockResolvedValue(commitmentResults),
				}),
			});
			mockPowCaptchaModel.find = vi.fn().mockReturnValue({
				limit: vi.fn().mockReturnValue({
					lean: vi.fn().mockResolvedValue(powResults),
				}),
			});

			const result = await db.getCaptchas();

			expect(result.userCommitmentRecords).toEqual(commitmentResults);
			expect(result.powCaptchaRecords).toEqual(powResults);
			expect(mockCommitmentModel.find).toHaveBeenCalledWith({});
			expect(mockPowCaptchaModel.find).toHaveBeenCalledWith({});
		});

		it("should use provided filter and limit", async () => {
			const filter = { id: "commit1" };
			const limit = 50;

			await db.getCaptchas(filter, limit);

			expect(mockCommitmentModel.find).toHaveBeenCalledWith(filter);
			expect(mockPowCaptchaModel.find).toHaveBeenCalledWith(filter);
			const limitCall = mockCommitmentModel.find().limit;
			expect(limitCall).toHaveBeenCalledWith(limit);
		});

		it("should throw ProsopoDBError on query error", async () => {
			const error = new Error("Query failed");
			mockCommitmentModel.find = vi.fn().mockReturnValue({
				limit: vi.fn().mockReturnValue({
					lean: vi.fn().mockRejectedValue(error),
				}),
			});

			await expect(db.getCaptchas()).rejects.toThrow(ProsopoDBError);
		});

		it("should close connection after getting captchas", async () => {
			await db.getCaptchas();
			expect(MongoDatabase.prototype.close).toHaveBeenCalled();
		});

		it("should close connection even when error occurs", async () => {
			const error = new Error("Query failed");
			mockCommitmentModel.find = vi.fn().mockReturnValue({
				limit: vi.fn().mockReturnValue({
					lean: vi.fn().mockRejectedValue(error),
				}),
			});

			try {
				await db.getCaptchas();
			} catch {
				// Expected error
			}

			expect(MongoDatabase.prototype.close).toHaveBeenCalled();
		});
	});
});
