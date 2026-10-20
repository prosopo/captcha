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

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { generateBackground } from "../../src/background.js";
import { renderPuzzleToRgba } from "../../src/browser.js";
import { cutNotch, pieceRimGeometry } from "../../src/compose.js";
import {
	VISION_TYPES,
	bestPairContrast,
	contrastRatio,
	relativeLuminance,
	simulateVision,
	worstCaseContrast,
} from "../../src/contrast.js";
import { paintDecoyPiece, paintDecoys } from "../../src/decoys.js";
import { coverageFromDistance, createNotchShape } from "../../src/notch.js";
import { type Rgb, drawPalette, hslToRgb } from "../../src/palette.js";
import { type Prng, createPrng } from "../../src/prng.js";
import type {
	NotchPlacement,
	PuzzleGeometry,
	PuzzleRenderSettings,
	RgbaImage,
} from "../../src/types.js";

// Floats travel as the hex of their IEEE-754 bits, big-endian, so the Rust side
// compares bit patterns rather than trusting a decimal round trip.
const bits = (value: number): string => {
	const view = new DataView(new ArrayBuffer(8));
	view.setFloat64(0, value);
	return Buffer.from(view.buffer).toString("hex");
};

const sha256 = (data: Uint8Array): string =>
	createHash("sha256").update(data).digest("hex");

const imageDigest = (image: RgbaImage): ImageDigest => ({
	width: image.width,
	height: image.height,
	sha256: sha256(image.data),
});

const errorMessage = (fn: () => unknown): string => {
	try {
		fn();
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
	throw new Error("expected an error");
};

const seedAt = (i: number): Buffer => {
	const seed = Buffer.alloc(16);
	seed.writeUInt32LE((i * 2_654_435_761) >>> 0, 0);
	seed.writeUInt32LE((i * 40_503 + 7) >>> 0, 4);
	seed.writeUInt32LE((i ^ 0x9e37_79b9) >>> 0, 8);
	seed.writeUInt32LE((i * 97 + 13) >>> 0, 12);
	return seed;
};

const hex = (seed: Buffer): string => seed.toString("hex");

const rgbBits = (colour: Rgb): [string, string, string] => [
	bits(colour.r),
	bits(colour.g),
	bits(colour.b),
];

interface ImageDigest {
	width: number;
	height: number;
	sha256: string;
}

interface MathVectors {
	exp: [string, string][];
	pow: [string, string, string][];
	hypot: [string, string, string][];
	round: [string, string][];
}

interface PrngVector {
	seed: string;
	uint32: number[];
	next: string[];
	int: { min: number; max: number; value: number }[];
	range: { min: number; max: number; value: string }[];
	pick: { length: number; index: number }[];
}

interface HslVector {
	h: number;
	s: number;
	l: number;
	rgb: [string, string, string];
}

interface ContrastVector {
	a: [number, number, number];
	b: [number, number, number];
	luminanceA: string;
	contrast: string;
	worstCase: string;
	simulatedA: [string, string, string][];
}

interface BestPairVector {
	colours: [string, string, string][];
	best: string;
}

interface PaletteVector {
	seed: string;
	count: number;
	colours: [string, string, string][];
	nextAfter: string;
}

interface ShapeVector {
	seed: string;
	size: number;
	gridSha256: string;
	samples: { x: number; y: number; d: string }[];
	nextAfter: string;
}

interface BackgroundVector {
	seed: string;
	width: number;
	height: number;
	image: ImageDigest;
	nextAfter: string;
}

interface DecoyVector {
	backgroundSeed: string;
	decoySeed: string;
	width: number;
	height: number;
	targetCount: number;
	notchSize: number;
	notch: NotchPlacement;
	edgeDarkness: number;
	bodyBrightness: number;
	holeDarken: number;
	image: ImageDigest;
	nextAfter: string;
}

interface DecoyPieceVector {
	backgroundSeed: string;
	decoySeed: string;
	size: number;
	cx: number;
	cy: number;
	edgeDarkness: number;
	bodyBrightness: number;
	holeDarken: number;
	image: ImageDigest;
}

interface CutVector {
	seed: string;
	width: number;
	height: number;
	size: number;
	placement: NotchPlacement;
	holeDarken: number;
	background: ImageDigest;
	piece: ImageDigest;
	nextAfter: string;
}

interface RenderVector {
	backgroundSeed: string;
	renderSeed: string;
	geometry: PuzzleGeometry;
	settings: PuzzleRenderSettings;
	placement: NotchPlacement;
	background: ImageDigest;
	piece: ImageDigest;
	pieceSize: number;
}

interface Vectors {
	math: MathVectors;
	prng: PrngVector[];
	prngErrors: { seedLength: number; message: string }[];
	pickEmptyError: string;
	hslToRgb: HslVector[];
	contrast: ContrastVector[];
	bestPair: BestPairVector[];
	coverage: [string, string][];
	rimGeometry: { size: number; plateau: string; width: string }[];
	palettes: PaletteVector[];
	shapes: ShapeVector[];
	backgrounds: BackgroundVector[];
	decoys: DecoyVector[];
	decoyPieces: DecoyPieceVector[];
	cuts: CutVector[];
	renders: RenderVector[];
}

const mathPrng: Prng = createPrng(seedAt(424_242));

const mathVectors = (): MathVectors => {
	const exp: [string, string][] = [];
	for (let i = 0; i < 250; i++) {
		const dx = mathPrng.range(-400, 400);
		const dy = mathPrng.range(-300, 300);
		const sigma = mathPrng.range(5, 140);
		const x = -(dx * dx + dy * dy) / (2 * sigma * sigma);
		exp.push([bits(x), bits(Math.exp(x))]);
	}
	for (const x of [0, -0.5, -1, -700, -745.2, 1, 709.7]) {
		exp.push([bits(x), bits(Math.exp(x))]);
	}
	const pow: [string, string, string][] = [];
	for (const y of [2.4, 1 / 2.4, 1 / 2.2, 2]) {
		for (let i = 0; i < 40; i++) {
			const x = i < 3 ? ([0, 1, 0.5][i] ?? 0) : mathPrng.next();
			pow.push([bits(x), bits(y), bits(x ** y)]);
		}
		for (let channel = 0; channel <= 255; channel += 15) {
			const x = (channel / 255 + 0.055) / 1.055;
			pow.push([bits(x), bits(y), bits(x ** y)]);
		}
	}
	const hypot: [string, string, string][] = [];
	for (let i = 0; i < 200; i++) {
		const a = mathPrng.range(-60, 60);
		const b = i % 7 === 0 ? 0 : mathPrng.range(-60, 60);
		hypot.push([bits(a), bits(b), bits(Math.hypot(a, b))]);
	}
	for (const [a, b] of [
		[0, 0],
		[3, 4],
		[-0, 5],
		[1e-300, 1e-300],
		[1e300, 1e300],
	] as const) {
		hypot.push([bits(a), bits(b), bits(Math.hypot(a, b))]);
	}
	const round: [string, string][] = [];
	for (const x of [
		0.5, -0.5, 1.5, -1.5, 2.5, -2.5, 0.49999999999999994, -0.49999999999999994,
		4503599627370495.5, 4503599627370497, -4503599627370497, 254.5, 255.49999,
		-0.0001, 1e20, -1e20,
	]) {
		round.push([bits(x), bits(Math.round(x))]);
	}
	for (let i = 0; i < 100; i++) {
		const x = mathPrng.range(-300, 300);
		round.push([bits(x), bits(Math.round(x))]);
	}
	return { exp, pow, hypot, round };
};

const prngVectors = (): PrngVector[] => {
	const seeds: Buffer[] = [
		Buffer.alloc(16),
		Buffer.from("0123456789abcdef", "utf-8"),
		Buffer.from("fedcba9876543210", "utf-8"),
		Buffer.from("00112233445566778899aabbccddeeff", "hex"),
		Buffer.from("ffffffffffffffffffffffffffffffff", "hex"),
		Buffer.from("00112233445566778899aabbccddeeff0102030405", "hex"),
		seedAt(1),
		seedAt(77),
	];
	return seeds.map((seed): PrngVector => {
		const raw = createPrng(seed);
		const uint32: number[] = [];
		for (let i = 0; i < 24; i++) uint32.push(raw.next() * 4294967296);
		const prng = createPrng(seed);
		const next: string[] = [];
		for (let i = 0; i < 8; i++) next.push(bits(prng.next()));
		const int: PrngVector["int"] = [];
		for (const [min, max] of [
			[0, 0],
			[3, 7],
			[-5, 5],
			[2, 3],
			[0, 1000000],
			[-2147483648, 2147483647],
		] as const) {
			int.push({ min, max, value: prng.int(min, max) });
		}
		const range: PrngVector["range"] = [];
		for (const [min, max] of [
			[0, 1],
			[-20, 20],
			[0.26, 0.48],
			[5, 5],
			[10, -10],
		] as const) {
			range.push({ min, max, value: bits(prng.range(min, max)) });
		}
		const pick: PrngVector["pick"] = [];
		for (const length of [1, 2, 6, 10, 97]) {
			const items = Array.from({ length }, (_, i): number => i);
			pick.push({ length, index: prng.pick(items) });
		}
		return { seed: hex(seed), uint32, next, int, range, pick };
	});
};

const hslVectors = (): HslVector[] => {
	const out: HslVector[] = [];
	for (const h of [-725, -30, 0, 59.9, 60, 180, 268.5, 359.99, 720.25]) {
		for (const s of [0, 0.3, 0.55, 1]) {
			for (const l of [0, 0.4, 0.5, 0.72, 1]) {
				out.push({ h, s, l, rgb: rgbBits(hslToRgb(h, s, l)) });
			}
		}
	}
	return out;
};

const colourAt = (prng: Prng): [number, number, number] => [
	prng.int(0, 255),
	prng.int(0, 255),
	prng.int(0, 255),
];

const toRgb = ([r, g, b]: [number, number, number]): Rgb => ({ r, g, b });

const contrastVectors = (): ContrastVector[] => {
	const prng = createPrng(seedAt(9_001));
	const pairs: [[number, number, number], [number, number, number]][] = [
		[
			[0, 0, 0],
			[255, 255, 255],
		],
		[
			[90, 120, 200],
			[90, 120, 200],
		],
		[
			[200, 60, 60],
			[60, 200, 60],
		],
		[
			[10, 10, 10],
			[11, 10, 10],
		],
	];
	for (let i = 0; i < 50; i++) pairs.push([colourAt(prng), colourAt(prng)]);
	return pairs.map(
		([a, b]): ContrastVector => ({
			a,
			b,
			luminanceA: bits(relativeLuminance(toRgb(a))),
			contrast: bits(contrastRatio(toRgb(a), toRgb(b))),
			worstCase: bits(worstCaseContrast(toRgb(a), toRgb(b))),
			simulatedA: VISION_TYPES.map((vision) =>
				rgbBits(simulateVision(toRgb(a), vision)),
			),
		}),
	);
};

const bestPairVectors = (): BestPairVector[] => {
	const prng = createPrng(seedAt(9_002));
	const out: BestPairVector[] = [];
	for (let i = 0; i < 40; i++) {
		const count = i % 6;
		const colours: Rgb[] = [];
		for (let c = 0; c < count; c++) {
			colours.push({
				r: prng.range(0, 255),
				g: prng.range(0, 255),
				b: prng.range(0, 255),
			});
		}
		out.push({
			colours: colours.map(rgbBits),
			best: bits(bestPairContrast(colours)),
		});
	}
	return out;
};

const coverageVectors = (): [string, string][] => {
	const out: [string, string][] = [];
	for (let d = -3; d <= 3; d += 0.125) {
		out.push([bits(d), bits(coverageFromDistance(d))]);
	}
	for (const d of [-0.5, 0.5, 0.49999, -0.49999, 0.1]) {
		out.push([bits(d), bits(coverageFromDistance(d))]);
	}
	return out;
};

const rimGeometryVectors = (): Vectors["rimGeometry"] =>
	[0, 1, 10, 20, 33, 34, 44, 61, 64, 100, 180, 300].map((size) => {
		const rim = pieceRimGeometry(size);
		return { size, plateau: bits(rim.plateau), width: bits(rim.width) };
	});

const paletteVectors = (): PaletteVector[] => {
	const out: PaletteVector[] = [];
	for (const count of [0, 1, 2, 3, 4, 5, 6, 8]) {
		for (let i = 0; i < 6; i++) {
			const prng = createPrng(seedAt(i + count * 1000));
			const colours = drawPalette(prng, count).map(rgbBits);
			out.push({
				seed: hex(seedAt(i + count * 1000)),
				count,
				colours,
				nextAfter: bits(prng.next()),
			});
		}
	}
	return out;
};

const shapeVectors = (): ShapeVector[] => {
	const out: ShapeVector[] = [];
	const sizes = [1, 2, 8, 20, 44, 61, 64, 120, 180];
	for (let i = 0; i < 54; i++) {
		const size = sizes[i % sizes.length] ?? 44;
		const seed = seedAt(i + 20_000);
		const prng = createPrng(seed);
		const shape = createNotchShape(prng, size);
		const grid = Buffer.alloc(size * size * 8);
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				grid.writeDoubleLE(shape.distance(x, y), (y * size + x) * 8);
			}
		}
		const samples: ShapeVector["samples"] = [];
		for (const [x, y] of [
			[-3, -3],
			[size / 2, size / 2],
			[size / 3, size * 0.75],
			[size + 2.5, -1.25],
		] as const) {
			samples.push({ x, y, d: bits(shape.distance(x, y)) });
		}
		out.push({
			seed: hex(seed),
			size,
			gridSha256: sha256(grid),
			samples,
			nextAfter: bits(prng.next()),
		});
	}
	return out;
};

const backgroundVectors = (): BackgroundVector[] => {
	const out: BackgroundVector[] = [];
	const dims: [number, number][] = [
		[0, 0],
		[0, 5],
		[5, 0],
		[1, 1],
		[7, 3],
		[60, 40],
		[240, 160],
		[300, 200],
		[2, 400],
		[700, 3],
	];
	let n = 0;
	for (const [width, height] of dims) {
		const count = width * height > 20_000 ? 4 : 8;
		for (let i = 0; i < count; i++) {
			const seed = seedAt(n++ + 30_000);
			const prng = createPrng(seed);
			const image = generateBackground(prng, width, height);
			out.push({
				seed: hex(seed),
				width,
				height,
				image: imageDigest(image),
				nextAfter: bits(prng.next()),
			});
		}
	}
	for (const seed of [
		Buffer.alloc(16),
		Buffer.from("0123456789abcdef", "utf-8"),
		Buffer.from("fedcba9876543210", "utf-8"),
	]) {
		const prng = createPrng(seed);
		const image = generateBackground(prng, 300, 200);
		out.push({
			seed: hex(seed),
			width: 300,
			height: 200,
			image: imageDigest(image),
			nextAfter: bits(prng.next()),
		});
	}
	return out;
};

const decoyVectors = (): DecoyVector[] => {
	const out: DecoyVector[] = [];
	const cases: {
		targetCount: number;
		notchSize: number;
		notch: NotchPlacement;
		edgeDarkness: number;
		bodyBrightness: number;
		holeDarken: number;
	}[] = [
		{
			targetCount: 0,
			notchSize: 44,
			notch: { targetX: 220, targetY: 140 },
			edgeDarkness: 20,
			bodyBrightness: 4,
			holeDarken: 0.7,
		},
		{
			targetCount: -3,
			notchSize: 44,
			notch: { targetX: 220, targetY: 140 },
			edgeDarkness: 20,
			bodyBrightness: 4,
			holeDarken: 0.7,
		},
		{
			targetCount: 1,
			notchSize: 44,
			notch: { targetX: 220, targetY: 140 },
			edgeDarkness: 20,
			bodyBrightness: 4,
			holeDarken: 0.7,
		},
		{
			targetCount: 3,
			notchSize: 44,
			notch: { targetX: 220, targetY: 140 },
			edgeDarkness: 20,
			bodyBrightness: 4,
			holeDarken: 0.7,
		},
		{
			targetCount: 5,
			notchSize: 44,
			notch: { targetX: 150, targetY: 100 },
			edgeDarkness: 90,
			bodyBrightness: 40,
			holeDarken: 0.95,
		},
		{
			targetCount: 8,
			notchSize: 61,
			notch: { targetX: 10, targetY: 190 },
			edgeDarkness: 0,
			bodyBrightness: -12,
			holeDarken: 0,
		},
		{
			targetCount: 2.4,
			notchSize: 180,
			notch: { targetX: 150, targetY: 100 },
			edgeDarkness: 20,
			bodyBrightness: 4,
			holeDarken: 0.5,
		},
		{
			targetCount: 30,
			notchSize: 20,
			notch: { targetX: 299.5, targetY: 0.25 },
			edgeDarkness: 255,
			bodyBrightness: 255,
			holeDarken: 1,
		},
	];
	let n = 0;
	for (const c of cases) {
		for (let i = 0; i < 3; i++) {
			const backgroundSeed = seedAt(n + 40_000);
			const decoySeed = seedAt(n + 50_000);
			n++;
			const background = generateBackground(
				createPrng(backgroundSeed),
				300,
				200,
			);
			const prng = createPrng(decoySeed);
			paintDecoys(
				background,
				prng,
				c.targetCount,
				c.notchSize,
				c.notch,
				c.edgeDarkness,
				c.bodyBrightness,
				c.holeDarken,
			);
			out.push({
				backgroundSeed: hex(backgroundSeed),
				decoySeed: hex(decoySeed),
				width: 300,
				height: 200,
				...c,
				image: imageDigest(background),
				nextAfter: bits(prng.next()),
			});
		}
	}
	return out;
};

const decoyPieceVectors = (): DecoyPieceVector[] => {
	const out: DecoyPieceVector[] = [];
	const cases: [number, number, number, number, number, number][] = [
		[44, 150, 100, 0, 0, 0],
		[44, 150, 100, 20, 4, 0.7],
		[44, 0, 0, 20, 4, 0.7],
		[44, 299.5, 199.5, 20, 4, 0.7],
		[61, 30.25, 170.75, 90, 40, 0.95],
		[180, 150, 100, 20, -4, 0.3],
		[8, 77.5, 22.5, 255, 255, 1],
		[44, -30, 250, 20, 4, 0.7],
	];
	let n = 0;
	for (const [
		size,
		cx,
		cy,
		edgeDarkness,
		bodyBrightness,
		holeDarken,
	] of cases) {
		const backgroundSeed = seedAt(n + 60_000);
		const decoySeed = seedAt(n + 61_000);
		n++;
		const background = generateBackground(createPrng(backgroundSeed), 300, 200);
		paintDecoyPiece(
			background,
			createPrng(decoySeed),
			size,
			cx,
			cy,
			edgeDarkness,
			bodyBrightness,
			holeDarken,
		);
		out.push({
			backgroundSeed: hex(backgroundSeed),
			decoySeed: hex(decoySeed),
			size,
			cx,
			cy,
			edgeDarkness,
			bodyBrightness,
			holeDarken,
			image: imageDigest(background),
		});
	}
	return out;
};

const cutVectors = (): CutVector[] => {
	const out: CutVector[] = [];
	const cases: {
		width: number;
		height: number;
		size: number;
		placement: NotchPlacement;
		holeDarken: number;
	}[] = [
		{
			width: 300,
			height: 200,
			size: 44,
			placement: { targetX: 200, targetY: 100 },
			holeDarken: 0.55,
		},
		{
			width: 300,
			height: 200,
			size: 44,
			placement: { targetX: 300, targetY: 0 },
			holeDarken: 0.55,
		},
		{
			width: 300,
			height: 200,
			size: 44,
			placement: { targetX: -100, targetY: -100 },
			holeDarken: 0.55,
		},
		{
			width: 240,
			height: 160,
			size: 64,
			placement: { targetX: 120, targetY: 80 },
			holeDarken: 0.55,
		},
		{
			width: 300,
			height: 200,
			size: 180,
			placement: { targetX: 150, targetY: 100 },
			holeDarken: 0.2,
		},
		{
			width: 300,
			height: 200,
			size: 400,
			placement: { targetX: 150, targetY: 100 },
			holeDarken: 0,
		},
		{
			width: 300,
			height: 200,
			size: 61,
			placement: { targetX: 12.5, targetY: 187.5 },
			holeDarken: 1,
		},
		{
			width: 60,
			height: 40,
			size: 9,
			placement: { targetX: 30.4, targetY: 19.6 },
			holeDarken: 0.55,
		},
		{
			width: 300,
			height: 200,
			size: 1,
			placement: { targetX: 150, targetY: 100 },
			holeDarken: 0.55,
		},
	];
	let n = 0;
	for (const c of cases) {
		for (let i = 0; i < 4; i++) {
			const seed = seedAt(n++ + 70_000);
			const prng = createPrng(seed);
			const background = generateBackground(prng, c.width, c.height);
			const shape = createNotchShape(prng, c.size);
			const { background: cut, piece } = cutNotch(
				prng,
				background,
				shape,
				c.size,
				c.placement,
				c.holeDarken,
			);
			out.push({
				seed: hex(seed),
				...c,
				background: imageDigest(cut),
				piece: imageDigest(piece),
				nextAfter: bits(prng.next()),
			});
		}
	}
	return out;
};

const DEFAULT_GEOMETRY: PuzzleGeometry = {
	width: 300,
	height: 200,
	notchSize: 44,
};
const DEFAULT_SETTINGS: PuzzleRenderSettings = {
	decoyCount: 5,
	decoyEdgeDarkness: 20,
	decoyBodyBrightness: 4,
	holeDarken: 0.55,
	decoyHoleDarken: 0.7,
};

const renderVectors = (): RenderVector[] => {
	const out: RenderVector[] = [];
	const cases: {
		geometry: PuzzleGeometry;
		settings: PuzzleRenderSettings;
		placement: NotchPlacement;
	}[] = [
		{
			geometry: DEFAULT_GEOMETRY,
			settings: DEFAULT_SETTINGS,
			placement: { targetX: 191, targetY: 77 },
		},
		{
			geometry: DEFAULT_GEOMETRY,
			settings: DEFAULT_SETTINGS,
			placement: { targetX: 200, targetY: 100 },
		},
		{
			geometry: { ...DEFAULT_GEOMETRY, pieceSize: 61 },
			settings: DEFAULT_SETTINGS,
			placement: { targetX: 191, targetY: 77 },
		},
		{
			geometry: { ...DEFAULT_GEOMETRY, pieceSize: 180 },
			settings: DEFAULT_SETTINGS,
			placement: { targetX: 150, targetY: 100 },
		},
		{
			geometry: DEFAULT_GEOMETRY,
			settings: { ...DEFAULT_SETTINGS, decoyCount: 0 },
			placement: { targetX: 150, targetY: 100 },
		},
		{
			geometry: DEFAULT_GEOMETRY,
			settings: { ...DEFAULT_SETTINGS, decoyCount: 8 },
			placement: { targetX: 221, targetY: 77 },
		},
		{
			geometry: DEFAULT_GEOMETRY,
			settings: { ...DEFAULT_SETTINGS, decoyEdgeDarkness: 90 },
			placement: { targetX: 191, targetY: 77 },
		},
		{
			geometry: DEFAULT_GEOMETRY,
			settings: { ...DEFAULT_SETTINGS, decoyBodyBrightness: 40 },
			placement: { targetX: 191, targetY: 77 },
		},
		{
			geometry: DEFAULT_GEOMETRY,
			settings: { ...DEFAULT_SETTINGS, holeDarken: 0.2 },
			placement: { targetX: 191, targetY: 77 },
		},
		{
			geometry: DEFAULT_GEOMETRY,
			settings: { ...DEFAULT_SETTINGS, decoyHoleDarken: 0.95 },
			placement: { targetX: 191, targetY: 77 },
		},
		{
			geometry: DEFAULT_GEOMETRY,
			settings: DEFAULT_SETTINGS,
			placement: { targetX: 0, targetY: 0 },
		},
		{
			geometry: DEFAULT_GEOMETRY,
			settings: DEFAULT_SETTINGS,
			placement: { targetX: 300, targetY: 200 },
		},
		{
			geometry: { width: 240, height: 160, notchSize: 30, pieceSize: 64 },
			settings: { ...DEFAULT_SETTINGS, decoyCount: 3 },
			placement: { targetX: 120.5, targetY: 79.5 },
		},
		{
			geometry: { width: 300, height: 200, notchSize: 44, pieceSize: 330 },
			settings: DEFAULT_SETTINGS,
			placement: { targetX: 150, targetY: 100 },
		},
	];
	let n = 0;
	for (const c of cases) {
		for (let i = 0; i < 3; i++) {
			const backgroundSeed = seedAt(n + 80_000);
			const renderSeed = seedAt(n + 90_000);
			n++;
			const background = generateBackground(
				createPrng(backgroundSeed),
				c.geometry.width,
				c.geometry.height,
			);
			const rendered = renderPuzzleToRgba(
				background,
				c.placement,
				c.geometry,
				c.settings,
				renderSeed,
			);
			out.push({
				backgroundSeed: hex(backgroundSeed),
				renderSeed: hex(renderSeed),
				...c,
				background: imageDigest(rendered.background),
				piece: imageDigest(rendered.piece),
				pieceSize: rendered.pieceSize,
			});
		}
	}
	return out;
};

const vectors: Vectors = {
	math: mathVectors(),
	prng: prngVectors(),
	prngErrors: [0, 1, 8, 15].map((seedLength) => ({
		seedLength,
		message: errorMessage(() => createPrng(Buffer.alloc(seedLength))),
	})),
	pickEmptyError: errorMessage(() => createPrng(seedAt(5)).pick<number>([])),
	hslToRgb: hslVectors(),
	contrast: contrastVectors(),
	bestPair: bestPairVectors(),
	coverage: coverageVectors(),
	rimGeometry: rimGeometryVectors(),
	palettes: paletteVectors(),
	shapes: shapeVectors(),
	backgrounds: backgroundVectors(),
	decoys: decoyVectors(),
	decoyPieces: decoyPieceVectors(),
	cuts: cutVectors(),
	renders: renderVectors(),
};

writeFileSync(
	fileURLToPath(new URL("./vectors.json", import.meta.url)),
	`${JSON.stringify(vectors, null, "\t")}\n`,
);
