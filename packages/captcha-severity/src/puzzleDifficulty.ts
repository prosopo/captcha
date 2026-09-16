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

/**
 * The puzzle difficulty ladder, and the conversions between it and the
 * severity currency the rest of the system speaks.
 *
 * This lives beside `captchaPolicySeverity` because it answers the same
 * question one step further in: that function ranks a policy by its
 * `solvedImagesCount`, and this one says what a puzzle policy carrying that
 * number will actually be served at. Anything asking "what difficulty is this
 * puzzle" — the provider serving a challenge, and the rule-authoring and
 * rule-editing consumers outside this repository — reads it from here, so a
 * change to the ladder cannot land in one of them and not the others.
 *
 * Sampling a concrete render out of a level's bands stays in the provider
 * (`tasks/puzzle/puzzleDifficulty.ts`): it needs `IPuzzleSettings` from
 * `@prosopo/types` and a `node:crypto`-backed sampler, and this package's
 * zero-dependency, browser-safe property is load-bearing — see the note on
 * imports in `index.ts`.
 *
 * `level` is the difficulty of the challenge, and is unrelated to `Tier` in
 * `@prosopo/types`, which is the customer's billing plan.
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
 * Image rounds per difficulty step.
 *
 * `severityToPuzzleDifficulty` and `puzzleDifficultyToSeverity` are inverses
 * of each other across this constant, which is what lets a UI offer one value
 * per level instead of a free-text box where two adjacent numbers silently
 * produce the same puzzle. The round-trip is pinned by the tests.
 */
export const PUZZLE_ROUNDS_PER_DIFFICULTY_LEVEL = 2;

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
 * authored rules and traffic-filter policies cannot drift apart on what
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

/**
 * The round count that lands squarely on `level` — the inverse of
 * `severityToPuzzleDifficulty`.
 *
 * Anything that has to *write* a puzzle policy needs this direction: a rule
 * editor turning an operator's chosen difficulty into the field the rule
 * carries, or rule authoring normalising a round count inherited from the
 * image path. Each level spans two rounds, so without a canonical value per level a
 * writer picks between numbers that produce the identical puzzle, and the
 * difference survives only to break severity ties arbitrarily.
 *
 * `baseImageRounds` is the site's ordinary count, matching
 * `severityToPuzzleDifficulty`'s second argument. Pass the same baseline to
 * both or the round-trip does not hold.
 */
export const puzzleDifficultyToSeverity = (
	level: number,
	baseImageRounds: number,
	maxLevel: number = MAX_AUTO_ESCALATION_LEVEL,
): number =>
	baseImageRounds +
	clampDifficultyLevel(level, maxLevel) * PUZZLE_ROUNDS_PER_DIFFICULTY_LEVEL;
