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

import { describe, expect, test } from "vitest";
import { createUntranslatedI18n } from "../untranslatedI18n.js";

describe("createUntranslatedI18n", () => {
	test("gives back the default value when there is one", () => {
		expect(
			createUntranslatedI18n().t("WIDGET.I_AM_HUMAN", {
				defaultValue: "I am human",
			}),
		).toBe("I am human");
	});

	test("gives back the key when there is no default value", () => {
		expect(createUntranslatedI18n().t("WIDGET.I_AM_HUMAN")).toBe(
			"WIDGET.I_AM_HUMAN",
		);
	});

	test("has no text for any key, so callers fall back to the raw message", () => {
		expect(createUntranslatedI18n().exists("WIDGET.I_AM_HUMAN")).toBe(false);
	});

	test("is English, initialised and loaded", () => {
		const i18n = createUntranslatedI18n();
		expect(i18n.language).toBe("en");
		expect(i18n.isInitialized).toBe(true);
		expect(i18n.hasLoadedNamespace("widget")).toBe(true);
	});

	test("changing language resolves without loading anything", async () => {
		await expect(
			createUntranslatedI18n().changeLanguage("de"),
		).resolves.toBeUndefined();
	});

	test("accepts listeners and removes them without error", () => {
		const i18n = createUntranslatedI18n();
		const listener = (): void => undefined;
		expect(() => {
			i18n.on("languageChanged", listener);
			i18n.off("languageChanged", listener);
		}).not.toThrow();
	});

	test("overrides replace the defaults they name and keep the rest", () => {
		const i18n = createUntranslatedI18n({ language: "de" });
		expect(i18n.language).toBe("de");
		expect(i18n.exists("anything")).toBe(false);
	});
});
