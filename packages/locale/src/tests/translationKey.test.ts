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

import { describe, expect, test } from "vitest";
import translationEn from "../locales/en/translation.json" with {
	type: "json",
};
import { TranslationKeysSchema } from "../translationKey.js";

describe("translationKey", () => {
	describe("TranslationKeysSchema", () => {
		test("should not validate top-level keys (only leaf paths)", () => {
			// getLeafFieldPath only returns leaf paths, not top-level keys
			const topLevelKeys = Object.keys(translationEn);
			for (const key of topLevelKeys) {
				expect(TranslationKeysSchema.safeParse(key).success).toBe(false);
			}
		});

		test("should validate nested keys with dot notation", () => {
			const testKeys = [
				"ACCOUNT.NO_POLKADOT_EXTENSION",
				"WIDGET.SELECT_ALL",
				"GENERAL.JSON_LOAD_FAILED",
				"CONTRACT.INVALID_ADDRESS",
			];

			for (const key of testKeys) {
				const result = TranslationKeysSchema.safeParse(key);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data).toBe(key);
				}
			}
		});

		test("should validate deeply nested keys", () => {
			const deepKeys = [
				"TARGET.bird",
				"TARGET.car",
				"TARGET.dog",
				"TARGET.airplanes",
			];

			for (const key of deepKeys) {
				const result = TranslationKeysSchema.safeParse(key);
				expect(result.success).toBe(true);
			}
		});

		test("should reject invalid keys", () => {
			const invalidKeys = [
				"INVALID_KEY",
				"ACCOUNT.INVALID",
				"WIDGET.NONEXISTENT",
				"",
				".",
				"..",
			];

			for (const key of invalidKeys) {
				expect(TranslationKeysSchema.safeParse(key).success).toBe(false);
			}
		});

		test("should reject null and undefined", () => {
			expect(TranslationKeysSchema.safeParse(null).success).toBe(false);
			expect(TranslationKeysSchema.safeParse(undefined).success).toBe(false);
		});

		test("should reject non-string values", () => {
			expect(TranslationKeysSchema.safeParse(123).success).toBe(false);
			expect(TranslationKeysSchema.safeParse({}).success).toBe(false);
			expect(TranslationKeysSchema.safeParse([]).success).toBe(false);
		});

		test("should parse valid keys correctly", () => {
			const validKey = "GENERAL.JSON_LOAD_FAILED";
			const result = TranslationKeysSchema.safeParse(validKey);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe(validKey);
			}
		});
	});
});
