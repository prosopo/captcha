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
	DEFAULT_RENDER_SETTINGS,
	type PuzzleRenderSettings,
} from "@prosopo/puzzle-assets";
import {
	puzzleDecoyCountFieldSchema,
	puzzleDecoyEdgeDarknessFieldSchema,
	puzzleDecoyHoleDarkenFieldSchema,
	puzzlePieceScaleFieldSchema,
	puzzleToleranceFieldSchema,
} from "@prosopo/types";
import { describe, expect, it } from "vitest";
import {
	MAX_AUTO_ESCALATION_LEVEL,
	MIN_DECOY_HOLE_DARKEN_MARGIN,
	PUZZLE_DIFFICULTY_LEVELS,
	clampDifficultyLevel,
	samplePuzzleDifficulty,
	severityToPuzzleDifficulty,
} from "../../../tasks/puzzle/puzzleDifficulty.js";
import { resolvePuzzleRenderSettings } from "../../../tasks/puzzle/puzzleRenderer.js";

const HOLE_DARKEN = DEFAULT_RENDER_SETTINGS.holeDarken;
// Enough draws to exercise several full stratified cycles per knob.
const SAMPLES = 400;

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

	it("keeps every band inside the settings-schema bounds", () => {
		for (const band of PUZZLE_DIFFICULTY_LEVELS) {
			for (const v of [band.tolerance.min, band.tolerance.max]) {
				expect(puzzleToleranceFieldSchema.safeParse(v).success).toBe(true);
			}
			for (const v of [band.decoyCount.min, band.decoyCount.max]) {
				expect(puzzleDecoyCountFieldSchema.safeParse(v).success).toBe(true);
			}
			for (const v of [
				band.decoyEdgeDarkness.min,
				band.decoyEdgeDarkness.max,
			]) {
				expect(puzzleDecoyEdgeDarknessFieldSchema.safeParse(v).success).toBe(
					true,
				);
			}
			for (const v of [band.decoyHoleDarken.min, band.decoyHoleDarken.max]) {
				expect(puzzleDecoyHoleDarkenFieldSchema.safeParse(v).success).toBe(
					true,
				);
			}
			for (const v of [band.pieceScale.min, band.pieceScale.max]) {
				expect(puzzlePieceScaleFieldSchema.safeParse(v).success).toBe(true);
			}
		}
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

describe("samplePuzzleDifficulty", () => {
	it("stays within its band across many draws", () => {
		for (let level = 0; level < PUZZLE_DIFFICULTY_LEVELS.length; level++) {
			const band = PUZZLE_DIFFICULTY_LEVELS[level];
			if (!band) throw new Error("missing level");
			for (let i = 0; i < SAMPLES; i++) {
				const s = samplePuzzleDifficulty(
					level,
					HOLE_DARKEN,
					PUZZLE_DIFFICULTY_LEVELS.length,
				);
				expect(s.tolerance).toBeGreaterThanOrEqual(band.tolerance.min);
				expect(s.tolerance).toBeLessThanOrEqual(band.tolerance.max);
				expect(s.puzzle.decoyCount).toBeGreaterThanOrEqual(band.decoyCount.min);
				expect(s.puzzle.decoyCount).toBeLessThanOrEqual(band.decoyCount.max);
			}
		}
	});

	it("actually varies — a fixed config would be learnable", () => {
		const seen = new Set<string>();
		for (let i = 0; i < SAMPLES; i++) {
			const s = samplePuzzleDifficulty(2, HOLE_DARKEN);
			seen.add(`${s.tolerance}:${s.puzzle.decoyCount}`);
		}
		expect(seen.size).toBeGreaterThan(1);
	});

	it("never lets decoys reach the real cut's darkness", () => {
		// The invariant the whole ladder depends on: the real hole must stay the
		// deepest region on the frame, or the puzzle is unsolvable by a human.
		for (let level = 0; level < PUZZLE_DIFFICULTY_LEVELS.length; level++) {
			for (let i = 0; i < SAMPLES; i++) {
				const s = samplePuzzleDifficulty(
					level,
					HOLE_DARKEN,
					PUZZLE_DIFFICULTY_LEVELS.length,
				);
				expect(s.puzzle.decoyHoleDarken as number).toBeGreaterThanOrEqual(
					HOLE_DARKEN + MIN_DECOY_HOLE_DARKEN_MARGIN,
				);
			}
		}
	});

	it("holds the invariant even when the site pushes holeDarken up", () => {
		// A site-level holeDarken override lightens the real cut, which would
		// otherwise let a band authored against the default invert the pair.
		const lightHole = 0.75;
		for (let i = 0; i < SAMPLES; i++) {
			const s = samplePuzzleDifficulty(4, lightHole, 4);
			expect(s.puzzle.decoyHoleDarken as number).toBeGreaterThanOrEqual(
				lightHole + MIN_DECOY_HOLE_DARKEN_MARGIN,
			);
		}
	});
});

describe("resolvePuzzleRenderSettings invariant enforcement", () => {
	it("repairs an operator-authored inversion", () => {
		// Site settings and a traffic-filter policy each set one half of the
		// pair without sight of the other, so an inversion is reachable through
		// entirely valid individual overrides.
		const resolved: PuzzleRenderSettings = resolvePuzzleRenderSettings(
			{ holeDarken: 0.8 },
			{ decoyHoleDarken: 0.2 },
		);
		expect(resolved.decoyHoleDarken).toBeGreaterThanOrEqual(
			resolved.holeDarken + MIN_DECOY_HOLE_DARKEN_MARGIN,
		);
	});

	it("leaves a valid pair untouched", () => {
		const resolved = resolvePuzzleRenderSettings({
			holeDarken: 0.5,
			decoyHoleDarken: 0.9,
		});
		expect(resolved.holeDarken).toBe(0.5);
		expect(resolved.decoyHoleDarken).toBe(0.9);
	});
});
