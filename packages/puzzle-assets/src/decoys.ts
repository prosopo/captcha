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

import { createNotchShape } from "./notch.js";
import { coverageFromDistance } from "./notch.js";
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
 * Composite a jigsaw-shaped decoration onto `background`, centred on
 * `(cx, cy)`. Mutates `background`. Runs the same signed-distance sampling
 * as the real cut, so the silhouette reads as the same family of shapes.
 */
export const paintDecoyPiece = (
	background: RgbaImage,
	prng: Prng,
	size: number,
	cx: number,
	cy: number,
	edgeDarkness: number,
	bodyBrightness: number,
): void => {
	const shape = createNotchShape(prng, size);
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

			// Dark rim just inside the silhouette, matching the direction of
			// the real cutout's inner shadow so decoys can't be visually
			// dismissed as "obviously raised". Ramps from zero at 3px inside
			// up to full amplitude at the edge.
			const edgeDark = d > -3 ? edgeDarkness * (1 + d / 3) : 0;
			const delta = bodyBrightness - edgeDark;

			background.data[bi] = clamp255(Math.round(r + delta * coverage));
			background.data[bi + 1] = clamp255(Math.round(g + delta * coverage));
			background.data[bi + 2] = clamp255(Math.round(b + delta * coverage));
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
 * hard-code the expected count. Decoys avoid only the real notch
 * placement (they may freely overlap each other). If a slot cannot be
 * placed after `PLACEMENT_ATTEMPTS`, it is silently dropped — decoys are
 * cosmetic, so an occasional miss is fine.
 */
export const paintDecoys = (
	background: RgbaImage,
	prng: Prng,
	targetCount: number,
	notchSize: number,
	notch: NotchPlacement,
	edgeDarkness: number,
	bodyBrightness: number,
): void => {
	if (targetCount <= 0) return;

	// Draw an actual count near the target. Round to int, clamp to >=0.
	const jitter = 1 + prng.range(-COUNT_JITTER, COUNT_JITTER);
	const count = Math.max(0, Math.round(targetCount * jitter));
	if (count === 0) return;

	const notchClearanceSq = (notchSize * NOTCH_CLEARANCE) ** 2;
	const half = notchSize / 2;
	// Keep the whole bounding box inside the frame so decoys never clip.
	const minX = half;
	const maxX = background.width - half;
	const minY = half;
	const maxY = background.height - half;
	if (maxX <= minX || maxY <= minY) return;

	for (let i = 0; i < count; i++) {
		for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS; attempt++) {
			const cx = prng.range(minX, maxX);
			const cy = prng.range(minY, maxY);
			if (
				distanceSquared(cx, cy, { cx: notch.targetX, cy: notch.targetY }) <
				notchClearanceSq
			) {
				continue;
			}
			paintDecoyPiece(
				background,
				prng,
				notchSize,
				cx,
				cy,
				edgeDarkness,
				bodyBrightness,
			);
			break;
		}
	}
};
