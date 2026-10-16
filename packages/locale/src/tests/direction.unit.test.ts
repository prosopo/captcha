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

import { afterEach, describe, expect, test, vi } from "vitest";
import { type TextDirection, getLanguageDirection } from "../direction.js";
import { LanguageCodes } from "../translations.js";

interface TextInfo {
	readonly direction?: string;
}

interface LocaleTextInfo {
	readonly getTextInfo?: () => TextInfo;
	readonly textInfo?: TextInfo;
}

// i18next 26.4.2's right-to-left codes (dir() in dist/esm/i18next.js).
const I18NEXT_RTL = [
	"ar",
	"shu",
	"sqr",
	"ssh",
	"xaa",
	"yhd",
	"yud",
	"aao",
	"abh",
	"abv",
	"acm",
	"acq",
	"acw",
	"acx",
	"acy",
	"adf",
	"ads",
	"aeb",
	"aec",
	"afb",
	"ajp",
	"apc",
	"apd",
	"arb",
	"arq",
	"ars",
	"ary",
	"arz",
	"auz",
	"avl",
	"ayh",
	"ayl",
	"ayn",
	"ayp",
	"bbz",
	"pga",
	"he",
	"iw",
	"ps",
	"pbt",
	"pbu",
	"pst",
	"prp",
	"prd",
	"ug",
	"ur",
	"ydd",
	"yds",
	"yih",
	"ji",
	"yi",
	"hbo",
	"men",
	"xmn",
	"fa",
	"jpr",
	"peo",
	"pes",
	"prs",
	"dv",
	"sam",
	"ckb",
];

// Codes in i18next's list that CLDR 48 does not write right to left: Latin
// script (acy, men, pga, xaa), Old Persian cuneiform (peo), Parsi as Gujarati
// (prp), or no likely script at all (ads, bbz, sqr, yds).
const I18NEXT_RTL_NOT_IN_CLDR: ReadonlySet<string> = new Set([
	"acy",
	"ads",
	"bbz",
	"men",
	"peo",
	"pga",
	"prp",
	"sqr",
	"xaa",
	"yds",
]);

const intlDirection = (tag: string): string | undefined => {
	const locale: Intl.Locale & LocaleTextInfo = new Intl.Locale(tag);
	return (locale.getTextInfo?.() ?? locale.textInfo)?.direction;
};

class LocaleWithoutTextInfo {
	constructor(readonly tag: string) {}
}

const listDirection = (tag: string): TextDirection => {
	vi.stubGlobal("Intl", { Locale: LocaleWithoutTextInfo });
	try {
		return getLanguageDirection(tag);
	} finally {
		vi.unstubAllGlobals();
	}
};

const letters = "abcdefghijklmnopqrstuvwxyz";

// Every two- and three-letter language code Node's ICU has a likely script for.
const knownLanguages = (): string[] => {
	const codes: string[] = [];
	for (const a of letters) {
		for (const b of letters) {
			codes.push(a + b);
			for (const c of letters) {
				codes.push(a + b + c);
			}
		}
	}
	return codes.filter(
		(code: string) => new Intl.Locale(code).maximize().script !== undefined,
	);
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("getLanguageDirection", () => {
	test("is rtl for Arabic", () => {
		expect(getLanguageDirection("ar")).toBe("rtl");
	});

	test("is rtl for regional and differently-cased Arabic tags", () => {
		expect(getLanguageDirection("ar-EG")).toBe("rtl");
		expect(getLanguageDirection("AR_sa")).toBe("rtl");
	});

	test("is rtl for right-to-left languages we have no catalogue for", () => {
		for (const language of ["he", "fa", "ur", "yi", "ps", "sd", "ckb", "dv"]) {
			expect(getLanguageDirection(language)).toBe("rtl");
		}
	});

	test("is rtl for deprecated and three-letter aliases", () => {
		for (const language of ["iw", "ji", "heb", "per", "ara", "urd"]) {
			expect(listDirection(language)).toBe("rtl");
		}
	});

	test("is ltr for every other shipped language", () => {
		const others: string[] = LanguageCodes.filter(
			(code: string) => code !== "ar",
		);
		for (const language of others) {
			expect(getLanguageDirection(language)).toBe("ltr");
		}
	});

	test("is ltr for an empty or unknown tag", () => {
		expect(getLanguageDirection("")).toBe("ltr");
		expect(getLanguageDirection("xx")).toBe("ltr");
	});

	test("reads the region as a region, not a language", () => {
		expect(getLanguageDirection("en-AR")).toBe("ltr");
	});

	test("follows an explicit script over the language", () => {
		for (const tag of ["pa-Arab", "ku-Arab", "ms-Arab", "az-Arab-IR"]) {
			expect(listDirection(tag)).toBe("rtl");
		}
		for (const tag of ["az-Latn-IR", "sr-Latn", "ar-Latn", "ku-Latn-IQ"]) {
			expect(listDirection(tag)).toBe("ltr");
		}
	});

	test("is rtl where a region's likely script is right to left", () => {
		for (const tag of ["pa-PK", "uz-AF", "ku-IQ", "kk-CN", "az-IR"]) {
			expect(listDirection(tag)).toBe("rtl");
		}
		for (const tag of ["pa-IN", "uz-UZ", "ku-TR", "kk-KZ", "az-AZ"]) {
			expect(listDirection(tag)).toBe("ltr");
		}
	});

	test("ignores script-like extension subtags", () => {
		expect(listDirection("en-u-nu-arab")).toBe("ltr");
		expect(listDirection("en-x-arab")).toBe("ltr");
	});

	test("covers i18next's right-to-left codes that CLDR agrees with", () => {
		const covered: string[] = I18NEXT_RTL.filter(
			(code: string) => !I18NEXT_RTL_NOT_IN_CLDR.has(code),
		);
		for (const code of covered) {
			expect(listDirection(code), code).toBe("rtl");
		}
		for (const code of I18NEXT_RTL_NOT_IN_CLDR) {
			expect(intlDirection(code), code).not.toBe("rtl");
		}
	});
});

describe("getLanguageDirection with the browser's Intl", () => {
	test("is rtl when getTextInfo says so for a language the lists lack", () => {
		class LocaleWithGetTextInfo {
			constructor(readonly tag: string) {}
			getTextInfo(): TextInfo {
				return { direction: this.tag === "zzz" ? "rtl" : "ltr" };
			}
		}
		vi.stubGlobal("Intl", { Locale: LocaleWithGetTextInfo });
		expect(getLanguageDirection("zzz")).toBe("rtl");
		expect(getLanguageDirection("zzy")).toBe("ltr");
	});

	test("reads the older textInfo accessor", () => {
		class LocaleWithTextInfoAccessor {
			readonly textInfo: TextInfo;
			constructor(tag: string) {
				this.textInfo = { direction: tag === "zzz" ? "rtl" : "ltr" };
			}
		}
		vi.stubGlobal("Intl", { Locale: LocaleWithTextInfoAccessor });
		expect(getLanguageDirection("zzz")).toBe("rtl");
		expect(getLanguageDirection("zzy")).toBe("ltr");
	});

	test("keeps the lists' answer when Intl says ltr", () => {
		class LocaleAlwaysLtr {
			getTextInfo(): TextInfo {
				return { direction: "ltr" };
			}
		}
		vi.stubGlobal("Intl", { Locale: LocaleAlwaysLtr });
		expect(getLanguageDirection("he")).toBe("rtl");
		expect(getLanguageDirection("pa-PK")).toBe("rtl");
	});

	test("falls back to the lists when Intl rejects the tag", () => {
		class LocaleThatThrows {
			constructor() {
				throw new RangeError("Incorrect locale information provided");
			}
		}
		vi.stubGlobal("Intl", { Locale: LocaleThatThrows });
		expect(getLanguageDirection("ur")).toBe("rtl");
		expect(getLanguageDirection("de")).toBe("ltr");
	});

	test("falls back to the lists when Intl.Locale is missing", () => {
		vi.stubGlobal("Intl", {});
		expect(getLanguageDirection("fa")).toBe("rtl");
		expect(getLanguageDirection("fr")).toBe("ltr");
	});
});

// Fails when Node's ICU moves to a CLDR that adds or changes a language: the
// message names the codes to add to or remove from RTL_LANGUAGES.
describe("the lists agree with Node's ICU", () => {
	const languages: string[] = knownLanguages();

	test("for every language code", () => {
		const disagree: string[] = languages.filter(
			(code: string) =>
				(intlDirection(code) === "rtl") !== (listDirection(code) === "rtl"),
		);
		expect(disagree).toEqual([]);
	});

	test("for every script those languages use", () => {
		const scripts = new Set<string>(
			languages.map(
				(code: string) => new Intl.Locale(code).maximize().script ?? "",
			),
		);
		const disagree: string[] = [...scripts].filter(
			(script: string) =>
				(intlDirection(`und-${script}`) === "rtl") !==
				(listDirection(`und-${script}`) === "rtl"),
		);
		expect(disagree).toEqual([]);
	});
});
