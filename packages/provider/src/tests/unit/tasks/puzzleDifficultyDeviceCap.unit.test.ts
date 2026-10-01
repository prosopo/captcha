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
	MAX_AUTO_ESCALATION_LEVEL,
	MAX_AUTO_ESCALATION_LEVEL_TOUCH,
	PUZZLE_DIFFICULTY_LEVELS,
	resolveMaxEscalationLevel,
	severityToPuzzleDifficulty,
} from "@prosopo/captcha-severity";
import { DEFAULT_RENDER_SETTINGS } from "@prosopo/puzzle-assets";
import { describe, expect, it } from "vitest";
import { samplePuzzleDifficulty } from "../../../tasks/puzzle/puzzleDifficulty.js";

const BASE_IMAGE_ROUNDS = 2;
const SAMPLES = 400;

const escalatedLevel = (
	siteMax: number | undefined,
	isTouch: boolean,
): number =>
	severityToPuzzleDifficulty(
		1000,
		BASE_IMAGE_ROUNDS,
		resolveMaxEscalationLevel(siteMax, isTouch),
	);

describe("puzzle difficulty device ceiling", () => {
	it("never serves a touch session a tolerance below the L2 floor", () => {
		const level = escalatedLevel(4, true);
		const floor = PUZZLE_DIFFICULTY_LEVELS[MAX_AUTO_ESCALATION_LEVEL_TOUCH]
			?.tolerance.min as number;
		for (let i = 0; i < SAMPLES; i++) {
			const sampled = samplePuzzleDifficulty(
				level,
				DEFAULT_RENDER_SETTINGS.holeDarken,
			);
			expect(sampled.tolerance).toBeGreaterThanOrEqual(floor);
		}
	});

	it("still serves pointer sessions the full L3 range", () => {
		const level = escalatedLevel(undefined, false);
		expect(level).toBe(MAX_AUTO_ESCALATION_LEVEL);
		const band = PUZZLE_DIFFICULTY_LEVELS[MAX_AUTO_ESCALATION_LEVEL];
		expect(band).toBeDefined();
		if (!band) return;
		const seen = new Set<number>();
		for (let i = 0; i < SAMPLES; i++) {
			seen.add(
				samplePuzzleDifficulty(level, DEFAULT_RENDER_SETTINGS.holeDarken)
					.tolerance,
			);
		}
		expect(Math.min(...seen)).toBe(band.tolerance.min);
	});

	it("gives a touch session an easier worst case than a pointer session", () => {
		const touchFloor = PUZZLE_DIFFICULTY_LEVELS[escalatedLevel(4, true)]
			?.tolerance.min as number;
		const pointerFloor = PUZZLE_DIFFICULTY_LEVELS[escalatedLevel(4, false)]
			?.tolerance.min as number;
		expect(touchFloor).toBeGreaterThan(pointerFloor);
	});

	it("lets a site pin itself below the device ceiling on either device", () => {
		expect(escalatedLevel(0, true)).toBe(0);
		expect(escalatedLevel(0, false)).toBe(0);
	});

	it("keeps the reserved level unreachable by escalation on both devices", () => {
		const reserved = PUZZLE_DIFFICULTY_LEVELS.length - 1;
		expect(escalatedLevel(4, true)).toBeLessThan(reserved);
		expect(escalatedLevel(4, false)).toBeLessThan(reserved);
	});
});
