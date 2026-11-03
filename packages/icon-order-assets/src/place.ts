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

import type { Prng } from "@prosopo/puzzle-assets";
import { GLYPH_KINDS, type GlyphKind } from "./glyphs.js";
import { shuffle } from "./shuffle.js";
import type { IconOrderGeometry, IconPlacement } from "./types.js";

/**
 * Minimum centre-to-centre distance, as a multiple of the larger icon's size,
 * so a click cannot land on two icons at once.
 */
const MIN_SEPARATION = 1.15;

/** Keep whole icons inside the frame; a clipped glyph is unidentifiable. */
const EDGE_MARGIN = 0.55;

const MAX_ATTEMPTS_PER_ICON = 60;

const SIZE_JITTER: readonly [number, number] = [0.85, 1.15];

export interface IconLayout {
	/** The icons the user must click, in the order the legend will show. */
	targets: IconPlacement[];
	/** Distractors: on the frame, absent from the legend. */
	decoys: IconPlacement[];
}

const farEnough = (
	x: number,
	y: number,
	size: number,
	placed: readonly IconPlacement[],
): boolean =>
	placed.every((other) => {
		const need = MIN_SEPARATION * Math.max(size, other.size);
		return Math.hypot(x - other.x, y - other.y) >= need;
	});

/**
 * The legend identifies a target by its shape, so every icon on the frame,
 * target or decoy, must be a distinct glyph; hence one deck for both.
 */
const drawKinds = (prng: Prng, count: number): GlyphKind[] => {
	if (count > GLYPH_KINDS.length) {
		throw new Error(
			`icon-order-assets: asked for ${count} distinct glyphs but only ${GLYPH_KINDS.length} exist`,
		);
	}
	return shuffle(prng, GLYPH_KINDS).slice(0, count);
};

const tryPlace = (
	prng: Prng,
	geometry: IconOrderGeometry,
	kind: GlyphKind,
	placed: readonly IconPlacement[],
): IconPlacement | undefined => {
	const size = geometry.iconSize * prng.range(SIZE_JITTER[0], SIZE_JITTER[1]);
	const margin = size * EDGE_MARGIN;
	for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_ICON; attempt++) {
		const x = prng.range(margin, geometry.width - margin);
		const y = prng.range(margin, geometry.height - margin);
		if (!farEnough(x, y, size, placed)) {
			continue;
		}
		return {
			x,
			y,
			kind,
			rotation: prng.range(0, 360),
			hue: prng.range(0, 360),
			size,
		};
	}
	return undefined;
};

/**
 * Targets are mandatory, since a frame missing one is unsolvable, so failing
 * to place one throws. Decoys are best-effort and are dropped when the frame
 * is too crowded.
 */
export const placeIcons = (
	prng: Prng,
	geometry: IconOrderGeometry,
	targetCount: number,
	decoyCount: number,
): IconLayout => {
	const kinds = drawKinds(prng, targetCount + decoyCount);
	const placed: IconPlacement[] = [];
	const targets: IconPlacement[] = [];
	const decoys: IconPlacement[] = [];

	kinds.forEach((kind, index) => {
		const placement = tryPlace(prng, geometry, kind, placed);
		const isTarget = index < targetCount;
		if (!placement) {
			if (isTarget) {
				throw new Error(
					`icon-order-assets: could not place target icon ${index + 1} of ${targetCount} in a ${geometry.width}x${geometry.height} frame at size ${geometry.iconSize}`,
				);
			}
			return;
		}
		placed.push(placement);
		(isTarget ? targets : decoys).push(placement);
	});

	return { targets, decoys };
};
