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

import { afterEach, describe, expect, it, vi } from "vitest";
import {
	LANGUAGE_HEADER,
	LANGUAGE_QUERY_PARAM,
	browserLanguages,
	languageHeaders,
	matchLanguage,
	matchLanguageTag,
	negotiateLanguage,
	parseLanguageList,
	requestLanguage,
	resolveLanguageList,
	widgetLanguageHeaders,
} from "../languagePreference.js";
import { type Language, Languages } from "../translations.js";

describe("parseLanguageList", () => {
	it("returns nothing for an empty or missing value", () => {
		expect(parseLanguageList(undefined)).toEqual([]);
		expect(parseLanguageList("")).toEqual([]);
		expect(parseLanguageList(" , ")).toEqual([]);
	});

	it("keeps the written order when no weights are given", () => {
		expect(parseLanguageList("xx, tr ,en")).toEqual(["xx", "tr", "en"]);
	});

	it("sorts by weight, keeping order between equal weights", () => {
		expect(
			parseLanguageList("en;q=0.5, tr-TR, de;q=0.8, tr;q=0.8, fr;q=0.5"),
		).toEqual(["tr-TR", "de", "tr", "en", "fr"]);
	});

	it("drops q=0, wildcards, bad weights and malformed tags", () => {
		expect(
			parseLanguageList(
				"tr;q=0, *, de;q=abc, fr;q=2, ../x, en-, es;Q=0.3, it;level=1",
			),
		).toEqual(["it", "es"]);
	});

	it("caps the list at ten entries", () => {
		const many: string = Array.from(
			{ length: 15 },
			(_: unknown, index: number) => `x${String.fromCharCode(97 + index)}`,
		).join(",");
		expect(parseLanguageList(many)).toHaveLength(10);
	});
});

describe("matchLanguageTag", () => {
	it.each<[string, Language | undefined]>([
		["tr", Languages.turkish],
		["tr-TR", Languages.turkish],
		["TR-tr", Languages.turkish],
		["pt-BR", Languages.portugeseBrazil],
		["pt-br", Languages.portugeseBrazil],
		["pt-PT", Languages.portuguese],
		["zh-CN", Languages.chineseChina],
		["zh-Hans-CN", Languages.chinese],
		["zh-Hans-TW", Languages.chinese],
		["zh-SG", Languages.chinese],
		["zh-TW", undefined],
		["zh-HK", undefined],
		["zh-Hant", undefined],
		["zh-Hant-TW", undefined],
		["nb", Languages.norwegian],
		["nn-NO", Languages.norwegian],
		["no", Languages.norwegian],
		["in", Languages.indonesian],
		["jw", Languages.javanese],
		["sr-Latn", Languages.serbian],
		["en-GB", Languages.english],
		["xx", undefined],
		["xx-TR", undefined],
		["", undefined],
		["../tr", undefined],
	])("%s -> %s", (tag: string, expected: Language | undefined) => {
		expect(matchLanguageTag(tag)).toBe(expected);
	});
});

describe("matchLanguage / negotiateLanguage", () => {
	it("takes the first preference with a catalogue", () => {
		expect(matchLanguage(["xx", "tr-TR", "de"])).toBe(Languages.turkish);
	});

	it("moves past Traditional Chinese rather than serve Simplified", () => {
		expect(matchLanguage(["zh-TW", "en"])).toBe(Languages.english);
		expect(matchLanguage(["zh-TW"])).toBeUndefined();
	});

	it("matches a whole tag before moving to the next preference", () => {
		// RFC 4647 lookup: `de-AT` falls back to `de` before `tr` is tried.
		expect(matchLanguage(["de-AT", "tr"])).toBe(Languages.german);
	});

	it("returns undefined when nothing matches; negotiate falls back to en", () => {
		expect(matchLanguage(["xx", "yy"])).toBeUndefined();
		expect(matchLanguage([])).toBeUndefined();
		expect(negotiateLanguage(["xx"])).toBe(Languages.english);
		expect(negotiateLanguage(["nb-NO"])).toBe(Languages.norwegian);
	});
});

describe("languageHeaders", () => {
	it("sends the list in Prosopo-Lang, most preferred first", () => {
		expect(languageHeaders(["tr-TR", "en"])).toEqual({
			[LANGUAGE_HEADER]: "tr-TR,en",
		});
	});

	it("leaves Accept-Language to the browser", () => {
		expect(Object.keys(languageHeaders(["tr", "en"]))).toEqual([
			LANGUAGE_HEADER,
		]);
	});

	it("drops malformed tags and keeps at most ten", () => {
		const tags: string[] = [
			"a",
			"b",
			"c",
			"d",
			"e",
			"f",
			"g",
			"h",
			"i",
			"j",
			"k",
		];
		expect(languageHeaders(tags)[LANGUAGE_HEADER]).toBe("a,b,c,d,e,f,g,h,i,j");
		expect(languageHeaders(["tr", "bad tag", "en"])).toEqual({
			[LANGUAGE_HEADER]: "tr,en",
		});
	});

	it("round-trips through parseLanguageList", () => {
		const preferences: string[] = ["zh-TW", "tr", "en-GB"];
		expect(
			parseLanguageList(languageHeaders(preferences)[LANGUAGE_HEADER]),
		).toEqual(preferences);
	});

	it("sends nothing for an empty list", () => {
		expect(languageHeaders([])).toEqual({});
		expect(languageHeaders(["not a tag"])).toEqual({});
	});
});

describe("requestLanguage", () => {
	const header: string = LANGUAGE_HEADER.toLowerCase();

	it("prefers the query parameter, then Prosopo-Lang, then Accept-Language", () => {
		const headers: Record<string, string> = {
			[header]: "de",
			"accept-language": "fr",
		};
		expect(
			requestLanguage({ query: { [LANGUAGE_QUERY_PARAM]: "tr" }, headers }),
		).toBe(Languages.turkish);
		expect(requestLanguage({ query: {}, headers })).toBe(Languages.german);
		expect(requestLanguage({ headers: { "accept-language": "fr" } })).toBe(
			Languages.french,
		);
	});

	it("skips a source that names no supported language", () => {
		expect(
			requestLanguage({
				query: { [LANGUAGE_QUERY_PARAM]: "xx" },
				headers: { [header]: "yy", "accept-language": "tr-TR,en;q=0.5" },
			}),
		).toBe(Languages.turkish);
	});

	it("reads the first value of a repeated parameter or header", () => {
		expect(
			requestLanguage({
				query: { [LANGUAGE_QUERY_PARAM]: ["tr", "de"] },
				headers: { [header]: ["fr"] },
			}),
		).toBe(Languages.turkish);
		expect(requestLanguage({ headers: { [header]: ["fr", "de"] } })).toBe(
			Languages.french,
		);
	});

	it("ignores non-string query values", () => {
		expect(
			requestLanguage({
				query: { [LANGUAGE_QUERY_PARAM]: { nested: "tr" } },
				headers: { "accept-language": "de" },
			}),
		).toBe(Languages.german);
	});

	it("falls back to English", () => {
		expect(requestLanguage({})).toBe(Languages.english);
		expect(requestLanguage({ headers: { "accept-language": "xx" } })).toBe(
			Languages.english,
		);
	});
});

describe("browserLanguages / widgetLanguageHeaders", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("reads navigator.languages", () => {
		vi.stubGlobal("navigator", { languages: ["tr-TR", "en"] });
		expect(browserLanguages()).toEqual(["tr-TR", "en"]);
	});

	it("falls back to navigator.language when the list is empty", () => {
		vi.stubGlobal("navigator", { languages: [], language: "de" });
		expect(browserLanguages()).toEqual(["de"]);
	});

	it("is empty with no navigator, or one that throws", () => {
		vi.stubGlobal("navigator", undefined);
		expect(browserLanguages()).toEqual([]);
		vi.stubGlobal("navigator", {
			get languages(): readonly string[] {
				throw new Error("sandboxed");
			},
		});
		expect(browserLanguages()).toEqual([]);
	});

	it("sends the site's language alone when it chose one", () => {
		vi.stubGlobal("navigator", { languages: ["de"] });
		expect(widgetLanguageHeaders("tr")).toEqual({
			[LANGUAGE_HEADER]: "tr",
		});
	});

	it("sends the browser's list otherwise", () => {
		vi.stubGlobal("navigator", { languages: ["xx", "de-AT"] });
		expect(widgetLanguageHeaders(undefined)).toEqual({
			[LANGUAGE_HEADER]: "xx,de-AT",
		});
	});
});

describe("resolveLanguageList", () => {
	it("resolves a site-supplied list to its first catalogue", () => {
		expect(resolveLanguageList("xx, tr-TR, de")).toBe(Languages.turkish);
		expect(resolveLanguageList("zh-TW, de")).toBe(Languages.german);
	});

	it("has nothing for an empty or unsupported choice", () => {
		expect(resolveLanguageList(null)).toBeUndefined();
		expect(resolveLanguageList(undefined)).toBeUndefined();
		expect(resolveLanguageList("xx")).toBeUndefined();
	});
});
