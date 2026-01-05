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

import { Languages } from "@prosopo/locale";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setLanguage } from "../../util/language.js";
import type { ProcaptchaClientConfigInput } from "@prosopo/types";

describe("setLanguage", () => {
	let dom: JSDOM;
	let element: Element;
	let config: ProcaptchaClientConfigInput;

	beforeEach(() => {
		dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
		global.document = dom.window.document;
		element = document.createElement("div");
		config = {
			account: { address: "test" },
		} as ProcaptchaClientConfigInput;
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix any
		(global as any).document = undefined;
	});

	it("should set language from renderOptions when provided", () => {
		setLanguage({ language: Languages.fr }, element, config);

		expect(config.language).toBe(Languages.fr);
	});

	it("should set language from element data attribute when renderOptions language is not provided", () => {
		element.setAttribute("data-language", Languages.de);
		setLanguage(undefined, element, config);

		expect(config.language).toBe(Languages.de);
	});

	it("should prioritize renderOptions language over element attribute", () => {
		element.setAttribute("data-language", Languages.de);
		setLanguage({ language: Languages.fr }, element, config);

		expect(config.language).toBe(Languages.fr);
	});

	it("should not set language when neither renderOptions nor element attribute is provided", () => {
		setLanguage(undefined, element, config);

		expect(config.language).toBeUndefined();
	});

	it("should default to 'en' when invalid language is provided in renderOptions", () => {
		setLanguage({ language: "invalid" as Languages }, element, config);

		expect(config.language).toBe(Languages.en);
		expect(console.error).toHaveBeenCalledWith(
			"Invalid language attribute: invalid",
		);
	});

	it("should default to 'en' when invalid language is provided in element attribute", () => {
		element.setAttribute("data-language", "invalid");
		setLanguage(undefined, element, config);

		expect(config.language).toBe(Languages.en);
		expect(console.error).toHaveBeenCalledWith(
			"Invalid language attribute: invalid",
		);
	});

	it("should handle all valid language values", () => {
		for (const lang of Object.values(Languages)) {
			const testConfig = {
				account: { address: "test" },
			} as ProcaptchaClientConfigInput;
			setLanguage({ language: lang }, element, testConfig);

			expect(testConfig.language).toBe(lang);
		}
	});

	it("should handle empty string in element attribute", () => {
		element.setAttribute("data-language", "");
		setLanguage(undefined, element, config);

		expect(config.language).toBe(Languages.en);
		expect(console.error).toHaveBeenCalledWith(
			"Invalid language attribute: ",
		);
	});
});

