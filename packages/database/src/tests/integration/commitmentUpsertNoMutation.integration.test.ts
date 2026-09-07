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

import { CaptchaStatus } from "@prosopo/types";
import {
	type UserCommitmentRecord,
	UserCommitmentRecordSchema,
} from "@prosopo/types-database";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { type Model } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Regression guard for a bug the mongoose 9 upgrade surfaced in the image
// captcha write path.
//
// `storeUserImageCaptchaSolution` upserts the commitment and then hands the
// *same* record object to `CentralDbStreamer.streamImageRecord`, which
// spreads it into `{ $set: safeDoc }`. Mongoose's `moveImmutableProperties`
// runs on every upsert and mutates the update object it was given in place:
// immutable paths are deleted from it and re-homed under a `$setOnInsert`
// key added to that same object. Pass the record itself as the update and
// the record comes back carrying `$setOnInsert`.
//
// Under mongoose 8 the resulting `{ $set: { $setOnInsert: ... } }` was
// tolerated. Mongoose 9's `castUpdate` throws
// `Invalid update: Unexpected modifier "$setOnInsert" as a key in operator
// "$set"`, so every image record silently failed to reach the central DB
// (fire-and-forget: the streamer only logs) and signup verification 500'd.
//
// The fix wraps the update in an explicit `$set` over a shallow copy. This
// test asserts the narrow invariant that keeps it fixed: an upsert must not
// leave `$`-prefixed keys on the caller's record.

describe("commitment upsert does not mutate the caller's record", () => {
	let mongod: MongoMemoryServer;
	let conn: mongoose.Connection;
	let CommitmentModel: Model<UserCommitmentRecord>;

	beforeAll(async () => {
		mongod = await MongoMemoryServer.create();
		conn = await mongoose
			.createConnection(mongod.getUri(), { dbName: "mutation_test" })
			.asPromise();
		CommitmentModel = conn.model<UserCommitmentRecord>(
			"commitment",
			UserCommitmentRecordSchema,
		);
	});

	afterAll(async () => {
		await conn.close();
		await mongod.stop();
	});

	type CommitmentFixture = Record<string, unknown> & { id: string };

	const buildRecord = (id: string): CommitmentFixture => ({
		id,
		userAccount: "userTest",
		dappAccount: "dappTest",
		datasetId: "datasetTest",
		providerAccount: "providerTest",
		pending: false,
		userSignature: "0xsig",
		salt: "0xsalt",
		requestHash: "requestHashTest",
		threshold: 1,
		deadlineTimestamp: new Date("2026-06-10T07:35:00Z"),
		requestedAtTimestamp: new Date("2026-06-10T07:30:00Z"),
		lastUpdatedTimestamp: new Date("2026-06-10T07:30:05Z"),
		result: { status: CaptchaStatus.approved },
		userSubmitted: true,
		serverChecked: false,
	});

	it("leaves no $-prefixed keys on the record after an upsert", async () => {
		const record = buildRecord("commitment-no-mutation");

		await CommitmentModel.updateOne(
			{ id: record.id },
			{ $set: { ...record } },
			{ upsert: true },
		);

		expect(Object.keys(record).filter((k) => k.startsWith("$"))).toEqual([]);
	});

	it("can re-stream the same record straight after the upsert", async () => {
		// The streamer's exact shape: spread the record (minus `_id`) into a
		// `$set` upsert against the central collection.
		const record = buildRecord("commitment-restream");

		await CommitmentModel.updateOne(
			{ id: record.id },
			{ $set: { ...record } },
			{ upsert: true },
		);

		const { _id, ...safeDoc } = record;
		await expect(
			CommitmentModel.updateOne(
				{ id: safeDoc.id },
				{ $set: safeDoc },
				{ upsert: true },
			),
		).resolves.toBeDefined();
	});
});
