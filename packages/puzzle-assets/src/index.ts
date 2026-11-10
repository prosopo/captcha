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
import { PUZZLE_RENDERER_VERSION, drawPuzzle } from "./draw.js";
import { encodeBackground, encodePiece } from "./encode.js";
import { pieceMask, placePiece } from "./placement.js";
import type { Regrain } from "./presentation.js";
import { createPrng, createSeed } from "./prng.js";
import type {
	NotchPlacement,
	PuzzleGeometry,
	PuzzleRenderSettings,
	PuzzleRendererVersion,
	RenderedPuzzle,
	RenderedPuzzleBoard,
	RgbaImage,
} from "./types.js";

export { createPrng, createSeed, SEED_BYTES } from "./prng.js";
export type { Prng } from "./prng.js";
export { generateBackground } from "./background.js";
export {
	bestPairContrast,
	contrastRatio,
	relativeLuminance,
	simulateVision,
	worstCaseContrast,
	VISION_TYPES,
	type VisionType,
} from "./contrast.js";
export {
	MIN_PALETTE_CONTRAST,
	drawPalette,
	hslToRgb,
	type Rgb,
} from "./palette.js";
export { paintDecoys, paintDecoyPiece } from "./decoys.js";
export { PUZZLE_RENDERER_VERSION } from "./draw.js";
export { pieceMask, placePiece } from "./placement.js";
export { type Regrain, drawRegrainSeed, regrain } from "./presentation.js";
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
	PuzzleRendererVersion,
	RenderedPuzzle,
	RenderedPuzzleBoard,
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
	decoyCount: 3,
	decoyEdgeDarkness: 12,
	decoyBodyBrightness: 4,
	holeDarken: 0.55,
	decoyHoleDarken: 0.84,
};

/**
 * Generate a fresh background. Each one is single-use by contract: serving the
 * same background twice with two different notch positions would let an
 * attacker diff the two composites and read both targets straight off. The
 * caller's buffer is responsible for enforcing consume-once.
 */
export const createBackground = ({
	geometry = DEFAULT_GEOMETRY,
	seed = createSeed(),
}: {
	geometry?: PuzzleGeometry;
	seed?: Buffer;
} = {}): RgbaImage =>
	generateBackground(createPrng(seed), geometry.width, geometry.height);

/**
 * Cut a notch at `placement` and encode both halves.
 *
 * The background is consumed (mutated) by this call.
 */
export const renderPuzzle = async ({
	background,
	placement,
	geometry = DEFAULT_GEOMETRY,
	settings = DEFAULT_RENDER_SETTINGS,
	seed = createSeed(),
	rendererVersion = PUZZLE_RENDERER_VERSION,
	regrain,
}: {
	background: RgbaImage;
	placement: NotchPlacement;
	geometry?: PuzzleGeometry;
	settings?: PuzzleRenderSettings;
	seed?: Buffer;
	rendererVersion?: PuzzleRendererVersion;
	/** Defaults to the JS `regrain`. */
	regrain?: Regrain;
}): Promise<RenderedPuzzle> => {
	const pieceSize = geometry.pieceSize ?? geometry.notchSize;
	const { background: cut, piece } = drawPuzzle({
		background,
		placement,
		pieceSize,
		settings,
		prng: createPrng(seed),
		version: rendererVersion,
		...(regrain && { regrain }),
	});

	const [backgroundWebp, pieceWebp] = await Promise.all([
		encodeBackground(cut),
		encodePiece(piece),
	]);

	return {
		background: backgroundWebp,
		piece: pieceWebp,
		pieceSize,
		seed,
		rendererVersion,
	};
};

/**
 * Cut a notch at `placement`, draw the piece back onto the board centred on
 * `start`, and encode the board. The piece leaves as its mask alone; the
 * widget lifts the piece's pixels out of the board with it.
 *
 * The background is consumed (mutated) by this call.
 */
export const renderPuzzleBoard = async ({
	background,
	placement,
	start,
	geometry = DEFAULT_GEOMETRY,
	settings = DEFAULT_RENDER_SETTINGS,
	seed = createSeed(),
	rendererVersion = PUZZLE_RENDERER_VERSION,
	regrain,
}: {
	background: RgbaImage;
	placement: NotchPlacement;
	start: { x: number; y: number };
	geometry?: PuzzleGeometry;
	settings?: PuzzleRenderSettings;
	seed?: Buffer;
	rendererVersion?: PuzzleRendererVersion;
	/** Defaults to the JS `regrain`. */
	regrain?: Regrain;
}): Promise<RenderedPuzzleBoard> => {
	const pieceSize = geometry.pieceSize ?? geometry.notchSize;
	const { background: board, piece } = drawPuzzle({
		background,
		placement,
		pieceSize,
		settings,
		prng: createPrng(seed),
		version: rendererVersion,
		...(regrain && { regrain }),
	});
	placePiece(board, piece, start.x, start.y);
	return {
		board: await encodeBackground(board),
		mask: pieceMask(piece),
		pieceSize,
		seed,
		rendererVersion,
	};
};

/**
 * Convenience: generate, cut and encode in one call.
 *
 * Takes both seeds so a caller holding a persisted pair can reproduce a served
 * challenge byte for byte — the background seed and the render seed are
 * independent and both are required.
 */
export const createPuzzle = async ({
	placement,
	geometry = DEFAULT_GEOMETRY,
	settings = DEFAULT_RENDER_SETTINGS,
	backgroundSeed = createSeed(),
	renderSeed = createSeed(),
	rendererVersion = PUZZLE_RENDERER_VERSION,
}: {
	placement: NotchPlacement;
	geometry?: PuzzleGeometry;
	settings?: PuzzleRenderSettings;
	backgroundSeed?: Buffer;
	renderSeed?: Buffer;
	rendererVersion?: PuzzleRendererVersion;
}): Promise<RenderedPuzzle> =>
	renderPuzzle({
		background: createBackground({ geometry, seed: backgroundSeed }),
		placement,
		geometry,
		settings,
		seed: renderSeed,
		rendererVersion,
	});
