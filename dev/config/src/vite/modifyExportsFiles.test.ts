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
import { emptyExportsFiles } from "./vite-plugin-modify-exports-files.js";

describe("emptyExportsFiles", () => {
	test("empties an assignment and keeps the code around it", () => {
		expect(
			emptyExportsFiles('a();\nexports2.FILES = ["a.js", "b.js"];\nb();'),
		).toBe("a();\nexports2.FILES = [];\n\nb();");
	});

	test("empties every assignment, not just the first", () => {
		const out = emptyExportsFiles(
			'exports2.FILES = ["a"];exports2.FILES = ["b"];',
		);
		expect(out).toBe("exports2.FILES = [];\nexports2.FILES = [];\n");
	});

	test("spans newlines, as a formatted listing does", () => {
		expect(emptyExportsFiles('exports2.FILES = [\n\t"a.js"\n];')).toBe(
			"exports2.FILES = [];\n",
		);
	});

	test("leaves code with no assignment untouched", () => {
		expect(emptyExportsFiles("const FILES = [];")).toBe("const FILES = [];");
	});

	test("leaves an unterminated assignment alone rather than truncating", () => {
		// Cutting to the end of the chunk here would delete real code.
		const code = 'exports2.FILES = ["a.js"';
		expect(emptyExportsFiles(code)).toBe(code);
	});

	test("stays linear on many unterminated assignments", () => {
		// The regex this replaced backtracked quadratically on exactly this
		// shape, which is what CodeQL flagged.
		const code = "exports2.FILES = [".repeat(20000);
		const started = performance.now();
		expect(emptyExportsFiles(code)).toBe(code);
		expect(performance.now() - started).toBeLessThan(1000);
	});
});
