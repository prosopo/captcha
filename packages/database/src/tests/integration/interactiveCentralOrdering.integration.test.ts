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
	CaptchaType,
	type CompositeIpAddress,
	IpAddressType,
	type PoWChallengeId,
} from "@prosopo/types";
import type { IconOrderCaptchaRecord } from "@prosopo/types-database";
import { MongoMemoryServer } from "mongodb-memory-server";
import { type Model, Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CaptchaDatabase } from "../../databases/captcha.js";
import {
	CentralDbStreamer,
	type MarkStoredCallback,
} from "../../databases/centralDbStreamer.js";
import { ProviderDatabase } from "../../databases/provider.js";

// A provider streams a snapshot of an interactive record after every write and
// never waits for one to land before sending the next, so the central DB sees
// them in any order. These pin that an older snapshot arriving last can no
// longer put a graded record back to Pending, and that the provider-side
// bookkeeping lets the sweep find what the streamer missed.

const logger = getLogger(
	LogLevel.enum.error,
	"interactiveCentralOrdering.test",
);

const ipv4Composite = (lower: bigint): CompositeIpAddress => ({
	lower,
	type: IpAddressType.v4,
});

const iconOrderRecord = (
	challenge: PoWChallengeId,
	overrides: Partial<IconOrderCaptchaRecord>,
): IconOrderCaptchaRecord =>
	({
		challenge,
		userAccount: "u1",
		dappAccount: "dapp-A",
		requestedAtTimestamp: new Date("2026-11-09T02:18:40Z"),
		lastUpdatedTimestamp: new Date("2026-11-09T02:18:41Z"),
		ipAddress: ipv4Composite(3405803783n),
		headers: { host: "example.com" },
		ja4: "j",
		result: { status: CaptchaStatus.pending },
		userSubmitted: false,
		serverChecked: false,
		tolerance: 0.75,
		targets: [{ x: 10, y: 20, size: 30, kind: "star" }],
		providerSignature: "sig",
		...overrides,
	}) as unknown as IconOrderCaptchaRecord;

const markStoredOnce = (): {
	markStored: MarkStoredCallback;
	landed: Promise<Date>;
} => {
	let resolve: (ts: Date) => void = () => {};
	const landed = new Promise<Date>((r) => {
		resolve = r;
	});
	return {
		markStored: (ts) => {
			resolve(ts);
			return Promise.resolve();
		},
		landed,
	};
};

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

class TestProviderDatabase extends ProviderDatabase {
	protected override async setupRedis(): Promise<void> {
		// intentionally empty
	}
}

const centralIconOrderTable = (
	streamer: CentralDbStreamer,
): Model<IconOrderCaptchaRecord> =>
	(
		streamer as unknown as {
			db: { tables: { iconordercaptcha: Model<IconOrderCaptchaRecord> } };
		}
	).db.tables.iconordercaptcha;

describe("Interactive captcha records on the central DB", () => {
	let localMongo: MongoMemoryServer;
	let centralMongo: MongoMemoryServer;
	let provider: TestProviderDatabase;
	let streamer: CentralDbStreamer;

	beforeAll(async () => {
		localMongo = await MongoMemoryServer.create({
			instance: { launchTimeout: 60_000 },
		});
		centralMongo = await MongoMemoryServer.create({
			instance: { launchTimeout: 60_000 },
		});
		provider = new TestProviderDatabase({
			mongo: { url: localMongo.getUri(), dbname: "captchastorage" },
			logger,
		});
		await provider.connect();
		streamer = new CentralDbStreamer(centralMongo.getUri(), logger);
		await (
			streamer as unknown as { db: { connect: () => Promise<void> } }
		).db.connect();
		provider.setCentralDbStreamer(streamer);
	}, 120_000);

	afterAll(async () => {
		await provider.close();
		await (
			streamer as unknown as { db: { close: () => Promise<void> } }
		).db.close();
		await localMongo.stop();
		await centralMongo.stop();
	}, 30_000);

	it("keeps the graded result when an older snapshot lands after it", async () => {
		const challenge = "1___u1___dapp-A___stale-stream" as PoWChallengeId;
		const graded = iconOrderRecord(challenge, {
			lastUpdatedTimestamp: new Date("2026-11-09T02:18:55Z"),
			userSubmitted: true,
			result: { status: CaptchaStatus.approved },
			coords: [[[1, 2]]],
		});
		const beforeGrading = iconOrderRecord(challenge, {
			lastUpdatedTimestamp: new Date("2026-11-09T02:18:54Z"),
			userSubmitted: true,
		});

		const first = markStoredOnce();
		streamer.streamIconOrderRecord(graded, first.markStored);
		await first.landed;
		const second = markStoredOnce();
		streamer.streamIconOrderRecord(beforeGrading, second.markStored);
		await second.landed;

		const stored = await centralIconOrderTable(streamer)
			.findOne({ challenge })
			.lean<IconOrderCaptchaRecord>();
		expect(stored?.result.status).toBe(CaptchaStatus.approved);
		expect(stored?.coords).toEqual([[[1, 2]]]);
	});

	it("applies a newer snapshot over an older one", async () => {
		const challenge = "1___u1___dapp-A___newer-stream" as PoWChallengeId;
		const pending = markStoredOnce();
		streamer.streamIconOrderRecord(
			iconOrderRecord(challenge, {}),
			pending.markStored,
		);
		await pending.landed;
		const graded = markStoredOnce();
		streamer.streamIconOrderRecord(
			iconOrderRecord(challenge, {
				lastUpdatedTimestamp: new Date("2026-11-09T02:18:55Z"),
				userSubmitted: true,
				result: { status: CaptchaStatus.approved },
			}),
			graded.markStored,
		);
		await graded.landed;

		const stored = await centralIconOrderTable(streamer)
			.findOne({ challenge })
			.lean<IconOrderCaptchaRecord>();
		expect(stored?.result.status).toBe(CaptchaStatus.approved);
		expect(
			await centralIconOrderTable(streamer).countDocuments({ challenge }),
		).toBe(1);
	});

	it("does not let the sweep's batch write replace a newer central copy", async () => {
		const challenge = "1___u1___dapp-A___stale-sweep" as PoWChallengeId;
		const graded = markStoredOnce();
		streamer.streamIconOrderRecord(
			iconOrderRecord(challenge, {
				lastUpdatedTimestamp: new Date("2026-11-09T02:18:55Z"),
				result: { status: CaptchaStatus.approved },
			}),
			graded.markStored,
		);
		await graded.landed;

		const central = new CaptchaDatabase(
			centralMongo.getUri(),
			undefined,
			undefined,
			logger,
		);
		await central.saveCaptchas(
			[],
			[],
			[],
			[],
			[iconOrderRecord(challenge, {})],
		);

		const stored = await centralIconOrderTable(streamer)
			.findOne({ challenge })
			.lean<IconOrderCaptchaRecord>();
		expect(stored?.result.status).toBe(CaptchaStatus.approved);
	});

	it("clears pendingStage once the snapshot of an update has landed", async () => {
		const challenge = "1___u1___dapp-A___update-stored" as PoWChallengeId;
		const now = Date.now();
		await provider.getTables().iconordercaptcha.create({
			...iconOrderRecord(challenge, {
				requestedAtTimestamp: new Date(now - 1000),
				lastUpdatedTimestamp: new Date(now - 500),
			}),
			pendingStage: true,
		});
		await provider.updateIconOrderCaptchaRecord(challenge, {
			clicks: [{ x: 10, y: 20 }],
		});

		const local = await waitFor(
			() =>
				provider
					.getTables()
					.iconordercaptcha.findOne({ challenge })
					.lean<IconOrderCaptchaRecord>(),
			(doc) => doc?.pendingStage === undefined,
		);
		expect(local?.pendingStage).toBeUndefined();
		const stored = await centralIconOrderTable(streamer)
			.findOne({ challenge })
			.lean<IconOrderCaptchaRecord>();
		expect(stored?.clicks).toEqual([{ x: 10, y: 20 }]);
	});

	it("only sweeps pending records inserted inside the window, and marks them stored", async () => {
		const tables = provider.getTables();
		await tables.iconordercaptcha.createIndexes();
		const recent = "1___u1___dapp-A___sweep-recent" as PoWChallengeId;
		const old = "1___u1___dapp-A___sweep-old" as PoWChallengeId;
		const now = new Date();
		await tables.iconordercaptcha.create({
			...iconOrderRecord(old, { lastUpdatedTimestamp: now }),
			_id: Types.ObjectId.createFromTime(
				Math.floor((now.getTime() - 72 * 3600_000) / 1000),
			),
			pendingStage: true,
		});
		await tables.iconordercaptcha.create({
			...iconOrderRecord(recent, { lastUpdatedTimestamp: now }),
			pendingStage: true,
		});

		const since = new Date(now.getTime() - 48 * 3600_000);
		const swept = await provider.getUnstoredIconOrderCaptchaRecords(
			1000,
			undefined,
			since,
		);
		const sweptChallenges = swept.map((record) => record.challenge);
		expect(sweptChallenges).toContain(recent);
		expect(sweptChallenges).not.toContain(old);

		await provider.markInteractiveCaptchaRecordsStored(
			CaptchaType.iconOrder,
			[recent],
			new Date(now.getTime() + 1000),
		);
		const after = await tables.iconordercaptcha
			.findOne({ challenge: recent })
			.lean<IconOrderCaptchaRecord>();
		expect(after?.pendingStage).toBeUndefined();
	});
});
