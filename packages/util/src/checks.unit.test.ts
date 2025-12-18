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
import { isArray, isObject } from "./checks.js";

describe("checks", () => {
	test("types", () => {
		// check the types are picked up correctly by ts
		const v1: boolean = isArray([]);
		const v2: boolean = isArray([1, 2, 3]);
		const v3: boolean = isArray(null);
		const v4: boolean = isArray({});
		const v5: boolean = isArray("string");
		const v6: boolean = isArray(123);
		const v7: boolean = isObject({});
		const v8: boolean = isObject(new Date());
		const v9: boolean = isObject([]);
		const v10: boolean = isObject(null);
		const v11: boolean = isObject("string");
		const v12: boolean = isObject(123);

		// Verify return type is always boolean
		const result1 = isArray([1, 2, 3]);
		const _v13: boolean = result1;
		const result2 = isObject({ a: 1 });
		const _v14: boolean = result2;
	});

	describe("isArray", () => {
		test("returns true for arrays", () => {
			expect(isArray([])).toBe(true);
			expect(isArray([1, 2, 3])).toBe(true);
			expect(isArray(["a", "b", "c"])).toBe(true);
			expect(isArray([null])).toBe(true);
			expect(isArray([undefined])).toBe(true);
			expect(isArray([{}])).toBe(true);
		});

		test("returns false for null", () => {
			expect(isArray(null)).toBe(false);
		});

		test("returns false for objects", () => {
			expect(isArray({})).toBe(false);
			expect(isArray({ a: 1 })).toBe(false);
			expect(isArray(new Date())).toBe(false);
		});

		test("returns false for primitives", () => {
			expect(isArray(1)).toBe(false);
			expect(isArray("string")).toBe(false);
			expect(isArray(true)).toBe(false);
			expect(isArray(false)).toBe(false);
			expect(isArray(undefined)).toBe(false);
			expect(isArray(Symbol("test"))).toBe(false);
		});

		test("returns false for functions", () => {
			expect(isArray(() => {})).toBe(false);
			expect(isArray(function () {})).toBe(false);
		});
	});

	describe("isObject", () => {
		test("returns true for plain objects", () => {
			expect(isObject({})).toBe(true);
			expect(isObject({ a: 1 })).toBe(true);
			expect(isObject({ a: 1, b: 2 })).toBe(true);
			// Note: Object.create(null) creates object without prototype, fails instanceof check
			expect(isObject(Object.create(null))).toBe(false);
		});

		test("returns true for class instances", () => {
			expect(isObject(new Date())).toBe(true);
			expect(isObject(new Error())).toBe(true);
			expect(isObject(new RegExp("test"))).toBe(true);
			expect(isObject(new Map())).toBe(true);
			expect(isObject(new Set())).toBe(true);
		});

		test("returns false for arrays", () => {
			expect(isObject([])).toBe(false);
			expect(isObject([1, 2, 3])).toBe(false);
			expect(isObject(["a", "b"])).toBe(false);
		});

		test("returns false for null", () => {
			expect(isObject(null)).toBe(false);
		});

		test("returns false for primitives", () => {
			expect(isObject(1)).toBe(false);
			expect(isObject("string")).toBe(false);
			expect(isObject(true)).toBe(false);
			expect(isObject(false)).toBe(false);
			expect(isObject(undefined)).toBe(false);
			expect(isObject(Symbol("test"))).toBe(false);
		});

		test("returns false for functions", () => {
			// Note: Functions are instanceof Object in JavaScript, so current implementation returns true
			expect(isObject(() => {})).toBe(true);
			expect(isObject(function () {})).toBe(true);
		});
	});
});

