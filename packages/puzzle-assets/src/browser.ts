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

// Browser-safe surface: same drawing pipeline as the provider, minus the
// sharp-based WebP encoder. Consumers paint the returned RGBA buffers onto
// a <canvas> directly.

import { generateBackground } from "./background.js";
import { cutNotch } from "./compose.js";
import { paintDecoys } from "./decoys.js";
import { createNotchShape } from "./notch.js";
import { createPrng, createSeed } from "./prng.js";
import type {
	NotchPlacement,
	PuzzleGeometry,
	PuzzleRenderSettings,
	RgbaImage,
} from "./types.js";

export { createPrng, createSeed, SEED_BYTES } from "./prng.js";
export { generateBackground } from "./background.js";
export { paintDecoys, paintDecoyPiece } from "./decoys.js";
export type {
	NotchPlacement,
	PuzzleGeometry,
	PuzzleRenderSettings,
	RenderedPuzzle,
	RgbaImage,
} from "./types.js";

export const DEFAULT_GEOMETRY: PuzzleGeometry = {
	width: 300,
	height: 200,
	notchSize: 44,
};

export const DEFAULT_RENDER_SETTINGS: PuzzleRenderSettings = {
	decoyCount: 5,
	decoyEdgeDarkness: 20,
	decoyBodyBrightness: 4,
	holeDarken: 0.55,
	decoyHoleDarken: 0.7,
};

export interface RenderedPuzzleRgba {
	background: RgbaImage;
	piece: RgbaImage;
	pieceSize: number;
}

/**
 * Same pipeline as `renderPuzzle` in index.ts but returns raw RGBA rather
 * than WebP-encoded buffers, so browser consumers can `putImageData` onto
 * a canvas without needing sharp.
 */
export const renderPuzzleToRgba = (
	background: RgbaImage,
	placement: NotchPlacement,
	geometry: PuzzleGeometry = DEFAULT_GEOMETRY,
	settings: PuzzleRenderSettings = DEFAULT_RENDER_SETTINGS,
): RenderedPuzzleRgba => {
	const prng = createPrng(createSeed());
	const pieceSize = geometry.pieceSize ?? geometry.notchSize;
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
	return { background: cut, piece, pieceSize };
};

export const createBackground = (
	geometry: PuzzleGeometry = DEFAULT_GEOMETRY,
): RgbaImage =>
	generateBackground(createPrng(createSeed()), geometry.width, geometry.height);
