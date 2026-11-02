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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	computeFrictionlessScore,
	timestampDecayFunction,
} from "../../../../tasks/frictionless/frictionlessTasksUtils.js";

describe("frictionlessTasksUtils", () => {
	describe("computeFrictionlessScore", () => {
		it("should return a score between 0 and 1 for valid components", () => {
			const result = computeFrictionlessScore({
				baseScore: 0.3,
				penalty: 0.2,
			});
			expect(result).toBe(0.5);
		});

		it("should cap the score at 1", () => {
			const result = computeFrictionlessScore({
				baseScore: 0.8,
				penalty: 0.5,
			});
			expect(result).toBe(1);
		});

		it("should skip undefined components", () => {
			const components: { [key: string]: number } = {
				baseScore: 0.3,
			};
			// Simulate an undefined value in the object
			Object.defineProperty(components, "missing", {
				value: undefined,
				enumerable: true,
			});
			const result = computeFrictionlessScore(components);
			expect(result).toBe(0.3);
		});

		it("should return NaN if a score component is NaN", () => {
			const result = computeFrictionlessScore({
				baseScore: Number.NaN,
				penalty: 0.2,
			});
			expect(result).toBeNaN();
		});

		it("should return NaN if all score components are NaN", () => {
			const result = computeFrictionlessScore({
				baseScore: Number.NaN,
				penalty: Number.NaN,
			});
			expect(result).toBeNaN();
		});

		it("should return 0 for empty components", () => {
			const result = computeFrictionlessScore({});
			expect(result).toBe(0);
		});

		// Regression: `acc + []` coerces the accumulator to a string, so any
		// numeric component summed after an array turned the whole score into
		// NaN. Mongoose defaults array paths to `[]`, so `triggeredDetectors`
		// is present on every session read back from the database, and the
		// captcha tasks spread `dnsAsymmetry` on afterwards — landing it after
		// the array in key order. This is the exact shape that produced it.
		it("ignores an empty triggeredDetectors array before a numeric component", () => {
			const result = computeFrictionlessScore({
				baseScore: 0.12402739646161609,
				lScore: 0.3,
				shadowDomPenalty: false,
				triggeredDetectors: [],
				dnsAsymmetry: 0.3,
			});
			expect(result).toBe(0.72);
		});

		it("ignores a populated triggeredDetectors array", () => {
			const result = computeFrictionlessScore({
				baseScore: 0.2,
				triggeredDetectors: [3, 7],
				dnsAsymmetry: 0.3,
			});
			expect(result).toBe(0.5);
		});

		// `shadowDomPenalty` is diagnostic metadata with no arithmetic weight
		// anywhere in the scoring path. Summed directly, `true` would silently
		// add a full 1.0 and cap every such session at the maximum score.
		it("ignores shadowDomPenalty in both boolean states", () => {
			expect(
				computeFrictionlessScore({
					baseScore: 0.2,
					shadowDomPenalty: true,
					lScore: 0.3,
				}),
			).toBe(0.5);
			expect(
				computeFrictionlessScore({
					baseScore: 0.2,
					shadowDomPenalty: false,
					lScore: 0.3,
				}),
			).toBe(0.5);
		});

		it("is order-independent across the non-numeric fields", () => {
			const expected = 0.72;
			expect(
				computeFrictionlessScore({
					triggeredDetectors: [],
					shadowDomPenalty: true,
					baseScore: 0.12,
					lScore: 0.3,
					dnsAsymmetry: 0.3,
				}),
			).toBe(expected);
			expect(
				computeFrictionlessScore({
					baseScore: 0.12,
					lScore: 0.3,
					dnsAsymmetry: 0.3,
					triggeredDetectors: [],
					shadowDomPenalty: true,
				}),
			).toBe(expected);
		});

		// A score that cannot be computed must not read as a low one, so a
		// genuinely numeric NaN still propagates — `typeof NaN === "number"`.
		it("still propagates NaN from a numeric component past an array", () => {
			const result = computeFrictionlessScore({
				baseScore: Number.NaN,
				triggeredDetectors: [],
				dnsAsymmetry: 0.3,
			});
			expect(result).toBeNaN();
		});

		it("still caps at 1 with non-numeric fields present", () => {
			const result = computeFrictionlessScore({
				baseScore: 0.8,
				triggeredDetectors: [],
				shadowDomPenalty: true,
				lScore: 0.5,
			});
			expect(result).toBe(1);
		});
	});

	describe("timestampDecayFunction", () => {
		let mockNow: number;

		beforeEach(() => {
			// Mock Date.now to return a consistent value
			mockNow = Date.now(); // Use current time for more realistic testing
			vi.spyOn(Date, "now").mockReturnValue(mockNow);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("should return 12 when timestamp is more than 1 hour old", () => {
			const oldTimestamp = mockNow - 3600001; // Just over 1 hour ago
			const result = timestampDecayFunction(oldTimestamp, 12);
			expect(result).toBe(12);
		});

		it("should return a number for recent timestamps", () => {
			const recentTimestamp = mockNow - 1000; // 1 second ago
			const result = timestampDecayFunction(recentTimestamp, 12);
			expect(typeof result).toBe("number");
			expect(result).toBeGreaterThanOrEqual(2);
			expect(result).toBeLessThanOrEqual(12);
		});

		it("should return a number for older timestamps within 1 hour", () => {
			const thirtyMinOld = mockNow - 1800000; // 30 minutes ago
			const result = timestampDecayFunction(thirtyMinOld, 12);
			expect(typeof result).toBe("number");
			expect(result).toBeGreaterThanOrEqual(2);
			expect(result).toBeLessThanOrEqual(12);
		});

		it("should handle very old timestamps", () => {
			const veryOldTimestamp = mockNow - 24 * 60 * 60 * 1000; // 24 hours ago
			const result = timestampDecayFunction(veryOldTimestamp, 12);
			expect(result).toBe(12);
		});

		it("should handle future timestamps", () => {
			const futureTimestamp = mockNow + 10000; // 10 seconds in future
			const result = timestampDecayFunction(futureTimestamp, 12);
			expect(typeof result).toBe("number");
			expect(result).toBeGreaterThanOrEqual(2);
			expect(result).toBeLessThanOrEqual(12);
		});

		it("should return NaN when timestamp is NaN", () => {
			const result = timestampDecayFunction(Number.NaN, 12);
			expect(result).toBeNaN();
		});
	});
});
