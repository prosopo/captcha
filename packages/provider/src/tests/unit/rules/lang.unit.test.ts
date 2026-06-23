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

import type { ProsopoConfigOutput } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import { checkLangRules } from "../../../rules/lang.js";

describe("checkLangRules", () => {
	it("should return 0 when lRules is undefined", () => {
		const config = {} as unknown as ProsopoConfigOutput;
		const result = checkLangRules(config, "en-US,en;q=0.9");
		expect(result).toBe(0);
	});

	it("should return 0 when lRules is null", () => {
		const config = { lRules: null } as unknown as ProsopoConfigOutput;
		const result = checkLangRules(config, "en-US,en;q=0.9");
		expect(result).toBe(0);
	});

	it("should return 0 when lRules is empty", () => {
		const config = {
			lRules: {},
		} as unknown as ProsopoConfigOutput;
		const result = checkLangRules(config, "en-US,en;q=0.9");
		expect(result).toBe(0);
	});

	it("should return score for matching language", () => {
		const config = {
			lRules: {
				en: 10,
			},
		} as unknown as ProsopoConfigOutput;
		const result = checkLangRules(config, "en-US,en;q=0.9");
		expect(result).toBe(10);
	});

	it("should return score for first matching language in list", () => {
		const config = {
			lRules: {
				en: 10,
				fr: 5,
			},
		} as unknown as ProsopoConfigOutput;
		const result = checkLangRules(config, "en-US,fr;q=0.8");
		expect(result).toBe(5);
	});

	it("should sum scores for multiple matching languages", () => {
		const config = {
			lRules: {
				en: 10,
				fr: 5,
			},
		} as unknown as ProsopoConfigOutput;
		const result = checkLangRules(config, "fr,en");
		expect(result).toBe(15);
	});

	it("should handle language codes with region", () => {
		const config = {
			lRules: {
				"en-US": 10,
				en: 5,
			},
		} as unknown as ProsopoConfigOutput;
		const result = checkLangRules(config, "en-US,en;q=0.9");
		expect(result).toBe(15);
	});

	it("should handle language with quality value", () => {
		const config = {
			lRules: {
				en: 10,
			},
		} as unknown as ProsopoConfigOutput;
		const result = checkLangRules(config, "en;q=0.9");
		expect(result).toBe(10);
	});

	it("should ignore non-matching languages", () => {
		const config = {
			lRules: {
				en: 10,
				fr: 5,
			},
		} as unknown as ProsopoConfigOutput;
		const result = checkLangRules(config, "de,es;q=0.8");
		expect(result).toBe(0);
	});

	it("should handle single language without comma", () => {
		const config = {
			lRules: {
				en: 10,
			},
		} as unknown as ProsopoConfigOutput;
		const result = checkLangRules(config, "en");
		expect(result).toBe(10);
	});

	it("should handle empty acceptLanguage string", () => {
		const config = {
			lRules: {
				en: 10,
			},
		} as unknown as ProsopoConfigOutput;
		const result = checkLangRules(config, "");
		expect(result).toBe(0);
	});

	it("should handle whitespace in language list", () => {
		const config = {
			lRules: {
				en: 10,
				fr: 5,
			},
		} as unknown as ProsopoConfigOutput;
		const result = checkLangRules(config, " en , fr ");
		expect(result).toBe(15);
	});

	it("should handle multiple quality values", () => {
		const config = {
			lRules: {
				en: 10,
				fr: 5,
			},
		} as unknown as ProsopoConfigOutput;
		const result = checkLangRules(config, "en;q=0.9,fr;q=0.8");
		expect(result).toBe(15);
	});

	it("should handle complex accept-language header", () => {
		const config = {
			lRules: {
				en: 10,
				fr: 5,
				de: 8,
			},
		} as unknown as ProsopoConfigOutput;
		const result = checkLangRules(
			config,
			"fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5",
		);
		expect(result).toBe(23); // fr (5) + en (10) + de (8) = 23
	});

	it("should handle malformed quality values", () => {
		const config = {
			lRules: {
				en: 10,
			},
		} as unknown as ProsopoConfigOutput;
		const result = checkLangRules(config, "en;q=,fr;q=0.8");
		expect(result).toBe(10); // 'en' should still match
	});

	it("should handle duplicate languages", () => {
		const config = {
			lRules: {
				en: 10,
			},
		} as unknown as ProsopoConfigOutput;
		const result = checkLangRules(config, "en,en;q=0.9,en;q=0.8");
		expect(result).toBe(30); // Should count each occurrence
	});

	it("should ignore empty language entries", () => {
		const config = {
			lRules: {
				en: 10,
			},
		} as unknown as ProsopoConfigOutput;
		const result = checkLangRules(config, "en,,fr,");
		expect(result).toBe(10);
	});

	it("should handle languages with subtags", () => {
		const config = {
			lRules: {
				"zh-CN": 15,
				zh: 10,
				en: 5,
			},
		} as unknown as ProsopoConfigOutput;
		const result = checkLangRules(config, "zh-CN,zh;q=0.9,en;q=0.8");
		expect(result).toBe(30); // zh-CN (15) + zh (10) + en (5) = 30
	});

	it("should return 0 for null or undefined acceptLanguage", () => {
		const config = {
			lRules: {
				en: 10,
			},
		} as unknown as ProsopoConfigOutput;

		// @ts-ignore - Testing invalid input
		expect(checkLangRules(config, null)).toBe(0);
		// @ts-ignore - Testing invalid input
		expect(checkLangRules(config, undefined)).toBe(0);
	});

	it("should handle very long accept-language strings", () => {
		const config = {
			lRules: {
				en: 1,
			},
		} as unknown as ProsopoConfigOutput;

		const longAcceptLanguage = `${"en,".repeat(100)}fr`;
		const result = checkLangRules(config, longAcceptLanguage);
		expect(result).toBe(100); // 100 occurrences of 'en'
	});

	it("should be case sensitive for language matching", () => {
		const config = {
			lRules: {
				en: 10,
				EN: 5,
			},
		} as unknown as ProsopoConfigOutput;

		expect(checkLangRules(config, "en")).toBe(10);
		expect(checkLangRules(config, "EN")).toBe(5);
	});

	it("should handle languages with multiple dashes", () => {
		const config = {
			lRules: {
				"en-US-posix": 20,
				"en-US": 15,
				en: 10,
			},
		} as unknown as ProsopoConfigOutput;

		const result = checkLangRules(config, "en-US-posix,en-US;q=0.9,en;q=0.8");
		expect(result).toBe(45); // 20 + 15 + 10
	});
});
