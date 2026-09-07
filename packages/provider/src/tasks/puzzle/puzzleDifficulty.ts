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
