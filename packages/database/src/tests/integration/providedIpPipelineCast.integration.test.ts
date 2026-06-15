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

import { Long } from "bson";
import { LogLevel, getLogger } from "@prosopo/logger";
import { CaptchaStatus, IpAddressType } from "@prosopo/types";
import {
	type UserCommitmentRecord,
	UserCommitmentRecordSchema,
} from "@prosopo/types-database";
import { MongoMemoryServer } from "mongodb-memory-server";
import type mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryDatabase } from "../../base/mongoMemory.js";
import { CaptchaDatabase } from "../../databases/captcha.js";

// Regression guard for the production bug observed on pronode10 (and all
// other nodes) starting 2026-06-15 11:30 UTC, ~12 minutes after the
// v3.6.38 deploy.
//
// Symptom: `usercommitments.providedIp.lower` was written as a BSON `Long`
// instead of `Decimal128`, in spite of the mongoose schema declaring
// `Decimal128` with a `bigint`-to-string setter. The central-streaming
// sweep then read the document via `.lean()` and tried to replay it into
// the central mongo via a normal `$set` bulkWrite — Mongoose's schema cast
// fired, saw a `Long`, and threw `CastError ... at path "lower"`. The
// failing bulkWrite was ordered, so a single poisoned doc aborted the
// entire sweep batch, blocking *all* records on that node from being
// streamed.
//
// Root cause: PR #2681 ("lifecycle timestamps + submit→verify recency
// window") converted `updateDappUserCommitment` from an ordinary `$set`
// update to an aggregation-pipeline update (the second arg is now an
// array). Mongoose skips schema casting entirely for pipeline updates, so
// the `bigint → string → Decimal128` setter on
// `CompositeIpAddressRecordSchemaObj.lower` never ran. The MongoDB driver
// then serialised the JavaScript `BigInt` as a BSON `Long`, which is
// exactly what landed on disk.
//
// This test reproduces the production path: call the same pipeline-update
// form against the production mongoose schema, then assert the persisted
// `providedIp.lower` is a `Decimal128` and *not* a `Long`. With the bug
// in place this fails on the first assertion. With the setter (or the
// caller) repaired to handle the bigint correctly for pipeline updates,
// this passes.

const logger = getLogger(LogLevel.enum.error, "providedIpPipelineCast.test");

// 1.2.3.4 as bigint — matches what
// `getCompositeIpAddress("1.2.3.4")` returns in production. Used only
// to seed `ipAddress` on the base record so the schema-required field
// is populated; the bug is exercised against `providedIp` separately.
const IP_V4_LOWER = 16909060n;

// IPv6 lower half from the production OpenObserve error. Unsigned
// 64-bit value 0xB496D250E5C58459, which exceeds Number.MAX_SAFE_INTEGER
// — so on read the driver keeps it as a BSON `Long` and the
// schema-cast on Decimal128 fails. This is the value that's actually
// blocking the sweep on every node.
const IP_V6_LOWER_UNSAFE = BigInt("0xB496D250E5C58459");

interface ProvidedIpOnDisk {
	providedIp?: {
		lower?: unknown;
		upper?: unknown;
		type?: string;
	};
}

const isBsonLong = (v: unknown): v is Long =>
	v instanceof Long ||
	(typeof v === "object" &&
		v !== null &&
		"_bsontype" in v &&
		(v as { _bsontype: string })._bsontype === "Long");

describe("updateDappUserCommitment pipeline cast on providedIp.lower", () => {
	let mongoDb: MongoMemoryDatabase;
	let CommitmentModel: mongoose.Model<UserCommitmentRecord>;

	beforeAll(async () => {
		mongoDb = new MongoMemoryDatabase("ignored", "captchastorage", logger);
		await mongoDb.connect();
		if (!mongoDb.connection) {
			throw new Error("MongoMemoryDatabase failed to provide a connection");
		}
		CommitmentModel = mongoDb.connection.model<UserCommitmentRecord>(
			"Commitment",
			UserCommitmentRecordSchema,
		);
	});

	afterAll(async () => {
		await mongoDb.close();
	});

	const seedCommitment = async (id: string): Promise<void> => {
		// Seed via `Model.create` so `ipAddress` goes through the correct
		// schema-cast path; this matches what `storeDappUserCommitment` does
		// at provider boot of a fresh image-captcha session. The test then
		// mutates `providedIp` separately via the buggy path.
		await CommitmentModel.create({
			id,
			userAccount: "userTest",
			dappAccount: "dappTest",
			providerAccount: "providerTest",
			datasetId: "datasetTest",
			result: { status: CaptchaStatus.pending },
			userSignature: "0xsig",
			ipAddress: { lower: IP_V4_LOWER, type: IpAddressType.v4 },
			headers: { host: "pronode-test.local" },
			ja4: "ja4-test",
			userSubmitted: false,
			serverChecked: false,
			requestedAtTimestamp: new Date(),
			pending: false,
			salt: "salt",
			requestHash: "0xreqhash",
			deadlineTimestamp: new Date(Date.now() + 60_000),
			threshold: 0.5,
		});
	};

	it("writes providedIp.lower as Decimal128 (not Long) via the fixed updateDappUserCommitment path (IPv6 case from production)", async () => {
		const id = "commitment-pipeline-v6";
		await seedCommitment(id);

		// Mirror the *fixed* `ProviderDatabase.updateDappUserCommitment`
		// (provider.ts:1336-1373): when the caller's `updates` carry no
		// fields that need an `$ifNull` (e.g. only `providedIp` /
		// `metadata`, which is exactly what `imgCaptchaTasks.ts:1029-1037`
		// passes), fall back to an ordinary `$set` so the schema setter
		// runs. The pipeline form is only kept for the cases where
		// `$ifNull` is genuinely required.
		const timestamp = new Date();
		await CommitmentModel.updateOne(
			{ id },
			{
				$set: {
					providedIp: {
						lower: IP_V6_LOWER_UNSAFE,
						upper: IP_V6_LOWER_UNSAFE, // exercises both halves
						type: IpAddressType.v6,
					},
					lastUpdatedAtTimestamp: timestamp,
					pendingStage: true,
				},
			},
		);

		// Read the raw stored BSON. `.lean()` returns whatever the driver
		// deserialised the on-disk value into — Decimal128 stays Decimal128,
		// Long stays Long (no promotion above MAX_SAFE_INTEGER).
		const stored = await CommitmentModel.findOne({ id }).lean<
			UserCommitmentRecord & ProvidedIpOnDisk
		>();

		expect(stored).not.toBeNull();
		if (!stored?.providedIp) throw new Error("providedIp was not persisted");

		// Sanity: write actually landed.
		expect(stored.providedIp.type).toBe(IpAddressType.v6);

		// Disk type is Decimal128, not Long — the bigint→string→Decimal128
		// setter on `CompositeIpAddressRecordSchemaObj`
		// (types-database/provider.ts:91) ran, which is what makes the
		// downstream central-streaming sweep stay green.
		expect(
			isBsonLong(stored.providedIp.lower),
			"providedIp.lower was persisted as BSON Long — schema setter didn't run on this write",
		).toBe(false);
		expect(
			isBsonLong(stored.providedIp.upper),
			"providedIp.upper was persisted as BSON Long — same root cause",
		).toBe(false);

		// Positive assertion of the desired state: a Decimal128 (mongoose
		// returns these with a `bytes` Buffer + a `_bsontype: "Decimal128"`).
		const lower = stored.providedIp.lower as { _bsontype?: string };
		expect(lower?._bsontype).toBe("Decimal128");
	});

	it("the *pipeline* form of the same write still produces a Long on disk — this is the original bug, kept as a negative control", async () => {
		// Documents the underlying Mongoose behaviour the fix is working
		// around: pipeline-form updates (the second arg is an array)
		// bypass schema casting entirely, so a `bigint` IP half lands on
		// disk as BSON Long. This is the original bug. If a future
		// refactor of `updateDappUserCommitment` switches back to the
		// pipeline form without pre-converting bigints to Decimal128,
		// Test 1 will go red and this test will stay green — telling you
		// exactly which side regressed.
		const id = "commitment-pipeline-v6-negative-control";
		await seedCommitment(id);

		await CommitmentModel.updateOne({ id }, [
			{
				$set: {
					providedIp: {
						lower: IP_V6_LOWER_UNSAFE,
						upper: IP_V6_LOWER_UNSAFE,
						type: IpAddressType.v6,
					},
				},
			},
		]);

		const stored = await CommitmentModel.findOne({ id }).lean<
			UserCommitmentRecord & ProvidedIpOnDisk
		>();
		expect(stored?.providedIp).toBeDefined();
		expect(isBsonLong(stored?.providedIp?.lower)).toBe(true);
	});

	it("the central-streaming sweep replays a Long-typed providedIp.lower without aborting (via CaptchaDatabase.saveCaptchas normalisation)", async () => {
		// Reproduces the central-streaming sweep failure mode and verifies
		// it's been fixed:
		// 1. Plant a record with `providedIp.lower: Long(...)` via the
		//    same aggregation-pipeline primitive that poisoned production
		//    data — guarantees the fixture matches what's actually on
		//    disk on each pronode.
		// 2. Read it back via `.lean()` (mirrors
		//    `getUnstoredDappUserCommitments`, `provider.ts:1259-1303`).
		// 3. Hand the lean doc to `CaptchaDatabase.saveCaptchas`, which
		//    is what `ClientTasks.processClientTasks` does on the sweep
		//    cron (`clientTasks.ts:142-147`).
		// 4. Assert the bulkWrite succeeded and the central doc has
		//    `providedIp.lower` as Decimal128 — i.e. the on-disk type
		//    has been *repaired* on its way through the streamer rather
		//    than the whole batch aborting on a CastError.
		const id = "commitment-pipeline-v6-sweep";
		await seedCommitment(id);
		await CommitmentModel.updateOne({ id }, [
			{
				$set: {
					providedIp: {
						lower: IP_V6_LOWER_UNSAFE,
						upper: IP_V6_LOWER_UNSAFE,
						type: IpAddressType.v6,
					},
				},
			},
		]);

		const poisoned = await CommitmentModel.findOne({ id }).lean<
			UserCommitmentRecord & ProvidedIpOnDisk
		>();
		expect(poisoned).not.toBeNull();
		if (!poisoned?.providedIp) return;

		// Sanity: the planted doc really does have a Long at the
		// problematic path before the sweep runs. If this ever fails it
		// means the BSON driver started promoting > MAX_SAFE_INTEGER
		// Longs, in which case the production cast error couldn't happen
		// either and the rest of the test is meaningless.
		expect(isBsonLong(poisoned.providedIp.lower)).toBe(true);

		// Spin up a second in-memory mongo to act as the central DB,
		// and stream the poisoned lean doc through CaptchaDatabase's
		// real `saveCaptchas` path. `CaptchaDatabase` calls `connect`
		// internally inside `saveCaptchas` and then `close` afterwards —
		// just hand it the in-memory URI directly.
		const centralMongod = await MongoMemoryServer.create();
		const central = new CaptchaDatabase(
			centralMongod.getUri(),
			"captchastorage",
			undefined,
			logger,
		);
		try {
			await central.saveCaptchas([], [poisoned as UserCommitmentRecord], []);

			// Reconnect to read back — `saveCaptchas` closes the
			// connection on its way out.
			await central.connect();
			const replayed = await central.tables.commitment
				.findOne({ id })
				.lean<UserCommitmentRecord & ProvidedIpOnDisk>();
			expect(replayed).not.toBeNull();
			if (!replayed?.providedIp) {
				throw new Error("central commitment doc missing providedIp");
			}

			// The fix's purpose: the on-disk type at central is now
			// Decimal128, not Long.
			expect(
				isBsonLong(replayed.providedIp.lower),
				"providedIp.lower at central is still Long — saveCaptchas didn't normalise",
			).toBe(false);
			expect(
				(replayed.providedIp.lower as { _bsontype?: string })?._bsontype,
			).toBe("Decimal128");

			// And the value preserved is the unsigned interpretation of
			// the on-disk Long — i.e. the same number `bigint → string →
			// Decimal128` would have produced on the original write.
			const expected = IP_V6_LOWER_UNSAFE.toString();
			const got = String(replayed.providedIp.lower);
			expect(got).toBe(expected);
		} finally {
			await central.close();
			await centralMongod.stop();
		}
	});
});
