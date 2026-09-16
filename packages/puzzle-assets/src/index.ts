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

import { generateBackground } from "./background.js";
import { cutNotch } from "./compose.js";
import { paintDecoys } from "./decoys.js";
import { encodeBackground, encodePiece } from "./encode.js";
import { createNotchShape } from "./notch.js";
import { createPrng, createSeed } from "./prng.js";
import type {
	NotchPlacement,
	PuzzleGeometry,
	PuzzleRenderSettings,
	RenderedPuzzle,
	RgbaImage,
} from "./types.js";

export { createPrng, createSeed, SEED_BYTES } from "./prng.js";
export { generateBackground } from "./background.js";
export { paintDecoys, paintDecoyPiece } from "./decoys.js";
export {
	encodeBackground,
	encodePiece,
	encodePng,
	toDataUri,
} from "./encode.js";
export type {
	NotchPlacement,
	PuzzleGeometry,
	PuzzleRenderSettings,
	RenderedPuzzle,
	RgbaImage,
} from "./types.js";

/**
 * Matches the widget's container. Kept here so the generator and the provider
 * agree on geometry without the provider having to restate it. Geometry is
 * widget-coupled and not exposed to operators.
 */
export const DEFAULT_GEOMETRY: PuzzleGeometry = {
	width: 300,
	height: 200,
	notchSize: 44,
};

/**
 * Defaults for the per-render tunables. Operators can override any of these
 * per-client (via `ClientSettingsSchema.puzzle`) or per-traffic-category
 * (via `TrafficCategoryPolicySchema.puzzle`); the provider resolves an
 * effective value and passes it to `renderPuzzle`.
 */
export const DEFAULT_RENDER_SETTINGS: PuzzleRenderSettings = {
	decoyCount: 5,
	decoyEdgeDarkness: 20,
	decoyBodyBrightness: 4,
	holeDarken: 0.55,
	decoyHoleDarken: 0.7,
};

/**
 * Generate a fresh background. Each one is single-use by contract: serving the
 * same background twice with two different notch positions would let an
 * attacker diff the two composites and read both targets straight off. The
 * caller's buffer is responsible for enforcing consume-once.
 */
export const createBackground = (
	geometry: PuzzleGeometry = DEFAULT_GEOMETRY,
): RgbaImage =>
	generateBackground(createPrng(createSeed()), geometry.width, geometry.height);

/**
 * Cut a notch at `placement` and encode both halves.
 *
 * The background is consumed (mutated) by this call.
 */
export const renderPuzzle = async (
	background: RgbaImage,
	placement: NotchPlacement,
	geometry: PuzzleGeometry = DEFAULT_GEOMETRY,
	settings: PuzzleRenderSettings = DEFAULT_RENDER_SETTINGS,
): Promise<RenderedPuzzle> => {
	const prng = createPrng(createSeed());
	const pieceSize = geometry.pieceSize ?? geometry.notchSize;
	// Decoys go on first so the real cut sits on top of any overlap and
	// always reads as the deepest, darkest region on the board. Decoys use
	// the same size as the real piece so a solver can't key on scale to
	// disambiguate the target.
	paintDecoys(
		background,
		prng,
		settings.decoyCount,
		pieceSize,
		placement,
		settings.decoyEdgeDarkness,
		settings.decoyBodyBrightness,
		settings.decoyHoleDarken,
	);
	const shape = createNotchShape(prng, pieceSize);
	const { background: cut, piece } = cutNotch(
		prng,
		background,
		shape,
		pieceSize,
		placement,
		settings.holeDarken,
	);

	const [backgroundWebp, pieceWebp] = await Promise.all([
		encodeBackground(cut),
		encodePiece(piece),
	]);

	return {
		background: backgroundWebp,
		piece: pieceWebp,
		pieceSize,
	};
};

/** Convenience: generate, cut and encode in one call. */
export const createPuzzle = async (
	placement: NotchPlacement,
	geometry: PuzzleGeometry = DEFAULT_GEOMETRY,
	settings: PuzzleRenderSettings = DEFAULT_RENDER_SETTINGS,
): Promise<RenderedPuzzle> =>
	renderPuzzle(createBackground(geometry), placement, geometry, settings);
