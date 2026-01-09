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
import { isArray, isObject } from "../checks.js";

describe("checks", () => {
	describe("isArray", () => {
		it("returns true for arrays", () => {
			expect(isArray([])).toBe(true);
			expect(isArray([1, 2, 3])).toBe(true);
			expect(isArray(["a", "b"])).toBe(true);
		});

		it("returns false for null", () => {
			expect(isArray(null)).toBe(false);
		});

		it("returns false for objects", () => {
			expect(isArray({})).toBe(false);
			expect(isArray({ a: 1 })).toBe(false);
		});

		it("returns false for primitives", () => {
			expect(isArray(1)).toBe(false);
			expect(isArray("string")).toBe(false);
			expect(isArray(true)).toBe(false);
			expect(isArray(undefined)).toBe(false);
		});
	});

	describe("isObject", () => {
		it("returns true for objects", () => {
			expect(isObject({})).toBe(true);
			expect(isObject({ a: 1 })).toBe(true);
			expect(isObject(new Date())).toBe(true);
		});

		it("returns false for arrays", () => {
			expect(isObject([])).toBe(false);
			expect(isObject([1, 2, 3])).toBe(false);
		});

		it("returns false for null", () => {
			expect(isObject(null)).toBe(false);
		});

		it("returns false for primitives", () => {
			expect(isObject(1)).toBe(false);
			expect(isObject("string")).toBe(false);
			expect(isObject(true)).toBe(false);
			expect(isObject(undefined)).toBe(false);
		});
	});
});
