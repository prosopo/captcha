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

import type { Prng } from "./prng.js";

/**
 * The notch silhouette, as a signed distance field sampled per pixel.
 *
 * Distances (rather than a boolean mask) buy anti-aliased edges for free, which
 * is most of what makes the cut look like a deliberate shape instead of a
 * staircase.
 *
 * # Why these are all jigsaw pieces now
 *
 * The silhouette used to be one of five unrelated families — jigsaw, circle,
 * rounded rectangle, polygon, flower — so four pieces in five were not
 * jigsaw-shaped at all. Users told us they did not recognise what they were
 * being asked to do, which is a fair reaction to being handed a heptagon.
 *
 * Variety is still the point: a fixed outline is a template an attacker can
 * match against. The variety now lives *inside* the jigsaw grammar instead of
 * across unrelated shapes — each of the four edges independently gets a tab, a
 * blank, or nothing, and the knob's position along its edge, its radius and the
 * corner rounding all vary. That is 3^4 edge combinations before any of the
 * continuous parameters, against five families with a handful of parameters
 * each, so the silhouette space did not shrink. What changed is that every
 * sample in it reads as a piece of a jigsaw.
 */
export interface NotchShape {
	/** Signed distance in px: negative inside the shape, positive outside. */
	distance(lx: number, ly: number): number;
}

/** Which edge of the body: 0 top, 1 right, 2 bottom, 3 left. */
type Side = 0 | 1 | 2 | 3;

/**
 * What an edge does.
 *
 * `tab` protrudes, `blank` is cut in, `flat` is left alone. A real jigsaw piece
 * has a mix — an edge piece has flats, a middle piece has none — so all three
 * are kept.
 */
type EdgeKind = "flat" | "tab" | "blank";

/** Unit outward normal and unit along-edge direction for a side. */
const sideAxes = (
	side: Side,
): {
	normal: [number, number];
	along: [number, number];
} => {
	switch (side) {
		case 0:
			return { normal: [0, -1], along: [1, 0] };
		case 1:
			return { normal: [1, 0], along: [0, 1] };
		case 2:
			return { normal: [0, 1], along: [-1, 0] };
		default:
			return { normal: [-1, 0], along: [0, -1] };
	}
};

const roundedBoxDistance = (
	px: number,
	py: number,
	half: number,
	radius: number,
): number => {
	const qx = Math.abs(px) - half + radius;
	const qy = Math.abs(py) - half + radius;
	const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
	const inside = Math.min(Math.max(qx, qy), 0);
	return outside + inside - radius;
};

/** One knob: a disc centred near an edge, either added to or cut from the body. */
interface Knob {
	kind: Exclude<EdgeKind, "flat">;
	cx: number;
	cy: number;
	radius: number;
}

/**
 * How many of the four edges carry a knob, and which.
 *
 * At least two, so the outline cannot come out as a plain rounded square and
 * fail to read as a jigsaw piece at all. At most three: four knobs on a small
 * square starts to read as a cross or a flower, which is the problem being
 * fixed rather than a jigsaw piece.
 *
 * At least one of them is a tab. A piece with only blanks is a square with bites
 * taken out of it — recognisable as damaged, not as interlocking.
 */
const chooseEdges = (prng: Prng): EdgeKind[] => {
	const count = prng.int(2, 3);
	const sides: Side[] = [0, 1, 2, 3];
	// Fisher-Yates, so the chosen edges are not biased towards low indices.
	for (let i = sides.length - 1; i > 0; i--) {
		const j = prng.int(0, i);
		const a = sides[i];
		const b = sides[j];
		if (a === undefined || b === undefined) continue;
		sides[i] = b;
		sides[j] = a;
	}

	const edges: EdgeKind[] = ["flat", "flat", "flat", "flat"];
	const chosen = sides.slice(0, count);
	for (const side of chosen) {
		edges[side] = prng.next() < 0.55 ? "tab" : "blank";
	}
	// Guarantee a tab. Overwriting the first chosen edge keeps the count.
	if (!chosen.some((side) => edges[side] === "tab")) {
		const first = chosen[0];
		if (first !== undefined) {
			edges[first] = "tab";
		}
	}
	return edges;
};

/**
 * Margin left between the silhouette and the edge of its bounding box, in px.
 *
 * One pixel for the anti-aliasing band plus a little slack. The box is the
 * piece's own image and the caller's placement maths assumes the shape is inside
 * it: a tab reaching the border comes out clipped flat, which looks like a
 * manufacturing defect rather than a jigsaw tab.
 */
const BOX_MARGIN = 1.5;

/**
 * Build one jigsaw piece.
 *
 * The body is a rounded square; each chosen edge gets a tab or a blank, and the
 * whole silhouette is scaled down at the end if a tab would otherwise reach past
 * the bounding box the caller places.
 */
export const createNotchShape = (prng: Prng, size: number): NotchShape => {
	const knobRadius = size * prng.range(0.13, 0.17);
	// Nominal inset. Not load-bearing for fit — the scale-to-fit below is — but
	// it keeps the body a sensible size relative to the knobs before scaling.
	const nominalHalf = size / 2 - knobRadius * 1.05;
	const edges = chooseEdges(prng);
	const knobs: Knob[] = [];
	let cornerRadius = nominalHalf * prng.range(0.14, 0.3);
	let bodyHalf = nominalHalf;

	for (let side = 0 as Side; side < 4; side = (side + 1) as Side) {
		const kind = edges[side];
		if (kind === undefined || kind === "flat") {
			continue;
		}
		const { normal, along } = sideAxes(side);
		// Per-knob radius, so a piece's knobs are not all identical.
		const radius = knobRadius * prng.range(0.88, 1.12);
		// How far the disc centre sits beyond the body edge. A tab centred
		// outside the edge reads as sticking out; a blank centred just inside
		// reads as a socket. Both keep part of the disc overlapping the body, or
		// a tab would float free and a blank would not break the outline.
		const offset = kind === "tab" ? radius * 0.52 : -radius * 0.42;
		// Slide along the edge. Bounded so the disc stays clear of the corners,
		// where it would merge with the rounding and read as a lumpy corner
		// rather than as a knob.
		const slideLimit = Math.max(0, bodyHalf - radius - cornerRadius * 0.6);
		const slide = prng.range(-slideLimit, slideLimit) * 0.6;

		knobs.push({
			kind,
			cx: normal[0] * (bodyHalf + offset) + along[0] * slide,
			cy: normal[1] * (bodyHalf + offset) + along[1] * slide,
			radius,
		});
	}

	// Scale the whole silhouette to fit, rather than insetting the body by the
	// worst case the parameters could produce. Insetting for the worst case
	// shrinks every piece to accommodate the largest tab that was never drawn;
	// measuring what was actually drawn and scaling only when it overflows keeps
	// the body as large as it can be. A tab's reach is its centre plus its radius
	// along the axis it protrudes on.
	let maxExtent = bodyHalf;
	for (const knob of knobs) {
		if (knob.kind !== "tab") continue;
		maxExtent = Math.max(
			maxExtent,
			Math.abs(knob.cx) + knob.radius,
			Math.abs(knob.cy) + knob.radius,
		);
	}
	const limit = size / 2 - BOX_MARGIN;
	if (maxExtent > limit) {
		const scale = limit / maxExtent;
		bodyHalf *= scale;
		cornerRadius *= scale;
		for (const knob of knobs) {
			knob.cx *= scale;
			knob.cy *= scale;
			knob.radius *= scale;
		}
	}

	return {
		distance(lx: number, ly: number): number {
			// Local coordinates, origin at the centre of the bounding box.
			const px = lx - size / 2;
			const py = ly - size / 2;

			let d = roundedBoxDistance(px, py, bodyHalf, cornerRadius);

			// Tabs first: a blank cut after a tab can bite into it, which is what
			// a real interlocking edge looks like. The reverse order would let a
			// tab fill a socket back in.
			for (const knob of knobs) {
				if (knob.kind === "tab") {
					d = Math.min(d, Math.hypot(px - knob.cx, py - knob.cy) - knob.radius);
				}
			}
			for (const knob of knobs) {
				if (knob.kind === "blank") {
					d = Math.max(
						d,
						-(Math.hypot(px - knob.cx, py - knob.cy) - knob.radius),
					);
				}
			}

			return d;
		},
	};
};

/**
 * Anti-aliased coverage in [0, 1] for a signed distance, using a one-pixel
 * transition band centred on the boundary.
 */
export const coverageFromDistance = (distance: number): number => {
	const t = 0.5 - distance;
	if (t <= 0) return 0;
	if (t >= 1) return 1;
	// smoothstep, so the edge ramp is not linear and reads softer.
	return t * t * (3 - 2 * t);
};
