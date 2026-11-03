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
import { CaptchaStatus, IpAddressType } from "@prosopo/types";
import type { UserCommitmentRecord } from "@prosopo/types-database";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ProviderDatabase } from "../../databases/provider.js";

const logger = getLogger(LogLevel.enum.error, "commitmentUpdateTimestamp.test");

// Mongo only: the methods under test never touch redis.
class MongoOnlyProviderDatabase extends ProviderDatabase {
	protected override async setupRedis(): Promise<void> {}
}

const OLD = new Date("2026-01-01T00:00:00.000Z");

describe("updateDappUserCommitment", () => {
	let mongod: MongoMemoryServer;
	let db: MongoOnlyProviderDatabase;

	beforeAll(async () => {
		mongod = await MongoMemoryServer.create();
		db = new MongoOnlyProviderDatabase({
			mongo: { url: mongod.getUri(), dbname: "commitmentUpdateTimestamp" },
			logger,
		});
		await db.connect();
	});

	afterAll(async () => {
		await db.close();
		await mongod.stop();
	});

	const seed = async (id: string): Promise<void> => {
		await db.getTables().commitment.create({
			id,
			userAccount: "user",
			dappAccount: "dapp",
			providerAccount: "provider",
			datasetId: "dataset",
			result: { status: CaptchaStatus.pending },
			userSignature: "0xsig",
			ipAddress: { lower: 16909060n, type: IpAddressType.v4 },
			headers: {},
			ja4: "ja4",
			userSubmitted: false,
			serverChecked: false,
			requestedAtTimestamp: OLD,
			lastUpdatedTimestamp: OLD,
			pending: false,
			salt: "salt",
			requestHash: `0xreq-${id}`,
			deadlineTimestamp: new Date(Date.now() + 60_000),
			threshold: 0.5,
		});
	};

	const read = async (id: string): Promise<Record<string, unknown>> => {
		const doc = await db
			.getTables()
			.commitment.collection.findOne<Record<string, unknown>>({ id });
		if (!doc) throw new Error(`commitment ${id} missing`);
		return doc;
	};

	it.each([
		["$set form", { metadata: { email: "a@b.c" } }],
		["pipeline form", { userSubmitted: true }],
	] satisfies [string, Partial<UserCommitmentRecord>][])(
		"bumps lastUpdatedTimestamp (%s)",
		async (label, updates) => {
			const id = `bump-${label}`;
			await seed(id);
			await db.updateDappUserCommitment(id, updates);
			const doc = await read(id);
			expect(doc.lastUpdatedTimestamp).toBeInstanceOf(Date);
			expect((doc.lastUpdatedTimestamp as Date).getTime()).toBeGreaterThan(
				OLD.getTime(),
			);
			expect(doc).not.toHaveProperty("lastUpdatedAtTimestamp");
			expect(doc.pendingStage).toBe(true);
		},
	);

	it("keeps an update made after the sweep read pending for the next sweep", async () => {
		const id = "race";
		await seed(id);
		// The sweep read the batch at this instant, before the update landed.
		const sweepReadAt = new Date();
		await new Promise((resolve) => setTimeout(resolve, 5));
		await db.updateDappUserCommitment(id, {
			metadata: { email: "late@example.com" },
		});
		await db.markDappUserCommitmentsStored([id], sweepReadAt);
		const doc = await read(id);
		expect(doc.pendingStage).toBe(true);
		expect(doc.storedAtTimestamp).toBeUndefined();
	});
});
