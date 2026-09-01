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

// Every path that sizes an image challenge clamps into the sitekey's
// `[imageMinRounds, imageMaxRounds]`. A routing machine's `solvedImagesCount`
// was the exception: `sendCaptcha` took it verbatim, and the routing-machine
// output schema only bounds it as a positive integer. A router could
// therefore hand a user more — or fewer — rounds than the site configured.

import {
	CaptchaType,
	FrictionlessPenalties,
	type KeyringPair,
	type ProsopoConfigOutput,
	type RoutingMachineOutput,
	type Session,
	imageMaxRoundsDefault,
	imageMinRoundsDefault,
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

describe("router-supplied image rounds are held to the sitekey's bounds", () => {
	let db: IProviderDatabase;
	let storeSessionRecord: ReturnType<typeof vi.fn>;
	let manager: FrictionlessManager;

	const buildContext = (
		imageMaxRounds?: number,
		imageMinRounds?: number,
	): RoutingContext => ({
		dappAccount: SITE_KEY,
		userAccount: "user",
		ip: "1.2.3.4",
		score: 0.9,
		platform: { isMobile: false, isApple: false, isWebView: false },
		raw: { headers: {}, userAgent: "ua" },
		...(imageMaxRounds !== undefined && { imageMaxRounds }),
		...(imageMinRounds !== undefined && { imageMinRounds }),
	});

	const storedSession = (): Session => {
		const call = storeSessionRecord.mock.calls[0];
		if (!call) throw new Error("no session was stored");
		return call[0] as Session;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		storeSessionRecord = vi.fn();
		db = {
			storeSessionRecord,
		} as unknown as IProviderDatabase;

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
	});

	const routerReturns = (output: RoutingMachineOutput): void => {
		applyRouterMock.mockResolvedValue(output);
	};

	it("clamps a router asking for more rounds than the sitekey allows", async () => {
		routerReturns({
			captchaType: CaptchaType.image,
			solvedImagesCount: 50,
		});
		manager.setRoutingContext(buildContext(8));

		await manager.sendImageCaptcha({ solvedImagesCount: 4 });

		expect(storedSession().solvedImagesCount).toBe(8);
	});

	it("leaves a router within the ceiling untouched", async () => {
		routerReturns({
			captchaType: CaptchaType.image,
			solvedImagesCount: 3,
		});
		manager.setRoutingContext(buildContext(8));

		await manager.sendImageCaptcha({ solvedImagesCount: 4 });

		expect(storedSession().solvedImagesCount).toBe(3);
	});

	it("clamps a puzzle downgraded to image by the router", async () => {
		// The puzzle band hands `sendPuzzleCaptcha` a round count purely so a
		// downgrade is sized sensibly. If a router turns that puzzle into an
		// image and names its own count, the ceiling still applies.
		routerReturns({
			captchaType: CaptchaType.image,
			solvedImagesCount: 99,
		});
		manager.setRoutingContext(buildContext(6));

		await manager.sendPuzzleCaptcha({ solvedImagesCount: 5 });

		expect(storedSession().captchaType).toBe(CaptchaType.image);
		expect(storedSession().solvedImagesCount).toBe(6);
	});

	it("falls back to the caller's already-clamped count when the router names none", async () => {
		routerReturns({ captchaType: CaptchaType.image });
		manager.setRoutingContext(buildContext(8));

		await manager.sendImageCaptcha({ solvedImagesCount: 4 });

		expect(storedSession().solvedImagesCount).toBe(4);
	});

	it("falls back to the schema default ceiling when the context carries none", async () => {
		// The absence must not be read as a ceiling of 0, but nor may it mean
		// "unbounded": the router's output schema only constrains
		// solvedImagesCount to a positive int, so skipping the clamp let a
		// router mint a session demanding arbitrarily many rounds. Every image
		// path is now bounded, falling back to imageMaxRoundsDefault when the
		// sitekey's own ceiling did not reach this far.
		routerReturns({
			captchaType: CaptchaType.image,
			solvedImagesCount: 50,
		});
		manager.setRoutingContext(buildContext(undefined));

		await manager.sendImageCaptcha({ solvedImagesCount: 4 });

		expect(storedSession().solvedImagesCount).toBe(imageMaxRoundsDefault);
	});

	it("lifts a router asking for fewer rounds than the sitekey's floor", async () => {
		routerReturns({
			captchaType: CaptchaType.image,
			solvedImagesCount: 1,
		});
		manager.setRoutingContext(buildContext(8, 4));

		await manager.sendImageCaptcha({ solvedImagesCount: 4 });

		expect(storedSession().solvedImagesCount).toBe(4);
	});

	it("falls back to the schema default floor when the context carries none", async () => {
		// A router naming a single round is the case the floor exists for:
		// the sitekey's settings bound its rules in both directions, and an
		// unset floor means the historical hard-coded 2, not "unbounded".
		routerReturns({
			captchaType: CaptchaType.image,
			solvedImagesCount: 1,
		});
		manager.setRoutingContext(buildContext(8));

		await manager.sendImageCaptcha({ solvedImagesCount: 4 });

		expect(storedSession().solvedImagesCount).toBe(imageMinRoundsDefault);
	});

	it("does not put a round count on a session that stayed a puzzle", async () => {
		routerReturns({ captchaType: CaptchaType.puzzle });
		manager.setRoutingContext(buildContext(8));

		await manager.sendPuzzleCaptcha({ solvedImagesCount: 5 });

		expect(storedSession().solvedImagesCount).toBeUndefined();
	});
});
