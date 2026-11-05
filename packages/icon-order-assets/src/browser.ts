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

// Browser-safe surface: the provider's drawing pipeline up to the SVG it
// rasterises with sharp. The caller rasterises the markup itself, onto a
// <canvas>, and then lays the same grain over it.

import { type RgbaImage, createPrng } from "@prosopo/puzzle-assets/browser";
import {
	LEGEND_ICON_SIZE,
	addGrain,
	frameMarkup,
	legendMarkup,
} from "./markup.js";
import { placeIcons } from "./place.js";
import type {
	IconOrderGeometry,
	IconOrderRenderSettings,
	IconPlacement,
} from "./types.js";

export { GLYPH_KINDS, GlyphKind, glyphPath } from "./glyphs.js";
export { LEGEND_ICON_SIZE } from "./markup.js";
export type {
	IconOrderGeometry,
	IconOrderRenderSettings,
	IconPlacement,
} from "./types.js";

export interface RedrawnIconOrder {
	/** The frame, every icon included, as the SVG the provider rasterised. */
	frame: string;
	/** The target strip, in click order. */
	legend: string;
	legendIconSize: number;
	targets: IconPlacement[];
	/** Adds the frame's grain, in place, once `frame` has been rasterised. */
	addGrain: (frame: RgbaImage) => RgbaImage;
}

/**
 * Rebuilds what the provider drew for `seed`. A browser rasterises SVG a
 * little differently from sharp, so the result matches the served image
 * closely rather than pixel for pixel.
 */
export const redrawIconOrder = (
	seed: string,
	geometry: IconOrderGeometry,
	settings: IconOrderRenderSettings,
): RedrawnIconOrder => {
	const prng = createPrng(Buffer.from(seed, "hex"));
	const { targets, decoys } = placeIcons(
		prng,
		geometry,
		settings.targetCount,
		settings.decoyCount,
	);
	const frame = frameMarkup(prng, [...targets, ...decoys], geometry, settings);
	return {
		frame,
		legend: legendMarkup(targets, LEGEND_ICON_SIZE, settings),
		legendIconSize: LEGEND_ICON_SIZE,
		targets,
		addGrain: (image) => addGrain(prng, image),
	};
};
