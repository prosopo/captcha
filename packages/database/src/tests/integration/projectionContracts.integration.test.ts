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
	Tier,
} from "@prosopo/types";
import type {
	ClientRecord,
	PoWCaptchaRecord,
	PuzzleCaptchaRecord,
} from "@prosopo/types-database";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe } from "vitest";
import { ProviderDatabase } from "../../databases/provider.js";
import { testProjectionContract } from "./projectionContract.js";

// Central projection-drift guard.
//
// Each `testProjectionContract` call pins one (projection method,
// consumer) pair. Insert a fully-populated fixture, fetch via the
// projected method, assert every field the consumer reads survives.
//
// Add a new contract whenever a new projected fetch method is added
// to `ProviderDatabase`, OR whenever a consumer starts reading a new
// field off a projected record. See `projectionContract.ts` for the
// helper docstring — the manifest here IS the contract.

const logger = getLogger(LogLevel.enum.error, "projectionContracts.test");

// Stub Redis: none of the read paths under test touch it.
class TestProviderDatabase extends ProviderDatabase {
	protected override async setupRedis(): Promise<void> {
		// intentionally empty
	}
}

const ipv4Composite = (lower: bigint): CompositeIpAddress => ({
	lower,
	type: IpAddressType.v4,
});

// Minimal ipInfo blob covering the discriminated `isValid: true` branch
// that consumers typically narrow on.
const validIpInfo = {
	ip: "203.0.113.1",
	isValid: true as const,
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
	abuserScore: 0,
	companyAbuserScore: 0,
};

const bdp = () => ({
	c1: [{ x: 100, y: 100, timestamp: 1_787_000_000_000, velocity: 0 }],
	c2: [] as unknown[],
	c3: [
		{
			x: 200,
			y: 200,
			timestamp: 1_787_000_000_500,
			eventType: "click",
			button: 0,
			targetElement: "IMG",
			ctrlKey: false,
			shiftKey: false,
			altKey: false,
		},
	],
	d: "desktop",
});

describe("ProviderDatabase projection contracts", () => {
	let mongod: MongoMemoryServer;
	let db: TestProviderDatabase;

	beforeAll(async () => {
		mongod = await MongoMemoryServer.create();
		db = new TestProviderDatabase({
			mongo: { url: mongod.getUri(), dbname: "captchastorage" },
			logger,
		});
		await db.connect();
	});

	afterAll(async () => {
		await db.close();
		await mongod.stop();
	});

	// ─── PoW captcha record ──────────────────────────────────────────────
	// getPowCaptchaRecordByChallenge is called by
	// `serverVerifyPowCaptchaSolution`. Consumer field manifest derived by
	// `grep -oE "challengeRecord\.[a-zA-Z_]+"` on `powCaptcha/powTasks.ts`.
	// Update this list when powTasks starts reading a new field.
	testProjectionContract<PoWCaptchaRecord>({
		name: "getPowCaptchaRecordByChallenge",
		consumerName: "serverVerifyPowCaptchaSolution",
		insert: async () => {
			const challenge = "1___2___pow-projection-contract" as unknown as string;
			const doc = {
				challenge,
				userAccount: "user-pow",
				dappAccount: "dapp-pow",
				requestedAtTimestamp: new Date(),
				submittedAtTimestamp: new Date(),
				ipAddress: ipv4Composite(1n),
				headers: { host: "example.com", "user-agent": "Mozilla/5.0" },
				ja4: "ja4-pow",
				result: { status: CaptchaStatus.approved },
				difficulty: 4,
				providerSignature: "sig-pow",
				sessionId: "session-pow",
				ipInfo: validIpInfo,
				deviceCapability: "desktop",
				behavioralDataPacked: bdp(),
				serverChecked: false,
				userSubmitted: true,
				coords: [[[300, 300]]] as [number, number][][],
			};
			await db.tables.powcaptcha.create(doc);
			return doc as unknown as PoWCaptchaRecord;
		},
		fetch: (fixture) =>
			db.getPowCaptchaRecordByChallenge(fixture.challenge as unknown as string),
		consumerReads: [
			"behavioralDataPacked",
			"challenge",
			"coords",
			"dappAccount",
			"deviceCapability",
			"difficulty",
			"headers",
			"ipAddress",
			"ipInfo",
			"result",
			"serverChecked",
			"sessionId",
			"submittedAtTimestamp",
			"userAccount",
		],
	});

	// ─── Puzzle captcha record ───────────────────────────────────────────
	// getPuzzleCaptchaRecordByChallenge is called by
	// `serverVerifyPuzzleCaptchaSolution`. Consumer field manifest derived
	// by `grep -oE "challengeRecord\.[a-zA-Z_]+"` on
	// `puzzleCaptcha/puzzleTasks.ts`. Update this list when puzzleTasks
	// starts reading a new field.
	testProjectionContract<PuzzleCaptchaRecord>({
		name: "getPuzzleCaptchaRecordByChallenge",
		consumerName: "serverVerifyPuzzleCaptchaSolution",
		insert: async () => {
			const challenge =
				"1___2___puzzle-projection-contract" as unknown as string;
			const doc = {
				challenge,
				userAccount: "user-puzzle",
				dappAccount: "dapp-puzzle",
				requestedAtTimestamp: new Date(),
				submittedAtTimestamp: new Date(),
				ipAddress: ipv4Composite(1n),
				headers: { host: "example.com", "user-agent": "Mozilla/5.0" },
				ja4: "ja4-puzzle",
				result: { status: CaptchaStatus.approved },
				targetX: 100,
				targetY: 100,
				originX: 0,
				originY: 0,
				tolerance: 10,
				puzzleEvents: [
					{ x: 10, y: 10, t: 1_787_000_000_000 },
					{ x: 100, y: 100, t: 1_787_000_000_500 },
				],
				providerSignature: "sig-puzzle",
				sessionId: "session-puzzle",
				ipInfo: validIpInfo,
				deviceCapability: "desktop",
				behavioralDataPacked: bdp(),
				serverChecked: false,
				userSubmitted: true,
				coords: [[[100, 100]]] as [number, number][][],
			};
			await db.tables.puzzlecaptcha.create(doc);
			return doc as unknown as PuzzleCaptchaRecord;
		},
		fetch: (fixture) =>
			db.getPuzzleCaptchaRecordByChallenge(
				fixture.challenge as unknown as string,
			),
		consumerReads: [
			"behavioralDataPacked",
			"challenge",
			"coords",
			"dappAccount",
			"deviceCapability",
			"headers",
			"ipAddress",
			"ipInfo",
			"puzzleEvents",
			"result",
			"serverChecked",
			"sessionId",
			"submittedAtTimestamp",
			"targetX",
			"targetY",
			"tolerance",
			"userAccount",
			"userSubmitted",
		],
	});

	// ─── Client record ───────────────────────────────────────────────────
	// getClientRecord is called throughout the verify/routing paths to
	// look up per-dapp settings and tier. Consumer field manifest derived
	// by `grep -oE "clientRecord\??\.[a-zA-Z_]+"` on `packages/provider`.
	testProjectionContract<ClientRecord>({
		name: "getClientRecord",
		consumerName: "provider tasks (settings/tier readers)",
		insert: async () => {
			const doc = {
				account: "client-projection-contract",
				tier: Tier.Free,
				settings: {
					domains: ["example.com"],
					frictionlessThreshold: 0.5,
					powDifficulty: 4,
					captchaType: "image",
				},
			};
			await db.tables.client.create(doc);
			return doc as unknown as ClientRecord;
		},
		fetch: (fixture) => db.getClientRecord(fixture.account),
		consumerReads: ["account", "settings", "tier"],
	});
});
