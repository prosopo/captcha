// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import type { KeyringPair } from "@prosopo/types";
import {
	CaptchaType,
	FrictionlessPenalties,
	type ProsopoConfigOutput,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import {
	type AccessPolicy,
	AccessPolicyType,
} from "@prosopo/user-access-policy";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCompositeIpAddress } from "../../../../compositeIpAddress.js";
import { FrictionlessManager } from "../../../../tasks/frictionless/frictionlessTasks.js";

describe("Frictionless Task Manager", () => {
	let db: IProviderDatabase;
	let pair: KeyringPair;
	let frictionlessTaskManager: FrictionlessManager;
	let config: ProsopoConfigOutput;

	beforeEach(() => {
		db = {
			storeSessionRecord: vi.fn(),
			getDetectorKeys: vi.fn(() => Promise.resolve(["test-key"])),
		} as unknown as IProviderDatabase;

		pair = {
			sign: vi.fn(),
			address: "testAddress",
		} as unknown as KeyringPair;

		config = {
			penalties: FrictionlessPenalties.parse({}),
			captchas: {
				solved: { count: 5 },
				unsolved: { count: 5 },
			},
			lRules: { en: 1 },
		} as unknown as ProsopoConfigOutput;

		frictionlessTaskManager = new FrictionlessManager(db, pair, config);

		vi.clearAllMocks();
	});

	describe("checkLangRules", () => {
		it("should return an inflated score if a lang rule is set", async () => {
			const result = frictionlessTaskManager.checkLangRules("en");
			expect(result).toBe(config.lRules?.en);
		});
		it("should return zero score if a lang rule is not set", async () => {
			const result = frictionlessTaskManager.checkLangRules("de");
			expect(result).toBe(0);
		});
	});

	describe("scoreIncreaseAccessPolicy", () => {
		it("should return the correct score increase for 0 score", () => {
			const accessPolicy: AccessPolicy = {
				type: AccessPolicyType.Restrict,
				frictionlessScore: 1,
			};
			const scoreComponents = { baseScore: 0 };
			const result = frictionlessTaskManager.scoreIncreaseAccessPolicy(
				accessPolicy,
				0,
				0,
				scoreComponents,
			);
			expect(result.score).toBe(1);
			expect(result.scoreComponents.accessPolicy).toBe(1);
		});
		it("should return the correct score increase for an existing score", () => {
			const accessPolicy: AccessPolicy = {
				type: AccessPolicyType.Restrict,
				frictionlessScore: 1,
			};
			const existingScore = 0.1;
			const scoreComponents = { baseScore: existingScore };
			const result = frictionlessTaskManager.scoreIncreaseAccessPolicy(
				accessPolicy,
				existingScore,
				existingScore,
				scoreComponents,
			);
			expect(result.score).toBe(1.1);
			expect(result.scoreComponents.accessPolicy).toBe(1);
		});
	});
	describe("scoreIncreaseTimestamp", () => {
		it("should return the correct score increase when a timestamp is more than the 10 mins old", () => {
			const defaults = FrictionlessPenalties.parse({});
			const scoreComponents = { baseScore: 0 };
			const result = frictionlessTaskManager.scoreIncreaseTimestamp(
				0,
				0,
				0,
				scoreComponents,
			);
			expect(result.score).toBe(defaults.PENALTY_OLD_TIMESTAMP);
			expect(result.scoreComponents.timeout).toBe(
				defaults.PENALTY_OLD_TIMESTAMP,
			);
		});
	});

	describe("Session creation with IP tracking", () => {
		it("should create session and store IP address", async () => {
			const mockToken = "mockToken123";
			const mockScore = 0.5;
			const mockThreshold = 0.7;
			const mockScoreComponents = { baseScore: 0.5 };
			const mockEntropy = 12345;
			const mockIpAddress = getCompositeIpAddress("127.0.0.1");

			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.storeSessionRecord as any).mockResolvedValue(undefined);

			const session = await frictionlessTaskManager.createSession(
				mockToken,
				mockScore,
				mockThreshold,
				mockScoreComponents,
				mockEntropy,
				mockIpAddress,
				CaptchaType.image,
			);

			expect(session).toHaveProperty("sessionId");
			expect(session).toHaveProperty("token", mockToken);
			expect(session).toHaveProperty("score", mockScore);
			expect(session).toHaveProperty("threshold", mockThreshold);
			expect(session).toHaveProperty("captchaType", CaptchaType.image);
			expect(session).toHaveProperty("createdAt");
			expect(db.storeSessionRecord).toHaveBeenCalledWith(session);
		});

		it("should create image captcha session correctly", async () => {
			const mockToken = "mockToken123";
			const mockScore = 0.5;
			const mockThreshold = 0.7;
			const mockScoreComponents = { baseScore: 0.5 };
			const mockEntropy = 12345;
			const mockIpAddress = getCompositeIpAddress("127.0.0.1");

			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.storeSessionRecord as any).mockResolvedValue(undefined);

			frictionlessTaskManager.setSessionParams({
				token: mockToken,
				score: mockScore,
				threshold: mockThreshold,
				scoreComponents: mockScoreComponents,
				providerSelectEntropy: mockEntropy,
				ipAddress: mockIpAddress,
				webView: false,
				iFrame: false,
				decryptedHeadHash: "",
			});

			const response = await frictionlessTaskManager.sendImageCaptcha({
				solvedImagesCount: 0,
			});

			expect(response).toHaveProperty("captchaType", CaptchaType.image);
			expect(response).toHaveProperty("sessionId");
			expect(response).toHaveProperty("status", "ok");
		});

		it("should create PoW captcha session correctly", async () => {
			const mockToken = "mockToken123";
			const mockScore = 0.5;
			const mockThreshold = 0.7;
			const mockScoreComponents = { baseScore: 0.5 };
			const mockEntropy = 12345;
			const mockIpAddress = getCompositeIpAddress("127.0.0.1");

			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.storeSessionRecord as any).mockResolvedValue(undefined);

			frictionlessTaskManager.setSessionParams({
				token: mockToken,
				score: mockScore,
				threshold: mockThreshold,
				scoreComponents: mockScoreComponents,
				providerSelectEntropy: mockEntropy,
				ipAddress: mockIpAddress,
				webView: false,
				iFrame: false,
				decryptedHeadHash: "",
			});

			const response = await frictionlessTaskManager.sendPowCaptcha({
				powDifficulty: undefined,
			});

			expect(response).toHaveProperty("captchaType", CaptchaType.pow);
			expect(response).toHaveProperty("sessionId");
			expect(response).toHaveProperty("status", "ok");
		});
	});
});
