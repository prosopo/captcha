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

import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ProviderDatabase } from "../../databases/provider.js";

class MongoOnlyProviderDatabase extends ProviderDatabase {
	protected override async setupRedis(): Promise<void> {}
}

const PARALLEL_VERIFIES = 10;

const inParallel = <T>(claim: () => Promise<T>): Promise<T[]> =>
	Promise.all(Array.from({ length: PARALLEL_VERIFIES }, claim));

describe("marking a captcha server-checked lets exactly one concurrent verify win", () => {
	let mongod: MongoMemoryServer;
	let db: MongoOnlyProviderDatabase;

	beforeAll(async () => {
		mongod = await MongoMemoryServer.create();
		db = new MongoOnlyProviderDatabase({
			mongo: { url: mongod.getUri(), dbname: "server_checked_claim" },
		});
		await db.connect();
	});

	afterAll(async () => {
		await db.close();
		await mongod.stop();
	});

	it("image commitment", async () => {
		await db.getTables().commitment.collection.insertOne({
			id: "commitment-1",
			serverChecked: false,
		});

		const marked = await inParallel(() =>
			db.markDappUserCommitmentsChecked(["commitment-1"]),
		);

		expect(marked.filter((count) => count === 1)).toHaveLength(1);
		expect(await db.markDappUserCommitmentsChecked(["commitment-1"])).toBe(0);
	});

	it("PoW challenge", async () => {
		await db.getTables().powcaptcha.collection.insertOne({
			challenge: "pow-1",
			serverChecked: false,
		});

		const marked = await inParallel(() =>
			db.markDappUserPoWCommitmentsChecked(["pow-1"]),
		);

		expect(marked.filter((count) => count === 1)).toHaveLength(1);
	});

	it("puzzle challenge", async () => {
		await db.getTables().puzzlecaptcha.collection.insertOne({
			challenge: "1___user___dapp",
			serverChecked: false,
		});

		const marked = await inParallel(() =>
			db.markPuzzleCaptchaChecked("1___user___dapp"),
		);

		expect(marked.filter(Boolean)).toHaveLength(1);
		const record =
			await db.getPuzzleCaptchaRecordByChallenge("1___user___dapp");
		expect(record?.serverChecked).toBe(true);
	});

	it("authenticated session", async () => {
		await db.getTables().session.collection.insertOne({
			sessionId: "session-1",
			serverChecked: false,
		});

		const marked = await inParallel(() => db.markSessionChecked("session-1"));

		expect(marked.filter(Boolean)).toHaveLength(1);
	});

	it("does not mark a record that does not exist", async () => {
		expect(await db.markSessionChecked("no-such-session")).toBe(false);
		expect(await db.markPuzzleCaptchaChecked("1___nobody___dapp")).toBe(false);
	});
});
