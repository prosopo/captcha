// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import type { ProsopoConfigOutput } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import { checkLangRules } from "../../../rules/lang.js";

describe("checkLangRules", () => {
	it("returns 0 when lRules is undefined", () => {
		const config = {} as ProsopoConfigOutput;
		const result = checkLangRules(config, "en-US,en;q=0.9");
		expect(result).toBe(0);
	});

	it("returns 0 when lRules is empty", () => {
		const config = {
			lRules: {},
		} as ProsopoConfigOutput;
		const result = checkLangRules(config, "en-US,en;q=0.9");
		expect(result).toBe(0);
	});

	it("returns score for matching language", () => {
		const config = {
			lRules: {
				en: 10,
			},
		} as ProsopoConfigOutput;
		const result = checkLangRules(config, "en-US,en;q=0.9");
		expect(result).toBe(10);
	});

	it("returns score for first matching language in list", () => {
		const config = {
			lRules: {
				en: 10,
				fr: 5,
			},
		} as ProsopoConfigOutput;
		const result = checkLangRules(config, "en-US,fr;q=0.8");
		expect(result).toBe(10);
	});

	it("sums scores for multiple matching languages", () => {
		const config = {
			lRules: {
				en: 10,
				fr: 5,
			},
		} as ProsopoConfigOutput;
		const result = checkLangRules(config, "fr,en");
		expect(result).toBe(15);
	});

	it("handles language with quality value", () => {
		const config = {
			lRules: {
				en: 10,
			},
		} as ProsopoConfigOutput;
		const result = checkLangRules(config, "en;q=0.9");
		expect(result).toBe(10);
	});

	it("ignores non-matching languages", () => {
		const config = {
			lRules: {
				en: 10,
				fr: 5,
			},
		} as ProsopoConfigOutput;
		const result = checkLangRules(config, "de,es");
		expect(result).toBe(0);
	});

	it("handles single language without comma", () => {
		const config = {
			lRules: {
				en: 10,
			},
		} as ProsopoConfigOutput;
		const result = checkLangRules(config, "en");
		expect(result).toBe(10);
	});

	it("handles empty acceptLanguage string", () => {
		const config = {
			lRules: {
				en: 10,
			},
		} as ProsopoConfigOutput;
		const result = checkLangRules(config, "");
		expect(result).toBe(0);
	});

	it("handles whitespace in language list", () => {
		const config = {
			lRules: {
				en: 10,
				fr: 5,
			},
		} as ProsopoConfigOutput;
		const result = checkLangRules(config, " en , fr ");
		expect(result).toBe(15);
	});

	it("handles language codes with region", () => {
		const config = {
			lRules: {
				"en-US": 10,
				en: 5,
			},
		} as ProsopoConfigOutput;
		const result = checkLangRules(config, "en-US,en;q=0.9");
		expect(result).toBe(10);
	});

	it("handles multiple quality values", () => {
		const config = {
			lRules: {
				en: 10,
				fr: 5,
			},
		} as ProsopoConfigOutput;
		const result = checkLangRules(config, "en;q=0.9,fr;q=0.8");
		expect(result).toBe(15);
	});
});

