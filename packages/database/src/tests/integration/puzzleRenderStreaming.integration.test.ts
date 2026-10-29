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
	type PuzzleRenderRecord,
} from "@prosopo/types";
import type { PuzzleCaptchaRecord } from "@prosopo/types-database";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CentralDbStreamer } from "../../databases/centralDbStreamer.js";
import { ProviderDatabase } from "../../databases/provider.js";

// The render inputs are patched onto a puzzle record after it has already been
// streamed to central, so the only way they reach the central copy the portal
// redraws from is the update stream's re-read.

const logger = getLogger(LogLevel.enum.error, "puzzleRenderStreaming.test");

const ipv4Composite = (lower: bigint): CompositeIpAddress => ({
	lower,
	type: IpAddressType.v4,
});

const render: PuzzleRenderRecord = {
	pieceSize: 60,
	geometry: { width: 300, height: 200, notchSize: 44 },
	settings: {
		decoyCount: 5,
		decoyEdgeDarkness: 0.5,
		decoyBodyBrightness: 0.5,
		holeDarken: 0.5,
		decoyHoleDarken: 0.5,
	},
	backgroundSeed: "00112233445566778899aabbccddeeff",
	renderSeed: "ffeeddccbbaa99887766554433221100",
};

class TestProviderDatabase extends ProviderDatabase {
	protected override async setupRedis(): Promise<void> {
		// intentionally empty
	}
}

const waitFor = async <T>(
	read: () => Promise<T>,
	done: (value: T) => boolean,
): Promise<T> => {
	let value = await read();
	for (let i = 0; i < 100 && !done(value); i++) {
		await new Promise<void>((r) => setTimeout(r, 20));
		value = await read();
	}
	return value;
};

describe("ProviderDatabase: puzzle render inputs reach the central copy", () => {
	let localMongo: MongoMemoryServer;
	let centralMongo: MongoMemoryServer;
	let db: TestProviderDatabase;
	let streamer: CentralDbStreamer;

	beforeAll(async () => {
		localMongo = await MongoMemoryServer.create({
			instance: { launchTimeout: 60_000 },
		});
		centralMongo = await MongoMemoryServer.create({
			instance: { launchTimeout: 60_000 },
		});
		db = new TestProviderDatabase({
			mongo: { url: localMongo.getUri(), dbname: "captchastorage" },
			logger,
		});
		await db.connect();
		streamer = new CentralDbStreamer(centralMongo.getUri(), logger);
		await (
			streamer as unknown as { db: { connect: () => Promise<void> } }
		).db.connect();
		db.setCentralDbStreamer(streamer);
	}, 120_000);

	afterAll(async () => {
		await db.close();
		await (
			streamer as unknown as { db: { close: () => Promise<void> } }
		).db.close();
		await localMongo.stop();
		await centralMongo.stop();
	}, 30_000);

	it("streams render when it is patched onto an existing record, but no ordinary read returns it", async () => {
		const challenge = "1___u1___dapp-A___puzzle-render" as PoWChallengeId;
		await db.getTables().puzzlecaptcha.create({
			challenge,
			userAccount: "u1",
			dappAccount: "dapp-A",
			requestedAtTimestamp: new Date(),
			ipAddress: ipv4Composite(1n),
			headers: { host: "example.com" },
			ja4: "j",
			result: { status: CaptchaStatus.pending },
			userSubmitted: false,
			serverChecked: false,
			targetX: 200,
			targetY: 100,
			originX: 30,
			originY: 100,
			tolerance: 10,
			providerSignature: "sig",
		});

		await db.updatePuzzleCaptchaRecord(challenge, { render });

		const central = (
			streamer as unknown as {
				db: {
					tables: {
						puzzlecaptcha: import("mongoose").Model<PuzzleCaptchaRecord>;
					};
				};
			}
		).db.tables.puzzlecaptcha;
		const stored = await waitFor(
			() => central.findOne({ challenge }).lean<PuzzleCaptchaRecord>(),
			(doc) => doc?.render !== undefined,
		);
		expect(stored?.render).toEqual(render);

		const verifyRead = await db.getPuzzleCaptchaRecordByChallenge(challenge);
		expect(verifyRead?.targetX).toBe(200);
		expect(verifyRead).not.toHaveProperty("render");
	});
});
