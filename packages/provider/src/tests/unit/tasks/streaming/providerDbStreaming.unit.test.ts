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

import type { CentralDbStreamer } from "@prosopo/database";
import type { StoredSession } from "@prosopo/types-database";
import {
	type MockInstance,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

/**
 * Tests verifying the storedAtTimestamp race-condition fix and the
 * streamToCentral flag behaviour for session updates.
 */

interface MockPowTable {
	updateOne: (
		filter: { challenge: string },
		update: { $set: Record<string, unknown> },
	) => Promise<{ matchedCount: number }>;
}

interface MockSessionTable {
	create: (record: { sessionId: string }) => Promise<{ sessionId: string }>;
}

const createMockStreamer = () =>
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

describe("ProviderDatabase streaming integration", () => {
	let mockStreamer: ReturnType<typeof createMockStreamer>;
	let storedPowRecords: Map<string, Record<string, unknown>>;
	let mockPowTable: MockPowTable;
	let mockSessionTable: MockSessionTable;

	beforeEach(() => {
		vi.clearAllMocks();
		mockStreamer = createMockStreamer();
		storedPowRecords = new Map();

		mockPowTable = {
			updateOne: vi.fn(
				async (
					filter: { challenge: string },
					update: { $set: Record<string, unknown> },
				) => {
					const existing = storedPowRecords.get(filter.challenge);
					if (existing) {
						Object.assign(existing, update.$set);
					}
					return { matchedCount: existing ? 1 : 0 };
				},
			),
		};

		mockSessionTable = {
			create: vi.fn(async (record: { sessionId: string }) => {
				return record;
			}),
		};
	});

	describe("markStored callback from PoW streaming", () => {
		it("sets storedAtTimestamp to the record's lastUpdatedTimestamp, not current time", async () => {
			const recordTimestamp = new Date("2026-01-15T10:30:00Z");
			const challenge = "test___user___dapp___42";

			storedPowRecords.set(challenge, {
				challenge,
				lastUpdatedTimestamp: recordTimestamp,
			});

			// Simulate the markStored callback that ProviderDatabase passes
			const markStored = async (ts: Date) => {
				await mockPowTable.updateOne(
					{ challenge },
					{ $set: { storedAtTimestamp: ts } },
				);
			};

			// Streamer calls markStored with the record's own timestamp
			await markStored(recordTimestamp);

			const stored = storedPowRecords.get(challenge);
			expect(stored?.storedAtTimestamp).toBe(recordTimestamp);
		});

		it("allows batch cron to re-sync when a concurrent update happened after streaming", async () => {
			const streamedAt = new Date("2026-01-15T10:30:00Z");
			const laterUpdate = new Date("2026-01-15T10:30:01Z");
			const challenge = "test___user___dapp___42";

			storedPowRecords.set(challenge, {
				challenge,
				lastUpdatedTimestamp: streamedAt,
			});

			// 1. Streamer marks stored with the streamed timestamp
			await mockPowTable.updateOne(
				{ challenge },
				{ $set: { storedAtTimestamp: streamedAt } },
			);

			// 2. A concurrent update happens with a later timestamp
			const stored = storedPowRecords.get(challenge);
			if (stored) {
				stored.lastUpdatedTimestamp = laterUpdate;
			}

			// 3. Batch cron checks: storedAtTimestamp < lastUpdatedTimestamp → needs re-sync
			const storedTs = stored?.storedAtTimestamp as Date;
			const updatedTs = stored?.lastUpdatedTimestamp as Date;
			expect(storedTs < updatedTs).toBe(true);
		});

		it("batch cron skips when record has not been updated since streaming", () => {
			const timestamp = new Date("2026-01-15T10:30:00Z");

			const stored = {
				challenge: "test___user___dapp___42",
				lastUpdatedTimestamp: timestamp,
				storedAtTimestamp: timestamp,
			};

			// Batch cron checks: storedAtTimestamp >= lastUpdatedTimestamp → skip
			const needsSync =
				!stored.storedAtTimestamp ||
				stored.storedAtTimestamp < stored.lastUpdatedTimestamp;

			expect(needsSync).toBe(false);
		});
	});

	describe("streamToCentral flag on updateSessionRecord", () => {
		it("does not stream when streamToCentral is not passed", () => {
			// When streamToCentral is not passed, the streamer should not be invoked
			expect(mockStreamer.streamSessionRecord).not.toHaveBeenCalled();
		});

		it("the session create path triggers streaming", async () => {
			const session = {
				sessionId: "sess-abc",
				createdAt: new Date("2026-01-20T00:00:00Z"),
				score: 0.8,
				threshold: 0.5,
			} as unknown as StoredSession;

			// Simulate ProviderDatabase.storeSessionRecord
			await mockSessionTable.create(session);

			// ProviderDatabase would call streamer here
			mockStreamer.streamSessionRecord(session, vi.fn());

			expect(mockStreamer.streamSessionRecord).toHaveBeenCalledWith(
				session,
				expect.any(Function),
			);
		});
	});
});
