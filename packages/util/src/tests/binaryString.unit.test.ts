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
import { compareBinaryStrings, majorityAverage } from "../binaryString.js";

describe("majorityAverage", () => {
	it("returns empty string for empty input", () => {
		expect(majorityAverage([])).toBe("");
	});

	it("returns empty string if first element is undefined", () => {
		expect(majorityAverage([undefined as unknown as string])).toBe("");
	});

	it("computes bitwise majority", () => {
		const bits = ["1010", "1110", "1000"];
		expect(majorityAverage(bits)).toBe("1010");
	});

	it("ties favor 1", () => {
		const bits = ["10", "01"];
		expect(majorityAverage(bits)).toBe("11");
	});

	it("handles varying lengths (shorter treated as zeros)", () => {
		const bits = ["1", "01", "001"];
		expect(majorityAverage(bits)).toBe("0");
	});
});

describe("compareBinaryStrings", () => {
	it("returns 1 for identical strings", () => {
		expect(compareBinaryStrings("101010", "101010")).toBe(1);
	});

	it("returns 0 for completely different strings", () => {
		expect(compareBinaryStrings("0000", "1111")).toBe(0);
	});

	it("returns fractional similarity between 0 and 1", () => {
		// Hamming distance = 2, length = 5 -> similarity = 1 - 2/5 = 0.6
		expect(compareBinaryStrings("11100", "11010")).toBeCloseTo(0.6);
	});
});
