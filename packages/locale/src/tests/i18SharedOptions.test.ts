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

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { i18nSharedOptions } from "../i18SharedOptions.js";
import { LanguageSchema, Languages } from "../translations.js";

describe("i18SharedOptions", () => {
	const originalEnv = process.env.PROSOPO_LOG_LEVEL;

	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		process.env.PROSOPO_LOG_LEVEL = originalEnv;
	});

	test("should have correct namespace", () => {
		expect(i18nSharedOptions.namespace).toBe("translation");
	});

	test("should have fallback language set to English", () => {
		expect(i18nSharedOptions.fallbackLng).toBe(LanguageSchema.enum.en);
		expect(i18nSharedOptions.fallbackLng).toBe("en");
	});

	test("should include all supported languages", () => {
		const supportedLngs = Object.values(Languages);
		expect(i18nSharedOptions.supportedLngs).toEqual(supportedLngs);
		expect(i18nSharedOptions.supportedLngs.length).toBe(supportedLngs.length);
	});

	test("should have nonExplicitSupportedLngs set to false", () => {
		expect(i18nSharedOptions.nonExplicitSupportedLngs).toBe(false);
	});

	test("should set debug to true when PROSOPO_LOG_LEVEL is debug", async () => {
		process.env.PROSOPO_LOG_LEVEL = "debug";
		// Re-import to get fresh module with updated env
		vi.resetModules();
		const { i18nSharedOptions: options } = await import(
			"../i18SharedOptions.js"
		);
		expect(options.debug).toBe(true);
	});

	test("should set debug to false when PROSOPO_LOG_LEVEL is not debug", async () => {
		process.env.PROSOPO_LOG_LEVEL = "info";
		vi.resetModules();
		const { i18nSharedOptions: options } = await import(
			"../i18SharedOptions.js"
		);
		expect(options.debug).toBe(false);
	});

	test("should set debug to false when PROSOPO_LOG_LEVEL is undefined", async () => {
		process.env.PROSOPO_LOG_LEVEL = undefined;
		vi.resetModules();
		const { i18nSharedOptions: options } = await import(
			"../i18SharedOptions.js"
		);
		expect(options.debug).toBe(false);
	});
});
