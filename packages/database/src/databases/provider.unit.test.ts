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

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { Connection, Model } from "mongoose";
import { ProsopoDBError } from "@prosopo/common";
import { ProviderDatabase } from "./provider.js";
import { MongoDatabase } from "../base/mongo.js";
import type {
	Dataset,
	DatasetWithIds,
	Captcha,
	SolutionRecord,
	UserCommitmentRecord,
	PoWCaptchaRecord,
	Session,
	PendingCaptchaRequest,
	ClientRecord,
	ScheduledTaskRecord,
} from "@prosopo/types-database";
import {
	CaptchaStatus,
	CaptchaStates,
	StoredStatusNames,
	ContextType,
	ScheduledTaskNames,
	ScheduledTaskStatus,
} from "@prosopo/types";
import type { Hash } from "@prosopo/types";

// Don't mock MongoDatabase - use actual class and spy on methods

vi.mock("@prosopo/redis-client", () => ({
	connectToRedis: vi.fn(() => ({} as any)),
	setupRedisIndex: vi.fn(() => ({} as any)),
}));

vi.mock("@prosopo/user-access-policy/redis", () => ({
	accessRulesRedisIndex: { name: "test-index" },
	createRedisAccessRulesStorage: vi.fn(() => ({} as any)),
}));

describe("ProviderDatabase", () => {
	let db: ProviderDatabase;
	let mockConnection: Connection;
	let mockModels: Record<string, Model<any>>;
	const mockLogger = {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	} as any;

	beforeEach(() => {
		vi.clearAllMocks();

		mockModels = {
			captcha: createMockModel(),
			dataset: createMockModel(),
			solution: createMockModel(),
			commitment: createMockModel(),
			usersolution: createMockModel(),
			pending: createMockModel(),
			scheduler: createMockModel(),
			client: createMockModel(),
			session: createMockModel(),
			detector: createMockModel(),
			powcaptcha: createMockModel(),
			clientContextEntropy: createMockModel(),
		};

		mockConnection = {
			model: vi.fn((modelName: string) => {
				const modelMap: Record<string, string> = {
					Captcha: "captcha",
					Dataset: "dataset",
					Solution: "solution",
					UserCommitment: "commitment",
					UserSolution: "usersolution",
					Pending: "pending",
					Scheduler: "scheduler",
					Client: "client",
					Session: "session",
					Detector: "detector",
					PowCaptcha: "powcaptcha",
					ClientContextEntropy: "clientContextEntropy",
				};
				return mockModels[modelMap[modelName] || ""];
			}),
		} as any;

		db = new ProviderDatabase({
			mongo: {
				url: "mongodb://localhost:27017",
				dbname: "testdb",
			},
			logger: mockLogger,
		});
		db.tables = mockModels as any;
		db.connection = mockConnection;
		db.connected = true;
		vi.spyOn(MongoDatabase.prototype, "connect").mockResolvedValue(undefined);
		vi.spyOn(MongoDatabase.prototype, "close").mockResolvedValue(undefined);
	});

	afterEach(async () => {
		if (db) {
			await db.close().catch(() => {
				// Ignore errors during cleanup
			});
		}
	});

	function createMockModel() {
		return {
			create: vi.fn().mockResolvedValue({ _id: "test-id" }),
			find: vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue([]),
				limit: vi.fn().mockReturnValue({
					lean: vi.fn().mockResolvedValue([]),
				}),
				sort: vi.fn().mockReturnValue({
					lean: vi.fn().mockResolvedValue([]),
					limit: vi.fn().mockReturnValue({
						lean: vi.fn().mockResolvedValue([]),
					}),
				}),
			}),
			findOne: vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			}),
			findOneAndUpdate: vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			}),
			updateOne: vi.fn().mockResolvedValue({ matchedCount: 1 }),
			updateMany: vi.fn().mockResolvedValue({ matchedCount: 1 }),
			deleteMany: vi.fn().mockResolvedValue({ deletedCount: 1 }),
			bulkWrite: vi.fn().mockResolvedValue({
				insertedCount: 0,
				upsertedCount: 0,
				matchedCount: 0,
				modifiedCount: 0,
			}),
			aggregate: vi.fn().mockResolvedValue([]),
			collection: {
				dropIndexes: vi.fn().mockResolvedValue(undefined),
			},
			ensureIndexes: vi.fn().mockResolvedValue(undefined),
		} as any;
	}

	describe("constructor", () => {
		it("should initialize with empty tables", () => {
			const newDb = new ProviderDatabase({
				mongo: {
					url: "mongodb://localhost:27017",
					dbname: "testdb",
				},
				logger: mockLogger,
			});
			expect(newDb.tables).toEqual({});
		});

		it("should initialize redis connections as null", () => {
			expect(() => db.getRedisConnection()).toThrow(ProsopoDBError);
			expect(() => db.getRedisAccessRulesConnection()).toThrow(ProsopoDBError);
			expect(() => db.getUserAccessRulesStorage()).toThrow(ProsopoDBError);
		});
	});

	describe("connect", () => {
		it("should call super connect and load tables", async () => {
			await db.connect();
			expect(MongoDatabase.prototype.connect).toHaveBeenCalled();
			expect(mockConnection.model).toHaveBeenCalled();
		});
	});

	describe("getTables", () => {
		it("should return tables when they exist", () => {
			db.tables = mockModels as any;
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
			db.tables = mockModels as any;

			await db.ensureIndexes();

			expect(mockModels.captcha.collection.dropIndexes).toHaveBeenCalled();
			expect(mockModels.captcha.ensureIndexes).toHaveBeenCalled();
		});

		it("should skip index creation when not connected", async () => {
			db.connected = false;
			db.tables = mockModels as any;

			await db.ensureIndexes();

			expect(mockModels.captcha.ensureIndexes).not.toHaveBeenCalled();
		});
	});

	describe("storeDataset", () => {
		it("should store dataset and captchas", async () => {
			const dataset: any = {
				datasetId: "0x1234",
				datasetContentId: "0x5678",
				format: "SelectAll",
				contentTree: [[]],
				solutionTree: [[]],
				captchas: [
					{
						captchaId: "captcha1",
						captchaContentId: "content1",
						items: [],
						target: "target1",
						salt: "salt1salt1salt1salt1salt1salt1salt1", // 34+ characters
						solution: ["sol1"],
					},
				],
			};

			mockModels.dataset.updateOne = vi.fn().mockResolvedValue({});
			mockModels.captcha.bulkWrite = vi.fn().mockResolvedValue({});
			mockModels.solution.bulkWrite = vi.fn().mockResolvedValue({});

			await db.storeDataset(dataset);

			expect(mockModels.dataset.updateOne).toHaveBeenCalled();
			expect(mockModels.captcha.bulkWrite).toHaveBeenCalled();
			expect(mockModels.solution.bulkWrite).toHaveBeenCalled();
		});

		it("should handle errors during dataset storage", async () => {
			const dataset: Dataset = {
				datasetId: "dataset1",
				datasetContentId: "content1",
				format: "format1",
				captchas: [],
			} as Dataset;

			const error = new Error("Storage failed");
			mockModels.dataset.updateOne = vi.fn().mockRejectedValue(error);

			await expect(db.storeDataset(dataset)).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("getSolutions", () => {
		it("should return solutions for a dataset", async () => {
			const datasetId = "dataset1";
			const solutions: SolutionRecord[] = [
				{
					captchaId: "captcha1",
					solution: ["sol1"],
					datasetId,
				} as SolutionRecord,
			];

			mockModels.solution.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(solutions),
			});

			const result = await db.getSolutions(datasetId);

			expect(result).toEqual(solutions);
			expect(mockModels.solution.find).toHaveBeenCalledWith({ datasetId });
		});

		it("should return empty array when no solutions found", async () => {
			const datasetId = "dataset1";
			mockModels.solution.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue([]),
			});

			const result = await db.getSolutions(datasetId);

			expect(result).toEqual([]);
		});
	});

	describe("getSolutionByCaptchaId", () => {
		it("should return solution when found", async () => {
			const captchaId = "captcha1";
			const solution: SolutionRecord = {
				captchaId,
				solution: ["sol1"],
			} as SolutionRecord;

			mockModels.solution.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(solution),
			});

			const result = await db.getSolutionByCaptchaId(captchaId);

			expect(result).toEqual(solution);
		});

		it("should return null when solution not found", async () => {
			const captchaId = "captcha1";
			mockModels.solution.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});

			const result = await db.getSolutionByCaptchaId(captchaId);

			expect(result).toBeNull();
		});
	});

	describe("getDataset", () => {
		it("should return dataset with captchas and solutions", async () => {
			const datasetId = "dataset1";
			const datasetDoc: DatasetWithIds = {
				datasetId,
				datasetContentId: "content1",
				format: "format1",
				contentTree: [],
				solutionTree: [],
				captchas: [],
			};

			const captchas: Captcha[] = [
				{
					captchaId: "captcha1",
					captchaContentId: "content1",
					items: [],
					target: [],
					salt: "salt1",
					solved: true,
				},
			];

			const solutions: SolutionRecord[] = [
				{
					captchaId: "captcha1",
					solution: ["sol1"],
				} as SolutionRecord,
			];

			mockModels.dataset.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(datasetDoc),
			});
			mockModels.captcha.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(captchas),
			});
			mockModels.solution.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(solutions),
			});

			const result = await db.getDataset(datasetId);

			expect(result.datasetId).toBe(datasetId);
			expect(result.captchas).toHaveLength(1);
			expect(result.captchas[0].solution).toEqual(["sol1"]);
		});

		it("should throw error when dataset not found", async () => {
			const datasetId = "dataset1";
			mockModels.dataset.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});

			await expect(db.getDataset(datasetId)).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("getRandomCaptcha", () => {
		it("should return random captcha when found", async () => {
			const datasetId = "0x1234" as Hash;
			const solved = true;
			const size = 1;

			const docs = [
				{
					_id: "id1",
					captchaId: "captcha1",
					datasetId,
					solved,
				},
			];

			mockModels.captcha.aggregate = vi.fn().mockResolvedValue(docs);

			const result = await db.getRandomCaptcha(solved, datasetId, size);

			expect(result).toHaveLength(1);
			expect(result![0].captchaId).toBe("captcha1");
			expect(result![0]).not.toHaveProperty("_id");
		});

		it("should throw error when no captcha found", async () => {
			const datasetId = "0x1234" as Hash;
			mockModels.captcha.aggregate = vi.fn().mockResolvedValue([]);

			await expect(
				db.getRandomCaptcha(true, datasetId, 1),
			).rejects.toThrow(ProsopoDBError);
		});

		it("should throw error for invalid hex datasetId", async () => {
			const datasetId = "invalid" as Hash;
			await expect(
				db.getRandomCaptcha(true, datasetId, 1),
			).rejects.toThrow(ProsopoDBError);
		});

		it("should return empty array when requesting zero captchas", async () => {
			const datasetId = "0x1234" as Hash;
			const result = await db.getRandomCaptcha(true, datasetId, 0);
			expect(result).toEqual([]);
		});

		it("should handle large size requests", async () => {
			const datasetId = "0x1234" as Hash;
			const docs = [{ captchaId: "captcha1" }];

			mockModels.captcha.aggregate = vi.fn().mockResolvedValue(docs);

			const result = await db.getRandomCaptcha(true, datasetId, 100);
			expect(result).toHaveLength(1);
			expect(mockModels.captcha.aggregate).toHaveBeenCalled();
		});
	});

	describe("getCaptchaById", () => {
		it("should return captchas by id", async () => {
			const captchaIds = ["captcha1", "captcha2"];
			const docs = [
				{ _id: "id1", captchaId: "captcha1" },
				{ _id: "id2", captchaId: "captcha2" },
			];

			mockModels.captcha.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(docs),
			});

			const result = await db.getCaptchaById(captchaIds);

			expect(result).toHaveLength(2);
			expect(result![0]).not.toHaveProperty("_id");
		});

		it("should return single captcha when one ID provided", async () => {
			const captchaIds = ["captcha1"];
			const docs = [{ _id: "id1", captchaId: "captcha1" }];

			mockModels.captcha.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(docs),
			});

			const result = await db.getCaptchaById(captchaIds);

			expect(result).toHaveLength(1);
			expect(result![0].captchaId).toBe("captcha1");
		});

		it("should throw error when no captcha found", async () => {
			const captchaIds = ["captcha1"];
			mockModels.captcha.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue([]),
			});

			await expect(db.getCaptchaById(captchaIds)).rejects.toThrow(
				ProsopoDBError,
			);
			await expect(db.getCaptchaById(captchaIds)).rejects.toThrow("DATABASE.CAPTCHA_GET_FAILED");
		});

		it("should handle empty captcha IDs array", async () => {
			const captchaIds: string[] = [];
			mockModels.captcha.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue([]),
			});

			await expect(db.getCaptchaById(captchaIds)).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("storePowCaptchaRecord", () => {
		it("should store PoW captcha record", async () => {
			const challenge = "challenge1" as any;
			const components = {
				userAccount: "user1",
				dappAccount: "dapp1",
				requestedAtTimestamp: Date.now(),
			};
			const difficulty = 5;
			const providerSignature = "sig1";
			const ipAddress = { ipv4: "127.0.0.1" } as any;
			const headers = {} as any;
			const ja4 = "ja4hash";

			mockModels.powcaptcha.create = vi.fn().mockResolvedValue({ _id: "id1" });

			await db.storePowCaptchaRecord(
				challenge,
				components,
				difficulty,
				providerSignature,
				ipAddress,
				headers,
				ja4,
			);

			expect(mockModels.powcaptcha.create).toHaveBeenCalled();
		});

		it("should handle errors during storage", async () => {
			const challenge = "challenge1" as any;
			const error = new Error("Storage failed");
			mockModels.powcaptcha.create = vi.fn().mockRejectedValue(error);

			await expect(
				db.storePowCaptchaRecord(
					challenge,
					{ userAccount: "u", dappAccount: "d", requestedAtTimestamp: Date.now() },
					5,
					"sig",
					{ ipv4: "127.0.0.1" } as any,
					{} as any,
					"ja4",
				),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("getPowCaptchaRecordByChallenge", () => {
		it("should return PoW captcha record when found", async () => {
			const challenge = "challenge1";
			const record: PoWCaptchaRecord = {
				challenge,
				userAccount: "user1",
			} as PoWCaptchaRecord;

			mockModels.powcaptcha.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(record),
			});

			const result = await db.getPowCaptchaRecordByChallenge(challenge);

			expect(result).toEqual(record);
		});

		it("should return null when record not found", async () => {
			const challenge = "challenge1";
			mockModels.powcaptcha.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});

			const result = await db.getPowCaptchaRecordByChallenge(challenge);

			expect(result).toBeNull();
		});

		it("should throw error when tables are undefined", async () => {
			db.tables = undefined as any;
			await expect(
				db.getPowCaptchaRecordByChallenge("challenge1"),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("updatePowCaptchaRecordResult", () => {
		it("should update PoW captcha record result", async () => {
			const challenge = "challenge1" as any;
			const result = { status: CaptchaStatus.approved };
			mockModels.powcaptcha.updateOne = vi.fn().mockResolvedValue({
				matchedCount: 1,
			});

			await db.updatePowCaptchaRecordResult(challenge, result);

			expect(mockModels.powcaptcha.updateOne).toHaveBeenCalled();
		});

		it("should throw error when no record found to update", async () => {
			const challenge = "challenge1" as any;
			mockModels.powcaptcha.updateOne = vi.fn().mockResolvedValue({
				matchedCount: 0,
			});

			await expect(
				db.updatePowCaptchaRecordResult(challenge, {
					status: CaptchaStatus.approved,
				}),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("getCheckedDappUserCommitments", () => {
		it("should return checked commitments", async () => {
			const commitments: UserCommitmentRecord[] = [
				{
					id: "commit1",
					serverChecked: true,
				} as UserCommitmentRecord,
			];

			mockModels.commitment.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(commitments),
			});

			const result = await db.getCheckedDappUserCommitments();

			expect(result).toEqual(commitments);
		});
	});

	describe("markDappUserCommitmentsStored", () => {
		it("should mark commitments as stored", async () => {
			const commitmentIds: Hash[] = ["commit1", "commit2"];

			await db.markDappUserCommitmentsStored(commitmentIds);

			expect(mockModels.commitment.updateMany).toHaveBeenCalledWith(
				{ id: { $in: commitmentIds } },
				expect.objectContaining({
					$set: expect.objectContaining({
						storedAtTimestamp: expect.any(Date),
					}),
				}),
				{ upsert: false },
			);
		});
	});

	describe("storeSessionRecord", () => {
		it("should store session record", async () => {
			const sessionRecord: Session = {
				sessionId: "session1",
				token: "token1",
			} as Session;

			mockModels.session.create = vi.fn().mockResolvedValue({ _id: "id1" });

			await db.storeSessionRecord(sessionRecord);

			expect(mockModels.session.create).toHaveBeenCalledWith(sessionRecord);
		});

		it("should handle errors during storage", async () => {
			const sessionRecord: Session = {
				sessionId: "session1",
				token: "token1",
			} as Session;
			const error = new Error("Storage failed");
			mockModels.session.create = vi.fn().mockRejectedValue(error);

			await expect(db.storeSessionRecord(sessionRecord)).rejects.toThrow(
				ProsopoDBError,
			);
		});
	});

	describe("getSessionRecordBySessionId", () => {
		it("should return session when found", async () => {
			const sessionId = "session1";
			const session: Session = {
				sessionId,
				token: "token1",
			} as Session;

			mockModels.session.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(session),
			});

			const result = await db.getSessionRecordBySessionId(sessionId);

			expect(result).toEqual(session);
		});

		it("should return undefined when session not found", async () => {
			const sessionId = "session1";
			mockModels.session.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});

			const result = await db.getSessionRecordBySessionId(sessionId);

			expect(result).toBeUndefined();
		});
	});

	describe("getPendingImageCommitment", () => {
		it("should return pending commitment when found", async () => {
			const requestHash = "0x1234";
			const pending: PendingCaptchaRequest = {
				requestHash,
				accountId: "account1",
			} as PendingCaptchaRequest;

			mockModels.pending.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(pending),
			});

			const result = await db.getPendingImageCommitment(requestHash);

			expect(result).toEqual(pending);
		});

		it("should throw error for invalid hex hash", async () => {
			const requestHash = "invalid";
			await expect(
				db.getPendingImageCommitment(requestHash),
			).rejects.toThrow(ProsopoDBError);
		});

		it("should throw error when pending not found", async () => {
			const requestHash = "0x1234";
			mockModels.pending.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});

			await expect(
				db.getPendingImageCommitment(requestHash),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("getClientRecord", () => {
		it("should return client record when found", async () => {
			const account = "account1";
			const client: ClientRecord = {
				account,
				settings: {},
				tier: "tier1",
			} as ClientRecord;

			mockModels.client.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(client),
			});

			const result = await db.getClientRecord(account);

			expect(result).toEqual(client);
		});

		it("should return undefined when client not found", async () => {
			const account = "account1";
			mockModels.client.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});

			const result = await db.getClientRecord(account);

			expect(result).toBeUndefined();
		});
	});

	describe("createScheduledTaskStatus", () => {
		it("should create scheduled task status", async () => {
			const taskName = ScheduledTaskNames.BatchCommitment;
			const status = ScheduledTaskStatus.Pending;

			mockModels.scheduler.create = vi.fn().mockResolvedValue({
				_id: "task-id",
			});

			const result = await db.createScheduledTaskStatus(taskName, status);

			expect(result).toBe("task-id");
			expect(mockModels.scheduler.create).toHaveBeenCalled();
		});
	});

	describe("updateScheduledTaskStatus", () => {
		it("should update scheduled task status", async () => {
			const taskId = "task-id" as any;
			const status = ScheduledTaskStatus.Completed;

			await db.updateScheduledTaskStatus(taskId, status);

			expect(mockModels.scheduler.updateOne).toHaveBeenCalledWith(
				{ _id: taskId },
				expect.objectContaining({
					$set: expect.objectContaining({
						status,
						updated: expect.any(Date),
					}),
				}),
				{ upsert: false },
			);
		});

		it("should include result when provided", async () => {
			const taskId = "task-id" as any;
			const status = ScheduledTaskStatus.Completed;
			const result = { success: true };

			await db.updateScheduledTaskStatus(taskId, status, result);

			expect(mockModels.scheduler.updateOne).toHaveBeenCalledWith(
				{ _id: taskId },
				expect.objectContaining({
					$set: expect.objectContaining({
						status,
						result,
					}),
				}),
				{ upsert: false },
			);
		});
	});

	describe("storeUserImageCaptchaSolution", () => {
		it("should store user image captcha solution with commitment", async () => {
			const captchas: any[] = [
				{
					captchaId: "captcha1",
					captchaContentId: "content1",
					salt: "salt1",
					solution: ["sol1"],
				},
			];
			const commit: any = {
				id: "commit1",
				userAccount: "user1",
				dappAccount: "dapp1",
				datasetId: "dataset1",
				providerAccount: "provider1",
				result: { status: CaptchaStatus.pending },
				userSignature: "sig1",
				ipAddress: { lower: BigInt(2130706433), type: "v4" },
				headers: {},
				ja4: "ja4hash",
				userSubmitted: false,
				serverChecked: false,
				requestedAtTimestamp: new Date(),
			};

			mockModels.commitment.updateOne = vi.fn().mockResolvedValue({});
			mockModels.usersolution.bulkWrite = vi.fn().mockResolvedValue({});

			await db.storeUserImageCaptchaSolution(captchas, commit);

			expect(mockModels.commitment.updateOne).toHaveBeenCalled();
			expect(mockModels.usersolution.bulkWrite).toHaveBeenCalled();
		});

		it("should not store commitment when captchas array is empty", async () => {
			const commit: any = {
				id: "commit1",
				userAccount: "user1",
				dappAccount: "dapp1",
				datasetId: "dataset1",
				providerAccount: "provider1",
				result: { status: CaptchaStatus.pending },
				userSignature: "sig1",
				ipAddress: { lower: BigInt(2130706433), type: "v4" },
				headers: {},
				ja4: "ja4hash",
				userSubmitted: false,
				serverChecked: false,
				requestedAtTimestamp: new Date(),
			};

			// When captchas array is empty, the method should still parse the commit
			// but not call bulkWrite. However, it will still call updateOne.
			// Let's check the actual behavior - if captchas.length is 0, it skips the bulkWrite
			mockModels.commitment.updateOne = vi.fn().mockResolvedValue({});
			mockModels.usersolution.bulkWrite = vi.fn().mockResolvedValue({});

			await db.storeUserImageCaptchaSolution([], commit);

			// The code checks captchas.length before calling bulkWrite
			// But it still calls updateOne for the commitment
			expect(mockModels.usersolution.bulkWrite).not.toHaveBeenCalled();
		});
	});

	describe("updateCaptcha", () => {
		it("should update captcha with valid hex datasetId", async () => {
			const captcha: Captcha = {
				captchaId: "captcha1",
				datasetId: "0x1234",
			} as Captcha;
			const datasetId = "0x1234" as Hash;

			await db.updateCaptcha(captcha, datasetId);

			expect(mockModels.captcha.updateOne).toHaveBeenCalled();
		});

		it("should throw error for invalid hex datasetId", async () => {
			const captcha: Captcha = {
				captchaId: "captcha1",
			} as Captcha;
			const datasetId = "invalid" as Hash;

			await expect(db.updateCaptcha(captcha, datasetId)).rejects.toThrow(
				ProsopoDBError,
			);
		});

		it("should handle errors during update", async () => {
			const captcha: Captcha = {
				captchaId: "captcha1",
			} as Captcha;
			const datasetId = "0x1234" as Hash;
			const error = new Error("Update failed");
			mockModels.captcha.updateOne = vi.fn().mockRejectedValue(error);

			await expect(db.updateCaptcha(captcha, datasetId)).rejects.toThrow(
				ProsopoDBError,
			);
		});

		it("should update captcha with additional fields", async () => {
			const captcha: Captcha = {
				captchaId: "captcha1",
				captchaContentId: "content1",
				solved: true,
			} as Captcha;
			const datasetId = "0x1234" as Hash;

			await db.updateCaptcha(captcha, datasetId);

			expect(mockModels.captcha.updateOne).toHaveBeenCalledWith(
				{ captchaId: "captcha1", datasetId },
				expect.objectContaining({
					captchaId: "captcha1",
					captchaContentId: "content1",
					solved: true,
				}),
				{ upsert: false },
			);
		});
	});

	describe("removeCaptchas", () => {
		it("should remove captchas by ids", async () => {
			const captchaIds = ["captcha1", "captcha2"];

			await db.removeCaptchas(captchaIds);

			expect(mockModels.captcha.deleteMany).toHaveBeenCalledWith({
				captchaId: { $in: captchaIds },
			});
		});

		it("should handle single captcha removal", async () => {
			const captchaIds = ["captcha1"];

			await db.removeCaptchas(captchaIds);

			expect(mockModels.captcha.deleteMany).toHaveBeenCalledWith({
				captchaId: { $in: captchaIds },
			});
		});

		it("should handle empty array", async () => {
			const captchaIds: string[] = [];

			await db.removeCaptchas(captchaIds);

			expect(mockModels.captcha.deleteMany).toHaveBeenCalledWith({
				captchaId: { $in: [] },
			});
		});

		it("should handle errors during removal", async () => {
			const captchaIds = ["captcha1"];
			const error = new Error("Delete failed");
			mockModels.captcha.deleteMany = vi.fn().mockRejectedValue(error);

			await expect(db.removeCaptchas(captchaIds)).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("getDatasetDetails", () => {
		it("should return dataset details with valid hex datasetId", async () => {
			const datasetId = "0x1234" as Hash;
			const datasetDoc: any = {
				datasetId,
				format: "format1",
			};

			mockModels.dataset.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(datasetDoc),
			});

			const result = await db.getDatasetDetails(datasetId);

			expect(result).toEqual(datasetDoc);
		});

		it("should throw error for invalid hex datasetId", async () => {
			const datasetId = "invalid" as Hash;

			await expect(db.getDatasetDetails(datasetId)).rejects.toThrow(
				ProsopoDBError,
			);
		});

		it("should throw error when dataset not found", async () => {
			const datasetId = "0x1234" as Hash;
			mockModels.dataset.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});

			await expect(db.getDatasetDetails(datasetId)).rejects.toThrow(
				ProsopoDBError,
			);
		});
	});

	describe("getUnstoredDappUserCommitments", () => {
		it("should return unstored commitments", async () => {
			const commitments: UserCommitmentRecord[] = [
				{ id: "commit1" } as UserCommitmentRecord,
			];

			mockModels.commitment.aggregate = vi
				.fn()
				.mockResolvedValue(commitments);

			const result = await db.getUnstoredDappUserCommitments(100, 0);

			expect(result).toEqual(commitments);
		});

		it("should use default limit and skip", async () => {
			await db.getUnstoredDappUserCommitments();

			expect(mockModels.commitment.aggregate).toHaveBeenCalled();
		});
	});

	describe("markDappUserCommitmentsChecked", () => {
		it("should mark commitments as checked", async () => {
			const commitmentIds: Hash[] = ["commit1", "commit2"];

			await db.markDappUserCommitmentsChecked(commitmentIds);

			expect(mockModels.commitment.updateMany).toHaveBeenCalledWith(
				{ id: { $in: commitmentIds } },
				expect.objectContaining({
					$set: expect.objectContaining({
						[StoredStatusNames.serverChecked]: true,
						lastUpdatedTimestamp: expect.any(Date),
					}),
				}),
				{ upsert: false },
			);
		});
	});

	describe("updateDappUserCommitment", () => {
		it("should update dapp user commitment", async () => {
			const commitmentId = "commit1" as Hash;
			const updates: any = { result: { status: CaptchaStatus.approved } };

			await db.updateDappUserCommitment(commitmentId, updates);

			expect(mockModels.commitment.updateOne).toHaveBeenCalledWith(
				{ id: commitmentId },
				updates,
			);
		});
	});

	describe("getUnstoredDappUserPoWCommitments", () => {
		it("should return unstored PoW commitments", async () => {
			const commitments: PoWCaptchaRecord[] = [
				{ challenge: "challenge1" } as PoWCaptchaRecord,
			];

			mockModels.powcaptcha.aggregate = vi
				.fn()
				.mockResolvedValue(commitments);

			const result = await db.getUnstoredDappUserPoWCommitments(100, 0);

			expect(result).toEqual(commitments);
		});
	});

	describe("markDappUserPoWCommitmentsStored", () => {
		it("should mark PoW commitments as stored", async () => {
			const challenges = ["challenge1", "challenge2"];

			await db.markDappUserPoWCommitmentsStored(challenges);

			expect(mockModels.powcaptcha.updateMany).toHaveBeenCalledWith(
				{ challenge: { $in: challenges } },
				expect.objectContaining({
					$set: expect.objectContaining({
						storedAtTimestamp: expect.any(Date),
					}),
				}),
				{ upsert: false },
			);
		});
	});

	describe("markDappUserPoWCommitmentsChecked", () => {
		it("should mark PoW commitments as checked", async () => {
			const challenges = ["challenge1", "challenge2"];

			await db.markDappUserPoWCommitmentsChecked(challenges);

			expect(mockModels.powcaptcha.updateMany).toHaveBeenCalledWith(
				{ challenge: { $in: challenges } },
				expect.objectContaining({
					$set: expect.objectContaining({
						[StoredStatusNames.serverChecked]: true,
						lastUpdatedTimestamp: expect.any(Date),
					}),
				}),
				{ upsert: false },
			);
		});
	});

	describe("updatePowCaptchaRecord", () => {
		it("should update PoW captcha record", async () => {
			const challenge = "challenge1" as any;
			const updates: any = { userSubmitted: true };

			await db.updatePowCaptchaRecord(challenge, updates);

			expect(mockModels.powcaptcha.updateOne).toHaveBeenCalledWith(
				{ challenge },
				{ $set: updates },
				{ upsert: false },
			);
		});
	});

	describe("getSessionRecordByToken", () => {
		it("should return session when found", async () => {
			const token = "token1";
			const session: Session = {
				sessionId: "session1",
				token,
			} as Session;

			mockModels.session.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(session),
			});

			const result = await db.getSessionRecordByToken(token);

			expect(result).toEqual(session);
		});

		it("should return undefined when session not found", async () => {
			const token = "token1";
			mockModels.session.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});

			const result = await db.getSessionRecordByToken(token);

			expect(result).toBeUndefined();
		});
	});

	describe("checkAndRemoveSession", () => {
		it("should check and remove session when found", async () => {
			const sessionId = "session1";
			const session: any = {
				sessionId,
				token: "token1",
			};

			mockModels.session.findOneAndUpdate = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(session),
			});

			const result = await db.checkAndRemoveSession(sessionId);

			expect(result).toEqual(session);
			expect(mockModels.session.findOneAndUpdate).toHaveBeenCalled();
		});

		it("should return undefined when session not found", async () => {
			const sessionId = "session1";
			mockModels.session.findOneAndUpdate = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});

			const result = await db.checkAndRemoveSession(sessionId);

			expect(result).toBeUndefined();
		});

		it("should handle errors during check and remove", async () => {
			const sessionId = "session1";
			const error = new Error("Operation failed");
			mockModels.session.findOneAndUpdate = vi.fn().mockReturnValue({
				lean: vi.fn().mockRejectedValue(error),
			});

			await expect(db.checkAndRemoveSession(sessionId)).rejects.toThrow(
				ProsopoDBError,
			);
		});
	});

	describe("getSessionByuserSitekeyIpHash", () => {
		it("should return session when found", async () => {
			const userSitekeyIpHash = "hash1";
			const session: any = {
				sessionId: "session1",
				userSitekeyIpHash,
			};

			mockModels.session.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(session),
			});

			const result = await db.getSessionByuserSitekeyIpHash(
				userSitekeyIpHash,
			);

			expect(result).toEqual(session);
		});

		it("should return undefined when session not found", async () => {
			const userSitekeyIpHash = "hash1";
			mockModels.session.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});

			const result = await db.getSessionByuserSitekeyIpHash(
				userSitekeyIpHash,
			);

			expect(result).toBeUndefined();
		});

		it("should handle errors during get", async () => {
			const userSitekeyIpHash = "hash1";
			const error = new Error("Operation failed");
			mockModels.session.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockRejectedValue(error),
			});

			await expect(
				db.getSessionByuserSitekeyIpHash(userSitekeyIpHash),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("getUnstoredSessionRecords", () => {
		it("should return unstored session records", async () => {
			const sessions: any[] = [{ sessionId: "session1" }];

			mockModels.session.aggregate = vi.fn().mockResolvedValue(sessions);

			const result = await db.getUnstoredSessionRecords(100, 0);

			expect(result).toEqual(sessions);
		});

		it("should use default limit and skip", async () => {
			await db.getUnstoredSessionRecords();

			expect(mockModels.session.aggregate).toHaveBeenCalled();
		});
	});

	describe("markSessionRecordsStored", () => {
		it("should mark session records as stored", async () => {
			const sessionIds = ["session1", "session2"];

			await db.markSessionRecordsStored(sessionIds);

			expect(mockModels.session.updateMany).toHaveBeenCalledWith(
				{ sessionId: { $in: sessionIds } },
				expect.objectContaining({
					$set: expect.objectContaining({
						storedAtTimestamp: expect.any(Date),
					}),
				}),
				{ upsert: false },
			);
		});
	});

	describe("storePendingImageCommitment", () => {
		it("should store pending image commitment with valid hex hash", async () => {
			const requestHash = "0x1234";
			const userAccount = "user1";
			const salt = "salt1";
			const deadlineTimestamp = Date.now();
			const requestedAtTimestamp = Date.now();
			const ipAddress = { ipv4: "127.0.0.1" } as any;
			const threshold = 5;

			await db.storePendingImageCommitment(
				userAccount,
				requestHash,
				salt,
				deadlineTimestamp,
				requestedAtTimestamp,
				ipAddress,
				threshold,
			);

			expect(mockModels.pending.updateOne).toHaveBeenCalled();
		});

		it("should throw error for invalid hex hash", async () => {
			const requestHash = "invalid";

			await expect(
				db.storePendingImageCommitment(
					"user1",
					requestHash,
					"salt1",
					Date.now(),
					Date.now(),
					{ ipv4: "127.0.0.1" } as any,
					5,
				),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("updatePendingImageCommitmentStatus", () => {
		it("should update pending commitment status with valid hex hash", async () => {
			const requestHash = "0x1234";

			await db.updatePendingImageCommitmentStatus(requestHash);

			expect(mockModels.pending.updateOne).toHaveBeenCalled();
		});

		it("should throw error for invalid hex hash", async () => {
			const requestHash = "invalid";

			await expect(
				db.updatePendingImageCommitmentStatus(requestHash),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("getAllCaptchasByDatasetId", () => {
		it("should return all captchas for dataset", async () => {
			const datasetId = "dataset1";
			const captchas: Captcha[] = [
				{ captchaId: "captcha1", datasetId } as Captcha,
			];

			mockModels.captcha.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(captchas),
			});

			const result = await db.getAllCaptchasByDatasetId(datasetId);

			expect(result).toHaveLength(1);
			expect(result![0]).not.toHaveProperty("_id");
		});

		it("should filter by solved state when provided", async () => {
			const datasetId = "dataset1";
			const captchas: Captcha[] = [
				{ captchaId: "captcha1", datasetId, solved: true } as Captcha,
			];

			mockModels.captcha.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(captchas),
			});

			await db.getAllCaptchasByDatasetId(
				datasetId,
				CaptchaStates.Solved,
			);

			expect(mockModels.captcha.find).toHaveBeenCalledWith({
				datasetId,
				solved: true,
			});
		});

		it("should throw error when no captchas found", async () => {
			const datasetId = "dataset1";
			mockModels.captcha.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});

			await expect(
				db.getAllCaptchasByDatasetId(datasetId),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("getAllDappUserSolutions", () => {
		it("should return all dapp user solutions", async () => {
			const captchaIds = ["captcha1", "captcha2"];
			const solutions: any[] = [
				{ captchaId: "captcha1", commitmentId: "commit1" },
			];

			mockModels.usersolution.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(solutions),
			});

			const result = await db.getAllDappUserSolutions(captchaIds);

			expect(result).toHaveLength(1);
			expect(result![0]).not.toHaveProperty("_id");
		});

		it("should throw error when no solutions found", async () => {
			const captchaIds = ["captcha1"];
			mockModels.usersolution.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});

			await expect(
				db.getAllDappUserSolutions(captchaIds),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("getDatasetIdWithSolvedCaptchasOfSizeN", () => {
		it("should return dataset id with solved captchas", async () => {
			const solvedCaptchaCount = 10;
			const docs = [{ _id: "dataset1" }];

			mockModels.solution.aggregate = vi.fn().mockResolvedValue(docs);

			const result =
				await db.getDatasetIdWithSolvedCaptchasOfSizeN(solvedCaptchaCount);

			expect(result).toBe("dataset1");
		});

		it("should throw error when no dataset found", async () => {
			const solvedCaptchaCount = 10;
			mockModels.solution.aggregate = vi.fn().mockResolvedValue([]);

			await expect(
				db.getDatasetIdWithSolvedCaptchasOfSizeN(solvedCaptchaCount),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("getRandomSolvedCaptchasFromSingleDataset", () => {
		it("should return random solved captchas with valid hex datasetId", async () => {
			const datasetId = "0x1234";
			const size = 5;
			const docs: any[] = [
				{
					captchaId: "captcha1",
					captchaContentId: "content1",
					solution: ["sol1"],
				},
			];

			mockModels.solution.aggregate = vi.fn().mockResolvedValue(docs);

			const result = await db.getRandomSolvedCaptchasFromSingleDataset(
				datasetId,
				size,
			);

			expect(result).toEqual(docs);
		});

		it("should throw error for invalid hex datasetId", async () => {
			const datasetId = "invalid";

			await expect(
				db.getRandomSolvedCaptchasFromSingleDataset(datasetId, 5),
			).rejects.toThrow(ProsopoDBError);
		});

		it("should throw error when no captchas found", async () => {
			const datasetId = "0x1234";
			mockModels.solution.aggregate = vi.fn().mockResolvedValue([]);

			await expect(
				db.getRandomSolvedCaptchasFromSingleDataset(datasetId, 5),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("getDappUserSolutionById", () => {
		it("should return dapp user solution when found", async () => {
			const commitmentId = "commit1";
			const solution: any = {
				commitmentId,
				captchaId: "captcha1",
			};

			mockModels.usersolution.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(solution),
			});

			const result = await db.getDappUserSolutionById(commitmentId);

			expect(result).toEqual(solution);
		});

		it("should throw error when solution not found", async () => {
			const commitmentId = "commit1";
			mockModels.usersolution.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});

			await expect(
				db.getDappUserSolutionById(commitmentId),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("getDappUserCommitmentById", () => {
		it("should return commitment when found", async () => {
			const commitmentId = "commit1";
			const commitment: UserCommitmentRecord = {
				id: commitmentId,
			} as UserCommitmentRecord;

			mockModels.commitment.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(commitment),
			});

			const result = await db.getDappUserCommitmentById(commitmentId);

			expect(result).toEqual(commitment);
		});

		it("should return undefined when commitment not found", async () => {
			const commitmentId = "commit1";
			mockModels.commitment.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});

			const result = await db.getDappUserCommitmentById(commitmentId);

			expect(result).toBeUndefined();
		});
	});

	describe("getDappUserCommitmentByAccount", () => {
		it("should return commitments by account", async () => {
			const userAccount = "user1";
			const dappAccount = "dapp1";
			const commitments: UserCommitmentRecord[] = [
				{ id: "commit1", userAccount, dappAccount } as UserCommitmentRecord,
			];

			mockModels.commitment.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(commitments),
			});

			const result = await db.getDappUserCommitmentByAccount(
				userAccount,
				dappAccount,
			);

			expect(result).toEqual(commitments);
		});

		it("should return empty array when no commitments found", async () => {
			const userAccount = "user1";
			const dappAccount = "dapp1";
			mockModels.commitment.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});

			const result = await db.getDappUserCommitmentByAccount(
				userAccount,
				dappAccount,
			);

			expect(result).toEqual([]);
		});
	});

	describe("approveDappUserCommitment", () => {
		it("should approve commitment", async () => {
			const commitmentId = "commit1";
			const coords: [number, number][][] = [[[1, 2]]];

			await db.approveDappUserCommitment(commitmentId, coords);

			expect(mockModels.commitment.findOneAndUpdate).toHaveBeenCalled();
		});

		it("should approve commitment without coords", async () => {
			const commitmentId = "commit1";

			await db.approveDappUserCommitment(commitmentId);

			expect(mockModels.commitment.findOneAndUpdate).toHaveBeenCalled();
		});

		it("should handle errors during approval", async () => {
			const commitmentId = "commit1";
			const error = new Error("Approval failed");
			mockModels.commitment.findOneAndUpdate = vi.fn().mockReturnValue({
				lean: vi.fn().mockRejectedValue(error),
			});

			await expect(
				db.approveDappUserCommitment(commitmentId),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("disapproveDappUserCommitment", () => {
		it("should disapprove commitment with reason", async () => {
			const commitmentId = "commit1";
			const reason = "invalid" as any;
			const coords: [number, number][][] = [[[1, 2]]];

			await db.disapproveDappUserCommitment(commitmentId, reason, coords);

			expect(mockModels.commitment.findOneAndUpdate).toHaveBeenCalled();
		});

		it("should disapprove commitment without reason or coords", async () => {
			const commitmentId = "commit1";

			await db.disapproveDappUserCommitment(commitmentId);

			expect(mockModels.commitment.findOneAndUpdate).toHaveBeenCalled();
		});

		it("should handle errors during disapproval", async () => {
			const commitmentId = "commit1";
			const error = new Error("Disapproval failed");
			mockModels.commitment.findOneAndUpdate = vi.fn().mockReturnValue({
				lean: vi.fn().mockRejectedValue(error),
			});

			await expect(
				db.disapproveDappUserCommitment(commitmentId),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("flagProcessedDappUserSolutions", () => {
		it("should flag solutions as processed", async () => {
			const captchaIds: Hash[] = ["captcha1", "captcha2"];

			mockModels.usersolution.updateMany = vi
				.fn()
				.mockResolvedValue({ matchedCount: 2 });

			await db.flagProcessedDappUserSolutions(captchaIds);

			expect(mockModels.usersolution.updateMany).toHaveBeenCalledWith(
				{ captchaId: { $in: captchaIds } },
				{ $set: { processed: true } },
				{ upsert: false },
			);
		});

		it("should handle errors during flagging", async () => {
			const captchaIds: Hash[] = ["captcha1"];
			const error = new Error("Flagging failed");
			mockModels.usersolution.updateMany = vi
				.fn()
				.mockRejectedValue(error);

			await expect(
				db.flagProcessedDappUserSolutions(captchaIds),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("flagProcessedDappUserCommitments", () => {
		it("should flag commitments as processed", async () => {
			const commitmentIds: Hash[] = ["commit1", "commit2"];

			mockModels.commitment.updateMany = vi
				.fn()
				.mockResolvedValue({ matchedCount: 2 });

			await db.flagProcessedDappUserCommitments(commitmentIds);

			expect(mockModels.commitment.updateMany).toHaveBeenCalled();
		});

		it("should handle errors during flagging", async () => {
			const commitmentIds: Hash[] = ["commit1"];
			const error = new Error("Flagging failed");
			mockModels.commitment.updateMany = vi
				.fn()
				.mockRejectedValue(error);

			await expect(
				db.flagProcessedDappUserCommitments(commitmentIds),
			).rejects.toThrow(ProsopoDBError);
		});
	});

	describe("getScheduledTaskStatus", () => {
		it("should return task status when found", async () => {
			const taskId = "task-id" as any;
			const status = ScheduledTaskStatus.Pending;
			const task: ScheduledTaskRecord = {
				_id: taskId,
				status,
			} as ScheduledTaskRecord;

			mockModels.scheduler.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(task),
			});

			const result = await db.getScheduledTaskStatus(taskId, status);

			expect(result).toEqual(task);
		});

		it("should return undefined when task not found", async () => {
			const taskId = "task-id" as any;
			const status = ScheduledTaskStatus.Pending;
			mockModels.scheduler.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});

			const result = await db.getScheduledTaskStatus(taskId, status);

			expect(result).toBeUndefined();
		});
	});

	describe("getLastScheduledTaskStatus", () => {
		it("should return last task status when found", async () => {
			const task = ScheduledTaskNames.BatchCommitment;
			const taskRecord: ScheduledTaskRecord = {
				_id: "id1",
				processName: task,
			} as ScheduledTaskRecord;

			mockModels.scheduler.findOne = vi.fn().mockReturnValue({
				sort: vi.fn().mockReturnValue({
					limit: vi.fn().mockReturnValue({
						lean: vi.fn().mockResolvedValue(taskRecord),
					}),
				}),
			});

			const result = await db.getLastScheduledTaskStatus(task);

			expect(result).toEqual(taskRecord);
		});

		it("should filter by status when provided", async () => {
			const task = ScheduledTaskNames.BatchCommitment;
			const status = ScheduledTaskStatus.Completed;

			mockModels.scheduler.findOne = vi.fn().mockReturnValue({
				sort: vi.fn().mockReturnValue({
					limit: vi.fn().mockReturnValue({
						lean: vi.fn().mockResolvedValue(null),
					}),
				}),
			});

			await db.getLastScheduledTaskStatus(task, status);

			expect(mockModels.scheduler.findOne).toHaveBeenCalledWith(
				expect.objectContaining({ status }),
			);
		});

		it("should return undefined when task not found", async () => {
			const task = ScheduledTaskNames.BatchCommitment;
			mockModels.scheduler.findOne = vi.fn().mockReturnValue({
				sort: vi.fn().mockReturnValue({
					limit: vi.fn().mockReturnValue({
						lean: vi.fn().mockResolvedValue(null),
					}),
				}),
			});

			const result = await db.getLastScheduledTaskStatus(task);

			expect(result).toBeUndefined();
		});
	});

	describe("cleanupScheduledTaskStatus", () => {
		it("should cleanup scheduled task status", async () => {
			const status = ScheduledTaskStatus.Completed;

			await db.cleanupScheduledTaskStatus(status);

			expect(mockModels.scheduler.deleteMany).toHaveBeenCalledWith({
				status,
			});
		});
	});

	describe("updateClientRecords", () => {
		it("should update client records", async () => {
			const clientRecords: ClientRecord[] = [
				{
					account: "account1",
					settings: {},
					tier: "tier1",
				} as ClientRecord,
			];

			await db.updateClientRecords(clientRecords);

			expect(mockModels.client.bulkWrite).toHaveBeenCalled();
		});

		it("should not update when records array is empty", async () => {
			await db.updateClientRecords([]);

			expect(mockModels.client.bulkWrite).not.toHaveBeenCalled();
		});
	});

	describe("getAllClientRecords", () => {
		it("should return all client records", async () => {
			const clients: ClientRecord[] = [
				{ account: "account1" } as ClientRecord,
			];

			mockModels.client.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(clients),
			});

			const result = await db.getAllClientRecords();

			expect(result).toEqual(clients);
		});

		it("should return empty array when no clients found", async () => {
			mockModels.client.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});

			const result = await db.getAllClientRecords();

			expect(result).toEqual([]);
		});
	});

	describe("storeDetectorKey", () => {
		it("should store detector key", async () => {
			const detectorKey = "key1";

			await db.storeDetectorKey(detectorKey);

			expect(mockModels.detector.create).toHaveBeenCalledWith({
				detectorKey,
				createdAt: expect.any(Date),
			});
		});
	});

	describe("removeDetectorKey", () => {
		it("should remove detector key with default expiration", async () => {
			const detectorKey = "key1";

			await db.removeDetectorKey(detectorKey);

			expect(mockModels.detector.updateOne).toHaveBeenCalled();
		});

		it("should remove detector key with custom expiration", async () => {
			const detectorKey = "key1";
			const expirationInSeconds = 300;

			await db.removeDetectorKey(detectorKey, expirationInSeconds);

			expect(mockModels.detector.updateOne).toHaveBeenCalled();
		});
	});

	describe("getDetectorKeys", () => {
		it("should return valid detector keys", async () => {
			const keyRecords: any[] = [
				{ detectorKey: "key1" },
				{ detectorKey: "key2" },
			];

			mockModels.detector.find = vi.fn().mockReturnValue({
				sort: vi.fn().mockReturnValue({
					lean: vi.fn().mockResolvedValue(keyRecords),
				}),
			});

			const result = await db.getDetectorKeys();

			expect(result).toEqual(["key1", "key2"]);
		});

		it("should return empty array when no keys found", async () => {
			mockModels.detector.find = vi.fn().mockReturnValue({
				sort: vi.fn().mockReturnValue({
					lean: vi.fn().mockResolvedValue(null),
				}),
			});

			const result = await db.getDetectorKeys();

			expect(result).toEqual([]);
		});
	});

	describe("setClientContextEntropy", () => {
		it("should set client context entropy", async () => {
			const account = "account1";
			const contextType = ContextType.Default;
			const entropy = "entropy1";

			await db.setClientContextEntropy(account, contextType, entropy);

			expect(mockModels.clientContextEntropy.updateOne).toHaveBeenCalledWith(
				{ account, contextType },
				{ $set: { account, contextType, entropy } },
				{ upsert: true },
			);
		});
	});

	describe("getClientContextEntropy", () => {
		it("should return entropy when found", async () => {
			const account = "account1";
			const contextType = ContextType.Default;
			const doc: any = { entropy: "entropy1" };

			mockModels.clientContextEntropy.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(doc),
			});

			const result = await db.getClientContextEntropy(account, contextType);

			expect(result).toBe("entropy1");
		});

		it("should return undefined when entropy not found", async () => {
			const account = "account1";
			const contextType = ContextType.Default;
			mockModels.clientContextEntropy.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(null),
			});

			const result = await db.getClientContextEntropy(account, contextType);

			expect(result).toBeUndefined();
		});
	});

	describe("sampleContextEntropy", () => {
		it("should sample context entropy for Default context", async () => {
			const sampleSize = 5;
			const siteKey = "site1";
			const contextType = ContextType.Default;

			mockModels.powcaptcha.aggregate = vi.fn().mockResolvedValue([
				{ sessionId: "session1" },
			]);
			mockModels.session.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue({
					decryptedHeadHash: "hash1",
				}),
			});

			const result = await db.sampleContextEntropy(
				sampleSize,
				siteKey,
				contextType,
			);

			expect(result).toEqual(["hash1"]);
		});

		it("should sample context entropy for Webview context", async () => {
			const sampleSize = 5;
			const siteKey = "site1";
			const contextType = ContextType.Webview;

			mockModels.powcaptcha.aggregate = vi.fn().mockResolvedValue([
				{ sessionId: "session1" },
			]);
			mockModels.session.findOne = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue({
					decryptedHeadHash: "hash1",
				}),
			});

			const result = await db.sampleContextEntropy(
				sampleSize,
				siteKey,
				contextType,
			);

			expect(result).toEqual(["hash1"]);
		});

		it("should throw error when sample size exceeds max", async () => {
			const sampleSize = 20000;
			const siteKey = "site1";
			const contextType = ContextType.Default;

			await expect(
				db.sampleContextEntropy(sampleSize, siteKey, contextType),
			).rejects.toThrow(ProsopoDBError);
		});

		it("should return empty array when no records found", async () => {
			const sampleSize = 5;
			const siteKey = "site1";
			const contextType = ContextType.Default;

			mockModels.powcaptcha.aggregate = vi.fn().mockResolvedValue([]);

			const result = await db.sampleContextEntropy(
				sampleSize,
				siteKey,
				contextType,
			);

			expect(result).toEqual([]);
		});
	});
});






