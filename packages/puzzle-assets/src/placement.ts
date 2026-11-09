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

import type { RgbaImage } from "./types.js";

/**
 * Draw `piece` onto `board` centred on `(centreX, centreY)`, blending on the
 * piece's alpha. Pixels falling outside the board are dropped. Mutates `board`.
 */
export const placePiece = (
	board: RgbaImage,
	piece: RgbaImage,
	centreX: number,
	centreY: number,
): void => {
	const left = Math.round(centreX - piece.width / 2);
	const top = Math.round(centreY - piece.height / 2);
	for (let py = 0; py < piece.height; py++) {
		const y = top + py;
		if (y < 0 || y >= board.height) continue;
		for (let px = 0; px < piece.width; px++) {
			const x = left + px;
			if (x < 0 || x >= board.width) continue;
			const pi = (py * piece.width + px) * 4;
			const alpha = (piece.data[pi + 3] ?? 0) / 255;
			if (alpha <= 0) continue;
			const bi = (y * board.width + x) * 4;
			for (let c = 0; c < 3; c++) {
				const under = board.data[bi + c] ?? 0;
				const over = piece.data[pi + c] ?? 0;
				board.data[bi + c] = Math.round(under + (over - under) * alpha);
			}
		}
	}
};

/** The piece's alpha channel, one byte per pixel, row-major. */
export const pieceMask = (piece: RgbaImage): Buffer => {
	const mask = Buffer.alloc(piece.width * piece.height);
	for (let i = 0; i < mask.length; i++) {
		mask[i] = piece.data[i * 4 + 3] ?? 0;
	}
	return mask;
};
