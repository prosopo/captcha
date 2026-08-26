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
	type ImageRoundsBounds,
	type ScoreComponents,
	clampImageRounds,
} from "@prosopo/types";

export const computeFrictionlessScore = (
	scoreComponents:
		| {
				[key: string]: number;
		  }
		| ScoreComponents,
): number => {
	return Number(
		Math.min(
			1,
			Object.values(scoreComponents)
				.filter((x) => x !== undefined)
				.reduce((acc, val) => acc + val, 0),
		).toFixed(2),
	);
};

/**
 * Session age at which staleness starts costing the user rounds. Mirrors
 * `DEFAULT_MAX_TIMESTAMP_AGE` in `frictionlessTasks.ts`: below it the
 * frictionless flow doesn't consider the timestamp old at all, so there is
 * nothing to price in.
 */
export const DECAY_START_AGE_MS = 10 * 60 * 1000;

/** Age at which a session is considered fully decayed. */
export const DECAY_FULL_AGE_MS = 60 * 60 * 1000;

/**
 * Rounds served at `DECAY_START_AGE_MS` — the value this function returned
 * flat for every sub-hour session before it grew a curve.
 */
export const DECAY_FLOOR_ROUNDS = 3;

/** Rounds served at and beyond `DECAY_FULL_AGE_MS`. */
export const DECAY_CEILING_ROUNDS = 12;

/**
 * Size an image challenge from how stale the detector timestamp is: the
 * longer a session sat around before being redeemed, the less the detector
 * reading tells us about who is redeeming it, and the more rounds we ask for.
 *
 * Linear from `DECAY_FLOOR_ROUNDS` at `DECAY_START_AGE_MS` to
 * `DECAY_CEILING_ROUNDS` at `DECAY_FULL_AGE_MS`, flat outside that window,
 * and clamped into the sitekey's configured round bounds at every step.
 *
 * The previous implementation used `new Date().getTime()` — epoch
 * milliseconds — as both the score ceiling and the decay denominator, which
 * made the exponential term a rounding error: it returned 3 for every session
 * under an hour and `min(imageMaxRounds, 12)` beyond, with none of the decay
 * the name promised. The endpoints are preserved here; the middle is now
 * actually interpolated.
 */
export const timestampDecayFunction = (
	timestamp: number,
	bounds: ImageRoundsBounds,
): number => {
	const floor = clampImageRounds(DECAY_FLOOR_ROUNDS, bounds);
	const ceiling = clampImageRounds(DECAY_CEILING_ROUNDS, bounds);
	const age = Date.now() - timestamp;

	// A timestamp we can't read is not evidence of freshness. Treat it as
	// fully decayed rather than returning NaN, which the caller would then
	// write straight onto the session record.
	if (!Number.isFinite(age)) return ceiling;
	// Covers future timestamps too — a clock ahead of ours is not staleness.
	if (age <= DECAY_START_AGE_MS) return floor;
	if (age >= DECAY_FULL_AGE_MS) return ceiling;

	const progress =
		(age - DECAY_START_AGE_MS) / (DECAY_FULL_AGE_MS - DECAY_START_AGE_MS);
	return clampImageRounds(floor + progress * (ceiling - floor), bounds);
};
