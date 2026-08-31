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
	DEFAULT_GEOMETRY,
	DEFAULT_RENDER_SETTINGS,
	type NotchPlacement,
	type PuzzleRenderSettings,
	renderPuzzle,
	toDataUri,
} from "@prosopo/puzzle-assets";
import {
	type IPuzzleSettings,
	puzzlePieceScaleMaxDefault,
	puzzlePieceScaleMinDefault,
} from "@prosopo/types";
import {
	getPuzzleBackgroundBuffer,
	initPuzzleBackgroundBuffer,
} from "./backgroundBuffer.js";
import { MIN_DECOY_HOLE_DARKEN_MARGIN } from "./puzzleDifficulty.js";
import { createStratifiedSampler } from "./stratifiedSampler.js";

export interface RenderedPuzzleImages {
	background: string;
	piece: string;
	pieceSize: number;
}

/**
 * Merge zero or more partial-override sources on top of the asset package
 * defaults. Later sources win, matching the tolerance-resolution order in
 * `getPuzzleCaptchaChallenge`: traffic-filter policy overrides the
 * client-record setting, which in turn overrides the built-in default.
 */
export const resolvePuzzleRenderSettings = (
	...overrides: (IPuzzleSettings | undefined)[]
): PuzzleRenderSettings => {
	let resolved: PuzzleRenderSettings = { ...DEFAULT_RENDER_SETTINGS };
	for (const override of overrides) {
		if (!override) continue;
		if (override.decoyCount !== undefined) {
			resolved = { ...resolved, decoyCount: override.decoyCount };
		}
		if (override.decoyEdgeDarkness !== undefined) {
			resolved = { ...resolved, decoyEdgeDarkness: override.decoyEdgeDarkness };
		}
		if (override.decoyBodyBrightness !== undefined) {
			resolved = {
				...resolved,
				decoyBodyBrightness: override.decoyBodyBrightness,
			};
		}
		if (override.holeDarken !== undefined) {
			resolved = { ...resolved, holeDarken: override.holeDarken };
		}
		if (override.decoyHoleDarken !== undefined) {
			resolved = { ...resolved, decoyHoleDarken: override.decoyHoleDarken };
		}
	}
	// The real cutout must remain the deepest region on the frame or a human
	// cannot tell target from decoy at all. Enforced HERE rather than at each
	// producer because this is the only point the final pair is known: the
	// layered sources above (asset defaults, site settings, traffic-filter
	// policy, session overrides from the difficulty ladder) each set one field
	// without sight of the other, so any of them can invert the relationship
	// even when individually valid.
	const floor = resolved.holeDarken + MIN_DECOY_HOLE_DARKEN_MARGIN;
	if (resolved.decoyHoleDarken < floor) {
		resolved = { ...resolved, decoyHoleDarken: Math.min(1, floor) };
	}
	return resolved;
};

// Piece size gets its own sampler instance. See stratifiedSampler for why
// each knob must hold a separate cursor rather than sharing one.
const pieceSizeSampler = createStratifiedSampler();

/**
 * Resolve the effective piece scale range from the same layered
 * client-settings / traffic-filter overrides used for render settings, and
 * draw a per-challenge piece size in pixels. Stratified so the distribution
 * is evenly spread across the range even for short bursts of requests.
 * Rounded to an integer because the pixel buffer is allocated as
 * `size * size * 4`.
 */
export const resolvePuzzlePieceSize = (
	...overrides: (IPuzzleSettings | undefined)[]
): number => {
	let min = puzzlePieceScaleMinDefault;
	let max = puzzlePieceScaleMaxDefault;
	for (const override of overrides) {
		if (!override?.pieceScale) continue;
		if (override.pieceScale.min !== undefined) min = override.pieceScale.min;
		if (override.pieceScale.max !== undefined) max = override.pieceScale.max;
	}
	// Defend against a partial override that inverts the range (e.g. only
	// `min` set, above the default `max`).
	if (min > max) min = max;
	const scale = pieceSizeSampler.sample(min, max);
	return Math.max(1, Math.round(DEFAULT_GEOMETRY.width * scale));
};

/**
 * Whether this provider can render puzzle imagery right now.
 *
 * Checked where a captchaType is *chosen*, not where the challenge is served:
 * `/captcha/puzzle` cannot answer with an image captcha, because the response
 * shapes are unrelated and the puzzle widget cannot render one. Minting a
 * puzzle session this provider cannot fulfil would strand the user on
 * INCORRECT_CAPTCHA_TYPE, so the decision has to happen before the session is
 * written. See the two mint sites in frictionlessTasks and buildEscalation.
 */
export const isPuzzleRenderAvailable = (): boolean => {
	// Backgrounds are synthesised in-process, so unlike the detector pool there
	// is no asset that can be missing. The buffer lazily initialises on first
	// use, and generation only fails if the image toolchain itself is broken —
	// which surfaces as a render error, not as unavailability.
	return true;
};

// `downgradePuzzleIfUnavailable` used to live here. It has been replaced by
// `coerceToEnabledCaptchaType` in tasks/captchaTypeSelection.ts, which folds
// render-availability together with the site's enabled-type constraint. The
// old helper fell back to image unconditionally, which is wrong on a site
// that has image disabled — it would have served exactly the type the
// customer asked us never to serve.

export const renderPuzzleImages = async (
	placement: NotchPlacement,
	settings: PuzzleRenderSettings = DEFAULT_RENDER_SETTINGS,
	pieceSize?: number,
): Promise<RenderedPuzzleImages> => {
	const buffer = getPuzzleBackgroundBuffer() ?? initPuzzleBackgroundBuffer();
	const background = buffer.take();
	if (!background) {
		throw new Error("puzzle renderer: no background available");
	}

	const rendered = await renderPuzzle(
		background,
		placement,
		pieceSize !== undefined
			? { ...DEFAULT_GEOMETRY, pieceSize }
			: DEFAULT_GEOMETRY,
		settings,
	);

	return {
		background: toDataUri(rendered.background),
		piece: toDataUri(rendered.piece),
		pieceSize: rendered.pieceSize,
	};
};
