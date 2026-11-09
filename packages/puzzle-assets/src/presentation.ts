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

type Stroke = { x: number; y: number }[];

/** A treatment laid over the board and, out of step, the piece. */
export type BoardEffect =
	| { kind: "stripes"; angle: number; period: number; amplitude: number }
	| { kind: "dots"; spacing: number; radius: number; amplitude: number }
	| { kind: "blotches"; blotches: Blotch[] }
	| {
			kind: "rings";
			x: number;
			y: number;
			period: number;
			amplitude: number;
	  }
	| {
			kind: "swirl";
			x: number;
			y: number;
			/** Peak hue shift going round the centre. */
			degreesPerTurn: number;
			degreesPerPixel: number;
	  }
	| { kind: "scribbles"; strokes: Stroke[]; width: number; darkness: number };

export interface Presentation {
	recess: RecessStyle;
	effects: BoardEffect[];
	/** Where the piece's copy of the effects starts, so it does not line up. */
	pieceOffset: { x: number; y: number };
}

const EFFECT_KINDS = [
	"stripes",
	"dots",
	"blotches",
	"rings",
	"swirl",
	"scribbles",
] as const;

const sampleStroke = (prng: Prng, width: number, height: number): Stroke => {
	const x0 = prng.range(-0.1, 1.1) * width;
	const y0 = prng.range(-0.1, 1.1) * height;
	const heading = prng.range(0, 2 * Math.PI);
	const bend = prng.range(-0.04, 0.04);
	const wobble = prng.range(0.05, 0.2);
	const length = prng.range(0.5, 1.2) * width;
	const points: { x: number; y: number }[] = [];
	let x = x0;
	let y = y0;
	let angle = heading;
	for (let travelled = 0; travelled <= length; travelled += 4) {
		points.push({ x, y });
		angle += bend + wobble * Math.sin(travelled / 17);
		x += 4 * Math.cos(angle);
		y += 4 * Math.sin(angle);
	}
	return points;
};

const sampleEffect = (
	prng: Prng,
	width: number,
	height: number,
): BoardEffect => {
	const kind = EFFECT_KINDS[prng.int(0, EFFECT_KINDS.length - 1)];
	switch (kind) {
		case "stripes":
			return {
				kind,
				angle: prng.range(0, Math.PI),
				period: prng.range(9, 18),
				amplitude: prng.range(0.04, 0.08),
			};
		case "dots":
			return {
				kind,
				spacing: prng.range(10, 16),
				radius: prng.range(1.5, 3),
				amplitude: prng.range(0.06, 0.12),
			};
		case "blotches": {
			const blotches: Blotch[] = [];
			const count = prng.int(6, 14);
			for (let i = 0; i < count; i++) {
				blotches.push({
					x: prng.range(0, width),
					y: prng.range(0, height),
					sigma: prng.range(8, 25),
					gain: prng.range(0.86, 1.12),
				});
			}
			return { kind, blotches };
		}
		case "rings":
			return {
				kind,
				x: prng.range(0, width),
				y: prng.range(0, height),
				period: prng.range(7, 16),
				amplitude: prng.range(0.08, 0.18),
			};
		case "swirl":
			return {
				kind,
				x: prng.range(0, width),
				y: prng.range(0, height),
				degreesPerTurn: prng.range(-90, 90),
				degreesPerPixel: prng.range(-0.8, 0.8),
			};
		default: {
			const strokes: Stroke[] = [];
			const count = prng.int(3, 7);
			for (let i = 0; i < count; i++) {
				strokes.push(sampleStroke(prng, width, height));
			}
			return {
				kind: "scribbles",
				strokes,
				width: prng.range(1.2, 2.6),
				darkness: prng.range(0.12, 0.28),
			};
		}
	}
};

export const samplePresentation = (
	prng: Prng,
	width: number,
	height: number,
): Presentation => {
	const recess: RecessStyle = {
		lightAngle: prng.range(0, 2 * Math.PI),
		lightBias: prng.range(0, 0.8),
		desaturate: prng.next() < 0.5 ? 0 : prng.range(0.2, 0.6),
	};
	const effects: BoardEffect[] = [];
	const count = prng.int(1, 2);
	for (let i = 0; i < count; i++) {
		effects.push(sampleEffect(prng, width, height));
	}
	return {
		recess,
		effects,
		pieceOffset: { x: prng.range(0, width), y: prng.range(0, height) },
	};
};

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

/** Brightness multiplier an effect applies at `(x, y)`; 1 where it does nothing. */
const effectGain = (effect: BoardEffect, x: number, y: number): number => {
	switch (effect.kind) {
		case "stripes": {
			const along = x * Math.cos(effect.angle) + y * Math.sin(effect.angle);
			return (
				1 + effect.amplitude * Math.sin((2 * Math.PI * along) / effect.period)
			);
		}
		case "dots": {
			const dx = x - Math.round(x / effect.spacing) * effect.spacing;
			const dy = y - Math.round(y / effect.spacing) * effect.spacing;
			const fall = Math.max(0, 1 - Math.hypot(dx, dy) / effect.radius);
			return 1 - effect.amplitude * fall;
		}
		case "blotches": {
			let gain = 1;
			for (const b of effect.blotches) {
				const r2 = (x - b.x) ** 2 + (y - b.y) ** 2;
				gain *= 1 + (b.gain - 1) * Math.exp(-r2 / (2 * b.sigma * b.sigma));
			}
			return gain;
		}
		case "rings": {
			const r = Math.hypot(x - effect.x, y - effect.y);
			return 1 + effect.amplitude * Math.sin((2 * Math.PI * r) / effect.period);
		}
		default:
			return 1;
	}
};

/** Distance from each pixel to the nearest stroke centreline, capped at `cap`. */
const strokeDistances = (
	strokes: Stroke[],
	width: number,
	height: number,
	offsetX: number,
	offsetY: number,
	cap: number,
): Float32Array => {
	const distance = new Float32Array(width * height).fill(cap);
	for (const stroke of strokes) {
		for (let s = 1; s < stroke.length; s++) {
			const a = stroke[s - 1];
			const b = stroke[s];
			if (!a || !b) continue;
			const ax = a.x - offsetX;
			const ay = a.y - offsetY;
			const bx = b.x - offsetX;
			const by = b.y - offsetY;
			const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - cap));
			const x1 = Math.min(width - 1, Math.ceil(Math.max(ax, bx) + cap));
			const y0 = Math.max(0, Math.floor(Math.min(ay, by) - cap));
			const y1 = Math.min(height - 1, Math.ceil(Math.max(ay, by) + cap));
			const vx = bx - ax;
			const vy = by - ay;
			const len2 = vx * vx + vy * vy || 1;
			for (let y = y0; y <= y1; y++) {
				for (let x = x0; x <= x1; x++) {
					const t = Math.max(
						0,
						Math.min(1, ((x - ax) * vx + (y - ay) * vy) / len2),
					);
					const d = Math.hypot(x - (ax + t * vx), y - (ay + t * vy));
					const i = y * width + x;
					if (d < (distance[i] ?? cap)) distance[i] = d;
				}
			}
		}
	}
	return distance;
};

/** Rotate a colour's hue by `degrees` about the grey axis. */
const rotateHue = (
	r: number,
	g: number,
	b: number,
	degrees: number,
): [number, number, number] => {
	const a = (degrees * Math.PI) / 180;
	const cos = Math.cos(a);
	const sin = Math.sin(a);
	const k = (1 - cos) / 3;
	const s = Math.sqrt(1 / 3) * sin;
	return [
		r * (cos + k) + g * (k - s) + b * (k + s),
		r * (k + s) + g * (cos + k) + b * (k - s),
		r * (k - s) + g * (k + s) + b * (cos + k),
	];
};

/**
 * Lay `effects` over `image`, read as if the image's top-left sat at
 * `(offsetX, offsetY)`. Transparent pixels are left alone. Mutates `image`.
 */
export const applyEffects = (
	image: RgbaImage,
	effects: readonly BoardEffect[],
	offsetX: number,
	offsetY: number,
): void => {
	for (const effect of effects) {
		const strokeDistance =
			effect.kind === "scribbles"
				? strokeDistances(
						effect.strokes,
						image.width,
						image.height,
						offsetX,
						offsetY,
						effect.width + 1,
					)
				: undefined;
		for (let y = 0; y < image.height; y++) {
			for (let x = 0; x < image.width; x++) {
				const i = (y * image.width + x) * 4;
				if ((image.data[i + 3] ?? 0) === 0) continue;
				let r = image.data[i] ?? 0;
				let g = image.data[i + 1] ?? 0;
				let b = image.data[i + 2] ?? 0;
				const px = x + offsetX;
				const py = y + offsetY;
				if (effect.kind === "swirl") {
					const angle = Math.atan2(py - effect.y, px - effect.x);
					const reach = Math.hypot(px - effect.x, py - effect.y);
					[r, g, b] = rotateHue(
						r,
						g,
						b,
						Math.sin(angle) * effect.degreesPerTurn +
							reach * effect.degreesPerPixel,
					);
				} else if (effect.kind === "scribbles" && strokeDistance) {
					const d = strokeDistance[y * image.width + x] ?? effect.width + 1;
					const coverage = Math.max(0, Math.min(1, effect.width / 2 + 0.5 - d));
					const ink = coverage * effect.darkness;
					r *= 1 - ink;
					g *= 1 - ink;
					b *= 1 - ink;
				} else {
					const gain = effectGain(effect, px, py);
					r *= gain;
					g *= gain;
					b *= gain;
				}
				image.data[i] = clamp255(Math.round(r));
				image.data[i + 1] = clamp255(Math.round(g));
				image.data[i + 2] = clamp255(Math.round(b));
			}
		}
	}
};
