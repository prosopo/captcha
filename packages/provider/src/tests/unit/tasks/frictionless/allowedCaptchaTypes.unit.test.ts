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
	type KeyringPair,
	type ProsopoConfigOutput,
	type RoutingMachineOutput,
	type Session,
	resolveAllowedCaptchaTypes,
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

const PUZZLE_SWITCHED_OFF = resolveAllowedCaptchaTypes({
	captchaTypeFeatureFlags: { puzzle: false },
});

describe("FrictionlessManager allowed captcha types", () => {
	let storeSessionRecord: ReturnType<typeof vi.fn>;

	const storedCaptchaType = (): CaptchaType => {
		const call = storeSessionRecord.mock.calls[0];
		if (!call) throw new Error("no session was stored");
		return (call[0] as Session).captchaType;
	};

	const buildManager = (): FrictionlessManager => {
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
		const manager = new FrictionlessManager(db, pair, config);
		manager.setSessionParams({
			token: "tok",
			score: 0,
			threshold: 0.5,
			scoreComponents: { baseScore: 0 },
			ipAddress: getCompositeIpAddress("1.2.3.4"),
			siteKey: SITE_KEY,
			webView: false,
			iFrame: false,
			decryptedHeadHash: "",
		});
		return manager;
	};

	const routingContext: RoutingContext = {
		dappAccount: SITE_KEY,
		userAccount: "user",
		ip: "1.2.3.4",
		score: 0.6,
		platform: { isMobile: false, isApple: false, isWebView: false },
		raw: { headers: {}, userAgent: "ua" },
	};

	beforeEach(() => {
		vi.clearAllMocks();
		storeSessionRecord = vi.fn();
	});

	it("serves image instead of puzzle on a puzzle-pinned site with puzzle switched off", async () => {
		const manager = buildManager();
		manager.setAllowedCaptchaTypes(PUZZLE_SWITCHED_OFF);

		const response = await manager.sendPuzzleCaptcha();

		expect(applyRouterMock).not.toHaveBeenCalled();
		expect(storedCaptchaType()).toBe(CaptchaType.image);
		expect(response.captchaType).toBe(CaptchaType.image);
	});

	it("overrides a routing machine that picks puzzle", async () => {
		const routed: RoutingMachineOutput = { captchaType: CaptchaType.puzzle };
		applyRouterMock.mockResolvedValue(routed);
		const manager = buildManager();
		manager.setRoutingContext(routingContext);
		manager.setAllowedCaptchaTypes(PUZZLE_SWITCHED_OFF);

		await manager.sendPowCaptcha();

		expect(applyRouterMock).toHaveBeenCalled();
		expect(storedCaptchaType()).toBe(CaptchaType.image);
	});

	it("falls back to pow when image is also unavailable", async () => {
		const manager = buildManager();
		manager.setAllowedCaptchaTypes(
			resolveAllowedCaptchaTypes({
				frictionlessTypes: { image: false, puzzle: true },
				captchaTypeFeatureFlags: { puzzle: false },
			}),
		);

		await manager.sendPuzzleCaptcha();

		expect(storedCaptchaType()).toBe(CaptchaType.pow);
	});

	it("serves puzzle when nothing has switched it off", async () => {
		const manager = buildManager();
		manager.setAllowedCaptchaTypes(resolveAllowedCaptchaTypes({}));

		await manager.sendPuzzleCaptcha();

		expect(storedCaptchaType()).toBe(CaptchaType.puzzle);
	});

	describe("icon-order", () => {
		it("serves puzzle on an icon-order-pinned site without the flag", async () => {
			const manager = buildManager();
			manager.setAllowedCaptchaTypes(resolveAllowedCaptchaTypes({}));

			await manager.sendIconOrderCaptcha();

			expect(storedCaptchaType()).toBe(CaptchaType.puzzle);
		});

		it("overrides a routing machine that picks icon-order on a site without the flag", async () => {
			const routed: RoutingMachineOutput = {
				captchaType: CaptchaType.iconOrder,
			};
			applyRouterMock.mockResolvedValue(routed);
			const manager = buildManager();
			manager.setRoutingContext(routingContext);
			manager.setAllowedCaptchaTypes(
				resolveAllowedCaptchaTypes({
					frictionlessTypes: { image: true, puzzle: true, iconOrder: true },
				}),
			);

			await manager.sendPowCaptcha();

			expect(storedCaptchaType()).toBe(CaptchaType.puzzle);
		});

		it("serves icon-order once Prosopo turns the flag on", async () => {
			const manager = buildManager();
			manager.setAllowedCaptchaTypes(
				resolveAllowedCaptchaTypes({
					captchaTypeFeatureFlags: { iconOrder: true },
				}),
			);

			await manager.sendIconOrderCaptcha();

			expect(storedCaptchaType()).toBe(CaptchaType.iconOrder);
		});
	});
});
