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

import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
	DEFAULT_GEOMETRY,
	DEFAULT_RENDER_SETTINGS,
	createBackground,
	renderPuzzleBoard,
} from "../index.js";
import { pieceMask, placePiece } from "../placement.js";
import type { PuzzleGeometry, RgbaImage } from "../types.js";

const filled = (
	width: number,
	height: number,
	rgba: [number, number, number, number],
): RgbaImage => {
	const data = Buffer.alloc(width * height * 4);
	for (let i = 0; i < width * height; i++) data.set(rgba, i * 4);
	return { data, width, height };
};

const pixel = (image: RgbaImage, x: number, y: number): number[] => {
	const i = (y * image.width + x) * 4;
	return [...image.data.subarray(i, i + 4)];
};

describe("placePiece", () => {
	it("covers the board where the piece is opaque and leaves the rest", () => {
		const board = filled(10, 10, [0, 0, 0, 255]);
		const piece = filled(4, 4, [200, 100, 50, 255]);
		placePiece(board, piece, 5, 5);
		expect(pixel(board, 4, 4)).toEqual([200, 100, 50, 255]);
		expect(pixel(board, 0, 0)).toEqual([0, 0, 0, 255]);
	});

	it("blends on partial alpha and ignores transparent pixels", () => {
		const board = filled(4, 4, [0, 0, 0, 255]);
		const piece = filled(4, 4, [200, 200, 200, 0]);
		piece.data.set([200, 200, 200, 128], 0);
		placePiece(board, piece, 2, 2);
		expect(pixel(board, 0, 0)[0]).toBe(100);
		expect(pixel(board, 1, 0)).toEqual([0, 0, 0, 255]);
	});

	it("drops piece pixels that fall off the board", () => {
		const board = filled(4, 4, [0, 0, 0, 255]);
		const piece = filled(4, 4, [255, 255, 255, 255]);
		placePiece(board, piece, 0, 0);
		expect(pixel(board, 1, 1)).toEqual([255, 255, 255, 255]);
		expect(pixel(board, 2, 2)).toEqual([0, 0, 0, 255]);
	});
});

describe("pieceMask", () => {
	it("is the piece's alpha channel in row order", () => {
		const piece = filled(2, 2, [1, 2, 3, 0]);
		piece.data[3] = 10;
		piece.data[15] = 255;
		expect([...pieceMask(piece)]).toEqual([10, 0, 0, 255]);
	});
});

describe("renderPuzzleBoard", () => {
	const geometry: PuzzleGeometry = { ...DEFAULT_GEOMETRY, pieceSize: 60 };
	const seed = Buffer.from("ffeeddccbbaa99887766554433221100", "hex");
	const backgroundSeed = Buffer.from("00112233445566778899aabbccddeeff", "hex");

	const render = (start: { x: number; y: number }) =>
		renderPuzzleBoard({
			background: createBackground({ geometry, seed: backgroundSeed }),
			placement: { targetX: 200, targetY: 100 },
			start,
			geometry,
			settings: DEFAULT_RENDER_SETTINGS,
			seed,
		});

	it("returns a square mask the size of the piece with an opaque middle", async () => {
		const { mask, pieceSize } = await render({ x: 60, y: 100 });
		expect(pieceSize).toBe(60);
		expect(mask.length).toBe(60 * 60);
		expect(mask[30 * 60 + 30]).toBe(255);
	});

	it("draws the piece into the board where it starts", async () => {
		const here = await render({ x: 60, y: 100 });
		const there = await render({ x: 60, y: 60 });
		expect(here.mask.equals(there.mask)).toBe(true);
		const decode = async (webp: Buffer) =>
			(await sharp(webp).raw().toBuffer({ resolveWithObject: true })).data;
		expect((await decode(here.board)).equals(await decode(there.board))).toBe(
			false,
		);
	});
});
