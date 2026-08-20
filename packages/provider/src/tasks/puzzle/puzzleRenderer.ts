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

import type { Logger } from "@prosopo/logger";
import {
	DEFAULT_GEOMETRY,
	DEFAULT_RENDER_SETTINGS,
	type NotchPlacement,
	type PuzzleRenderSettings,
	renderPuzzle,
	toDataUri,
} from "@prosopo/puzzle-assets";
import {
	CaptchaType,
	type IPuzzleSettings,
	puzzlePieceScaleMaxDefault,
	puzzlePieceScaleMinDefault,
} from "@prosopo/types";
import {
	getPuzzleBackgroundBuffer,
	initPuzzleBackgroundBuffer,
} from "./backgroundBuffer.js";

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
	return resolved;
};

/**
 * Number of size buckets used for stratified sampling. The scale range is
 * split into this many equal windows; every window is visited once per
 * cycle before the sequence repeats, so a short run of challenges is
 * guaranteed to span the full range rather than clustering by chance.
 */
const PIECE_SIZE_BUCKETS = 8;

// In-process interleaved order the buckets are visited in. Rebuilt at each
// cycle so consecutive requests strictly alternate between the small half
// (buckets 0..N/2−1) and the large half (buckets N/2..N−1). Pure shuffle
// still permits runs of adjacent buckets ("three large in a row" by
// chance); interleaving forbids that by construction.
let pieceSizeBucketOrder: number[] = [];
let pieceSizeBucketCursor = 0;

const shuffleArray = <T>(input: T[]): T[] => {
	const out = [...input];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const tmp = out[i] as T;
		out[i] = out[j] as T;
		out[j] = tmp;
	}
	return out;
};

const buildBucketOrder = (): number[] => {
	const half = PIECE_SIZE_BUCKETS >> 1;
	const smallHalf = shuffleArray(Array.from({ length: half }, (_, i) => i));
	const largeHalf = shuffleArray(
		Array.from({ length: half }, (_, i) => i + half),
	);
	// Randomise which half opens the cycle so the pattern is not always
	// small-then-large across cycle boundaries.
	const [first, second] =
		Math.random() < 0.5 ? [smallHalf, largeHalf] : [largeHalf, smallHalf];
	const order: number[] = [];
	for (let i = 0; i < half; i++) {
		order.push(first[i] as number);
		order.push(second[i] as number);
	}
	return order;
};

/**
 * Resolve the effective piece scale range from the same layered
 * client-settings / traffic-filter overrides used for render settings, and
 * draw a per-challenge piece size in pixels. Stratified over
 * `PIECE_SIZE_BUCKETS` windows so the distribution is evenly spread across
 * the range even for short bursts of requests. Rounded to an integer
 * because the pixel buffer is allocated as `size * size * 4`.
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
	if (pieceSizeBucketCursor >= pieceSizeBucketOrder.length) {
		pieceSizeBucketOrder = buildBucketOrder();
		pieceSizeBucketCursor = 0;
	}
	const bucket = pieceSizeBucketOrder[pieceSizeBucketCursor] as number;
	pieceSizeBucketCursor++;
	// Uniform sample within the bucket → uniform overall across the range,
	// with a guaranteed spread across any N consecutive samples where
	// N ≥ PIECE_SIZE_BUCKETS and no monotonic runs of large or small sizes.
	const u = (bucket + Math.random()) / PIECE_SIZE_BUCKETS;
	const scale = min + u * (max - min);
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

/**
 * Substitute `image` for `puzzle` when this provider cannot render imagery.
 *
 * Call this at every point a session's captchaType is decided, never at the
 * point one is served. Returns other types untouched.
 */
export const downgradePuzzleIfUnavailable = <T extends CaptchaType>(
	captchaType: T,
	logger?: Logger,
): T | CaptchaType.image => {
	if (captchaType !== CaptchaType.puzzle || isPuzzleRenderAvailable()) {
		return captchaType;
	}
	logger?.warn(() => ({
		msg: "Puzzle rendering unavailable - downgrading session to image",
		data: { requested: captchaType, served: CaptchaType.image },
	}));
	return CaptchaType.image;
};

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
