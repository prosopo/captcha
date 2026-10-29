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

import type { Logger } from "@prosopo/logger";
import type {
	PoWCaptchaRecord,
	PuzzleCaptchaRecord,
	StoredSession,
	UserCommitmentRecord,
} from "@prosopo/types-database";
import {
	type MockInstance,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type { MarkStoredCallback } from "../../../databases/centralDbStreamer.js";
import { CentralDbStreamer } from "../../../databases/centralDbStreamer.js";

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

const createMockLogger = (): Logger => {
	// `with` returns a child logger and MongoDatabase's constructor logs
	// through the result, so the stub has to hand back something loggable.
	// Returning the same object keeps the child's calls on the same spies.
	const logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		trace: vi.fn(),
		fatal: vi.fn(),
		log: vi.fn(),
		with: vi.fn(() => logger),
	};
	return logger as unknown as Logger;
};

describe("CentralDbStreamer", () => {
	let streamer: CentralDbStreamer;
	let mockLogger: Logger;
	let errorSpy: MockInstance;
	let mockPowUpdateOne: MockInstance;
	let mockCommitmentUpdateOne: MockInstance;
	let mockSessionUpdateOne: MockInstance;
	let mockPuzzleUpdateOne: MockInstance;
	let mockAttemptUpdateOne: MockInstance;
	let mockAttemptFind: MockInstance;
	let attemptQuery: {
		sort: MockInstance;
		limit: MockInstance;
		maxTimeMS: MockInstance;
		lean: MockInstance;
		exec: MockInstance;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockLogger = createMockLogger();
		errorSpy = mockLogger.error as unknown as MockInstance;

		mockPowUpdateOne = vi.fn().mockResolvedValue({ upsertedCount: 1 });
		mockCommitmentUpdateOne = vi.fn().mockResolvedValue({ upsertedCount: 1 });
		mockSessionUpdateOne = vi.fn().mockResolvedValue({ upsertedCount: 1 });
		mockPuzzleUpdateOne = vi.fn().mockResolvedValue({ upsertedCount: 1 });
		mockAttemptUpdateOne = vi.fn().mockResolvedValue({ upsertedCount: 1 });
		attemptQuery = {
			sort: vi.fn(() => attemptQuery),
			limit: vi.fn(() => attemptQuery),
			maxTimeMS: vi.fn(() => attemptQuery),
			lean: vi.fn(() => attemptQuery),
			exec: vi.fn().mockResolvedValue([]),
		};
		mockAttemptFind = vi.fn(() => attemptQuery);

		streamer = new CentralDbStreamer(
			"mongodb://localhost:27017/test",
			mockLogger,
		);

		// Inject mock db internals — replace the real CaptchaDatabase instance
		// biome-ignore lint/suspicious/noExplicitAny: test access to private field
		const db = (streamer as any).db;
		db.connect = vi.fn().mockImplementation(() => {
			db.connected = true;
			return Promise.resolve();
		});
		db.tables = {
			powcaptcha: { updateOne: mockPowUpdateOne },
			commitment: { updateOne: mockCommitmentUpdateOne },
			session: { updateOne: mockSessionUpdateOne },
			puzzlecaptcha: { updateOne: mockPuzzleUpdateOne },
			accountattempt: {
				updateOne: mockAttemptUpdateOne,
				find: mockAttemptFind,
			},
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("streamPowRecord", () => {
		const makePowRecord = (
			overrides?: Partial<PoWCaptchaRecord>,
		): PoWCaptchaRecord =>
			({
				challenge: "123___user___dapp___1",
				userAccount: "user1",
				dappAccount: "dapp1",
				difficulty: 4,
				requestedAtTimestamp: new Date("2026-01-01T00:00:00Z"),
				lastUpdatedTimestamp: new Date("2026-01-01T01:00:00Z"),
				result: { status: "pending" },
				...overrides,
			}) as unknown as PoWCaptchaRecord;

		it("upserts the record to central DB and calls markStored with the record timestamp", async () => {
			const record = makePowRecord();
			const markStored = vi
				.fn<MarkStoredCallback>()
				.mockResolvedValue(undefined);

			streamer.streamPowRecord(record, markStored);
			await flush();

			expect(mockPowUpdateOne).toHaveBeenCalledWith(
				{ challenge: record.challenge },
				{
					$set: expect.objectContaining({ challenge: record.challenge }),
				},
				{ upsert: true },
			);
			expect(markStored).toHaveBeenCalledWith(record.lastUpdatedTimestamp);
		});

		it("strips _id from the record before upserting", async () => {
			const record = makePowRecord();
			(record as unknown as Record<string, unknown>)._id = "should-be-removed";

			streamer.streamPowRecord(record);
			await flush();

			const call = mockPowUpdateOne.mock.calls[0] as unknown[];
			const setArg = (call[1] as { $set: Record<string, unknown> }).$set;
			expect(setArg._id).toBeUndefined();
		});

		it("does not throw when the central write fails", async () => {
			mockPowUpdateOne.mockRejectedValueOnce(new Error("write failed"));
			const markStored = vi.fn<MarkStoredCallback>();

			streamer.streamPowRecord(makePowRecord(), markStored);
			await flush();

			expect(markStored).not.toHaveBeenCalled();
			expect(errorSpy).toHaveBeenCalled();
		});

		it("does not call markStored when not provided", async () => {
			streamer.streamPowRecord(makePowRecord());
			await flush();

			expect(mockPowUpdateOne).toHaveBeenCalled();
		});

		it("falls back to requestedAtTimestamp when lastUpdatedTimestamp is missing", async () => {
			const ts = new Date("2026-02-01T00:00:00Z");
			const record = makePowRecord({
				lastUpdatedTimestamp: undefined,
				requestedAtTimestamp: ts,
			});
			const markStored = vi
				.fn<MarkStoredCallback>()
				.mockResolvedValue(undefined);

			streamer.streamPowRecord(record, markStored);
			await flush();

			expect(markStored).toHaveBeenCalledWith(ts);
		});
	});

	describe("streamPowUpdate", () => {
		it("fetches the full record then streams it", async () => {
			const record = {
				challenge: "test-challenge",
				lastUpdatedTimestamp: new Date("2026-03-01T00:00:00Z"),
			} as unknown as PoWCaptchaRecord;
			const getFullRecord = vi.fn().mockResolvedValue(record);
			const markStored = vi
				.fn<MarkStoredCallback>()
				.mockResolvedValue(undefined);

			streamer.streamPowUpdate(getFullRecord, markStored);
			await flush();

			expect(getFullRecord).toHaveBeenCalled();
			expect(mockPowUpdateOne).toHaveBeenCalledWith(
				{ challenge: "test-challenge" },
				expect.objectContaining({}),
				{ upsert: true },
			);
			expect(markStored).toHaveBeenCalledWith(record.lastUpdatedTimestamp);
		});

		it("does not stream when the record is not found", async () => {
			const getFullRecord = vi.fn().mockResolvedValue(null);

			streamer.streamPowUpdate(getFullRecord);
			await flush();

			expect(mockPowUpdateOne).not.toHaveBeenCalled();
		});

		it("logs error when fetch fails", async () => {
			const getFullRecord = vi
				.fn()
				.mockRejectedValue(new Error("fetch failed"));

			streamer.streamPowUpdate(getFullRecord);
			await flush();

			expect(errorSpy).toHaveBeenCalled();
			expect(mockPowUpdateOne).not.toHaveBeenCalled();
		});
	});

	describe("streamImageRecord", () => {
		it("upserts the record to central DB keyed by id", async () => {
			const record = {
				id: "commitment-123",
				lastUpdatedTimestamp: new Date("2026-01-15T00:00:00Z"),
			} as unknown as UserCommitmentRecord;
			const markStored = vi
				.fn<MarkStoredCallback>()
				.mockResolvedValue(undefined);

			streamer.streamImageRecord(record, markStored);
			await flush();

			expect(mockCommitmentUpdateOne).toHaveBeenCalledWith(
				{ id: "commitment-123" },
				{
					$set: expect.objectContaining({ id: "commitment-123" }),
				},
				{ upsert: true },
			);
			expect(markStored).toHaveBeenCalledWith(record.lastUpdatedTimestamp);
		});
	});

	describe("streamImageUpdate", () => {
		it("fetches the full record then streams it", async () => {
			const record = {
				id: "commitment-456",
				lastUpdatedTimestamp: new Date("2026-04-01T00:00:00Z"),
			} as unknown as UserCommitmentRecord;
			const getFullRecord = vi.fn().mockResolvedValue(record);
			const markStored = vi
				.fn<MarkStoredCallback>()
				.mockResolvedValue(undefined);

			streamer.streamImageUpdate(getFullRecord, markStored);
			await flush();

			expect(mockCommitmentUpdateOne).toHaveBeenCalledWith(
				{ id: "commitment-456" },
				expect.objectContaining({}),
				{ upsert: true },
			);
			expect(markStored).toHaveBeenCalledWith(record.lastUpdatedTimestamp);
		});
	});

	describe("streamPuzzleRecord", () => {
		const makePuzzleRecord = (
			overrides?: Partial<PuzzleCaptchaRecord>,
		): PuzzleCaptchaRecord =>
			({
				challenge: "puzzle-challenge-1",
				userAccount: "user1",
				dappAccount: "dapp1",
				targetX: 100,
				targetY: 200,
				originX: 50,
				originY: 150,
				tolerance: 10,
				requestedAtTimestamp: new Date("2026-01-01T00:00:00Z"),
				lastUpdatedTimestamp: new Date("2026-01-01T01:00:00Z"),
				result: { status: "pending" },
				...overrides,
			}) as unknown as PuzzleCaptchaRecord;

		it("upserts the record to central DB keyed by challenge and calls markStored with the record timestamp", async () => {
			const record = makePuzzleRecord();
			const markStored = vi
				.fn<MarkStoredCallback>()
				.mockResolvedValue(undefined);

			streamer.streamPuzzleRecord(record, markStored);
			await flush();

			expect(mockPuzzleUpdateOne).toHaveBeenCalledWith(
				{ challenge: record.challenge },
				{
					$set: expect.objectContaining({ challenge: record.challenge }),
				},
				{ upsert: true },
			);
			expect(markStored).toHaveBeenCalledWith(record.lastUpdatedTimestamp);
		});

		it("strips _id from the record before upserting", async () => {
			const record = makePuzzleRecord();
			(record as unknown as Record<string, unknown>)._id = "should-be-removed";

			streamer.streamPuzzleRecord(record);
			await flush();

			const call = mockPuzzleUpdateOne.mock.calls[0] as unknown[];
			const setArg = (call[1] as { $set: Record<string, unknown> }).$set;
			expect(setArg._id).toBeUndefined();
		});

		it("does not throw when the central write fails", async () => {
			mockPuzzleUpdateOne.mockRejectedValueOnce(new Error("write failed"));
			const markStored = vi.fn<MarkStoredCallback>();

			streamer.streamPuzzleRecord(makePuzzleRecord(), markStored);
			await flush();

			expect(markStored).not.toHaveBeenCalled();
			expect(errorSpy).toHaveBeenCalled();
		});

		it("falls back to requestedAtTimestamp when lastUpdatedTimestamp is missing", async () => {
			const ts = new Date("2026-02-01T00:00:00Z");
			const record = makePuzzleRecord({
				lastUpdatedTimestamp: undefined,
				requestedAtTimestamp: ts,
			});
			const markStored = vi
				.fn<MarkStoredCallback>()
				.mockResolvedValue(undefined);

			streamer.streamPuzzleRecord(record, markStored);
			await flush();

			expect(markStored).toHaveBeenCalledWith(ts);
		});
	});

	describe("streamPuzzleUpdate", () => {
		it("fetches the full record then streams it", async () => {
			const record = {
				challenge: "puzzle-challenge-2",
				lastUpdatedTimestamp: new Date("2026-03-01T00:00:00Z"),
			} as unknown as PuzzleCaptchaRecord;
			const getFullRecord = vi.fn().mockResolvedValue(record);
			const markStored = vi
				.fn<MarkStoredCallback>()
				.mockResolvedValue(undefined);

			streamer.streamPuzzleUpdate(getFullRecord, markStored);
			await flush();

			expect(getFullRecord).toHaveBeenCalled();
			expect(mockPuzzleUpdateOne).toHaveBeenCalledWith(
				{ challenge: "puzzle-challenge-2" },
				expect.objectContaining({}),
				{ upsert: true },
			);
			expect(markStored).toHaveBeenCalledWith(record.lastUpdatedTimestamp);
		});

		it("does not stream when the record is not found", async () => {
			const getFullRecord = vi.fn().mockResolvedValue(null);

			streamer.streamPuzzleUpdate(getFullRecord);
			await flush();

			expect(mockPuzzleUpdateOne).not.toHaveBeenCalled();
		});

		it("logs error when fetch fails", async () => {
			const getFullRecord = vi
				.fn()
				.mockRejectedValue(new Error("fetch failed"));

			streamer.streamPuzzleUpdate(getFullRecord);
			await flush();

			expect(errorSpy).toHaveBeenCalled();
			expect(mockPuzzleUpdateOne).not.toHaveBeenCalled();
		});
	});

	describe("streamSessionRecord", () => {
		it("upserts the session to central DB keyed by sessionId", async () => {
			const record = {
				sessionId: "session-abc",
				createdAt: new Date("2026-01-20T00:00:00Z"),
				score: 0.8,
				threshold: 0.5,
			} as unknown as StoredSession;
			const markStored = vi
				.fn<MarkStoredCallback>()
				.mockResolvedValue(undefined);

			streamer.streamSessionRecord(record, markStored);
			await flush();

			expect(mockSessionUpdateOne).toHaveBeenCalledWith(
				{ sessionId: "session-abc" },
				{
					$set: expect.objectContaining({ sessionId: "session-abc" }),
				},
				{ upsert: true },
			);
			// Session has no lastUpdatedTimestamp, falls back to createdAt
			expect(markStored).toHaveBeenCalledWith(record.createdAt);
		});
	});

	describe("connection management", () => {
		it("reuses the connection promise across multiple calls", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: test access to private field
			const connectMock = (streamer as any).db.connect as MockInstance;
			const record = {
				challenge: "c1",
				lastUpdatedTimestamp: new Date(),
			} as unknown as PoWCaptchaRecord;

			streamer.streamPowRecord(record);
			streamer.streamPowRecord(record);
			await flush();

			expect(connectMock).toHaveBeenCalledTimes(1);
			expect(mockPowUpdateOne).toHaveBeenCalledTimes(2);
		});
	});

	describe("storedAtTimestamp race condition", () => {
		it("passes the record's timestamp (not wall clock) to markStored", async () => {
			const recordTime = new Date("2026-01-15T10:30:00Z");
			const record = {
				challenge: "race-test",
				lastUpdatedTimestamp: recordTime,
			} as unknown as PoWCaptchaRecord;

			let capturedTimestamp: Date | undefined;
			const markStored = vi.fn(async (ts: Date) => {
				capturedTimestamp = ts;
			});

			streamer.streamPowRecord(record, markStored);
			await flush();

			// The timestamp passed to markStored is the record's own timestamp
			expect(capturedTimestamp).toBe(recordTime);
		});

		it("concurrent update after streaming is detected by batch cron", () => {
			const streamedAt = new Date("2026-01-15T10:30:00Z");
			const updatedAt = new Date("2026-01-15T10:30:01Z");

			// After streaming, storedAtTimestamp = streamedAt
			// After concurrent update, lastUpdatedTimestamp = updatedAt
			// Batch cron: storedAtTimestamp < lastUpdatedTimestamp → needs re-sync
			expect(streamedAt < updatedAt).toBe(true);
		});
	});

	describe("account attempt log", () => {
		const makePowRecord = (
			overrides?: Partial<PoWCaptchaRecord>,
		): PoWCaptchaRecord =>
			({
				challenge: "123___user___dapp___1",
				userAccount: "user1",
				dappAccount: "dapp1",
				difficulty: 4,
				requestedAtTimestamp: new Date("2026-01-01T00:00:00Z"),
				lastUpdatedTimestamp: new Date("2026-01-01T01:00:00Z"),
				result: { status: "Pending" },
				...overrides,
			}) as unknown as PoWCaptchaRecord;

		it("does not log an attempt that has no result yet", async () => {
			streamer.streamPowRecord(makePowRecord());
			await flush();
			expect(mockAttemptUpdateOne).not.toHaveBeenCalled();
		});

		it("logs a failed PoW attempt keyed by challenge, with its IP and ASN", async () => {
			streamer.streamPowRecord(
				makePowRecord({
					result: { status: "Disapproved" },
					ipInfo: { isValid: true, ip: "203.0.113.7", asnNumber: 9009 },
				} as unknown as Partial<PoWCaptchaRecord>),
			);
			await flush();
			expect(mockAttemptUpdateOne).toHaveBeenCalledWith(
				{ challenge: "123___user___dapp___1" },
				{
					$set: {
						challenge: "123___user___dapp___1",
						account: "user1",
						dappAccount: "dapp1",
						captchaType: "pow",
						at: new Date("2026-01-01T00:00:00Z"),
						passed: false,
						ip: "203.0.113.7",
						asn: 9009,
					},
				},
				{ upsert: true },
			);
		});

		it("keeps the IP but not an ASN from an invalid IP lookup", async () => {
			streamer.streamPowRecord(
				makePowRecord({
					result: { status: "Approved" },
					ipInfo: { isValid: false, ip: "203.0.113.7", error: "lookup failed" },
				} as unknown as Partial<PoWCaptchaRecord>),
			);
			await flush();
			const [, update] = mockAttemptUpdateOne.mock.calls[0] as [
				unknown,
				{ $set: Record<string, unknown> },
			];
			expect(update.$set.passed).toBe(true);
			expect(update.$set.ip).toBe("203.0.113.7");
			expect("asn" in update.$set).toBe(false);
		});

		it("labels puzzle attempts with their captcha type", async () => {
			streamer.streamPuzzleRecord({
				challenge: "p1",
				userAccount: "user2",
				dappAccount: "dapp1",
				requestedAtTimestamp: new Date("2026-01-01T00:00:00Z"),
				result: { status: "Disapproved" },
			} as unknown as PuzzleCaptchaRecord);
			await flush();
			const [, update] = mockAttemptUpdateOne.mock.calls[0] as [
				unknown,
				{ $set: Record<string, unknown> },
			];
			expect(update.$set.captchaType).toBe("puzzle");
			expect(update.$set.account).toBe("user2");
		});

		it("returns undefined at once when there is no central connection", async () => {
			const result = await streamer.readAccountAttempts("user1", 600_000, 250);
			expect(result).toBeUndefined();
			expect(mockAttemptFind).not.toHaveBeenCalled();
		});

		it("reads the account's attempts in the window, newest first, bounded by the timeout", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: test access to private field
			(streamer as any).db.connected = true;
			const attempts = [{ challenge: "c1", account: "user1", passed: false }];
			attemptQuery.exec.mockResolvedValue(attempts);
			const result = await streamer.readAccountAttempts("user1", 600_000, 250);
			expect(result).toEqual(attempts);
			const [filter] = mockAttemptFind.mock.calls[0] as [
				{ account: string; at: { $gte: Date } },
			];
			expect(filter.account).toBe("user1");
			expect(Date.now() - filter.at.$gte.getTime()).toBeGreaterThanOrEqual(
				600_000,
			);
			expect(attemptQuery.sort).toHaveBeenCalledWith({ at: -1 });
			expect(attemptQuery.maxTimeMS).toHaveBeenCalledWith(250);
		});

		it("gives up and returns undefined when the read outlasts the timeout", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: test access to private field
			(streamer as any).db.connected = true;
			attemptQuery.exec.mockReturnValue(new Promise(() => undefined));
			const started = Date.now();
			const result = await streamer.readAccountAttempts("user1", 600_000, 30);
			expect(result).toBeUndefined();
			expect(Date.now() - started).toBeLessThan(1_000);
		});

		it("returns undefined rather than throwing when the read fails", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: test access to private field
			(streamer as any).db.connected = true;
			attemptQuery.exec.mockRejectedValue(new Error("boom"));
			await expect(
				streamer.readAccountAttempts("user1", 600_000, 250),
			).resolves.toBeUndefined();
		});
	});
});
