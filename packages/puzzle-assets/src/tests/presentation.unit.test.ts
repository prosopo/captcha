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
import {
	type BoardPattern,
	EVEN_RECESS_STYLE,
	applyPattern,
	posePiece,
	recessShadow,
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

const opaqueCount = (image: RgbaImage): number => {
	let n = 0;
	for (let i = 3; i < image.data.length; i += 4) {
		if ((image.data[i] ?? 0) > 0) n++;
	}
	return n;
};

describe("samplePresentation", () => {
	it("draws the same presentation from the same seed", () => {
		const a = samplePresentation(createPrng(SEED), 300, 200);
		const b = samplePresentation(createPrng(SEED), 300, 200);
		expect(a).toEqual(b);
	});

	it("keeps a posed piece inside its own box", () => {
		for (let i = 0; i < 50; i++) {
			const seed = Buffer.alloc(16, i);
			const { pieceRotation, pieceScale } = samplePresentation(
				createPrng(seed),
				300,
				200,
			);
			const reach =
				pieceScale *
				(Math.abs(Math.cos(pieceRotation)) + Math.abs(Math.sin(pieceRotation)));
			expect(reach).toBeLessThanOrEqual(1);
		}
	});
});

describe("posePiece", () => {
	it("leaves a piece unchanged with no rotation and no scaling", () => {
		const piece = solidSquare(40, 6);
		const posed = posePiece(piece, 0, 1);
		expect(posed.data.equals(piece.data)).toBe(true);
	});

	it("keeps the box size and shrinks the opaque area when scaled down", () => {
		const piece = solidSquare(40, 0);
		const posed = posePiece(piece, 0.1, 0.8);
		expect(posed.width).toBe(40);
		expect(posed.height).toBe(40);
		expect(opaqueCount(posed)).toBeLessThan(opaqueCount(piece));
	});
});

describe("applyPattern", () => {
	it("leaves the image alone for no pattern", () => {
		const image = solidSquare(20, 0);
		const before = Buffer.from(image.data);
		applyPattern(image, { kind: "none" }, 0, 0);
		expect(image.data.equals(before)).toBe(true);
	});

	it("skips transparent pixels", () => {
		const image = solidSquare(20, 5);
		const before = Buffer.from(image.data);
		const stripes: BoardPattern = {
			kind: "stripes",
			angle: 0.3,
			period: 10,
			amplitude: 0.05,
		};
		applyPattern(image, stripes, 0, 0);
		expect(image.data.subarray(0, 4).equals(before.subarray(0, 4))).toBe(true);
		expect(image.data.equals(before)).toBe(false);
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
