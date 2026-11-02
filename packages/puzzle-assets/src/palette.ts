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

import { bestPairContrast } from "./contrast.js";
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
/**
 * The worst-case contrast ratio the palette's widest pair must reach, across
 * normal vision and all three dichromacies.
 *
 * This is a floor on the *range* a background spans, not on every pair — a mesh
 * gradient needs near-neighbours, and demanding contrast between them would
 * produce stripes. What it rules out is a field that is uniformly one brightness,
 * where hue is the only thing separating anything and a dichromat sees a flat
 * rectangle.
 *
 * 1.6 is chosen to be achievable rather than aspirational: the palettes are
 * analogous-hue families on purpose, and pushing this towards WCAG's 3:1 would
 * reject most of them and force the generator into the widened-lightness
 * fallback on nearly every draw, which would make every background look the
 * same. Separation of the piece from what it rests on is guaranteed by its
 * luminance-stepped rim in `compose.ts`, not by this; this stops the background
 * itself from having no structure at all.
 */
export const MIN_PALETTE_CONTRAST = 1.6;

/** How many times to redraw before widening the lightness band instead. */
const MAX_PALETTE_ATTEMPTS = 6;

const drawOnce = (
	prng: Prng,
	count: number,
	spec: PaletteSpec,
	lightnessBoost: number,
): Rgb[] => {
	const baseHue = spec.hue + prng.range(-20, 20);
	// Walk the hue band in a random direction so the light/dark alternation
	// does not always run the same way around the wheel.
	const direction = prng.next() < 0.5 ? -1 : 1;
	// Push the two lightness poles apart. Zero on the first attempts, so an
	// ordinary draw is exactly what it was before; only a palette that failed
	// the contrast floor gets stretched, and only as far as it needs.
	const low = Math.max(0.08, spec.lightness[0] - lightnessBoost);
	const high = Math.min(0.92, spec.lightness[1] + lightnessBoost);
	const colours: Rgb[] = [];
	for (let i = 0; i < count; i++) {
		const t = count === 1 ? 0.5 : i / (count - 1);
		const hue =
			baseHue + direction * (t - 0.5) * 2 * spec.spread + prng.range(-6, 6);
		const saturation = prng.range(spec.saturation[0], spec.saturation[1]);
		// Alternate towards each end of the lightness range so adjacent fields
		// contrast instead of averaging out.
		const pole = i % 2 === 0 ? 0 : 1;
		const base = pole === 0 ? low : high;
		const lightness = base + prng.range(-0.04, 0.04) * (pole === 0 ? 1 : -1);
		colours.push(hslToRgb(hue, saturation, lightness));
	}
	return colours;
};

export const drawPalette = (prng: Prng, count: number): Rgb[] => {
	const spec = prng.pick(PALETTES);

	// Redraw while the palette has no visible light-to-dark range for someone
	// with any of the three dichromacies. Nothing verified this before, so a
	// palette addition could silently reintroduce a combination that reads as
	// one flat colour for 1 in 12 men, and no test would have noticed.
	//
	// Bounded, and the bound widens the lightness band rather than giving up:
	// returning an unchecked palette after N tries would make the floor
	// advisory, and `MIN_PALETTE_CONTRAST` is a floor.
	let last = drawOnce(prng, count, spec, 0);
	for (let attempt = 1; attempt <= MAX_PALETTE_ATTEMPTS; attempt++) {
		if (bestPairContrast(last) >= MIN_PALETTE_CONTRAST) {
			return last;
		}
		// Each retry stretches further. A palette that cannot reach the floor
		// inside its own band will reach it once the poles are far enough apart,
		// and the first attempts are unstretched so the common case is unchanged.
		last = drawOnce(prng, count, spec, attempt * 0.07);
	}
	return last;
};
