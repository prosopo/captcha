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

/**
 * An icon's colour spec, kept as HSL components rather than baked hex so that
 * per-tile hue jitter can re-derive the gradient at render time.
 */
export interface TilePalette {
	/** Base hue in degrees. */
	hue: number;
	saturation: number;
	lightness: number;
	/** Hue travel across the chip's gradient, in degrees. */
	sweep: number;
}

/** Resolved colours for one rendered tile. */
export interface TileColors {
	/** Gradient start, `#rrggbb`. */
	from: string;
	/** Gradient end, `#rrggbb`. */
	to: string;
	/** Symbol fill, `#rrggbb`. */
	ink: string;
	/** Chip edge, `#rrggbb`. A touch darker than the gradient end. */
	edge: string;
}

const hueToChannel = (p: number, q: number, tRaw: number): number => {
	let t = tRaw;
	if (t < 0) t += 1;
	if (t > 1) t -= 1;
	if (t < 1 / 6) return p + (q - p) * 6 * t;
	if (t < 1 / 2) return q;
	if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
	return p;
};

const toHex = (value: number): string =>
	Math.max(0, Math.min(255, Math.round(value * 255)))
		.toString(16)
		.padStart(2, "0");

/** `h` in degrees, `s` and `l` in [0, 1]. Returns `#rrggbb`. */
export const hslToHex = (h: number, s: number, l: number): string => {
	const hue = (((h % 360) + 360) % 360) / 360;
	const sat = Math.max(0, Math.min(1, s));
	const light = Math.max(0, Math.min(1, l));
	if (sat === 0) {
		const grey = toHex(light);
		return `#${grey}${grey}${grey}`;
	}
	const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
	const p = 2 * light - q;
	return `#${toHex(hueToChannel(p, q, hue + 1 / 3))}${toHex(
		hueToChannel(p, q, hue),
	)}${toHex(hueToChannel(p, q, hue - 1 / 3))}`;
};

/** Resolve a palette to concrete colours, offset by `hueDelta` degrees. */
export const tileColors = (palette: TilePalette, hueDelta = 0): TileColors => {
	const hue = palette.hue + hueDelta;
	return {
		from: hslToHex(hue, palette.saturation, palette.lightness + 0.08),
		to: hslToHex(
			hue + palette.sweep,
			palette.saturation * 0.94,
			palette.lightness - 0.1,
		),
		edge: hslToHex(
			hue + palette.sweep,
			palette.saturation * 0.9,
			palette.lightness - 0.2,
		),
		// Near-white rather than pure white: pure white on a mid-saturation
		// chip clips the symbol edges into a hard halo under WebP.
		ink: hslToHex(hue, 0.3, 0.97),
	};
};

/**
 * Hues that read as clearly different to a colour-blind user as well as a
 * trichromat are hard to guarantee in general, so the board never relies on
 * colour alone: every icon also has a distinct silhouette (see `glyph.ts`).
 * Colour is a second, redundant channel.
 *
 * Hues are drawn as an evenly-spaced ring with a random rotation, then
 * jittered within their slice. That keeps any two icons on a board at least
 * `360 / count - 2 * jitter` degrees apart no matter what the seed does.
 */
export const createTilePalettes = (
	prng: Prng,
	count: number,
): TilePalette[] => {
	if (count <= 0) {
		throw new Error("connect-assets: palette count must be positive");
	}
	const slice = 360 / count;
	// Keep the jitter comfortably inside the slice so neighbouring hues can
	// never converge.
	const jitter = Math.min(slice / 4, 14);
	const rotation = prng.range(0, 360);

	return Array.from({ length: count }, (_, index) => ({
		hue: rotation + index * slice + prng.range(-jitter, jitter),
		saturation: prng.range(0.62, 0.82),
		lightness: prng.range(0.46, 0.58),
		// A short analogous sweep gives the chip depth without turning it into
		// a two-colour tile that competes with the symbol for attention.
		sweep: prng.range(16, 30) * (prng.next() < 0.5 ? -1 : 1),
	}));
};
