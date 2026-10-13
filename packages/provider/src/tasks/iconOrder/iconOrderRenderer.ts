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

/** Layers partial overrides onto the asset defaults; later sources win. */
export const resolveIconOrderRenderSettings = (
	...overrides: (IIconOrderSettings | undefined)[]
): IconOrderRenderSettings => {
	let resolved: IconOrderRenderSettings = { ...DEFAULT_RENDER_SETTINGS };
	for (const override of overrides) {
		resolved = {
			targetCount: override?.targetCount ?? resolved.targetCount,
			decoyCount: override?.decoyCount ?? resolved.decoyCount,
			strokeWidth: override?.strokeWidth ?? resolved.strokeWidth,
			iconOpacity: override?.iconOpacity ?? resolved.iconOpacity,
			haloOpacity: override?.haloOpacity ?? resolved.haloOpacity,
			backgroundClutter:
				override?.backgroundClutter ?? resolved.backgroundClutter,
		};
	}
	// The schema caps targets + decoys within one source, but two valid
	// sources can still add up past the glyph vocabulary once layered.
	const decoyBudget = ICON_ORDER_GLYPH_VOCABULARY - resolved.targetCount;
	if (resolved.decoyCount > decoyBudget) {
		resolved = { ...resolved, decoyCount: Math.max(0, decoyBudget) };
	}
	return resolved;
};

/** Drops the render-only fields (rotation, hue); grading needs none of them. */
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
	const rendered = await renderIconOrder(ICON_ORDER_GEOMETRY, settings);

	return {
		background: toDataUri(rendered.background),
		legend: toDataUri(rendered.legend),
		legendIconSize: rendered.legendIconSize,
		targets: rendered.targets,
	};
};
