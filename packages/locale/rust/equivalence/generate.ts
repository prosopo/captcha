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

import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express, { type Request, type Response } from "express";
import i18next, { type InitOptions, type i18n } from "i18next";
import { localiseErrorMessage } from "../../src/errorMessage.js";
import { i18nSharedOptions } from "../../src/i18SharedOptions.js";
import i18nMiddleware from "../../src/i18nMiddleware.js";
import {
	type LanguageRequest,
	languageHeaders,
	matchLanguageTag,
	parseLanguageList,
	requestLanguage,
} from "../../src/languagePreference.js";
import loadI18next from "../../src/loadI18next.js";
import {
	englishText,
	isTargetKey,
	isTranslationKey,
	targetKeys,
	translationKeys,
} from "../../src/serverTranslationKeys.js";
import {
	NAMESPACES,
	type TranslationNode,
	getLeafFieldPath,
	isWidgetTranslationKey,
} from "../../src/translationKey.js";
import { LanguageCodes } from "../../src/translations.js";

// The vectors are what Node 24, the production runtime, produces.
if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Scalar = string | number | boolean | null;
type Values = Record<string, Scalar>;

interface CallOptions {
	defaultValue?: string;
	lng?: string;
	values?: Values;
}

type Instance = "files" | "synthetic" | "syntheticUnescaped";

/** [key, options, result, exists]; a number or boolean result stays one. */
type Call = [string, CallOptions | null, string | number | boolean, boolean];

interface TranslationGroup {
	instance: Instance;
	language: string;
	resolvedLanguage: string;
	calls: Call[];
}

interface HttpVector {
	query: string;
	headers: Record<string, string>;
	parsedQueryLng: Json;
	prosopoLang: string | null;
	acceptLanguage: string | null;
	language: string;
	contentLanguage: string | null;
	setCookie: string | null;
	translations: Record<string, string>;
	exists: Record<string, boolean>;
}

const toJson = (value: unknown): Json => JSON.parse(JSON.stringify(value ?? null));

const SAMPLE_KEYS: readonly string[] = [
	"TARGET.owl",
	"TARGET.fire-hydrant",
	"WIDGET.SELECT_ALL",
	"DATABASE.UNKNOWN",
	"API.INVALID_SITE_KEY",
	"API.NOT_A_REAL_KEY",
];

const PLACEHOLDER_KEYS: readonly string[] = translationKeys.filter(
	(key: string) => isTranslationKey(key) && englishText(key).includes("{{"),
);

const PLACEHOLDER_VALUES: Values = {
	x: 12,
	y: "<b>&'\"/</b>",
	count: 6,
	address: "5Grw$&$1 {{x}} $t(WIDGET.NEXT)",
};

const PLACEHOLDER_LANGUAGES: readonly string[] = ["ar", "he", "hi", "ja", "zh-TW", "pt-BR"];

const EDGE_KEYS: readonly string[] = [
	"",
	"WIDGET",
	"TARGET",
	"WIDGET.PUZZLE",
	"WIDGET.NEXT.extra",
	"WIDGET..NEXT",
	"WIDGET.NEXT.",
	".WIDGET.NEXT",
	"widget:WIDGET.NEXT",
	"target:TARGET.owl",
	"translation:WIDGET.NEXT",
	"translation:TARGET.owl",
	"widget:DATABASE.UNKNOWN",
	"unknown:WIDGET.NEXT",
	"WIDGET:NEXT",
	"a:b:c",
	"Invalid site key",
	"Error: something went wrong",
	"Error:something",
	"WIDGET.a b:c",
	"no.such.key",
	"{{x}} literal",
	"$t(WIDGET.NEXT)",
	"see $t(WIDGET.NEXT) here",
	"$t(WIDGET.NEXT):x",
	"WIDGET.NEXT###",
	"TARGET.Owl",
	"cimode",
];

const LNG_OPTIONS: readonly string[] = [
	"en-GB",
	"pt-br",
	"PT-BR",
	"pt_BR",
	"zh-Hant-TW",
	"ZH-tw",
	"zh_TW",
	"zh-HK",
	"de-AT",
	"de-AT-1996",
	"de-x-foo",
	"sr-Latn-RS",
	"zh-Hans",
	"zh-hans-cn",
	"xx",
	"",
	"cimode",
	"CIMODE",
	"nb",
	"no",
	"iw",
	"tr",
];

const CHANGE_LANGUAGES: readonly string[] = [
	"en-GB",
	"de-AT",
	"pt-br",
	"xx",
	"",
	"zh-HK",
	"ZH-hk",
	"zh-Hant-HK",
	"cimode",
	"nb-NO",
	"pt_BR",
	"fil",
];

const syntheticResources = {
	en: {
		translation: {
			plain: "Plain",
			greet: "Hello {{name}}",
			greetRaw: "Hello {{- name}}",
			spaced: "Hi {{ name }} and {{name}}",
			twice: "{{a}} {{b}}",
			repeated: "{{a}} {{a}} {{ a }}",
			missing: "Value: {{nope}} and {{name}}",
			formatted: "Formatted {{value, uppercase}} and {{value,}} {{nope, uppercase}}",
			dotted: { "a.b": "dotted inner", deep: { leaf: "deep leaf" } },
			"flat.key": "flat dotted key",
			hashes: { "x.y": "hash target" },
			empty: "",
			nullish: null,
			num: 42,
			bool: true,
			zero: 0,
			arr: ["zero", "one"],
			obj: { inner: "inner" },
			nestPlain: "Nested: $t(plain)",
			nestSelf: "Self $t(nestSelf) end",
			nestPair: "A $t(nestPairB)",
			nestPairB: "B $t(nestPair)",
			nestOptions: 'Opts $t(greet, {"name": "Ann"})',
			nestSingleQuotes: "Opts $t(greet, {'name': 'Bob'})",
			nestBadJson: "Bad $t(greet, {name: Ann})",
			nestFormatter: "Fmt $t(plain, uppercase) and $t(plain,)",
			nestMissing: "Missing $t(no.such.key)",
			nestNs: "Ns $t(widget:widgetOnly)",
			nestVar: "Var $t(greet)",
			nestLng: "Lng $t(showLng)",
			showLng: "{{lng}} {{applyPostProcessor}}",
			nestTwice: "$t(plain) and $t(plain)",
			nestWhole: "$t(num)",
			nestWholeBool: "$t(bool)",
			nestEmpty: "[$t(empty)]",
			nestObject: "[$t(obj)]",
			nestDefault:
				'$t(missingWithDefault, {"defaultValue": "fallback {{name}}"})',
			nestInterpolatedOptions: '$t(greet, {"name": "{{name}}"})',
			nestNested: "Outer $t(nestPlain)",
			nestUnicode: "é😀 $t(plain) ü $t(plain)",
			nestSkip: '$t(greet, {"skipInterpolation": true})',
			nestNoNest: '$t(nestPlain, {"nest": false})',
			nestLngOption: '$t(plain, {"lng": "de"})',
			nestBraceNoComma: "$t({plain})",
			nestBraceText: "$t(plain, b {c})",
			unicode: "é😀 {{a}} ü {{b}}",
			terminators: "{{a\nb}} {{a b}} {{a\rb}} {{a}}",
			injection: "{{a}} {{b}}",
			dollar: "Cost {{price}}",
			escapes: "{{html}} / {{- html}}",
			colon: "a: {{x}}",
			bothDefault: "{{defaultValue}}",
			many: "{{x}}".repeat(1005),
			hierarchy: "en hierarchy",
			onlyEn: "only en",
			nestedVar: "Deep {{user.name}}",
		},
		widget: {
			widgetOnly: "widget only",
			shared: "widget shared",
			WIDGET: { NEXT: "Next synthetic" },
		},
		target: {
			TARGET: { owl: "owl synthetic" },
			targetOnly: "target only",
			shared: "target shared",
		},
	},
	de: {
		translation: {
			plain: "Schlicht",
			hierarchy: "de hierarchy",
			empty: "",
			nullish: "de nicht null",
		},
		widget: { widgetOnly: "nur Widget" },
	},
	pt: { translation: { plain: "Simples", ptOnly: "so pt" } },
	"pt-BR": { translation: { plain: "Simples BR" } },
	zh: { translation: { plain: "简单" } },
	"zh-TW": { translation: { plain: "簡單" } },
};

const SYNTHETIC_CALLS: readonly [string, CallOptions | null][] = [
	["plain", null],
	["greet", null],
	["greet", { values: { name: "<Ann & 'Bob'>" } }],
	["greetRaw", { values: { name: "<Ann & 'Bob'>" } }],
	["spaced", { values: { name: "Zoë" } }],
	["twice", { values: { a: "{{b}}", b: "B" } }],
	["twice", { values: { a: "$&", b: "$1$$" } }],
	["repeated", { values: { a: "1" } }],
	["missing", null],
	["missing", { values: { name: "N" } }],
	["formatted", { values: { value: 1234.5 } }],
	["dotted.a.b", null],
	["dotted.deep.leaf", null],
	["dotted.deep", null],
	["flat.key", null],
	["hashes.x###y", null],
	["empty", null],
	["empty", { defaultValue: "fallback" }],
	["nullish", null],
	["nullish", { defaultValue: "fallback" }],
	["num", null],
	["bool", null],
	["zero", null],
	["arr", null],
	["arr.0", null],
	["arr.1", null],
	["arr.01", null],
	["obj", null],
	["obj", { defaultValue: "fallback" }],
	["obj.inner", null],
	["nestPlain", null],
	["nestSelf", null],
	["nestPair", null],
	["nestOptions", null],
	["nestSingleQuotes", null],
	["nestBadJson", null],
	["nestFormatter", null],
	["nestMissing", null],
	["nestNs", null],
	["nestVar", { values: { name: "Inherited" } }],
	["nestLng", null],
	["showLng", null],
	["nestTwice", null],
	["nestWhole", null],
	["nestWholeBool", null],
	["nestEmpty", null],
	["nestObject", null],
	["nestDefault", { values: { name: "Dee" } }],
	["nestInterpolatedOptions", { values: { name: "Q\"uote" } }],
	["nestInterpolatedOptions", { values: { name: "Plain" } }],
	["nestNested", null],
	["nestUnicode", null],
	["nestSkip", { values: { name: "Skipped" } }],
	["nestNoNest", null],
	["nestLngOption", null],
	["nestBraceNoComma", null],
	["nestBraceText", null],
	["unicode", { values: { a: "😀😀", b: "ß" } }],
	["unicode", { values: { a: "", b: "x" } }],
	["terminators", { values: { a: "A", "a\nb": "nl" } }],
	["injection", { values: { a: "{{b}}", b: "<i>" } }],
	["dollar", { values: { price: "$5 $& $' $`" } }],
	["escapes", { values: { html: `<a href="/x?a=1&b='2'">` } }],
	["colon", { values: { x: "X" } }],
	["bothDefault", { defaultValue: "dv" }],
	["many", { values: { x: "y" } }],
	["nestedVar", { values: { "user.name": "flat dotted value" } }],
	["hierarchy", null],
	["onlyEn", null],
	["ptOnly", null],
	["widgetOnly", null],
	["shared", null],
	["targetOnly", null],
	["WIDGET.NEXT", null],
	["TARGET.owl", null],
	["widget:widgetOnly", null],
	["target:shared", null],
	["translation:shared", null],
	["unknown:plain", null],
	["missingKey", null],
	["missingKey", { defaultValue: "Default {{name}}", values: { name: "V" } }],
	["missingKey", { defaultValue: "" }],
	["Some {{name}} key", { values: { name: "free" } }],
	["plain", { lng: "de" }],
	["plain", { lng: "pt-BR" }],
	["plain", { lng: "pt-br" }],
	["plain", { lng: "zh-Hant-TW" }],
	["plain", { lng: "xx" }],
	["greet", { values: { name: 1.5 } }],
	["greet", { values: { name: 1e21 } }],
	["greet", { values: { name: -0 } }],
	["greet", { values: { name: 0.1 } }],
	["greet", { values: { name: 123456789012 } }],
	["greet", { values: { name: true } }],
	["greet", { values: { name: false } }],
	["greet", { values: { name: null } }],
	["greet", { values: { name: "" } }],
];

const SYNTHETIC_LANGUAGES: readonly string[] = ["en", "de", "pt-BR", "zh-TW"];

const callOptions = (options: CallOptions | null): Record<string, unknown> => ({
	...(options?.values ?? {}),
	...(options?.lng !== undefined ? { lng: options.lng } : {}),
	...(options?.defaultValue !== undefined
		? { defaultValue: options.defaultValue }
		: {}),
});

const fixedInstance = async (instance: i18n, language: string): Promise<i18n> => {
	const clone: i18n = instance.cloneInstance({ initAsync: false });
	await clone.changeLanguage(language);
	return clone;
};

const callResult = (value: unknown): string | number | boolean =>
	typeof value === "number" || typeof value === "boolean" ? value : String(value);

const call = (instance: i18n, key: string, options: CallOptions | null): Call => [
	key,
	options,
	callResult(options === null ? instance.t(key) : instance.t(key, callOptions(options))),
	options === null ? instance.exists(key) : instance.exists(key, callOptions(options)),
];

const group = async (
	instance: i18n,
	name: Instance,
	language: string,
	calls: readonly [string, CallOptions | null][],
): Promise<TranslationGroup> => {
	const clone: i18n = await fixedInstance(instance, language);
	return {
		instance: name,
		language,
		resolvedLanguage: clone.language,
		calls: calls.map(([key, options]: [string, CallOptions | null]) =>
			call(clone, key, options),
		),
	};
};

const plain = (keys: readonly string[]): [string, CallOptions | null][] =>
	keys.map((key: string): [string, CallOptions | null] => [key, null]);

const sharedServerOptions: InitOptions = {
	...i18nSharedOptions,
	supportedLngs: [...LanguageCodes],
	ns: [NAMESPACES.server, NAMESPACES.widget, NAMESPACES.target],
	defaultNS: NAMESPACES.server,
	fallbackNS: [NAMESPACES.widget, NAMESPACES.target],
};

const syntheticInstance = async (escapeValue: boolean): Promise<i18n> => {
	const instance: i18n = i18next.createInstance();
	await instance.init({
		...sharedServerOptions,
		resources: syntheticResources,
		interpolation: { escapeValue },
	});
	return instance;
};

const fileVectors = async (files: i18n): Promise<TranslationGroup[]> => {
	const groups: TranslationGroup[] = [];
	for (const [index, language] of LanguageCodes.entries()) {
		const withPlaceholders: boolean =
			index % 4 === 0 || PLACEHOLDER_LANGUAGES.includes(language);
		groups.push(
			await group(files, "files", language, [
				...plain(SAMPLE_KEYS),
				...(withPlaceholders ? PLACEHOLDER_KEYS : []).map(
					(key: string): [string, CallOptions] => [key, { values: PLACEHOLDER_VALUES }],
				),
			]),
		);
	}
	groups.push(await group(files, "files", "de", plain(translationKeys)));
	for (const language of ["en", "de", "pt-BR", "zh-TW"]) {
		groups.push(
			await group(files, "files", language, [
				...plain(EDGE_KEYS),
				["API.NOT_A_REAL_KEY", { defaultValue: "Server <message>" }],
				["WIDGET.NEXT", { defaultValue: "unused" }],
			]),
		);
	}
	groups.push(
		await group(
			files,
			"files",
			"en",
			LNG_OPTIONS.flatMap((lng: string): [string, CallOptions][] =>
				["WIDGET.NEXT", "TARGET.owl", "WIDGET"].map(
					(key: string): [string, CallOptions] => [key, { lng }],
				),
			),
		),
	);
	for (const language of CHANGE_LANGUAGES) {
		groups.push(await group(files, "files", language, plain(["WIDGET.NEXT", "WIDGET"])));
	}
	return groups;
};

const syntheticVectors = async (): Promise<TranslationGroup[]> => {
	const groups: TranslationGroup[] = [];
	const escaped: i18n = await syntheticInstance(true);
	for (const language of SYNTHETIC_LANGUAGES) {
		groups.push(await group(escaped, "synthetic", language, SYNTHETIC_CALLS));
	}
	const unescaped: i18n = await syntheticInstance(false);
	groups.push(await group(unescaped, "syntheticUnescaped", "en", SYNTHETIC_CALLS));
	return groups;
};

const ACCEPT_LANGUAGES: readonly string[] = [
	"",
	"en",
	"tr-TR,tr;q=0.9",
	"de-AT",
	"fr-CA, fr;q=0.9, en;q=0.8",
	"*",
	"xx",
	"nb-NO",
	"nn",
	"zh",
	"zh-SG",
	"zh-TW",
	"zh-Hant",
	"zh-hant-hk",
	"zh-Hans-TW",
	"zh-MO",
	"pt-BR",
	"pt-br",
	"pt-PT",
	"iw-IL",
	"in",
	"jw",
	"tl",
	"es-419",
	"sr-Latn-RS",
	"ca-valencia",
	"en-US,en;q=0.9",
	"en;q=0, de",
	"de;q=0.5, fr;q=0.5, it;q=0.6",
	"de;Q=0.7, fr;q=0.6",
	"de;q=abc, fr",
	"de;q=1.5, fr;q=0.1",
	"de;q=1., fr",
	"de;q=.5, fr;q=0.4",
	"de;q=0.5;q=0.9, fr;q=0.6",
	"de;level=1",
	" ,  , ",
	"../tr, tr",
	"x1,x2,x3,x4,x5,x6,x7,x8,x9,xa,de",
	"en-",
	"-en, de",
	"de-DE-u-co-phonebk",
	"i-klingon",
	"\ufeffde",
	"\u00a0de",
	"\u0085de",
	" de",
	"DE-de",
	"ZH-HK",
	"ar-EG",
	"fil-PH",
	"sco",
	"ast-ES",
	",de",
	"de;",
	"de; q=0.5 , fr ; q=0.6",
	"q=0.5",
	"de;q=0",
	"de;q=0.0001",
	"de;q=1.0000",
	"de;q=001",
	"de;q=1e0",
	"de;q= 0.5",
	"de;q=0.5 ;x=1",
	"abcdefghi, de",
	"en-abcdefghi, de",
	"toString, de",
	"zh-yue-HK",
	"zh-CN-Hant",
	"zh-Hant-CN",
	"pt-Latn-BR",
];

const TAGS: readonly string[] = [
	"tr",
	"tr-TR",
	"TR-tr",
	"pt-BR",
	"pt-br",
	"pt-PT",
	"zh-CN",
	"zh-Hans-CN",
	"zh-Hans-TW",
	"zh-SG",
	"zh-TW",
	"zh-tw",
	"zh-HK",
	"zh-MO",
	"zh-Hant",
	"zh-Hant-TW",
	"zh-Hant-HK",
	"zh-Hant-MO",
	"ZH-HANT-tw",
	"zh-hans-hk",
	"zh-hk-hans",
	"zh-yue-HK",
	"nb",
	"NB",
	"nb-NO",
	"nn-NO",
	"no",
	"no-NO",
	"in",
	"in-ID",
	"jw",
	"jw-ID",
	"iw",
	"iw-IL",
	"tl",
	"tl-PH",
	"fy-NL",
	"ga-IE",
	"ca-valencia",
	"es-419",
	"sr-Latn",
	"en-GB",
	"en-GB-oxendict",
	"xx",
	"xx-TR",
	"",
	"../tr",
	"toString",
	"constructo",
	"a",
	"abcdefghi",
	"en-abcdefghi",
	"x-private",
	"en_GB",
	"e1",
	"ast",
	"sco-GB",
	"fil",
	"pt-BR-x-y",
	"pt-Latn-BR",
	" de",
	"de ",
];

type RequestCase = { query?: Record<string, unknown>; headers?: Record<string, string | string[] | undefined> };

const REQUESTS: readonly RequestCase[] = [
	{},
	{ query: {}, headers: {} },
	{ query: { lng: "tr" }, headers: { "prosopo-lang": "de", "accept-language": "fr" } },
	{ query: {}, headers: { "prosopo-lang": "de", "accept-language": "fr" } },
	{ headers: { "accept-language": "fr" } },
	{ query: { lng: "xx" }, headers: { "prosopo-lang": "yy", "accept-language": "tr-TR,en;q=0.5" } },
	{ query: { lng: ["tr", "de"] }, headers: { "prosopo-lang": ["fr"] } },
	{ headers: { "prosopo-lang": ["fr", "de"] } },
	{ query: { lng: { nested: "tr" } }, headers: { "accept-language": "de" } },
	{ query: { lng: [1, "tr"] }, headers: { "accept-language": "de" } },
	{ query: { lng: 5 }, headers: { "accept-language": "de" } },
	{ query: { lng: "" }, headers: { "prosopo-lang": "", "accept-language": "de" } },
	{ headers: { "accept-language": "xx" } },
	{ headers: { "Prosopo-Lang": "tr", "accept-language": "de" } },
	{ headers: { "prosopo-lang": undefined, "accept-language": "de" } },
	{ query: { lng: "zh-Hant, de" } },
	{ query: { lng: "nb" }, headers: { "accept-language": "de" } },
	{ headers: { "prosopo-lang": "xx, zh-MO", "accept-language": "de" } },
];

const HTTP_CASES: readonly { query: string; headers: Record<string, string> }[] = [
	{ query: "", headers: {} },
	{ query: "", headers: { "Accept-Language": "tr-TR,tr;q=0.9" } },
	{ query: "", headers: { "Prosopo-Lang": "tr", "Accept-Language": "no" } },
	{ query: "?lng=no", headers: { "Prosopo-Lang": "tr", "Accept-Language": "tr" } },
	{ query: "", headers: { "Prosopo-Lang": "xx", "Accept-Language": "tr" } },
	{ query: "", headers: { "Prosopo-Lang": "nb-NO" } },
	{ query: "", headers: { "Accept-Language": "zh-SG" } },
	{ query: "", headers: { "Accept-Language": "zh-TW, de;q=0.8" } },
	{ query: "", headers: { "Accept-Language": "xx" } },
	{ query: "", headers: { Cookie: "i18next=tr", "Accept-Language": "no" } },
	{ query: "", headers: { Cookie: "i18next=tr" } },
	{ query: "?lng=tr&lng=de", headers: {} },
	{ query: "?lng[]=de", headers: {} },
	{ query: "?lng[x]=de", headers: { "Accept-Language": "fr" } },
	{ query: "?lng=", headers: { "Accept-Language": "fr" } },
	{ query: "?LNG=tr", headers: {} },
	{ query: "?lng=zh-tw", headers: {} },
	{ query: "?lng=tr%2Cde", headers: {} },
	{ query: "?lng=xx,de;q=0.5", headers: {} },
	{ query: "?lng=..%2Ftr", headers: {} },
	{ query: "", headers: { "Prosopo-Lang": "pt-br", "Accept-Language": "de" } },
	{ query: "", headers: { "Prosopo-Lang": "zh-Hant-HK" } },
	{ query: "", headers: { "Accept-Language": "ar-EG,ar;q=0.9" } },
	{ query: "", headers: { "Accept-Language": "*" } },
	{ query: "", headers: { "Accept-Language": "fil-PH, tl;q=0.9" } },
];

const HTTP_KEYS: readonly string[] = [
	"TARGET.owl",
	"WIDGET.SELECT_ALL",
	"DATABASE.UNKNOWN",
	"API.USER_NOT_VERIFIED",
];

const firstString = (value: unknown): string | null => {
	if (typeof value === "string") {
		return value;
	}
	if (Array.isArray(value) && typeof value[0] === "string") {
		return value[0];
	}
	return null;
};

const httpVectors = async (): Promise<HttpVector[]> => {
	const app = express();
	app.use(await i18nMiddleware({}));
	app.get("/", (req: Request, res: Response): void => {
		const translations: Record<string, string> = {};
		const exists: Record<string, boolean> = {};
		for (const key of HTTP_KEYS) {
			translations[key] = String(req.t(key));
			exists[key] = req.i18n.exists(key);
		}
		res.json({
			parsedQueryLng: toJson(req.query.lng),
			prosopoLang: firstString(req.headers["prosopo-lang"]),
			acceptLanguage: firstString(req.headers["accept-language"]),
			language: req.language,
			translations,
			exists,
		});
	});
	const server: Server = await new Promise<Server>((resolve) => {
		const listening: Server = app.listen(0, "127.0.0.1", () => resolve(listening));
	});
	const address: AddressInfo | string | null = server.address();
	if (address === null || typeof address === "string") {
		throw new Error(`expected a TCP address, got ${address}`);
	}
	const vectors: HttpVector[] = [];
	for (const { query, headers } of HTTP_CASES) {
		const response = await fetch(`http://127.0.0.1:${address.port}/${query}`, {
			headers,
		});
		const body: Omit<HttpVector, "query" | "headers" | "contentLanguage" | "setCookie"> =
			await response.json();
		vectors.push({
			query,
			headers,
			...body,
			contentLanguage: response.headers.get("content-language"),
			setCookie: response.headers.get("set-cookie"),
		});
	}
	await new Promise<void>((resolve) => server.close(() => resolve()));
	return vectors;
};

const LEAF_TREES: readonly TranslationNode[] = [
	"a string",
	"",
	{},
	{ topLevel: "value" },
	{ section: { key: "value" } },
	{ section: { first: "1", second: "2", third: "3" } },
	{ a: { b: { c: { d: "leaf" } } } },
	{ shallow: { key: "v" }, deep: { nested: { key: "v" } } },
	{ section: {} },
	{ empty: {}, full: { key: "v" } },
	{ b: "1", "2": "two", a: "3", "1": "one", "01": "zero-one" },
];

const ERROR_MESSAGES: readonly { message: string; key?: string }[] = [
	{ message: "Invalid site key", key: "API.INVALID_SITE_KEY" },
	{ message: "upstream timed out", key: "API.NOT_A_REAL_KEY" },
	{ message: "Datenbankfehler", key: "DATABASE.UNKNOWN" },
	{ message: "Invalid site key" },
	{ message: "Invalid site key", key: "" },
	{ message: "Owl", key: "TARGET.owl" },
	{ message: "<b>", key: "WIDGET.NEXT" },
];

const main = async (): Promise<void> => {
	await loadI18next(true);
	await i18next.loadLanguages([...LanguageCodes]);
	const files: i18n = i18next;

	const errorMessages: { language: string; message: string; key: string | null; result: string }[] =
		[];
	for (const language of ["de", "tr", "en"]) {
		const clone: i18n = await fixedInstance(files, language);
		for (const error of ERROR_MESSAGES) {
			errorMessages.push({
				language,
				message: error.message,
				key: error.key ?? null,
				result: localiseErrorMessage(clone, error),
			});
		}
	}

	const data = {
		parseLanguageList: ACCEPT_LANGUAGES.map((input: string) => ({
			input,
			output: parseLanguageList(input),
		})),
		matchLanguageTag: TAGS.map((tag: string) => ({
			tag,
			output: matchLanguageTag(tag) ?? null,
		})),
		languageHeaders: [
			["tr-TR", "en"],
			["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"],
			["tr", "bad tag", "en"],
			[],
			["not a tag"],
		].map((preferences: string[]) => ({
			preferences,
			output: languageHeaders(preferences),
		})),
		requestLanguage: [
			...REQUESTS.map((request: RequestCase) => ({
				queryLng: firstString(request.query?.lng),
				prosopoLang: firstString(request.headers?.["prosopo-lang"]),
				acceptLanguage: firstString(request.headers?.["accept-language"]),
				output: requestLanguage(request satisfies LanguageRequest),
			})),
			...ACCEPT_LANGUAGES.map((acceptLanguage: string) => ({
				queryLng: null,
				prosopoLang: null,
				acceptLanguage,
				output: requestLanguage({ headers: { "accept-language": acceptLanguage } }),
			})),
		],
		http: await httpVectors(),
		translationKeys,
		targetKeys,
		keyChecks: [...EDGE_KEYS, "owl", "fire-hydrant", "Owl", "WIDGET.I_AM_HUMAN"].map(
			(value: string) => ({
				value,
				isTranslationKey: isTranslationKey(value),
				isWidgetTranslationKey: isWidgetTranslationKey(value),
				isTargetKey: isTargetKey(value),
				englishText: isTranslationKey(value) ? englishText(value) : value,
			}),
		),
		leafPaths: LEAF_TREES.map((tree: TranslationNode) => ({
			tree,
			output: getLeafFieldPath(tree),
		})),
		errorMessages,
		syntheticResources,
		translations: [...(await fileVectors(files)), ...(await syntheticVectors())],
	};

	const output: string = fileURLToPath(new URL("./vectors.json", import.meta.url));
	writeFileSync(output, `${JSON.stringify(data, null, "\t")}\n`);
};

await main();
