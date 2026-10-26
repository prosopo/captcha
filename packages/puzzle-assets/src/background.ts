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

import { type Rgb, drawPalette } from "./palette.js";
import type { Prng } from "./prng.js";
import type { RgbaImage } from "./types.js";

interface MeshPoint {
	x: number;
	y: number;
	colour: Rgb;
	/** Falloff radius. Small values give tight colour fields, large ones wash. */
	sigma: number;
}

interface Blob {
	x: number;
	y: number;
	sigma: number;
	colour: Rgb;
	alpha: number;
}

/**
 * Grain amplitude, in 0-255 units, applied per channel.
 *
 * This is the one knob serving both goals at once. Visually it reads as film
 * grain and stops the mesh gradient banding on 8-bit displays. Structurally it
 * raises the noise floor an edge detector has to clear to find the notch
 * boundary — a perfectly smooth gradient would hand the target over to a Canny
 * filter. Too high and the image looks like TV static, so it stays subtle.
 */
const GRAIN_AMPLITUDE = 5;

const VIGNETTE_STRENGTH = 0.16;

const clamp255 = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v);

/**
 * Smooth multi-colour blend: every pixel is a Gaussian-weighted mix of the
 * control points, giving the "mesh gradient" look — broad soft colour fields
 * with no hard edges anywhere.
 *
 * The falloff has to be local. Inverse-distance weighting (1/d^2) looks right
 * on paper but at 300x200 every control point is a comparable distance from
 * every pixel, so the weights come out near-equal and the whole frame collapses
 * to the palette's mean — a flat grey-ish wash. A Gaussian with sigma around a
 * third of the frame keeps each point dominant near itself and still blends
 * smoothly in between.
 */
const meshColourAt = (
	points: readonly MeshPoint[],
	x: number,
	y: number,
): Rgb => {
	let wSum = 0;
	let r = 0;
	let g = 0;
	let b = 0;
	for (const point of points) {
		const dx = x - point.x;
		const dy = y - point.y;
		const w = Math.exp(-(dx * dx + dy * dy) / (2 * point.sigma * point.sigma));
		wSum += w;
		r += point.colour.r * w;
		g += point.colour.g * w;
		b += point.colour.b * w;
	}
	// Every point can be far away near a corner; fall back to the nearest.
	if (wSum < 1e-6) {
		let best = points[0];
		if (!best) throw new Error("puzzle-assets: no mesh points");
		let bestD = Number.POSITIVE_INFINITY;
		for (const point of points) {
			const d = (x - point.x) ** 2 + (y - point.y) ** 2;
			if (d < bestD) {
				bestD = d;
				best = point;
			}
		}
		return best.colour;
	}
	return { r: r / wSum, g: g / wSum, b: b / wSum };
};

/**
 * Synthesise a background. Deterministic in `prng`, so the same seed always
 * yields the same picture — see the seed-secrecy note in prng.ts for why that
 * determinism is safe only while the seed stays on the provider.
 */
export const generateBackground = (
	prng: Prng,
	width: number,
	height: number,
): RgbaImage => {
	const pointCount = prng.int(4, 6);
	// Drawn to length: drawPalette spreads hues evenly across the band, so
	// taking a prefix of a longer draw would cover only part of it and leave
	// the mesh monotone.
	const palette = drawPalette(prng, pointCount);
	const blobPalette = drawPalette(prng, 3);

	const minDimension = Math.min(width, height);
	const points: MeshPoint[] = [];
	for (let i = 0; i < pointCount; i++) {
		const colour = palette[i];
		if (!colour) throw new Error("puzzle-assets: palette underflow");
		points.push({
			// Allow control points slightly outside the frame so the gradient
			// keeps moving at the edges instead of pooling into flat corners.
			x: prng.range(-0.15, 1.15) * width,
			y: prng.range(-0.15, 1.15) * height,
			colour,
			sigma: prng.range(0.26, 0.48) * minDimension,
		});
	}

	const blobs: Blob[] = [];
	const blobCount = prng.int(2, 4);
	for (let i = 0; i < blobCount; i++) {
		const colour = blobPalette[i % blobPalette.length];
		if (!colour) throw new Error("puzzle-assets: palette underflow");
		blobs.push({
			x: prng.range(0.1, 0.9) * width,
			y: prng.range(0.1, 0.9) * height,
			sigma: prng.range(0.18, 0.38) * minDimension,
			colour,
			alpha: prng.range(0.16, 0.32),
		});
	}

	const data = Buffer.alloc(width * height * 4);
	const cx = width / 2;
	const cy = height / 2;
	const maxRadius = Math.sqrt(cx * cx + cy * cy);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const base = meshColourAt(points, x, y);
			let r = base.r;
			let g = base.g;
			let b = base.b;

			// Soft radial depth. Gaussian falloff means no visible boundary.
			for (const blob of blobs) {
				const dx = x - blob.x;
				const dy = y - blob.y;
				const a =
					blob.alpha *
					Math.exp(-(dx * dx + dy * dy) / (2 * blob.sigma * blob.sigma));
				r += (blob.colour.r - r) * a;
				g += (blob.colour.g - g) * a;
				b += (blob.colour.b - b) * a;
			}

			// Vignette: darkens the corners a little, which reads as depth and
			// keeps attention in the middle where the puzzle happens.
			const dxc = x - cx;
			const dyc = y - cy;
			const vignette =
				1 -
				VIGNETTE_STRENGTH * ((dxc * dxc + dyc * dyc) / (maxRadius * maxRadius));
			r *= vignette;
			g *= vignette;
			b *= vignette;

			const grain = (prng.next() - 0.5) * 2 * GRAIN_AMPLITUDE;

			const i = (y * width + x) * 4;
			data[i] = clamp255(Math.round(r + grain));
			data[i + 1] = clamp255(Math.round(g + grain));
			data[i + 2] = clamp255(Math.round(b + grain));
			data[i + 3] = 255;
		}
	}

	return { data, width, height };
};
