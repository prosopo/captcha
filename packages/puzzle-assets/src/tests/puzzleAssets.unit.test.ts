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
import { cutNotch } from "../compose.js";
import { paintDecoyPiece, paintDecoys } from "../decoys.js";
import {
	DEFAULT_GEOMETRY,
	DEFAULT_RENDER_SETTINGS,
	createBackground,
	renderPuzzle,
} from "../index.js";
import { coverageFromDistance, createNotchShape } from "../notch.js";
import { createPrng, createSeed } from "../prng.js";
import type { RgbaImage } from "../types.js";

const SEED_A = Buffer.from("0123456789abcdef", "utf-8");
const SEED_B = Buffer.from("fedcba9876543210", "utf-8");

const meanLuma = (image: RgbaImage): number => {
	let total = 0;
	const pixels = image.width * image.height;
	for (let i = 0; i < pixels; i++) {
		const o = i * 4;
		total +=
			0.299 * (image.data[o] ?? 0) +
			0.587 * (image.data[o + 1] ?? 0) +
			0.114 * (image.data[o + 2] ?? 0);
	}
	return total / pixels;
};

describe("prng", () => {
	it("is deterministic for a given seed", () => {
		const a = createPrng(SEED_A);
		const b = createPrng(SEED_A);
		const drawA = [a.next(), a.next(), a.next()];
		const drawB = [b.next(), b.next(), b.next()];
		expect(drawA).toEqual(drawB);
	});

	it("diverges for different seeds", () => {
		const a = createPrng(SEED_A);
		const b = createPrng(SEED_B);
		expect(a.next()).not.toBe(b.next());
	});

	it("stays within bounds", () => {
		const prng = createPrng(SEED_A);
		for (let i = 0; i < 500; i++) {
			const v = prng.next();
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
			const n = prng.int(3, 7);
			expect(n).toBeGreaterThanOrEqual(3);
			expect(n).toBeLessThanOrEqual(7);
		}
	});

	it("rejects a seed shorter than 128 bits", () => {
		expect(() => createPrng(Buffer.alloc(8))).toThrow(/seed must be at least/);
	});

	it("issues 128-bit seeds", () => {
		expect(createSeed()).toHaveLength(16);
		// Two seeds colliding would mean the CSPRNG is broken; the whole design
		// rests on an attacker being unable to reproduce the clean background.
		expect(createSeed().equals(createSeed())).toBe(false);
	});
});

describe("generateBackground", () => {
	it("fills every pixel opaque", () => {
		const image = generateBackground(createPrng(SEED_A), 60, 40);
		expect(image.data).toHaveLength(60 * 40 * 4);
		for (let i = 0; i < 60 * 40; i++) {
			expect(image.data[i * 4 + 3]).toBe(255);
		}
	});

	it("is reproducible from its seed", () => {
		const a = generateBackground(createPrng(SEED_A), 60, 40);
		const b = generateBackground(createPrng(SEED_A), 60, 40);
		expect(a.data.equals(b.data)).toBe(true);
	});

	it("produces a different picture for a different seed", () => {
		const a = generateBackground(createPrng(SEED_A), 60, 40);
		const b = generateBackground(createPrng(SEED_B), 60, 40);
		expect(a.data.equals(b.data)).toBe(false);
	});

	it("is not a flat wash", () => {
		// Guards the regression that made every pixel converge on the palette
		// mean: with too-broad falloff the frame came out a single flat colour.
		const image = generateBackground(createPrng(SEED_A), 300, 200);
		let min = 255;
		let max = 0;
		for (let i = 0; i < image.width * image.height; i++) {
			const o = i * 4;
			const luma =
				0.299 * (image.data[o] ?? 0) +
				0.587 * (image.data[o + 1] ?? 0) +
				0.114 * (image.data[o + 2] ?? 0);
			min = Math.min(min, luma);
			max = Math.max(max, luma);
		}
		expect(max - min).toBeGreaterThan(25);
	});
});

describe("cutNotch", () => {
	const geometry = DEFAULT_GEOMETRY;
	const placement = { targetX: 200, targetY: 100 };

	it("darkens the hole and leaves the rest of the frame alone", () => {
		const prng = createPrng(SEED_A);
		const original = generateBackground(
			createPrng(SEED_A),
			geometry.width,
			geometry.height,
		);
		const working = generateBackground(
			createPrng(SEED_A),
			geometry.width,
			geometry.height,
		);
		const shape = createNotchShape(prng, geometry.notchSize);
		const { background, piece } = cutNotch(
			prng,
			working,
			shape,
			geometry.notchSize,
			placement,
			DEFAULT_RENDER_SETTINGS.holeDarken,
		);

		// Centre of the notch is darker than it was.
		const centre = (placement.targetY * geometry.width + placement.targetX) * 4;
		expect(background.data[centre]).toBeLessThan(original.data[centre] ?? 255);

		// A pixel far from the cut is untouched.
		const far = (10 * geometry.width + 10) * 4;
		expect(background.data[far]).toBe(original.data[far]);

		expect(piece.width).toBe(geometry.notchSize);
		expect(piece.height).toBe(geometry.notchSize);
	});

	it("makes the piece opaque inside the shape and transparent at the corners", () => {
		const prng = createPrng(SEED_A);
		const background = createBackground(geometry);
		const shape = createNotchShape(prng, geometry.notchSize);
		const { piece } = cutNotch(
			prng,
			background,
			shape,
			geometry.notchSize,
			placement,
			DEFAULT_RENDER_SETTINGS.holeDarken,
		);

		const half = Math.floor(geometry.notchSize / 2);
		const centreAlpha =
			piece.data[(half * geometry.notchSize + half) * 4 + 3] ?? 0;
		expect(centreAlpha).toBe(255);

		// Corners sit outside a rounded silhouette. The drop shadow may tint
		// them slightly, so this asserts "not solid", not "fully clear".
		expect(piece.data[3] ?? 255).toBeLessThan(128);
	});

	it("clips the piece to transparent where the placement overhangs the frame", () => {
		// Place the notch centred on the top-right corner: roughly a
		// quarter of the bounding box sits inside the frame; the rest
		// hangs off. Every piece pixel outside the frame must be
		// transparent — the sampler no longer clamps to the edge.
		const prng = createPrng(SEED_A);
		const bg = createBackground(geometry);
		const shape = createNotchShape(prng, geometry.notchSize);
		const overhangPlacement = {
			targetX: geometry.width,
			targetY: 0,
		};
		const { piece } = cutNotch(
			prng,
			bg,
			shape,
			geometry.notchSize,
			overhangPlacement,
			DEFAULT_RENDER_SETTINGS.holeDarken,
		);

		const half = geometry.notchSize / 2;
		const left = Math.round(overhangPlacement.targetX - half);
		const top = Math.round(overhangPlacement.targetY - half);
		let outOfFrameOpaque = 0;
		for (let ly = 0; ly < geometry.notchSize; ly++) {
			for (let lx = 0; lx < geometry.notchSize; lx++) {
				const bx = left + lx;
				const by = top + ly;
				const inFrame =
					bx >= 0 && by >= 0 && bx < geometry.width && by < geometry.height;
				if (inFrame) continue;
				const alpha = piece.data[(ly * geometry.notchSize + lx) * 4 + 3] ?? 0;
				if (alpha !== 0) outOfFrameOpaque++;
			}
		}
		expect(outOfFrameOpaque).toBe(0);
	});

	it("does not reproduce the background pixel-exactly in the piece", () => {
		// The anti-correlation defence: an exact copy would let an attacker
		// locate the target by sliding the piece over the background.
		const prng = createPrng(SEED_A);
		const reference = generateBackground(
			createPrng(SEED_A),
			geometry.width,
			geometry.height,
		);
		const working = generateBackground(
			createPrng(SEED_A),
			geometry.width,
			geometry.height,
		);
		const shape = createNotchShape(prng, geometry.notchSize);
		const { piece } = cutNotch(
			prng,
			working,
			shape,
			geometry.notchSize,
			placement,
			DEFAULT_RENDER_SETTINGS.holeDarken,
		);

		const half = geometry.notchSize / 2;
		const left = Math.round(placement.targetX - half);
		const top = Math.round(placement.targetY - half);
		let identical = 0;
		let compared = 0;
		for (let ly = 0; ly < geometry.notchSize; ly++) {
			for (let lx = 0; lx < geometry.notchSize; lx++) {
				const pi = (ly * geometry.notchSize + lx) * 4;
				if ((piece.data[pi + 3] ?? 0) < 255) continue;
				const bi = ((top + ly) * geometry.width + (left + lx)) * 4;
				compared++;
				if (piece.data[pi] === reference.data[bi]) identical++;
			}
		}
		expect(compared).toBeGreaterThan(100);
		expect(identical / compared).toBeLessThan(0.5);
	});
});

describe("renderPuzzle", () => {
	it("encodes both halves as webp", async () => {
		const rendered = await renderPuzzle(createBackground(), {
			targetX: 200,
			targetY: 100,
		});
		// RIFF....WEBP
		expect(rendered.background.subarray(0, 4).toString("ascii")).toBe("RIFF");
		expect(rendered.background.subarray(8, 12).toString("ascii")).toBe("WEBP");
		expect(rendered.piece.subarray(8, 12).toString("ascii")).toBe("WEBP");
		expect(rendered.pieceSize).toBe(DEFAULT_GEOMETRY.notchSize);
	});

	it("honors a `pieceSize` override independently of `notchSize`", async () => {
		const overrideSize = 180;
		const rendered = await renderPuzzle(
			createBackground(),
			{ targetX: 150, targetY: 100 },
			{ ...DEFAULT_GEOMETRY, pieceSize: overrideSize },
		);
		expect(rendered.pieceSize).toBe(overrideSize);
	});

	it("stays small enough to inline as a data uri", async () => {
		const rendered = await renderPuzzle(createBackground(), {
			targetX: 200,
			targetY: 100,
		});
		const base64Bytes =
			Math.ceil(rendered.background.length / 3) * 4 +
			Math.ceil(rendered.piece.length / 3) * 4;
		expect(base64Bytes).toBeLessThan(120_000);
	});
});

describe("coverageFromDistance", () => {
	it("is 1 well inside, 0 well outside and partial on the boundary", () => {
		expect(coverageFromDistance(-5)).toBe(1);
		expect(coverageFromDistance(5)).toBe(0);
		const edge = coverageFromDistance(0);
		expect(edge).toBeGreaterThan(0);
		expect(edge).toBeLessThan(1);
	});
});

describe("background brightness", () => {
	it("keeps a usable mid-range so the piece stays visible", () => {
		for (const seed of [SEED_A, SEED_B]) {
			const luma = meanLuma(generateBackground(createPrng(seed), 300, 200));
			expect(luma).toBeGreaterThan(60);
			expect(luma).toBeLessThan(215);
		}
	});
});

describe("paintDecoys", () => {
	const notch = { targetX: 220, targetY: 140 };
	const { decoyEdgeDarkness, decoyBodyBrightness, decoyHoleDarken } =
		DEFAULT_RENDER_SETTINGS;

	it("is a no-op for count <= 0", () => {
		const bg = generateBackground(createPrng(SEED_A), 300, 200);
		const before = Buffer.from(bg.data);
		paintDecoys(
			bg,
			createPrng(SEED_A),
			0,
			DEFAULT_GEOMETRY.notchSize,
			notch,
			decoyEdgeDarkness,
			decoyBodyBrightness,
			decoyHoleDarken,
		);
		expect(bg.data.equals(before)).toBe(true);
	});

	it("mutates the background when count > 0", () => {
		const bg = generateBackground(createPrng(SEED_A), 300, 200);
		const before = Buffer.from(bg.data);
		paintDecoys(
			bg,
			createPrng(SEED_B),
			3,
			DEFAULT_GEOMETRY.notchSize,
			notch,
			decoyEdgeDarkness,
			decoyBodyBrightness,
			decoyHoleDarken,
		);
		expect(bg.data.equals(before)).toBe(false);
	});

	it("is deterministic for a given prng seed", () => {
		const bg1 = generateBackground(createPrng(SEED_A), 300, 200);
		const bg2 = generateBackground(createPrng(SEED_A), 300, 200);
		paintDecoys(
			bg1,
			createPrng(SEED_B),
			3,
			DEFAULT_GEOMETRY.notchSize,
			notch,
			decoyEdgeDarkness,
			decoyBodyBrightness,
			decoyHoleDarken,
		);
		paintDecoys(
			bg2,
			createPrng(SEED_B),
			3,
			DEFAULT_GEOMETRY.notchSize,
			notch,
			decoyEdgeDarkness,
			decoyBodyBrightness,
			decoyHoleDarken,
		);
		expect(bg1.data.equals(bg2.data)).toBe(true);
	});

	// holeDarken == 0 collapses every decoy body to full black in the
	// interior. Guards the multiplicative path — a regression that reverts
	// decoys to the pre-hole-darken additive shift only would still tint the
	// pixels but never reach zero. Uses `paintDecoyPiece` directly so the
	// centre pixel is deterministic (`paintDecoys` scatters randomly).
	it("blackens the decoy interior when holeDarken is zero", () => {
		const bg = generateBackground(createPrng(SEED_A), 300, 200);
		const cx = 150;
		const cy = 100;
		// Additive rim/body knobs at 0 too so only the multiplicative path
		// contributes; otherwise `bodyBrightness` adds back a few units and
		// the pixels never reach exactly zero.
		paintDecoyPiece(
			bg,
			createPrng(SEED_B),
			DEFAULT_GEOMETRY.notchSize,
			cx,
			cy,
			0,
			0,
			0,
		);
		const i = (cy * bg.width + cx) * 4;
		expect(bg.data[i]).toBe(0);
		expect(bg.data[i + 1]).toBe(0);
		expect(bg.data[i + 2]).toBe(0);
	});
});

describe("renderPuzzle with decoys", () => {
	it("still returns a matching piece when decoys are present", async () => {
		const bg = createBackground(DEFAULT_GEOMETRY);
		const rendered = await renderPuzzle(
			bg,
			{ targetX: 150, targetY: 100 },
			DEFAULT_GEOMETRY,
			{ ...DEFAULT_RENDER_SETTINGS, decoyCount: 3 },
		);
		expect(rendered.background.length).toBeGreaterThan(0);
		expect(rendered.piece.length).toBeGreaterThan(0);
		expect(rendered.pieceSize).toBe(DEFAULT_GEOMETRY.notchSize);
	});

	it("honors decoyCount 0 (no decoys) end-to-end", async () => {
		const target = { targetX: 150, targetY: 100 };
		const rendered = await renderPuzzle(
			createBackground(DEFAULT_GEOMETRY),
			target,
			DEFAULT_GEOMETRY,
			{ ...DEFAULT_RENDER_SETTINGS, decoyCount: 0 },
		);
		expect(rendered.background.length).toBeGreaterThan(0);
	});
});
