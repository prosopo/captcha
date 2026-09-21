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

// A routing machine that inherits a trafficFilter `challenge` policy needs to
// reproduce it exactly, and those policies can carry puzzle tunables.
// `getPuzzleCaptchaChallenge` re-derives its overrides from a live
// trafficFilter verdict, which a router-chosen puzzle has no counterpart for —
// so the router's values are persisted on the session for that endpoint to
// read. These tests pin the persistence half.

import {
	CaptchaType,
	FrictionlessPenalties,
	FrictionlessReason,
	type KeyringPair,
	type ProsopoConfigOutput,
	type RoutingMachineOutput,
	type Session,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { applyRouterMock } = vi.hoisted(() => ({
	applyRouterMock: vi.fn(),
}));

vi.mock("../../../../tasks/frictionless/routingMachine.js", () => ({
	applyRouter: applyRouterMock,
}));

import { getCompositeIpAddress } from "../../../../compositeIpAddress.js";
import { FrictionlessManager } from "../../../../tasks/frictionless/frictionlessTasks.js";
import type { RoutingContext } from "../../../../tasks/frictionless/routingMachine.js";

const SITE_KEY = "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV";

describe("router-supplied puzzle overrides reach the session record", () => {
	let db: IProviderDatabase;
	let storeSessionRecord: ReturnType<typeof vi.fn>;
	let manager: FrictionlessManager;

	const context: RoutingContext = {
		dappAccount: SITE_KEY,
		userAccount: "user",
		ip: "1.2.3.4",
		score: 0.9,
		platform: { isMobile: false, isApple: true, isWebView: false },
		raw: { headers: {}, userAgent: "ua" },
		imageMaxRounds: 8,
	};

	const storedSession = (): Session => {
		const call = storeSessionRecord.mock.calls[0];
		if (!call) throw new Error("no session was stored");
		return call[0] as Session;
	};

	const routerReturns = (output: RoutingMachineOutput): void => {
		applyRouterMock.mockResolvedValue(output);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		storeSessionRecord = vi.fn();
		db = { storeSessionRecord } as unknown as IProviderDatabase;

		const pair = {
			sign: vi.fn(),
			address: "testAddress",
		} as unknown as KeyringPair;

		const config = {
			penalties: FrictionlessPenalties.parse({}),
			captchas: { solved: { count: 2 }, unsolved: { count: 0 } },
			lRules: { en: 1 },
		} as unknown as ProsopoConfigOutput;

		manager = new FrictionlessManager(db, pair, config);
		manager.setSessionParams({
			token: "tok",
			score: 0.9,
			threshold: 0.5,
			scoreComponents: { baseScore: 0.9 },
			ipAddress: getCompositeIpAddress("1.2.3.4"),
			siteKey: SITE_KEY,
			webView: false,
			iFrame: false,
			decryptedHeadHash: "",
		});
		manager.setRoutingContext(context);
	});

	it("persists puzzleTolerance and puzzle settings on a puzzle session", async () => {
		routerReturns({
			captchaType: CaptchaType.puzzle,
			puzzleTolerance: 5,
			puzzle: { decoyCount: 12, pieceScale: { min: 0.2, max: 0.4 } },
		});

		await manager.sendPuzzleCaptcha();

		expect(storedSession().puzzleTolerance).toBe(5);
		expect(storedSession().puzzle).toEqual({
			decoyCount: 12,
			pieceScale: { min: 0.2, max: 0.4 },
		});
	});

	it("persists a partial override without inventing the other fields", async () => {
		routerReturns({
			captchaType: CaptchaType.puzzle,
			puzzle: { decoyCount: 30 },
		});

		await manager.sendPuzzleCaptcha();

		expect(storedSession().puzzle).toEqual({ decoyCount: 30 });
		expect(storedSession().puzzleTolerance).toBeUndefined();
	});

	it("persists tolerance alone when no render settings were named", async () => {
		routerReturns({ captchaType: CaptchaType.puzzle, puzzleTolerance: 8 });

		await manager.sendPuzzleCaptcha();

		expect(storedSession().puzzleTolerance).toBe(8);
		expect(storedSession().puzzle).toBeUndefined();
	});

	it("leaves both undefined when the router named neither", async () => {
		routerReturns({ captchaType: CaptchaType.puzzle });

		await manager.sendPuzzleCaptcha();

		expect(storedSession().puzzleTolerance).toBeUndefined();
		expect(storedSession().puzzle).toBeUndefined();
	});

	// A router can pick a non-puzzle type, and downgradePuzzleIfUnavailable can
	// turn a puzzle into something else. Neither session should carry stale
	// render settings the endpoint would never read.
	it("drops the overrides when the router chose an image", async () => {
		routerReturns({
			captchaType: CaptchaType.image,
			solvedImagesCount: 2,
			puzzleTolerance: 5,
			puzzle: { decoyCount: 12 },
		});

		await manager.sendPuzzleCaptcha();

		expect(storedSession().captchaType).toBe(CaptchaType.image);
		expect(storedSession().puzzleTolerance).toBeUndefined();
		expect(storedSession().puzzle).toBeUndefined();
	});

	it("drops the overrides when the router chose pow", async () => {
		routerReturns({
			captchaType: CaptchaType.pow,
			puzzleTolerance: 5,
			puzzle: { decoyCount: 12 },
		});

		await manager.sendPuzzleCaptcha();

		expect(storedSession().captchaType).toBe(CaptchaType.pow);
		expect(storedSession().puzzleTolerance).toBeUndefined();
		expect(storedSession().puzzle).toBeUndefined();
	});

	// The difficulty ladder reads the requested round count as severity. The
	// no-measurement paths carry a fixed fallback count that happens to sit
	// above `captchas.solved.count`, so before NO_MEASUREMENT_REASONS they
	// scored as an escalation and the sampled band replaced the site's own
	// puzzle config. A site whose CSP blocks the detector bundle sends no
	// token on every request, so every one of its users was permanently
	// escalated and its configured puzzle never rendered.
	describe.each([
		FrictionlessReason.MISSING_TOKEN,
		FrictionlessReason.MISSING_HEAD_HASH,
		FrictionlessReason.DECRYPTION_FAILED,
	])("no-measurement reason %s", (reason: FrictionlessReason) => {
		it("leaves the session bare so the site's own puzzle settings render", async () => {
			routerReturns({ captchaType: CaptchaType.puzzle });

			// MISSING_TOKEN_IMAGE_ROUNDS is 3 against a baseline of 2 — one
			// rung above, which is exactly what used to trip level 1.
			await manager.sendPuzzleCaptcha({ solvedImagesCount: 3, reason });

			expect(storedSession().reason).toBe(reason);
			expect(storedSession().puzzle).toBeUndefined();
			expect(storedSession().puzzleTolerance).toBeUndefined();
		});

		it("still honours an explicit router override", async () => {
			routerReturns({
				captchaType: CaptchaType.puzzle,
				puzzleTolerance: 9,
				puzzle: { decoyCount: 14 },
			});

			await manager.sendPuzzleCaptcha({ solvedImagesCount: 3, reason });

			expect(storedSession().puzzleTolerance).toBe(9);
			expect(storedSession().puzzle).toEqual({ decoyCount: 14 });
		});
	});

	// The guard is scoped to reasons that measured nothing. A genuine
	// escalation must still get its graduated puzzle.
	it("still escalates when the round count came from a real signal", async () => {
		routerReturns({ captchaType: CaptchaType.puzzle });

		await manager.sendPuzzleCaptcha({
			solvedImagesCount: 3,
			reason: FrictionlessReason.BOT_SCORE_PUZZLE_BAND,
		});

		expect(storedSession().puzzle).toBeDefined();
		expect(storedSession().puzzleTolerance).toBeDefined();
	});

	// OLD_TIMESTAMP sizes itself from timestampDecayFunction, which scales
	// with staleness — a real graduated measurement, so it keeps the ladder.
	it("still escalates on an old timestamp", async () => {
		routerReturns({ captchaType: CaptchaType.puzzle });

		await manager.sendPuzzleCaptcha({
			solvedImagesCount: 3,
			reason: FrictionlessReason.OLD_TIMESTAMP,
		});

		expect(storedSession().puzzle).toBeDefined();
	});

	// The site's own ceiling on escalation — the puzzle counterpart to
	// imageMaxRounds. A site that configured an easier puzzle and set the cap
	// to 0 must get exactly that, no matter how severe the session looked.
	describe("puzzleMaxDifficulty", () => {
		const withCap = (puzzleMaxDifficulty: number): void => {
			manager.setRoutingContext({ ...context, puzzleMaxDifficulty });
		};

		it("pins the session to the site's own settings at 0", async () => {
			withCap(0);
			routerReturns({ captchaType: CaptchaType.puzzle });

			// Six rounds above the baseline of 2 — level 3 without the cap.
			await manager.sendPuzzleCaptcha({
				solvedImagesCount: 8,
				reason: FrictionlessReason.BOT_SCORE_PUZZLE_BAND,
			});

			expect(storedSession().puzzle).toBeUndefined();
			expect(storedSession().puzzleTolerance).toBeUndefined();
		});

		it("still allows escalation below the cap", async () => {
			withCap(2);
			routerReturns({ captchaType: CaptchaType.puzzle });

			await manager.sendPuzzleCaptcha({
				solvedImagesCount: 4,
				reason: FrictionlessReason.BOT_SCORE_PUZZLE_BAND,
			});

			expect(storedSession().puzzle).toBeDefined();
		});

		// A cap of 0 bounds the ladder, not the operator. An explicitly routed
		// override is a deliberate instruction and still applies.
		it("does not suppress an explicit router override", async () => {
			withCap(0);
			routerReturns({
				captchaType: CaptchaType.puzzle,
				puzzleTolerance: 7,
				puzzle: { decoyCount: 20 },
			});

			await manager.sendPuzzleCaptcha({
				solvedImagesCount: 8,
				reason: FrictionlessReason.BOT_SCORE_PUZZLE_BAND,
			});

			expect(storedSession().puzzleTolerance).toBe(7);
			expect(storedSession().puzzle).toEqual({ decoyCount: 20 });
		});

		// Sites saved before the setting existed carry no value, and must keep
		// the escalation behaviour they had.
		it("falls back to the default ceiling when the site never set one", async () => {
			manager.setRoutingContext(context);
			routerReturns({ captchaType: CaptchaType.puzzle });

			await manager.sendPuzzleCaptcha({
				solvedImagesCount: 4,
				reason: FrictionlessReason.BOT_SCORE_PUZZLE_BAND,
			});

			expect(storedSession().puzzle).toBeDefined();
		});
	});
});
