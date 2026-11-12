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
import type {
	PoWCaptchaRecord,
	PuzzleCaptchaRecord,
	StoredSession,
	UserCommitmentRecord,
} from "@prosopo/types-database";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CaptchaDatabase } from "../../databases/captcha.js";

const logger = getLogger(LogLevel.enum.error, "saveCaptchasStoredAt.test");

const storedAtTimestamp = new Date("2026-01-01T00:30:00Z");

const makeSession = (sessionId: string): StoredSession =>
	({
		sessionId,
		createdAt: new Date(),
		token: "tok",
		siteKey: "site-key-1",
		storedAtTimestamp,
	}) as unknown as StoredSession;

const makeCommitment = (id: string): UserCommitmentRecord =>
	({
		id,
		userAccount: "user1",
		dappAccount: "dapp1",
		lastUpdatedTimestamp: new Date(),
		storedAtTimestamp,
	}) as unknown as UserCommitmentRecord;

const makePow = (
	challenge: string,
	stamp: Date = storedAtTimestamp,
): PoWCaptchaRecord =>
	({
		challenge,
		userAccount: "user1",
		dappAccount: "dapp1",
		lastUpdatedTimestamp: new Date(),
		storedAtTimestamp: stamp,
	}) as unknown as PoWCaptchaRecord;

const makePuzzle = (challenge: string): PuzzleCaptchaRecord =>
	({
		challenge,
		userAccount: "user1",
		dappAccount: "dapp1",
		lastUpdatedTimestamp: new Date(),
		storedAtTimestamp,
	}) as unknown as PuzzleCaptchaRecord;

describe("CaptchaDatabase.saveCaptchas — storedAtTimestamp", () => {
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

	it("does not write storedAtTimestamp to any central collection", async () => {
		await central.saveCaptchas({
			sessionEvents: [makeSession("session-stored-at")],
			imageCaptchaEvents: [makeCommitment("commitment-stored-at")],
			powCaptchaEvents: [makePow("pow-stored-at")],
			puzzleCaptchaEvents: [makePuzzle("puzzle-stored-at")],
		});

		await central.connect();
		const docs: Record<string, unknown>[] = [
			...(await central.tables.session
				.find({ sessionId: "session-stored-at" })
				.lean<Record<string, unknown>[]>()),
			...(await central.tables.commitment
				.find({ id: "commitment-stored-at" })
				.lean<Record<string, unknown>[]>()),
			...(await central.tables.powcaptcha
				.find({ challenge: "pow-stored-at" })
				.lean<Record<string, unknown>[]>()),
			...(await central.tables.puzzlecaptcha
				.find({ challenge: "puzzle-stored-at" })
				.lean<Record<string, unknown>[]>()),
		];

		expect(docs).toHaveLength(4);
		for (const doc of docs) {
			expect(doc).not.toHaveProperty("storedAtTimestamp");
		}
	});

	it("leaves a storedAtTimestamp already on central untouched", async () => {
		await central.connect();
		await central.tables.powcaptcha.collection.insertOne({
			challenge: "pow-already-stamped",
			storedAtTimestamp,
		});

		await central.saveCaptchas({
			powCaptchaEvents: [makePow("pow-already-stamped", new Date())],
		});

		await central.connect();
		const doc = await central.tables.powcaptcha
			.findOne({ challenge: "pow-already-stamped" })
			.lean<{ storedAtTimestamp?: Date; userAccount?: string }>();
		expect(doc?.storedAtTimestamp).toEqual(storedAtTimestamp);
		expect(doc?.userAccount).toBe("user1");
	});
});
