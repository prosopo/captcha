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
} from "./util.js";

describe("util", () => {
	describe("sleep", () => {
		test("types", () => {
			const result = sleep(100);
			const _v1: Promise<void> = result;
		});

		test("resolves after specified milliseconds", async () => {
			const start = Date.now();
			await sleep(50);
			const elapsed = Date.now() - start;
			expect(elapsed).toBeGreaterThanOrEqual(45);
			expect(elapsed).toBeLessThan(100);
		});

		test("resolves immediately for zero milliseconds", async () => {
			const start = Date.now();
			await sleep(0);
			const elapsed = Date.now() - start;
			expect(elapsed).toBeLessThan(10);
		});
	});

	describe("getCurrentFileDirectory", () => {
		test("types", () => {
			const result = getCurrentFileDirectory("file:///path/to/file.js");
			const _v1: string = result;
		});

		test("extracts directory from file URL", () => {
			expect(getCurrentFileDirectory("file:///path/to/file.js")).toBe(
				"/path/to",
			);
			expect(getCurrentFileDirectory("file:///usr/local/bin/script.ts")).toBe(
				"/usr/local/bin",
			);
		});

		test("handles root file", () => {
			expect(getCurrentFileDirectory("file:///file.js")).toBe("");
		});

		test("handles nested paths", () => {
			expect(getCurrentFileDirectory("file:///a/b/c/d/e/f.js")).toBe(
				"/a/b/c/d/e",
			);
		});
	});

	describe("flatten", () => {
		test("types", () => {
			const result = flatten({ a: 1 });
			const _v1: Record<string, string> = result;
		});

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

		test("flatten empty object", () => {
			expect(flatten({})).toEqual({});
		});

		test("flatten object with single property", () => {
			expect(flatten({ a: "value" })).toEqual({ a: "value" });
		});

		test("flatten object with multiple top-level properties", () => {
			const obj = {
				a: { b: 1 },
				c: { d: 2 },
				e: 3,
			};
			expect(flatten(obj)).toEqual({
				"a.b": 1,
				"c.d": 2,
				e: 3,
			});
		});

		test("flatten with custom prefix", () => {
			const obj = { a: { b: 1 } };
			expect(flatten(obj, "prefix.")).toEqual({
				"prefix.a.b": 1,
			});
		});

		test("flatten deeply nested object", () => {
			const obj = {
				a: {
					b: {
						c: {
							d: {
								e: "value",
							},
						},
					},
				},
			};
			expect(flatten(obj)).toEqual({
				"a.b.c.d.e": "value",
			});
		});
	});

	describe("unflatten", () => {
		test("types", () => {
			const result = unflatten({ a: "1" });
			const _v1: Record<
				string,
				string | number | boolean | Record<string, unknown> | unknown[]
			> = result;
		});

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

		test("unflatten with mixed types", () => {
			const obj = {
				"a.b": "string",
				"a.c": 123,
				"a.d": true,
			};
			expect(unflatten(obj)).toEqual({
				a: { b: "string", c: 123, d: true },
			});
		});

		test("unflatten with array indices", () => {
			const obj = {
				"arr.0": "first",
				"arr.1": "second",
				"arr.2": "third",
			};
			expect(unflatten(obj)).toEqual({
				arr: ["first", "second", "third"],
			});
		});

		test("unflatten with mixed arrays and objects", () => {
			const obj = {
				"a.0": 1,
				"a.1": 2,
				"b.c": "value",
			};
			expect(unflatten(obj)).toEqual({
				a: [1, 2],
				b: { c: "value" },
			});
		});
	});

	describe("kebabCase", () => {
		test("types", () => {
			const result = kebabCase("camelCase");
			const _v1: string = result;
		});

		test("converts camelCase to kebab-case", () => {
			expect(kebabCase("camelCase")).toBe("camel-case");
			expect(kebabCase("myVariableName")).toBe("my-variable-name");
		});

		test("converts PascalCase to kebab-case", () => {
			expect(kebabCase("PascalCase")).toBe("pascal-case");
			expect(kebabCase("MyClassName")).toBe("my-class-name");
		});

		test("handles consecutive uppercase letters", () => {
			expect(kebabCase("XMLHttpRequest")).toBe("xml-http-request");
			expect(kebabCase("HTTPSConnection")).toBe("https-connection");
		});

		test("handles already kebab-case strings", () => {
			expect(kebabCase("already-kebab-case")).toBe("already-kebab-case");
		});

		test("handles lowercase strings", () => {
			expect(kebabCase("lowercase")).toBe("lowercase");
			expect(kebabCase("alllowercase")).toBe("alllowercase");
		});

		test("handles single word", () => {
			expect(kebabCase("word")).toBe("word");
			expect(kebabCase("Word")).toBe("word");
		});

		test("handles empty string", () => {
			expect(kebabCase("")).toBe("");
		});

		test("handles strings with numbers", () => {
			expect(kebabCase("var1Name")).toBe("var1-name");
			expect(kebabCase("my2Var3Name")).toBe("my2-var3-name");
		});

		test("handles strings starting with uppercase", () => {
			expect(kebabCase("UpperCase")).toBe("upper-case");
			expect(kebabCase("UPPERCASE")).toBe("uppercase");
		});
	});
});
