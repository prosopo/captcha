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
import { validatePuzzleSolution } from "../../../../tasks/puzzleCaptcha/puzzleTasksUtils.js";

describe("validatePuzzleSolution", () => {
	it("returns true when the final position equals the target", () => {
		expect(validatePuzzleSolution(100, 100, 100, 100, 15)).toBe(true);
	});

	it("returns true when the distance is just inside the tolerance", () => {
		// 3-4-5 triangle: distance is exactly 5
		expect(validatePuzzleSolution(103, 104, 100, 100, 5)).toBe(true);
	});

	it("returns false when the distance exceeds the tolerance", () => {
		expect(validatePuzzleSolution(120, 100, 100, 100, 15)).toBe(false);
	});

	it("uses Euclidean distance, not axis-aligned", () => {
		// Point at (10, 10) from origin: distance ≈ 14.14
		// Should pass at tolerance 15 (Euclidean) but would fail at tolerance 10
		// if the implementation used max(|dx|, |dy|) instead.
		expect(validatePuzzleSolution(10, 10, 0, 0, 15)).toBe(true);
		expect(validatePuzzleSolution(10, 10, 0, 0, 14)).toBe(false);
	});

	it("treats negative deltas the same as positive", () => {
		expect(validatePuzzleSolution(95, 95, 100, 100, 10)).toBe(true);
		expect(validatePuzzleSolution(85, 100, 100, 100, 10)).toBe(false);
	});

	it("rejects everything when tolerance is zero except an exact match", () => {
		expect(validatePuzzleSolution(50, 50, 50, 50, 0)).toBe(true);
		expect(validatePuzzleSolution(50, 51, 50, 50, 0)).toBe(false);
	});

	it("is symmetric in target and final coordinates", () => {
		expect(validatePuzzleSolution(20, 30, 50, 70, 50)).toBe(
			validatePuzzleSolution(50, 70, 20, 30, 50),
		);
	});
});
