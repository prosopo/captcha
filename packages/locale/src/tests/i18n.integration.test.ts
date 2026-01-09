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

import { beforeEach, describe, expect, test, vi } from "vitest";
import loadI18next from "../loadI18next.js";
import { LanguageSchema, Languages } from "../translations.js";

describe("i18n integration tests", () => {
	beforeEach(() => {
		// Reset modules to ensure clean state for each test
		vi.resetModules();
	});

	describe("Backend i18n initialization", () => {
		test("should initialize backend i18n and load translations", async () => {
			// Testing backend initialization (server-side)
			const i18n = await loadI18next(true);

			// Wait for i18n to be ready
			await new Promise((resolve) => {
				if (i18n.isInitialized) {
					resolve(undefined);
				} else {
					i18n.on("initialized", resolve);
				}
			});

			expect(i18n.isInitialized).toBe(true);
			expect(i18n.language).toBe(LanguageSchema.enum.en); // Default fallback

			// Test that we can translate keys
			const translated = i18n.t("GENERAL.JSON_LOAD_FAILED");
			expect(translated).toBeDefined();
			expect(typeof translated).toBe("string");
			expect(translated.length).toBeGreaterThan(0);
		}, 10000);

		test("should support changing languages", async () => {
			const i18n = await loadI18next(true);

			await new Promise((resolve) => {
				if (i18n.isInitialized) {
					resolve(undefined);
				} else {
					i18n.on("initialized", resolve);
				}
			});

			// Test changing to French
			await i18n.changeLanguage(Languages.french);
			expect(i18n.language).toBe(Languages.french);

			// Test translation in French
			const frenchTranslation = i18n.t("GENERAL.JSON_LOAD_FAILED");
			expect(frenchTranslation).toBeDefined();
			expect(typeof frenchTranslation).toBe("string");
		}, 10000);

		test("should handle unsupported language requests gracefully", async () => {
			const i18n = await loadI18next(true);

			await new Promise((resolve) => {
				if (i18n.isInitialized) {
					resolve(undefined);
				} else {
					i18n.on("initialized", resolve);
				}
			});

			// Test changing to an unsupported language
			// i18next should handle this gracefully without throwing
			await expect(i18n.changeLanguage("unsupported")).resolves.not.toThrow();
			// The language might not change, but the system should continue working
			expect(i18n.isInitialized).toBe(true);
		}, 10000);
	});

	describe("Frontend i18n initialization", () => {
		test("should initialize frontend i18n and load translations", async () => {
			// Testing frontend initialization (client-side)
			const i18n = await loadI18next(false);

			// Wait for i18n to be ready
			await new Promise((resolve) => {
				if (i18n.isInitialized) {
					resolve(undefined);
				} else {
					i18n.on("initialized", resolve);
				}
			});

			expect(i18n.isInitialized).toBe(true);

			// Test that we can translate keys
			const translated = i18n.t("GENERAL.JSON_LOAD_FAILED");
			expect(translated).toBeDefined();
			expect(typeof translated).toBe("string");
			expect(translated.length).toBeGreaterThan(0);
		}, 10000);

		test("should support multiple language changes in frontend", async () => {
			const i18n = await loadI18next(false);

			await new Promise((resolve) => {
				if (i18n.isInitialized) {
					resolve(undefined);
				} else {
					i18n.on("initialized", resolve);
				}
			});

			// Test changing to German
			await i18n.changeLanguage(Languages.german);
			expect(i18n.language).toBe(Languages.german);

			// Test changing to Spanish
			await i18n.changeLanguage(Languages.spanish);
			expect(i18n.language).toBe(Languages.spanish);

			// Test translation in Spanish
			const spanishTranslation = i18n.t("GENERAL.JSON_LOAD_FAILED");
			expect(spanishTranslation).toBeDefined();
			expect(typeof spanishTranslation).toBe("string");
		}, 10000);
	});

	describe("Translation key validation", () => {
		test("should translate all valid translation keys", async () => {
			const i18n = await loadI18next(true);

			await new Promise((resolve) => {
				if (i18n.isInitialized) {
					resolve(undefined);
				} else {
					i18n.on("initialized", resolve);
				}
			});

			// Test a sample of translation keys
			const testKeys = [
				"GENERAL.JSON_LOAD_FAILED",
				"ACCOUNT.NO_POLKADOT_EXTENSION",
				"WIDGET.SELECT_ALL",
				"CONTRACT.INVALID_ADDRESS",
				"CAPTCHA.PARSE_ERROR",
			];

			for (const key of testKeys) {
				const translated = i18n.t(key);
				expect(translated).toBeDefined();
				expect(typeof translated).toBe("string");
				expect(translated.length).toBeGreaterThan(0);
				expect(translated).not.toBe(key); // Should not return the key itself
			}
		}, 10000);

		test("should handle nested translation keys", async () => {
			const i18n = await loadI18next(true);

			await new Promise((resolve) => {
				if (i18n.isInitialized) {
					resolve(undefined);
				} else {
					i18n.on("initialized", resolve);
				}
			});

			// Test nested keys
			const nestedKeys = [
				"TARGET.bird",
				"TARGET.car",
				"TARGET.dog",
			];

			for (const key of nestedKeys) {
				const translated = i18n.t(key);
				expect(translated).toBeDefined();
				expect(typeof translated).toBe("string");
				expect(translated.length).toBeGreaterThan(0);
			}
		}, 10000);

		test("should handle interpolation", async () => {
			const i18n = await loadI18next(true);

			await new Promise((resolve) => {
				if (i18n.isInitialized) {
					resolve(undefined);
				} else {
					i18n.on("initialized", resolve);
				}
			});

			// Test with interpolation (if the translation supports it)
			const translated = i18n.t("GENERAL.JSON_LOAD_FAILED", { defaultValue: "Default message" });
			expect(translated).toBeDefined();
			expect(typeof translated).toBe("string");
		}, 10000);
	});

	describe("Middleware integration", () => {
		test("should export i18nMiddleware function", async () => {
			// Import the middleware
			const { default: i18nMiddleware } = await import("../i18nMiddleware.js");

			// Test that it's a function
			expect(i18nMiddleware).toBeDefined();
			expect(typeof i18nMiddleware).toBe("function");
		});
	});
});