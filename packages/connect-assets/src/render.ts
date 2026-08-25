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

/**
 * Tile SVG synthesis. Kept free of `sharp` so the markup can be asserted in
 * unit tests without the native binding, and so the browser preview harness
 * can render the same strings directly.
 */

import { type GlyphFamily, createGlyph } from "./glyph.js";
import { type TilePalette, tileColors } from "./palette.js";
import type { Prng } from "./prng.js";
import type { ConnectRenderSettings } from "./types.js";

export const DEFAULT_RENDER_SETTINGS: ConnectRenderSettings = {
	// 56 CSS px cell at 2x. Big enough that the silhouettes stay legible after
	// WebP, small enough that a full board is a few tens of kilobytes.
	tileSize: 112,
	jitterDegrees: 7,
	jitterScale: 0.05,
	jitterHue: 5,
};

/** Everything about an icon that is fixed for the whole challenge. */
export interface IconSpec {
	family: GlyphFamily;
	palette: TilePalette;
	/** Per-challenge base orientation for the silhouette. */
	rotation: number;
	/** Chip corner radius in the 100-unit box. */
	radius: number;
}

/** The per-tile wobble that stops two tiles of one icon being byte-identical. */
export interface TileJitter {
	rotation: number;
	scale: number;
	hue: number;
	/**
	 * Suffix for this tile's gradient ids. Each tile ships as its own file, so
	 * collisions cannot bite in production — but a consumer that inlines
	 * several tiles into one document (a preview sheet, a future inline-SVG
	 * widget) would otherwise have every tile resolve `url(#chip)` to the
	 * first definition and render in a single colour.
	 */
	uid: string;
}

const fix = (value: number): string => {
	const rounded = Math.round(value * 1000) / 1000;
	return Object.is(rounded, -0) ? "0" : String(rounded);
};

export const createIconSpecs = (
	prng: Prng,
	families: readonly GlyphFamily[],
	palettes: readonly TilePalette[],
): IconSpec[] =>
	families.map((family, index) => {
		const palette = palettes[index];
		if (!palette) {
			throw new Error("connect-assets: palette/family count mismatch");
		}
		return {
			family,
			palette,
			rotation: prng.range(0, 360),
			radius: prng.range(20, 30),
		};
	});

export const createTileJitter = (
	prng: Prng,
	settings: ConnectRenderSettings,
): TileJitter => ({
	rotation: prng.range(-settings.jitterDegrees, settings.jitterDegrees),
	scale: 1 + prng.range(-settings.jitterScale, settings.jitterScale),
	hue: prng.range(-settings.jitterHue, settings.jitterHue),
	uid: prng.int(0, 0xffffff).toString(36),
});

/**
 * One tile as standalone SVG markup.
 *
 * The chip is inset from the viewBox so the drop shadow and the drag-time
 * scale-up in the widget have somewhere to go without clipping.
 */
export const renderTileSvg = (
	icon: IconSpec,
	jitter: TileJitter,
	settings: ConnectRenderSettings = DEFAULT_RENDER_SETTINGS,
): string => {
	const colors = tileColors(icon.palette, jitter.hue);
	const glyph = createGlyph(icon.family, icon.rotation);
	const size = settings.tileSize;
	const gradientId = `c${jitter.uid}`;
	const sheenId = `s${jitter.uid}`;
	const inset = 5;
	const extent = 100 - inset * 2;
	const fillRule = glyph.fillRule ? ` fill-rule="${glyph.fillRule}"` : "";
	// A round-joined stroke in the fill colour is a cheap, crisp way to round
	// polygon corners without computing true fillets.
	const stroke =
		glyph.round > 0
			? ` stroke="${colors.ink}" stroke-width="${fix(glyph.round)}" stroke-linejoin="round" stroke-linecap="round"`
			: "";
	const symbolTransform = `rotate(${fix(jitter.rotation)} 50 50) scale(${fix(jitter.scale)}) translate(${fix((50 * (1 - jitter.scale)) / jitter.scale)} ${fix((50 * (1 - jitter.scale)) / jitter.scale)})`;

	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">`,
		"<defs>",
		`<linearGradient id="${gradientId}" x1="0" y1="0" x2="0.35" y2="1">`,
		`<stop offset="0" stop-color="${colors.from}"/>`,
		`<stop offset="1" stop-color="${colors.to}"/>`,
		"</linearGradient>",
		`<linearGradient id="${sheenId}" x1="0" y1="0" x2="0" y2="1">`,
		'<stop offset="0" stop-color="#ffffff" stop-opacity="0.34"/>',
		'<stop offset="0.55" stop-color="#ffffff" stop-opacity="0.04"/>',
		'<stop offset="1" stop-color="#000000" stop-opacity="0.10"/>',
		"</linearGradient>",
		"</defs>",
		`<rect x="${inset}" y="${inset}" width="${extent}" height="${extent}" rx="${fix(icon.radius)}" fill="${colors.from}"/>`,
		`<rect x="${inset}" y="${inset}" width="${extent}" height="${extent}" rx="${fix(icon.radius)}" fill="url(#${gradientId})"/>`,
		`<rect x="${inset}" y="${inset}" width="${extent}" height="${extent}" rx="${fix(icon.radius)}" fill="url(#${sheenId})"/>`,
		`<rect x="${fix(inset + 0.75)}" y="${fix(inset + 0.75)}" width="${fix(extent - 1.5)}" height="${fix(extent - 1.5)}" rx="${fix(icon.radius - 0.75)}" fill="none" stroke="${colors.edge}" stroke-opacity="0.55" stroke-width="1.5"/>`,
		`<g transform="${symbolTransform}">`,
		// Offset shadow copy first, so the symbol sits on it. Cheaper and far
		// more predictable across librsvg versions than an SVG filter.
		`<path d="${glyph.d}"${fillRule} fill="#000000" fill-opacity="0.20"${stroke ? stroke.replace(colors.ink, "#000000") : ""} stroke-opacity="0.20" transform="translate(0 2.4)"/>`,
		`<path d="${glyph.d}"${fillRule} fill="${colors.ink}"${stroke}/>`,
		"</g>",
		"</svg>",
	].join("");
};
