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
	StoredStatusNames,
	ContextType,
} from "@prosopo/types";
import type { Hash, ScheduledTaskStatus } from "@prosopo/types";

vi.mock("../base/mongo.js", () => {
	return {
		MongoDatabase: vi.fn().mockImplementation(() => ({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
			url: "mongodb://localhost:27017",
			dbname: "testdb",
			logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
			connected: true,
			connection: undefined,
		})),
	};
});

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

		(MongoDatabase as any).mockImplementation(() => ({
			connect: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
			url: "mongodb://localhost:27017",
			dbname: "testdb",
			logger: mockLogger,
			connected: true,
			connection: mockConnection,
		}));

		db = new ProviderDatabase({
			mongo: {
				url: "mongodb://localhost:27017",
				dbname: "testdb",
			},
			logger: mockLogger,
		});
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
			expect(db.tables).toEqual({});
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
			const dataset: Dataset = {
				datasetId: "dataset1",
				datasetContentId: "content1",
				format: "format1",
				captchas: [
					{
						captchaId: "captcha1",
						captchaContentId: "content1",
						items: [],
						target: [],
						salt: "salt1",
						solution: ["sol1"],
					},
				],
			} as Dataset;

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

		it("should throw error when no captcha found", async () => {
			const captchaIds = ["captcha1"];
			mockModels.captcha.find = vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue([]),
			});

			await expect(db.getCaptchaById(captchaIds)).rejects.toThrow(
				ProsopoDBError,
			);
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
			const taskName = "task1" as any;
			const status = "pending" as ScheduledTaskStatus;

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
			const status = "completed" as ScheduledTaskStatus;

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
			const status = "completed" as ScheduledTaskStatus;
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
});
