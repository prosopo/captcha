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

import type { IPuzzleSettings } from "@prosopo/types";
import { createStratifiedSampler } from "./stratifiedSampler.js";

/**
 * Ordered puzzle difficulty ladder.
 *
 * An image captcha expresses severity as a round count — "solve 2" vs "solve
 * 8". A puzzle has no rounds (one puzzle per session, see
 * `getPuzzleCaptchaChallenge`), so on a site with image disabled every
 * escalation would otherwise collapse into an identical challenge and the
 * graduated response would be lost. This ladder is the puzzle's equivalent
 * currency.
 *
 * Each level is a BAND per knob, not a fixed config, for two reasons:
 *
 *   1. Per-challenge jitter stops a solver hard-coding thresholds against a
 *      known render (fixed decoy count, fixed rim darkness, ...).
 *   2. Adjacent bands deliberately OVERLAP, so a single observed challenge
 *      does not identify which level it came from. Without overlap the
 *      decoy count alone would leak the level, and a solver could tell
 *      "I am suspected" from one render.
 *
 * `level` is the difficulty of the challenge, and is unrelated to
 * `Tier` in @prosopo/types, which is the customer's billing plan.
 */

export interface PuzzleDifficultyRange {
	min: number;
	max: number;
}

export interface PuzzleDifficultyBand {
	/** Index into PUZZLE_DIFFICULTY_LEVELS. 0 is the site's ordinary puzzle. */
	level: number;
	/** Placement accuracy required, in px. Lower is stricter. */
	tolerance: PuzzleDifficultyRange;
	/** Decoy silhouettes scattered on the background. More is harder. */
	decoyCount: PuzzleDifficultyRange;
	/**
	 * Multiplier on decoy pixels. Lower brings decoys closer to the real
	 * cut's darkness, which is the anti-solver dial — see the invariant
	 * below.
	 */
	decoyHoleDarken: PuzzleDifficultyRange;
	/** Dark inner rim amplitude on each decoy, 0-255. Higher is harder. */
	decoyEdgeDarkness: PuzzleDifficultyRange;
	/** Piece size as a fraction of background width. Smaller is harder. */
	pieceScale: PuzzleDifficultyRange;
}

/**
 * Minimum gap that must remain between `decoyHoleDarken` and `holeDarken`.
 *
 * The real cutout has to stay the deepest region on the frame or a human
 * cannot tell target from decoy at all. But pushed too far apart, a solver
 * simply thresholds on brightness and ignores shape. The ladder walks
 * `decoyHoleDarken` down toward `holeDarken` as difficulty rises; this floor
 * is what stops it crossing over. Enforced by clamping every sampled value,
 * not by trusting the band table to be authored correctly.
 */
export const MIN_DECOY_HOLE_DARKEN_MARGIN = 0.04;

/**
 * Highest level reachable by AUTOMATIC escalation.
 *
 * With image disabled there is no fallback modality: a user who genuinely
 * cannot solve the hardest puzzle has no route through the site. L4 is
 * therefore reserved for sessions already destined to fail verification (a
 * `deferToVerify` block), where the difficulty exists only to cost an
 * automated solver time — not to gate a human who might be legitimate.
 */
export const MAX_AUTO_ESCALATION_LEVEL = 3;

/**
 * L0 reproduces the shipped defaults (decoyCount 5, decoyEdgeDarkness 20,
 * decoyHoleDarken 0.7, tolerance 15, pieceScale 0.15-0.45) so a site that
 * never escalates sees no change in behaviour.
 *
 * The numbers above L0 are STARTING POINTS, not calibrated values. They need
 * validating against observed human first-attempt solve rate per level,
 * segmented by device class — see the shadow-calibration note on
 * `severityToPuzzleDifficulty`.
 */
export const PUZZLE_DIFFICULTY_LEVELS: readonly PuzzleDifficultyBand[] = [
	{
		level: 0,
		tolerance: { min: 14, max: 16 },
		decoyCount: { min: 4, max: 6 },
		decoyHoleDarken: { min: 0.68, max: 0.72 },
		decoyEdgeDarkness: { min: 18, max: 22 },
		pieceScale: { min: 0.15, max: 0.45 },
	},
	{
		level: 1,
		tolerance: { min: 12, max: 15 },
		decoyCount: { min: 6, max: 10 },
		decoyHoleDarken: { min: 0.66, max: 0.7 },
		decoyEdgeDarkness: { min: 20, max: 24 },
		pieceScale: { min: 0.14, max: 0.4 },
	},
	{
		level: 2,
		tolerance: { min: 10, max: 13 },
		decoyCount: { min: 10, max: 16 },
		decoyHoleDarken: { min: 0.64, max: 0.68 },
		decoyEdgeDarkness: { min: 22, max: 27 },
		pieceScale: { min: 0.12, max: 0.34 },
	},
	{
		level: 3,
		tolerance: { min: 8, max: 11 },
		decoyCount: { min: 16, max: 26 },
		decoyHoleDarken: { min: 0.62, max: 0.66 },
		decoyEdgeDarkness: { min: 25, max: 30 },
		pieceScale: { min: 0.1, max: 0.28 },
	},
	{
		level: 4,
		tolerance: { min: 6, max: 9 },
		decoyCount: { min: 26, max: 40 },
		decoyHoleDarken: { min: 0.6, max: 0.64 },
		decoyEdgeDarkness: { min: 28, max: 34 },
		pieceScale: { min: 0.09, max: 0.22 },
	},
];

// One sampler per knob. Sharing a cursor would make the knobs advance in
// lockstep and let a solver infer the whole config — and hence the level —
// from a single observed value. See stratifiedSampler.
const toleranceSampler = createStratifiedSampler();
const decoyCountSampler = createStratifiedSampler();
const decoyHoleDarkenSampler = createStratifiedSampler();
const decoyEdgeDarknessSampler = createStratifiedSampler();

export const clampDifficultyLevel = (
	level: number,
	maxLevel: number = MAX_AUTO_ESCALATION_LEVEL,
): number => {
	const ceiling = Math.min(maxLevel, PUZZLE_DIFFICULTY_LEVELS.length - 1);
	if (!Number.isFinite(level)) return 0;
	return Math.max(0, Math.min(Math.floor(level), ceiling));
};

/**
 * Map the severity currency every existing call-site already speaks — image
 * rounds — onto a difficulty level.
 *
 * Severity is expressed as rounds ABOVE the site's ordinary count rather than
 * an absolute, because the baseline (`env.config.captchas.solved.count`, or a
 * rule's own `solvedImagesCount`) varies per site. "Two more rounds than
 * normal" means the same thing everywhere; "four rounds" does not.
 *
 * Keeping one ordering here means the score ladder, the no-measurement gates,
 * detector rules and traffic-filter policies cannot drift apart on what
 * counts as more severe.
 */
export const severityToPuzzleDifficulty = (
	requestedImageRounds: number | undefined,
	baseImageRounds: number,
	maxLevel: number = MAX_AUTO_ESCALATION_LEVEL,
): number => {
	if (requestedImageRounds === undefined) return 0;
	const excess = requestedImageRounds - baseImageRounds;
	if (!Number.isFinite(excess) || excess <= 0)
		return clampDifficultyLevel(0, maxLevel);
	if (excess <= 2) return clampDifficultyLevel(1, maxLevel);
	if (excess <= 4) return clampDifficultyLevel(2, maxLevel);
	if (excess <= 6) return clampDifficultyLevel(3, maxLevel);
	return clampDifficultyLevel(4, maxLevel);
};

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
