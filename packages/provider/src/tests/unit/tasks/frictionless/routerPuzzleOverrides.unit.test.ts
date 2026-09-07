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
});
