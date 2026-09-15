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
import type {
	IconOrderGeometry,
	IconOrderRenderSettings,
	IconPlacement,
} from "./types.js";

/** Glyph path data is authored in this box; see glyphs.ts. */
const GLYPH_BOX = 100;

/**
 * The halo is drawn as a wider stroke of the same path underneath the bright
 * one, so it reads as an outline rather than a shadow. Much narrower than
 * this and a bright icon disappears where it crosses a light background
 * region; much wider and the halo itself becomes the strongest edge in the
 * frame, which is exactly the signal we are trying not to hand a solver.
 */
const HALO_WIDTH_MULTIPLE = 2.4;

const HALO_COLOUR = "rgb(12,14,22)";

/** Legend chips are flat dark discs, so the glyph reads at small size. */
const LEGEND_CHIP_COLOUR = "rgb(24,27,38)";
const LEGEND_GAP = 6;
const LEGEND_GLYPH_INSET = 0.62;

const round = (value: number): number => Math.round(value * 100) / 100;

const strokeColour = (hue: number): string => {
	const { r, g, b } = hslToRgb(hue, 0.86, 0.64);
	return `rgb(${r},${g},${b})`;
};

/**
 * Stroke widths are specified in final frame pixels, but the path lives in a
 * 100-unit box that gets scaled to `size`. Undo the scale so a 3px stroke is
 * 3px whether the icon landed large or small — otherwise the icon's size
 * would leak into its line weight and give a solver a free extra feature.
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
 * Stamp every icon onto the background.
 *
 * Draw order is randomised here rather than left to the caller, because it
 * carries information: callers naturally hold targets and decoys as separate
 * lists, and concatenating them paints every target on top at each overlap.
 * That z-order is a tell a solver can read without ever recognising a shape,
 * so the shuffle is part of the contract of compositing, not of assembling.
 */
export const compositeIcons = async (
	prng: Prng,
	icons: readonly IconPlacement[],
	geometry: IconOrderGeometry,
	settings: IconOrderRenderSettings,
): Promise<RgbaImage> => {
	const order = [...icons];
	for (let i = order.length - 1; i > 0; i--) {
		const j = prng.int(0, i);
		const a = order[i];
		const b = order[j];
		if (a === undefined || b === undefined) {
			throw new Error("icon-order-assets: icon list underflow");
		}
		order[i] = b;
		order[j] = a;
	}
	const body = order
		.map((placement) => glyphMarkup(placement, settings))
		.join("");
	// Collage and icons go into one SVG document, so librsvg rasterises the
	// whole frame in a single pass and the icons antialias against the
	// background they actually sit on rather than against a separate layer.
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
 * Per-pixel noise, applied after rasterisation.
 *
 * The collage is built from flat vector fills, so without this every region is
 * uniform and its boundaries are perfectly clean — ideal input for an edge
 * detector. Grain raises the noise floor those edges have to clear. Kept low
 * enough to read as texture rather than static.
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
 * Render the ordered legend — the strip that tells the user which icons to
 * click and in what order.
 *
 * Legend glyphs are drawn upright regardless of how the same icon landed on
 * the frame. The user matches on outline, which survives rotation; a
 * template-matching solver does not get a rotation-aligned crib of the target
 * handed to it. The hue is kept, because colour is a matching cue a human
 * uses and a solver already has from the pixels either way.
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
