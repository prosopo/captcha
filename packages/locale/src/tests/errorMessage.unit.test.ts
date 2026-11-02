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
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { flatten } from "@prosopo/util";
import { describe, expect, test } from "vitest";
import { FALLBACK_ERROR_TEXT, localiseError } from "../errorMessage.js";
import de from "../locales/de/widget.json" with { type: "json" };
import en from "../locales/en/widget.json" with { type: "json" };
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
		exists: (key: string): boolean => key in flat,
		changeLanguage: async (): Promise<void> => undefined,
		hasLoadedNamespace: (): boolean => isInitialized,
		on: (): void => undefined,
		off: (): void => undefined,
	};
};

const germanI18n = (): Ti18n => i18nIn(de);

describe("localiseError", () => {
	test("translates the code into the widget's language", () => {
		expect(
			localiseError(germanI18n(), {
				code: "SITE_KEY_INVALID",
				errorId: "SITE_KEY_INVALID:PROV-31",
				message: "Invalid site key",
			}),
		).toBe("Ungültiger Site-Schlüssel (SITE_KEY_INVALID:PROV-31)");
	});

	test("translates the origin of a hidden error and keeps its errorId", () => {
		expect(
			localiseError(germanI18n(), {
				code: "BACKEND_ERROR",
				errorId: "BACKEND_ERROR:PROV-12",
			}),
		).toBe("Interner Serverfehler (BACKEND_ERROR:PROV-12)");
	});

	test("keeps the provider's message for a code the catalogue lacks", () => {
		expect(
			localiseError(germanI18n(), {
				code: "DOMAIN_LIMIT_REACHED",
				errorId: "DOMAIN_LIMIT_REACHED:PORT-3",
				message: "Domain limit reached",
			}),
		).toBe("Domain limit reached (DOMAIN_LIMIT_REACHED:PORT-3)");
	});

	test("falls back to generic text when there is no message", () => {
		expect(
			localiseError(germanI18n(), { code: "NOPE", errorId: "NOPE:X-1" }),
		).toBe(`${FALLBACK_ERROR_TEXT} (NOPE:X-1)`);
	});

	test("keeps the provider's message until i18n is initialised", () => {
		const error = {
			code: "SITE_KEY_INVALID",
			errorId: "SITE_KEY_INVALID:PROV-31",
			message: "Invalid site key",
		};
		expect(localiseError(i18nIn(de, false), error)).toBe(
			"Invalid site key (SITE_KEY_INVALID:PROV-31)",
		);
		expect(localiseError(undefined, error)).toBe(
			"Invalid site key (SITE_KEY_INVALID:PROV-31)",
		);
	});
});

describe("the ERRORS catalogue", () => {
	test("every locale translates every error the English catalogue has", () => {
		const localesDir = fileURLToPath(new URL("../locales/", import.meta.url));
		const codes = Object.keys(en.ERRORS).sort();
		for (const locale of readdirSync(localesDir)) {
			const catalogue: { ERRORS?: Record<string, string> } = JSON.parse(
				readFileSync(join(localesDir, locale, "widget.json"), "utf8"),
			);
			expect(Object.keys(catalogue.ERRORS ?? {}).sort(), locale).toEqual(codes);
		}
	});
});
