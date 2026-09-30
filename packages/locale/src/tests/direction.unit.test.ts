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

import { describe, expect, test } from "vitest";
import { getLanguageDirection } from "../direction.js";
import { LanguageCodes } from "../translations.js";

describe("getLanguageDirection", () => {
	test("is rtl for Arabic", () => {
		expect(getLanguageDirection("ar")).toBe("rtl");
	});

	test("is rtl for regional and differently-cased Arabic tags", () => {
		expect(getLanguageDirection("ar-EG")).toBe("rtl");
		expect(getLanguageDirection("AR_sa")).toBe("rtl");
	});

	test("is rtl for other right-to-left scripts", () => {
		for (const language of ["he", "fa", "ur", "yi"]) {
			expect(getLanguageDirection(language)).toBe("rtl");
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

	test("matches only the primary subtag", () => {
		expect(getLanguageDirection("en-AR")).toBe("ltr");
	});
});
