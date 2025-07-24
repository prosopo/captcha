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
import { describe, expect, it, test } from "vitest";
import { permutations, uniqueSubsets } from "../permutations.js";

describe("permutations", () => {
	test("handles empty array", () => {
		expect([...permutations([])]).to.deep.equal([]);
	});

	test("handles empty array with empty set", () => {
		expect([...permutations([], { includeEmpty: true })]).to.deep.equal([[]]);
	});

	test("permutes correctly using same size bins", () => {
		expect([...permutations([2, 2, 2])]).to.deep.equal([
			[0, 0, 0],
			[0, 0, 1],
			[0, 1, 0],
			[0, 1, 1],
			[1, 0, 0],
			[1, 0, 1],
			[1, 1, 0],
			[1, 1, 1],
		]);
	});

	test("permutes correctly using different size bins", () => {
		expect([...permutations([1, 2, 3])]).to.deep.equal([
			[0, 0, 0],
			[0, 0, 1],
			[0, 0, 2],
			[0, 1, 0],
			[0, 1, 1],
			[0, 1, 2],
		]);
	});
});

describe("uniqueSubsets", () => {
	it("returns all unique subsets of an array", () => {
		const arr = ["a", "b", "c"];
		const result = uniqueSubsets(arr);
		expect(result).toEqual([
			["a", "b", "c"],
			["a", "b"],
			["a", "c"],
			["b", "c"],
			["a"],
			["b"],
			["c"],
		]);
	});

	it("returns subsets sorted by length in descending order", () => {
		const arr = ["x", "y"];
		const result = uniqueSubsets(arr);
		expect(result).toEqual([["x", "y"], ["x"], ["y"]]);
	});

	it("throws an error if the array contains undefined values", () => {
		const arr = ["a", undefined as unknown as string, "c"];
		expect(() => uniqueSubsets(arr)).toThrow(
			"Undefined value at index 1 in array: a,,c",
		);
	});

	it("returns an empty array for an empty input array", () => {
		const arr: string[] = [];
		const result = uniqueSubsets(arr);
		expect(result).toEqual([]);
	});
});
