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

import type { ImageRoundsBounds } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	DECAY_CEILING_ROUNDS,
	DECAY_FLOOR_ROUNDS,
	DECAY_FULL_AGE_MS,
	DECAY_START_AGE_MS,
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
	});

	describe("timestampDecayFunction", () => {
		let mockNow: number;
		// Wide enough not to bind the curve, so these cases exercise the
		// staleness ramp rather than the site's clamp.
		const wide: ImageRoundsBounds = { imageMinRounds: 2, imageMaxRounds: 32 };

		beforeEach(() => {
			mockNow = Date.now();
			vi.spyOn(Date, "now").mockReturnValue(mockNow);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("serves the floor for a session inside the tolerated age window", () => {
			expect(timestampDecayFunction(mockNow, wide)).toBe(DECAY_FLOOR_ROUNDS);
			expect(timestampDecayFunction(mockNow - 1000, wide)).toBe(
				DECAY_FLOOR_ROUNDS,
			);
			expect(timestampDecayFunction(mockNow - DECAY_START_AGE_MS, wide)).toBe(
				DECAY_FLOOR_ROUNDS,
			);
		});

		it("serves the ceiling once the session is fully decayed", () => {
			expect(timestampDecayFunction(mockNow - DECAY_FULL_AGE_MS, wide)).toBe(
				DECAY_CEILING_ROUNDS,
			);
			expect(timestampDecayFunction(mockNow - 24 * 60 * 60 * 1000, wide)).toBe(
				DECAY_CEILING_ROUNDS,
			);
		});

		it("ramps between the floor and the ceiling across the decay window", () => {
			// The bug this replaces: every age in this window returned 3.
			const midpoint = mockNow - (DECAY_START_AGE_MS + DECAY_FULL_AGE_MS) / 2;
			const mid = timestampDecayFunction(midpoint, wide);
			expect(mid).toBeGreaterThan(DECAY_FLOOR_ROUNDS);
			expect(mid).toBeLessThan(DECAY_CEILING_ROUNDS);
			expect(mid).toBe(
				Math.round((DECAY_FLOOR_ROUNDS + DECAY_CEILING_ROUNDS) / 2),
			);
		});

		it("is monotonic in age", () => {
			const ages = [0, 10, 20, 30, 40, 50, 60, 90].map(
				(minutes) => minutes * 60 * 1000,
			);
			const rounds = ages.map((age) =>
				timestampDecayFunction(mockNow - age, wide),
			);
			for (let i = 1; i < rounds.length; i++) {
				expect(rounds[i]).toBeGreaterThanOrEqual(rounds[i - 1] as number);
			}
		});

		it("treats a future timestamp as fresh, not stale", () => {
			expect(timestampDecayFunction(mockNow + 10000, wide)).toBe(
				DECAY_FLOOR_ROUNDS,
			);
		});

		it("treats an unreadable timestamp as fully decayed", () => {
			// Previously returned NaN, which the caller wrote straight onto the
			// session record.
			expect(timestampDecayFunction(Number.NaN, wide)).toBe(
				DECAY_CEILING_ROUNDS,
			);
		});

		it("never exceeds the site's configured maximum", () => {
			const capped: ImageRoundsBounds = {
				imageMinRounds: 2,
				imageMaxRounds: 4,
			};
			const ages = [
				0,
				DECAY_START_AGE_MS,
				DECAY_FULL_AGE_MS,
				10 * 60 * 60 * 1000,
			];
			for (const age of ages) {
				expect(
					timestampDecayFunction(mockNow - age, capped),
				).toBeLessThanOrEqual(4);
			}
			expect(timestampDecayFunction(mockNow - DECAY_FULL_AGE_MS, capped)).toBe(
				4,
			);
		});

		it("never drops below the site's configured minimum", () => {
			const floored: ImageRoundsBounds = {
				imageMinRounds: 8,
				imageMaxRounds: 32,
			};
			expect(timestampDecayFunction(mockNow, floored)).toBe(8);
			expect(timestampDecayFunction(mockNow - DECAY_FULL_AGE_MS, floored)).toBe(
				DECAY_CEILING_ROUNDS,
			);
		});

		it("collapses to the max when the site pins min and max together", () => {
			const pinned: ImageRoundsBounds = {
				imageMinRounds: 5,
				imageMaxRounds: 5,
			};
			expect(timestampDecayFunction(mockNow, pinned)).toBe(5);
			expect(timestampDecayFunction(mockNow - DECAY_FULL_AGE_MS, pinned)).toBe(
				5,
			);
		});

		it("falls back to the schema defaults when neither bound is stored", () => {
			expect(timestampDecayFunction(mockNow, {})).toBe(DECAY_FLOOR_ROUNDS);
			expect(timestampDecayFunction(mockNow - DECAY_FULL_AGE_MS, {})).toBe(
				DECAY_CEILING_ROUNDS,
			);
		});
	});
});
