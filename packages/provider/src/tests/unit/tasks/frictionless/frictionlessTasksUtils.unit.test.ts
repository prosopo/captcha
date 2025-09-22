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
import {
	computeFrictionlessScore,
	timestampDecayFunction,
} from "../../../../tasks/frictionless/frictionlessTasksUtils.js";

describe("Frictionless Task Utils", () => {
	describe("computeFrictionlessScore", () => {
		it("should return the minimum of 1 and the sum of all score components", async () => {
			const scoreComponents = {
				a: 0.2,
				b: 0.3,
				c: 0.4,
				d: 0.1,
			};
			const result = computeFrictionlessScore(scoreComponents);
			expect(result).toBe(1);
		});
		it("should return the minimum of 1 and the sum of all score components", async () => {
			const scoreComponents = {
				a: 0.1,
				b: 0.1,
				c: 0.1,
				d: 0.1,
			};
			const result = computeFrictionlessScore(scoreComponents);
			expect(result).toBe(0.4);
		});
		it("should return 1 if the sum of all score components is greater than 1", async () => {
			const scoreComponents = {
				a: 1,
				b: 0.3,
				c: 0.4,
				d: 0.2,
			};
			const result = computeFrictionlessScore(scoreComponents);
			expect(result).toBe(1);
		});
	});

	describe("timestampDecayFunction", () => {
		it("returns at least 2 for age 0", () => {
			expect(timestampDecayFunction(0)).toBeGreaterThanOrEqual(2);
		});

		it("returns a number for positive age", () => {
			const result = timestampDecayFunction(1000);
			expect(typeof result).toBe("number");
		});

		it("returns higher values for larger age", () => {
			const smallAge = timestampDecayFunction(1000);
			const largeAge = timestampDecayFunction(1000000);
			expect(largeAge).toBeGreaterThanOrEqual(smallAge);
		});

		it("handles very large age values", () => {
			const result = timestampDecayFunction(Number.MAX_SAFE_INTEGER);
			expect(result).toBeGreaterThanOrEqual(2);
		});

		it("returns 12 for age of approximately 55 years", () => {
			const result = timestampDecayFunction(new Date("1970-01-01").getTime());
			expect(result).toBe(12);
		});
		it("should return 3 for a timestamp equal to current time", async () => {
			const now = Date.now();
			const result = timestampDecayFunction(now);
			expect(result).toBe(3);
		});
	});
});
