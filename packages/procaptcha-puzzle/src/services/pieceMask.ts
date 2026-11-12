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

import { ApiParams, type GetPuzzleCaptchaResponse } from "@prosopo/types";

const hexToBytes = (hex: string): Uint8Array => {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
};

const bytesToHex = (bytes: Uint8Array): string =>
	Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const base64ToBytes = (base64: string): Uint8Array =>
	Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

/**
 * Undo the provider's `scramblePieceMask`. Undefined when the result fails
 * its check, which is what a key minted for a different network produces.
 */
export const unscramblePieceMask = async (
	puzzleKey: string,
	challenge: string,
	scrambledMask: string,
	check: string,
): Promise<Uint8Array | undefined> => {
	const subtle = globalThis.crypto?.subtle;
	if (!subtle) return undefined;
	const hmacKey = await subtle.importKey(
		"raw",
		hexToBytes(puzzleKey),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const challengeKey = new Uint8Array(
		await subtle.sign("HMAC", hmacKey, new TextEncoder().encode(challenge)),
	);
	const aesKey = await subtle.importKey(
		"raw",
		challengeKey.slice(0, 16),
		"AES-CTR",
		false,
		["decrypt"],
	);
	const counter = new Uint8Array(16);
	counter.set(challengeKey.slice(16, 24));
	const mask = new Uint8Array(
		await subtle.decrypt(
			{ name: "AES-CTR", counter, length: 64 },
			aesKey,
			base64ToBytes(scrambledMask),
		),
	);
	const digest = new Uint8Array(await subtle.digest("SHA-256", mask));
	return bytesToHex(digest.slice(0, 8)) === check ? mask : undefined;
};

export interface LiftedPiece {
	/** The board with the piece's start position filled in, data URI. */
	background: string;
	/** The piece on transparency, data URI. */
	piece: string;
}

const loadImage = async (src: string): Promise<HTMLImageElement> => {
	const image = new Image();
	image.src = src;
	await image.decode();
	return image;
};

const context2d = (
	width: number,
	height: number,
): [HTMLCanvasElement, CanvasRenderingContext2D] => {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext("2d");
	if (!context) throw new Error("2d canvas unavailable");
	return [canvas, context];
};

const GRAIN = 5;

/**
 * For each pixel under the mask, the colour a straight line through it would
 * blend from the nearest board pixels either side; `step` picks rows (1) or
 * columns (`size`). Undefined where neither side has a board pixel.
 */
const fillAlong = (
	pixels: Uint8ClampedArray,
	mask: Uint8Array,
	size: number,
	lineStart: (line: number) => number,
	step: number,
): Float32Array => {
	const fill = new Float32Array(size * size * 3).fill(Number.NaN);
	const visible = (i: number): boolean =>
		(mask[i] ?? 0) === 0 && (pixels[i * 4 + 3] ?? 0) > 0;
	for (let line = 0; line < size; line++) {
		const start = lineStart(line);
		let previous = -1;
		for (let k = 0; k <= size; k++) {
			const i = start + k * step;
			if (k < size && !visible(i)) continue;
			const from = previous >= 0 ? start + previous * step : -1;
			const to = k < size ? i : -1;
			for (let gap = previous + 1; gap < k; gap++) {
				const t = (gap - previous) / (k - previous);
				for (let c = 0; c < 3; c++) {
					const left = from >= 0 ? (pixels[from * 4 + c] ?? 0) : undefined;
					const right = to >= 0 ? (pixels[to * 4 + c] ?? 0) : undefined;
					fill[(start + gap * step) * 3 + c] =
						left !== undefined && right !== undefined
							? left + (right - left) * t
							: (left ?? right ?? Number.NaN);
				}
			}
			previous = k;
		}
	}
	return fill;
};

/**
 * Colour for each pixel under the mask: the mean of blending across its row
 * and down its column, plus grain like the board's.
 */
const fillAcross = (
	pixels: Uint8ClampedArray,
	mask: Uint8Array,
	size: number,
): Float32Array => {
	const rows = fillAlong(pixels, mask, size, (y) => y * size, 1);
	const columns = fillAlong(pixels, mask, size, (x) => x, size);
	const fill = new Float32Array(size * size * 3);
	for (let i = 0; i < size * size; i++) {
		const noise = (Math.random() - 0.5) * 2 * GRAIN;
		for (let c = 0; c < 3; c++) {
			const across = rows[i * 3 + c] ?? Number.NaN;
			const down = columns[i * 3 + c] ?? Number.NaN;
			const known = [across, down].filter((v) => !Number.isNaN(v));
			const mean =
				known.length > 0
					? known.reduce((a, b) => a + b, 0) / known.length
					: (pixels[i * 4 + c] ?? 0);
			fill[i * 3 + c] = mean + noise;
		}
	}
	return fill;
};

/**
 * Cut the piece out of a board it was drawn onto, centred on the origin, and
 * fill the spot it leaves with the colour around it.
 */
export const liftPiece = async (
	board: string,
	mask: Uint8Array,
	pieceSize: number,
	originX: number,
	originY: number,
): Promise<LiftedPiece> => {
	const image = await loadImage(board);
	const [boardCanvas, boardContext] = context2d(
		image.naturalWidth,
		image.naturalHeight,
	);
	boardContext.drawImage(image, 0, 0);

	const left = Math.round(originX - pieceSize / 2);
	const top = Math.round(originY - pieceSize / 2);
	const region = boardContext.getImageData(left, top, pieceSize, pieceSize);
	const pixels = region.data;

	const fill = fillAcross(pixels, mask, pieceSize);

	const [pieceCanvas, pieceContext] = context2d(pieceSize, pieceSize);
	const piece = pieceContext.createImageData(pieceSize, pieceSize);
	for (let i = 0; i < mask.length; i++) {
		const coverage = mask[i] ?? 0;
		const onBoard = pixels[i * 4 + 3] ?? 0;
		for (let c = 0; c < 3; c++) {
			piece.data[i * 4 + c] = pixels[i * 4 + c] ?? 0;
		}
		piece.data[i * 4 + 3] = Math.min(coverage, onBoard);
		const t = coverage / 255;
		for (let c = 0; c < 3; c++) {
			const under = pixels[i * 4 + c] ?? 0;
			const over = fill[i * 3 + c] ?? under;
			pixels[i * 4 + c] = Math.round(under + (over - under) * t);
		}
	}
	pieceContext.putImageData(piece, 0, 0);
	boardContext.putImageData(region, left, top);

	return {
		background: boardCanvas.toDataURL("image/webp"),
		piece: pieceCanvas.toDataURL("image/png"),
	};
};

export type PuzzleChallengeWithPiece = GetPuzzleCaptchaResponse & {
	[ApiParams.piece]: string;
};

/**
 * The challenge with a piece the canvas can draw: as served (maintenance mode),
 * or lifted out of the board with the unscrambled mask. Undefined when the mask cannot be
 * unscrambled with `puzzleKey`.
 */
export const liftChallengePiece = async (
	challenge: GetPuzzleCaptchaResponse,
	puzzleKey: string | undefined,
): Promise<PuzzleChallengeWithPiece | undefined> => {
	const served = challenge[ApiParams.piece];
	if (undefined !== served) {
		return { ...challenge, [ApiParams.piece]: served };
	}
	const scrambled = challenge[ApiParams.pieceMask];
	const check = challenge[ApiParams.pieceMaskCheck];
	if (!puzzleKey || !scrambled || !check) return undefined;
	const mask = await unscramblePieceMask(
		puzzleKey,
		challenge[ApiParams.challenge],
		scrambled,
		check,
	);
	if (!mask) return undefined;
	const lifted = await liftPiece(
		challenge[ApiParams.background],
		mask,
		challenge[ApiParams.pieceSize],
		challenge[ApiParams.originX],
		challenge[ApiParams.originY],
	);
	return {
		...challenge,
		[ApiParams.background]: lifted.background,
		[ApiParams.piece]: lifted.piece,
	};
};
