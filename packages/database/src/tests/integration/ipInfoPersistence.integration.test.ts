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

import { getLogger, LogLevel } from "@prosopo/common";
import {
	CaptchaStatus,
	type CompositeIpAddress,
	type IPInfoResponse,
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
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryDatabase } from "../../base/mongoMemory.js";

const logger = getLogger(LogLevel.enum.error, "ipInfoPersistence.test");

// Each captcha record now carries the full IPInfoResponse from
// IpInfoService.lookup() rather than the cherry-picked
// `vpn` / `countryCode` flat fields. These tests round-trip a record
// through MongoMemory to assert the mongoose schemas actually
// persist + retrieve the payload exactly.

const validIpInfo: IPInfoResponse = {
	ip: "1.1.1.1",
	isValid: true,
	isVPN: true,
	isTor: false,
	isProxy: true,
	isDatacenter: true,
	isAbuser: true,
	isMobile: false,
	isSatellite: false,
	isCrawler: false,
	countryCode: "DE",
	asnNumber: 12345,
	abuserScore: 0.7,
	companyAbuserScore: 0.4,
};

const errorIpInfo: IPInfoResponse = {
	ip: "127.0.0.1",
	isValid: false,
	error: "Non-routable IP address",
};

const ipv4Composite = (lower: bigint): CompositeIpAddress => ({
	lower,
	type: IpAddressType.v4,
});

describe("captcha record ipInfo persistence (MongoMemory roundtrip)", () => {
	let mongoDb: MongoMemoryDatabase;
	let PoWModel: mongoose.Model<PoWCaptchaRecord>;
	let PuzzleModel: mongoose.Model<PuzzleCaptchaRecord>;
	let CommitmentModel: mongoose.Model<UserCommitmentRecord>;

	beforeAll(async () => {
		mongoDb = new MongoMemoryDatabase("ignored", "captchastorage", logger);
		await mongoDb.connect();
		if (!mongoDb.connection) {
			throw new Error("MongoMemoryDatabase failed to provide a connection");
		}
		// Bind schemas to the in-memory connection without dragging in
		// `ProviderDatabase`'s Redis setup.
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

	it("persists the full IPInfoResponse on a PoW captcha record", async () => {
		await PoWModel.create({
			challenge: "1___2___challenge-pow-valid" as `${number}___${string}___${string}`,
			userAccount: "user1",
			dappAccount: "dapp1",
			requestedAtTimestamp: new Date(),
			ipAddress: ipv4Composite(16843009n),
			headers: { host: "example.com" },
			ja4: "ja4-1",
			result: { status: CaptchaStatus.pending },
			userSubmitted: false,
			serverChecked: false,
			difficulty: 4,
			providerSignature: "sig-1",
			ipInfo: validIpInfo,
		});

		const got = await PoWModel.findOne({
			challenge: "1___2___challenge-pow-valid",
		}).lean<PoWCaptchaRecord>();
		expect(got).not.toBeNull();
		expect(got?.ipInfo).toMatchObject(validIpInfo);
		// `isValid` discriminator is preserved
		expect(got?.ipInfo?.isValid).toBe(true);
		if (got?.ipInfo?.isValid) {
			expect(got.ipInfo.isVPN).toBe(true);
			expect(got.ipInfo.countryCode).toBe("DE");
			expect(got.ipInfo.asnNumber).toBe(12345);
		}
	});

	it("persists an IPInfoError on a PoW captcha record", async () => {
		await PoWModel.create({
			challenge: "1___2___challenge-pow-error" as `${number}___${string}___${string}`,
			userAccount: "user2",
			dappAccount: "dapp1",
			requestedAtTimestamp: new Date(),
			ipAddress: ipv4Composite(2130706433n),
			headers: { host: "example.com" },
			ja4: "ja4-2",
			result: { status: CaptchaStatus.pending },
			userSubmitted: false,
			serverChecked: false,
			difficulty: 4,
			providerSignature: "sig-2",
			ipInfo: errorIpInfo,
		});

		const got = await PoWModel.findOne({
			challenge: "1___2___challenge-pow-error",
		}).lean<PoWCaptchaRecord>();
		expect(got?.ipInfo).toMatchObject(errorIpInfo);
		expect(got?.ipInfo?.isValid).toBe(false);
	});

	it("persists the full IPInfoResponse on a Puzzle captcha record", async () => {
		await PuzzleModel.create({
			challenge: "1___2___challenge-puzzle-valid" as `${number}___${string}___${string}`,
			userAccount: "user3",
			dappAccount: "dapp1",
			requestedAtTimestamp: new Date(),
			ipAddress: ipv4Composite(16843009n),
			headers: { host: "example.com" },
			ja4: "ja4-3",
			result: { status: CaptchaStatus.pending },
			userSubmitted: false,
			serverChecked: false,
			targetX: 100,
			targetY: 100,
			originX: 0,
			originY: 0,
			tolerance: 10,
			providerSignature: "sig-3",
			ipInfo: validIpInfo,
		});

		const got = await PuzzleModel.findOne({
			challenge: "1___2___challenge-puzzle-valid",
		}).lean<PuzzleCaptchaRecord>();
		expect(got?.ipInfo).toMatchObject(validIpInfo);
	});

	it("persists the full IPInfoResponse on a UserCommitment record", async () => {
		await CommitmentModel.create({
			id: "commitment-valid",
			userAccount: "user4",
			dappAccount: "dapp1",
			providerAccount: "provider1",
			datasetId: "dataset1",
			result: { status: CaptchaStatus.pending },
			userSignature: "sig",
			ipAddress: ipv4Composite(16843009n),
			headers: { host: "example.com" },
			ja4: "ja4-4",
			userSubmitted: true,
			serverChecked: false,
			requestedAtTimestamp: new Date(),
			pending: false,
			salt: "salt",
			requestHash: "0xabcdef",
			deadlineTimestamp: new Date(Date.now() + 60_000),
			threshold: 0.5,
			ipInfo: validIpInfo,
		});

		const got = await CommitmentModel.findOne({
			id: "commitment-valid",
		}).lean<UserCommitmentRecord>();
		expect(got?.ipInfo).toMatchObject(validIpInfo);
	});

	it("backfill query { ipInfo: { $exists: false } } matches records missing ipInfo", async () => {
		// Insert two PoW records: one with ipInfo, one without — mirrors a
		// pre-existing record that needs to be backfilled by CHECK_IP_INFO.
		await PoWModel.create({
			challenge:
				"1___2___challenge-pow-with-info" as `${number}___${string}___${string}`,
			userAccount: "user5",
			dappAccount: "dapp1",
			requestedAtTimestamp: new Date(),
			ipAddress: ipv4Composite(16843010n),
			headers: { host: "example.com" },
			ja4: "ja4-5",
			result: { status: CaptchaStatus.pending },
			userSubmitted: false,
			serverChecked: false,
			difficulty: 4,
			providerSignature: "sig-5",
			ipInfo: validIpInfo,
		});
		await PoWModel.create({
			challenge:
				"1___2___challenge-pow-no-info" as `${number}___${string}___${string}`,
			userAccount: "user6",
			dappAccount: "dapp1",
			requestedAtTimestamp: new Date(),
			ipAddress: ipv4Composite(16843011n),
			headers: { host: "example.com" },
			ja4: "ja4-6",
			result: { status: CaptchaStatus.pending },
			userSubmitted: false,
			serverChecked: false,
			difficulty: 4,
			providerSignature: "sig-6",
			// no ipInfo
		});

		const missing = await PoWModel.find({
			ipInfo: { $exists: false },
		}).lean<PoWCaptchaRecord[]>();
		const challenges = missing.map((r) => r.challenge);
		expect(challenges).toContain("1___2___challenge-pow-no-info");
		expect(challenges).not.toContain("1___2___challenge-pow-with-info");
	});
});
