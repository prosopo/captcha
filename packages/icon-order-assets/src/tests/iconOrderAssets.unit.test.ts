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

import { createPrng } from "@prosopo/puzzle-assets";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { GLYPH_KINDS, GlyphKind, glyphPath } from "../glyphs.js";
import {
	DEFAULT_GEOMETRY,
	DEFAULT_RENDER_SETTINGS,
	LEGEND_ICON_SIZE,
	createIconOrderChallenge,
	gradeClicks,
} from "../index.js";
import { placeIcons } from "../place.js";
import type {
	IconOrderGeometry,
	IconOrderRenderSettings,
	IconPlacement,
} from "../types.js";

const seed = (byte: number): Buffer => Buffer.alloc(16, byte);

const target = (over: Partial<IconPlacement> = {}): IconPlacement => ({
	x: 100,
	y: 100,
	kind: GlyphKind.ring,
	rotation: 0,
	hue: 200,
	size: 40,
	...over,
});

describe("glyphs", () => {
	it("has path data for every kind in the vocabulary", () => {
		for (const kind of GLYPH_KINDS) {
			expect(glyphPath(kind).length).toBeGreaterThan(0);
		}
	});

	it("exposes every enum member as a kind", () => {
		expect([...GLYPH_KINDS].sort()).toEqual(Object.values(GlyphKind).sort());
	});
});

describe("placeIcons", () => {
	it("returns the requested number of targets and decoys", () => {
		const { targets, decoys } = placeIcons(
			createPrng(seed(7)),
			DEFAULT_GEOMETRY,
			3,
			4,
		);
		expect(targets).toHaveLength(3);
		expect(decoys).toHaveLength(4);
	});

	it("gives every icon on the frame a distinct glyph, so the legend is unambiguous", () => {
		const { targets, decoys } = placeIcons(
			createPrng(seed(11)),
			DEFAULT_GEOMETRY,
			3,
			5,
		);
		const kinds = [...targets, ...decoys].map((icon) => icon.kind);
		expect(new Set(kinds).size).toBe(kinds.length);
	});

	it("keeps whole icons inside the frame", () => {
		const { targets, decoys } = placeIcons(
			createPrng(seed(3)),
			DEFAULT_GEOMETRY,
			3,
			4,
		);
		for (const icon of [...targets, ...decoys]) {
			expect(icon.x).toBeGreaterThanOrEqual(0);
			expect(icon.y).toBeGreaterThanOrEqual(0);
			expect(icon.x).toBeLessThanOrEqual(DEFAULT_GEOMETRY.width);
			expect(icon.y).toBeLessThanOrEqual(DEFAULT_GEOMETRY.height);
		}
	});

	it("separates icons so no click can fall inside two hit radii", () => {
		const { targets, decoys } = placeIcons(
			createPrng(seed(23)),
			DEFAULT_GEOMETRY,
			3,
			4,
		);
		const icons = [...targets, ...decoys];
		for (let i = 0; i < icons.length; i++) {
			for (let j = i + 1; j < icons.length; j++) {
				const a = icons[i];
				const b = icons[j];
				if (!a || !b) throw new Error("icon underflow");
				expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(
					1.15 * Math.max(a.size, b.size),
				);
			}
		}
	});

	it("throws rather than shortening the answer when a target cannot be placed", () => {
		// One icon nearly as wide as the frame leaves nowhere for a second.
		const cramped: IconOrderGeometry = {
			width: 60,
			height: 60,
			iconSize: 50,
		};
		expect(() => placeIcons(createPrng(seed(5)), cramped, 3, 0)).toThrow(
			/could not place target icon/,
		);
	});

	it("drops decoys rather than failing when the frame is crowded", () => {
		const cramped: IconOrderGeometry = {
			width: 120,
			height: 90,
			iconSize: 34,
		};
		const { targets, decoys } = placeIcons(createPrng(seed(9)), cramped, 2, 6);
		expect(targets).toHaveLength(2);
		expect(decoys.length).toBeLessThan(6);
	});

	it("refuses to ask for more distinct glyphs than exist", () => {
		expect(() =>
			placeIcons(createPrng(seed(1)), DEFAULT_GEOMETRY, 3, GLYPH_KINDS.length),
		).toThrow(/only \d+ exist/);
	});
});

describe("gradeClicks", () => {
	const targets: IconPlacement[] = [
		target({ x: 50, y: 50 }),
		target({ x: 150, y: 60, kind: GlyphKind.star }),
		target({ x: 240, y: 150, kind: GlyphKind.bolt }),
	];
	const tolerance = 0.6;

	it("accepts exact clicks in the right order", () => {
		expect(
			gradeClicks(
				targets,
				[
					{ x: 50, y: 50 },
					{ x: 150, y: 60 },
					{ x: 240, y: 150 },
				],
				tolerance,
			),
		).toBe(true);
	});

	it("accepts clicks inside the hit radius", () => {
		expect(
			gradeClicks(
				targets,
				[
					{ x: 58, y: 55 },
					{ x: 143, y: 66 },
					{ x: 246, y: 143 },
				],
				tolerance,
			),
		).toBe(true);
	});

	it("rejects the right icons clicked in the wrong order", () => {
		expect(
			gradeClicks(
				targets,
				[
					{ x: 150, y: 60 },
					{ x: 50, y: 50 },
					{ x: 240, y: 150 },
				],
				tolerance,
			),
		).toBe(false);
	});

	it("rejects a click outside the hit radius", () => {
		expect(
			gradeClicks(
				targets,
				[
					{ x: 50, y: 50 },
					{ x: 150, y: 60 },
					{ x: 240, y: 190 },
				],
				tolerance,
			),
		).toBe(false);
	});

	it("rejects too few and too many clicks", () => {
		expect(
			gradeClicks(
				targets,
				[
					{ x: 50, y: 50 },
					{ x: 150, y: 60 },
				],
				tolerance,
			),
		).toBe(false);
		expect(
			gradeClicks(
				targets,
				[
					{ x: 50, y: 50 },
					{ x: 150, y: 60 },
					{ x: 240, y: 150 },
					{ x: 240, y: 150 },
				],
				tolerance,
			),
		).toBe(false);
	});

	it("scales the hit radius with the icon, so jittered sizes are equally hittable", () => {
		const small = [target({ x: 100, y: 100, size: 20 })];
		const large = [target({ x: 100, y: 100, size: 60 })];
		const click = [{ x: 118, y: 100 }];
		expect(gradeClicks(small, click, 0.6)).toBe(false);
		expect(gradeClicks(large, click, 0.6)).toBe(true);
	});
});

describe("createIconOrderChallenge", () => {
	it("renders a frame and a legend sized to the target count", async () => {
		const challenge = await createIconOrderChallenge();

		const background = await sharp(challenge.background).metadata();
		expect(background.width).toBe(DEFAULT_GEOMETRY.width);
		expect(background.height).toBe(DEFAULT_GEOMETRY.height);

		const legend = await sharp(challenge.legend).metadata();
		expect(legend.height).toBe(LEGEND_ICON_SIZE);
		// Three chips plus the two gaps between them.
		expect(legend.width).toBe(
			DEFAULT_RENDER_SETTINGS.targetCount * (LEGEND_ICON_SIZE + 6) - 6,
		);

		expect(challenge.targets).toHaveLength(DEFAULT_RENDER_SETTINGS.targetCount);
		expect(challenge.legendIconSize).toBe(LEGEND_ICON_SIZE);
	});

	it("produces a different frame every call, so a background is never reused", async () => {
		const [a, b] = await Promise.all([
			createIconOrderChallenge(),
			createIconOrderChallenge(),
		]);
		expect(a.background.equals(b.background)).toBe(false);
	});

	it("honours the target and decoy counts it is given", async () => {
		const settings: IconOrderRenderSettings = {
			...DEFAULT_RENDER_SETTINGS,
			targetCount: 4,
			decoyCount: 2,
		};
		const challenge = await createIconOrderChallenge(
			DEFAULT_GEOMETRY,
			settings,
		);
		expect(challenge.targets).toHaveLength(4);
		const legend = await sharp(challenge.legend).metadata();
		expect(legend.width).toBe(4 * (LEGEND_ICON_SIZE + 6) - 6);
	});
});
