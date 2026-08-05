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
import { encodeBackground, encodePiece } from "./encode.js";
import { createNotchShape } from "./notch.js";
import { createPrng, createSeed } from "./prng.js";
import type {
	NotchPlacement,
	PuzzleGeometry,
	RenderedPuzzle,
	RgbaImage,
} from "./types.js";

export { createPrng, createSeed, SEED_BYTES } from "./prng.js";
export { generateBackground } from "./background.js";
export {
	encodeBackground,
	encodePiece,
	encodePng,
	toDataUri,
} from "./encode.js";
export type {
	NotchPlacement,
	PuzzleGeometry,
	RenderedPuzzle,
	RgbaImage,
} from "./types.js";

/**
 * Matches the widget's container. Kept here so the generator and the provider
 * agree on geometry without the provider having to restate it.
 */
export const DEFAULT_GEOMETRY: PuzzleGeometry = {
	width: 300,
	height: 200,
	notchSize: 44,
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
): Promise<RenderedPuzzle> => {
	const prng = createPrng(createSeed());
	const shape = createNotchShape(prng, geometry.notchSize);
	const { background: cut, piece } = cutNotch(
		prng,
		background,
		shape,
		geometry.notchSize,
		placement,
	);

	const [backgroundWebp, pieceWebp] = await Promise.all([
		encodeBackground(cut),
		encodePiece(piece),
	]);

	return {
		background: backgroundWebp,
		piece: pieceWebp,
		pieceSize: geometry.notchSize,
	};
};

/** Convenience: generate, cut and encode in one call. */
export const createPuzzle = async (
	placement: NotchPlacement,
	geometry: PuzzleGeometry = DEFAULT_GEOMETRY,
): Promise<RenderedPuzzle> =>
	renderPuzzle(createBackground(geometry), placement, geometry);
