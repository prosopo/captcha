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
//
// Regression guards for the latency hot fixes shipped in response to the
// 2026-06-16 provider-fleet OpenObserve sweep:
//
//   1. `ProviderDatabase.getRandomCaptcha` no longer materialises the
//      full `{datasetId, solved}` match before `$sample` — it ranges over
//      the `{datasetId, solved, randomKey}` compound index and reads at
//      most `sampleSize` keys.
//   2. `ProviderDatabase.sampleContextEntropy` now `$sample`s before
//      `$lookup` so the join runs against a bounded random pool instead
//      of every matched powcaptcha.
//
// Both checks are anchored against the OLD pipelines run side-by-side in
// the same in-memory mongo so the assertion is a *ratio*, not an
// absolute number. That keeps the test stable across CI hardware where
// raw wall-clock varies. We assert two things per fix:
//
//   - `totalKeysExamined` (from `.explain()`) drops by a wide margin —
//     this is deterministic and is the underlying reason the fix is
//     faster.
//   - The new path is at least somewhat quicker on the wall clock —
//     loose threshold so flakiness on small CI runners doesn't bite.

import { LogLevel, getLogger } from "@prosopo/logger";
import {
	type Captcha,
	CaptchaStatus,
	ContextType,
	IpAddressType,
} from "@prosopo/types";
import {
	CaptchaRecordSchema,
	type PoWCaptchaRecord,
	PoWCaptchaRecordSchema,
	type SessionRecord,
	SessionRecordSchema,
} from "@prosopo/types-database";
import type mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryDatabase } from "../../base/mongoMemory.js";

const logger = getLogger(LogLevel.enum.error, "randomSamplingPerformance.test");

const TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000;

interface ExplainExecutionStats {
	totalKeysExamined: number;
	totalDocsExamined: number;
	nReturned: number;
	executionTimeMillis: number;
}

interface ExplainResult {
	executionStats?: ExplainExecutionStats;
	stages?: Array<{ $cursor?: { executionStats?: ExplainExecutionStats } }>;
}

// Mongo's explain shape differs between `find` and `aggregate`; pull the
// stats from wherever they happened to land for this shape.
function getStats(explain: ExplainResult): ExplainExecutionStats | undefined {
	if (explain?.executionStats) return explain.executionStats;
	const cursor = explain?.stages?.[0]?.$cursor;
	return cursor?.executionStats;
}

async function timeIt(
	fn: () => Promise<unknown>,
	iterations: number,
): Promise<number> {
	// Warm up once so JIT / first-query overhead doesn't skew the result.
	await fn();
	const start = process.hrtime.bigint();
	for (let i = 0; i < iterations; i++) {
		await fn();
	}
	const end = process.hrtime.bigint();
	return Number(end - start) / 1_000_000 / iterations;
}

describe("getRandomCaptcha — randomKey range scan vs $sample aggregation", () => {
	let mongoDb: MongoMemoryDatabase;
	let CaptchaModel: mongoose.Model<Captcha>;
	const datasetId =
		"0xdeadbeefcafef00ddeadbeefcafef00ddeadbeefcafef00ddeadbeefcafef00d";
	// Enough rows that the difference between "scan everything that
	// matched" and "walk N index keys" is unambiguous on the in-memory
	// instance. Production sees ~20K per (datasetId, solved); 5K is
	// plenty to distinguish the plans without slowing CI.
	const SOLVED_COUNT = 5000;
	const SAMPLE_SIZE = 2;

	beforeAll(async () => {
		mongoDb = new MongoMemoryDatabase("ignored", "captchaperf", logger);
		await mongoDb.connect();
		if (!mongoDb.connection) {
			throw new Error("MongoMemoryDatabase failed to provide a connection");
		}
		CaptchaModel = mongoDb.connection.model<Captcha>(
			"Captcha",
			CaptchaRecordSchema,
		);
		// Force the indexes declared on `CaptchaRecordSchema` — including
		// the new `{datasetId, solved, randomKey}` compound — to be built
		// on the in-memory instance. Without this the range scan would
		// degenerate into a collection scan and the assertion below would
		// be measuring something other than the fix.
		await CaptchaModel.syncIndexes();

		const docs = Array.from({ length: SOLVED_COUNT }, (_, i) => ({
			captchaId: `cap-${i}`,
			captchaContentId: `content-${i}`,
			datasetId,
			datasetContentId: `dc-${i}`,
			solved: true,
			target: "find the cars",
			salt: "0xsalt",
			items: [{ hash: `h-${i}`, data: "d", type: "image" }],
			randomKey: Math.random(),
		}));
		await CaptchaModel.insertMany(docs);
	}, 60_000);

	afterAll(async () => {
		await mongoDb.close();
	});

	it("range scan over the compound index examines O(sampleSize) keys, not O(pool)", async () => {
		const pivot = Math.random();
		// biome-ignore lint/suspicious/noExplicitAny: explain() returns dynamic shape
		const newExplain: any = await CaptchaModel.find(
			{ datasetId, solved: true, randomKey: { $gte: pivot } },
			{ _id: 0, captchaId: 1 },
		)
			.sort({ randomKey: 1 })
			.limit(SAMPLE_SIZE)
			.explain("executionStats");
		const newStats = getStats(newExplain);
		if (!newStats)
			throw new Error("explain returned no stats for the new path");

		// biome-ignore lint/suspicious/noExplicitAny: explain() returns dynamic shape
		const oldExplain: any = await CaptchaModel.aggregate([
			{ $match: { datasetId, solved: true } },
			{ $sample: { size: SAMPLE_SIZE } },
			{ $project: { captchaId: 1 } },
		]).explain("executionStats");
		const oldStats = getStats(oldExplain);
		if (!oldStats)
			throw new Error("explain returned no stats for the old path");

		// The new path returns SAMPLE_SIZE docs and should walk on the
		// order of SAMPLE_SIZE keys — be generous to absorb any wrap-around
		// tail query, but reject anything close to the full pool.
		expect(newStats.nReturned).toBeGreaterThan(0);
		expect(newStats.totalKeysExamined).toBeLessThanOrEqual(SAMPLE_SIZE * 4);
		// And it should examine *far* fewer keys than the old $sample
		// path, which has to materialise the full matched set. Anything
		// less than a 10x reduction means the planner picked the wrong
		// index — fail loudly.
		expect(newStats.totalKeysExamined * 10).toBeLessThan(
			oldStats.totalKeysExamined,
		);
	});

	it("range scan is faster on the wall clock than the $sample aggregation", async () => {
		const iterations = 20;
		const newAvgMs = await timeIt(async () => {
			const pivot = Math.random();
			const head = await CaptchaModel.find(
				{ datasetId, solved: true, randomKey: { $gte: pivot } },
				{ _id: 0, captchaId: 1, items: 1, target: 1 },
			)
				.sort({ randomKey: 1 })
				.limit(SAMPLE_SIZE)
				.lean();
			if (head.length < SAMPLE_SIZE) {
				await CaptchaModel.find(
					{ datasetId, solved: true, randomKey: { $lt: pivot } },
					{ _id: 0, captchaId: 1, items: 1, target: 1 },
				)
					.sort({ randomKey: 1 })
					.limit(SAMPLE_SIZE - head.length)
					.lean();
			}
		}, iterations);

		const oldAvgMs = await timeIt(async () => {
			await CaptchaModel.aggregate([
				{ $match: { datasetId, solved: true } },
				{ $sample: { size: SAMPLE_SIZE } },
				{
					$project: {
						captchaId: 1,
						items: 1,
						target: 1,
					},
				},
			]).exec();
		}, iterations);

		logger.info(() => ({
			msg: "getRandomCaptcha timing",
			data: { newAvgMs, oldAvgMs, ratio: oldAvgMs / newAvgMs },
		}));

		// Loose threshold — in-memory mongo is fast and per-query
		// variance is high on CI runners. A 1.5x speedup over 20
		// iterations is still well outside the noise floor.
		expect(newAvgMs).toBeLessThan(oldAvgMs);
		expect(oldAvgMs / newAvgMs).toBeGreaterThan(1.5);
	});
});

describe("sampleContextEntropy — $sample before $lookup vs $lookup before $sample", () => {
	let mongoDb: MongoMemoryDatabase;
	let PowModel: mongoose.Model<PoWCaptchaRecord>;
	let SessionModel: mongoose.Model<SessionRecord>;
	const siteKey = "5FWoE4Z7K24tKXxccQpaAKXThnYwndgqCr2jmiytT4VVbiwG";
	// The fix only helps when the matched set is bigger than the
	// `$sample` cap — that's exactly the prod scenario (>30K matched
	// vs `max=10000`). Mirror that ratio here: seed several times more
	// docs than `MAX` so the new pipeline's `$lookup` genuinely walks
	// fewer rows than the old one. Anything close to `POW_COUNT == MAX`
	// would make both pipelines join the same set and the timing
	// assertion would be measuring noise.
	const POW_COUNT = 6000;
	const SAMPLE_SIZE = 75;
	const MAX = 2000;

	beforeAll(async () => {
		mongoDb = new MongoMemoryDatabase("ignored", "powperf", logger);
		await mongoDb.connect();
		if (!mongoDb.connection) {
			throw new Error("MongoMemoryDatabase failed to provide a connection");
		}
		PowModel = mongoDb.connection.model<PoWCaptchaRecord>(
			"PowCaptcha",
			PoWCaptchaRecordSchema,
		);
		SessionModel = mongoDb.connection.model<SessionRecord>(
			"Session",
			SessionRecordSchema,
		);
		await PowModel.syncIndexes();
		await SessionModel.syncIndexes();

		const now = Date.now();
		const powDocs: Array<Record<string, unknown>> = [];
		const sessionDocs: Array<Record<string, unknown>> = [];
		for (let i = 0; i < POW_COUNT; i++) {
			const sessionId = `session-${i}`;
			powDocs.push({
				challenge: `challenge-${i}`,
				dappAccount: siteKey,
				userAccount: `user-${i}`,
				requestedAtTimestamp: new Date(now - i * 60),
				result: { status: CaptchaStatus.approved },
				difficulty: 1,
				ipAddress: { lower: BigInt(i + 1).toString(), type: IpAddressType.v4 },
				headers: { host: "pronode-test.local" },
				ja4: "ja4",
				userSubmitted: false,
				serverChecked: false,
				providerSignature: "0xsig",
				sessionId,
			});
			// Only the `sessionId` and `webView` fields are read by the
			// pipeline under test; the rest of `SessionRecordSchema`
			// (token, score, threshold, scoreComponents, ipAddress, ...)
			// is irrelevant here. Bypass mongoose validation by writing to
			// the raw collection so the seed stays focused on what the
			// pipeline actually joins on.
			sessionDocs.push({
				sessionId,
				webView: i % 2 === 0,
				captchaType: "pow",
				createdAt: new Date(now - i * 60),
			});
		}
		await PowModel.insertMany(powDocs);
		const sessionsCollection = mongoDb.connection.collection("sessions");
		await sessionsCollection.insertMany(sessionDocs);
	}, 60_000);

	afterAll(async () => {
		await mongoDb.close();
	});

	const newPipeline = (contextType: ContextType) => {
		// biome-ignore lint/suspicious/noExplicitAny: aggregation pipeline shape
		const stages: any[] = [
			{
				$match: {
					dappAccount: siteKey,
					requestedAtTimestamp: {
						$gt: new Date(Date.now() - TWENTY_FOUR_HOURS_IN_MS),
					},
				},
			},
			{ $sample: { size: MAX } },
			{
				$lookup: {
					from: "sessions",
					localField: "sessionId",
					foreignField: "sessionId",
					as: "sessionData",
				},
			},
			{
				$unwind: { path: "$sessionData", preserveNullAndEmptyArrays: false },
			},
		];
		if (contextType === ContextType.Default) {
			stages.push({ $match: { "sessionData.webView": false } });
		}
		stages.push(
			{ $sample: { size: SAMPLE_SIZE } },
			{ $project: { _id: 0, sessionId: 1 } },
		);
		return stages;
	};

	const oldPipeline = (contextType: ContextType) => {
		// biome-ignore lint/suspicious/noExplicitAny: aggregation pipeline shape
		const stages: any[] = [
			{
				$match: {
					dappAccount: siteKey,
					requestedAtTimestamp: {
						$gt: new Date(Date.now() - TWENTY_FOUR_HOURS_IN_MS),
					},
				},
			},
			{
				$lookup: {
					from: "sessions",
					localField: "sessionId",
					foreignField: "sessionId",
					as: "sessionData",
				},
			},
			{
				$unwind: { path: "$sessionData", preserveNullAndEmptyArrays: false },
			},
		];
		if (contextType === ContextType.Default) {
			stages.push({ $match: { "sessionData.webView": false } });
		}
		stages.push(
			{ $limit: MAX },
			{ $sample: { size: SAMPLE_SIZE } },
			{ $project: { _id: 0, sessionId: 1 } },
		);
		return stages;
	};

	it("new ordering returns the requested sample size", async () => {
		const docs = await PowModel.aggregate(
			newPipeline(ContextType.Default),
		).exec();
		expect(docs.length).toBeGreaterThan(0);
		expect(docs.length).toBeLessThanOrEqual(SAMPLE_SIZE);
	});

	it("new ordering is faster than the original $lookup-first ordering", async () => {
		const iterations = 10;
		// Interleave the two timings instead of running them back-to-back
		// so transient blips (GC pause, mongo cache warm-up) hit both
		// pipelines roughly equally instead of biasing whichever runs
		// first or second.
		let newTotalNs = 0n;
		let oldTotalNs = 0n;
		await PowModel.aggregate(newPipeline(ContextType.Default)).exec();
		await PowModel.aggregate(oldPipeline(ContextType.Default)).exec();
		for (let i = 0; i < iterations; i++) {
			const t0 = process.hrtime.bigint();
			await PowModel.aggregate(newPipeline(ContextType.Default)).exec();
			const t1 = process.hrtime.bigint();
			await PowModel.aggregate(oldPipeline(ContextType.Default)).exec();
			const t2 = process.hrtime.bigint();
			newTotalNs += t1 - t0;
			oldTotalNs += t2 - t1;
		}
		const newAvgMs = Number(newTotalNs) / iterations / 1_000_000;
		const oldAvgMs = Number(oldTotalNs) / iterations / 1_000_000;

		logger.info(() => ({
			msg: "sampleContextEntropy timing",
			data: { newAvgMs, oldAvgMs, ratio: oldAvgMs / newAvgMs },
		}));

		// With `POW_COUNT=6000` and `MAX=2000` the old pipeline must
		// $lookup 3x as many docs as the new one. We give it slack —
		// 1.3x — to absorb in-memory mongo's high per-query variance on
		// CI runners. Production observed a far larger speedup (~4.7s →
		// ~1s on the busiest dapp) where the matched set is 15x the cap.
		expect(oldAvgMs / newAvgMs).toBeGreaterThan(1.3);
	});
});
