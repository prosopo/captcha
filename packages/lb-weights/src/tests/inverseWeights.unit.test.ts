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
import { inverseWeights } from "../weights.js";

describe("inverseWeights", () => {
	it("gives the lowest metric the highest weight", () => {
		// spread >= 1 so ordering survives the ceil() step
		const weights = inverseWeights([1, 3, 2]);
		expect(weights).toEqual([3, 1, 2]);
	});

	it("never produces a zero weight", () => {
		for (const weight of inverseWeights([0, 100, 50])) {
			expect(weight).toBeGreaterThanOrEqual(1);
		}
	});

	it("returns integer weights", () => {
		for (const weight of inverseWeights([0.13, 0.77, 0.42])) {
			expect(Number.isInteger(weight)).toBe(true);
		}
	});

	it("handles equal metrics by giving equal weights", () => {
		expect(inverseWeights([0.5, 0.5, 0.5])).toEqual([1, 1, 1]);
	});

	it("returns empty for empty input", () => {
		expect(inverseWeights([])).toEqual([]);
	});

	it("throws on non-finite values", () => {
		expect(() => inverseWeights([1, Number.NaN])).toThrow();
	});
});
