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

import {
	frictionlessImageThresholdDefault,
	frictionlessPuzzleThresholdDefault,
} from "@prosopo/types";
import { describe, expect, it } from "vitest";
import {
	DEFAULT_FRICTIONLESS_THRESHOLD,
	MAX_DETECTOR_EXTRA_IMAGE_ROUNDS,
	getRoundsFromTriggeredDetectors,
	resolveScoreLadder,
} from "../../../../../api/captcha/getFrictionlessCaptchaChallenge/constants.js";

describe("getFrictionlessCaptchaChallenge/constants", () => {
	it("uses 0.5 as the default frictionless threshold", () => {
		expect(DEFAULT_FRICTIONLESS_THRESHOLD).toBe(0.5);
	});

	describe("resolveScoreLadder", () => {
		it("falls back to both defaults when nothing is configured", () => {
			expect(resolveScoreLadder(undefined)).toEqual({
				botThreshold: frictionlessPuzzleThresholdDefault,
				botImageThreshold: frictionlessImageThresholdDefault,
			});
		});

		it("reads a pre-ladder bare number as the puzzle rung", () => {
			// Provider client records are replicated, not migrated in lockstep,
			// so a record written before the rollout can still land here. It
			// must keep routing, and keep meaning what it meant.
			expect(resolveScoreLadder(0.35)).toEqual({
				botThreshold: 0.35,
				botImageThreshold: frictionlessImageThresholdDefault,
			});
		});

		it("never lets a legacy number sit above the image rung", () => {
			// A sitekey tuned to 1 pre-ladder must not end up with an image
			// rung below its own pass threshold, which would invert the ladder.
			expect(resolveScoreLadder(1.5)).toEqual({
				botThreshold: 1.5,
				botImageThreshold: 1.5,
			});
		});

		it("reads both rungs when configured", () => {
			expect(
				resolveScoreLadder({
					frictionlessPuzzleThreshold: 0.4,
					frictionlessImageThreshold: 1.3,
				}),
			).toEqual({ botThreshold: 0.4, botImageThreshold: 1.3 });
		});

		it("clamps an image rung configured below the puzzle rung", () => {
			expect(
				resolveScoreLadder({
					frictionlessPuzzleThreshold: 0.8,
					frictionlessImageThreshold: 0.2,
				}),
			).toEqual({ botThreshold: 0.8, botImageThreshold: 0.8 });
		});

		it("treats a zero puzzle rung as zero, not as missing", () => {
			// `?? `, not `||` — 0 is a legitimate "challenge everything" rung.
			expect(
				resolveScoreLadder({
					frictionlessPuzzleThreshold: 0,
					frictionlessImageThreshold: 1,
				}).botThreshold,
			).toBe(0);
		});
	});

	describe("getRoundsFromTriggeredDetectors", () => {
		it("returns the baseline when the detector found nothing", () => {
			expect(getRoundsFromTriggeredDetectors(2, [])).toBe(2);
			expect(getRoundsFromTriggeredDetectors(2, undefined)).toBe(2);
		});

		it("adds a round per triggered detector", () => {
			expect(getRoundsFromTriggeredDetectors(2, [1])).toBe(3);
			expect(getRoundsFromTriggeredDetectors(2, [1, 7, 12])).toBe(5);
		});

		it("caps the detector contribution so a noisy payload can't wall a user off", () => {
			const many: number[] = Array.from({ length: 40 }, (_, i) => i);
			expect(getRoundsFromTriggeredDetectors(2, many)).toBe(
				2 + MAX_DETECTOR_EXTRA_IMAGE_ROUNDS,
			);
		});

		it("is monotonically non-decreasing in the detector count", () => {
			let last = -Number.POSITIVE_INFINITY;
			for (let count = 0; count <= 20; count++) {
				const rounds = getRoundsFromTriggeredDetectors(
					3,
					Array.from({ length: count }, (_, i) => i),
				);
				expect(rounds).toBeGreaterThanOrEqual(last);
				last = rounds;
			}
		});
	});
});
