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

import type { Rgb } from "./palette.js";

/**
 * Colour-vision arithmetic for the puzzle's generated images.
 *
 * The palettes are six analogous-hue families picked by eye. Analogous hues are
 * what makes a mesh gradient look deliberate, and they are also the worst case
 * for colour-blind vision: a band of neighbouring hues at similar lightness is
 * exactly what a dichromat collapses to one colour. Nothing checked for that, so
 * a palette could lose all its structure for 1 in 12 men and there was no test
 * that would notice.
 *
 * What is checked here is **luminance**, under normal vision and under the three
 * dichromacies. Luminance is the right thing to check because it is the cue that
 * survives when hue separation is gone — it is also what survives greyscale, a
 * monochrome display, and a bright phone screen outdoors.
 */

/** The three dichromacies, plus normal trichromatic vision. */
export type VisionType =
	| "normal"
	| "protanopia"
	| "deuteranopia"
	| "tritanopia";

export const VISION_TYPES: readonly VisionType[] = [
	"normal",
	"protanopia",
	"deuteranopia",
	"tritanopia",
];

/** sRGB 8-bit channel to linear light in [0, 1]. */
const toLinear = (channel: number): number => {
	const c = channel / 255;
	return c <= 0.040_45 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const fromLinear = (value: number): number => {
	const c =
		value <= 0.003_130_8 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
	return Math.min(255, Math.max(0, Math.round(c * 255)));
};

/**
 * WCAG relative luminance, in [0, 1].
 *
 * Linearised first: averaging raw sRGB bytes is the usual mistake and it
 * overstates how light a saturated colour is, which would let this pass a pair
 * that a dichromat sees as flat.
 */
export const relativeLuminance = (colour: Rgb): number =>
	0.2126 * toLinear(colour.r) +
	0.7152 * toLinear(colour.g) +
	0.0722 * toLinear(colour.b);

/**
 * WCAG contrast ratio, in [1, 21].
 *
 * 1 means two colours are the same brightness — indistinguishable without hue —
 * and 21 is black against white.
 */
export const contrastRatio = (a: Rgb, b: Rgb): number => {
	const la = relativeLuminance(a);
	const lb = relativeLuminance(b);
	const lighter = Math.max(la, lb);
	const darker = Math.min(la, lb);
	return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Brettel/Viénot-style dichromacy simulation, in linear RGB.
 *
 * These are the Viénot–Brettel–Mollon single-plane projections, which is the
 * standard approximation and is more than accurate enough for the question being
 * asked here: not "what exactly does this look like" but "has the difference
 * between these two colours disappeared". The matrices are applied to linear
 * light, not to sRGB bytes — applying them to gamma-encoded values is a common
 * error that makes the result look more distinguishable than it is.
 */
const DICHROMACY_MATRICES: Record<
	Exclude<VisionType, "normal">,
	readonly [
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
	]
> = {
	protanopia: [
		0.152_86, 1.175_79, -0.328_65, 0.114_75, 0.854_26, 0.030_99, -0.003_86,
		-0.005_34, 1.009_2,
	],
	deuteranopia: [
		0.367_7, 0.861_22, -0.228_92, 0.280_39, 0.672_01, 0.047_6, -0.011_8,
		0.041_64, 0.970_16,
	],
	tritanopia: [
		1.255_28, -0.076_57, -0.178_71, -0.078_33, 0.930_87, 0.147_46, 0.004_91,
		0.221_4, 0.773_09,
	],
};

/**
 * What `colour` looks like to someone with `vision`.
 *
 * `normal` is the identity, so callers can loop over [`VISION_TYPES`] without a
 * special case.
 */
export const simulateVision = (colour: Rgb, vision: VisionType): Rgb => {
	if (vision === "normal") {
		return colour;
	}
	const m = DICHROMACY_MATRICES[vision];
	const r = toLinear(colour.r);
	const g = toLinear(colour.g);
	const b = toLinear(colour.b);
	return {
		r: fromLinear(m[0] * r + m[1] * g + m[2] * b),
		g: fromLinear(m[3] * r + m[4] * g + m[5] * b),
		b: fromLinear(m[6] * r + m[7] * g + m[8] * b),
	};
};

/**
 * The lowest contrast ratio between `a` and `b` across normal vision and all
 * three dichromacies.
 *
 * The minimum, not the average: a palette that reads well for most people and
 * collapses for deuteranopes has failed, and averaging would hide exactly that.
 */
export const worstCaseContrast = (a: Rgb, b: Rgb): number => {
	let worst = Number.POSITIVE_INFINITY;
	for (const vision of VISION_TYPES) {
		const ratio = contrastRatio(
			simulateVision(a, vision),
			simulateVision(b, vision),
		);
		if (ratio < worst) {
			worst = ratio;
		}
	}
	return worst;
};

/**
 * The widest separation any pair in `colours` achieves in the worst case.
 *
 * This is the question a mesh background has to answer: not "is every pair
 * distinguishable" — a gradient needs near-neighbours — but "does the field
 * contain a visible light-to-dark range at all, for everyone". A palette whose
 * best pair is flat is a flat picture, and a piece resting on it has nothing but
 * its own edge treatment to separate it.
 */
export const bestPairContrast = (colours: readonly Rgb[]): number => {
	let best = 1;
	for (let i = 0; i < colours.length; i++) {
		for (let j = i + 1; j < colours.length; j++) {
			const a = colours[i];
			const b = colours[j];
			if (a === undefined || b === undefined) continue;
			const ratio = worstCaseContrast(a, b);
			if (ratio > best) {
				best = ratio;
			}
		}
	}
	return best;
};
