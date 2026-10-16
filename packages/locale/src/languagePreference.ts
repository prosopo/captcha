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

// One language negotiation shared by the widget and the provider, so both pick
// the same catalogue from the same preference list. The widget sends its list
// (the site's data-language, else navigator.languages) in the headers below and
// the provider resolves it with the same function the widget used.

import { type Language, Languages } from "./translations.js";

/** Our own header for the widget's language list, beside the browser's Accept-Language. */
export const LANGUAGE_HEADER = "Prosopo-Lang";
/** Query parameter for clients that cannot set headers. Wins over both. */
export const LANGUAGE_QUERY_PARAM = "lng";

// More than this is noise, and every entry goes into a request header.
const MAX_PREFERENCES = 10;

// BCP 47 shape: letters, then subtags. Also rejects anything that could
// escape a `locales/{{lng}}/` path segment.
const LANGUAGE_TAG = /^[A-Za-z]{1,8}(?:-[A-Za-z0-9]{1,8})*$/;

/**
 * Primary subtags we do not have a catalogue for but can serve from one we
 * do: Norwegian Bokmål and Nynorsk read the `no` catalogue, and browsers
 * still send the withdrawn codes for Indonesian and Javanese.
 */
const ALIASES: Readonly<Record<string, Language>> = {
	nb: Languages.norwegian,
	in: Languages.indonesian,
	iw: Languages.hebrew,
	jw: Languages.javanese,
	tl: Languages.filipino,
};

const byLowerCase: ReadonlyMap<string, Language> = new Map(
	Object.values(Languages).map((code: Language): [string, Language] => [
		code.toLowerCase(),
		code,
	]),
);

/**
 * A comma-separated list in Accept-Language form ("tr-TR, tr;q=0.9, en;q=0.8")
 * as tags, most preferred first. Order is kept between equal weights,
 * `q=0` and `*` entries are dropped, and anything malformed is skipped.
 */
export const parseLanguageList = (value: string | undefined): string[] => {
	if (!value) {
		return [];
	}
	return value
		.split(",")
		.map((entry: string, index: number) => {
			const [tag = "", ...params] = entry.split(";").map((part) => part.trim());
			// A weight that is present but unreadable drops the entry (NaN).
			const weight = params.find((param: string) => /^q=/i.test(param));
			const q =
				weight === undefined
					? 1
					: /^q=[0-9]+(?:\.[0-9]*)?$/i.test(weight)
						? Number(weight.slice(2))
						: Number.NaN;
			return { tag, q, index };
		})
		.filter(
			({ tag, q }) =>
				LANGUAGE_TAG.test(tag) && Number.isFinite(q) && q > 0 && q <= 1,
		)
		.sort((a, b) => b.q - a.q || a.index - b.index)
		.map(({ tag }) => tag)
		.slice(0, MAX_PREFERENCES);
};

// The `zh` catalogue is Simplified Chinese, which Traditional Chinese readers
// do not expect, so their tags go to a Traditional catalogue instead: Hong
// Kong's for Hong Kong and Macau, Taiwan's for the rest.
const TRADITIONAL_CHINESE_SUBTAGS: ReadonlySet<string> = new Set([
	"hant",
	"tw",
	"hk",
	"mo",
]);

const HONG_KONG_CHINESE_SUBTAGS: ReadonlySet<string> = new Set(["hk", "mo"]);

const isTraditionalChinese = (subtags: readonly string[]): boolean =>
	subtags[0] === "zh" &&
	!subtags.includes("hans") &&
	subtags.some((subtag: string) => TRADITIONAL_CHINESE_SUBTAGS.has(subtag));

const traditionalChinese = (subtags: readonly string[]): Language =>
	subtags.some((subtag: string) => HONG_KONG_CHINESE_SUBTAGS.has(subtag))
		? Languages.chineseHongKong
		: Languages.chineseTaiwan;

/**
 * The catalogue for one tag: the exact code, then the tag with its last subtag
 * dropped, and so on (RFC 4647 lookup), so `zh-Hans-SG` reaches `zh` and
 * `pt-BR` stays `pt-BR`. Traditional Chinese (`zh-Hant`, `zh-MO`) goes to
 * `zh-TW` or `zh-HK`, never `zh`. Case is ignored. Aliases apply to the primary subtag.
 */
export const matchLanguageTag = (tag: string): Language | undefined => {
	if (!LANGUAGE_TAG.test(tag)) {
		return undefined;
	}
	const subtags = tag.toLowerCase().split("-");
	if (isTraditionalChinese(subtags)) {
		return traditionalChinese(subtags);
	}
	for (let length = subtags.length; length >= 1; length--) {
		const match = byLowerCase.get(subtags.slice(0, length).join("-"));
		if (match) {
			return match;
		}
	}
	return subtags[0] === undefined ? undefined : ALIASES[subtags[0]];
};

/** The first preference we have a catalogue for, or undefined if none. */
export const matchLanguage = (
	preferences: readonly string[],
): Language | undefined => {
	for (const tag of preferences) {
		const match = matchLanguageTag(tag);
		if (match) {
			return match;
		}
	}
	return undefined;
};

/**
 * A site-supplied list such as `data-language="xx, tr-TR"`: the first entry we
 * have a catalogue for, or undefined if none.
 */
export const resolveLanguageList = (
	value: string | null | undefined,
): Language | undefined => matchLanguage(parseLanguageList(value ?? undefined));

/** Like matchLanguage, but falls back to English. */
export const negotiateLanguage = (preferences: readonly string[]): Language =>
	matchLanguage(preferences) ?? Languages.english;

/**
 * The headers the widget sends with every provider request: Prosopo-Lang
 * only. The browser's own Accept-Language is left as it is, because the
 * provider's bot rules read it and a value set by script would hide the real
 * one. Prosopo-Lang beats Accept-Language on the provider, so the site's
 * data-language still wins.
 */
export const languageHeaders = (
	preferences: readonly string[],
): Record<string, string> => {
	const tags = preferences
		.filter((tag: string) => LANGUAGE_TAG.test(tag))
		.slice(0, MAX_PREFERENCES);
	return tags.length === 0 ? {} : { [LANGUAGE_HEADER]: tags.join(",") };
};

/**
 * navigator.languages, most preferred first. Empty outside a browser, and
 * where navigator access throws (some sandboxed iframes).
 */
export const browserLanguages = (): readonly string[] => {
	try {
		if (typeof navigator === "undefined") {
			return [];
		}
		return navigator.languages?.length
			? navigator.languages
			: [navigator.language];
	} catch {
		return [];
	}
};

/**
 * The language headers for the widget's provider requests: the site's choice
 * when it made one (already resolved, so the provider cannot pick otherwise),
 * else the browser's list, which the provider negotiates exactly as the
 * widget did.
 */
export const widgetLanguageHeaders = (
	siteLanguage: string | undefined,
): Record<string, string> =>
	languageHeaders(siteLanguage ? [siteLanguage] : browserLanguages());

/** The parts of an HTTP request the provider negotiates from. */
export type LanguageRequest = {
	query?: Readonly<Record<string, unknown>>;
	headers?: Readonly<Record<string, string | string[] | undefined>>;
};

const firstString = (value: unknown): string | undefined => {
	if (typeof value === "string") {
		return value;
	}
	if (Array.isArray(value) && typeof value[0] === "string") {
		return value[0];
	}
	return undefined;
};

/**
 * The provider's choice for one request: `?lng=` beats the Prosopo-Lang
 * header, which beats Accept-Language. A source naming only languages we do
 * not have is skipped, not taken as English, so the next one still counts.
 * No cookie: the widget runs on other people's sites and must not set one.
 */
export const requestLanguage = (request: LanguageRequest): Language => {
	const headers = request.headers ?? {};
	const sources: Array<string | undefined> = [
		firstString(request.query?.[LANGUAGE_QUERY_PARAM]),
		firstString(headers[LANGUAGE_HEADER.toLowerCase()]),
		firstString(headers["accept-language"]),
	];
	for (const source of sources) {
		const match = matchLanguage(parseLanguageList(source));
		if (match) {
			return match;
		}
	}
	return Languages.english;
};
