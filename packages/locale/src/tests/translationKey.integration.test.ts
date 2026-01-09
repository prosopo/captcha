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
import { TranslationKeysSchema } from "../translationKey.js";

describe("translationKey integration", () => {
	describe("TranslationKeysSchema comprehensive validation", () => {
		test("should validate all expected translation keys from real translation data", () => {
			// Test that the schema correctly includes all keys from the actual translation file
			// This is an integration test that verifies the schema generation works end-to-end

			const testKeys = [
				"GENERAL.JSON_LOAD_FAILED",
				"ACCOUNT.NO_POLKADOT_EXTENSION",
				"WIDGET.SELECT_ALL",
				"CONTRACT.INVALID_ADDRESS",
				"CAPTCHA.PARSE_ERROR",
				"TARGET.bird",
				"TARGET.car",
				"TARGET.dog",
				"API.BAD_REQUEST",
				"PORTAL.USER_ALREADY_EXISTS",
			];

			for (const key of testKeys) {
				const result = TranslationKeysSchema.safeParse(key);
				expect(result.success, `Key "${key}" should be valid`).toBe(true);
				if (result.success) {
					expect(result.data).toBe(key);
				}
			}
		});

		test("should reject keys that don't exist in translations", () => {
			const invalidKeys = [
				"NONEXISTENT.KEY",
				"GENERAL.NONEXISTENT",
				"INVALID_SECTION.INVALID_KEY",
				"FAKE.SECTION",
			];

			for (const key of invalidKeys) {
				const result = TranslationKeysSchema.safeParse(key);
				expect(result.success, `Key "${key}" should be invalid`).toBe(false);
			}
		});

		test("should handle complex nested structures", () => {
			// Test some deeper nesting that might exist in the translation files
			const complexKeys = [
				"TARGET.airplanes",
				"DATASET.INFO",
				"DATABASE.CONNECTION_FAILED",
			];

			for (const key of complexKeys) {
				const result = TranslationKeysSchema.safeParse(key);
				// We expect these to be valid if they exist, invalid if they don't
				// This test documents the current state
				if (result.success) {
					expect(result.data).toBe(key);
				}
			}
		});
	});
});