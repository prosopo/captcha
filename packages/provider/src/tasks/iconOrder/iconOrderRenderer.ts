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
	DEFAULT_RENDER_SETTINGS,
	DEFAULT_GEOMETRY as ICON_ORDER_GEOMETRY,
	type IconOrderRenderSettings,
	type IconPlacement,
	renderIconOrder,
} from "@prosopo/icon-order-assets";
import { toDataUri } from "@prosopo/puzzle-assets";
import {
	ICON_ORDER_GLYPH_VOCABULARY,
	type IIconOrderSettings,
	type StoredIconTarget,
} from "@prosopo/types";

export interface RenderedIconOrderImages {
	background: string;
	legend: string;
	legendIconSize: number;
	/** The answer. Persist it; never serialise it. */
	targets: IconPlacement[];
}

/**
 * Merge zero or more partial-override sources on top of the asset package
 * defaults. Later sources win, matching the tolerance-resolution order in
 * `getIconOrderCaptchaChallenge`: traffic-filter policy overrides the
 * client-record setting, which overrides the built-in default.
 */
export const resolveIconOrderRenderSettings = (
	...overrides: (IIconOrderSettings | undefined)[]
): IconOrderRenderSettings => {
	let resolved: IconOrderRenderSettings = { ...DEFAULT_RENDER_SETTINGS };
	for (const override of overrides) {
		if (!override) continue;
		if (override.targetCount !== undefined) {
			resolved = { ...resolved, targetCount: override.targetCount };
		}
		if (override.decoyCount !== undefined) {
			resolved = { ...resolved, decoyCount: override.decoyCount };
		}
		if (override.strokeWidth !== undefined) {
			resolved = { ...resolved, strokeWidth: override.strokeWidth };
		}
		if (override.iconOpacity !== undefined) {
			resolved = { ...resolved, iconOpacity: override.iconOpacity };
		}
		if (override.haloOpacity !== undefined) {
			resolved = { ...resolved, haloOpacity: override.haloOpacity };
		}
		if (override.backgroundClutter !== undefined) {
			resolved = {
				...resolved,
				backgroundClutter: override.backgroundClutter,
			};
		}
	}
	// Every icon on a frame needs a distinct glyph, so targets + decoys cannot
	// exceed the vocabulary. `IconOrderSettingsSchema` refuses an over-budget
	// pair, but only within ONE source: two individually valid overrides — a
	// site raising targetCount and a traffic-filter policy raising decoyCount
	// — can still add up past the limit once layered. Clamped here, the only
	// point the final pair is known, rather than failing the request.
	const budget = ICON_ORDER_GLYPH_VOCABULARY - resolved.targetCount;
	if (resolved.decoyCount > budget) {
		resolved = { ...resolved, decoyCount: Math.max(0, budget) };
	}
	return resolved;
};

/**
 * Whether this provider can render icon-order imagery right now.
 *
 * Checked where a captchaType is *chosen*, not where the challenge is served
 * — see `isPuzzleRenderAvailable` for the full rationale. Same answer for the
 * same reason: imagery is synthesised in-process, so there is no asset that
 * can be missing.
 */
export const isIconOrderRenderAvailable = (): boolean => true;

/**
 * Strip a placement down to what grading needs. Rotation and hue are pure
 * render inputs — keeping them out of the record means the stored answer says
 * only where the targets are and how big they are.
 */
export const toStoredTargets = (
	targets: readonly IconPlacement[],
): StoredIconTarget[] =>
	targets.map((target) => ({
		x: target.x,
		y: target.y,
		size: target.size,
		kind: target.kind,
	}));

export const renderIconOrderImages = async (
	settings: IconOrderRenderSettings = DEFAULT_RENDER_SETTINGS,
): Promise<RenderedIconOrderImages> => {
	// No pre-generated background buffer here, unlike the puzzle type. That
	// buffer exists because the puzzle's mesh gradient is per-pixel JS work
	// too slow for the request path; the icon-order collage is vector work
	// rasterised natively, so it is cheap enough to draw per request — which
	// also means every frame is unique without a buffer having to guarantee
	// consume-once.
	const rendered = await renderIconOrder(ICON_ORDER_GEOMETRY, settings);

	return {
		background: toDataUri(rendered.background),
		legend: toDataUri(rendered.legend),
		legendIconSize: rendered.legendIconSize,
		targets: rendered.targets,
	};
};
