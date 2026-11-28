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
	type Session,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCompositeIpAddress } from "../../../../compositeIpAddress.js";
import {
	FrictionlessManager,
	FrictionlessReason,
} from "../../../../tasks/frictionless/frictionlessTasks.js";
import { mergeShadowRules } from "../../../../tasks/shadowRules.js";

const SITE_KEY = "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV";

describe("FrictionlessManager.addShadowRule", () => {
	let storeSessionRecord: ReturnType<typeof vi.fn>;

	const storedSession = (): Session => {
		const call = storeSessionRecord.mock.calls[0];
		if (!call) throw new Error("no session was stored");
		return call[0] as Session;
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
		const manager = new FrictionlessManager({ db, pair, config });
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

	beforeEach(() => {
		storeSessionRecord = vi.fn();
	});

	it("saves shadow matches on the session it mints", async () => {
		const manager = buildManager();
		manager.addShadowRule(FrictionlessReason.PROTECT_CHALLENGE_REFERER);

		await manager.sendAccessRuleCaptcha(CaptchaType.pow, {});

		expect(storedSession().shadowRules).toEqual([
			FrictionlessReason.PROTECT_CHALLENGE_REFERER,
		]);
	});

	it("saves shadow matches on a blocked session", async () => {
		const manager = buildManager();
		manager.addShadowRule(FrictionlessReason.PROTECT_CHALLENGE_REFERER);

		await manager.registerBlockedSession(CaptchaType.image, {
			solvedImagesCount: 2,
		});

		expect(storedSession().shadowRules).toEqual([
			FrictionlessReason.PROTECT_CHALLENGE_REFERER,
		]);
	});

	it("leaves the field off a session with no shadow matches", async () => {
		const manager = buildManager();

		await manager.sendAccessRuleCaptcha(CaptchaType.pow, {});

		expect(storedSession()).not.toHaveProperty("shadowRules");
	});
});

describe("mergeShadowRules", () => {
	it("keeps challenge-time matches when verify adds its own", () => {
		expect(
			mergeShadowRules(["PROTECT_CHALLENGE_REFERER"], ["WEBRTC_RULE"]),
		).toEqual(["PROTECT_CHALLENGE_REFERER", "WEBRTC_RULE"]);
	});

	it("does not repeat a rule recorded at both stages", () => {
		expect(mergeShadowRules(["A"], ["A"])).toEqual(["A"]);
	});

	it("returns undefined when neither stage matched anything", () => {
		expect(mergeShadowRules(undefined, [])).toBeUndefined();
	});
});
