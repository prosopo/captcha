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

import {
	createPrng,
	createSeed,
	encodeBackground,
	encodePiece,
} from "@prosopo/puzzle-assets";
import { compositeIcons, renderLegend } from "./compose.js";
import { placeIcons } from "./place.js";
import type {
	IconOrderGeometry,
	IconOrderRenderSettings,
	RenderedIconOrder,
} from "./types.js";

export { GLYPH_KINDS, GlyphKind, glyphPath } from "./glyphs.js";
export { placeIcons } from "./place.js";
export type { IconLayout } from "./place.js";
export { compositeIcons, renderLegend } from "./compose.js";
export type {
	IconOrderGeometry,
	IconOrderRenderSettings,
	IconPlacement,
	RenderedIconOrder,
} from "./types.js";

/** Matches the widget's frame; stored targets and graded clicks use these pixels. */
export const DEFAULT_GEOMETRY: IconOrderGeometry = {
	width: 300,
	height: 200,
	iconSize: 38,
};

/** `targetCount` and `decoyCount` must match the defaults in @prosopo/types. */
export const DEFAULT_RENDER_SETTINGS: IconOrderRenderSettings = {
	targetCount: 3,
	decoyCount: 4,
	strokeWidth: 3,
	iconOpacity: 0.92,
	haloOpacity: 0.7,
	backgroundClutter: 8,
};

/** Fixed because the widget lays the legend out against its own header. */
export const LEGEND_ICON_SIZE = 26;

/**
 * The background is drawn fresh per call and never reused: two layouts on the
 * same background could be diffed to read both answers. The returned
 * `targets` are the answer and must never be serialised into a response.
 */
export const renderIconOrder = async (
	geometry: IconOrderGeometry = DEFAULT_GEOMETRY,
	settings: IconOrderRenderSettings = DEFAULT_RENDER_SETTINGS,
): Promise<RenderedIconOrder> => {
	const prng = createPrng(createSeed());
	const { targets, decoys } = placeIcons(
		prng,
		geometry,
		settings.targetCount,
		settings.decoyCount,
	);
	const composited = await compositeIcons(
		prng,
		[...targets, ...decoys],
		geometry,
		settings,
	);
	const legend = await renderLegend(targets, LEGEND_ICON_SIZE, settings);

	const [backgroundWebp, legendWebp] = await Promise.all([
		encodeBackground(composited),
		encodePiece(legend),
	]);

	return {
		background: backgroundWebp,
		legend: legendWebp,
		legendIconSize: LEGEND_ICON_SIZE,
		targets,
	};
};

/** Structural so stored targets, which drop rotation and hue, can be graded. */
export interface IconTargetGeometry {
	x: number;
	y: number;
	size: number;
}

/**
 * Click i must land on target i, within `tolerance` times that icon's size.
 */
export const gradeClicks = (
	targets: readonly IconTargetGeometry[],
	clicks: readonly { x: number; y: number }[],
	tolerance: number,
): boolean => {
	if (clicks.length !== targets.length) {
		return false;
	}
	return targets.every((target, index) => {
		const click = clicks[index];
		if (!click) {
			return false;
		}
		return (
			Math.hypot(click.x - target.x, click.y - target.y) <=
			tolerance * target.size
		);
	});
};
