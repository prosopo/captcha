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
import { Languages } from "../index.js";

type TranslationTree = { [key: string]: string | TranslationTree };

const readLocale = (locale: string): TranslationTree =>
	JSON.parse(
		fs.readFileSync(
			path.resolve(`./src/locales/${locale}/translation.json`),
			"utf8",
		),
	);

const flatten = (tree: TranslationTree, prefix = ""): Array<[string, string]> =>
	Object.entries(tree).flatMap(
		([key, value]): Array<[string, string]> =>
			typeof value === "string"
				? [[`${prefix}${key}`, value]]
				: flatten(value, `${prefix}${key}.`),
	);

const placeholders = (text: string): string[] =>
	(text.match(/\{\{[^}]*\}\}/g) ?? [])
		.map((token: string) => token.replace(/\s+/g, ""))
		.sort();

const en = new Map<string, string>(flatten(readLocale("en")));
const locales: string[] = Object.values(Languages).filter(
	(locale: string) => locale !== "en",
);

describe("locale interpolation placeholders", () => {
	it.each(locales)(
		"%s keeps every {{placeholder}} of the en source",
		(locale: string) => {
			const mismatches: string[] = flatten(readLocale(locale))
				.filter(
					([key, value]: [string, string]) =>
						en.has(key) &&
						placeholders(value).join() !==
							placeholders(en.get(key) ?? "").join(),
				)
				.map(([key, value]: [string, string]) => `${key}: ${value}`);
			expect(mismatches).toEqual([]);
		},
	);
});

// A tool once stripped every Devanagari vowel sign and virama from the Hindi
// file ("मैं मनुष्य हूँ" became "म मनषय ह"), which the key and placeholder
// checks cannot see.
describe("hi translations", () => {
	it("keep their Devanagari vowel signs", () => {
		const devanagariLetter = /[ऄ-हक़-ॡ]/gu;
		const sign = /[ऀ-ःऺ-ॏॕ-ॗॢॣ]/u;
		const stripped: string[] = flatten(readLocale("hi"))
			.filter(
				([, value]: [string, string]) =>
					(value.match(devanagariLetter) ?? []).length >= 4 &&
					!sign.test(value),
			)
			.map(([key, value]: [string, string]) => `${key}: ${value}`);
		expect(stripped).toEqual([]);
	});
});
