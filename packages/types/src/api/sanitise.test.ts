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
import { describe, expect, it } from "vitest";
import { INPUT_LIMITS, boundedString, safeLine, safeText } from "./sanitise.js";

describe("INPUT_LIMITS", () => {
	it("orders the limits from identifier sized up to token sized", () => {
		expect(INPUT_LIMITS.ID).toBeLessThan(INPUT_LIMITS.EMAIL);
		expect(INPUT_LIMITS.EMAIL).toBeLessThan(INPUT_LIMITS.URL);
		expect(INPUT_LIMITS.URL).toBeLessThan(INPUT_LIMITS.TEXT);
		expect(INPUT_LIMITS.TEXT).toBeLessThan(INPUT_LIMITS.LONG_TEXT);
		expect(INPUT_LIMITS.LONG_TEXT).toBeLessThan(INPUT_LIMITS.TOKEN);
	});

	it("keeps every limit positive", () => {
		for (const limit of Object.values(INPUT_LIMITS)) {
			expect(limit).toBeGreaterThan(0);
		}
	});
});

describe("boundedString", () => {
	it("accepts an empty string", () => {
		expect(boundedString().safeParse("").success).toBe(true);
	});

	it("accepts a string at the limit", () => {
		expect(boundedString(4).safeParse("abcd").success).toBe(true);
	});

	it("rejects a string one over the limit", () => {
		expect(boundedString(4).safeParse("abcde").success).toBe(false);
	});

	it("defaults to the text limit", () => {
		expect(
			boundedString().safeParse("a".repeat(INPUT_LIMITS.TEXT)).success,
		).toBe(true);
		expect(
			boundedString().safeParse("a".repeat(INPUT_LIMITS.TEXT + 1)).success,
		).toBe(false);
	});

	it("does not police the character set", () => {
		expect(boundedString().safeParse("a\u0000b").success).toBe(true);
	});

	it("rejects a non-string", () => {
		expect(boundedString().safeParse(1).success).toBe(false);
		expect(boundedString().safeParse({ $gt: "" }).success).toBe(false);
	});

	it("stays chainable, so callers can add their own minimum", () => {
		expect(boundedString(4).min(2).safeParse("a").success).toBe(false);
	});
});

describe("safeText", () => {
	it("accepts ordinary text", () => {
		expect(safeText().safeParse("hello world").success).toBe(true);
	});

	it("accepts tabs and line breaks", () => {
		expect(safeText().safeParse("a\tb\nc\r\nd").success).toBe(true);
	});

	it.each([
		["a null byte", "a\u0000b"],
		["a backspace", "a\u0008b"],
		["a vertical tab", "a\u000bb"],
		["a form feed", "a\u000cb"],
		["a shift out", "a\u000eb"],
		["an escape", "a\u001bb"],
		["a delete", "a\u007fb"],
	])("rejects %s", (_name: string, value: string) => {
		expect(safeText().safeParse(value).success).toBe(false);
	});

	it("accepts C1 characters, which appear in legitimate international text", () => {
		expect(safeText().safeParse("a\u0085b").success).toBe(true);
	});

	it("accepts non-latin text and emoji", () => {
		expect(safeText().safeParse("日本語 — ok ✅").success).toBe(true);
	});

	it("enforces its length limit", () => {
		expect(safeText(3).safeParse("abcd").success).toBe(false);
	});

	it("reports a control character with a readable message", () => {
		const result = safeText().safeParse("a\u0000b");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe(
				"must not contain control characters",
			);
		}
	});
});

describe("safeLine", () => {
	it("accepts a single line", () => {
		expect(safeLine().safeParse("A Name").success).toBe(true);
	});

	it.each([
		["a newline", "a\nb"],
		["a carriage return", "a\rb"],
		["a tab", "a\tb"],
		["a null byte", "a\u0000b"],
	])("rejects %s, which could inject a header", (_n: string, value: string) => {
		expect(safeLine().safeParse(value).success).toBe(false);
	});

	it("defaults to the name limit", () => {
		expect(safeLine().safeParse("a".repeat(INPUT_LIMITS.NAME)).success).toBe(
			true,
		);
		expect(
			safeLine().safeParse("a".repeat(INPUT_LIMITS.NAME + 1)).success,
		).toBe(false);
	});

	it("accepts an empty string", () => {
		expect(safeLine().safeParse("").success).toBe(true);
	});

	it("reports a line break with a readable message", () => {
		const result = safeLine().safeParse("a\nb");
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe(
				"must not contain control characters or line breaks",
			);
		}
	});
});
