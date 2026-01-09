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

import { describe, expect, it } from "vitest";
import { choice } from "../choice.js";

describe("choice", () => {
	// Test basic functionality with deterministic random function
	it("should select items from array with replacement (default)", () => {
		const items = ["a", "b", "c", "d"];
		// Create a deterministic random function that returns predictable values
		let callCount = 0;
		const mockRandom = () => {
			const values = [0.1, 0.2, 0.8, 0.9]; // Will select indices 0, 0, 3, 3
			return values[callCount++ % values.length] || 0;
		};

		const result = choice(items, 4, mockRandom);
		expect(result).toHaveLength(4);
		expect(result.every(item => items.includes(item))).toBe(true);
		// With this mock, we expect duplicates since replacement is default
	});

	it("should select items from array without replacement", () => {
		const items = ["a", "b", "c", "d"];
		// Create a deterministic random function
		let callCount = 0;
		const mockRandom = () => {
			const values = [0.1, 0.4, 0.7]; // Will try to select indices 0, 1, 2
			return values[callCount++ % values.length] || 0;
		};

		const result = choice(items, 3, mockRandom, { withReplacement: false });
		expect(result).toHaveLength(3);
		expect(result.every(item => items.includes(item))).toBe(true);
		// Should have unique items
		expect(new Set(result).size).toBe(3);
	});

	it("should throw error when n exceeds array length without replacement", () => {
		const items = ["a", "b"];
		const mockRandom = () => 0.5;

		expect(() => {
			choice(items, 3, mockRandom, { withReplacement: false });
		}).toThrow("Cannot choose 3 items from array of length 2");
	});

	// NOTE: This test documents current buggy behavior - the function should allow
	// n > items.length when withReplacement is true, but currently throws an error
	// regardless of the withReplacement option
	it("should currently throw error when n exceeds array length even with replacement (BUG)", () => {
		const items = ["a", "b"];
		const mockRandom = () => 0.5;

		expect(() => {
			choice(items, 3, mockRandom, { withReplacement: true });
		}).toThrow("Cannot choose 3 items from array of length 2");
	});

	it("should handle empty array with n=0", () => {
		const items: string[] = [];
		const mockRandom = () => 0.5;

		const result = choice(items, 0, mockRandom);
		expect(result).toEqual([]);
	});

	it("should handle n=0 with non-empty array", () => {
		const items = ["a", "b", "c"];
		const mockRandom = () => 0.5;

		const result = choice(items, 0, mockRandom);
		expect(result).toEqual([]);
	});

	it("should handle selecting all items without replacement", () => {
		const items = ["a", "b", "c"];
		let callCount = 0;
		const mockRandom = () => {
			// This will ensure we get all different indices
			const values = [0.1, 0.4, 0.7];
			return values[callCount++ % values.length] || 0;
		};

		const result = choice(items, 3, mockRandom, { withReplacement: false });
		expect(result).toHaveLength(3);
		expect(new Set(result).size).toBe(3);
		expect(result.sort()).toEqual(items.sort());
	});

	it("should handle single item selection", () => {
		const items = ["a", "b", "c"];
		const mockRandom = () => 0.5; // Will select index 1 ("b")

		const result = choice(items, 1, mockRandom);
		expect(result).toEqual(["b"]);
	});

	it("should handle negative random values gracefully", () => {
		const items = ["a", "b", "c"];
		const mockRandom = () => -0.5; // Math.abs will make this 0.5

		const result = choice(items, 1, mockRandom);
		expect(result).toHaveLength(1);
		expect(items.includes(result[0])).toBe(true);
	});

	it("should handle large random values", () => {
		const items = ["a", "b", "c"];
		const mockRandom = () => 1.5; // Will be modulo'd to select valid index

		const result = choice(items, 1, mockRandom);
		expect(result).toHaveLength(1);
		expect(items.includes(result[0])).toBe(true);
	});
});