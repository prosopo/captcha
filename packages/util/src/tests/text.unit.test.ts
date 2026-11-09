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
import { normaliseForMatching } from "../text.js";

describe("normaliseForMatching", () => {
	test("drops case, punctuation and whitespace", () => {
		expect(normaliseForMatching("  Example Hosting , Inc. ")).toBe(
			"examplehostinginc",
		);
		expect(normaliseForMatching("Example Hosting,Inc.")).toBe(
			"examplehostinginc",
		);
	});

	test("folds accents and full-width forms", () => {
		expect(normaliseForMatching("Ｔéléhost　Ｓ.Ａ.")).toBe("telehostsa");
	});

	test("keeps letters and digits from non-Latin scripts", () => {
		expect(normaliseForMatching("さくらインターネット 株式会社")).toBe(
			"さくらインターネット株式会社",
		);
		expect(normaliseForMatching("M247 Europe SRL")).toBe("m247europesrl");
	});

	test("returns an empty string for punctuation-only input", () => {
		expect(normaliseForMatching(" -., ")).toBe("");
	});
});
