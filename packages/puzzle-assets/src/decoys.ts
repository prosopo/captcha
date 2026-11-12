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
	type NotchShape,
	coverageFromDistance,
	createNotchShape,
} from "./notch.js";
import { type RecessStyle, recessShadow, towardsGrey } from "./presentation.js";
import type { Prng } from "./prng.js";
import type { NotchPlacement, RgbaImage } from "./types.js";

/**
 * Decoys are rendered as shallow indented jigsaw silhouettes: a darker
 * edge with a barely-lifted interior. Edge shading direction (darker at
 * the rim) mirrors the real cutout's inner shadow, so at a glance decoys
 * read as similar shapes and it's not immediately obvious which one is
 * the real target. Edge/body amplitudes come from PuzzleRenderSettings
 * so operators can tune the confusion level per-client from the portal.
 *
 * No drop shadow — a shadow ring picked up WebP artefacts and read as a
 * visible halo around each decoy.
 */

/**
 * Minimum centre-to-centre distance from the real notch, in notch-sizes.
 * Zero: decoys may sit right up to (and over) the target region. The cut
 * itself runs after decoy paint, so the darkened hole still wins visually.
 */
const NOTCH_CLEARANCE = 0;

/** Placement retries per decoy before giving up on that slot. */
const PLACEMENT_ATTEMPTS = 8;

/**
 * How renderer 2+ lays out its decoys.
 *
 * `lookalikes` decoys copy the real outline; every other decoy draws its own.
 * With none, the piece's outline matches only the real hole, which a human
 * spots at once and so does a solver. Copies send both back to darkness
 * among several candidates while the odd shapes are discarded at a glance,
 * which is why the count comes from the difficulty level.
 *
 * The copies keep `clearance` (centre to centre, in notch-sizes) from the real
 * hole and from each other, since piled-up copies read as a cut deeper than
 * the real one. The other decoys may overlap freely, only keeping off the real
 * hole. `attempts` keeps a crowded board from dropping most of its decoys.
 */
export interface DecoyLayout {
	lookalikes: number;
	clearance: number;
	attempts: number;
}

export const DECOY_CLEARANCE = 1;
export const DECOY_PLACEMENT_ATTEMPTS = 32;

const clamp255 = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v);

const distanceSquared = (
	cx: number,
	cy: number,
	other: { cx: number; cy: number },
): number => {
	const dx = cx - other.cx;
	const dy = cy - other.cy;
	return dx * dx + dy * dy;
};

/**
 * Depth cue on decoys, mirroring `HOLE_INNER_SHADOW` in `compose.ts`.
 * Smaller so decoys read as shallower cuts than the real hole.
 */
const DECOY_INNER_SHADOW = 0.35;

/**
 * Composite a jigsaw-shaped decoration onto `background`, centred on
 * `(cx, cy)`. Mutates `background`. Runs the same signed-distance sampling
 * as the real cut, so the silhouette reads as the same family of shapes.
 */
export const paintDecoyPiece = ({
	background,
	shape,
	size,
	cx,
	cy,
	edgeDarkness,
	bodyBrightness,
	holeDarken,
	style,
}: {
	background: RgbaImage;
	shape: NotchShape;
	size: number;
	cx: number;
	cy: number;
	edgeDarkness: number;
	bodyBrightness: number;
	holeDarken: number;
	style?: RecessStyle;
}): void => {
	const half = size / 2;
	const left = Math.round(cx - half);
	const top = Math.round(cy - half);

	// Body only. No drop shadow — the shadow ring read as a halo around each
	// decoy and picked up WebP artefacts on the background.
	for (let ly = 0; ly < size; ly++) {
		for (let lx = 0; lx < size; lx++) {
			const x = left + lx;
			const y = top + ly;
			if (x < 0 || y < 0 || x >= background.width || y >= background.height) {
				continue;
			}
			const d = shape.distance(lx, ly);
			const coverage = coverageFromDistance(d);
			if (coverage <= 0) continue;

			const bi = (y * background.width + x) * 4;
			const r = background.data[bi] ?? 0;
			const g = background.data[bi + 1] ?? 0;
			const b = background.data[bi + 2] ?? 0;

			// Multiplicative darken with an inner shadow, matching the real
			// cut's structure. Without this, decoys were just faint edge
			// tints and the real hole stood out as the only deep region on
			// the frame — trivially findable by eye or by luminance.
			const edge = style
				? recessShadow(d, lx, ly, size, DECOY_INNER_SHADOW, style)
				: d > -3
					? DECOY_INNER_SHADOW * (1 + d / 3)
					: 0;
			const factor = holeDarken * (1 - edge);
			const [sr, sg, sb] = style
				? towardsGrey(r, g, b, style.desaturate)
				: [r, g, b];
			const dr = sr * factor;
			const dg = sg * factor;
			const db = sb * factor;

			// Existing additive tweak stays on top, so operators keep the
			// same rim / body knobs — they now fine-tune the multiplicative
			// base rather than being the sole depth cue.
			const edgeDark = d > -3 ? edgeDarkness * (1 + d / 3) : 0;
			const delta = bodyBrightness - edgeDark;

			const mixR = r * (1 - coverage) + dr * coverage;
			const mixG = g * (1 - coverage) + dg * coverage;
			const mixB = b * (1 - coverage) + db * coverage;

			background.data[bi] = clamp255(Math.round(mixR + delta * coverage));
			background.data[bi + 1] = clamp255(Math.round(mixG + delta * coverage));
			background.data[bi + 2] = clamp255(Math.round(mixB + delta * coverage));
		}
	}
};

/**
 * Fractional jitter around the configured decoy count. ±30% means a
 * configured 5 draws anywhere in [4, 6]; a configured 100 draws in [70,
 * 130]. Randomising the count prevents a solver from keying on "exactly N
 * jigsaw regions on the board" as a stable feature.
 */
const COUNT_JITTER = 0.3;

/**
 * Paint decoys onto `background`. The actual number placed varies per-
 * challenge within ±COUNT_JITTER of `targetCount`, so a solver can't
 * hard-code the expected count. Without a `layout`, decoys avoid only the real
 * notch placement and may freely overlap each other, and every decoy takes
 * `shape` when one is given or otherwise draws its own. If a slot cannot be
 * placed after the allowed attempts, it is silently dropped — decoys are
 * cosmetic, so an occasional miss is fine.
 */
export const paintDecoys = ({
	background,
	prng,
	targetCount,
	shape,
	notchSize,
	notch,
	edgeDarkness,
	bodyBrightness,
	holeDarken,
	style,
	layout,
}: {
	background: RgbaImage;
	prng: Prng;
	targetCount: number;
	shape?: NotchShape;
	notchSize: number;
	notch: NotchPlacement;
	edgeDarkness: number;
	bodyBrightness: number;
	holeDarken: number;
	style?: RecessStyle;
	layout?: DecoyLayout;
}): void => {
	if (targetCount <= 0) return;

	// Draw an actual count near the target. Round to int, clamp to >=0.
	const jitter = 1 + prng.range(-COUNT_JITTER, COUNT_JITTER);
	const count = Math.max(0, Math.round(targetCount * jitter));
	if (count === 0) return;

	const paint = (decoyShape: NotchShape, cx: number, cy: number): void =>
		paintDecoyPiece({
			background,
			shape: decoyShape,
			size: notchSize,
			cx,
			cy,
			edgeDarkness,
			bodyBrightness,
			holeDarken,
			style,
		});

	// Centre may sit anywhere on the frame; a decoy that overhangs the edge
	// is clipped by `paintDecoyPiece`, matching the real piece's overhang
	// behaviour. Without this, large pieces would render zero decoys because
	// `notchSize/2` exceeds the frame dimensions.
	const place = ({
		attempts,
		clearOf,
		clearanceSq,
	}: {
		attempts: number;
		clearOf: { cx: number; cy: number }[];
		clearanceSq: number;
	}): { cx: number; cy: number } | undefined => {
		for (let attempt = 0; attempt < attempts; attempt++) {
			const cx = prng.range(0, background.width);
			const cy = prng.range(0, background.height);
			if (
				!clearOf.some((other) => distanceSquared(cx, cy, other) < clearanceSq)
			) {
				return { cx, cy };
			}
		}
		return undefined;
	};

	const target = { cx: notch.targetX, cy: notch.targetY };

	if (!layout || !shape) {
		const notchClearanceSq = (notchSize * NOTCH_CLEARANCE) ** 2;
		for (let i = 0; i < count; i++) {
			const at = place({
				attempts: PLACEMENT_ATTEMPTS,
				clearOf: [target],
				clearanceSq: notchClearanceSq,
			});
			if (at) paint(shape ?? createNotchShape(prng, notchSize), at.cx, at.cy);
		}
		return;
	}

	const clearanceSq = (notchSize * layout.clearance) ** 2;
	const lookalikes = Math.min(count, layout.lookalikes);
	// Look-alikes go on last so the outlines a human compares stay intact
	// where the freely placed decoys overlap them.
	for (let i = lookalikes; i < count; i++) {
		const at = place({
			attempts: layout.attempts,
			clearOf: [target],
			clearanceSq,
		});
		if (at) paint(createNotchShape(prng, notchSize), at.cx, at.cy);
	}
	const spaced = [target];
	for (let i = 0; i < lookalikes; i++) {
		const at = place({
			attempts: layout.attempts,
			clearOf: spaced,
			clearanceSq,
		});
		if (!at) continue;
		spaced.push(at);
		paint(shape, at.cx, at.cy);
	}
};
