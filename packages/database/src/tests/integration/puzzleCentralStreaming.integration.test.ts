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

import { LogLevel, getLogger } from "@prosopo/logger";
import {
	CaptchaStatus,
	type CompositeIpAddress,
	type IPInfoResponse,
	IpAddressType,
} from "@prosopo/types";
import type { PuzzleCaptchaRecord } from "@prosopo/types-database";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CentralDbStreamer } from "../../databases/centralDbStreamer.js";

// End-to-end guard for the puzzle central-streaming path. Spins up an
// in-memory mongod, calls streamPuzzleRecord/streamPuzzleUpdate through the
// real streamer, and confirms the doc lands in the `puzzlecaptcha` collection
// on the central DB with the fields we set — the round-trip proof that the
// wiring added alongside pow/image works for puzzles too.

const logger = getLogger(LogLevel.enum.error, "puzzleCentralStreaming.test");

const ipv4Composite = (lower: bigint): CompositeIpAddress => ({
	lower,
	type: IpAddressType.v4,
});

const validIpInfo: IPInfoResponse = {
	ip: "203.0.113.7",
	isValid: true,
	isVPN: false,
	isTor: false,
	isProxy: false,
	isDatacenter: false,
	isAbuser: false,
	isMobile: false,
	isSatellite: false,
	isCrawler: false,
	countryCode: "GB",
	asnNumber: 64500,
	abuserScore: 0.01,
	companyAbuserScore: 0.01,
};

const buildPuzzleRecord = (
	challenge: string,
	overrides?: Partial<PuzzleCaptchaRecord>,
): PuzzleCaptchaRecord =>
	({
		challenge,
		userAccount: "userTest",
		dappAccount: "dappTest",
		requestedAtTimestamp: new Date("2026-06-10T07:30:00Z"),
		lastUpdatedTimestamp: new Date("2026-06-10T07:30:05Z"),
		ipAddress: ipv4Composite(3405803783n),
		headers: { host: "pronode-test.local" },
		ja4: "t13d1516h2_test_abcdef",
		result: { status: CaptchaStatus.pending },
		userSubmitted: false,
		serverChecked: false,
		targetX: 100,
		targetY: 200,
		originX: 50,
		originY: 150,
		tolerance: 10,
		providerSignature: "0xproviderSig",
		sessionId: "pronode-test-session-puzzle-1",
		ipInfo: validIpInfo,
		...overrides,
	}) as unknown as PuzzleCaptchaRecord;

const waitForDoc = async <T>(
	fetch: () => Promise<T | null>,
	maxAttempts = 50,
): Promise<T | null> => {
	let stored: T | null = null;
	for (let i = 0; i < maxAttempts && stored === null; i++) {
		await new Promise<void>((r) => setTimeout(r, 20));
		stored = await fetch();
	}
	return stored;
};

describe("CentralDbStreamer end-to-end: puzzle records", () => {
	let mongod: MongoMemoryServer;
	let streamer: CentralDbStreamer;

	beforeAll(async () => {
		mongod = await MongoMemoryServer.create();
		streamer = new CentralDbStreamer(mongod.getUri(), logger);
	});

	afterAll(async () => {
		const db = (streamer as unknown as { db: { close: () => Promise<void> } })
			.db;
		await db.close();
		await mongod.stop();
	});

	it("streamPuzzleRecord upserts the record to central puzzlecaptcha collection", async () => {
		const challenge = "puzzle-e2e-1";
		const record = buildPuzzleRecord(challenge);

		streamer.streamPuzzleRecord(record);

		const tables = (
			streamer as unknown as {
				db: {
					tables: {
						puzzlecaptcha: import("mongoose").Model<PuzzleCaptchaRecord>;
					};
				};
			}
		).db.tables;

		const stored = await waitForDoc(() =>
			tables.puzzlecaptcha.findOne({ challenge }).lean<PuzzleCaptchaRecord>(),
		);

		expect(stored).not.toBeNull();
		if (!stored) return;

		expect(stored.challenge).toBe(challenge);
		expect(stored.userAccount).toBe("userTest");
		expect(stored.dappAccount).toBe("dappTest");
		expect(stored.targetX).toBe(100);
		expect(stored.tolerance).toBe(10);
		expect(stored.sessionId).toBe("pronode-test-session-puzzle-1");
		expect(stored.result?.status).toBe(CaptchaStatus.pending);
		expect(stored.ipInfo).toMatchObject(validIpInfo);
	});

	it("streamPuzzleRecord calls markStored with the record's lastUpdatedTimestamp", async () => {
		const challenge = "puzzle-e2e-2";
		const record = buildPuzzleRecord(challenge);

		let capturedTimestamp: Date | undefined;
		const markStored = async (ts: Date): Promise<void> => {
			capturedTimestamp = ts;
		};

		streamer.streamPuzzleRecord(record, markStored);

		// Wait until markStored fires (streamer is fire-and-forget).
		for (let i = 0; i < 50 && capturedTimestamp === undefined; i++) {
			await new Promise<void>((r) => setTimeout(r, 20));
		}

		expect(capturedTimestamp).toBeDefined();
		expect(capturedTimestamp?.toISOString()).toBe(
			record.lastUpdatedTimestamp?.toISOString(),
		);
	});

	it("streamPuzzleRecord upsert replaces fields on subsequent calls with the same challenge", async () => {
		// Mirrors the real production sequence: create → local write completes →
		// stream (pending) → update → local write completes → stream (approved).
		// The fetch step between streams gives the first write time to land, so
		// the second write really is the last one to hit the central DB.
		const challenge = "puzzle-e2e-upsert";
		const first = buildPuzzleRecord(challenge, {
			result: { status: CaptchaStatus.pending },
			userSubmitted: false,
			lastUpdatedTimestamp: new Date("2026-06-10T07:30:05Z"),
		});
		const second = buildPuzzleRecord(challenge, {
			result: { status: CaptchaStatus.approved },
			userSubmitted: true,
			serverChecked: true,
			lastUpdatedTimestamp: new Date("2026-06-10T07:30:10Z"),
		});

		const tables = (
			streamer as unknown as {
				db: {
					tables: {
						puzzlecaptcha: import("mongoose").Model<PuzzleCaptchaRecord>;
					};
				};
			}
		).db.tables;

		streamer.streamPuzzleRecord(first);

		// Wait until the first (pending) write lands before firing the second.
		const afterFirst = await waitForDoc(() =>
			tables.puzzlecaptcha.findOne({ challenge }).lean<PuzzleCaptchaRecord>(),
		);
		expect(afterFirst?.result?.status).toBe(CaptchaStatus.pending);

		streamer.streamPuzzleRecord(second);

		// Poll until the approved state lands.
		let stored: PuzzleCaptchaRecord | null = null;
		for (let i = 0; i < 50; i++) {
			await new Promise<void>((r) => setTimeout(r, 20));
			stored = await tables.puzzlecaptcha
				.findOne({ challenge })
				.lean<PuzzleCaptchaRecord>();
			if (stored?.result?.status === CaptchaStatus.approved) break;
		}

		expect(stored).not.toBeNull();
		if (!stored) return;
		expect(stored.result?.status).toBe(CaptchaStatus.approved);
		expect(stored.userSubmitted).toBe(true);
		expect(stored.serverChecked).toBe(true);
	});

	it("streamPuzzleUpdate fetches the full record and streams it", async () => {
		const challenge = "puzzle-e2e-update";
		const record = buildPuzzleRecord(challenge, {
			result: { status: CaptchaStatus.approved },
			userSubmitted: true,
		});

		let fetchCalled = false;
		streamer.streamPuzzleUpdate(async () => {
			fetchCalled = true;
			return record;
		});

		const tables = (
			streamer as unknown as {
				db: {
					tables: {
						puzzlecaptcha: import("mongoose").Model<PuzzleCaptchaRecord>;
					};
				};
			}
		).db.tables;

		const stored = await waitForDoc(() =>
			tables.puzzlecaptcha.findOne({ challenge }).lean<PuzzleCaptchaRecord>(),
		);

		expect(fetchCalled).toBe(true);
		expect(stored).not.toBeNull();
		if (!stored) return;
		expect(stored.userSubmitted).toBe(true);
		expect(stored.result?.status).toBe(CaptchaStatus.approved);
	});

	// The null-fetch case (streamPuzzleUpdate skips the write when fetch
	// returns null) is covered by the unit test in centralDbStreamer.unit.test.ts.
	// It's fiddly here because the update path never triggers a streamer
	// connection when it short-circuits on null, so the shared MongoMemoryServer
	// tables map isn't guaranteed to be populated by the time we try to read
	// from it — that's a test-harness artefact, not a code path worth
	// duplicating.
});
