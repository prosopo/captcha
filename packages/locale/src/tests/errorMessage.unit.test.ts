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
import { flatten } from "@prosopo/util";
import { describe, expect, test } from "vitest";
import { localiseErrorMessage } from "../errorMessage.js";
import de from "../locales/de/translation.json" with { type: "json" };
import type { Ti18n, TranslateOptions } from "../types.js";

// Same lookup order as the browser instance in i18nFrontend.ts: the active
// catalogue, then the caller's defaultValue, then the key.
const i18nIn = (
	catalogue: Record<string, unknown>,
	isInitialized = true,
): Ti18n => {
	const flat: Record<string, string> = flatten(catalogue);
	return {
		language: "de",
		isInitialized,
		t: (key: string, options?: TranslateOptions): string =>
			flat[key] ?? options?.defaultValue ?? key,
		changeLanguage: async (): Promise<void> => undefined,
		hasLoadedNamespace: (): boolean => isInitialized,
		on: (): void => undefined,
		off: (): void => undefined,
	};
};

const germanI18n = (): Ti18n => i18nIn(de);

describe("localiseErrorMessage", () => {
	test("translates a catalogue key into the widget's language, not the server's", () => {
		const i18n = germanI18n();
		expect(
			localiseErrorMessage(i18n, {
				message: "Invalid site key",
				key: "API.INVALID_SITE_KEY",
			}),
		).toBe("Ungültiger Site-Schlüssel");
	});

	test("keeps the server message when the key is not in the catalogue", () => {
		const i18n = germanI18n();
		expect(
			localiseErrorMessage(i18n, {
				message: "upstream timed out",
				key: "API.NOT_A_REAL_KEY",
			}),
		).toBe("upstream timed out");
	});

	test("keeps the server message when there is no key", () => {
		const i18n = germanI18n();
		expect(localiseErrorMessage(i18n, { message: "Invalid site key" })).toBe(
			"Invalid site key",
		);
	});

	test("keeps the server message until i18n is initialised", () => {
		const i18n = i18nIn(de, false);
		expect(
			localiseErrorMessage(i18n, {
				message: "Invalid site key",
				key: "API.INVALID_SITE_KEY",
			}),
		).toBe("Invalid site key");
		expect(
			localiseErrorMessage(undefined, {
				message: "Invalid site key",
				key: "API.INVALID_SITE_KEY",
			}),
		).toBe("Invalid site key");
	});
});
