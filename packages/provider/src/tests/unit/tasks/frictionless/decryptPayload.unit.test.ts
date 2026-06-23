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
	FrictionlessPenalties,
	type KeyringPair,
	type ProsopoConfigOutput,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("decryptPayload", () => {
	let db: IProviderDatabase;
	let pair: KeyringPair;
	let config: ProsopoConfigOutput;
	const detectorKey = process.env.BOT_DECRYPTION_KEY;
	beforeEach(() => {
		process.env.BOT_DECRYPTION_KEY = "";
		vi.clearAllMocks();
		vi.resetAllMocks();
		vi.resetModules();
		db = {
			updateFrictionlessTokenRecord: vi.fn(),
			storeFrictionlessTokenRecord: vi.fn(),
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

		vi.clearAllMocks();
	});

	afterEach(() => {
		process.env.BOT_DECRYPTION_KEY = detectorKey;
	});

	it("should get values from the payload", async () => {
		vi.doMock("../../../../tasks/detection/getBotScore.ts", () => ({
			getBotScore: vi.fn().mockImplementation(() => {
				return {
					baseBotScore: 1,
					timestamp: Date.now(),
				};
			}),
		}));
		const FrictionlessManager = (
			await import("../../../../tasks/frictionless/frictionlessTasks.js")
		).FrictionlessManager;

		const frictionlessTaskManager = new FrictionlessManager(db, pair, config);

		const result = await frictionlessTaskManager.decryptPayload(
			"payload",
			"headHash",
		);
		expect(result).toEqual({
			baseBotScore: 1,
			timestamp: expect.any(Number),
			userId: undefined,
			userAgent: undefined,
			webView: false,
			iFrame: false,
			decryptedHeadHash: "",
			decryptionFailed: false,
		});
	});
});
