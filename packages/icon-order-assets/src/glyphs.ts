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
 * The icon vocabulary.
 *
 * Every glyph is authored as stroked path data in a 100x100 box, so one
 * definition serves both the frame (stamped at `IconPlacement.size`) and the
 * legend (stamped small), and the two renderings are the same shape at
 * different scales — the user matches them by outline alone.
 *
 * Shapes are chosen to stay distinguishable under rotation. Anything with
 * rotational symmetry that maps onto another member of the set would make the
 * legend ambiguous, so e.g. there is no plain "line" and no second ring.
 */
export enum GlyphKind {
	ring = "ring",
	spiral = "spiral",
	chevron = "chevron",
	bolt = "bolt",
	cross = "cross",
	triangle = "triangle",
	star = "star",
	wave = "wave",
	square = "square",
	arc = "arc",
}

/**
 * Path data in a 100x100 viewBox, centred on (50, 50) so rotation about the
 * centre never clips.
 */
const GLYPH_PATHS: Readonly<Record<GlyphKind, string>> = {
	[GlyphKind.ring]: "M 14 50 A 36 36 0 1 0 86 50 A 36 36 0 1 0 14 50",
	[GlyphKind.spiral]:
		"M 50 12 A 38 38 0 1 1 12 50 A 28 28 0 1 1 68 50 A 18 18 0 1 1 32 50",
	[GlyphKind.chevron]: "M 22 20 L 54 50 L 22 80 M 48 20 L 80 50 L 48 80",
	[GlyphKind.bolt]: "M 26 12 L 62 40 L 38 54 L 74 88",
	[GlyphKind.cross]: "M 20 20 L 80 80 M 80 20 L 20 80",
	[GlyphKind.triangle]: "M 50 14 L 86 82 L 14 82 Z",
	[GlyphKind.star]:
		"M 50 12 L 59.4 37.1 L 86.1 38.2 L 65.2 54.9 L 72.3 80.6 L 50 66 L 27.7 80.6 L 34.8 54.9 L 13.9 38.2 L 40.6 37.1 Z",
	[GlyphKind.wave]: "M 12 62 Q 31 22 50 62 T 88 62",
	[GlyphKind.square]: "M 20 20 H 80 V 80 H 20 Z",
	[GlyphKind.arc]: "M 14 72 A 40 40 0 0 1 86 72",
};

export const GLYPH_KINDS: readonly GlyphKind[] = Object.values(GlyphKind);

export const glyphPath = (kind: GlyphKind): string => {
	const path = GLYPH_PATHS[kind];
	if (!path) {
		throw new Error(`icon-order-assets: no path for glyph "${kind}"`);
	}
	return path;
};
