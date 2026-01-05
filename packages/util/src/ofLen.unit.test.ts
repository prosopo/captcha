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
import { ofLen } from "./ofLen.js";

describe("ofLen", () => {
	test("types", () => {
		// Test return types for various lengths
		const arr1 = [1, 2, 3];
		const v1 = ofLen(arr1, 0);
		const _v1: typeof arr1 = v1;

		const arr2 = [1, 2, 3, 4, 5];
		const v2 = ofLen(arr2, 1);
		const _v2: typeof arr2 = v2;

		const arr3 = ["a", "b", "c", "d"];
		const v3 = ofLen(arr3, 2);
		const _v3: typeof arr3 = v3;

		const arr4 = [true, false, true, false];
		const v4 = ofLen(arr4, 3);
		const _v4: typeof arr4 = v4;

		// Test with larger arrays
		const arr5 = Array.from({ length: 10 }, (_, i) => i);
		const v5 = ofLen(arr5, 5);
		const _v5: typeof arr5 = v5;

		const arr6 = Array.from({ length: 100 }, (_, i) => i);
		const v6 = ofLen(arr6, 50);
		const _v6: typeof arr6 = v6;
	});

	test("returns array when length is greater than expected", () => {
		const arr = [1, 2, 3, 4, 5];
		const result = ofLen(arr, 3);
		expect(result).toBe(arr);
		expect(result.length).toBe(5);
	});

	test("returns array for length 0", () => {
		const arr = [1, 2, 3];
		const result = ofLen(arr, 0);
		expect(result).toBe(arr);
	});

	test("returns array for various specific lengths", () => {
		const arr1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		expect(ofLen(arr1, 1)).toBe(arr1);
		expect(ofLen(arr1, 5)).toBe(arr1);
		expect(ofLen(arr1, 9)).toBe(arr1);

		const arr2 = Array.from({ length: 20 }, (_, i) => i);
		expect(ofLen(arr2, 10)).toBe(arr2);
		expect(ofLen(arr2, 19)).toBe(arr2);
	});

	test("throws error when array length equals expected length", () => {
		const arr = [1, 2, 3];
		expect(() => ofLen(arr, 3)).toThrow();
	});

	test("throws error when array length is less than expected length", () => {
		const arr = [1, 2, 3];
		expect(() => ofLen(arr, 4)).toThrow();
		expect(() => ofLen(arr, 5)).toThrow();
		expect(() => ofLen(arr, 100)).toThrow();
	});

	test("throws error for empty array", () => {
		const arr: number[] = [];
		expect(() => ofLen(arr, 0)).toThrow();
		expect(() => ofLen(arr, 1)).toThrow();
	});

	test("works with different array types", () => {
		const strArr = ["a", "b", "c", "d"];
		expect(ofLen(strArr, 2)).toBe(strArr);

		const boolArr = [true, false, true];
		expect(ofLen(boolArr, 1)).toBe(boolArr);

		const mixedArr = [1, "a", true, null, undefined];
		expect(ofLen(mixedArr, 3)).toBe(mixedArr);

		const objArr = [{ a: 1 }, { b: 2 }, { c: 3 }];
		expect(ofLen(objArr, 1)).toBe(objArr);
	});

	test("works with large arrays", () => {
		const largeArr = Array.from({ length: 256 }, (_, i) => i);
		expect(ofLen(largeArr, 255)).toBe(largeArr);
		expect(ofLen(largeArr, 100)).toBe(largeArr);
		expect(ofLen(largeArr, 0)).toBe(largeArr);
	});

	test("error message includes array length and expected length", () => {
		const arr = [1, 2, 3];
		try {
			ofLen(arr, 3);
			expect.fail("Should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			const err = error as Error;
			expect(err.message).toContain("3");
			expect(err.message).toContain("array length");
			expect(err.message).toContain("less than or equal to expected");
		}
	});
});
