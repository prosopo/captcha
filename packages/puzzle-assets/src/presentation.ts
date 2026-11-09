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

import type { Prng } from "./prng.js";
import type { RgbaImage } from "./types.js";

/** How the hole and every decoy are shaded. One per puzzle, shared by all. */
export interface RecessStyle {
	/** Direction the light comes from, in radians. */
	lightAngle: number;
	/** 0 shades the rim evenly; 1 puts all of the shadow on one side. */
	lightBias: number;
	/** Share of the colour drained towards grey inside the recess, 0..1. */
	desaturate: number;
}

export const EVEN_RECESS_STYLE: RecessStyle = {
	lightAngle: 0,
	lightBias: 0,
	desaturate: 0,
};

interface Blotch {
	x: number;
	y: number;
	sigma: number;
	gain: number;
}

/** A brightness pattern laid over the board and, out of step, the piece. */
export type BoardPattern =
	| { kind: "none" }
	| { kind: "stripes"; angle: number; period: number; amplitude: number }
	| { kind: "dots"; spacing: number; radius: number; amplitude: number }
	| { kind: "blotches"; blotches: Blotch[] };

export interface Presentation {
	recess: RecessStyle;
	pattern: BoardPattern;
	/** Where the piece's copy of the pattern starts, so it does not line up. */
	pieceOffset: { x: number; y: number };
	/** Radians. */
	pieceRotation: number;
	pieceScale: number;
}

const MAX_PIECE_ROTATION = (8 * Math.PI) / 180;

/**
 * Rotating the piece pushes its corners outwards; this scale keeps a piece
 * rotated by up to `MAX_PIECE_ROTATION` inside its own bounding box.
 */
const MAX_PIECE_SCALE =
	1 / (Math.cos(MAX_PIECE_ROTATION) + Math.sin(MAX_PIECE_ROTATION));

const samplePattern = (
	prng: Prng,
	width: number,
	height: number,
): BoardPattern => {
	const kind = prng.int(0, 3);
	if (kind === 1) {
		return {
			kind: "stripes",
			angle: prng.range(0, Math.PI),
			period: prng.range(9, 18),
			amplitude: prng.range(0.03, 0.06),
		};
	}
	if (kind === 2) {
		return {
			kind: "dots",
			spacing: prng.range(10, 16),
			radius: prng.range(1.5, 3),
			amplitude: prng.range(0.05, 0.1),
		};
	}
	if (kind === 3) {
		const count = prng.int(6, 14);
		const blotches: Blotch[] = [];
		for (let i = 0; i < count; i++) {
			blotches.push({
				x: prng.range(0, width),
				y: prng.range(0, height),
				sigma: prng.range(8, 25),
				gain: prng.range(0.88, 1.1),
			});
		}
		return { kind: "blotches", blotches };
	}
	return { kind: "none" };
};

export const samplePresentation = (
	prng: Prng,
	width: number,
	height: number,
): Presentation => ({
	recess: {
		lightAngle: prng.range(0, 2 * Math.PI),
		lightBias: prng.range(0, 0.8),
		desaturate: prng.next() < 0.5 ? 0 : prng.range(0.2, 0.6),
	},
	pattern: samplePattern(prng, width, height),
	pieceOffset: { x: prng.range(0, width), y: prng.range(0, height) },
	pieceRotation: prng.range(-MAX_PIECE_ROTATION, MAX_PIECE_ROTATION),
	pieceScale: prng.range(MAX_PIECE_SCALE - 0.06, MAX_PIECE_SCALE),
});

/**
 * Inner-shadow strength at a recess pixel, `(lx, ly)` from the top-left of a
 * `size` box, `d` its signed distance from the outline.
 */
export const recessShadow = (
	d: number,
	lx: number,
	ly: number,
	size: number,
	strength: number,
	style: RecessStyle,
): number => {
	if (d <= -3) return 0;
	const half = size / 2;
	const facing = Math.cos(Math.atan2(ly - half, lx - half) - style.lightAngle);
	return strength * (1 + d / 3) * (1 + style.lightBias * facing);
};

const patternGain = (pattern: BoardPattern, x: number, y: number): number => {
	switch (pattern.kind) {
		case "none":
			return 1;
		case "stripes": {
			const along = x * Math.cos(pattern.angle) + y * Math.sin(pattern.angle);
			return (
				1 + pattern.amplitude * Math.sin((2 * Math.PI * along) / pattern.period)
			);
		}
		case "dots": {
			const dx = x - Math.round(x / pattern.spacing) * pattern.spacing;
			const dy = y - Math.round(y / pattern.spacing) * pattern.spacing;
			const fall = Math.max(0, 1 - Math.hypot(dx, dy) / pattern.radius);
			return 1 - pattern.amplitude * fall;
		}
		case "blotches": {
			let gain = 1;
			for (const b of pattern.blotches) {
				const r2 = (x - b.x) ** 2 + (y - b.y) ** 2;
				gain *= 1 + (b.gain - 1) * Math.exp(-r2 / (2 * b.sigma * b.sigma));
			}
			return gain;
		}
	}
};

const clamp255 = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Move a colour `amount` of the way to its own luma. */
export const towardsGrey = (
	r: number,
	g: number,
	b: number,
	amount: number,
): [number, number, number] => {
	const luma = 0.299 * r + 0.587 * g + 0.114 * b;
	return [
		r + (luma - r) * amount,
		g + (luma - g) * amount,
		b + (luma - b) * amount,
	];
};

/** Multiply `image` by `pattern`, read from `(offsetX, offsetY)`. Mutates `image`. */
export const applyPattern = (
	image: RgbaImage,
	pattern: BoardPattern,
	offsetX: number,
	offsetY: number,
): void => {
	if (pattern.kind === "none") return;
	for (let y = 0; y < image.height; y++) {
		for (let x = 0; x < image.width; x++) {
			const i = (y * image.width + x) * 4;
			if ((image.data[i + 3] ?? 0) === 0) continue;
			const gain = patternGain(pattern, x + offsetX, y + offsetY);
			image.data[i] = clamp255(Math.round((image.data[i] ?? 0) * gain));
			image.data[i + 1] = clamp255(Math.round((image.data[i + 1] ?? 0) * gain));
			image.data[i + 2] = clamp255(Math.round((image.data[i + 2] ?? 0) * gain));
		}
	}
};

/**
 * Rotate and scale a square piece about its centre, keeping its box size.
 * Bilinear, on premultiplied colour so the anti-aliased edge stays clean.
 */
export const posePiece = (
	piece: RgbaImage,
	rotation: number,
	scale: number,
): RgbaImage => {
	const { width, height, data } = piece;
	const out = Buffer.alloc(width * height * 4);
	const cx = (width - 1) / 2;
	const cy = (height - 1) / 2;
	const cos = Math.cos(rotation);
	const sin = Math.sin(rotation);
	const at = (x: number, y: number, c: number): number => {
		if (x < 0 || y < 0 || x >= width || y >= height) return 0;
		const i = (y * width + x) * 4;
		const alpha = (data[i + 3] ?? 0) / 255;
		return c === 3 ? alpha : (data[i + c] ?? 0) * alpha;
	};
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const ox = x - cx;
			const oy = y - cy;
			const sx = (cos * ox + sin * oy) / scale + cx;
			const sy = (-sin * ox + cos * oy) / scale + cy;
			const x0 = Math.floor(sx);
			const y0 = Math.floor(sy);
			const fx = sx - x0;
			const fy = sy - y0;
			const sample = (c: number): number =>
				at(x0, y0, c) * (1 - fx) * (1 - fy) +
				at(x0 + 1, y0, c) * fx * (1 - fy) +
				at(x0, y0 + 1, c) * (1 - fx) * fy +
				at(x0 + 1, y0 + 1, c) * fx * fy;
			const alpha = sample(3);
			const o = (y * width + x) * 4;
			if (alpha <= 0) continue;
			out[o] = clamp255(Math.round(sample(0) / alpha));
			out[o + 1] = clamp255(Math.round(sample(1) / alpha));
			out[o + 2] = clamp255(Math.round(sample(2) / alpha));
			out[o + 3] = clamp255(Math.round(alpha * 255));
		}
	}
	return { data: out, width, height };
};
