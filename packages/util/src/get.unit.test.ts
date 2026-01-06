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
import { get } from "./get.js";

describe("get", () => {
	test("types", () => {
		// check the types are picked up correctly by ts
		const v1: number = get({ a: 1 }, "a");
		const v2: number | undefined = get({ a: 1 }, "a", false);
		const v3: number = get({ a: 1 }, "a", true);
		const v4: number | undefined = get({ a: 1, b: undefined }, "a");
		const v5: number | undefined = get({ a: 1, b: undefined }, "a", false);
		// cast from any
		// biome-ignore lint/suspicious/noExplicitAny: has to be any
		const v6: number = get(JSON.parse('{"a": 1}') as any, "a");
		// cast from unknown
		const v7: number = get(JSON.parse('{"a": 1}') as unknown, "a");
	});

	test("throw on undefined field string", () => {
		expect(() => get({ a: 1 }, "b")).to.throw();
	});

	test("throw on undefined field number", () => {
		expect(() => get({ a: 1 }, 1)).to.throw();
	});

	test("get correct field string", () => {
		expect(get({ a: 1 }, "a")).to.equal(1);
	});

	test("get correct field number", () => {
		expect(get({ 1: 1 }, 1)).to.equal(1);
	});

	test("returns undefined when required is false and field is missing", () => {
		expect(get({ a: 1 }, "b", false)).toBe(undefined);
		expect(get({ a: 1 }, 2, false)).toBe(undefined);
	});

	test("returns undefined when required is false and field value is undefined", () => {
		expect(get({ a: undefined }, "a", false)).toBe(undefined);
	});

	test("throws error with descriptive message", () => {
		try {
			get({ a: 1 }, "b");
			expect.fail("Should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			const err = error as Error;
			expect(err.message).toContain("b");
			expect(err.message).toContain("Object has no property");
		}
	});

	test("works with symbol keys", () => {
		const sym = Symbol("test");
		const obj = { [sym]: "value" };
		expect(get(obj, sym)).toBe("value");
		expect(() => get(obj, Symbol("other"))).to.throw();
	});

	test("works with different value types", () => {
		const obj = {
			string: "value",
			number: 123,
			boolean: true,
			null: null,
			array: [1, 2, 3],
			object: { nested: "value" },
		};
		expect(get(obj, "string")).toBe("value");
		expect(get(obj, "number")).toBe(123);
		expect(get(obj, "boolean")).toBe(true);
		expect(get(obj, "null")).toBe(null);
		expect(get(obj, "array")).toEqual([1, 2, 3]);
		expect(get(obj, "object")).toEqual({ nested: "value" });
	});

	test("works with nested objects", () => {
		const obj = { a: { b: { c: "value" } } };
		expect(get(obj, "a")).toEqual({ b: { c: "value" } });
	});
});
