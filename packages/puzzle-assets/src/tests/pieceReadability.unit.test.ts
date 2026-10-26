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

import { describe, expect, it } from "vitest";
import { generateBackground } from "../background.js";
import { cutNotch, pieceRimGeometry } from "../compose.js";
import {
	VISION_TYPES,
	bestPairContrast,
	contrastRatio,
	relativeLuminance,
	simulateVision,
} from "../contrast.js";
import { coverageFromDistance, createNotchShape } from "../notch.js";
import { MIN_PALETTE_CONTRAST, drawPalette } from "../palette.js";
import { createPrng } from "../prng.js";
import type { RgbaImage } from "../types.js";

/**
 * How many seeds each sweep covers.
 *
 * The point of these tests is that they are a sweep and not an example. A
 * palette family or a silhouette parameter that is fine on the one seed somebody
 * happened to look at and unreadable on a tenth of the rest is exactly the
 * failure that shipped, and a single-seed test cannot see it. 400 is enough to
 * catch a one-in-fifty case reliably and still run in a second.
 */
const SEEDS = 400;

const seedAt = (i: number): Buffer => {
	const seed = Buffer.alloc(16);
	// Spread the index across the whole state rather than leaving 12 zero bytes:
	// xoshiro's low-entropy start would make early draws correlate across seeds.
	seed.writeUInt32LE((i * 2_654_435_761) >>> 0, 0);
	seed.writeUInt32LE((i * 40_503 + 7) >>> 0, 4);
	seed.writeUInt32LE((i ^ 0x9e37_79b9) >>> 0, 8);
	seed.writeUInt32LE((i * 97 + 13) >>> 0, 12);
	return seed;
};

/** Hue angle in degrees, for asking whether two colours read as the same colour. */
const hueOf = (colour: { r: number; g: number; b: number }): number => {
	const r = colour.r / 255;
	const g = colour.g / 255;
	const b = colour.b / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const span = max - min;
	if (span === 0) return 0;
	let hue: number;
	if (max === r) hue = ((g - b) / span) % 6;
	else if (max === g) hue = (b - r) / span + 2;
	else hue = (r - g) / span + 4;
	return (((hue * 60) % 360) + 360) % 360;
};

/** Smallest angle between two hues, in degrees. */
const hueGap = (a: number, b: number): number => {
	const raw = Math.abs(a - b) % 360;
	return raw > 180 ? 360 - raw : raw;
};

describe("colour-vision arithmetic", () => {
	it("gives black and white the full WCAG range", () => {
		expect(
			contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }),
		).toBeCloseTo(21, 1);
	});

	it("gives a colour against itself the floor of 1", () => {
		expect(
			contrastRatio({ r: 90, g: 120, b: 200 }, { r: 90, g: 120, b: 200 }),
		).toBe(1);
	});

	// Linearised, not averaged raw bytes. Averaging overstates how light a
	// saturated colour is, which would let a pair through that a dichromat reads
	// as flat.
	it("weights green above red above blue, on linear light", () => {
		const red = relativeLuminance({ r: 255, g: 0, b: 0 });
		const green = relativeLuminance({ r: 0, g: 255, b: 0 });
		const blue = relativeLuminance({ r: 0, g: 0, b: 255 });

		expect(green).toBeGreaterThan(red);
		expect(red).toBeGreaterThan(blue);
		// Mid grey sits near 0.21, not 0.5, because the scale is linear light.
		expect(relativeLuminance({ r: 128, g: 128, b: 128 })).toBeLessThan(0.3);
	});

	it("leaves colours alone for normal vision", () => {
		const colour = { r: 12, g: 200, b: 77 };

		expect(simulateVision(colour, "normal")).toEqual(colour);
	});

	/**
	 * The property that makes the simulation worth having: red and green, which
	 * are plainly different to a trichromat, collapse onto the same hue.
	 *
	 * Measured as a hue angle, NOT as RGB distance and NOT as a contrast ratio.
	 * A protanope sees both as yellow — red as a dark yellow and green as a bright
	 * one — so their hues converge while their brightnesses stay far apart. The
	 * other two measures therefore do not drop at all, and asserting that they do
	 * would be asserting something false.
	 *
	 * That split is the whole reason the palette floor is a luminance floor and the
	 * piece's cue is a luminance step: brightness is the channel that survives.
	 */
	it("collapses red against green onto one hue for protanopia and deuteranopia", () => {
		const red = { r: 200, g: 60, b: 60 };
		const green = { r: 60, g: 200, b: 60 };

		expect(hueGap(hueOf(red), hueOf(green))).toBeGreaterThan(100);

		for (const vision of ["protanopia", "deuteranopia"] as const) {
			const gap = hueGap(
				hueOf(simulateVision(red, vision)),
				hueOf(simulateVision(green, vision)),
			);
			expect(gap, vision).toBeLessThan(20);
		}
	});

	// Tritanopia is the blue-yellow axis, so red and green stay apart for it.
	// Without this the test above could pass against a simulation that simply
	// mapped everything to one colour.
	it("leaves red against green apart for tritanopia", () => {
		const red = { r: 200, g: 60, b: 60 };
		const green = { r: 60, g: 200, b: 60 };

		expect(
			hueGap(
				hueOf(simulateVision(red, "tritanopia")),
				hueOf(simulateVision(green, "tritanopia")),
			),
		).toBeGreaterThan(90);
	});

	it("keeps a grey ramp distinguishable for every vision type", () => {
		// Luminance is the cue that survives, so this must hold — if it did not,
		// the simulation would be wrong rather than the palette.
		for (const vision of VISION_TYPES) {
			const dark = simulateVision({ r: 40, g: 40, b: 40 }, vision);
			const light = simulateVision({ r: 215, g: 215, b: 215 }, vision);
			expect(contrastRatio(dark, light)).toBeGreaterThan(5);
		}
	});
});

describe("generated palettes, swept over seeds", () => {
	/**
	 * The regression this whole file exists for. Nothing checked the palettes
	 * against colour-blind vision, so a family could lose all its structure for 1
	 * in 12 men and no test would notice.
	 */
	it("always spans the contrast floor, under every vision type", () => {
		const failures: string[] = [];

		for (let i = 0; i < SEEDS; i++) {
			const colours = drawPalette(createPrng(seedAt(i)), 5);
			const worst = bestPairContrast(colours);
			if (worst < MIN_PALETTE_CONTRAST) {
				failures.push(`seed ${i}: ${worst.toFixed(3)}`);
			}
		}

		expect(failures).toEqual([]);
	});

	it("holds the floor for every palette size the renderer asks for", () => {
		for (const count of [2, 3, 4, 5, 6, 8]) {
			for (let i = 0; i < 40; i++) {
				const colours = drawPalette(
					createPrng(seedAt(i + count * 1000)),
					count,
				);
				expect(
					bestPairContrast(colours),
					`count ${count}, seed ${i}`,
				).toBeGreaterThanOrEqual(MIN_PALETTE_CONTRAST);
			}
		}
	});

	// A floor is not supposed to flatten the output. If every palette came back
	// at exactly the threshold the backgrounds would all look the same, which
	// trades one complaint for another.
	it("still produces a range of palettes rather than clamping to the floor", () => {
		const spans = new Set<string>();
		for (let i = 0; i < SEEDS; i++) {
			spans.add(
				bestPairContrast(drawPalette(createPrng(seedAt(i)), 5)).toFixed(1),
			);
		}

		expect(spans.size).toBeGreaterThan(4);
	});

	it("is still reproducible from its seed", () => {
		expect(drawPalette(createPrng(seedAt(7)), 5)).toEqual(
			drawPalette(createPrng(seedAt(7)), 5),
		);
	});
});

/**
 * Walk the silhouette and count how many times the boundary crosses a circle
 * concentric with the body.
 *
 * A rounded square crosses a circle just outside its body at most a handful of
 * times; a piece with tabs crosses more, because each tab pushes the boundary
 * out past that radius and back. This is a crude but honest proxy for "has
 * protrusions", and it is measurable, which "looks like a jigsaw piece" is not.
 */
const protrusionArcs = (
	shape: { distance(lx: number, ly: number): number },
	size: number,
	radiusFraction: number,
): number => {
	const cx = size / 2;
	const cy = size / 2;
	const radius = (size / 2) * radiusFraction;
	const steps = 720;
	let arcs = 0;
	let previouslyInside = false;
	let firstInside: boolean | null = null;
	for (let i = 0; i < steps; i++) {
		const angle = (i / steps) * Math.PI * 2;
		const inside =
			shape.distance(
				cx + radius * Math.cos(angle),
				cy + radius * Math.sin(angle),
			) < 0;
		if (firstInside === null) {
			firstInside = inside;
		} else if (inside && !previouslyInside) {
			arcs++;
		}
		previouslyInside = inside;
	}
	// Close the loop: an arc straddling angle 0 would otherwise be counted twice
	// or not at all.
	if (firstInside === true && previouslyInside) {
		arcs++;
	}
	return arcs;
};

const coveredFraction = (
	shape: { distance(lx: number, ly: number): number },
	size: number,
): number => {
	let covered = 0;
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			covered += coverageFromDistance(shape.distance(x, y));
		}
	}
	return covered / (size * size);
};

describe("the silhouette, swept over seeds", () => {
	const SIZE = 64;

	/**
	 * The user-facing complaint: the cut-out did not read as a puzzle piece.
	 * Four shape families in five were not jigsaw-shaped at all — a circle, a
	 * rounded rectangle, a polygon, a flower — so most users were handed
	 * something with no tabs to recognise.
	 */
	it("always has protruding tabs", () => {
		const withoutTabs: number[] = [];

		for (let i = 0; i < SEEDS; i++) {
			const shape = createNotchShape(createPrng(seedAt(i)), SIZE);
			// Just beyond the body edge, where only a tab reaches.
			if (protrusionArcs(shape, SIZE, 0.92) < 1) {
				withoutTabs.push(i);
			}
		}

		expect(withoutTabs).toEqual([]);
	});

	// Variety is deliberate anti-automation: a fixed outline is a template an
	// attacker can match against. Collapsing five families into one grammar must
	// not have collapsed the silhouette space with them.
	it("still varies per challenge", () => {
		const signatures = new Set<string>();
		for (let i = 0; i < SEEDS; i++) {
			const shape = createNotchShape(createPrng(seedAt(i)), SIZE);
			// Coarse signature: covered area plus the crossing counts at two
			// radii. Two silhouettes agreeing on all three are close to the same
			// shape.
			signatures.add(
				[
					coveredFraction(shape, SIZE).toFixed(3),
					protrusionArcs(shape, SIZE, 0.92),
					protrusionArcs(shape, SIZE, 0.78),
				].join(":"),
			);
		}

		// Nothing like a template. The exact number is not the contract; the
		// contract is that it is a large fraction of the sample.
		expect(signatures.size).toBeGreaterThan(SEEDS * 0.8);
	});

	it("stays inside its bounding box", () => {
		for (let i = 0; i < 60; i++) {
			const shape = createNotchShape(createPrng(seedAt(i)), SIZE);
			// The border ring must be outside the shape, or the caller's placement
			// maths and the piece's transparent margin stop holding.
			for (let t = 0; t < SIZE; t++) {
				for (const [x, y] of [
					[t, 0],
					[t, SIZE - 1],
					[0, t],
					[SIZE - 1, t],
				] as const) {
					expect(
						shape.distance(x, y),
						`seed ${i} at (${x},${y})`,
					).toBeGreaterThan(0);
				}
			}
		}
	});

	/**
	 * A piece that is nearly the whole box is not recognisable as a shape, and one
	 * that is a sliver is not grabbable.
	 *
	 * Measured over these 400 seeds the generator spans 0.219 to 0.467, median
	 * 0.340. The bounds below sit outside that on both sides on purpose: they are a
	 * guard against a future change shrinking or ballooning the piece, not a
	 * restatement of today's output, which would go red on any harmless tweak.
	 */
	it("covers a usable fraction of its box", () => {
		for (let i = 0; i < SEEDS; i++) {
			const covered = coveredFraction(
				createNotchShape(createPrng(seedAt(i)), SIZE),
				SIZE,
			);
			expect(covered, `seed ${i}`).toBeGreaterThan(0.18);
			expect(covered, `seed ${i}`).toBeLessThan(0.6);
		}
	});

	// The spread itself is worth keeping: area is a weak template signal, and a
	// generator that always produced the same-sized piece would hand that over.
	it("varies how much of the box it fills", () => {
		const buckets = new Set<string>();
		for (let i = 0; i < SEEDS; i++) {
			buckets.add(
				coveredFraction(
					createNotchShape(createPrng(seedAt(i)), SIZE),
					SIZE,
				).toFixed(2),
			);
		}

		expect(buckets.size).toBeGreaterThan(10);
	});

	it("is reproducible from its seed", () => {
		const a = createNotchShape(createPrng(seedAt(3)), SIZE);
		const b = createNotchShape(createPrng(seedAt(3)), SIZE);

		for (let t = 0; t < SIZE; t += 3) {
			expect(a.distance(t, t)).toBe(b.distance(t, t));
		}
	});
});

/**
 * Mean luminance of the piece's rim plateau and of its interior.
 *
 * The plateau band, not the whole rim: the outermost pixels are partly
 * transparent from anti-aliasing and are excluded by the alpha filter, so
 * averaging over the taper as well measures a weaker cue than a viewer sees.
 * `-1.8 < d < -0.5` is where the step is at full strength on fully opaque
 * pixels, which is what the eye picks up as the outline.
 */
const rimAndCore = (
	piece: RgbaImage,
	shape: { distance(lx: number, ly: number): number },
): { rim: number; core: number } => {
	// Derived from the renderer's own geometry rather than hard-coded, so the
	// measurement cannot drift away from the band that was actually drawn.
	const band = pieceRimGeometry(piece.width);
	let rimTotal = 0;
	let rimCount = 0;
	let coreTotal = 0;
	let coreCount = 0;
	for (let y = 0; y < piece.height; y++) {
		for (let x = 0; x < piece.width; x++) {
			const o = (y * piece.width + x) * 4;
			if ((piece.data[o + 3] ?? 0) < 250) continue;
			const luma = relativeLuminance({
				r: piece.data[o] ?? 0,
				g: piece.data[o + 1] ?? 0,
				b: piece.data[o + 2] ?? 0,
			});
			const d = shape.distance(x, y);
			if (d > -band.plateau && d < -0.5) {
				rimTotal += luma;
				rimCount++;
			} else if (d < -band.width - 2) {
				coreTotal += luma;
				coreCount++;
			}
		}
	}
	return {
		rim: rimCount === 0 ? 0 : rimTotal / rimCount,
		core: coreCount === 0 ? 0 : coreTotal / coreCount,
	};
};

describe("the piece's separation cue, swept over seeds", () => {
	const SIZE = 64;

	/**
	 * The second complaint: the piece did not sit apart from the background. It
	 * is cut from the same mesh the background is drawn from, so on an unlucky
	 * palette it was the same colour as what it rested on, and the only thing
	 * dividing them was a CSS drop-shadow.
	 *
	 * The cue is a luminance step, deliberately not a hue, so it survives
	 * greyscale — which is what this asserts by measuring luminance only.
	 */
	it("always separates the rim from the body by a visible luminance step", () => {
		const failures: string[] = [];

		for (let i = 0; i < 120; i++) {
			const prng = createPrng(seedAt(i));
			const background = generateBackground(prng, 240, 160);
			const shape = createNotchShape(prng, SIZE);
			const { piece } = cutNotch(
				prng,
				background,
				shape,
				SIZE,
				{ targetX: 120, targetY: 80 },
				0.55,
			);

			const { rim, core } = rimAndCore(piece, shape);
			// Measured as a ratio so it is read the same way at both ends of the
			// brightness range, where a fixed absolute step would be generous for
			// dark pieces and invisible for light ones.
			const ratio = (Math.max(rim, core) + 0.05) / (Math.min(rim, core) + 0.05);
			if (ratio < 1.25) {
				failures.push(`seed ${i}: ${ratio.toFixed(3)}`);
			}
		}

		expect(failures).toEqual([]);
	});

	/**
	 * The step has to go the right way. A fixed light rim disappears on a pale
	 * background and a fixed dark one disappears on a dark background, which is
	 * how a cue that is present in the code ends up absent on screen.
	 */
	it("steps away from the piece rather than in a fixed direction", () => {
		let lighterRim = 0;
		let darkerRim = 0;

		for (let i = 0; i < 120; i++) {
			const prng = createPrng(seedAt(i + 5_000));
			const background = generateBackground(prng, 240, 160);
			const shape = createNotchShape(prng, SIZE);
			const { piece } = cutNotch(
				prng,
				background,
				shape,
				SIZE,
				{ targetX: 120, targetY: 80 },
				0.55,
			);

			const { rim, core } = rimAndCore(piece, shape);
			if (rim > core) {
				lighterRim++;
			} else {
				darkerRim++;
			}
		}

		// Both directions must actually occur, or the direction is not being
		// chosen from the piece at all.
		expect(lighterRim).toBeGreaterThan(0);
		expect(darkerRim).toBeGreaterThan(0);
	});

	it("survives being reduced to greyscale", () => {
		for (let i = 0; i < 40; i++) {
			const prng = createPrng(seedAt(i + 9_000));
			const background = generateBackground(prng, 240, 160);
			const shape = createNotchShape(prng, SIZE);
			const { piece } = cutNotch(
				prng,
				background,
				shape,
				SIZE,
				{ targetX: 120, targetY: 80 },
				0.55,
			);

			// Greyscale by luminance, then measure again. The cue is a luminance
			// step, so it must be exactly as strong — this is the difference
			// between a real cue and a hue that merely looks like one.
			const grey: RgbaImage = {
				width: piece.width,
				height: piece.height,
				data: Buffer.from(piece.data),
			};
			for (let o = 0; o < grey.data.length; o += 4) {
				const v = Math.round(
					0.2126 * (grey.data[o] ?? 0) +
						0.7152 * (grey.data[o + 1] ?? 0) +
						0.0722 * (grey.data[o + 2] ?? 0),
				);
				grey.data[o] = v;
				grey.data[o + 1] = v;
				grey.data[o + 2] = v;
			}

			const colour = rimAndCore(piece, shape);
			const mono = rimAndCore(grey, shape);
			const colourRatio =
				(Math.max(colour.rim, colour.core) + 0.05) /
				(Math.min(colour.rim, colour.core) + 0.05);
			const monoRatio =
				(Math.max(mono.rim, mono.core) + 0.05) /
				(Math.min(mono.rim, mono.core) + 0.05);

			expect(monoRatio, `seed ${i}`).toBeGreaterThan(1.2);
			// Within a few percent: the step is carried by brightness, so
			// discarding hue should cost almost nothing.
			expect(Math.abs(monoRatio - colourRatio), `seed ${i}`).toBeLessThan(0.2);
		}
	});

	it("keeps the cue for every dichromacy", () => {
		for (let i = 0; i < 40; i++) {
			const prng = createPrng(seedAt(i + 11_000));
			const background = generateBackground(prng, 240, 160);
			const shape = createNotchShape(prng, SIZE);
			const { piece } = cutNotch(
				prng,
				background,
				shape,
				SIZE,
				{ targetX: 120, targetY: 80 },
				0.55,
			);
			const { rim, core } = rimAndCore(piece, shape);
			// Reconstruct greys at the measured luminances and simulate. Working
			// from the means rather than per-pixel keeps this fast while asking the
			// same question: is the step still there.
			const toGrey = (luminance: number) => {
				const v = Math.round(255 * luminance ** (1 / 2.2));
				return { r: v, g: v, b: v };
			};

			for (const vision of VISION_TYPES) {
				const ratio = contrastRatio(
					simulateVision(toGrey(rim), vision),
					simulateVision(toGrey(core), vision),
				);
				expect(ratio, `seed ${i}, ${vision}`).toBeGreaterThan(1.2);
			}
		}
	});
});
