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
import { describe, expect, test } from "vitest";
import { LanguageCodes, Languages, isLanguage } from "../translations.js";

const codes: string[] = Object.values(Languages);

describe("Languages", () => {
	test("is non-empty", () => {
		expect(codes.length).toBeGreaterThan(0);
	});

	test("maps English language names to BCP 47 codes", () => {
		expect(Languages.english).toBe("en");
		expect(Languages.chinese).toBe("zh-CN");
		expect(Languages.portugeseBrazil).toBe("pt-BR");
	});

	test("includes the fallback language", () => {
		expect(codes).toContain("en");
	});

	// A duplicated code would silently make one of the language names
	// unreachable, while the locales-folder count test would still pass.
	test("has no duplicate codes", () => {
		expect(new Set(codes).size).toBe(codes.length);
	});

	test("every code is a well-formed, lowercase-primary language tag", () => {
		for (const code of codes) {
			expect(code).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
		}
	});

	test("every code has a locales directory containing translation.json", () => {
		for (const code of codes) {
			const file = path.resolve(`./src/locales/${code}/translation.json`);
			expect(fs.existsSync(file), `missing ${code}`).toBe(true);
		}
	});

	test("every locales directory is claimed by a code — no orphans", () => {
		const dirs = fs.readdirSync(path.resolve("./src/locales"));
		for (const dir of dirs) {
			expect(codes, `orphan locale directory ${dir}`).toContain(dir);
		}
	});
});

describe("isLanguage", () => {
	test("accepts every declared code", () => {
		for (const code of codes) {
			expect(isLanguage(code)).toBe(true);
		}
	});

	test("every declared code is in LanguageCodes", () => {
		expect(new Set(LanguageCodes)).toEqual(new Set(codes));
	});

	test("exposes each code as a constant for use in code", () => {
		expect(Languages.english).toBe("en");
	});

	test("rejects an undeclared language code", () => {
		expect(isLanguage("xx")).toBe(false);
	});

	test("rejects the empty string", () => {
		expect(isLanguage("")).toBe(false);
	});

	// i18next treated `en-GB` as a region of `en`, and the browser i18n resolves
	// a regional tag to its base language before asking — so a regional variant
	// is deliberately not itself a declared code.
	test("rejects a regional variant of a supported language", () => {
		expect(isLanguage("en-GB")).toBe(false);
	});

	test("is case sensitive — `EN` is not `en`", () => {
		expect(isLanguage("EN")).toBe(false);
	});
});
