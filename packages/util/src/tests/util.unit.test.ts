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
import { describe, expect, it, test } from "vitest";
import {
	flatten,
	getCurrentFileDirectory,
	kebabCase,
	sleep,
	unflatten,
} from "../util.js";

describe("util", () => {
	describe("flatten", () => {
		test("flatten obj", () => {
			const obj = {
				a: {
					b: {
						c: 1,
					},
				},
				d: 2,
			};
			expect(flatten(obj)).to.deep.equal({
				"a.b.c": 1,
				d: 2,
			});
		});
	});
	describe("unflatten", () => {
		it("unflattens an object with empty object", () => {
			const obj = {};
			expect(unflatten(obj)).toEqual({});
		});

		it("unflattens an object with single property", () => {
			const obj = { a: "1" };
			expect(unflatten(obj)).toEqual({ a: "1" });
		});

		it("unflattens an object with nested array properties", () => {
			const obj = { "a.b.0": 1, "a.b.1": 1 };
			expect(unflatten(obj)).toEqual({ a: { b: [1, 1] } });
		});

		it("unflattens an object with multiple nested properties", () => {
			const obj = { "a.b.c.d.e": "1", "a.b.c.f": "2" };
			expect(unflatten(obj)).toEqual({
				a: { b: { c: { d: { e: "1" }, f: "2" } } },
			});
		});
	});

	describe("sleep", () => {
		it("sleeps for specified milliseconds", async () => {
			const start = Date.now();
			await sleep(50);
			const end = Date.now();
			expect(end - start).toBeGreaterThanOrEqual(45);
		});
	});

	describe("getCurrentFileDirectory", () => {
		it("extracts directory from file URL", () => {
			const url = "file:///home/user/project/src/file.ts";
			const dir = getCurrentFileDirectory(url);
			expect(dir).toBe("/home/user/project/src");
		});

		it("handles URLs with query parameters", () => {
			const url = "file:///home/user/project/src/file.ts?query=value";
			const dir = getCurrentFileDirectory(url);
			expect(dir).toBe("/home/user/project/src");
		});
	});

	describe("kebabCase", () => {
		it("converts camelCase to kebab-case", () => {
			expect(kebabCase("camelCase")).toBe("camel-case");
			expect(kebabCase("myVariableName")).toBe("my-variable-name");
		});

		it("converts PascalCase to kebab-case", () => {
			expect(kebabCase("PascalCase")).toBe("pascal-case");
			expect(kebabCase("MyClassName")).toBe("my-class-name");
		});

		it("handles consecutive capitals", () => {
			expect(kebabCase("XMLHttpRequest")).toBe("xml-http-request");
		});

		it("handles already kebab-case strings", () => {
			expect(kebabCase("already-kebab-case")).toBe("already-kebab-case");
		});

		it("handles single word", () => {
			expect(kebabCase("word")).toBe("word");
		});

		it("handles empty string", () => {
			expect(kebabCase("")).toBe("");
		});
	});
});
