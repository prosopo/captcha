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
	type PoWChallengeId,
} from "@prosopo/types";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ProviderDatabase } from "../../databases/provider.js";

// A captcha token must verify at most once. The verify paths read the record,
// see serverChecked=false and then mark it checked; unless marking is a
// conditional claim, N concurrent verifies of one token all pass.

const logger = getLogger(LogLevel.enum.error, "serverCheckClaim.test");

class TestProviderDatabase extends ProviderDatabase {
	protected override async setupRedis(): Promise<void> {
		// intentionally empty
	}
}

const ip: CompositeIpAddress = { lower: 1n, type: IpAddressType.v4 };
const CONCURRENCY = 8;

const baseChallenge = {
	userAccount: "user",
	dappAccount: "dapp",
	requestedAtTimestamp: new Date(),
	submittedAtTimestamp: new Date(),
	ipAddress: ip,
	headers: { host: "example.com" },
	ja4: "ja4",
	result: { status: CaptchaStatus.approved },
	providerSignature: "sig",
	serverChecked: false,
	userSubmitted: true,
};

describe("server-check claims are single-use under concurrency", () => {
	let mongod: MongoMemoryServer;
	let db: TestProviderDatabase;

	beforeAll(async () => {
		mongod = await MongoMemoryServer.create({
			instance: { launchTimeout: 60_000 },
		});
		db = new TestProviderDatabase({
			mongo: { url: mongod.getUri(), dbname: "captchastorage" },
			logger,
		});
		await db.connect();
	}, 90_000);

	afterAll(async () => {
		await db.close();
		await mongod.stop();
	}, 30_000);

	it("claims a PoW challenge for exactly one of N concurrent verifies", async () => {
		const challenge = "1___user___dapp___pow-claim";
		await db.getTables().powcaptcha.create({
			...baseChallenge,
			challenge,
			difficulty: 4,
		});

		const claims: number[] = await Promise.all(
			Array.from({ length: CONCURRENCY }, () =>
				db.markDappUserPoWCommitmentsChecked([challenge]),
			),
		);

		expect(claims.filter((claimed) => claimed === 1)).toHaveLength(1);
		const record = await db.getPowCaptchaRecordByChallenge(challenge);
		expect(record?.serverChecked).toBe(true);
	});

	it("claims a puzzle challenge for exactly one of N concurrent verifies", async () => {
		const challenge = "1___user___dapp___puzzle-claim" as PoWChallengeId;
		await db.getTables().puzzlecaptcha.create({
			...baseChallenge,
			challenge,
			targetX: 1,
			targetY: 1,
			originX: 0,
			originY: 0,
			tolerance: 10,
		});

		const claims: boolean[] = await Promise.all(
			Array.from({ length: CONCURRENCY }, () =>
				db.markPuzzleCaptchaRecordChecked(challenge),
			),
		);

		expect(claims.filter(Boolean)).toHaveLength(1);
		const record = await db.getPuzzleCaptchaRecordByChallenge(challenge);
		expect(record?.serverChecked).toBe(true);
	});

	it("claims an image commitment for exactly one of N concurrent verifies", async () => {
		const id = "0xcommitmentclaim";
		await db.getTables().commitment.create({
			id,
			userAccount: "user",
			dappAccount: "dapp",
			datasetId: "dataset",
			providerAccount: "provider",
			pending: false,
			userSignature: "0xsig",
			salt: "0xsalt",
			requestHash: "0xrequesthashclaim",
			threshold: 1,
			deadlineTimestamp: new Date(),
			requestedAtTimestamp: new Date(),
			ipAddress: ip,
			headers: { host: "example.com" },
			ja4: "ja4",
			result: { status: CaptchaStatus.approved },
			userSubmitted: true,
			serverChecked: false,
		});

		const claims: number[] = await Promise.all(
			Array.from({ length: CONCURRENCY }, () =>
				db.markDappUserCommitmentsChecked([id]),
			),
		);

		expect(claims.filter((claimed) => claimed === 1)).toHaveLength(1);
		const record = await db.getDappUserCommitmentById(id);
		expect(record?.serverChecked).toBe(true);
	});

	it("consumes a pending image request for exactly one of N concurrent submissions", async () => {
		const requestHash = "0xabcdef0123";
		await db.getTables().commitment.create({
			id: "0xpendingclaim",
			userAccount: "user",
			dappAccount: "dapp",
			datasetId: "dataset",
			providerAccount: "provider",
			pending: true,
			userSignature: "0xsig",
			salt: "0xsalt",
			requestHash,
			threshold: 1,
			deadlineTimestamp: new Date(Date.now() + 60_000),
			requestedAtTimestamp: new Date(),
			ipAddress: ip,
			headers: { host: "example.com" },
			ja4: "ja4",
			result: { status: CaptchaStatus.pending },
			userSubmitted: false,
			serverChecked: false,
		});

		const claims: boolean[] = await Promise.all(
			Array.from({ length: CONCURRENCY }, () =>
				db.updatePendingImageCommitmentStatus(requestHash),
			),
		);

		expect(claims.filter(Boolean)).toHaveLength(1);
	});
});
