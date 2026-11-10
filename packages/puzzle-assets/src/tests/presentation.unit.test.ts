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
import { GRAIN_AMPLITUDE } from "../background.js";
import {
	type BoardEffect,
	EVEN_RECESS_STYLE,
	applyEffects,
	recessShadow,
	regrain,
	samplePresentation,
} from "../presentation.js";
import { createPrng } from "../prng.js";
import type { RgbaImage } from "../types.js";

const SEED = Buffer.from("0123456789abcdef", "utf-8");

const solidSquare = (size: number, inset: number): RgbaImage => {
	const data = Buffer.alloc(size * size * 4);
	for (let y = inset; y < size - inset; y++) {
		for (let x = inset; x < size - inset; x++) {
			const i = (y * size + x) * 4;
			data[i] = 200;
			data[i + 1] = 100;
			data[i + 2] = 50;
			data[i + 3] = 255;
		}
	}
	return { data, width: size, height: size };
};

describe("samplePresentation", () => {
	it("draws the same presentation from the same seed", () => {
		const a = samplePresentation(createPrng(SEED), 300, 200);
		const b = samplePresentation(createPrng(SEED), 300, 200);
		expect(a).toEqual(b);
	});

	it("lays one or two effects over every board", () => {
		for (let i = 0; i < 50; i++) {
			const { effects } = samplePresentation(
				createPrng(Buffer.alloc(16, i)),
				300,
				200,
			);
			expect(effects.length).toBeGreaterThanOrEqual(1);
			expect(effects.length).toBeLessThanOrEqual(2);
		}
	});
});

describe("applyEffects", () => {
	it("leaves the image alone with no effects", () => {
		const image = solidSquare(20, 0);
		const before = Buffer.from(image.data);
		applyEffects(image, [], 0, 0);
		expect(image.data.equals(before)).toBe(true);
	});

	it("changes opaque pixels and skips transparent ones", () => {
		const image = solidSquare(20, 5);
		const before = Buffer.from(image.data);
		const rings: BoardEffect = {
			kind: "rings",
			x: 3,
			y: 3,
			period: 8,
			amplitude: 0.15,
		};
		applyEffects(image, [rings], 0, 0);
		expect(image.data.subarray(0, 4).equals(before.subarray(0, 4))).toBe(true);
		expect(image.data.equals(before)).toBe(false);
	});

	it("shifts hue under a swirl", () => {
		const image = solidSquare(20, 0);
		const swirl: BoardEffect = {
			kind: "swirl",
			x: 0,
			y: 0,
			degreesPerTurn: 0,
			degreesPerPixel: 4,
		};
		applyEffects(image, [swirl], 0, 0);
		const i = (10 * 20 + 10) * 4;
		expect(image.data[i + 2]).not.toBe(50);
	});

	it("darkens pixels on a scribble and leaves the rest", () => {
		const image = solidSquare(20, 0);
		const scribbles: BoardEffect = {
			kind: "scribbles",
			strokes: [
				[
					{ x: 0, y: 10 },
					{ x: 19, y: 10 },
				],
			],
			width: 2,
			darkness: 0.25,
		};
		applyEffects(image, [scribbles], 0, 0);
		expect(image.data[(10 * 20 + 10) * 4]).toBeLessThan(200);
		expect(image.data[(2 * 20 + 10) * 4]).toBe(200);
	});

	it("bends wave stripes so one stripe does not keep a constant brightness", () => {
		const straight = solidSquare(60, 0);
		const wavy = solidSquare(60, 0);
		const stripes: BoardEffect = {
			kind: "stripes",
			angle: 0,
			period: 12,
			amplitude: 0.1,
		};
		const waves: BoardEffect = {
			...stripes,
			kind: "waves",
			wavelength: 40,
			sway: 6,
		};
		applyEffects(straight, [stripes], 0, 0);
		applyEffects(wavy, [waves], 0, 0);
		const redDownColumn = (image: RgbaImage, x: number): Set<number> => {
			const seen = new Set<number>();
			for (let y = 0; y < 60; y++) seen.add(image.data[(y * 60 + x) * 4] ?? 0);
			return seen;
		};
		expect(redDownColumn(straight, 5).size).toBe(1);
		expect(redDownColumn(wavy, 5).size).toBeGreaterThan(1);
	});

	it("ramps sawtooth stripes up slowly and drops them at once", () => {
		const image = solidSquare(40, 0);
		const sawtooth: BoardEffect = {
			kind: "sawtooth",
			angle: 0,
			period: 20,
			amplitude: 0.1,
		};
		applyEffects(image, [sawtooth], 0, 0);
		const red = (x: number): number => image.data[x * 4] ?? 0;
		for (let x = 1; x < 20; x++)
			expect(red(x)).toBeGreaterThanOrEqual(red(x - 1));
		expect(red(20)).toBeLessThan(red(19) - 30);
	});

	it("keeps tangent bands flat in the middle and steep at the ends", () => {
		const image = solidSquare(40, 0);
		const tangent: BoardEffect = {
			kind: "tangent",
			angle: 0,
			period: 40,
			amplitude: 0.1,
			limit: 4,
		};
		applyEffects(image, [tangent], 0, 0);
		const red = (x: number): number => image.data[x * 4] ?? 0;
		expect(Math.abs(red(21) - red(19))).toBeLessThan(4);
		expect(red(39) - red(33)).toBeGreaterThan(8);
		expect(red(0)).toBeLessThanOrEqual(Math.round(200 * 0.9) + 1);
		expect(red(39)).toBeLessThanOrEqual(Math.round(200 * 1.1));
	});

	it("reads the effect from the offset it is given", () => {
		const atOrigin = solidSquare(20, 0);
		const shifted = solidSquare(20, 0);
		const stripes: BoardEffect = {
			kind: "stripes",
			angle: 0,
			period: 10,
			amplitude: 0.1,
		};
		applyEffects(atOrigin, [stripes], 0, 0);
		applyEffects(shifted, [stripes], 3, 0);
		expect(shifted.data.equals(atOrigin.data)).toBe(false);
	});
});

describe("recessShadow", () => {
	it("matches the even inner shadow when the light has no bias", () => {
		expect(recessShadow(-1, 3, 10, 20, 0.45, EVEN_RECESS_STYLE)).toBeCloseTo(
			0.45 * (1 - 1 / 3),
		);
	});

	it("is zero away from the outline", () => {
		expect(recessShadow(-5, 10, 10, 20, 0.45, EVEN_RECESS_STYLE)).toBe(0);
	});
});

describe("regrain", () => {
	const randomImage = (width: number, height: number): RgbaImage => {
		const prng = createPrng(Buffer.alloc(16, 3));
		const data = Buffer.alloc(width * height * 4);
		for (let i = 0; i < data.length; i++) {
			data[i] = i % 4 === 3 ? 255 : Math.floor(prng.next() * 256);
		}
		return { data, width, height };
	};

	it("is a 3x3 median per channel plus fresh grain", () => {
		const image = randomImage(13, 9);
		const source = Buffer.from(image.data);
		regrain(image, SEED);

		const prng = createPrng(SEED);
		for (let y = 0; y < 9; y++) {
			for (let x = 0; x < 13; x++) {
				const noise = (prng.next() - 0.5) * 2 * GRAIN_AMPLITUDE;
				for (let c = 0; c < 3; c++) {
					const window: number[] = [];
					for (let dy = -1; dy <= 1; dy++) {
						for (let dx = -1; dx <= 1; dx++) {
							const sx = Math.min(12, Math.max(0, x + dx));
							const sy = Math.min(8, Math.max(0, y + dy));
							window.push(source[(sy * 13 + sx) * 4 + c] ?? 0);
						}
					}
					const median = window.sort((a, b) => a - b)[4] ?? 0;
					const expected = Math.min(
						255,
						Math.max(0, Math.round(median + noise)),
					);
					expect(image.data[(y * 13 + x) * 4 + c]).toBe(expected);
				}
			}
		}
	});
});
