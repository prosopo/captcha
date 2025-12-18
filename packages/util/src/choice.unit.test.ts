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
import { choice } from "./choice.js";

describe("choice", () => {
	test("types", () => {
		// check the types are picked up correctly by ts
		const items1 = [1, 2, 3];
		const random = () => 0.5;
		const v1: number[] = choice(items1, 2, random);
		const v2: number[] = choice(items1, 2, random, { withReplacement: true });
		const v3: number[] = choice(items1, 2, random, { withReplacement: false });

		const items2 = ["a", "b", "c"];
		const v4: string[] = choice(items2, 2, random);

		const items3 = [{ id: 1 }, { id: 2 }];
		const v5: Array<{ id: number }> = choice(items3, 1, random);

		// Test generic type inference
		const items4 = [true, false];
		const v6: boolean[] = choice(items4, 1, random);
	});

	test("throws error when n exceeds array length", () => {
		const items = [1, 2, 3];
		const random = () => 0.5;
		expect(() => choice(items, 4, random)).to.throw(
			"Cannot choose 4 items from array of length 3",
		);
	});

	test("chooses correct number of items", () => {
		const items = [1, 2, 3, 4, 5];
		const random = () => 0.5;
		const result = choice(items, 3, random);
		expect(result).toHaveLength(3);
	});

	test("chooses all items when n equals length", () => {
		const items = [1, 2, 3];
		const random = () => 0.5;
		const result = choice(items, 3, random);
		expect(result).toHaveLength(3);
		expect(result.sort()).toEqual([1, 2, 3]);
	});

	test("chooses zero items", () => {
		const items = [1, 2, 3];
		const random = () => 0.5;
		const result = choice(items, 0, random);
		expect(result).toHaveLength(0);
		expect(result).toEqual([]);
	});

	test("chooses one item", () => {
		const items = [1, 2, 3];
		const random = () => 0.5;
		const result = choice(items, 1, random);
		expect(result).toHaveLength(1);
		expect(items).toContain(result[0]);
	});

	test("works with different types", () => {
		const stringItems = ["a", "b", "c"];
		const random = () => 0.5;
		const result = choice(stringItems, 2, random);
		expect(result).toHaveLength(2);
		result.forEach((item) => {
			expect(stringItems).toContain(item);
		});
	});

	test("works with objects", () => {
		const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
		const random = () => 0.5;
		const result = choice(items, 2, random);
		expect(result).toHaveLength(2);
	});

	test("allows replacement by default", () => {
		const items = [1, 2, 3];
		let callCount = 0;
		const random = () => {
			callCount++;
			return 0.5; // Always return same index
		};
		const result = choice(items, 3, random, { withReplacement: true });
		expect(result).toHaveLength(3);
		// With replacement, same item can be chosen multiple times
		expect(result.every((item) => item === 2)).toBe(true);
	});

	test("prevents replacement when withReplacement is false", () => {
		const items = [1, 2, 3];
		let index = 0;
		const random = () => {
			// Cycle through indices
			const val = index % items.length;
			index++;
			return val / items.length;
		};
		const result = choice(items, 3, random, { withReplacement: false });
		expect(result).toHaveLength(3);
		// All items should be unique
		const uniqueItems = new Set(result);
		expect(uniqueItems.size).toBe(3);
	});

	test("handles negative random values", () => {
		const items = [1, 2, 3];
		const random = () => -0.5;
		const result = choice(items, 2, random);
		expect(result).toHaveLength(2);
	});

	test("handles random values at boundaries", () => {
		const items = [1, 2, 3];
		const randomZero = () => 0;
		const randomOne = () => 0.999999;
		const resultZero = choice(items, 1, randomZero);
		const resultOne = choice(items, 1, randomOne);
		expect(resultZero).toHaveLength(1);
		expect(resultOne).toHaveLength(1);
	});

	test("works with empty array when n is 0", () => {
		const items: number[] = [];
		const random = () => 0.5;
		const result = choice(items, 0, random);
		expect(result).toHaveLength(0);
		expect(result).toEqual([]);
	});
});
