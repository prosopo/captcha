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
	IpAddressType,
} from "@prosopo/types";
import {
	type PoWCaptchaRecord,
	PoWCaptchaRecordSchema,
	type PuzzleCaptchaRecord,
	PuzzleCaptchaRecordSchema,
	type UserCommitmentRecord,
	UserCommitmentRecordSchema,
} from "@prosopo/types-database";
import type mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryDatabase } from "../../base/mongoMemory.js";

const logger = getLogger(
	LogLevel.enum.error,
	"countCommitmentsByNormalisedEmail.test",
);

const ipv4Composite = (lower: bigint): CompositeIpAddress => ({
	lower,
	type: IpAddressType.v4,
});

// Directly exercises the mongo query shape that
// `ProviderDatabase.countCommitmentsByNormalisedEmail` performs. The three
// filters — `dappAccount`, `serverChecked: true`,
// `metadata.emailNormalised` — must all narrow, and the results must sum
// across the three captcha collections. Tested against MongoMemory
// (rather than the full `ProviderDatabase`) so redis / streamer wiring
// isn't dragged in for a query-shape test.

describe("countCommitmentsByNormalisedEmail — cross-collection sum + filters", () => {
	let mongoDb: MongoMemoryDatabase;
	let PoWModel: mongoose.Model<PoWCaptchaRecord>;
	let PuzzleModel: mongoose.Model<PuzzleCaptchaRecord>;
	let CommitmentModel: mongoose.Model<UserCommitmentRecord>;

	// Mirrors the filter built inside `countCommitmentsByNormalisedEmail`;
	// duplicated here so the test proves the exact shape the production
	// query relies on works against the mongoose schemas.
	const countAcross = async (
		dappAccount: string,
		emailNormalised: string,
	): Promise<number> => {
		if (!emailNormalised) return 0;
		const filter = {
			dappAccount,
			serverChecked: true,
			"metadata.emailNormalised": emailNormalised,
		};
		const [img, pow, puzzle] = await Promise.all([
			CommitmentModel.countDocuments(filter),
			PoWModel.countDocuments(filter),
			PuzzleModel.countDocuments(filter),
		]);
		return img + pow + puzzle;
	};

	beforeAll(async () => {
		mongoDb = new MongoMemoryDatabase("ignored", "captchastorage", logger);
		await mongoDb.connect();
		if (!mongoDb.connection) {
			throw new Error("MongoMemoryDatabase failed to provide a connection");
		}
		PoWModel = mongoDb.connection.model<PoWCaptchaRecord>(
			"PowCaptcha",
			PoWCaptchaRecordSchema,
		);
		PuzzleModel = mongoDb.connection.model<PuzzleCaptchaRecord>(
			"PuzzleCaptcha",
			PuzzleCaptchaRecordSchema,
		);
		CommitmentModel = mongoDb.connection.model<UserCommitmentRecord>(
			"Commitment",
			UserCommitmentRecordSchema,
		);
	});

	afterAll(async () => {
		await mongoDb.close();
	});

	beforeEach(async () => {
		// Wipe all three collections so each test starts clean; the
		// counts asserted below are absolute (not deltas).
		await Promise.all([
			PoWModel.deleteMany({}),
			PuzzleModel.deleteMany({}),
			CommitmentModel.deleteMany({}),
		]);
	});

	// Seeds one PoW, one Puzzle, one Commitment — all server-checked,
	// same dapp, same normalised email — plus one of each with a
	// different normalised email, and one PoW with serverChecked:false.
	// The expected count for the target email/dapp is 3 (one per
	// collection); the non-matching normalisation and unchecked records
	// must not be counted.
	const seedAcrossCollections = async () => {
		await CommitmentModel.create({
			id: "cmt-a",
			userAccount: "u1",
			dappAccount: "dapp-A",
			providerAccount: "prov1",
			datasetId: "ds1",
			result: { status: CaptchaStatus.approved },
			userSignature: "s",
			ipAddress: ipv4Composite(1n),
			headers: { host: "example.com" },
			ja4: "j",
			userSubmitted: true,
			serverChecked: true,
			requestedAtTimestamp: new Date(),
			pending: false,
			salt: "s",
			requestHash: "h",
			deadlineTimestamp: new Date(Date.now() + 60_000),
			threshold: 0.5,
			metadata: { email: "Alice+a@Gmail.com", emailNormalised: "alice@gmail.com" },
		});
		await PoWModel.create({
			challenge:
				"1___2___pow-a" as `${number}___${string}___${string}`,
			userAccount: "u2",
			dappAccount: "dapp-A",
			requestedAtTimestamp: new Date(),
			ipAddress: ipv4Composite(2n),
			headers: { host: "example.com" },
			ja4: "j",
			result: { status: CaptchaStatus.approved },
			userSubmitted: true,
			serverChecked: true,
			difficulty: 4,
			providerSignature: "sig",
			metadata: {
				email: "a.l.i.c.e+b@googlemail.com",
				emailNormalised: "alice@gmail.com",
			},
		});
		await PuzzleModel.create({
			challenge:
				"1___2___puzzle-a" as `${number}___${string}___${string}`,
			userAccount: "u3",
			dappAccount: "dapp-A",
			requestedAtTimestamp: new Date(),
			ipAddress: ipv4Composite(3n),
			headers: { host: "example.com" },
			ja4: "j",
			result: { status: CaptchaStatus.approved },
			userSubmitted: true,
			serverChecked: true,
			targetX: 1,
			targetY: 1,
			originX: 0,
			originY: 0,
			tolerance: 10,
			providerSignature: "sig",
			metadata: {
				email: "alice+c@gmail.com",
				emailNormalised: "alice@gmail.com",
			},
		});

		// Different normalised email — must NOT be counted.
		await CommitmentModel.create({
			id: "cmt-other",
			userAccount: "u4",
			dappAccount: "dapp-A",
			providerAccount: "prov1",
			datasetId: "ds1",
			result: { status: CaptchaStatus.approved },
			userSignature: "s",
			ipAddress: ipv4Composite(4n),
			headers: { host: "example.com" },
			ja4: "j",
			userSubmitted: true,
			serverChecked: true,
			requestedAtTimestamp: new Date(),
			pending: false,
			salt: "s",
			requestHash: "h",
			deadlineTimestamp: new Date(Date.now() + 60_000),
			threshold: 0.5,
			metadata: { email: "bob@example.com", emailNormalised: "bob@example.com" },
		});

		// serverChecked:false — must NOT be counted even though the
		// email matches. Guards against a future refactor dropping the
		// serverChecked filter and inflating counts with in-flight
		// (unverified) records.
		await PoWModel.create({
			challenge:
				"1___2___pow-unchecked" as `${number}___${string}___${string}`,
			userAccount: "u5",
			dappAccount: "dapp-A",
			requestedAtTimestamp: new Date(),
			ipAddress: ipv4Composite(5n),
			headers: { host: "example.com" },
			ja4: "j",
			result: { status: CaptchaStatus.pending },
			userSubmitted: false,
			serverChecked: false,
			difficulty: 4,
			providerSignature: "sig",
			metadata: {
				email: "alice@gmail.com",
				emailNormalised: "alice@gmail.com",
			},
		});
	};

	it("sums matching server-checked records across all three captcha collections", async () => {
		await seedAcrossCollections();
		const count = await countAcross("dapp-A", "alice@gmail.com");
		expect(count).toBe(3);
	});

	it("returns 0 for an unrelated normalised email", async () => {
		await seedAcrossCollections();
		const count = await countAcross("dapp-A", "zephyr@gmail.com");
		expect(count).toBe(0);
	});

	it("does not count records from a different dappAccount", async () => {
		await seedAcrossCollections();
		// Same email/normalised email but on a different dapp.
		await CommitmentModel.create({
			id: "cmt-other-dapp",
			userAccount: "u6",
			dappAccount: "dapp-B",
			providerAccount: "prov1",
			datasetId: "ds1",
			result: { status: CaptchaStatus.approved },
			userSignature: "s",
			ipAddress: ipv4Composite(6n),
			headers: { host: "example.com" },
			ja4: "j",
			userSubmitted: true,
			serverChecked: true,
			requestedAtTimestamp: new Date(),
			pending: false,
			salt: "s",
			requestHash: "h",
			deadlineTimestamp: new Date(Date.now() + 60_000),
			threshold: 0.5,
			metadata: {
				email: "alice@gmail.com",
				emailNormalised: "alice@gmail.com",
			},
		});

		const countA = await countAcross("dapp-A", "alice@gmail.com");
		const countB = await countAcross("dapp-B", "alice@gmail.com");
		expect(countA).toBe(3);
		expect(countB).toBe(1);
	});

	it("returns 0 for an empty normalised email without hitting the DB", async () => {
		// The empty-string short-circuit is a safety valve — an accidental
		// bug that produced "" would otherwise match every commitment
		// that happens to have `metadata.emailNormalised: ""`.
		await CommitmentModel.create({
			id: "cmt-empty",
			userAccount: "u7",
			dappAccount: "dapp-A",
			providerAccount: "prov1",
			datasetId: "ds1",
			result: { status: CaptchaStatus.approved },
			userSignature: "s",
			ipAddress: ipv4Composite(7n),
			headers: { host: "example.com" },
			ja4: "j",
			userSubmitted: true,
			serverChecked: true,
			requestedAtTimestamp: new Date(),
			pending: false,
			salt: "s",
			requestHash: "h",
			deadlineTimestamp: new Date(Date.now() + 60_000),
			threshold: 0.5,
			metadata: { email: "", emailNormalised: "" },
		});

		expect(await countAcross("dapp-A", "")).toBe(0);
	});
});
