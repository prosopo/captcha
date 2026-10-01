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

import {
	CaptchaType,
	FrictionlessPenalties,
	FrictionlessReason,
	type IFrictionlessTypes,
	type KeyringPair,
	type ProsopoConfigOutput,
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
import { PUZZLE_REFRESHES_BEFORE_IMAGE } from "../../../../tasks/captchaTypeSelection.js";
import { FrictionlessManager } from "../../../../tasks/frictionless/frictionlessTasks.js";
import type { RoutingContext } from "../../../../tasks/frictionless/routingMachine.js";

const SITE_KEY = "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV";

describe("a refreshed puzzle session", () => {
	let storeSessionRecord: ReturnType<typeof vi.fn>;

	const storedSession = (): Session => {
		const call = storeSessionRecord.mock.calls[0];
		if (!call) throw new Error("no session was stored");
		return call[0] as Session;
	};

	const managerFor = (
		refresh: Pick<Session, "refreshOf" | "refreshCount" | "refreshedAfterMs">,
		frictionlessTypes?: IFrictionlessTypes,
	): FrictionlessManager => {
		const db = { storeSessionRecord } as unknown as IProviderDatabase;
		const pair = {
			sign: vi.fn(),
			address: "testAddress",
		} as unknown as KeyringPair;
		const config = {
			penalties: FrictionlessPenalties.parse({}),
			captchas: { solved: { count: 2 }, unsolved: { count: 0 } },
			lRules: { en: 1 },
		} as unknown as ProsopoConfigOutput;
		const context: RoutingContext = {
			dappAccount: SITE_KEY,
			userAccount: "user",
			ip: "1.2.3.4",
			score: 0.9,
			platform: { isMobile: false, isApple: true, isWebView: false },
			raw: { headers: {}, userAgent: "ua" },
			imageMaxRounds: 8,
			...(frictionlessTypes && { frictionlessTypes }),
		};

		const manager = new FrictionlessManager(db, pair, config);
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
			...refresh,
		});
		manager.setRoutingContext(context);
		return manager;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		storeSessionRecord = vi.fn();
		applyRouterMock.mockResolvedValue({ captchaType: CaptchaType.puzzle });
	});

	it("records where the refresh came from", async () => {
		await managerFor({
			refreshOf: "prev",
			refreshCount: 1,
			refreshedAfterMs: 2500,
		}).sendPuzzleCaptcha();

		expect(storedSession()).toMatchObject({
			captchaType: CaptchaType.puzzle,
			refreshOf: "prev",
			refreshCount: 1,
			refreshedAfterMs: 2500,
		});
	});

	it("leaves an ordinary session without refresh fields", async () => {
		await managerFor({}).sendPuzzleCaptcha();

		expect(storedSession()).not.toHaveProperty("refreshOf");
		expect(storedSession()).not.toHaveProperty("refreshCount");
		expect(storedSession()).not.toHaveProperty("refreshedAfterMs");
	});

	it("serves image with its own reason at the refresh limit", async () => {
		await managerFor({
			refreshOf: "prev",
			refreshCount: PUZZLE_REFRESHES_BEFORE_IMAGE,
			refreshedAfterMs: 1000,
		}).sendPuzzleCaptcha();

		expect(storedSession().captchaType).toBe(CaptchaType.image);
		expect(storedSession().reason).toBe(
			FrictionlessReason.PUZZLE_REFRESH_LIMIT,
		);
		expect(storedSession().puzzle).toBeUndefined();
	});

	it("keeps a puzzle-only site on puzzle at the refresh limit", async () => {
		await managerFor(
			{
				refreshOf: "prev",
				refreshCount: PUZZLE_REFRESHES_BEFORE_IMAGE,
				refreshedAfterMs: 1000,
			},
			{ image: false, puzzle: true },
		).sendPuzzleCaptcha();

		expect(storedSession().captchaType).toBe(CaptchaType.puzzle);
		expect(storedSession().reason).not.toBe(
			FrictionlessReason.PUZZLE_REFRESH_LIMIT,
		);
	});
});
