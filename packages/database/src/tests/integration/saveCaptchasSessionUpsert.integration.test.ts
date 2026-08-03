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
	CaptchaType,
	type CompositeIpAddress,
	IpAddressType,
} from "@prosopo/types";
import type { StoredSession } from "@prosopo/types-database";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CaptchaDatabase } from "../../databases/captcha.js";

// Regression guard for the session-duplication bug observed on
// captchastorage.sessions (mongo1.prosopo.io). Snapshot from a live
// 1h window on 2026-08-01:
//
//   copies_per_sessionId : count_of_sessionIds
//     1 :   9,913
//     2 :  17,917
//     3 :   1,060
//     4 :      57
//     5 :      16
//     6 :       5
//     7 :       1
//
// ~64% of sessionIds have 2+ docs. Root cause: `CaptchaDatabase.saveCaptchas`
// was writing session events with a `bulkWrite([{ insertOne: ... }])` — a
// blind insert with no dedup on `sessionId`. Meanwhile the same central
// collection is *also* written by `CentralDbStreamer.streamSessionRecord`
// (upsert on sessionId, called fire-and-forget from
// `ProviderDatabase.storeSessionRecord`). Every time the sweep in
// `clientTasks.storeCommitmentsExternal` re-drained an "unstored" record
// that the streamer had already landed on central, a duplicate got
// written. Retries and streamer racy re-runs stacked more copies.
//
// Fix: `saveCaptchas` now upserts sessions by `sessionId`, matching the
// pattern already used for image/pow/puzzle records in the same method.
// This test seeds one session, calls `saveCaptchas` for the same
// sessionId three times, and asserts only ONE doc exists at the end.
// With the bug in place the test would see three docs.

const logger = getLogger(LogLevel.enum.error, "saveCaptchasSessionUpsert.test");

const ipv4Composite = (lower: bigint): CompositeIpAddress => ({
	lower,
	type: IpAddressType.v4,
});

const makeSession = (sessionId: string, score: number): StoredSession =>
	({
		sessionId,
		createdAt: new Date(),
		token: "tok",
		score,
		threshold: 0.5,
		scoreComponents: { baseScore: score },
		ipAddress: ipv4Composite(16843009n),
		captchaType: CaptchaType.pow,
		userSitekeyIpHash: "hash-abc",
		webView: false,
		iFrame: false,
		decryptedHeadHash: "head-hash",
		siteKey: "site-key-1",
		headers: { "user-agent": "test" },
	}) as unknown as StoredSession;

describe("CaptchaDatabase.saveCaptchas — session upsert by sessionId", () => {
	let mongod: MongoMemoryServer;
	let central: CaptchaDatabase;

	beforeAll(async () => {
		mongod = await MongoMemoryServer.create();
		central = new CaptchaDatabase(
			mongod.getUri(),
			"captchastorage",
			undefined,
			logger,
		);
		await central.connect();
	});

	afterAll(async () => {
		await central.close();
		await mongod.stop();
	});

	it("does not duplicate when the same sessionId is written twice by successive sweep passes", async () => {
		const sessionId = "session-upsert-repeat";

		await central.saveCaptchas([makeSession(sessionId, 0.1)], [], []);
		await central.saveCaptchas([makeSession(sessionId, 0.2)], [], []);
		await central.saveCaptchas([makeSession(sessionId, 0.3)], [], []);

		// Reconnect: `saveCaptchas` closes the connection when it's done
		// (via bulkWrite → close pattern inherited from MongoDatabase).
		// The test's own `central` handle is still bound to the same URI
		// but may have a stale connection; call `connect` again to be safe.
		await central.connect();
		const docs = await central.tables.session
			.find({ sessionId })
			.lean<StoredSession[]>();

		expect(docs.length).toBe(1);

		// Last write wins — the third call's score should be the persisted
		// value, confirming the upsert `$set` semantics are in play (not
		// e.g. an `$setOnInsert` that would freeze the first write).
		const persisted = docs[0] as unknown as { score: number };
		expect(persisted.score).toBe(0.3);
	});

	it("distinct sessionIds each get their own doc (guardrail against overly-broad filter)", async () => {
		const ids = ["session-a", "session-b", "session-c"];
		await central.saveCaptchas(
			ids.map((id, i) => makeSession(id, 0.1 * (i + 1))),
			[],
			[],
		);

		await central.connect();
		for (const id of ids) {
			const docs = await central.tables.session
				.find({ sessionId: id })
				.lean<StoredSession[]>();
			expect(docs.length, `expected exactly one doc for ${id}`).toBe(1);
		}
	});
});
