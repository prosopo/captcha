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

import { isHex } from "@polkadot/util/is";
import { ProsopoDBError } from "@prosopo/common";
import { CaptchaStates, CaptchaStatus, ContextType } from "@prosopo/types";
import type {
	Captcha,
	ClientContextEntropyRecord,
	ClientRecord,
	DetectorSchema,
	PendingCaptchaRequest,
	PoWCaptchaRecord,
	Session,
	SolutionRecord,
	UserCommitmentRecord,
	UserSolutionRecord,
} from "@prosopo/types-database";
import type { Connection, Model, ObjectId } from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderDatabase } from "./provider.js";

vi.mock("@polkadot/util/is", () => ({
	isHex: vi.fn((value: string) => {
		if (typeof value !== "string") return false;
		return /^0x[0-9a-f]+$/i.test(value);
	}),
}));

vi.mock("@prosopo/redis-client", () => ({
	connectToRedis: vi.fn().mockReturnValue({}),
	setupRedisIndex: vi.fn().mockReturnValue({}),
}));

vi.mock("@prosopo/user-access-policy/redis", () => ({
	accessRulesRedisIndex: { name: "test-index" },
	createRedisAccessRulesStorage: vi.fn().mockReturnValue({}),
}));

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
			override async connect(): Promise<void> {
				this.connected = true;
				this.connection = {
					model: vi.fn().mockReturnValue({
						create: vi.fn(),
						find: vi.fn().mockReturnValue({
							lean: vi.fn(),
							limit: vi.fn().mockReturnValue({
								lean: vi.fn(),
							}),
							sort: vi.fn().mockReturnValue({
								limit: vi.fn().mockReturnValue({
									lean: vi.fn(),
								}),
							}),
						}),
						findOne: vi.fn().mockReturnValue({
							lean: vi.fn(),
							findOneAndUpdate: vi.fn().mockReturnValue({
								lean: vi.fn(),
							}),
						}),
						findOneAndUpdate: vi.fn().mockReturnValue({
							lean: vi.fn(),
						}),
						updateOne: vi.fn(),
						updateMany: vi.fn(),
						deleteMany: vi.fn(),
						bulkWrite: vi.fn(),
						aggregate: vi.fn().mockResolvedValue([]),
						collection: {
							dropIndexes: vi.fn().mockResolvedValue(undefined),
						},
						ensureIndexes: vi.fn().mockResolvedValue(undefined),
					}),
				} as unknown as Connection;
			}
			override async close(): Promise<void> {
				this.connected = false;
			}
		},
	};
});

describe("ProviderDatabase", () => {
	let db: ProviderDatabase;
	const mockModel = {
		create: vi.fn(),
		find: vi.fn().mockReturnValue({
			lean: vi.fn(),
			limit: vi.fn().mockReturnValue({
				lean: vi.fn(),
			}),
		}),
		findOne: vi.fn().mockReturnValue({
			lean: vi.fn(),
			findOneAndUpdate: vi.fn().mockReturnValue({
				lean: vi.fn(),
			}),
		}),
		findOneAndUpdate: vi.fn().mockReturnValue({
			lean: vi.fn(),
		}),
		updateOne: vi.fn(),
		updateMany: vi.fn(),
		deleteMany: vi.fn(),
		bulkWrite: vi.fn(),
		aggregate: vi.fn().mockResolvedValue([]),
		collection: {
			dropIndexes: vi.fn().mockResolvedValue(undefined),
		},
		ensureIndexes: vi.fn().mockResolvedValue(undefined),
	} as unknown as Model<unknown>;

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset isHex mock to default behavior
		vi.mocked(isHex).mockImplementation((value: string) => {
			if (typeof value !== "string") return false;
			return /^0x[0-9a-f]+$/i.test(value);
		});
		db = new ProviderDatabase({
			mongo: {
				url: "mongodb://127.0.0.1:27017",
				dbname: "testdb",
			},
		});
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

		it("should initialize redis connections as null", () => {
			expect(() => db.getRedisConnection()).toThrow(ProsopoDBError);
			expect(() => db.getRedisAccessRulesConnection()).toThrow(ProsopoDBError);
		});

		it("should accept redis options", () => {
			const instance = new ProviderDatabase({
				mongo: {
					url: "mongodb://127.0.0.1:27017",
					dbname: "testdb",
				},
				redis: {
					url: "redis://127.0.0.1:6379",
					password: "password",
					indexName: "custom-index",
				},
			});
			expect(instance).toBeDefined();
		});
	});

	describe("connect", () => {
		it("should call super.connect() and setup redis", async () => {
			await db.connect();
			expect(db.connected).toBe(true);
		});

		it("should load tables", async () => {
			await db.connect();
			expect(db.connection?.model).toHaveBeenCalled();
		});
	});

	describe("getTables", () => {
		it("should return tables when they exist", () => {
			db.tables = { captcha: mockModel } as typeof db.tables;
			expect(db.getTables()).toBe(db.tables);
		});

		it("should throw error when tables are undefined", () => {
			// @ts-expect-error - testing error case
			db.tables = undefined;
			expect(() => db.getTables()).toThrow(ProsopoDBError);
		});
	});

	describe("getRedisConnection", () => {
		it("should throw error when connection is null", () => {
			expect(() => db.getRedisConnection()).toThrow(ProsopoDBError);
		});

		it("should return connection when it exists", async () => {
			await db.connect();
			const connection = db.getRedisConnection();
			expect(connection).toBeDefined();
		});
	});

	describe("getRedisAccessRulesConnection", () => {
		it("should throw error when connection is null", () => {
			expect(() => db.getRedisAccessRulesConnection()).toThrow(ProsopoDBError);
		});

		it("should return connection when it exists", async () => {
			await db.connect();
			const connection = db.getRedisAccessRulesConnection();
			expect(connection).toBeDefined();
		});
	});

	describe("getUserAccessRulesStorage", () => {
		it("should throw error when storage is null", () => {
			expect(() => db.getUserAccessRulesStorage()).toThrow(ProsopoDBError);
		});

		it("should return storage when it exists", async () => {
			await db.connect();
			const storage = db.getUserAccessRulesStorage();
			expect(storage).toBeDefined();
		});
	});

	describe("ensureIndexes", () => {
		it("should ensure indexes when connected", async () => {
			await db.connect();
			const mockModelWithCollection = {
				...mockModel,
				collection: {
					dropIndexes: vi.fn().mockResolvedValue(undefined),
				},
				ensureIndexes: vi.fn().mockResolvedValue(undefined),
			};
			const allTables = {
				captcha: mockModelWithCollection,
				powcaptcha: mockModelWithCollection,
				dataset: mockModelWithCollection,
				solution: mockModelWithCollection,
				commitment: mockModelWithCollection,
				usersolution: mockModelWithCollection,
				pending: mockModelWithCollection,
				scheduler: mockModelWithCollection,
				client: mockModelWithCollection,
				session: mockModelWithCollection,
				detector: mockModelWithCollection,
				clientContextEntropy: mockModelWithCollection,
			};
			db.tables = allTables as typeof db.tables;
			await db.ensureIndexes();
			expect(mockModelWithCollection.collection.dropIndexes).toHaveBeenCalled();
			expect(mockModelWithCollection.ensureIndexes).toHaveBeenCalled();
		});

		it("should skip index creation when not connected", async () => {
			db.connected = false;
			await db.ensureIndexes();
			expect(mockModel.ensureIndexes).not.toHaveBeenCalled();
		});

		it("should only ensure indexes once", async () => {
			await db.connect();
			const mockModelWithCollection = {
				...mockModel,
				collection: {
					dropIndexes: vi.fn().mockResolvedValue(undefined),
				},
				ensureIndexes: vi.fn().mockResolvedValue(undefined),
			};
			db.tables = {
				captcha: mockModelWithCollection,
				dataset: mockModelWithCollection,
				solution: mockModelWithCollection,
				commitment: mockModelWithCollection,
				usersolution: mockModelWithCollection,
				pending: mockModelWithCollection,
				scheduler: mockModelWithCollection,
				client: mockModelWithCollection,
				session: mockModelWithCollection,
				detector: mockModelWithCollection,
				clientContextEntropy: mockModelWithCollection,
				powcaptcha: mockModelWithCollection,
			} as typeof db.tables;
			await db.ensureIndexes();
			vi.clearAllMocks();
			await db.ensureIndexes();
			expect(mockModelWithCollection.ensureIndexes).not.toHaveBeenCalled();
		});
	});

	describe("storeDataset", () => {
		it("should store dataset and captchas", async () => {
			await db.connect();
			const dataset = {
				datasetId: "0x1234567890abcdef1234567890abcdef12345678",
				datasetContentId: "0x4567890abcdef1234567890abcdef1234567890",
				format: "SelectAll",
				contentTree: [],
				solutionTree: [],
				captchas: [
					{
						captchaId: "cap1",
						captchaContentId: "capc1",
						items: [],
						target: "target1",
						salt: "1234567890123456789012345678901234",
						solution: ["sol1"],
					},
				],
			};
			const mockUpdateOne = vi.fn().mockResolvedValue({});
			const mockBulkWrite = vi.fn().mockResolvedValue({});
			db.tables = {
				dataset: {
					...mockModel,
					updateOne: mockUpdateOne,
				},
				captcha: {
					...mockModel,
					bulkWrite: mockBulkWrite,
				},
				solution: {
					...mockModel,
					bulkWrite: mockBulkWrite,
				},
			} as typeof db.tables;

			await db.storeDataset(dataset);
			expect(mockUpdateOne).toHaveBeenCalled();
			expect(mockBulkWrite).toHaveBeenCalled();
		});

		it("should handle datasets without solutions", async () => {
			await db.connect();
			const dataset = {
				datasetId: "0x1234567890abcdef1234567890abcdef12345678",
				datasetContentId: "0x4567890abcdef1234567890abcdef1234567890",
				format: "SelectAll",
				contentTree: [],
				solutionTree: [],
				captchas: [
					{
						captchaId: "cap1",
						captchaContentId: "capc1",
						items: [],
						target: "target1",
						salt: "1234567890123456789012345678901234",
					},
				],
			};
			const mockUpdateOne = vi.fn().mockResolvedValue({});
			const mockBulkWrite = vi.fn().mockResolvedValue({});
			db.tables = {
				dataset: {
					...mockModel,
					updateOne: mockUpdateOne,
				},
				captcha: {
					...mockModel,
					bulkWrite: mockBulkWrite,
				},
				solution: {
					...mockModel,
					bulkWrite: mockBulkWrite,
				},
			} as typeof db.tables;

			await db.storeDataset(dataset);
			expect(mockUpdateOne).toHaveBeenCalled();
		});

		it("should throw error on failure", async () => {
			await db.connect();
			const dataset = {
				datasetId: "0x1234567890abcdef1234567890abcdef12345678",
				datasetContentId: "0x4567890abcdef1234567890abcdef1234567890",
				format: "SelectAll",
				contentTree: [],
				solutionTree: [],
				captchas: [],
			};
			const error = new Error("Store failed");
			db.tables = {
				dataset: {
					...mockModel,
					updateOne: vi.fn().mockRejectedValue(error),
				},
				captcha: mockModel,
				solution: mockModel,
			} as typeof db.tables;

			await expect(db.storeDataset(dataset)).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("getSolutions", () => {
		it("should return solutions for dataset", async () => {
			await db.connect();
			const solutions = [
				{ captchaId: "cap1", solution: ["sol1"] },
			] as SolutionRecord[];
			const mockFind = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(solutions),
			});
			db.tables = {
				solution: {
					...mockModel,
					find: mockFind,
				},
			} as typeof db.tables;

			const result = await db.getSolutions(
				"0x1234567890abcdef1234567890abcdef12345678",
			);
			expect(result).toEqual(solutions);
		});

		it("should return empty array when no solutions found", async () => {
			await db.connect();
			const mockFind = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});
			db.tables = {
				solution: {
					...mockModel,
					find: mockFind,
				},
			} as typeof db.tables;

			const result = await db.getSolutions(
				"0x1234567890abcdef1234567890abcdef12345678",
			);
			expect(result).toEqual([]);
		});
	});

	describe("getSolutionByCaptchaId", () => {
		it("should return solution for captcha", async () => {
			await db.connect();
			const solution = {
				captchaId: "cap1",
				solution: ["sol1"],
			} as SolutionRecord;
			const mockFindOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(solution),
			});
			db.tables = {
				solution: {
					...mockModel,
					findOne: mockFindOne,
				},
			} as typeof db.tables;

			const result = await db.getSolutionByCaptchaId("cap1");
			expect(result).toEqual(solution);
		});

		it("should return null when solution not found", async () => {
			await db.connect();
			const mockFindOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});
			db.tables = {
				solution: {
					...mockModel,
					findOne: mockFindOne,
				},
			} as typeof db.tables;

			const result = await db.getSolutionByCaptchaId("cap1");
			expect(result).toBeNull();
		});
	});

	describe("getDataset", () => {
		it("should return dataset with captchas and solutions", async () => {
			await db.connect();
			const datasetDoc = {
				datasetId: "0x1234567890abcdef1234567890abcdef12345678",
				datasetContentId: "0x4567890abcdef1234567890abcdef1234567890",
				format: "SelectAll",
				contentTree: [],
				solutionTree: [],
			};
			const captchas = [
				{
					captchaId: "cap1",
					captchaContentId: "capc1",
					items: [],
					target: "target1",
					salt: "1234567890123456789012345678901234",
					solved: true,
				},
			] as Captcha[];
			const solutions = [
				{
					captchaId: "cap1",
					solution: ["sol1"],
					datasetId: "0x1234567890abcdef1234567890abcdef12345678",
				},
			] as SolutionRecord[];
			const mockDatasetFindOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(datasetDoc),
			});
			const mockCaptchaFind = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(captchas),
			});
			const mockSolutionFind = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(solutions),
			});
			db.tables = {
				dataset: {
					...mockModel,
					findOne: mockDatasetFindOne,
				},
				captcha: {
					...mockModel,
					find: mockCaptchaFind,
				},
				solution: {
					...mockModel,
					find: mockSolutionFind,
				},
			} as typeof db.tables;

			const result = await db.getDataset(
				"0x1234567890abcdef1234567890abcdef12345678",
			);
			expect(result.datasetId).toBe(
				"0x1234567890abcdef1234567890abcdef12345678",
			);
			expect(result.captchas).toHaveLength(1);
			expect(result.captchas[0].solution).toEqual(["sol1"]);
		});

		it("should throw error when dataset not found", async () => {
			await db.connect();
			const mockFindOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});
			db.tables = {
				dataset: {
					...mockModel,
					findOne: mockFindOne,
				},
				captcha: mockModel,
				solution: mockModel,
			} as typeof db.tables;

			await expect(
				db.getDataset("0x1234567890abcdef1234567890abcdef12345678"),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("getRandomCaptcha", () => {
		it("should return random captchas", async () => {
			await db.connect();
			const captchas = [
				{
					captchaId: "cap1",
					datasetId: "0x1234567890abcdef1234567890abcdef12345678",
				},
			] as Captcha[];
			const mockAggregate = vi.fn().mockResolvedValue(captchas);
			db.tables = {
				captcha: {
					...mockModel,
					aggregate: mockAggregate,
				},
			} as typeof db.tables;

			const result = await db.getRandomCaptcha(
				true,
				"0x1234567890abcdef1234567890abcdef12345678",
				1,
			);
			expect(result).toEqual(captchas);
		});

		it("should throw error for invalid hash", async () => {
			await db.connect();
			vi.mocked(isHex).mockReturnValue(false);
			await expect(db.getRandomCaptcha(true, "invalid", 1)).rejects.toThrow(
				ProsopoDBError,
			);
		});

		it("should use default size of 1", async () => {
			await db.connect();
			const mockAggregate = vi.fn().mockResolvedValue([
				{
					captchaId: "cap1",
					datasetId: "0x1234567890abcdef1234567890abcdef12345678",
				},
			]);
			db.tables = {
				captcha: {
					...mockModel,
					aggregate: mockAggregate,
				},
			} as typeof db.tables;

			await db.getRandomCaptcha(
				true,
				"0x1234567890abcdef1234567890abcdef12345678",
			);
			const pipeline = mockAggregate.mock.calls[0][0];
			const sampleStage = pipeline.find((stage: unknown) =>
				Object.hasOwn(stage as object, "$sample"),
			);
			expect(sampleStage.$sample.size).toBe(1);
		});

		it("should throw error when no captchas found", async () => {
			await db.connect();
			const mockAggregate = vi.fn().mockResolvedValue([]);
			db.tables = {
				captcha: {
					...mockModel,
					aggregate: mockAggregate,
				},
			} as typeof db.tables;

			await expect(
				db.getRandomCaptcha(
					true,
					"0x1234567890abcdef1234567890abcdef12345678",
					1,
				),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("getCaptchaById", () => {
		it("should return captchas by id", async () => {
			await db.connect();
			const captchas = [{ _id: "id1", captchaId: "cap1" }] as (Captcha & {
				_id: unknown;
			})[];
			const mockFind = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(captchas),
			});
			db.tables = {
				captcha: {
					...mockModel,
					find: mockFind,
				},
			} as typeof db.tables;

			const result = await db.getCaptchaById(["cap1"]);
			expect(result).toHaveLength(1);
			expect(result?.[0]).not.toHaveProperty("_id");
		});

		it("should throw error when no captchas found", async () => {
			await db.connect();
			const mockFind = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue([]),
			});
			db.tables = {
				captcha: {
					...mockModel,
					find: mockFind,
				},
			} as typeof db.tables;

			await expect(db.getCaptchaById(["cap1"])).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("updateCaptcha", () => {
		it("should update captcha", async () => {
			await db.connect();
			const captcha = {
				captchaId: "cap1",
				datasetId: "0x123",
			} as Captcha;
			const mockUpdateOne = vi.fn().mockResolvedValue({});
			db.tables = {
				captcha: {
					...mockModel,
					updateOne: mockUpdateOne,
				},
			} as typeof db.tables;

			await db.updateCaptcha(
				captcha,
				"0x1234567890abcdef1234567890abcdef12345678",
			);
			expect(mockUpdateOne).toHaveBeenCalled();
		});

		it("should throw error for invalid hash", async () => {
			await db.connect();
			vi.mocked(isHex).mockReturnValue(false);
			await expect(db.updateCaptcha({} as Captcha, "invalid")).rejects.toThrow(
				ProsopoDBError,
			);
		});
	});

	describe("removeCaptchas", () => {
		it("should remove captchas by ids", async () => {
			await db.connect();
			const mockDeleteMany = vi.fn().mockResolvedValue({});
			db.tables = {
				captcha: {
					...mockModel,
					deleteMany: mockDeleteMany,
				},
			} as typeof db.tables;

			await db.removeCaptchas(["cap1", "cap2"]);
			expect(mockDeleteMany).toHaveBeenCalled();
		});
	});

	describe("getDatasetDetails", () => {
		it("should return dataset details", async () => {
			await db.connect();
			const dataset = {
				datasetId: "0x123",
				datasetContentId: "0x456",
				format: "format1",
			};
			const mockFindOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(dataset),
			});
			db.tables = {
				dataset: {
					...mockModel,
					findOne: mockFindOne,
				},
			} as typeof db.tables;

			const result = await db.getDatasetDetails(
				"0x1234567890abcdef1234567890abcdef12345678",
			);
			expect(result).toEqual(dataset);
		});

		it("should throw error for invalid hash", async () => {
			await db.connect();
			vi.mocked(isHex).mockReturnValue(false);
			await expect(db.getDatasetDetails("invalid")).rejects.toThrow(
				ProsopoDBError,
			);
		});

		it("should throw error when dataset not found", async () => {
			await db.connect();
			const mockFindOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});
			db.tables = {
				dataset: {
					...mockModel,
					findOne: mockFindOne,
				},
			} as typeof db.tables;

			await expect(
				db.getDatasetDetails("0x1234567890abcdef1234567890abcdef12345678"),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("storePowCaptchaRecord", () => {
		it("should store PoW captcha record", async () => {
			await db.connect();
			const mockCreate = vi.fn().mockResolvedValue({});
			db.tables = {
				powcaptcha: {
					...mockModel,
					create: mockCreate,
				},
			} as typeof db.tables;

			await db.storePowCaptchaRecord(
				"challenge1",
				{
					userAccount: "user1",
					dappAccount: "dapp1",
					requestedAtTimestamp: new Date(),
				},
				10,
				"sig1",
				{ ipv4: "127.0.0.1" },
				{},
				"ja4",
			);
			expect(mockCreate).toHaveBeenCalled();
		});

		it("should throw error on failure", async () => {
			await db.connect();
			const error = new Error("Create failed");
			const mockCreate = vi.fn().mockRejectedValue(error);
			db.tables = {
				powcaptcha: {
					...mockModel,
					create: mockCreate,
				},
			} as typeof db.tables;

			await expect(
				db.storePowCaptchaRecord(
					"challenge1",
					{
						userAccount: "user1",
						dappAccount: "dapp1",
						requestedAtTimestamp: new Date(),
					},
					10,
					"sig1",
					{ ipv4: "127.0.0.1" },
					{},
					"ja4",
				),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("getPowCaptchaRecordByChallenge", () => {
		it("should return PoW captcha record", async () => {
			await db.connect();
			const record = {
				challenge: "challenge1",
				userAccount: "user1",
			} as PoWCaptchaRecord;
			const mockFindOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(record),
			});
			db.tables = {
				powcaptcha: {
					...mockModel,
					findOne: mockFindOne,
				},
			} as typeof db.tables;

			const result = await db.getPowCaptchaRecordByChallenge("challenge1");
			expect(result).toEqual(record);
		});

		it("should return null when record not found", async () => {
			await db.connect();
			const mockFindOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});
			db.tables = {
				powcaptcha: {
					...mockModel,
					findOne: mockFindOne,
				},
			} as typeof db.tables;

			const result = await db.getPowCaptchaRecordByChallenge("challenge1");
			expect(result).toBeNull();
		});

		it("should throw error when tables are undefined", () => {
			// @ts-expect-error - testing error case
			db.tables = undefined;
			expect(() =>
				db.getPowCaptchaRecordByChallenge("challenge1"),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("updatePowCaptchaRecordResult", () => {
		it("should update PoW captcha record result", async () => {
			await db.connect();
			const mockUpdateOne = vi.fn().mockResolvedValue({
				matchedCount: 1,
			});
			db.tables = {
				powcaptcha: {
					...mockModel,
					updateOne: mockUpdateOne,
				},
			} as typeof db.tables;

			await db.updatePowCaptchaRecordResult("challenge1", {
				status: CaptchaStatus.approved,
			});
			expect(mockUpdateOne).toHaveBeenCalled();
		});

		it("should throw error when no record matched", async () => {
			await db.connect();
			const mockUpdateOne = vi.fn().mockResolvedValue({
				matchedCount: 0,
			});
			db.tables = {
				powcaptcha: {
					...mockModel,
					updateOne: mockUpdateOne,
				},
			} as typeof db.tables;

			await expect(
				db.updatePowCaptchaRecordResult("challenge1", {
					status: CaptchaStatus.approved,
				}),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("storeUserImageCaptchaSolution", () => {
		it("should store user commitment and solutions", async () => {
			await db.connect();
			const mockUpdateOne = vi.fn().mockResolvedValue({});
			const mockBulkWrite = vi.fn().mockResolvedValue({});
			db.tables = {
				commitment: {
					...mockModel,
					updateOne: mockUpdateOne,
				},
				usersolution: {
					...mockModel,
					bulkWrite: mockBulkWrite,
				},
			} as typeof db.tables;

			await db.storeUserImageCaptchaSolution(
				[
					{
						captchaId: "cap1",
						captchaContentId: "capc1",
						salt: "1234567890123456789012345678901234",
						solution: ["sol1"],
					},
				],
				{
					id: "commit1",
					userAccount: "user1",
					dappAccount: "dapp1",
					datasetId: "0x1234567890abcdef1234567890abcdef12345678",
					providerAccount: "provider1",
					result: { status: CaptchaStatus.pending },
					userSignature: "sig1",
					ipAddress: {
						ipv4: "127.0.0.1",
						type: "v4",
						upper: 2130706433n,
						lower: 2130706433n,
					},
					headers: {},
					ja4: "ja4hash",
					userSubmitted: false,
					serverChecked: false,
					requestedAtTimestamp: new Date(),
				},
			);
			expect(mockUpdateOne).toHaveBeenCalled();
			expect(mockBulkWrite).toHaveBeenCalled();
		});

		it("should not store solutions when captchas array is empty", async () => {
			await db.connect();
			const mockUpdateOne = vi.fn().mockResolvedValue({});
			const mockBulkWrite = vi.fn().mockResolvedValue({});
			db.tables = {
				commitment: {
					...mockModel,
					updateOne: mockUpdateOne,
				},
				usersolution: {
					...mockModel,
					bulkWrite: mockBulkWrite,
				},
			} as typeof db.tables;

			await db.storeUserImageCaptchaSolution([], {
				id: "commit1",
				userAccount: "user1",
				dappAccount: "dapp1",
				datasetId: "0x1234567890abcdef1234567890abcdef12345678",
				providerAccount: "provider1",
				result: { status: CaptchaStatus.pending },
				userSignature: "sig1",
				ipAddress: {
					ipv4: "127.0.0.1",
					type: "v4",
					upper: 2130706433n,
					lower: 2130706433n,
				},
				headers: {},
				ja4: "ja4hash",
				userSubmitted: false,
				serverChecked: false,
				requestedAtTimestamp: new Date(),
			});
			expect(mockUpdateOne).not.toHaveBeenCalled();
			expect(mockBulkWrite).not.toHaveBeenCalled();
		});
	});

	describe("getCheckedDappUserCommitments", () => {
		it("should return checked commitments", async () => {
			await db.connect();
			const commitments = [
				{ id: "commit1", serverChecked: true },
			] as UserCommitmentRecord[];
			const mockFind = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(commitments),
			});
			db.tables = {
				commitment: {
					...mockModel,
					find: mockFind,
				},
			} as typeof db.tables;

			const result = await db.getCheckedDappUserCommitments();
			expect(result).toEqual(commitments);
		});
	});

	describe("getUnstoredDappUserCommitments", () => {
		it("should return unstored commitments", async () => {
			await db.connect();
			const commitments = [{ id: "commit1" }] as UserCommitmentRecord[];
			const mockAggregate = vi.fn().mockResolvedValue(commitments);
			db.tables = {
				commitment: {
					...mockModel,
					aggregate: mockAggregate,
				},
			} as typeof db.tables;

			const result = await db.getUnstoredDappUserCommitments();
			expect(result).toEqual(commitments);
		});

		it("should use default limit and skip", async () => {
			await db.connect();
			const mockAggregate = vi.fn().mockResolvedValue([]);
			db.tables = {
				commitment: {
					...mockModel,
					aggregate: mockAggregate,
				},
			} as typeof db.tables;

			await db.getUnstoredDappUserCommitments();
			const pipeline = mockAggregate.mock.calls[0][0];
			const limitStage = pipeline.find((stage: unknown) =>
				Object.hasOwn(stage as object, "$limit"),
			);
			expect(limitStage.$limit).toBe(1000);
		});
	});

	describe("markDappUserCommitmentsStored", () => {
		it("should mark commitments as stored", async () => {
			await db.connect();
			const mockUpdateMany = vi.fn().mockResolvedValue({});
			db.tables = {
				commitment: {
					...mockModel,
					updateMany: mockUpdateMany,
				},
			} as typeof db.tables;

			await db.markDappUserCommitmentsStored(["0x1", "0x2"]);
			expect(mockUpdateMany).toHaveBeenCalled();
		});
	});

	describe("markDappUserCommitmentsChecked", () => {
		it("should mark commitments as checked", async () => {
			await db.connect();
			const mockUpdateMany = vi.fn().mockResolvedValue({});
			db.tables = {
				commitment: {
					...mockModel,
					updateMany: mockUpdateMany,
				},
			} as typeof db.tables;

			await db.markDappUserCommitmentsChecked(["0x1", "0x2"]);
			expect(mockUpdateMany).toHaveBeenCalled();
		});
	});

	describe("updateDappUserCommitment", () => {
		it("should update commitment", async () => {
			await db.connect();
			const mockUpdateOne = vi.fn().mockResolvedValue({});
			db.tables = {
				commitment: {
					...mockModel,
					updateOne: mockUpdateOne,
				},
			} as typeof db.tables;

			await db.updateDappUserCommitment("0x1", {});
			expect(mockUpdateOne).toHaveBeenCalled();
		});
	});

	describe("storeSessionRecord", () => {
		it("should store session record", async () => {
			await db.connect();
			const mockCreate = vi.fn().mockResolvedValue({});
			db.tables = {
				session: {
					...mockModel,
					create: mockCreate,
				},
			} as typeof db.tables;

			await db.storeSessionRecord({
				sessionId: "session1",
				token: "token1",
			} as Session);
			expect(mockCreate).toHaveBeenCalled();
		});

		it("should throw error on failure", async () => {
			await db.connect();
			const error = new Error("Create failed");
			const mockCreate = vi.fn().mockRejectedValue(error);
			db.tables = {
				session: {
					...mockModel,
					create: mockCreate,
				},
			} as typeof db.tables;

			await expect(
				db.storeSessionRecord({
					sessionId: "session1",
					token: "token1",
				} as Session),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("getSessionRecordBySessionId", () => {
		it("should return session record", async () => {
			await db.connect();
			const session = {
				sessionId: "session1",
				token: "token1",
			} as Session;
			const mockFindOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(session),
			});
			db.tables = {
				session: {
					...mockModel,
					findOne: mockFindOne,
				},
			} as typeof db.tables;

			const result = await db.getSessionRecordBySessionId("session1");
			expect(result).toEqual(session);
		});

		it("should return undefined when not found", async () => {
			await db.connect();
			const mockFindOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});
			db.tables = {
				session: {
					...mockModel,
					findOne: mockFindOne,
				},
			} as typeof db.tables;

			const result = await db.getSessionRecordBySessionId("session1");
			expect(result).toBeUndefined();
		});
	});

	describe("getSessionRecordByToken", () => {
		it("should return session record by token", async () => {
			await db.connect();
			const session = {
				sessionId: "session1",
				token: "token1",
			} as Session;
			const mockFindOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(session),
			});
			db.tables = {
				session: {
					...mockModel,
					findOne: mockFindOne,
				},
			} as typeof db.tables;

			const result = await db.getSessionRecordByToken("token1");
			expect(result).toEqual(session);
		});
	});

	describe("checkAndRemoveSession", () => {
		it("should mark session as deleted", async () => {
			await db.connect();
			const session = {
				sessionId: "session1",
				deleted: false,
			};
			const mockFindOneAndUpdate = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(session),
			});
			db.tables = {
				session: {
					...mockModel,
					findOneAndUpdate: mockFindOneAndUpdate,
				},
			} as typeof db.tables;

			const result = await db.checkAndRemoveSession("session1");
			expect(result).toEqual(session);
			expect(mockFindOneAndUpdate).toHaveBeenCalled();
		});

		it("should throw error on failure", async () => {
			await db.connect();
			const error = new Error("Update failed");
			const mockFindOneAndUpdate = vi.fn().mockReturnValue({
				lean: vi.fn().mockRejectedValue(error),
			});
			db.tables = {
				session: {
					...mockModel,
					findOneAndUpdate: mockFindOneAndUpdate,
				},
			} as typeof db.tables;

			await expect(db.checkAndRemoveSession("session1")).rejects.toThrow(
				ProsopoDBError,
			);
		});
	});

	describe("storePendingImageCommitment", () => {
		it("should store pending commitment", async () => {
			await db.connect();
			// Reset isHex mock to default behavior
			vi.mocked(isHex).mockImplementation((value: string) => {
				if (typeof value !== "string") return false;
				return /^0x[0-9a-f]+$/i.test(value);
			});
			const mockUpdateOne = vi.fn().mockResolvedValue({});
			db.tables = {
				pending: {
					...mockModel,
					updateOne: mockUpdateOne,
				},
			} as typeof db.tables;

			await db.storePendingImageCommitment(
				"user1",
				"0x1234567890abcdef",
				"salt1",
				1000,
				2000,
				{ ipv4: "127.0.0.1" },
				5,
			);
			expect(mockUpdateOne).toHaveBeenCalled();
		});

		it("should throw error for invalid hash", async () => {
			await db.connect();
			vi.mocked(isHex).mockReturnValue(false);
			await expect(
				db.storePendingImageCommitment(
					"user1",
					"invalid",
					"salt1",
					1000,
					2000,
					{ ipv4: "127.0.0.1" },
					5,
				),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("getPendingImageCommitment", () => {
		it("should return pending commitment", async () => {
			await db.connect();
			// Reset isHex mock to default behavior
			vi.mocked(isHex).mockImplementation((value: string) => {
				if (typeof value !== "string") return false;
				return /^0x[0-9a-f]+$/i.test(value);
			});
			const pending = {
				requestHash: "0x1234567890abcdef",
				accountId: "user1",
			} as PendingCaptchaRequest;
			const mockFindOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(pending),
			});
			db.tables = {
				pending: {
					...mockModel,
					findOne: mockFindOne,
				},
			} as typeof db.tables;

			const result = await db.getPendingImageCommitment("0x1234567890abcdef");
			expect(result).toEqual(pending);
		});

		it("should throw error for invalid hash", async () => {
			await db.connect();
			vi.mocked(isHex).mockReturnValue(false);
			await expect(db.getPendingImageCommitment("invalid")).rejects.toThrow(
				ProsopoDBError,
			);
		});

		it("should throw error when not found", async () => {
			await db.connect();
			const mockFindOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});
			db.tables = {
				pending: {
					...mockModel,
					findOne: mockFindOne,
				},
			} as typeof db.tables;

			await expect(db.getPendingImageCommitment("0x123")).rejects.toThrow(
				ProsopoDBError,
			);
		});
	});

	describe("updatePendingImageCommitmentStatus", () => {
		it("should update pending status", async () => {
			await db.connect();
			// Reset isHex mock to default behavior
			vi.mocked(isHex).mockImplementation((value: string) => {
				if (typeof value !== "string") return false;
				return /^0x[0-9a-f]+$/i.test(value);
			});
			const mockUpdateOne = vi.fn().mockResolvedValue({});
			db.tables = {
				pending: {
					...mockModel,
					updateOne: mockUpdateOne,
				},
			} as typeof db.tables;

			await db.updatePendingImageCommitmentStatus("0x1234567890abcdef");
			expect(mockUpdateOne).toHaveBeenCalled();
		});

		it("should throw error for invalid hash", async () => {
			await db.connect();
			vi.mocked(isHex).mockReturnValue(false);
			await expect(
				db.updatePendingImageCommitmentStatus("invalid"),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("getAllCaptchasByDatasetId", () => {
		it("should return all captchas for dataset", async () => {
			await db.connect();
			const captchas = [
				{
					_id: "id1",
					captchaId: "cap1",
					datasetId: "0x1234567890abcdef1234567890abcdef12345678",
					solved: false,
				},
			] as (Captcha & { _id: unknown })[];
			const mockFind = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(captchas),
			});
			db.tables = {
				captcha: {
					...mockModel,
					find: mockFind,
				},
			} as typeof db.tables;

			const result = await db.getAllCaptchasByDatasetId("0x123");
			expect(result).toHaveLength(1);
			expect(result?.[0]).not.toHaveProperty("_id");
		});

		it("should filter by solved state", async () => {
			await db.connect();
			const mockFind = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue([]),
			});
			db.tables = {
				captcha: {
					...mockModel,
					find: mockFind,
				},
			} as typeof db.tables;

			await db.getAllCaptchasByDatasetId(
				"0x1234567890abcdef1234567890abcdef12345678",
				CaptchaStates.Solved,
			);
			const filter = mockFind.mock.calls[0][0];
			expect(filter.solved).toBe(true);
		});
	});

	describe("getAllDappUserSolutions", () => {
		it("should return user solutions", async () => {
			await db.connect();
			const solutions = [
				{ _id: "id1", captchaId: "cap1" },
			] as (UserSolutionRecord & { _id: unknown })[];
			const mockFind = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(solutions),
			});
			db.tables = {
				usersolution: {
					...mockModel,
					find: mockFind,
				},
			} as typeof db.tables;

			const result = await db.getAllDappUserSolutions(["cap1"]);
			expect(result).toHaveLength(1);
			expect(result?.[0]).not.toHaveProperty("_id");
		});
	});

	describe("approveDappUserCommitment", () => {
		it("should approve commitment", async () => {
			await db.connect();
			const mockFindOneAndUpdate = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue({}),
			});
			db.tables = {
				commitment: {
					...mockModel,
					findOneAndUpdate: mockFindOneAndUpdate,
				},
			} as typeof db.tables;

			await db.approveDappUserCommitment("0x1");
			expect(mockFindOneAndUpdate).toHaveBeenCalled();
		});

		it("should include coords when provided", async () => {
			await db.connect();
			const mockFindOneAndUpdate = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue({}),
			});
			db.tables = {
				commitment: {
					...mockModel,
					findOneAndUpdate: mockFindOneAndUpdate,
				},
			} as typeof db.tables;

			await db.approveDappUserCommitment("0x1", [[[1, 2]]]);
			const update = mockFindOneAndUpdate.mock.calls[0][1];
			expect(update.$set.coords).toBeDefined();
		});
	});

	describe("disapproveDappUserCommitment", () => {
		it("should disapprove commitment", async () => {
			await db.connect();
			const mockFindOneAndUpdate = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue({}),
			});
			db.tables = {
				commitment: {
					...mockModel,
					findOneAndUpdate: mockFindOneAndUpdate,
				},
			} as typeof db.tables;

			await db.disapproveDappUserCommitment("0x1");
			expect(mockFindOneAndUpdate).toHaveBeenCalled();
		});
	});

	describe("createScheduledTaskStatus", () => {
		it("should create scheduled task status", async () => {
			await db.connect();
			const mockCreate = vi.fn().mockResolvedValue({
				_id: "task1",
			});
			db.tables = {
				scheduler: {
					...mockModel,
					create: mockCreate,
				},
			} as typeof db.tables;

			const result = await db.createScheduledTaskStatus(
				"BatchCommitment",
				"Completed",
			);
			expect(result).toBe("task1");
		});
	});

	describe("updateScheduledTaskStatus", () => {
		it("should update scheduled task status", async () => {
			await db.connect();
			const mockUpdateOne = vi.fn().mockResolvedValue({});
			db.tables = {
				scheduler: {
					...mockModel,
					updateOne: mockUpdateOne,
				},
			} as typeof db.tables;

			await db.updateScheduledTaskStatus(
				"task1" as unknown as ObjectId,
				"completed",
			);
			expect(mockUpdateOne).toHaveBeenCalled();
		});
	});

	describe("getClientRecord", () => {
		it("should return client record", async () => {
			await db.connect();
			const client = {
				account: "client1",
				settings: {},
				tier: "tier1",
			} as ClientRecord;
			const mockFindOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(client),
			});
			db.tables = {
				client: {
					...mockModel,
					findOne: mockFindOne,
				},
			} as typeof db.tables;

			const result = await db.getClientRecord("client1");
			expect(result).toEqual(client);
		});
	});

	describe("storeDetectorKey", () => {
		it("should store detector key", async () => {
			await db.connect();
			const mockCreate = vi.fn().mockResolvedValue({});
			db.tables = {
				detector: {
					...mockModel,
					create: mockCreate,
				},
			} as typeof db.tables;

			await db.storeDetectorKey("key1");
			expect(mockCreate).toHaveBeenCalled();
		});
	});

	describe("removeDetectorKey", () => {
		it("should remove detector key with default expiration", async () => {
			await db.connect();
			const mockUpdateOne = vi.fn().mockResolvedValue({});
			db.tables = {
				detector: {
					...mockModel,
					updateOne: mockUpdateOne,
				},
			} as typeof db.tables;

			await db.removeDetectorKey("key1");
			expect(mockUpdateOne).toHaveBeenCalled();
		});

		it("should use custom expiration time", async () => {
			await db.connect();
			const mockUpdateOne = vi.fn().mockResolvedValue({});
			db.tables = {
				detector: {
					...mockModel,
					updateOne: mockUpdateOne,
				},
			} as typeof db.tables;

			await db.removeDetectorKey("key1", 300);
			expect(mockUpdateOne).toHaveBeenCalled();
		});
	});

	describe("getDetectorKeys", () => {
		it("should return valid detector keys", async () => {
			await db.connect();
			const keys = [
				{ detectorKey: "key1" },
				{ detectorKey: "key2" },
			] as DetectorSchema[];
			const mockFind = vi.fn().mockReturnValue({
				sort: vi.fn().mockReturnValue({
					lean: vi.fn().mockResolvedValue(keys),
				}),
			});
			db.tables = {
				detector: {
					...mockModel,
					find: mockFind,
				},
			} as typeof db.tables;

			const result = await db.getDetectorKeys();
			expect(result).toEqual(["key1", "key2"]);
		});
	});

	describe("setClientContextEntropy", () => {
		it("should set client context entropy", async () => {
			await db.connect();
			const mockUpdateOne = vi.fn().mockResolvedValue({});
			db.tables = {
				clientContextEntropy: {
					...mockModel,
					updateOne: mockUpdateOne,
				},
			} as typeof db.tables;

			await db.setClientContextEntropy(
				"client1",
				ContextType.Default,
				"entropy1",
			);
			expect(mockUpdateOne).toHaveBeenCalled();
		});
	});

	describe("getClientContextEntropy", () => {
		it("should return client context entropy", async () => {
			await db.connect();
			const record = {
				account: "client1",
				contextType: ContextType.Default,
				entropy: "entropy1",
			} as ClientContextEntropyRecord;
			const mockFindOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(record),
			});
			db.tables = {
				clientContextEntropy: {
					...mockModel,
					findOne: mockFindOne,
				},
			} as typeof db.tables;

			const result = await db.getClientContextEntropy(
				"client1",
				ContextType.Default,
			);
			expect(result).toBe("entropy1");
		});

		it("should return undefined when not found", async () => {
			await db.connect();
			const mockFindOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});
			db.tables = {
				clientContextEntropy: {
					...mockModel,
					findOne: mockFindOne,
				},
			} as typeof db.tables;

			const result = await db.getClientContextEntropy(
				"client1",
				ContextType.Default,
			);
			expect(result).toBeUndefined();
		});
	});
});
