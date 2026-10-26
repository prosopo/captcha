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

import { relativeLuminance } from "./contrast.js";
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

/**
 * Disturbance ring outside the cut, in px. The ring exists so an edge detector
 * cannot lock onto a clean gradient discontinuity along the seam. The noise
 * tapers linearly to zero at the outer edge so it fades into the ambient
 * background grain instead of terminating in a visible border.
 */
const SEAM_NOISE_RADIUS = 3;
/**
 * Peak amplitude at the seam itself, in 0-255 units. Kept close to the
 * background grain amplitude so the ring reads as continuation of the grain
 * rather than as a halo around the hole.
 */
const SEAM_NOISE = 4;

/**
 * Depth cue on the hole. HOLE_INNER_SHADOW is a fixed within-primitive
 * ratio, but HOLE_DARKEN is caller-provided so operators can tune how
 * obvious the target is versus the decoys.
 */
const HOLE_INNER_SHADOW = 0.45;

/**
 * Depth cue on the piece itself. A subtle brightness rise just inside the
 * silhouette edge, so the piece reads as raised rather than as a flat sticker.
 * Kept low deliberately — a stronger rim starts to look like a drawn border
 * against the darkened cutout it drops into.
 */
const PIECE_EDGE_LIGHT = 8;

/**
 * The piece's outline, measured inwards from the silhouette, as a fraction of
 * the piece's size.
 *
 * Full strength out to `PLATEAU`, then tapering to nothing by `WIDTH`. A rim that
 * tapers from the very first pixel has its strongest values exactly where
 * anti-aliasing makes the pixels partly transparent, so the part of it that is
 * fully opaque is only ever half strength — the cue measures far weaker than the
 * number configuring it suggests. The plateau puts the full step on pixels that
 * are actually opaque, and the taper then stops it ending in a hard line.
 *
 * PROPORTIONAL, NOT A FIXED PIXEL COUNT. A 4px band is a tidy outline on a
 * 120px piece and most of the surface area of a 44px one — the default
 * `notchSize` — which made the whole piece read as a pale blob rather than as a
 * piece with a lit edge. Caught by rendering it and looking; no measurement of
 * rim-versus-core contrast can see it, because by that measure a piece that is
 * entirely rim scores perfectly.
 */
const PIECE_RIM_PLATEAU_RATIO = 0.03;
const PIECE_RIM_WIDTH_RATIO = 0.065;
/** Floors, so the rim does not vanish on a very small piece. */
const PIECE_RIM_MIN_PLATEAU = 1;
const PIECE_RIM_MIN_WIDTH = 2.2;

/** Rim geometry for a piece of `size` px. Exported so tests measure the band the renderer actually drew. */
export const pieceRimGeometry = (
	size: number,
): { plateau: number; width: number } => {
	const plateau = Math.max(
		PIECE_RIM_MIN_PLATEAU,
		size * PIECE_RIM_PLATEAU_RATIO,
	);
	return {
		plateau,
		width: Math.max(
			PIECE_RIM_MIN_WIDTH,
			size * PIECE_RIM_WIDTH_RATIO,
			plateau + 1,
		),
	};
};

/**
 * The WCAG contrast ratio the rim aims to reach against the piece's own body.
 *
 * This is the separation cue, and it is deliberately not a hue. The piece is cut
 * from the same mesh the background is drawn from, so on an unlucky palette it
 * was the same colour as whatever it was resting on and the only thing dividing
 * them was a CSS drop-shadow. A luminance step survives what hue does not:
 * greyscale, a monochrome display, every dichromacy, and a phone screen in
 * sunlight.
 *
 * Expressed as a ratio rather than as a fixed byte offset because a fixed offset
 * is not a fixed cue: 40 units out of 255 is obvious on a mid grey and almost
 * invisible near white, where the same step is a much smaller fraction of the
 * luminance. The required offset is solved for per piece from the luminance it
 * actually has.
 *
 * 1.5 is comfortably visible without reading as a drawn border. The tests assert
 * a lower bound than this, because the taper and the per-pixel noise cost a
 * little of it.
 */
const PIECE_RIM_TARGET_CONTRAST = 1.5;

/**
 * Cap on the rim offset, in 0-255 units. Past roughly this the rim stops reading
 * as a lit or shaded edge and starts reading as a stroke drawn around a sticker,
 * which is the look this is trying to avoid.
 */
const PIECE_RIM_MAX_STEP = 72;

/**
 * Above this relative luminance the piece is treated as light, and gets a dark
 * rim rather than a light one.
 *
 * Picking the direction from the piece's own mean rather than fixing it is the
 * whole point: a fixed light rim vanishes on a pale background and a fixed dark
 * one vanishes on a dark background, which is how a cue that is present in the
 * code ends up absent on screen.
 */
const PIECE_RIM_DIRECTION_THRESHOLD = 0.4;

const clamp255 = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v);

/**
 * Sample the background at `(x, y)`. Returns `null` when the coordinate
 * sits outside the frame — the piece is clipped at the boundary rather
 * than filled from a clamped edge pixel, so a piece whose placement
 * overhangs the frame simply loses those pixels.
 */
const sampleBackground = (
	image: RgbaImage,
	x: number,
	y: number,
): [number, number, number] | null => {
	if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
		return null;
	}
	const i = (y * image.width + x) * 4;
	return [image.data[i] ?? 0, image.data[i + 1] ?? 0, image.data[i + 2] ?? 0];
};

/**
 * Rim strength in [0, 1] for a signed distance: 1 on the plateau, tapering to 0
 * at the full width inside the silhouette, 0 beyond it.
 */
const rimProfile = (d: number, plateau: number, width: number): number => {
	if (d <= -width) return 0;
	if (d >= -plateau) return 1;
	// Linear from the inner edge of the plateau out to the full width.
	return (d + width) / (width - plateau);
};

/** Approximate sRGB byte for a relative luminance. */
const byteForLuminance = (luminance: number): number =>
	255 * Math.max(0, Math.min(1, luminance)) ** (1 / 2.2);

/**
 * The signed offset, in 0-255 units, to apply at the piece's rim.
 *
 * Averages the luminance of the pixels the piece will be cut from, picks the
 * direction that steps *away* from it, then solves for the offset that reaches
 * [`PIECE_RIM_TARGET_CONTRAST`] against it. A dark piece gets a light rim and a
 * light piece a dark one, so the cue is present whatever the palette produced —
 * which neither a fixed direction nor a fixed magnitude can promise.
 */
const pieceRimDelta = (
	background: RgbaImage,
	shape: NotchShape,
	size: number,
	left: number,
	top: number,
): number => {
	let total = 0;
	let counted = 0;
	// Every fourth pixel on each axis. The answer is the mean brightness of a few
	// thousand pixels, so a sixteenth of them settles it, and this runs per
	// challenge on the request path.
	for (let ly = 0; ly < size; ly += 4) {
		for (let lx = 0; lx < size; lx += 4) {
			if (coverageFromDistance(shape.distance(lx, ly)) <= 0) continue;
			const sample = sampleBackground(background, left + lx, top + ly);
			if (sample === null) continue;
			total += relativeLuminance({ r: sample[0], g: sample[1], b: sample[2] });
			counted++;
		}
	}
	// No sampled pixels at all means the piece is entirely off-frame, which the
	// caller already handles by leaving it transparent. Either direction is fine.
	if (counted === 0) return PIECE_RIM_MAX_STEP;

	const pieceLuminance = total / counted;
	const lighten = pieceLuminance <= PIECE_RIM_DIRECTION_THRESHOLD;
	// WCAG: ratio = (lighter + 0.05) / (darker + 0.05). Solve for the other side.
	const target = lighten
		? PIECE_RIM_TARGET_CONTRAST * (pieceLuminance + 0.05) - 0.05
		: (pieceLuminance + 0.05) / PIECE_RIM_TARGET_CONTRAST - 0.05;
	const delta = byteForLuminance(target) - byteForLuminance(pieceLuminance);
	const capped = Math.max(
		-PIECE_RIM_MAX_STEP,
		Math.min(PIECE_RIM_MAX_STEP, delta),
	);
	// Never return a step so small it reads as no rim at all: a piece near the
	// direction threshold would otherwise get a few units and look flat.
	const floor = 24;
	if (Math.abs(capped) < floor) {
		return lighten ? floor : -floor;
	}
	return capped;
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
	holeDarken: number,
): CutResult => {
	const half = size / 2;
	const left = Math.round(placement.targetX - half);
	const top = Math.round(placement.targetY - half);

	const pieceData = Buffer.alloc(size * size * 4);
	const brightness = prng.range(
		PIECE_BRIGHTNESS_RANGE[0],
		PIECE_BRIGHTNESS_RANGE[1],
	);

	// How far and which way the rim steps. Decided from the mean luminance of the
	// pixels the piece is actually made of, before any of them are written, so the
	// step is away from the piece rather than in a fixed direction and magnitude
	// that might match it.
	const rimStep = pieceRimDelta(background, shape, size, left, top);
	const rim = pieceRimGeometry(size);

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

			const sample = sampleBackground(background, left + lx, top + ly);
			if (sample === null) {
				// Piece extends past the frame — leave this pixel transparent
				// so the overhang doesn't smear the edge colour outward.
				pieceData[pi + 3] = 0;
				continue;
			}
			const [r, g, b] = sample;

			// A bright rim just inside the edge makes the piece read as a
			// raised object rather than a flat sticker.
			const edgeLight = d > -2 ? PIECE_EDGE_LIGHT * (1 + d / 2) : 0;
			// The separation cue. Full strength at the silhouette, tapering to
			// nothing PIECE_RIM_WIDTH px inside, so it reads as a lit or shaded
			// edge on a solid object rather than as a stroke drawn around a
			// sticker. Applied equally to all three channels, which is what makes
			// it a luminance step and not a tint.
			const rimDelta = rimStep * rimProfile(d, rim.plateau, rim.width);
			const noise = (prng.next() - 0.5) * 2 * PIECE_NOISE;
			const delta = brightness + edgeLight + rimDelta + noise;

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
				const factor = holeDarken * (1 - edge);
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
				// Falloff: full amplitude at the seam, zero at the outer edge
				// of the ring, so the disturbance blends into ambient grain
				// instead of terminating in a visible halo.
				const falloff = 1 - d / SEAM_NOISE_RADIUS;
				const noise = (prng.next() - 0.5) * 2 * SEAM_NOISE * falloff;
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

	// Drop shadow is applied client-side via CSS `filter: drop-shadow` on the
	// piece element — see PuzzleCanvas.tsx. Baking one into the piece pixels
	// stacked with the CSS shadow read as a visible border once lossless WebP
	// stopped smudging the baked version away.

	return {
		background,
		piece: { data: pieceData, width: size, height: size },
	};
};
