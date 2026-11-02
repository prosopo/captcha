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
	MIN_DECOY_HOLE_DARKEN_MARGIN,
	PUZZLE_DIFFICULTY_LEVELS,
	type PuzzleDifficultyBand,
	clampDifficultyLevel,
} from "@prosopo/captcha-severity";
import type { IPuzzleSettings } from "@prosopo/types";
import { createStratifiedSampler } from "./stratifiedSampler.js";

/**
 * Render half of the puzzle difficulty ladder: given a level, draw a concrete
 * puzzle config from its bands.
 *
 * The ladder itself — the band table, `severityToPuzzleDifficulty` and its
 * inverse — lives in `@prosopo/captcha-severity`, so that every consumer
 * derives a difficulty from one table: this provider, and the rule-authoring
 * and rule-editing consumers outside this repository. Only the sampling stayed
 * here: it needs `IPuzzleSettings` and a `node:crypto`-backed sampler, and
 * that package is deliberately dependency-free and browser-safe.
 */

// One sampler per knob. Sharing a cursor would make the knobs advance in
// lockstep and let a solver infer the whole config — and hence the level —
// from a single observed value. See stratifiedSampler.
const toleranceSampler = createStratifiedSampler();
const decoyCountSampler = createStratifiedSampler();
const decoyHoleDarkenSampler = createStratifiedSampler();
const decoyEdgeDarknessSampler = createStratifiedSampler();

export interface SampledPuzzleDifficulty {
	level: number;
	tolerance: number;
	puzzle: IPuzzleSettings;
}

/**
 * Draw a concrete puzzle config from a level's bands.
 *
 * Sampling is server-side and per-challenge, and is deliberately NOT derived
 * from anything the client supplies (sessionId, token, ip, timestamp). A
 * client-derived seed would let a bot replay a request to obtain the same
 * render, or precompute one offline.
 *
 * `pieceScale` is passed through as a range rather than drawn here: the
 * renderer's own stratified piece-size draw consumes it in
 * `resolvePuzzlePieceSize`, and sampling twice would narrow the distribution.
 */
export const samplePuzzleDifficulty = (
	level: number,
	holeDarken: number,
	maxLevel: number = MAX_AUTO_ESCALATION_LEVEL,
): SampledPuzzleDifficulty => {
	const index = clampDifficultyLevel(level, maxLevel);
	const band = PUZZLE_DIFFICULTY_LEVELS[index] as PuzzleDifficultyBand;

	// Clamp AFTER sampling: the bands are authored to respect the margin, but
	// an edit to the table (or a site-level holeDarken override pushing the
	// real cut lighter) must not be able to invert the invariant.
	const decoyHoleDarkenFloor = holeDarken + MIN_DECOY_HOLE_DARKEN_MARGIN;
	const sampledDecoyHoleDarken = decoyHoleDarkenSampler.sample(
		band.decoyHoleDarken.min,
		band.decoyHoleDarken.max,
	);

	return {
		level: index,
		tolerance: toleranceSampler.sampleInt(
			band.tolerance.min,
			band.tolerance.max,
		),
		puzzle: {
			decoyCount: decoyCountSampler.sampleInt(
				band.decoyCount.min,
				band.decoyCount.max,
			),
			decoyEdgeDarkness: decoyEdgeDarknessSampler.sampleInt(
				band.decoyEdgeDarkness.min,
				band.decoyEdgeDarkness.max,
			),
			decoyHoleDarken: Math.min(
				1,
				Math.max(decoyHoleDarkenFloor, sampledDecoyHoleDarken),
			),
			pieceScale: { min: band.pieceScale.min, max: band.pieceScale.max },
		},
	};
};

/**
 * Share of the background the decoys may cover before the puzzle stops being
 * readable, as `decoyCount * pieceSize^2 / (width * height)`. Above 1.0 the
 * decoys more than cover the image and start piling on top of each other.
 *
 * The ladder draws `decoyCount` and `pieceScale` from a band independently —
 * one in `samplePuzzleDifficulty`, the other in the renderer's own piece-size
 * draw — so nothing ties how many decoys there are to how big they are. Ten
 * decoys against a 126px piece is a different puzzle from ten against a 42px
 * one, and a level is not monotonic in what the user actually sees: at the
 * table's current bands a level-0 render can be crowded 7x harder than a
 * level-3 one.
 *
 * The ceiling is the top of the mid-band, so a render drawn near the middle of
 * any level is untouched and only the crowded corner is trimmed.
 */
export const MAX_DECOY_COVERAGE = 1.2;

/**
 * The same ceiling for a touch device, which needs to be lower rather than
 * equal.
 *
 * `easePieceScaleForTouch` raises the piece-scale floor to
 * `TOUCH_MIN_PIECE_SCALE` so a finger does not hide the piece, but it leaves
 * `decoyCount` alone. Bigger decoys in the same number is strictly more
 * crowding, so easing for touch currently makes the readability problem worse:
 * at level 4 the *minimum* coverage on touch is 1.56, meaning every render is
 * a pile. A phone also shows the same 300x200 background on a far smaller
 * screen, so the same coverage reads as busier.
 */
export const MAX_DECOY_COVERAGE_TOUCH = 0.85;

/** Never trim below the lowest count any band asks for. */
export const MIN_DECOY_COUNT = 4;

/**
 * Trim `decoyCount` so the decoys cannot cover more of the background than the
 * ceiling allows at the piece size actually drawn.
 *
 * Only ever reduces: a render already inside the ceiling is returned
 * unchanged, so this cannot make a puzzle harder than the ladder intended.
 */
export const capDecoyCountForCoverage = (
	decoyCount: number,
	pieceSizePx: number,
	backgroundWidth: number,
	backgroundHeight: number,
	maxCoverage: number,
): number => {
	const backgroundArea = backgroundWidth * backgroundHeight;
	if (pieceSizePx <= 0 || backgroundArea <= 0) return decoyCount;

	const perDecoyCoverage = (pieceSizePx * pieceSizePx) / backgroundArea;
	if (perDecoyCoverage <= 0) return decoyCount;

	const allowed = Math.floor(maxCoverage / perDecoyCoverage);
	return Math.max(MIN_DECOY_COUNT, Math.min(decoyCount, allowed));
};
