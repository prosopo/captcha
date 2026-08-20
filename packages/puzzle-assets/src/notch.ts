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
 * staircase. The shape varies per challenge — a rounded square with a knob on a
 * random side, and sometimes a bite out of another — so the silhouette itself
 * is not a fixed template an attacker can match against.
 */
export interface NotchShape {
	/** Signed distance in px: negative inside the shape, positive outside. */
	distance(lx: number, ly: number): number;
}

type Side = 0 | 1 | 2 | 3;

const sideOffset = (
	side: Side,
	half: number,
	distance: number,
): [number, number] => {
	switch (side) {
		case 0:
			return [0, -half - distance];
		case 1:
			return [half + distance, 0];
		case 2:
			return [0, half + distance];
		default:
			return [-half - distance, 0];
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

const createJigsawShape = (prng: Prng, size: number): NotchShape => {
	// The body is inset so the knob can protrude without leaving the bounding
	// box — the caller places the box, not the body.
	const knobRadius = size * prng.range(0.15, 0.19);
	const bodyHalf = size / 2 - knobRadius * 0.9;
	const cornerRadius = bodyHalf * prng.range(0.28, 0.42);

	const knobSide = prng.int(0, 3) as Side;
	// Sits mostly outside the body edge, so it reads as a tab.
	const [knobX, knobY] = sideOffset(knobSide, bodyHalf, -knobRadius * 0.45);

	const hasBite = prng.next() < 0.55;
	const biteSide = ((knobSide + prng.int(1, 3)) % 4) as Side;
	const biteRadius = size * prng.range(0.13, 0.17);
	const [biteX, biteY] = sideOffset(biteSide, bodyHalf, -biteRadius * 0.55);

	return {
		distance(lx: number, ly: number): number {
			// Local coordinates, origin at the centre of the bounding box.
			const px = lx - size / 2;
			const py = ly - size / 2;

			const body = roundedBoxDistance(px, py, bodyHalf, cornerRadius);
			const knob = Math.hypot(px - knobX, py - knobY) - knobRadius;
			// Union of body and knob.
			let d = Math.min(body, knob);

			if (hasBite) {
				const bite = Math.hypot(px - biteX, py - biteY) - biteRadius;
				// Subtract the bite from the union.
				d = Math.max(d, -bite);
			}

			return d;
		},
	};
};

const createCircleShape = (prng: Prng, size: number): NotchShape => {
	const radius = (size / 2) * prng.range(0.85, 0.98);
	const cx = size / 2;
	const cy = size / 2;
	return {
		distance(lx: number, ly: number): number {
			return Math.hypot(lx - cx, ly - cy) - radius;
		},
	};
};

const createRoundedRectShape = (prng: Prng, size: number): NotchShape => {
	// One axis fills the box; the other is squashed by a random aspect ratio.
	// Randomising which axis gets squashed avoids a landscape-only bias.
	const aspect = prng.range(0.5, 1.0);
	const halfMax = (size / 2) * prng.range(0.82, 0.98);
	const [halfW, halfH] =
		prng.next() < 0.5
			? [halfMax, halfMax * aspect]
			: [halfMax * aspect, halfMax];
	const cornerRadius = Math.min(halfW, halfH) * prng.range(0.08, 0.5);
	const cx = size / 2;
	const cy = size / 2;
	return {
		distance(lx: number, ly: number): number {
			const px = lx - cx;
			const py = ly - cy;
			const qx = Math.abs(px) - halfW + cornerRadius;
			const qy = Math.abs(py) - halfH + cornerRadius;
			const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
			const inside = Math.min(Math.max(qx, qy), 0);
			return outside + inside - cornerRadius;
		},
	};
};

const createPolygonShape = (prng: Prng, size: number): NotchShape => {
	// Random regular polygon (triangle through octagon), rotated arbitrarily.
	// SDF is max-of-halfplanes: exact at the boundary and inside, slightly
	// approximate for far-outside points — fine for the 1-pixel anti-aliased
	// coverage band. Edge normals are precomputed so the per-pixel loop is a
	// tight sum-and-max over a handful of values.
	const n = prng.int(3, 8);
	const radius = (size / 2) * prng.range(0.85, 0.98);
	const inradius = radius * Math.cos(Math.PI / n);
	const rotation = prng.next() * Math.PI * 2;
	const normals: [number, number][] = [];
	for (let i = 0; i < n; i++) {
		// Start at the top and go around; edge i's outward normal points at
		// angle (2πi/n − π/2) from the +x axis, rotated by `rotation`.
		const angle = (2 * Math.PI * i) / n - Math.PI / 2 + rotation;
		normals.push([Math.cos(angle), Math.sin(angle)]);
	}
	const cx = size / 2;
	const cy = size / 2;
	return {
		distance(lx: number, ly: number): number {
			const px = lx - cx;
			const py = ly - cy;
			let maxD = Number.NEGATIVE_INFINITY;
			for (const [nx, ny] of normals) {
				const d = px * nx + py * ny - inradius;
				if (d > maxD) maxD = d;
			}
			return maxD;
		},
	};
};

const createFlowerShape = (prng: Prng, size: number): NotchShape => {
	// Sinusoidal boundary: r(θ) = rAvg + rAmp·cos(nθ + φ). Reads as a soft
	// flower / gear silhouette. Kept smooth (no sharp inner points) so the
	// coverage sampler doesn't misread narrow petals.
	const petals = prng.int(4, 8);
	const rAvg = (size / 2) * prng.range(0.72, 0.88);
	const rAmp = rAvg * prng.range(0.1, 0.22);
	const phase = prng.next() * Math.PI * 2;
	const cx = size / 2;
	const cy = size / 2;
	return {
		distance(lx: number, ly: number): number {
			const px = lx - cx;
			const py = ly - cy;
			const len = Math.hypot(px, py);
			const angle = Math.atan2(py, px);
			const r = rAvg + rAmp * Math.cos(petals * angle + phase);
			return len - r;
		},
	};
};

/**
 * Pick a random shape family per call. The real piece and its hole are cut
 * from the same call so they match; decoys each call independently so they
 * form a mixed field of silhouettes on the frame.
 */
export const createNotchShape = (prng: Prng, size: number): NotchShape => {
	const family = prng.int(0, 4);
	switch (family) {
		case 0:
			return createJigsawShape(prng, size);
		case 1:
			return createCircleShape(prng, size);
		case 2:
			return createRoundedRectShape(prng, size);
		case 3:
			return createPolygonShape(prng, size);
		default:
			return createFlowerShape(prng, size);
	}
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
