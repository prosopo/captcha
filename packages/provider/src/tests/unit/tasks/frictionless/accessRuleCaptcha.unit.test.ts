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
import {
	FrictionlessManager,
	FrictionlessReason,
} from "../../../../tasks/frictionless/frictionlessTasks.js";
import type { RoutingContext } from "../../../../tasks/frictionless/routingMachine.js";

const SITE_KEY = "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV";

describe("FrictionlessManager.sendAccessRuleCaptcha", () => {
	let storeSessionRecord: ReturnType<typeof vi.fn>;

	const storedSession = (): Session => {
		const call = storeSessionRecord.mock.calls[0];
		if (!call) throw new Error("no session was stored");
		return call[0] as Session;
	};

	const routingContext: RoutingContext = {
		dappAccount: SITE_KEY,
		userAccount: "user",
		ip: "1.2.3.4",
		score: 0.6,
		platform: { isMobile: false, isApple: false, isWebView: false },
		raw: { headers: {}, userAgent: "ua" },
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
		manager.setRoutingContext(routingContext);
		return manager;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		storeSessionRecord = vi.fn();
		const routed: RoutingMachineOutput = {
			captchaType: CaptchaType.puzzle,
			reason: "ROUTED",
		};
		applyRouterMock.mockResolvedValue(routed);
	});

	it("serves the rule's type without asking the routing machine", async () => {
		const manager = buildManager();

		const response = await manager.sendAccessRuleCaptcha(CaptchaType.image, {
			solvedImagesCount: 2,
			reason: FrictionlessReason.USER_ACCESS_POLICY,
		});

		expect(applyRouterMock).not.toHaveBeenCalled();
		expect(response.captchaType).toBe(CaptchaType.image);
		expect(storedSession()).toMatchObject({
			captchaType: CaptchaType.image,
			solvedImagesCount: 2,
			reason: FrictionlessReason.USER_ACCESS_POLICY,
		});
	});

	it("leaves routing in place for captchas no rule named", async () => {
		const manager = buildManager();

		await manager.sendImageCaptcha();

		expect(applyRouterMock).toHaveBeenCalled();
		expect(storedSession().captchaType).toBe(CaptchaType.puzzle);
	});

	it("still serves an enabled type when the rule names one the site has switched off", async () => {
		const manager = buildManager();
		manager.setAllowedCaptchaTypes(
			resolveAllowedCaptchaTypes({
				captchaTypeFeatureFlags: { puzzle: false },
			}),
		);

		await manager.sendAccessRuleCaptcha(CaptchaType.puzzle);

		expect(storedSession().captchaType).toBe(CaptchaType.image);
	});
});
