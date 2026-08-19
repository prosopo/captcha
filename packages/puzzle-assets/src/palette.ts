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

export interface Rgb {
	r: number;
	g: number;
	b: number;
}

/**
 * A background is built from analogous hues around a base, which is what keeps
 * the mesh gradients looking deliberate rather than muddy. Saturation and
 * lightness stay in a mid band: fully saturated colours make the notch's inner
 * shadow read as a colour shift rather than a depth cue, and very light or
 * very dark backgrounds flatten the piece against them.
 */
interface PaletteSpec {
	/** Base hue in degrees. */
	hue: number;
	/** How far the analogous hues may drift from the base, in degrees. */
	spread: number;
	saturation: [number, number];
	lightness: [number, number];
}

const PALETTES: readonly PaletteSpec[] = [
	// dusk violet
	{ hue: 268, spread: 46, saturation: [0.55, 0.78], lightness: [0.4, 0.7] },
	// prosopo blue
	{ hue: 212, spread: 42, saturation: [0.58, 0.8], lightness: [0.4, 0.7] },
	// teal drift
	{ hue: 178, spread: 44, saturation: [0.5, 0.72], lightness: [0.38, 0.68] },
	// warm sand
	{ hue: 32, spread: 38, saturation: [0.58, 0.8], lightness: [0.45, 0.72] },
	// rose quartz
	{ hue: 338, spread: 40, saturation: [0.52, 0.74], lightness: [0.45, 0.72] },
	// moss
	{ hue: 138, spread: 42, saturation: [0.46, 0.66], lightness: [0.38, 0.66] },
];

const hueToChannel = (p: number, q: number, tRaw: number): number => {
	let t = tRaw;
	if (t < 0) t += 1;
	if (t > 1) t -= 1;
	if (t < 1 / 6) return p + (q - p) * 6 * t;
	if (t < 1 / 2) return q;
	if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
	return p;
};

/** h in degrees, s and l in [0, 1]. */
export const hslToRgb = (h: number, s: number, l: number): Rgb => {
	const hNorm = (((h % 360) + 360) % 360) / 360;
	if (s === 0) {
		const v = Math.round(l * 255);
		return { r: v, g: v, b: v };
	}
	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;
	return {
		r: Math.round(hueToChannel(p, q, hNorm + 1 / 3) * 255),
		g: Math.round(hueToChannel(p, q, hNorm) * 255),
		b: Math.round(hueToChannel(p, q, hNorm - 1 / 3) * 255),
	};
};

/**
 * Draw `count` harmonious colours. The base hue is jittered per background so
 * two draws from the same palette are not the same picture.
 *
 * Hues are spread evenly across the band rather than sampled uniformly at
 * random, and lightness alternates between the ends of the range. Drawing both
 * at random clusters them: neighbouring control points come out nearly the same
 * colour and the mesh reads as one flat field with a slight gradient, which is
 * the difference between "designed" and "beige".
 */
export const drawPalette = (prng: Prng, count: number): Rgb[] => {
	const spec = prng.pick(PALETTES);
	const baseHue = spec.hue + prng.range(-20, 20);
	// Walk the hue band in a random direction so the light/dark alternation
	// does not always run the same way around the wheel.
	const direction = prng.next() < 0.5 ? -1 : 1;
	const colours: Rgb[] = [];
	for (let i = 0; i < count; i++) {
		const t = count === 1 ? 0.5 : i / (count - 1);
		const hue =
			baseHue + direction * (t - 0.5) * 2 * spec.spread + prng.range(-6, 6);
		const saturation = prng.range(spec.saturation[0], spec.saturation[1]);
		// Alternate towards each end of the lightness range so adjacent fields
		// contrast instead of averaging out.
		const pole = i % 2 === 0 ? 0 : 1;
		const lightness =
			spec.lightness[pole] + prng.range(-0.04, 0.04) * (pole === 0 ? 1 : -1);
		colours.push(hslToRgb(hue, saturation, lightness));
	}
	return colours;
};
