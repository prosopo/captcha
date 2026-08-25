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

/**
 * Procedural symbol silhouettes, drawn in a 100x100 user-space box centred on
 * (50, 50).
 *
 * Every family here is chosen to be separable by *shape alone* at ~44 CSS px:
 * a user who cannot tell the colours apart must still be able to group the
 * tiles. That rules out families that differ only in vertex count at small
 * sizes (a heptagon and an octagon read identically), so the set stays at
 * silhouettes with genuinely different outlines.
 */

import type { Prng } from "./prng.js";

export interface GlyphShape {
	/** SVG path data in the 100x100 box. */
	d: string;
	/** Set for shapes built from an outer and an inner subpath. */
	fillRule?: "evenodd";
	/**
	 * Stroke width used to round the outline. Polygons get a round-joined
	 * stroke in the fill colour, which is cheaper and crisper than computing
	 * true rounded corners.
	 */
	round: number;
}

export type GlyphFamily =
	| "disc"
	| "ring"
	| "triangle"
	| "diamond"
	| "square"
	| "pentagon"
	| "hexagon"
	| "star"
	| "burst"
	| "plus"
	| "droplet"
	| "crescent"
	| "chevron"
	| "flower";

export const GLYPH_FAMILIES: readonly GlyphFamily[] = [
	"disc",
	"ring",
	"triangle",
	"diamond",
	"square",
	"pentagon",
	"hexagon",
	"star",
	"burst",
	"plus",
	"droplet",
	"crescent",
	"chevron",
	"flower",
];

const CX = 50;
const CY = 50;

const fix = (value: number): string => {
	// Three decimals keeps paths short without visible quantisation at 2x.
	const rounded = Math.round(value * 1000) / 1000;
	return Object.is(rounded, -0) ? "0" : String(rounded);
};

const point = (angleDeg: number, radius: number): [number, number] => {
	const radians = (angleDeg * Math.PI) / 180;
	return [CX + Math.cos(radians) * radius, CY + Math.sin(radians) * radius];
};

const polyline = (points: readonly [number, number][]): string => {
	const [first, ...rest] = points;
	if (!first) {
		throw new Error("connect-assets: cannot build a path from no points");
	}
	const head = `M${fix(first[0])},${fix(first[1])}`;
	const tail = rest.map(([x, y]) => `L${fix(x)},${fix(y)}`).join("");
	return `${head}${tail}Z`;
};

/** Regular n-gon. `-90` puts a vertex at the top. */
const polygon = (sides: number, radius: number, rotation: number): string =>
	polyline(
		Array.from({ length: sides }, (_, i) =>
			point(rotation - 90 + (i * 360) / sides, radius),
		),
	);

const star = (
	points: number,
	outer: number,
	inner: number,
	rotation: number,
): string =>
	polyline(
		Array.from({ length: points * 2 }, (_, i) =>
			point(
				rotation - 90 + (i * 360) / (points * 2),
				i % 2 === 0 ? outer : inner,
			),
		),
	);

/** A full circle as two arcs, so it can be composed into an even-odd path. */
const circle = (radius: number, cx = CX, cy = CY, sweep = 1): string =>
	`M${fix(cx - radius)},${fix(cy)}` +
	`a${fix(radius)},${fix(radius)} 0 1,${sweep} ${fix(radius * 2)},0` +
	`a${fix(radius)},${fix(radius)} 0 1,${sweep} ${fix(-radius * 2)},0Z`;

/**
 * Build one family's silhouette. `rotation` is the per-challenge orientation;
 * it varies the look between challenges without changing which family a tile
 * belongs to.
 */
export const createGlyph = (
	family: GlyphFamily,
	rotation: number,
): GlyphShape => {
	switch (family) {
		case "disc":
			return { d: circle(31), round: 0 };
		case "ring":
			// Outer clockwise, inner anticlockwise: even-odd punches the hole.
			return {
				d: `${circle(32)}${circle(17, CX, CY, 0)}`,
				fillRule: "evenodd",
				round: 0,
			};
		case "triangle":
			// Nudged down: an equilateral triangle on its centroid reads as
			// top-heavy against a square chip.
			return { d: polygon(3, 36, rotation), round: 9 };
		case "diamond":
			return { d: polygon(4, 36, rotation), round: 8 };
		case "square":
			return { d: polygon(4, 34, rotation + 45), round: 10 };
		case "pentagon":
			return { d: polygon(5, 34, rotation), round: 8 };
		case "hexagon":
			return { d: polygon(6, 34, rotation), round: 8 };
		case "star":
			return { d: star(5, 36, 15.5, rotation), round: 6 };
		case "burst":
			return { d: star(8, 35, 20, rotation), round: 5 };
		case "plus": {
			const arm = 12;
			const reach = 34;
			const points: [number, number][] = [
				[CX - arm, CY - reach],
				[CX + arm, CY - reach],
				[CX + arm, CY - arm],
				[CX + reach, CY - arm],
				[CX + reach, CY + arm],
				[CX + arm, CY + arm],
				[CX + arm, CY + reach],
				[CX - arm, CY + reach],
				[CX - arm, CY + arm],
				[CX - reach, CY + arm],
				[CX - reach, CY - arm],
				[CX - arm, CY - arm],
			];
			return { d: polyline(points), round: 9 };
		}
		case "droplet":
			// Point at the top, near-circular body: distinct from both the disc
			// and the triangle at small sizes.
			return {
				d:
					"M50,13C66,33 79,45 79,58" +
					"A29,29 0 1 1 21,58" +
					"C21,45 34,33 50,13Z",
				round: 3,
			};
		case "crescent":
			return {
				d: `${circle(33)}${circle(26, CX + 13, CY - 3, 0)}`,
				fillRule: "evenodd",
				round: 0,
			};
		case "chevron": {
			const bar = 13;
			const points: [number, number][] = [
				[CX - 30, CY - 26],
				[CX - 30 + bar, CY - 30],
				[CX + 26, CY],
				[CX - 30 + bar, CY + 30],
				[CX - 30, CY + 26],
				[CX + 4, CY],
			];
			return { d: polyline(points), round: 8 };
		}
		case "flower": {
			// Six petals as circles on a ring, plus a central disc to fuse them
			// into one silhouette.
			const petals = Array.from({ length: 6 }, (_, i) => {
				const [x, y] = point(rotation + (i * 360) / 6, 20);
				return circle(13.5, x, y);
			}).join("");
			return { d: `${petals}${circle(15)}`, round: 0 };
		}
	}
};

/**
 * Pick `count` families that are pairwise easy to tell apart.
 *
 * Conflicts are pairwise rather than grouped: a family can clash with several
 * others without those others clashing with each other (a rotated `triangle`
 * reads as a `chevron` and as a `droplet`, but a chevron and a droplet are
 * perfectly distinguishable), and a group model collapses exactly that case.
 */
const CONFLICTS: Readonly<Record<GlyphFamily, readonly GlyphFamily[]>> = {
	// Rounded convex blobs: vertex count is not readable at tile size.
	disc: ["pentagon", "hexagon", "ring"],
	pentagon: ["disc", "hexagon"],
	hexagon: ["disc", "pentagon"],
	// Both are a light shape with a dark centre.
	ring: ["crescent", "disc"],
	crescent: ["ring"],
	// Four-gons are the same silhouette once rotation is free.
	diamond: ["square"],
	square: ["diamond"],
	// Pointed-at-one-end silhouettes.
	triangle: ["chevron", "droplet"],
	chevron: ["triangle"],
	droplet: ["triangle"],
	// Radial spikes.
	star: ["burst", "flower"],
	burst: ["star", "flower"],
	flower: ["star", "burst"],
	plus: [],
};

export const pickGlyphFamilies = (prng: Prng, count: number): GlyphFamily[] => {
	if (count > GLYPH_FAMILIES.length) {
		throw new Error(
			`connect-assets: asked for ${count} glyph families, only ${GLYPH_FAMILIES.length} exist`,
		);
	}

	const chosen: GlyphFamily[] = [];
	for (const family of prng.shuffle(GLYPH_FAMILIES)) {
		if (chosen.length === count) break;
		const conflicts = CONFLICTS[family];
		if (chosen.some((picked) => conflicts.includes(picked))) continue;
		chosen.push(family);
	}

	// A greedy pass can paint itself into a corner for large `count`. Falling
	// back to a conflicting family is strictly better than failing to render:
	// colour still separates the two, and the caller asked for more icons than
	// the conflict graph comfortably supports.
	if (chosen.length < count) {
		for (const family of prng.shuffle(GLYPH_FAMILIES)) {
			if (chosen.length === count) break;
			if (!chosen.includes(family)) chosen.push(family);
		}
	}
	return chosen;
};
