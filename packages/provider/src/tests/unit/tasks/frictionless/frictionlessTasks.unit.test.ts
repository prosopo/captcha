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
import type { IProviderDatabase } from "@prosopo/types-database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FrictionlessManager } from "../../../../tasks/frictionless/frictionlessTasks.js";

describe("Frictionless Task Manager", () => {
	let db: IProviderDatabase;
	let pair: KeyringPair;
	// biome-ignore lint/suspicious/noExplicitAny: testing purposes
	let captchaConfig: any;
	let frictionlessTaskManager: FrictionlessManager;

	beforeEach(() => {
		db = {} as unknown as IProviderDatabase;

		pair = {
			sign: vi.fn(),
			address: "testAddress",
		} as unknown as KeyringPair;

		captchaConfig = {
			solved: { count: 5 },
			unsolved: { count: 5 },
			lRules: { en: 1 },
		};

		frictionlessTaskManager = new FrictionlessManager(captchaConfig, pair, db);

		vi.clearAllMocks();
	});

	describe("checkLangRules", () => {
		it("should return an inflated score if a lang rule is set", async () => {
			const result = frictionlessTaskManager.checkLangRules("en");
			expect(result).toBe(captchaConfig.lRules.en);
		});
		it("should return zero score if a lang rule is not set", async () => {
			const result = frictionlessTaskManager.checkLangRules("de");
			expect(result).toBe(0);
		});
	});
});
