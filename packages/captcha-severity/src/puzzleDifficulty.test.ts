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
import {
	MAX_AUTO_ESCALATION_LEVEL,
	PUZZLE_DIFFICULTY_LEVELS,
	clampDifficultyLevel,
	puzzleDifficultyToSeverity,
	severityToPuzzleDifficulty,
} from "./puzzleDifficulty.js";

describe("PUZZLE_DIFFICULTY_LEVELS table", () => {
	it("is ordered strictly harder as the level rises", () => {
		for (let i = 1; i < PUZZLE_DIFFICULTY_LEVELS.length; i++) {
			const prev = PUZZLE_DIFFICULTY_LEVELS[i - 1];
			const cur = PUZZLE_DIFFICULTY_LEVELS[i];
			if (!prev || !cur) throw new Error("missing level");
			// Harder = tighter tolerance, more decoys, decoys closer to the real
			// cut's darkness, stronger decoy rims, smaller pieces.
			expect(cur.tolerance.max).toBeLessThan(prev.tolerance.max);
			expect(cur.decoyCount.min).toBeGreaterThanOrEqual(prev.decoyCount.min);
			expect(cur.decoyHoleDarken.max).toBeLessThan(prev.decoyHoleDarken.max);
			expect(cur.decoyEdgeDarkness.max).toBeGreaterThan(
				prev.decoyEdgeDarkness.max,
			);
			expect(cur.pieceScale.max).toBeLessThan(prev.pieceScale.max);
		}
	});

	it("overlaps adjacent bands so one render does not identify the level", () => {
		// If bands were disjoint, a solver could read the level straight off the
		// decoy count and know whether it had been flagged.
		for (let i = 1; i < PUZZLE_DIFFICULTY_LEVELS.length; i++) {
			const prev = PUZZLE_DIFFICULTY_LEVELS[i - 1];
			const cur = PUZZLE_DIFFICULTY_LEVELS[i];
			if (!prev || !cur) throw new Error("missing level");
			expect(cur.decoyCount.min).toBeLessThanOrEqual(prev.decoyCount.max);
			expect(cur.tolerance.max).toBeGreaterThanOrEqual(prev.tolerance.min);
		}
	});

	it("indexes each band by its own position", () => {
		PUZZLE_DIFFICULTY_LEVELS.forEach((band, index) => {
			expect(band.level).toBe(index);
		});
	});
});

describe("severityToPuzzleDifficulty", () => {
	it("maps no requested rounds to the baseline level", () => {
		expect(severityToPuzzleDifficulty(undefined, 2)).toBe(0);
	});

	it("maps a request at or below the site baseline to the baseline level", () => {
		expect(severityToPuzzleDifficulty(2, 2)).toBe(0);
		expect(severityToPuzzleDifficulty(1, 2)).toBe(0);
	});

	it("rises monotonically with rounds requested above the baseline", () => {
		const levels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 12].map((extra) =>
			severityToPuzzleDifficulty(2 + extra, 2, PUZZLE_DIFFICULTY_LEVELS.length),
		);
		for (let i = 1; i < levels.length; i++) {
			expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1] as number);
		}
	});

	it("is relative to the site baseline, not an absolute round count", () => {
		// Same absolute count means different severity on sites whose ordinary
		// challenge is a different length.
		expect(severityToPuzzleDifficulty(6, 2)).toBeGreaterThan(
			severityToPuzzleDifficulty(6, 6),
		);
	});

	it("caps automatic escalation below the hardest level", () => {
		// With image disabled there is no fallback modality, so the hardest
		// level must not be reachable by escalation alone.
		expect(severityToPuzzleDifficulty(100, 2)).toBe(MAX_AUTO_ESCALATION_LEVEL);
		expect(MAX_AUTO_ESCALATION_LEVEL).toBeLessThan(
			PUZZLE_DIFFICULTY_LEVELS.length - 1,
		);
	});
});

describe("clampDifficultyLevel", () => {
	it("clamps out-of-range and non-finite input", () => {
		expect(clampDifficultyLevel(-5)).toBe(0);
		expect(clampDifficultyLevel(Number.NaN)).toBe(0);
		expect(clampDifficultyLevel(99)).toBe(MAX_AUTO_ESCALATION_LEVEL);
	});
});

describe("puzzleDifficultyToSeverity", () => {
	// The property every writer depends on: a difficulty chosen in a rule
	// editor, or normalised by a detector, must come back off the wire as the
	// same difficulty the provider serves.
	it("round-trips every reachable level, on any site baseline", () => {
		for (const baseImageRounds of [1, 2, 5, 10]) {
			for (let level = 0; level <= MAX_AUTO_ESCALATION_LEVEL; level++) {
				const rounds = puzzleDifficultyToSeverity(level, baseImageRounds);
				expect(severityToPuzzleDifficulty(rounds, baseImageRounds)).toBe(level);
			}
		}
	});

	it("round-trips the reserved level when the caller lifts the ceiling", () => {
		const maxLevel = PUZZLE_DIFFICULTY_LEVELS.length - 1;
		const rounds = puzzleDifficultyToSeverity(maxLevel, 2, maxLevel);
		expect(severityToPuzzleDifficulty(rounds, 2, maxLevel)).toBe(maxLevel);
	});

	it("gives each level a distinct round count", () => {
		const counts = Array.from(
			{ length: MAX_AUTO_ESCALATION_LEVEL + 1 },
			(_, level) => puzzleDifficultyToSeverity(level, 2),
		);
		expect(new Set(counts).size).toBe(counts.length);
	});

	it("clamps to the same ceiling severityToPuzzleDifficulty does", () => {
		expect(puzzleDifficultyToSeverity(99, 2)).toBe(
			puzzleDifficultyToSeverity(MAX_AUTO_ESCALATION_LEVEL, 2),
		);
		expect(puzzleDifficultyToSeverity(-1, 2)).toBe(2);
		expect(puzzleDifficultyToSeverity(Number.NaN, 2)).toBe(2);
	});

	it("leaves the site's own settings in force at level 0", () => {
		// Level 0 samples no band, so the count it maps to must be one the
		// provider reads as "nothing escalated this session".
		expect(severityToPuzzleDifficulty(puzzleDifficultyToSeverity(0, 2), 2)).toBe(
			0,
		);
	});
});
