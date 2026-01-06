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
import { constructPairList, containsIdenticalPairs } from "../../pairs.js";

describe("constructPairList", () => {
	it("constructs pairs from an even-length list", () => {
		expect(constructPairList([1, 2, 3, 4])).toEqual([
			[1, 2],
			[3, 4],
		]);
	});

	it("returns an empty array for an empty list", () => {
		expect(constructPairList([])).toEqual([]);
	});

	it("throws an error for odd-length list", () => {
		expect(() => constructPairList([1, 2, 3])).toThrow("Invalid pairs length");
	});

	it("works with negative numbers", () => {
		expect(constructPairList([-1, -2, -3, -4])).toEqual([
			[-1, -2],
			[-3, -4],
		]);
	});

	it("works with zeros", () => {
		expect(constructPairList([0, 0, 0, 0])).toEqual([
			[0, 0],
			[0, 0],
		]);
	});
});

describe("containsIdenticalPairs", () => {
	it("returns false when all pairs are unique", () => {
		const pairsLists: [number, number][][] = [
			[
				[1, 2],
				[3, 4],
			],
			[
				[5, 6],
				[7, 8],
			],
		];
		expect(containsIdenticalPairs(pairsLists)).toBe(false);
	});

	it("returns true when there are identical pairs", () => {
		const pairsLists: [number, number][][] = [
			[
				[1, 2],
				[3, 4],
			],
			[
				[1, 2],
				[5, 6],
			],
		];
		expect(containsIdenticalPairs(pairsLists)).toBe(true);
	});

	it("returns false for empty input", () => {
		expect(containsIdenticalPairs([])).toBe(false);
	});

	it("returns true when all pairs are identical", () => {
		const pairsLists: [number, number][][] = [
			[
				[1, 2],
				[1, 2],
			],
			[
				[1, 2],
				[1, 2],
			],
		];
		expect(containsIdenticalPairs(pairsLists)).toBe(true);
	});

	it("handles single list with no duplicates", () => {
		const pairsLists: [number, number][][] = [
			[
				[1, 2],
				[3, 4],
				[5, 6],
			],
		];
		expect(containsIdenticalPairs(pairsLists)).toBe(false);
	});
});
