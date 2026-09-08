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

/**
 * Matches the widget's frame. Kept here so the generator and the provider
 * agree on geometry without the provider restating it — every coordinate the
 * provider persists and every click it grades is in these pixels.
 */
export const DEFAULT_GEOMETRY: IconOrderGeometry = {
	width: 300,
	height: 200,
	iconSize: 38,
};

/**
 * Defaults for the per-render tunables. Operators override these per-client
 * (`ClientSettingsSchema.iconOrder`) or per-traffic-category
 * (`TrafficCategoryPolicySchema.iconOrder`); the provider resolves an
 * effective value and passes it in.
 */
export const DEFAULT_RENDER_SETTINGS: IconOrderRenderSettings = {
	targetCount: 3,
	decoyCount: 4,
	strokeWidth: 3,
	iconOpacity: 0.92,
	// Raised alongside the collage background: a bright stroke needs a firmer
	// outline to stay findable once the frame behind it has edges of its own.
	haloOpacity: 0.7,
	backgroundClutter: 8,
};

/**
 * Edge length of one legend chip, in px. Fixed rather than configurable: the
 * widget lays the strip out against its own header, and a legend that changes
 * size per client would break that layout for no security gain.
 */
export const LEGEND_ICON_SIZE = 26;

/**
 * Draw a challenge frame — collage background plus icons — and encode it with
 * the ordered legend.
 *
 * The background is generated per call rather than drawn from a pre-rendered
 * buffer: it is vector work rasterised natively, so it is cheap enough to sit
 * on the request path, and generating it here keeps every frame unique. That
 * uniqueness is the point — serving the same background twice with two
 * different icon layouts would let an attacker diff the composites and read
 * both answers off the difference.
 *
 * The returned `targets` are the answer. They are for the provider to persist
 * and must never be serialised into a response — the widget gets `background`
 * and `legend` and nothing else.
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

/**
 * Alias kept for callers that read better naming the whole operation.
 */
export const createIconOrderChallenge = renderIconOrder;

/**
 * Grade a click sequence against the stored targets.
 *
 * Shared by the provider so the hit test lives next to the geometry that
 * produced it. `tolerance` is a multiple of each icon's own size, so a large
 * icon gets a proportionally larger hit radius — a fixed pixel radius would
 * make the small end of the size jitter unfairly hard to hit.
 *
 * Order is strict: click i must land on target i. A user who clicks the right
 * three icons in the wrong sequence has not solved it, which is the entire
 * point of the type.
 */
/**
 * The geometry grading needs. Structural rather than `IconPlacement` so the
 * provider can grade straight off its stored targets, which drop the
 * render-only fields (rotation, hue).
 */
export interface IconTargetGeometry {
	x: number;
	y: number;
	size: number;
}

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
