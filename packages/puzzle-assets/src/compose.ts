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

import { type NotchShape, coverageFromDistance } from "./notch.js";
import type { Prng } from "./prng.js";
import type { NotchPlacement, RgbaImage } from "./types.js";

/**
 * Per-pixel noise added to the piece, in 0-255 units.
 *
 * This is not decoration. The piece is cut from the background, so a
 * pixel-exact copy would let an attacker slide the piece over the background
 * with normalised cross-correlation and land on the target in one pass —
 * which would make the whole server-rendering exercise worthless. The piece is
 * therefore brightness-shifted and re-noised so it correlates well with a
 * region of the background but never perfectly, and the background gets fresh
 * noise around the cut so the seam is not a clean template either.
 */
const PIECE_NOISE = 7;
const PIECE_BRIGHTNESS_RANGE: [number, number] = [-8, 8];

/** How far past the cut edge the disturbance ring extends, in px. */
const SEAM_NOISE_RADIUS = 3;
const SEAM_NOISE = 6;

/** Depth cues on the hole left behind. */
const HOLE_DARKEN = 0.55;
const HOLE_INNER_SHADOW = 0.45;

/** Depth cues on the piece itself. */
const PIECE_EDGE_LIGHT = 16;
const PIECE_SHADOW_ALPHA = 0.32;
const PIECE_SHADOW_OFFSET = 1.5;

const clamp255 = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v);

const sampleClamped = (
	image: RgbaImage,
	x: number,
	y: number,
): [number, number, number] => {
	const cx = x < 0 ? 0 : x >= image.width ? image.width - 1 : x;
	const cy = y < 0 ? 0 : y >= image.height ? image.height - 1 : y;
	const i = (cy * image.width + cx) * 4;
	return [image.data[i] ?? 0, image.data[i + 1] ?? 0, image.data[i + 2] ?? 0];
};

export interface CutResult {
	/** The background, mutated in place, with the hole cut into it. */
	background: RgbaImage;
	/** The draggable piece, on transparency. */
	piece: RgbaImage;
}

/**
 * Cut the notch out of `background` and produce the matching piece.
 *
 * `background` is mutated in place — it is a freshly generated, single-use
 * image, so there is nothing to preserve.
 */
export const cutNotch = (
	prng: Prng,
	background: RgbaImage,
	shape: NotchShape,
	size: number,
	placement: NotchPlacement,
): CutResult => {
	const half = size / 2;
	const left = Math.round(placement.targetX - half);
	const top = Math.round(placement.targetY - half);

	const pieceData = Buffer.alloc(size * size * 4);
	const brightness = prng.range(
		PIECE_BRIGHTNESS_RANGE[0],
		PIECE_BRIGHTNESS_RANGE[1],
	);

	// Pass 1: build the piece from the pixels about to be removed.
	for (let ly = 0; ly < size; ly++) {
		for (let lx = 0; lx < size; lx++) {
			const d = shape.distance(lx, ly);
			const coverage = coverageFromDistance(d);
			const pi = (ly * size + lx) * 4;

			if (coverage <= 0) {
				pieceData[pi + 3] = 0;
				continue;
			}

			const [r, g, b] = sampleClamped(background, left + lx, top + ly);

			// A bright rim just inside the edge makes the piece read as a
			// raised object rather than a flat sticker.
			const edgeLight = d > -2 ? PIECE_EDGE_LIGHT * (1 + d / 2) : 0;
			const noise = (prng.next() - 0.5) * 2 * PIECE_NOISE;
			const delta = brightness + edgeLight + noise;

			pieceData[pi] = clamp255(Math.round(r + delta));
			pieceData[pi + 1] = clamp255(Math.round(g + delta));
			pieceData[pi + 2] = clamp255(Math.round(b + delta));
			pieceData[pi + 3] = Math.round(coverage * 255);
		}
	}

	// Pass 2: cut the hole, with an inner shadow for depth, and disturb a ring
	// of pixels around the seam.
	for (let ly = -SEAM_NOISE_RADIUS; ly < size + SEAM_NOISE_RADIUS; ly++) {
		for (let lx = -SEAM_NOISE_RADIUS; lx < size + SEAM_NOISE_RADIUS; lx++) {
			const x = left + lx;
			const y = top + ly;
			if (x < 0 || y < 0 || x >= background.width || y >= background.height) {
				continue;
			}
			const bi = (y * background.width + x) * 4;
			const d = shape.distance(lx, ly);
			const coverage = coverageFromDistance(d);

			if (coverage > 0) {
				const r = background.data[bi] ?? 0;
				const g = background.data[bi + 1] ?? 0;
				const b = background.data[bi + 2] ?? 0;

				// Darken towards the hole, deeper near the edges so the cut has
				// an inner shadow rather than reading as a flat grey patch.
				const edge = d > -3 ? HOLE_INNER_SHADOW * (1 + d / 3) : 0;
				const factor = HOLE_DARKEN * (1 - edge);
				const mix = coverage;

				background.data[bi] = clamp255(
					Math.round(r * (1 - mix) + r * factor * mix),
				);
				background.data[bi + 1] = clamp255(
					Math.round(g * (1 - mix) + g * factor * mix),
				);
				background.data[bi + 2] = clamp255(
					Math.round(b * (1 - mix) + b * factor * mix),
				);
			} else if (d < SEAM_NOISE_RADIUS) {
				// Just outside the cut: re-noise so the seam is not a clean
				// gradient discontinuity for an edge detector to lock onto.
				const noise = (prng.next() - 0.5) * 2 * SEAM_NOISE;
				background.data[bi] = clamp255(
					Math.round((background.data[bi] ?? 0) + noise),
				);
				background.data[bi + 1] = clamp255(
					Math.round((background.data[bi + 1] ?? 0) + noise),
				);
				background.data[bi + 2] = clamp255(
					Math.round((background.data[bi + 2] ?? 0) + noise),
				);
			}
		}
	}

	applyPieceShadow({ data: pieceData, width: size, height: size }, shape, size);

	return {
		background,
		piece: { data: pieceData, width: size, height: size },
	};
};

/**
 * Soft drop shadow in the piece's transparent margin. Purely cosmetic: it lifts
 * the piece off the background while it is being dragged.
 */
const applyPieceShadow = (
	piece: RgbaImage,
	shape: NotchShape,
	size: number,
): void => {
	for (let ly = 0; ly < size; ly++) {
		for (let lx = 0; lx < size; lx++) {
			const pi = (ly * size + lx) * 4;
			if ((piece.data[pi + 3] ?? 0) > 0) continue;

			const d = shape.distance(
				lx - PIECE_SHADOW_OFFSET,
				ly - PIECE_SHADOW_OFFSET,
			);
			if (d <= 0 || d > 2.5) continue;

			const alpha = PIECE_SHADOW_ALPHA * (1 - d / 2.5);
			piece.data[pi] = 0;
			piece.data[pi + 1] = 0;
			piece.data[pi + 2] = 0;
			piece.data[pi + 3] = Math.round(alpha * 255);
		}
	}
};
