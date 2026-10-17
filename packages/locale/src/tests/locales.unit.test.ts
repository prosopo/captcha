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

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NAMESPACES, type Namespace } from "../translationKey.js";
import { type Language, Languages } from "../translations.js";
import { keptAsIs } from "./keptAsIs.js";

type TranslationTree = { [key: string]: unknown };

const namespaces: readonly Namespace[] = Object.values(NAMESPACES);

const readNamespace = (locale: string, namespace: Namespace): TranslationTree =>
	JSON.parse(
		fs.readFileSync(
			path.resolve(`./src/locales/${locale}/${namespace}.json`),
			"utf8",
		),
	);

/** All of a language's namespace files as one tree; keys never overlap. */
const readLocale = (locale: string): TranslationTree =>
	Object.assign(
		{},
		...namespaces.map((namespace: Namespace) =>
			readNamespace(locale, namespace),
		),
	);

const isTree = (value: unknown): value is TranslationTree =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** Every leaf as a dotted path; non-string leaves are kept so they can fail. */
const flatten = (tree: TranslationTree, prefix = ""): Map<string, unknown> =>
	new Map(
		Object.entries(tree).flatMap(
			([key, value]): Array<[string, unknown]> =>
				isTree(value)
					? [...flatten(value, `${prefix}${key}.`)]
					: [[`${prefix}${key}`, value]],
		),
	);

// Languages not written in Latin script must use their own script, so an
// English word pasted into e.g. the Thai catalogue is caught.
const scripts: Partial<Record<Language, RegExp>> = {
	am: /\p{Script=Ethiopic}/u,
	ar: /\p{Script=Arabic}/u,
	as: /\p{Script=Bengali}/u,
	be: /\p{Script=Cyrillic}/u,
	bg: /\p{Script=Cyrillic}/u,
	bn: /\p{Script=Bengali}/u,
	el: /\p{Script=Greek}/u,
	fa: /\p{Script=Arabic}/u,
	gu: /\p{Script=Gujarati}/u,
	he: /\p{Script=Hebrew}/u,
	hi: /\p{Script=Devanagari}/u,
	hy: /\p{Script=Armenian}/u,
	ja: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u,
	ka: /\p{Script=Georgian}/u,
	kk: /\p{Script=Cyrillic}/u,
	km: /\p{Script=Khmer}/u,
	kn: /\p{Script=Kannada}/u,
	ko: /\p{Script=Hangul}/u,
	ky: /\p{Script=Cyrillic}/u,
	lo: /\p{Script=Lao}/u,
	mk: /\p{Script=Cyrillic}/u,
	ml: /\p{Script=Malayalam}/u,
	mn: /\p{Script=Cyrillic}/u,
	mr: /\p{Script=Devanagari}/u,
	my: /\p{Script=Myanmar}/u,
	ne: /\p{Script=Devanagari}/u,
	or: /\p{Script=Oriya}/u,
	pa: /\p{Script=Gurmukhi}/u,
	ru: /\p{Script=Cyrillic}/u,
	si: /\p{Script=Sinhala}/u,
	sr: /\p{Script=Cyrillic}/u,
	ta: /\p{Script=Tamil}/u,
	te: /\p{Script=Telugu}/u,
	tg: /\p{Script=Cyrillic}/u,
	th: /\p{Script=Thai}/u,
	uk: /\p{Script=Cyrillic}/u,
	ur: /\p{Script=Arabic}/u,
	zh: /\p{Script=Han}/u,
	"zh-CN": /\p{Script=Han}/u,
	"zh-HK": /\p{Script=Han}/u,
	"zh-TW": /\p{Script=Han}/u,
};

// A Latin letter inside a Cyrillic or Greek word is a look-alike typo
// (e.g. Latin "a" in "бубa") that renders fine but breaks search and speech.
const homoglyphScripts: Partial<Record<Language, RegExp>> = {
	be: /\p{Script=Cyrillic}/u,
	bg: /\p{Script=Cyrillic}/u,
	el: /\p{Script=Greek}/u,
	kk: /\p{Script=Cyrillic}/u,
	ky: /\p{Script=Cyrillic}/u,
	mk: /\p{Script=Cyrillic}/u,
	mn: /\p{Script=Cyrillic}/u,
	ru: /\p{Script=Cyrillic}/u,
	sr: /\p{Script=Cyrillic}/u,
	tg: /\p{Script=Cyrillic}/u,
	uk: /\p{Script=Cyrillic}/u,
};

const en: Map<string, unknown> = flatten(readLocale("en"));
const languages: Language[] = Object.values(Languages);
const others: Language[] = languages.filter(
	(language: Language) => language !== Languages.english,
);

const leafName = (key: string): string => key.slice(key.lastIndexOf(".") + 1);

const keptFor = (language: Language): ReadonlySet<string> =>
	new Set(keptAsIs[language] ?? []);

describe("locale catalogues", () => {
	it.each(languages)(
		"%s has one file per namespace, each with the keys of en's",
		(language: Language) => {
			const files: string[] = fs
				.readdirSync(path.resolve(`./src/locales/${language}`))
				.sort();
			expect(files).toEqual(
				namespaces.map((namespace: Namespace) => `${namespace}.json`).sort(),
			);
			for (const namespace of namespaces) {
				expect(
					[...flatten(readNamespace(language, namespace)).keys()].sort(),
					`${language}/${namespace}.json`,
				).toEqual([...flatten(readNamespace("en", namespace)).keys()].sort());
			}
		},
	);

	it.each(languages)("%s has exactly the keys of en", (language: Language) => {
		const keys: string[] = [...flatten(readLocale(language)).keys()];
		expect(keys.filter((key: string) => !en.has(key))).toEqual([]);
		expect([...en.keys()].filter((key: string) => !keys.includes(key))).toEqual(
			[],
		);
	});

	it.each(languages)(
		"%s has a non-empty string for every key",
		(language: Language) => {
			const bad: string[] = [...flatten(readLocale(language))]
				.filter(
					([, value]: [string, unknown]) =>
						typeof value !== "string" || value.trim() === "",
				)
				.map(([key]: [string, unknown]) => key);
			expect(bad).toEqual([]);
		},
	);

	it.each(languages)(
		"%s has no unicode replacement characters",
		(language: Language) => {
			const bad: string[] = [...flatten(readLocale(language))]
				.filter(
					([, value]: [string, unknown]) =>
						typeof value === "string" && value.includes("�"),
				)
				.map(([key]: [string, unknown]) => key);
			expect(bad).toEqual([]);
		},
	);

	it.each(others)(
		"%s translates every value, apart from keptAsIs",
		(language: Language) => {
			const kept: ReadonlySet<string> = keptFor(language);
			const untranslated: string[] = [...flatten(readLocale(language))]
				.filter(
					([key, value]: [string, unknown]) =>
						!kept.has(key) &&
						(value === en.get(key) || value === leafName(key)),
				)
				.map(([key, value]: [string, unknown]) => `${key}: ${value}`);
			expect(untranslated).toEqual([]);
		},
	);

	it.each(others)(
		"%s keptAsIs entries still match en, so the list stays curated",
		(language: Language) => {
			const catalogue: Map<string, unknown> = flatten(readLocale(language));
			const stale: string[] = [...keptFor(language)].filter(
				(key: string) =>
					catalogue.get(key) !== en.get(key) &&
					catalogue.get(key) !== leafName(key),
			);
			expect(stale).toEqual([]);
		},
	);

	it.each(
		others.filter((language: Language) => scripts[language] !== undefined),
	)("%s writes every value in its own script", (language: Language) => {
		const script: RegExp | undefined = scripts[language];
		const kept: ReadonlySet<string> = keptFor(language);
		const wrong: string[] = [...flatten(readLocale(language))]
			.filter(
				([key, value]: [string, unknown]) =>
					!kept.has(key) &&
					typeof value === "string" &&
					script !== undefined &&
					!script.test(value),
			)
			.map(([key, value]: [string, unknown]) => `${key}: ${value}`);
		expect(wrong).toEqual([]);
	});

	it.each(
		others.filter(
			(language: Language) => homoglyphScripts[language] !== undefined,
		),
	)("%s has no Latin letters inside native words", (language: Language) => {
		const script: RegExp | undefined = homoglyphScripts[language];
		const mixed: string[] = [...flatten(readLocale(language))].flatMap(
			([key, value]: [string, unknown]): string[] =>
				typeof value !== "string" || script === undefined
					? []
					: (value.match(/\p{L}+/gu) ?? [])
							.filter(
								(word: string) =>
									script.test(word) && /\p{Script=Latin}/u.test(word),
							)
							.map((word: string) => `${key}: ${word}`),
		);
		expect(mixed).toEqual([]);
	});

	it.each(languages)(
		"%s ends the select-all prompt with a colon, as the label follows it",
		(language: Language) => {
			const prompt: unknown = flatten(readLocale(language)).get(
				"WIDGET.SELECT_ALL",
			);
			expect(prompt).toMatch(/[:：៖]$/);
		},
	);
});
