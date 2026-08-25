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
	DEFAULT_BOARD_SETTINGS,
	DEFAULT_GEOMETRY,
	generateBoard,
} from "./board.js";
import { encodeTile } from "./encode.js";
import { pickGlyphFamilies } from "./glyph.js";
import { createTilePalettes } from "./palette.js";
import { createPrng, createSeed } from "./prng.js";
import {
	DEFAULT_RENDER_SETTINGS,
	createIconSpecs,
	createTileJitter,
	renderTileSvg,
} from "./render.js";
import {
	type Board,
	type BoardGeometry,
	type BoardSettings,
	type ConnectBoard,
	type ConnectRenderSettings,
	EMPTY,
	type RenderedConnect,
	type RenderedTile,
} from "./types.js";

export {
	DEFAULT_BOARD_SETTINGS,
	DEFAULT_GEOMETRY,
	enumerateLines,
	generateBoard,
	hasLine,
	isWinningMove,
	parseBoard,
	serialiseBoard,
	winningMoves,
} from "./board.js";
export { encodePng, encodeTile, toDataUri } from "./encode.js";
export {
	GLYPH_FAMILIES,
	type GlyphFamily,
	type GlyphShape,
	createGlyph,
	pickGlyphFamilies,
} from "./glyph.js";
export {
	type TileColors,
	type TilePalette,
	createTilePalettes,
	hslToHex,
	tileColors,
} from "./palette.js";
export { type Prng, SEED_BYTES, createPrng, createSeed } from "./prng.js";
export {
	DEFAULT_RENDER_SETTINGS,
	type IconSpec,
	type TileJitter,
	createIconSpecs,
	createTileJitter,
	renderTileSvg,
} from "./render.js";
export {
	type Board,
	type BoardGeometry,
	type BoardSettings,
	type ConnectBoard,
	type ConnectRenderSettings,
	EMPTY,
	type Move,
	type RenderedConnect,
	type RenderedTile,
} from "./types.js";

/**
 * Render every occupied cell of `board` as its own WebP tile.
 *
 * One image per *cell*, not per icon: each tile gets independent rotation,
 * scale and hue jitter, so two tiles of the same icon are never byte-identical
 * and a solver has to compare images rather than hashes. See the threat-model
 * note in `board.ts` for what this does and does not buy.
 */
export const renderBoard = async (
	board: Board,
	geometry: BoardGeometry = DEFAULT_GEOMETRY,
	settings: ConnectRenderSettings = DEFAULT_RENDER_SETTINGS,
	iconCount: number = DEFAULT_BOARD_SETTINGS.iconCount,
): Promise<RenderedConnect> => {
	const prng = createPrng(createSeed());
	const families = pickGlyphFamilies(prng, iconCount);
	const palettes = createTilePalettes(prng, iconCount);
	const icons = createIconSpecs(prng, families, palettes);

	const pending: Promise<RenderedTile>[] = [];
	for (let index = 0; index < board.length; index++) {
		const iconIndex = board[index];
		if (iconIndex === undefined || iconIndex === EMPTY) continue;
		const icon = icons[iconIndex];
		if (!icon) {
			throw new Error(
				`connect-assets: board references icon ${iconIndex}, only ${icons.length} generated`,
			);
		}
		const svg = renderTileSvg(icon, createTileJitter(prng, settings), settings);
		pending.push(encodeTile(svg).then((webp) => ({ index, webp })));
	}

	return {
		...geometry,
		tiles: await Promise.all(pending),
		tileSize: settings.tileSize,
	};
};

/** Convenience: lay out a board and render it in one call. */
export const createConnect = async (
	geometry: BoardGeometry = DEFAULT_GEOMETRY,
	boardSettings: BoardSettings = DEFAULT_BOARD_SETTINGS,
	renderSettings: ConnectRenderSettings = DEFAULT_RENDER_SETTINGS,
): Promise<{ layout: ConnectBoard; rendered: RenderedConnect }> => {
	const layout = generateBoard(
		createPrng(createSeed()),
		geometry,
		boardSettings,
	);
	const rendered = await renderBoard(
		layout.board,
		geometry,
		renderSettings,
		boardSettings.iconCount,
	);
	return { layout, rendered };
};
