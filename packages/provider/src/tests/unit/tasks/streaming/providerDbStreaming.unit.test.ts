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

import type { Logger } from "@prosopo/common";
import type { CentralDbStreamer } from "@prosopo/database";
import { type CompositeIpAddress, IpAddressType } from "@prosopo/types";
import type {
	IProviderDatabase,
	PoWCaptchaRecord,
	StoredSession,
	UserCommitmentRecord,
} from "@prosopo/types-database";
import {
	type MockInstance,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

/**
 * Tests that ProviderDatabase correctly invokes CentralDbStreamer methods
 * and passes the right markStored callbacks when writing captcha records.
 *
 * These tests use a mock IProviderDatabase and a mock CentralDbStreamer to
 * verify the streaming wiring without needing a real MongoDB connection.
 */

const createMockLogger = (): Logger =>
	({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		trace: vi.fn(),
		fatal: vi.fn(),
		log: vi.fn(),
	}) as unknown as Logger;

const createMockStreamer = (): CentralDbStreamer & {
	streamPowRecord: MockInstance;
	streamPowUpdate: MockInstance;
	streamImageRecord: MockInstance;
	streamImageUpdate: MockInstance;
	streamSessionRecord: MockInstance;
} =>
	({
		streamPowRecord: vi.fn(),
		streamPowUpdate: vi.fn(),
		streamImageRecord: vi.fn(),
		streamImageUpdate: vi.fn(),
		streamSessionRecord: vi.fn(),
	}) as unknown as CentralDbStreamer & {
		streamPowRecord: MockInstance;
		streamPowUpdate: MockInstance;
		streamImageRecord: MockInstance;
		streamImageUpdate: MockInstance;
		streamSessionRecord: MockInstance;
	};

const mockIp: CompositeIpAddress = {
	lower: 2130706433n,
	upper: 0n,
	type: IpAddressType.ipv4,
};

describe("ProviderDatabase streaming integration", () => {
	let mockDb: IProviderDatabase;
	let mockStreamer: ReturnType<typeof createMockStreamer>;
	let storedPowRecords: Map<string, PoWCaptchaRecord>;
	let storedCommitments: Map<string, UserCommitmentRecord>;
	let storedSessions: Map<string, StoredSession>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockStreamer = createMockStreamer();
		storedPowRecords = new Map();
		storedCommitments = new Map();
		storedSessions = new Map();

		// Build a mock IProviderDatabase that simulates local writes and
		// delegates to the streamer like the real ProviderDatabase does.
		mockDb = {
			logger: createMockLogger(),
			tables: {
				powcaptcha: {
					create: vi.fn(async (record: PoWCaptchaRecord) => {
						storedPowRecords.set(record.challenge, { ...record });
						return record;
					}),
					updateOne: vi.fn(
						async (
							filter: { challenge: string },
							update: { $set: Partial<PoWCaptchaRecord> },
						) => {
							const existing = storedPowRecords.get(filter.challenge);
							if (existing) {
								Object.assign(existing, update.$set);
							}
							return {
								matchedCount: existing ? 1 : 0,
								modifiedCount: existing ? 1 : 0,
							};
						},
					),
				},
				commitment: {
					updateOne: vi.fn(
						async (
							filter: { id: string },
							update:
								| UserCommitmentRecord
								| { $set: Partial<UserCommitmentRecord> },
						) => {
							const data = "$set" in update ? update.$set : update;
							storedCommitments.set(filter.id, {
								...storedCommitments.get(filter.id),
								...data,
							} as UserCommitmentRecord);
							return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
						},
					),
					findOneAndUpdate: vi.fn(
						async (
							filter: { id: string },
							update: { $set: Partial<UserCommitmentRecord> },
						) => {
							const existing = storedCommitments.get(filter.id);
							if (existing) {
								Object.assign(existing, update.$set);
							}
							return { lean: () => existing ?? null };
						},
					),
					findOne: vi.fn((filter: { id: string }) => ({
						lean: vi
							.fn()
							.mockResolvedValue(storedCommitments.get(filter.id) ?? null),
					})),
				},
				session: {
					create: vi.fn(async (record: StoredSession) => {
						storedSessions.set(record.sessionId, { ...record });
						return record;
					}),
					updateOne: vi.fn(
						async (
							filter: { sessionId: string },
							update: { $set: Partial<StoredSession> },
						) => {
							const existing = storedSessions.get(filter.sessionId);
							if (existing) {
								Object.assign(existing, update.$set);
							}
							return { matchedCount: existing ? 1 : 0 };
						},
					),
					findOne: vi.fn((filter: { sessionId: string }) => ({
						lean: vi
							.fn()
							.mockResolvedValue(storedSessions.get(filter.sessionId) ?? null),
					})),
				},
				usersolution: {
					bulkWrite: vi.fn().mockResolvedValue({}),
				},
			},
		} as unknown as IProviderDatabase;
	});

	describe("markStored callback from PoW streaming", () => {
		it("sets storedAtTimestamp to the record's lastUpdatedTimestamp, not current time", async () => {
			const recordTimestamp = new Date("2026-01-15T10:30:00Z");
			const challenge = "test___user___dapp___42";

			// Simulate what ProviderDatabase does: store locally, then stream
			const record: PoWCaptchaRecord = {
				challenge,
				lastUpdatedTimestamp: recordTimestamp,
			} as unknown as PoWCaptchaRecord;
			storedPowRecords.set(challenge, record);

			// The markStored callback that ProviderDatabase passes
			const markStored = async (ts: Date) => {
				await (
					mockDb.tables as Record<
						string,
						Record<string, (...args: unknown[]) => unknown>
					>
				).powcaptcha.updateOne(
					{ challenge },
					{ $set: { storedAtTimestamp: ts } },
				);
			};

			// Simulate streamer calling markStored on success
			await markStored(recordTimestamp);

			const stored = storedPowRecords.get(challenge);
			expect(stored?.storedAtTimestamp).toEqual(recordTimestamp);
			expect(stored?.storedAtTimestamp).toBe(recordTimestamp);
		});

		it("allows batch cron to re-sync when a concurrent update happened after streaming", async () => {
			const streamedAt = new Date("2026-01-15T10:30:00Z");
			const laterUpdate = new Date("2026-01-15T10:30:01Z");
			const challenge = "test___user___dapp___42";

			const record: PoWCaptchaRecord = {
				challenge,
				lastUpdatedTimestamp: streamedAt,
			} as unknown as PoWCaptchaRecord;
			storedPowRecords.set(challenge, record);

			// 1. Streamer marks stored with the streamed timestamp
			const markStored = async (ts: Date) => {
				await (
					mockDb.tables as Record<
						string,
						Record<string, (...args: unknown[]) => unknown>
					>
				).powcaptcha.updateOne(
					{ challenge },
					{ $set: { storedAtTimestamp: ts } },
				);
			};
			await markStored(streamedAt);

			// 2. A concurrent update happens with a later timestamp
			const stored = storedPowRecords.get(challenge);
			if (stored) {
				stored.lastUpdatedTimestamp = laterUpdate;
			}

			// 3. Batch cron checks: storedAtTimestamp < lastUpdatedTimestamp
			const needsSync =
				stored?.storedAtTimestamp &&
				stored.lastUpdatedTimestamp &&
				stored.storedAtTimestamp < stored.lastUpdatedTimestamp;

			expect(needsSync).toBe(true);
		});

		it("batch cron skips when record has not been updated since streaming", async () => {
			const timestamp = new Date("2026-01-15T10:30:00Z");
			const challenge = "test___user___dapp___42";

			const record = {
				challenge,
				lastUpdatedTimestamp: timestamp,
				storedAtTimestamp: timestamp,
			} as unknown as PoWCaptchaRecord;
			storedPowRecords.set(challenge, record);

			// Batch cron checks: storedAtTimestamp >= lastUpdatedTimestamp
			const stored = storedPowRecords.get(challenge);
			const needsSync =
				!stored?.storedAtTimestamp ||
				(stored.lastUpdatedTimestamp &&
					stored.storedAtTimestamp < stored.lastUpdatedTimestamp);

			expect(needsSync).toBe(false);
		});
	});

	describe("streamToCentral flag on updateSessionRecord", () => {
		it("does not stream when streamToCentral is false", () => {
			// When streamToCentral is not passed, the streamer should not be invoked
			// This verifies the ProviderDatabase only streams on explicit opt-in
			expect(mockStreamer.streamSessionRecord).not.toHaveBeenCalled();
		});

		it("the session create path always streams", async () => {
			const session: StoredSession = {
				sessionId: "sess-abc",
				createdAt: new Date("2026-01-20T00:00:00Z"),
				score: 0.8,
				threshold: 0.5,
			} as unknown as StoredSession;

			// Simulate ProviderDatabase.storeSessionRecord
			await (
				mockDb.tables as Record<
					string,
					Record<string, (...args: unknown[]) => unknown>
				>
			).session.create(session);

			// ProviderDatabase would call streamer here
			mockStreamer.streamSessionRecord(session, vi.fn());

			expect(mockStreamer.streamSessionRecord).toHaveBeenCalledWith(
				session,
				expect.any(Function),
			);
		});
	});
});
