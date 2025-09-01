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
					providerSelectEntropy: 1,
				};
			}),
		}));
		const FrictionlessManager = (
			await import("../../../../tasks/frictionless/frictionlessTasks.js")
		).FrictionlessManager;

		const frictionlessTaskManager = new FrictionlessManager(db, pair, config);

		const result = await frictionlessTaskManager.decryptPayload("payload");
		expect(result).toEqual({
			baseBotScore: 1,
			timestamp: expect.any(Number),
			providerSelectEntropy: 1,
		});
	});
	it("should get values from the payload when some values are undefined", async () => {
		vi.doMock("../../../../tasks/detection/getBotScore.ts", () => ({
			getBotScore: vi.fn().mockImplementation(() => {
				return {
					baseBotScore: 1,
					timestamp: Date.now(),
				};
			}),
		}));
		const fmImport = await import(
			"../../../../tasks/frictionless/frictionlessTasks.js"
		);
		const frictionlessTaskManager = new fmImport.FrictionlessManager(
			db,
			pair,
			config,
		);

		const result = await frictionlessTaskManager.decryptPayload("payload");
		expect(result).toEqual({
			baseBotScore: 1,
			timestamp: expect.any(Number),
			providerSelectEntropy: fmImport.DEFAULT_ENTROPY - 1,
		});
	});
	it("should set values for the payload when there are keys but they fail to decrypt", async () => {
		vi.doMock("../../../../tasks/detection/getBotScore.ts", () => ({
			getBotScore: vi.fn().mockImplementationOnce(() => {
				throw Error();
			}),
		}));
		const fmImport = await import(
			"../../../../tasks/frictionless/frictionlessTasks.js"
		);
		db = {
			updateFrictionlessTokenRecord: vi.fn(),
			storeFrictionlessTokenRecord: vi.fn(),
			storeSessionRecord: vi.fn(),
			getDetectorKeys: vi.fn(() => Promise.resolve(["test-key1", "test-key2"])),
		} as unknown as IProviderDatabase;
		const frictionlessTaskManager = new fmImport.FrictionlessManager(
			db,
			pair,
			config,
		);

		const result = await frictionlessTaskManager.decryptPayload("payload");
		expect(result).toEqual({
			baseBotScore: 1,
			timestamp: expect.any(Number),
			providerSelectEntropy: fmImport.DEFAULT_ENTROPY + 1,
		});
	});
	it("should set values for the payload when there are no keys", async () => {
		vi.unmock("../../../../tasks/detection/getBotScore.ts");
		vi.doMock("../../../../tasks/detection/getBotScore.ts", () => ({
			getBotScore: vi.fn().mockImplementation(() => {
				throw new Error();
			}),
		}));
		// override process.env.BOT_DECRYPTION_KEY,
		process.env.BOT_DECRYPTION_KEY = "";

		const fmImport = await import(
			"../../../../tasks/frictionless/frictionlessTasks.js"
		);
		const db2 = {
			updateFrictionlessTokenRecord: vi.fn(),
			storeFrictionlessTokenRecord: vi.fn(),
			storeSessionRecord: vi.fn(),
			getDetectorKeys: vi.fn(() => Promise.resolve([])),
		} as unknown as IProviderDatabase;
		const frictionlessTaskManager = new fmImport.FrictionlessManager(
			db2,
			pair,
			config,
		);

		const result = await frictionlessTaskManager.decryptPayload("payload");
		expect(result).toEqual({
			baseBotScore: 1,
			timestamp: expect.any(Number),
			providerSelectEntropy: fmImport.DEFAULT_ENTROPY - 3,
		});
	});
});
