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

import { type Prng, type RgbaImage, hslToRgb } from "@prosopo/puzzle-assets";
import sharp from "sharp";
import { collageMarkup } from "./background.js";
import { glyphPath } from "./glyphs.js";
import { shuffle } from "./shuffle.js";
import type {
	IconOrderGeometry,
	IconOrderRenderSettings,
	IconPlacement,
} from "./types.js";

/** Glyph path data is authored in this box; see glyphs.ts. */
const GLYPH_BOX = 100;

/**
 * Width of the dark outline stroke relative to the bright one. Narrower and
 * icons vanish over light regions; wider and the halo becomes the strongest
 * edge in the frame, which is what a solver looks for.
 */
const HALO_WIDTH_MULTIPLE = 2.4;

const HALO_COLOUR = "rgb(12,14,22)";

const LEGEND_CHIP_COLOUR = "rgb(24,27,38)";
const LEGEND_GAP = 6;
const LEGEND_GLYPH_INSET = 0.62;

const round = (value: number): number => Math.round(value * 100) / 100;

const strokeColour = (hue: number): string => {
	const { r, g, b } = hslToRgb(hue, 0.86, 0.64);
	return `rgb(${r},${g},${b})`;
};

/**
 * Converts a frame-pixel stroke width into glyph-box units, so line weight
 * does not vary with (and so leak) the icon's size.
 */
const strokeUnits = (widthPx: number, size: number): number =>
	(widthPx * GLYPH_BOX) / size;

const glyphMarkup = (
	placement: IconPlacement,
	settings: IconOrderRenderSettings,
	rotationOverride?: number,
): string => {
	const scale = placement.size / GLYPH_BOX;
	const rotation = rotationOverride ?? placement.rotation;
	const inner = strokeUnits(settings.strokeWidth, placement.size);
	const halo = inner * HALO_WIDTH_MULTIPLE;
	const path = glyphPath(placement.kind);
	const transform = [
		`translate(${round(placement.x)} ${round(placement.y)})`,
		`rotate(${round(rotation)})`,
		`scale(${round(scale)})`,
		`translate(${-GLYPH_BOX / 2} ${-GLYPH_BOX / 2})`,
	].join(" ");
	return [
		`<g transform="${transform}" fill="none" stroke-linecap="round" stroke-linejoin="round">`,
		`<path d="${path}" stroke="${HALO_COLOUR}" stroke-opacity="${round(settings.haloOpacity)}" stroke-width="${round(halo)}"/>`,
		`<path d="${path}" stroke="${strokeColour(placement.hue)}" stroke-opacity="${round(settings.iconOpacity)}" stroke-width="${round(inner)}"/>`,
		"</g>",
	].join("");
};

const svgDocument = (width: number, height: number, body: string): Buffer =>
	Buffer.from(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`,
	);

/**
 * Draw order is shuffled here because callers hold targets and decoys as
 * separate lists, and concatenating them would paint every target on top
 * wherever icons overlap — a tell that needs no shape recognition.
 */
export const compositeIcons = async (
	prng: Prng,
	icons: readonly IconPlacement[],
	geometry: IconOrderGeometry,
	settings: IconOrderRenderSettings,
): Promise<RgbaImage> => {
	const body = shuffle(prng, icons)
		.map((placement) => glyphMarkup(placement, settings))
		.join("");
	// One document, so the icons antialias against the background they sit on.
	const document = svgDocument(
		geometry.width,
		geometry.height,
		collageMarkup(prng, geometry, settings.backgroundClutter) + body,
	);
	const { data, info } = await sharp(document)
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });

	return addGrain(prng, { data, width: info.width, height: info.height });
};

/**
 * Noise over the flat vector fills, so region boundaries are not perfectly
 * clean input for an edge detector.
 */
const GRAIN_AMPLITUDE = 6;

const addGrain = (prng: Prng, image: RgbaImage): RgbaImage => {
	const { data } = image;
	for (let i = 0; i < data.length; i += 4) {
		const noise = Math.round((prng.next() - 0.5) * 2 * GRAIN_AMPLITUDE);
		for (let channel = 0; channel < 3; channel++) {
			const value = (data[i + channel] ?? 0) + noise;
			data[i + channel] = value < 0 ? 0 : value > 255 ? 255 : value;
		}
	}
	return image;
};

/**
 * Legend glyphs are drawn upright whatever their rotation on the frame, so a
 * template-matching solver is not handed a rotation-aligned crib. The hue is
 * kept: it helps a human and a solver already has it from the pixels.
 */
export const renderLegend = async (
	targets: readonly IconPlacement[],
	legendIconSize: number,
	settings: IconOrderRenderSettings,
): Promise<RgbaImage> => {
	const step = legendIconSize + LEGEND_GAP;
	const width = Math.max(
		legendIconSize,
		targets.length * step - (targets.length > 0 ? LEGEND_GAP : 0),
	);
	const radius = legendIconSize / 2;
	const body = targets
		.map((target, index) => {
			const cx = index * step + radius;
			const chip = `<circle cx="${round(cx)}" cy="${round(radius)}" r="${round(radius)}" fill="${LEGEND_CHIP_COLOUR}"/>`;
			const glyph = glyphMarkup(
				{
					...target,
					x: cx,
					y: radius,
					size: legendIconSize * LEGEND_GLYPH_INSET,
				},
				settings,
				0,
			);
			return chip + glyph;
		})
		.join("");

	const { data, info } = await sharp(svgDocument(width, legendIconSize, body))
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });

	return { data, width: info.width, height: info.height };
};
