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
import { hammingDistance } from "../hammingDistance.js";

describe("hammingDistance", () => {
	it("returns 0 for identical hashes", () => {
		expect(hammingDistance("101010", "101010")).toBe(0);
	});

	it("counts all differing bits", () => {
		expect(hammingDistance("0000", "1111")).toBe(4);
	});

	it("counts mixed differences correctly", () => {
		expect(hammingDistance("1100", "1001")).toBe(2);
	});

	it("returns 0 for empty strings", () => {
		expect(hammingDistance("", "")).toBe(0);
	});

	it("throws for unequal length hashes", () => {
		expect(() => hammingDistance("101", "10")).toThrow(
			"Hashes must be of equal length",
		);
	});

	it("handles large inputs efficiently", () => {
		const a = "01".repeat(500); // length 1000
		const b = "10".repeat(500); // length 1000, every bit differs
		expect(hammingDistance(a, b)).toBe(1000);
	});
});
