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

import { InputMethod } from "@prosopo/types";
import { embedData, extractData } from "@prosopo/util";
import { randomAsHex } from "@prosopo/util-crypto";
import { describe, expect, it } from "vitest";
import {
	constructPairList,
	containsIdenticalPairs,
	keyboardSelectionHasPosition,
	peelCheckboxInputMethod,
	peelCheckboxPrefix,
	resolveInputMethods,
	selectionsLookScripted,
} from "../../pairs.js";

const { keyboard, pointer } = InputMethod;

describe("constructPairList", () => {
	it("should construct pairs from even-length array", () => {
		const input = [1, 2, 3, 4, 5, 6];
		const result = constructPairList(input);

		expect(result).toEqual([
			[1, 2],
			[3, 4],
			[5, 6],
		]);
	});

	it("should construct pairs from empty array", () => {
		const input: number[] = [];
		const result = constructPairList(input);

		expect(result).toEqual([]);
	});

	it("should construct pairs from single pair", () => {
		const input = [1, 2];
		const result = constructPairList(input);

		expect(result).toEqual([[1, 2]]);
	});

	it("should construct pairs from large even-length array", () => {
		const input = [10, 20, 30, 40, 50, 60, 70, 80];
		const result = constructPairList(input);

		expect(result).toEqual([
			[10, 20],
			[30, 40],
			[50, 60],
			[70, 80],
		]);
	});

	it("should throw error for odd-length array", () => {
		const input = [1, 2, 3];

		expect(() => constructPairList(input)).toThrow("Invalid pairs length");
	});

	it("should throw error for single element array", () => {
		const input = [1];

		expect(() => constructPairList(input)).toThrow("Invalid pairs length");
	});

	it("should handle zero values", () => {
		const input = [0, 0, 0, 0];
		const result = constructPairList(input);

		expect(result).toEqual([
			[0, 0],
			[0, 0],
		]);
	});

	it("should handle negative numbers", () => {
		const input = [-1, -2, -3, -4];
		const result = constructPairList(input);

		expect(result).toEqual([
			[-1, -2],
			[-3, -4],
		]);
	});

	it("should handle floating point numbers", () => {
		const input = [1.5, 2.5, 3.5, 4.5];
		const result = constructPairList(input);

		expect(result).toEqual([
			[1.5, 2.5],
			[3.5, 4.5],
		]);
	});

	it("should preserve order of elements", () => {
		const input = [4, 3, 2, 1];
		const result = constructPairList(input);

		expect(result).toEqual([
			[4, 3],
			[2, 1],
		]);
	});
});

describe("containsIdenticalPairs", () => {
	it("should return false for empty array", () => {
		const input: [number, number][][] = [];
		const result = containsIdenticalPairs(input);

		expect(result).toBe(false);
	});

	it("should return false for single list with unique pairs", () => {
		const input: [number, number][][] = [
			[
				[1, 2],
				[3, 4],
				[5, 6],
			],
		];
		const result = containsIdenticalPairs(input);

		expect(result).toBe(false);
	});

	it("should return false for multiple lists with unique pairs", () => {
		const input: [number, number][][] = [
			[
				[1, 2],
				[3, 4],
			],
			[
				[5, 6],
				[7, 8],
			],
			[
				[9, 10],
				[11, 12],
			],
		];
		const result = containsIdenticalPairs(input);

		expect(result).toBe(false);
	});

	it("should return true for single list with identical pairs", () => {
		const input: [number, number][][] = [
			[
				[1, 2],
				[1, 2],
				[3, 4],
			],
		];
		const result = containsIdenticalPairs(input);

		expect(result).toBe(true);
	});

	it("should return true for multiple lists with identical pairs", () => {
		const input: [number, number][][] = [
			[
				[1, 2],
				[3, 4],
			],
			[
				[1, 2],
				[5, 6],
			], // [1,2] appears twice across lists
		];
		const result = containsIdenticalPairs(input);

		expect(result).toBe(true);
	});

	it("should return true when same pair appears in different lists", () => {
		const input: [number, number][][] = [
			[
				[1, 2],
				[3, 4],
			],
			[
				[5, 6],
				[1, 2],
			], // [1,2] appears again
			[
				[7, 8],
				[9, 10],
			],
		];
		const result = containsIdenticalPairs(input);

		expect(result).toBe(true);
	});

	it("should return true when pair appears multiple times in same list", () => {
		const input: [number, number][][] = [
			[
				[1, 2],
				[1, 2],
				[1, 2],
			], // [1,2] appears three times
		];
		const result = containsIdenticalPairs(input);

		expect(result).toBe(true);
	});

	it("should treat pairs as ordered (different order are not identical)", () => {
		const input: [number, number][][] = [
			[
				[1, 2],
				[2, 1],
			], // These are considered different pairs
		];
		const result = containsIdenticalPairs(input);

		expect(result).toBe(false);
	});

	it("should handle zero values", () => {
		const input: [number, number][][] = [
			[
				[0, 0],
				[0, 0],
			],
		];
		const result = containsIdenticalPairs(input);

		expect(result).toBe(true);
	});

	it("should handle negative values", () => {
		const input: [number, number][][] = [
			[
				[-1, -2],
				[-1, -2],
			],
		];
		const result = containsIdenticalPairs(input);

		expect(result).toBe(true);
	});

	it("should handle floating point values", () => {
		const input: [number, number][][] = [
			[
				[1.5, 2.5],
				[1.5, 2.5],
			],
		];
		const result = containsIdenticalPairs(input);

		expect(result).toBe(true);
	});

	it("should return false when pairs differ by order (they are different pairs)", () => {
		const input: [number, number][][] = [
			[
				[1, 2],
				[2, 1],
				[3, 4],
			], // [1,2] and [2,1] are different pairs
		];
		const result = containsIdenticalPairs(input);

		expect(result).toBe(false);
	});

	it("should handle mixed empty and non-empty lists", () => {
		const input: [number, number][][] = [[], [[1, 2]], []];
		const result = containsIdenticalPairs(input);

		expect(result).toBe(false);
	});

	it("should handle large arrays", () => {
		const pairs: [number, number][] = [];
		for (let i = 0; i < 100; i++) {
			pairs.push([i, i + 1]);
		}

		const input: [number, number][][] = [pairs];
		const result = containsIdenticalPairs(input);

		expect(result).toBe(false);
	});
});

const buildSalt = (data: number[]): string => {
	const hexLength = data
		.map((d) => d.toString(16).length + 4)
		.reduce((acc, curr) => acc + curr, 0);
	const randomHex = randomAsHex(hexLength);
	return embedData(randomHex, data);
};

describe("peelCheckboxPrefix", () => {
	it("returns no prefix when first list length matches 2 * solution.length", () => {
		const salt0 = buildSalt([10, 20, 30, 40]);
		const salt1 = buildSalt([50, 60]);
		const flat = [extractData(salt0), extractData(salt1)];
		const { checkbox, flat: out } = peelCheckboxPrefix(flat, [2, 1]);
		expect(checkbox).toBeUndefined();
		expect(out).toEqual(flat);
	});

	it("peels [x, y] when first list length is 2 * solution.length + 2", () => {
		const salt0 = buildSalt([7, 13, 10, 20, 30, 40]);
		const salt1 = buildSalt([50, 60]);
		const flat = [extractData(salt0), extractData(salt1)];
		const { checkbox, flat: out } = peelCheckboxPrefix(flat, [2, 1]);
		expect(checkbox).toEqual([7, 13]);
		expect(out[0]).toEqual([10, 20, 30, 40]);
		expect(out[1]).toEqual([50, 60]);
	});

	it("round-trips client embed → server peel → constructPairList → prepend", () => {
		const checkboxX = 142;
		const checkboxY = 87;
		const captcha0Shapes = [299, 244, 299, 352, 170, 358];
		const captcha1Shapes = [180, 470, 297, 481];

		const salt0 = buildSalt([checkboxX, checkboxY, ...captcha0Shapes]);
		const salt1 = buildSalt(captcha1Shapes);

		const rawFlat = [extractData(salt0), extractData(salt1)];
		const { checkbox, flat } = peelCheckboxPrefix(rawFlat, [
			captcha0Shapes.length / 2,
			captcha1Shapes.length / 2,
		]);
		const shapePairs = flat.map((list) => constructPairList(list));
		const pairs = checkbox ? [[checkbox], ...shapePairs] : shapePairs;

		expect(pairs).toEqual([
			[[checkboxX, checkboxY]],
			[
				[299, 244],
				[299, 352],
				[170, 358],
			],
			[
				[180, 470],
				[297, 481],
			],
		]);
	});

	it("leaves rawFlat unchanged when only an older client (no prefix) submits", () => {
		const captcha0Shapes = [10, 20, 30, 40];
		const captcha1Shapes = [50, 60];
		const salt0 = buildSalt(captcha0Shapes);
		const salt1 = buildSalt(captcha1Shapes);

		const rawFlat = [extractData(salt0), extractData(salt1)];
		const { checkbox, flat } = peelCheckboxPrefix(rawFlat, [
			captcha0Shapes.length / 2,
			captcha1Shapes.length / 2,
		]);
		const pairs = flat.map((list) => constructPairList(list));

		expect(checkbox).toBeUndefined();
		expect(pairs).toEqual([
			[
				[10, 20],
				[30, 40],
			],
			[[50, 60]],
		]);
	});

	it("handles empty inputs without throwing", () => {
		expect(peelCheckboxPrefix([], [])).toEqual({ flat: [] });
	});
});

describe("containsIdenticalPairs with input methods", () => {
	// The coordinates the env recorded for a keyboard-only solve: the checkbox
	// and every tile at (0, 0).
	const keyboardOnly: [number, number][][] = [
		[[0, 0]],
		[
			[0, 0],
			[0, 0],
			[0, 0],
		],
		[
			[0, 0],
			[0, 0],
		],
	];

	it("leaves keyboard selections out of the repeated-position check", () => {
		const methods = [
			[keyboard],
			[keyboard, keyboard, keyboard],
			[keyboard, keyboard],
		];
		expect(containsIdenticalPairs(keyboardOnly, methods)).toBe(false);
	});

	it("still counts repeated (0, 0) when nothing declares keyboard", () => {
		expect(containsIdenticalPairs(keyboardOnly)).toBe(true);
	});

	it("still flags (0, 0) declared as pointer twice", () => {
		const methods = [
			[pointer],
			[pointer, keyboard, keyboard],
			[keyboard, keyboard],
		];
		expect(containsIdenticalPairs(keyboardOnly, methods)).toBe(true);
	});

	it("allows a single pointer (0, 0) among keyboard selections", () => {
		const methods = [
			[pointer],
			[keyboard, keyboard, keyboard],
			[keyboard, keyboard],
		];
		expect(containsIdenticalPairs(keyboardOnly, methods)).toBe(false);
	});

	it("flags a repeated pointer position alongside keyboard selections", () => {
		const pairs: [number, number][][] = [
			[[0, 0]],
			[
				[0, 0],
				[120, 340],
			],
			[[120, 340]],
		];
		const methods = [[keyboard], [keyboard, pointer], [pointer]];
		expect(containsIdenticalPairs(pairs, methods)).toBe(true);
	});
});

describe("resolveInputMethods", () => {
	it("treats every pair of a captcha that declares nothing as pointer", () => {
		expect(
			resolveInputMethods(
				[
					[1, 2, 3, 4],
					[5, 6],
				],
				[undefined, undefined],
			),
		).toEqual([[pointer, pointer], [pointer]]);
	});

	it("keeps the declared methods when they line up with the pairs", () => {
		expect(
			resolveInputMethods(
				[
					[0, 0, 5, 6],
					[0, 0],
				],
				[[keyboard, pointer], [keyboard]],
			),
		).toEqual([[keyboard, pointer], [keyboard]]);
	});

	it("resolves each captcha on its own", () => {
		expect(
			resolveInputMethods(
				[
					[1, 2],
					[0, 0],
				],
				[undefined, [keyboard]],
			),
		).toEqual([[pointer], [keyboard]]);
	});

	it("rejects more methods than pairs", () => {
		expect(
			resolveInputMethods([[1, 2]], [[pointer, keyboard]]),
		).toBeUndefined();
	});

	it("rejects fewer methods than pairs", () => {
		expect(resolveInputMethods([[0, 0, 0, 0]], [[keyboard]])).toBeUndefined();
	});
});

describe("peelCheckboxInputMethod", () => {
	it("gives the checkbox its own list, as its coordinates get", () => {
		expect(
			peelCheckboxInputMethod([[keyboard, pointer, pointer], [keyboard]]),
		).toEqual([[keyboard], [pointer, pointer], [keyboard]]);
	});

	it("leaves an empty first list alone", () => {
		expect(peelCheckboxInputMethod([[], [pointer]])).toEqual([[], [pointer]]);
		expect(peelCheckboxInputMethod([])).toEqual([]);
	});
});

describe("keyboardSelectionHasPosition", () => {
	it("accepts keyboard selections at (0, 0)", () => {
		expect(
			keyboardSelectionHasPosition(
				[[[0, 0]], [[0, 0]]],
				[[keyboard], [keyboard]],
			),
		).toBe(false);
	});

	it("flags a keyboard selection carrying a position", () => {
		expect(
			keyboardSelectionHasPosition(
				[[[0, 0]], [[12, 0]]],
				[[keyboard], [keyboard]],
			),
		).toBe(true);
	});

	it("does not care where pointer selections are", () => {
		expect(keyboardSelectionHasPosition([[[12, 34]]], [[pointer]])).toBe(false);
	});
});

describe("selectionsLookScripted", () => {
	it("passes a keyboard-only solve", () => {
		expect(
			selectionsLookScripted(
				[
					[[0, 0]],
					[
						[0, 0],
						[0, 0],
					],
					[[0, 0]],
				],
				[[keyboard], [keyboard, keyboard], [keyboard]],
			),
		).toBe(false);
	});

	it("passes pointer selections at distinct positions", () => {
		expect(
			selectionsLookScripted(
				[[[3, 4]], [[10, 20]], [[11, 20]]],
				[[pointer], [pointer], [pointer]],
			),
		).toBe(false);
	});

	it("rejects methods that did not line up with the coordinates", () => {
		expect(selectionsLookScripted([[[3, 4]]], undefined)).toBe(true);
	});

	it("rejects a keyboard selection carrying a position", () => {
		expect(
			selectionsLookScripted([[[3, 4]], [[50, 60]]], [[pointer], [keyboard]]),
		).toBe(true);
	});

	it("rejects a repeated pointer position", () => {
		expect(
			selectionsLookScripted(
				[[[3, 4]], [[50, 60]], [[50, 60]]],
				[[pointer], [pointer], [pointer]],
			),
		).toBe(true);
	});
});
