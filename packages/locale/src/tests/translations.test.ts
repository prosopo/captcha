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

import { describe, expect, test } from "vitest";
import { Languages, LanguageSchema } from "../translations.js";

describe("translations", () => {
	describe("Languages", () => {
		test("should contain all expected language codes", () => {
			expect(Languages.arabic).toBe("ar");
			expect(Languages.azerbaijani).toBe("az");
			expect(Languages.czech).toBe("cs");
			expect(Languages.german).toBe("de");
			expect(Languages.greek).toBe("el");
			expect(Languages.english).toBe("en");
			expect(Languages.spanish).toBe("es");
			expect(Languages.finnish).toBe("fi");
			expect(Languages.french).toBe("fr");
			expect(Languages.hindi).toBe("hi");
			expect(Languages.hungarian).toBe("hu");
			expect(Languages.indonesian).toBe("id");
			expect(Languages.italian).toBe("it");
			expect(Languages.japanese).toBe("ja");
			expect(Languages.javanese).toBe("jv");
			expect(Languages.korean).toBe("ko");
			expect(Languages.malayalam).toBe("ml");
			expect(Languages.malay).toBe("ms");
			expect(Languages.dutch).toBe("nl");
			expect(Languages.norwegian).toBe("no");
			expect(Languages.polish).toBe("pl");
			expect(Languages.portugeseBrazil).toBe("pt-BR");
			expect(Languages.portuguese).toBe("pt");
			expect(Languages.romanian).toBe("ro");
			expect(Languages.russian).toBe("ru");
			expect(Languages.serbian).toBe("sr");
			expect(Languages.swedish).toBe("sv");
			expect(Languages.thai).toBe("th");
			expect(Languages.turkish).toBe("tr");
			expect(Languages.ukrainian).toBe("uk");
			expect(Languages.vietnamese).toBe("vi");
			expect(Languages.chinese).toBe("zh-CN");
		});

		test("should have all values as unique strings", () => {
			const values = Object.values(Languages);
			const uniqueValues = new Set(values);
			expect(values.length).toBe(uniqueValues.size);
			values.forEach((value) => {
				expect(typeof value).toBe("string");
				expect(value.length).toBeGreaterThan(0);
			});
		});

		test("should have all keys as string properties", () => {
			Object.keys(Languages).forEach((key) => {
				expect(typeof Languages[key as keyof typeof Languages]).toBe("string");
			});
		});
	});

	describe("LanguageSchema", () => {
		test("should validate all language codes from Languages", () => {
			Object.values(Languages).forEach((lang) => {
				expect(LanguageSchema.safeParse(lang).success).toBe(true);
			});
		});

		test("should reject invalid language codes", () => {
			expect(LanguageSchema.safeParse("invalid").success).toBe(false);
			expect(LanguageSchema.safeParse("").success).toBe(false);
			expect(LanguageSchema.safeParse("xx").success).toBe(false);
			expect(LanguageSchema.safeParse(null).success).toBe(false);
			expect(LanguageSchema.safeParse(undefined).success).toBe(false);
			expect(LanguageSchema.safeParse(123).success).toBe(false);
		});

		test("should parse valid language codes correctly", () => {
			const result = LanguageSchema.safeParse("en");
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe("en");
			}
		});

		test("should handle case sensitivity correctly", () => {
			expect(LanguageSchema.safeParse("EN").success).toBe(false);
			expect(LanguageSchema.safeParse("En").success).toBe(false);
		});
	});
});

