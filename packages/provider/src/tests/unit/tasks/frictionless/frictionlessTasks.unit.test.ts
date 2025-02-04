// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import type { KeyringPair } from "@polkadot/keyring/types";
import {
	FrictionlessPenalties,
	type ProsopoConfigOutput,
} from "@prosopo/types";
import type {
	FrictionlessTokenId,
	IProviderDatabase,
} from "@prosopo/types-database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FrictionlessManager } from "../../../../tasks/frictionless/frictionlessTasks.js";

describe("Frictionless Task Manager", () => {
	let db: IProviderDatabase;
	let pair: KeyringPair;
	let frictionlessTaskManager: FrictionlessManager;
	let config: ProsopoConfigOutput;

	beforeEach(() => {
		db = {
			updateFrictionlessTokenRecord: vi.fn(),
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
		it("should return the correct score increase for 0 score", async () => {
			const accessRule = {
				isUserBlocked: false,
				score: 1,
			};
			const tokenId = "tokenId" as unknown as FrictionlessTokenId;
			const result = await frictionlessTaskManager.scoreIncreaseAccessPolicy(
				accessRule,
				0,
				0,
				tokenId,
			);
			expect(result).toBe(1);
		});
		it("should return the correct score increase for an existing score", async () => {
			const accessRule = {
				isUserBlocked: false,
				score: 1,
			};
			const existingScore = 0.1;
			const tokenId = "tokenId" as unknown as FrictionlessTokenId;
			const result = await frictionlessTaskManager.scoreIncreaseAccessPolicy(
				accessRule,
				existingScore,
				existingScore,
				tokenId,
			);
			expect(result).toBe(1.1);
		});
	});
	describe("scoreIncreaseTimestamp", () => {
		it("should return the correct score increase when a timestamp is more than the 10 mins old", async () => {
			const defaults = FrictionlessPenalties.parse({});
			const result = await frictionlessTaskManager.scoreIncreaseTimestamp(
				0,
				0,
				0,
				"tokenId" as unknown as FrictionlessTokenId,
			);
			expect(result).toBe(defaults.PENALTY_OLD_TIMESTAMP);
		});
	});
});
