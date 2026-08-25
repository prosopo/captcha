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
 * A board is a flat row-major array of `boardSize * boardSize` slots. `EMPTY`
 * marks a slot with no tile on it; anything else is an index into the
 * challenge's icon set.
 */
export const EMPTY = -1;

export type Board = number[];

/** A single legal move: pick the tile up at `from`, drop it on empty `to`. */
export interface Move {
	from: number;
	to: number;
}

/** Board shape and win condition. Bounds are enforced by the caller. */
export interface BoardGeometry {
	/** Cells per side. The board is always square. */
	boardSize: number;
	/** How many identical tiles in a row/column/diagonal count as a win. */
	lineLength: number;
}

/** Layout tunables. Every field has a default in `DEFAULT_BOARD_SETTINGS`. */
export interface BoardSettings {
	/** How many distinct icons appear on a board, including the winning one. */
	iconCount: number;
	/** Loose tiles of unrelated icons scattered as noise. */
	decoyCount: number;
	/**
	 * Tempting-but-unwinnable runs of a non-winning icon. Each one lays
	 * `lineLength - 2` tiles in a line, which cannot be completed in a single
	 * move and so never competes with the real answer.
	 */
	nearMissCount: number;
}

/**
 * The generated challenge, before it is turned into pixels. `board` is the
 * authoritative record — the provider persists it and replays the submitted
 * move against it at verify time.
 */
export interface ConnectBoard extends BoardGeometry {
	board: Board;
	/** The single move that completes a line. */
	solution: Move;
}

/** One rendered tile: which slot it sits on, and its WebP bytes. */
export interface RenderedTile {
	/** Row-major index into the board. */
	index: number;
	webp: Buffer;
}

/** The full pixel payload for a challenge. */
export interface RenderedConnect extends BoardGeometry {
	tiles: RenderedTile[];
	/** Edge length of a rendered tile, in px. */
	tileSize: number;
}

/** Per-render visual tunables. */
export interface ConnectRenderSettings {
	/** Rendered tile edge in px. Rendered at 2x for crispness on retina. */
	tileSize: number;
	/**
	 * Maximum per-tile rotation jitter in degrees. Jitter is what stops two
	 * tiles of the same icon being byte-identical, so a solver has to cluster
	 * them visually rather than by hashing.
	 */
	jitterDegrees: number;
	/** Maximum per-tile scale jitter, as a fraction of the tile size. */
	jitterScale: number;
	/** Maximum per-tile hue jitter in degrees. */
	jitterHue: number;
}
