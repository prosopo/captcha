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
import {
	BROWSER_UI_LANGUAGES,
	type Browser,
	type BrowserUiLanguage,
} from "../browserUiLanguages.js";
import { getLanguageDirection } from "../direction.js";
import { matchLanguageTag } from "../languagePreference.js";

// Browser languages with no catalogue yet; their visitors get English.
const UNTRANSLATED: readonly string[] = [
	"ach",
	"br",
	"cak",
	"dsb",
	"ff",
	"fur",
	"gn",
	"hsb",
	"kab",
	"lij",
	"sat",
	"sc",
	"skr",
	"son",
	"szl",
	"trs",
];

const tags: string[] = BROWSER_UI_LANGUAGES.map(
	(language: BrowserUiLanguage) => language.tag,
);

describe("BROWSER_UI_LANGUAGES", () => {
	test.each(BROWSER_UI_LANGUAGES)(
		"$tag is laid out the way getLanguageDirection says",
		(language: BrowserUiLanguage) => {
			expect(getLanguageDirection(language.tag)).toBe(language.direction);
		},
	);

	test("lists the right-to-left languages the browsers ship", () => {
		const rtl: string[] = BROWSER_UI_LANGUAGES.filter(
			(language: BrowserUiLanguage) => language.direction === "rtl",
		).map((language: BrowserUiLanguage) => language.tag);
		expect(rtl).toEqual(["ar", "fa", "he", "skr", "ur"]);
	});

	test("every tag is canonical BCP 47", () => {
		expect(Intl.getCanonicalLocales(tags)).toEqual(tags);
	});

	test("tags are unique and sorted", () => {
		expect(new Set(tags).size).toBe(tags.length);
		expect([...tags].sort()).toEqual(tags);
	});

	test("every language names a browser that ships it", () => {
		for (const language of BROWSER_UI_LANGUAGES) {
			expect(language.name).not.toBe("");
			expect(language.browsers.length).toBeGreaterThan(0);
		}
	});

	test("covers both browsers' full lists", () => {
		const shippedBy = (browser: Browser): number =>
			BROWSER_UI_LANGUAGES.filter((language: BrowserUiLanguage) =>
				language.browsers.includes(browser),
			).length;
		expect(shippedBy("chrome")).toBe(84);
		expect(shippedBy("firefox")).toBe(103);
	});

	test("every language has a catalogue, apart from the untranslated ones", () => {
		const missing: string[] = tags.filter(
			(tag: string) => matchLanguageTag(tag) === undefined,
		);
		expect(missing).toEqual(UNTRANSLATED);
	});
});
