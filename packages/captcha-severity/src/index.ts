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
 * How severe a captcha challenge is, and the helpers for picking the strictest
 * when several policies compete for one request.
 *
 * Several call sites ask this question, and each used to answer it with its
 * own table: the traffic filter, combining multiple `challenge` matches on a
 * single request (`resolveChallengePolicy`); the access rules, breaking ties
 * between equally-specific rules (`ruleHarshness`); and downstream routing
 * consumers outside this repository.
 *
 * They agreed on the order — image > puzzle > pow > frictionless — but nothing
 * held them to it, and they disagreed on the encoding, which is where the
 * tier-crossing bug documented on `TIER_GAP` came from.
 *
 * ## Two questions, two APIs
 *
 * "Stricter" means different things depending on what is being compared:
 *
 *   - **Type only** — is an image challenge stricter than a puzzle one?
 *     `rankCaptchaType` / `isStricterCaptchaType`. Used where the type is
 *     chosen independently of its settings, as the traffic filter does: it
 *     picks the strictest type across matches, then separately merges the
 *     hardest parameters from *all* matched categories.
 *
 *   - **Whole policy** — is `image` with 2 rounds stricter than `image` with
 *     9? `captchaPolicySeverity` / `isStricterCaptchaPolicy`. Used where one
 *     complete policy has to beat another, as the access rules do — there the
 *     settings ride along with the type and a tie on type alone would be
 *     decided by argument order.
 *
 * ## Zero dependencies, deliberately
 *
 * This package imports nothing, not even `@prosopo/types` for the
 * `CaptchaType` enum. Captcha types are string enums, so a plain `string`
 * parameter accepts them without the import — and the import would not be
 * free. `CaptchaType` lives in a module that pulls zod in to build its
 * schemas, and some consumers bundle this standalone under a hard source-size
 * ceiling that a runtime dependency on the `@prosopo/types` barrel has
 * breached before. A leaf with no imports cannot repeat that.
 *
 * It is also why the puzzle ladder re-exported below stops at the arithmetic:
 * drawing a render out of a level's bands needs `IPuzzleSettings` and a
 * `node:crypto` sampler, so that half stays in the provider.
 */

/**
 * The puzzle difficulty ladder. Severity ranks a policy; the ladder says what
 * a puzzle policy carrying that severity is actually served at. Both answers
 * belong to the same question, so they ship from one package — see
 * `puzzleDifficulty.ts`.
 */
export * from "./puzzleDifficulty.js";

/**
 * Spacing between adjacent severity tiers.
 *
 * `captchaPolicySeverity` adds an intra-tier component on top of a tier, so
 * that a 12-round image challenge outranks a 2-round one. The gap has to
 * exceed anything that component can contribute, or the sum crosses into the
 * next tier and the ordering inverts.
 *
 * That is not hypothetical. The access rules previously used gaps of 10 with
 * `base + solvedImagesCount`, and `solvedImagesCount` is validated by
 * `imageMaxRoundsFieldSchema` — `number().int().min(2)`, with **no upper
 * bound** and a default `imageMaxRounds` of 32. So a `Restrict[pow]` rule
 * carrying 32 rounds scored 10 + 32 = 42 and outranked a `Restrict[image]`
 * rule at 30, exactly inverting the intended order. A `Restrict[puzzle]` with
 * 11 rounds was enough to do it.
 *
 * 10,000 clears every bounded axis outright (`powDifficulty` maxes at 10,
 * `puzzleTolerance` at 1000) and any plausible round count, and the intra-tier
 * component is clamped below the gap regardless — so the ordering holds
 * structurally rather than by luck.
 */
const TIER_GAP = 10_000;

/** Largest intra-tier contribution, so a saturated tier can never reach the next. */
const MAX_INTRA_TIER = TIER_GAP - 1;

/**
 * Severity tier per captcha type. Higher is stricter.
 *
 * Keyed by the enum's string values rather than the enum itself, so callers
 * carrying a captcha type as a bare `string` rank it without importing
 * `CaptchaType`.
 */
const CAPTCHA_TYPE_TIER: Record<string, number> = {
	image: 4 * TIER_GAP,
	puzzle: 3 * TIER_GAP,
	pow: 2 * TIER_GAP,
	frictionless: 1 * TIER_GAP,
};

/**
 * The tunables that make one challenge of a given type harder than another.
 *
 * Structurally compatible with `ITrafficCategoryPolicy` and `AccessRule`, and
 * with the equivalent policy shapes used by downstream consumers, so each can
 * pass its own object straight in.
 *
 * `puzzleTolerance` is deliberately absent, which is worth spelling out
 * because a puzzle's difficulty plainly does depend on it. It is a *render*
 * tunable: the traffic filter merges it across every matched category
 * independently of which policy wins the type contest (taking the minimum),
 * so it describes how the eventual puzzle is drawn rather than which policy
 * was strictest. Nothing ranks policies by it today, and adding it here would
 * silently start doing so.
 *
 * What carries puzzle severity instead is `solvedImagesCount`, on a puzzle
 * rule. That reads like a mistake and is not: a puzzle has no rounds — one
 * puzzle per session — so there is nothing for a round count to mean
 * literally. The number is reused as a severity level, which the provider
 * converts with `severityToPuzzleDifficulty` (see
 * `provider/src/tasks/puzzle/puzzleDifficulty.ts`) into an index into
 * `PUZZLE_DIFFICULTY_LEVELS`, the banded ladder that actually renders a
 * harder puzzle. Rule authoring therefore keeps the field on puzzle rules on
 * purpose, and drops it for `pow`, which has its own dial.
 */
export interface CaptchaPolicySeverityInput {
	captchaType?: string | undefined;
	/**
	 * Higher is harder. A literal round count on `image`; on `puzzle` a
	 * severity level that the provider maps onto `PUZZLE_DIFFICULTY_LEVELS`
	 * rather than running that many rounds. Ignored on `pow`.
	 */
	solvedImagesCount?: number | undefined;
	/** PoW difficulty. Higher is harder. `pow`'s own dial. */
	powDifficulty?: number | undefined;
}

const clampIntraTier = (value: number): number =>
	Number.isFinite(value) ? Math.min(Math.max(value, 0), MAX_INTRA_TIER) : 0;

/**
 * Severity of a captcha type on its own, ignoring any settings.
 *
 * An unset or unrecognised type ranks 0 — below every real type — so a policy
 * that names no captcha type never outranks one that does.
 *
 * Note that `frictionless` ranks *above* unset, where the access rules
 * previously scored both at 0. Restrict-with-frictionless is not a
 * configuration that makes operational sense, so nothing depended on the old
 * tie; ranking it as a real type is the consistent reading.
 */
export const rankCaptchaType = (captchaType: string | undefined): number =>
	captchaType === undefined ? 0 : (CAPTCHA_TYPE_TIER[captchaType] ?? 0);

/**
 * True when `candidate` is a stricter captcha *type* than `incumbent`,
 * ignoring settings.
 *
 * Strictly greater, so an equal type keeps the incumbent. Callers reduce left
 * to right, so a tie has to resolve to the first consistently rather than by
 * table order. Where the settings should break that tie, use
 * `isStricterCaptchaPolicy` instead.
 */
export const isStricterCaptchaType = (
	candidate: string | undefined,
	incumbent: string | undefined,
): boolean => rankCaptchaType(candidate) > rankCaptchaType(incumbent);

/**
 * How much harder this policy's settings make it than the mildest challenge of
 * the same type. Each type has one axis that governs its difficulty; the
 * others are irrelevant to it and ignored.
 *
 * Unset means "not hardened", i.e. the bottom of the tier — an operator who
 * set a value wants it to count for something against one who did not.
 *
 * `image` and `puzzle` share `solvedImagesCount` because it is the severity
 * currency both speak: a puzzle has no rounds, so the provider maps the same
 * number onto a puzzle difficulty level (`severityToPuzzleDifficulty`) instead
 * of running that many rounds. `pow` has its own dial and rule authoring drops
 * `solvedImagesCount` for it, so reading it there would rank every pow rule at
 * the bottom of its tier regardless of how hard it actually is.
 */
const intraTierSeverity = (policy: CaptchaPolicySeverityInput): number => {
	switch (policy.captchaType) {
		case "image":
		case "puzzle":
			return clampIntraTier(policy.solvedImagesCount ?? 0);
		case "pow":
			return clampIntraTier(policy.powDifficulty ?? 0);
		default:
			// frictionless has no difficulty axis, and an unrecognised type has
			// no tier for an intra-tier value to sit in.
			return 0;
	}
};

/**
 * Severity of a complete policy: its captcha type, then its own difficulty
 * setting as the tie-break within that type.
 *
 * The type always dominates. The intra-tier component is clamped below
 * `TIER_GAP`, so no round count, difficulty or tolerance can lift a policy
 * over a stricter captcha type — a 12-round pow challenge is still milder
 * than a 2-round image one.
 *
 * Returns 0 for an unset or unrecognised type, whatever the settings say.
 */
export const captchaPolicySeverity = (
	policy: CaptchaPolicySeverityInput,
): number => {
	const tier = rankCaptchaType(policy.captchaType);
	if (tier === 0) return 0;
	return tier + intraTierSeverity(policy);
};

/**
 * True when `candidate` is a stricter policy than `incumbent`, comparing the
 * captcha type first and its difficulty setting second.
 *
 * Strictly greater, so two policies of equal severity keep the incumbent —
 * callers reduce left to right and must resolve a genuine tie to the first
 * consistently.
 */
export const isStricterCaptchaPolicy = (
	candidate: CaptchaPolicySeverityInput,
	incumbent: CaptchaPolicySeverityInput,
): boolean =>
	captchaPolicySeverity(candidate) > captchaPolicySeverity(incumbent);
