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
	CaptchaType,
	type IFrictionlessThreshold,
	type IFrictionlessTypes,
	type IUserSettings,
	frictionlessPuzzleThresholdDefault,
	isWidgetFeatureEnabled,
	resolveAllowedCaptchaTypes,
	resolveFrictionlessThreshold,
} from "@prosopo/types";

export const DEFAULT_FRICTIONLESS_THRESHOLD =
	frictionlessPuzzleThresholdDefault;

/**
 * A client record's configured ladder, in the terms the decision machine
 * compares against. Thin rename over `resolveFrictionlessThreshold`, which
 * owns the tolerance for records written before the ladder existed.
 */
export const resolveScoreLadder = (
	configured: IFrictionlessThreshold | number | undefined,
): { botThreshold: number; botImageThreshold: number } => {
	const ladder = resolveFrictionlessThreshold(configured);
	return {
		botThreshold: ladder.frictionlessPuzzleThreshold,
		botImageThreshold: ladder.frictionlessImageThreshold,
	};
};

/**
 * The types any session minted by /frictionless may be. The owner's
 * `frictionlessTypes` only governs the frictionless flow, so a site pinned to
 * a concrete `captchaType` is held to the feature flags alone.
 */
export const resolveSiteAllowedCaptchaTypes = (
	settings: Pick<
		Partial<IUserSettings>,
		"captchaType" | "frictionlessTypes" | "captchaTypeFeatureFlags"
	>,
): IFrictionlessTypes =>
	resolveAllowedCaptchaTypes({
		captchaTypeFeatureFlags: settings.captchaTypeFeatureFlags,
		...((!settings.captchaType ||
			settings.captchaType === CaptchaType.frictionless) && {
			frictionlessTypes: settings.frictionlessTypes,
		}),
	});

/**
 * Whether a user on this site may swap a puzzle for an image challenge: the
 * switch is on and the site may be served image challenges at all.
 */
export const isPuzzleImageSwitchAvailable = (
	settings: Pick<
		Partial<IUserSettings>,
		| "captchaType"
		| "frictionlessTypes"
		| "captchaTypeFeatureFlags"
		| "widgetFeatureFlags"
	>,
): boolean =>
	isWidgetFeatureEnabled("puzzleImageSwitch", settings.widgetFeatureFlags) &&
	resolveSiteAllowedCaptchaTypes(settings).image;

/**
 * Image rounds served when the detector payload could not be decrypted.
 *
 * Deliberately short. A failed decrypt means we have no measurement of the
 * client — most often a benign cause (the session's Redis bundle binding
 * expired, the bundle left the pool on a rotation, a stale cached widget) — so
 * this is a "prove you're human quickly", not a punishment. Clamped into the
 * sitekey's `[imageMinRounds, imageMaxRounds]` at the call site.
 */
export const DECRYPTION_FAILED_IMAGE_ROUNDS = 3;

/**
 * Image rounds served when the client sent no detector token at all. It ran no
 * detection, so we know nothing about it and it must solve to proceed. Clamped
 * into the sitekey's `[imageMinRounds, imageMaxRounds]` at the call site.
 */
export const MISSING_TOKEN_IMAGE_ROUNDS = 3;

/**
 * Image rounds served when a token arrived without its head hash. Shorter than
 * the missing-token case: a payload did turn up, just an incomplete one.
 */
export const MISSING_HEAD_HASH_IMAGE_ROUNDS = 2;

/**
 * Ceiling on the extra image rounds the triggered-signal count can buy. An
 * uncapped 1:1 mapping would hand an unreasonably long challenge to a session
 * on the strength of one unusual trait; six extra rounds on top of the
 * sitekey's baseline is already heavy.
 */
export const MAX_DETECTOR_EXTRA_IMAGE_ROUNDS = 6;

/**
 * Size an image challenge by how much was actually found. `base` is the
 * sitekey's ordinary image round count; each triggered signal adds a round,
 * capped by `MAX_DETECTOR_EXTRA_IMAGE_ROUNDS`. A session with nothing
 * triggered gets exactly the baseline.
 *
 * The caller is still responsible for clamping to `imageMaxRounds`.
 */
export const getRoundsFromTriggeredDetectors = (
	base: number,
	triggeredDetectors: number[] | undefined,
): number =>
	base +
	Math.min(triggeredDetectors?.length ?? 0, MAX_DETECTOR_EXTRA_IMAGE_ROUNDS);
