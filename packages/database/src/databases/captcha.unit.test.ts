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

import { ProsopoDBError } from "@prosopo/common";
import type {
	PoWCaptchaRecord,
	StoredSession,
	UserCommitmentRecord,
} from "@prosopo/types-database";
import type { Connection, Model } from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CaptchaDatabase } from "./captcha.js";

vi.mock("../base/mongo.js", async () => {
	const actual =
		await vi.importActual<typeof import("../base/mongo.js")>(
			"../base/mongo.js",
		);
	return {
		...actual,
		MongoDatabase: class extends actual.MongoDatabase {
			connected = false;
			connection = undefined as Connection | undefined;
			private _preserveTables = false;
			setPreserveTables(value: boolean) {
				this._preserveTables = value;
			}
			override async connect(): Promise<void> {
				this.connected = true;
				if (!this._preserveTables) {
					this.connection = {
						model: vi.fn().mockReturnValue({
							bulkWrite: vi.fn().mockResolvedValue({
								insertedCount: 0,
								matchedCount: 0,
								modifiedCount: 0,
								deletedCount: 0,
								upsertedCount: 0,
								upsertedIds: {},
							}),
							find: vi.fn().mockReturnValue({
								limit: vi.fn().mockReturnValue({
									lean: vi.fn().mockResolvedValue([]),
								}),
							}),
							collection: {
								dropIndexes: vi.fn().mockResolvedValue(undefined),
							},
							ensureIndexes: vi.fn().mockResolvedValue(undefined),
						}),
					} as unknown as Connection;
				}
			}
			override async close(): Promise<void> {
				this.connected = false;
			}
		},
	};
});

describe("CaptchaDatabase", () => {
	let db: CaptchaDatabase;
	const mockModel = {
		bulkWrite: vi.fn(),
		find: vi.fn().mockReturnValue({
			limit: vi.fn().mockReturnValue({
				lean: vi.fn(),
			}),
		}),
		collection: {
			dropIndexes: vi.fn().mockResolvedValue(undefined),
		},
		ensureIndexes: vi.fn().mockResolvedValue(undefined),
	} as unknown as Model<unknown>;

	beforeEach(() => {
		vi.clearAllMocks();
		db = new CaptchaDatabase("mongodb://127.0.0.1:27017", "testdb");
	});

	afterEach(async () => {
		if (db.connected) {
			await db.close();
		}
	});

	describe("constructor", () => {
		it("should create instance with empty tables", () => {
			expect(db.tables).toEqual({});
		});

		it("should pass parameters to parent class", () => {
			const instance = new CaptchaDatabase(
				"mongodb://127.0.0.1:27017",
				"mydb",
				"admin",
			);
			expect(instance.dbname).toBe("mydb");
		});
	});

	describe("connect", () => {
		it("should call super.connect() and initialize tables", async () => {
			await db.connect();
			expect(db.connected).toBe(true);
			expect(db.connection).toBeDefined();
		});

		it("should create models for all captcha tables", async () => {
			await db.connect();
			expect(db.connection?.model).toHaveBeenCalledTimes(3);
		});
	});

	describe("getTables", () => {
		it("should return tables when they exist", () => {
			db.tables = { session: mockModel } as typeof db.tables;
			expect(db.getTables()).toBe(db.tables);
		});

		it("should throw error when tables are undefined", () => {
			// @ts-expect-error - testing error case
			db.tables = undefined;
			expect(() => db.getTables()).toThrow(ProsopoDBError);
		});
	});

	describe("ensureIndexes", () => {
		it("should ensure indexes when connected", async () => {
			await db.connect();
			db.tables = {
				session: mockModel,
				powcaptcha: mockModel,
				commitment: mockModel,
			} as typeof db.tables;
			await db.ensureIndexes();
			expect(mockModel.collection.dropIndexes).toHaveBeenCalledTimes(3);
			expect(mockModel.ensureIndexes).toHaveBeenCalledTimes(3);
		});

		it("should skip index creation when not connected", async () => {
			db.connected = false;
			await db.ensureIndexes();
			expect(mockModel.ensureIndexes).not.toHaveBeenCalled();
		});

		it("should only ensure indexes once", async () => {
			await db.connect();
			db.tables = {
				session: mockModel,
				powcaptcha: mockModel,
				commitment: mockModel,
			} as typeof db.tables;
			await db.ensureIndexes();
			vi.clearAllMocks();
			await db.ensureIndexes();
			expect(mockModel.ensureIndexes).not.toHaveBeenCalled();
		});

		it("should handle index creation errors gracefully", async () => {
			await db.connect();
			const errorModel = {
				...mockModel,
				collection: {
					dropIndexes: vi.fn().mockResolvedValue(undefined),
				},
				ensureIndexes: vi.fn().mockRejectedValue(new Error("Index error")),
			} as unknown as Model<unknown>;
			db.tables = {
				session: errorModel,
				powcaptcha: errorModel,
				commitment: errorModel,
			} as typeof db.tables;
			await expect(db.ensureIndexes()).resolves.not.toThrow();
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
			const mockBulkWrite = vi.fn().mockResolvedValue({
				insertedCount: 1,
				matchedCount: 0,
				modifiedCount: 0,
				deletedCount: 0,
				upsertedCount: 0,
				upsertedIds: {},
			});
			// @ts-expect-error - accessing private method for testing
			db.setPreserveTables(true);
			db.tables = {
				session: {
					...mockModel,
					bulkWrite: mockBulkWrite,
				},
				powcaptcha: mockModel,
				commitment: mockModel,
			} as typeof db.tables;

			await db.saveCaptchas(sessionEvents, [], []);
			expect(mockBulkWrite).toHaveBeenCalled();
		});

		it("should save image captcha events", async () => {
			const imageEvents: UserCommitmentRecord[] = [
				{
					id: "commit1",
					userAccount: "user1",
					dappAccount: "dapp1",
					lastUpdatedTimestamp: new Date(),
				} as UserCommitmentRecord,
			];
			const mockBulkWrite = vi.fn().mockResolvedValue({
				insertedCount: 0,
				matchedCount: 0,
				modifiedCount: 0,
				deletedCount: 0,
				upsertedCount: 1,
				upsertedIds: {},
			});
			// @ts-expect-error - accessing private method for testing
			db.setPreserveTables(true);
			db.tables = {
				session: mockModel,
				powcaptcha: mockModel,
				commitment: {
					...mockModel,
					bulkWrite: mockBulkWrite,
				},
			} as typeof db.tables;

			await db.saveCaptchas([], imageEvents, []);
			expect(mockBulkWrite).toHaveBeenCalled();
		});

		it("should save PoW captcha events", async () => {
			const powEvents: PoWCaptchaRecord[] = [
				{
					challenge: "challenge1",
					userAccount: "user1",
					dappAccount: "dapp1",
					requestedAtTimestamp: new Date(),
					lastUpdatedTimestamp: new Date(),
					result: { status: "pending" },
				} as PoWCaptchaRecord,
			];
			const mockBulkWrite = vi.fn().mockResolvedValue({
				insertedCount: 0,
				matchedCount: 0,
				modifiedCount: 0,
				deletedCount: 0,
				upsertedCount: 1,
				upsertedIds: {},
			});
			// @ts-expect-error - accessing private method for testing
			db.setPreserveTables(true);
			db.tables = {
				session: mockModel,
				powcaptcha: {
					...mockModel,
					bulkWrite: mockBulkWrite,
				},
				commitment: mockModel,
			} as typeof db.tables;

			await db.saveCaptchas([], [], powEvents);
			expect(mockBulkWrite).toHaveBeenCalled();
		});

		it("should remove _id field from documents before saving", async () => {
			const sessionEvents: StoredSession[] = [
				{
					_id: "id1",
					sessionId: "session1",
					token: "token1",
					lastUpdatedTimestamp: new Date(),
				} as StoredSession & { _id: string },
			];
			const mockBulkWrite = vi.fn().mockResolvedValue({
				insertedCount: 1,
				matchedCount: 0,
				modifiedCount: 0,
				deletedCount: 0,
				upsertedCount: 0,
				upsertedIds: {},
			});
			// @ts-expect-error - accessing private method for testing
			db.setPreserveTables(true);
			db.tables = {
				session: {
					...mockModel,
					bulkWrite: mockBulkWrite,
				},
				powcaptcha: mockModel,
				commitment: mockModel,
			} as typeof db.tables;

			await db.saveCaptchas(sessionEvents, [], []);
			const callArgs = mockBulkWrite.mock.calls[0][0];
			expect(callArgs[0].insertOne.document).not.toHaveProperty("_id");
		});

		it("should close connection after saving", async () => {
			const mockClose = vi.fn();
			db.close = mockClose;
			// @ts-expect-error - accessing private method for testing
			db.setPreserveTables(true);
			db.tables = {
				session: mockModel,
				powcaptcha: mockModel,
				commitment: mockModel,
			} as typeof db.tables;

			await db.saveCaptchas([], [], []);
			expect(mockClose).toHaveBeenCalled();
		});
	});

	describe("getCaptchas", () => {
		it("should return user commitment and PoW captcha records", async () => {
			const mockCommitmentResults = [
				{ id: "commit1" },
			] as UserCommitmentRecord[];
			const mockPowResults = [
				{ challenge: "challenge1" },
			] as PoWCaptchaRecord[];
			const mockCommitmentLean = vi
				.fn()
				.mockResolvedValue(mockCommitmentResults);
			const mockPowLean = vi.fn().mockResolvedValue(mockPowResults);
			const mockCommitmentLimit = vi
				.fn()
				.mockReturnValue({ lean: mockCommitmentLean });
			const mockPowLimit = vi.fn().mockReturnValue({ lean: mockPowLean });
			const mockCommitmentFind = vi
				.fn()
				.mockReturnValue({ limit: mockCommitmentLimit });
			const mockPowFind = vi.fn().mockReturnValue({ limit: mockPowLimit });

			// @ts-expect-error - accessing private method for testing
			db.setPreserveTables(true);
			db.tables = {
				session: mockModel,
				powcaptcha: {
					...mockModel,
					find: mockPowFind,
				},
				commitment: {
					...mockModel,
					find: mockCommitmentFind,
				},
			} as typeof db.tables;

			const result = await db.getCaptchas({}, 100);
			expect(result.userCommitmentRecords).toEqual(mockCommitmentResults);
			expect(result.powCaptchaRecords).toEqual(mockPowResults);
		});

		it("should use default limit of 100", async () => {
			const mockLean = vi.fn().mockResolvedValue([]);
			const mockLimit = vi.fn().mockReturnValue({ lean: mockLean });
			const mockFind = vi.fn().mockReturnValue({ limit: mockLimit });
			// @ts-expect-error - accessing private method for testing
			db.setPreserveTables(true);
			db.tables = {
				session: mockModel,
				powcaptcha: {
					...mockModel,
					find: mockFind,
				},
				commitment: {
					...mockModel,
					find: mockFind,
				},
			} as typeof db.tables;

			await db.getCaptchas();
			expect(mockLimit).toHaveBeenCalledWith(100);
		});

		it("should use provided filter", async () => {
			const filter = { id: "test" };
			const mockLean = vi.fn().mockResolvedValue([]);
			const mockLimit = vi.fn().mockReturnValue({ lean: mockLean });
			const mockFind = vi.fn().mockReturnValue({ limit: mockLimit });
			// @ts-expect-error - accessing private method for testing
			db.setPreserveTables(true);
			db.tables = {
				session: mockModel,
				powcaptcha: {
					...mockModel,
					find: mockFind,
				},
				commitment: {
					...mockModel,
					find: mockFind,
				},
			} as typeof db.tables;

			await db.getCaptchas(filter);
			expect(mockFind).toHaveBeenCalledWith(filter);
		});

		it("should throw error on query failure", async () => {
			const error = new Error("Query failed");
			const mockLean = vi.fn().mockRejectedValue(error);
			const mockLimit = vi.fn().mockReturnValue({ lean: mockLean });
			const mockFind = vi.fn().mockReturnValue({ limit: mockLimit });
			// @ts-expect-error - accessing private method for testing
			db.setPreserveTables(true);
			db.tables = {
				session: mockModel,
				powcaptcha: {
					...mockModel,
					find: mockFind,
				},
				commitment: {
					...mockModel,
					find: mockFind,
				},
			} as typeof db.tables;

			await expect(db.getCaptchas()).rejects.toThrow(ProsopoDBError);
		});

		it("should close connection after query", async () => {
			const mockClose = vi.fn();
			db.close = mockClose;
			const mockLean = vi.fn().mockResolvedValue([]);
			const mockLimit = vi.fn().mockReturnValue({ lean: mockLean });
			const mockFind = vi.fn().mockReturnValue({ limit: mockLimit });
			// @ts-expect-error - accessing private method for testing
			db.setPreserveTables(true);
			db.tables = {
				session: mockModel,
				powcaptcha: {
					...mockModel,
					find: mockFind,
				},
				commitment: {
					...mockModel,
					find: mockFind,
				},
			} as typeof db.tables;

			await db.getCaptchas();
			expect(mockClose).toHaveBeenCalled();
		});
	});
});
