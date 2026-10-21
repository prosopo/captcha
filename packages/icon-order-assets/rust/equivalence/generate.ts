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
import { type Prng, type RgbaImage, createPrng } from "@prosopo/puzzle-assets";
import sharp, { type OutputInfo, type Sharp } from "sharp";
import { collageMarkup } from "../../src/background.js";
import { compositeIcons, renderLegend } from "../../src/compose.js";
import { GLYPH_KINDS, type GlyphKind, glyphPath } from "../../src/glyphs.js";
import {
	DEFAULT_GEOMETRY,
	DEFAULT_RENDER_SETTINGS,
	LEGEND_ICON_SIZE,
	gradeClicks,
} from "../../src/index.js";
import { placeIcons } from "../../src/place.js";
import { shuffle } from "../../src/shuffle.js";
import type {
	IconOrderGeometry,
	IconOrderRenderSettings,
	IconPlacement,
} from "../../src/types.js";

// The vectors are what Node 24, the production runtime, produces.
if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

// Floats travel as the hex of their IEEE-754 bits, big-endian, so the Rust side
// compares bit patterns rather than trusting a decimal round trip.
const bits = (value: number): string => {
	const view = new DataView(new ArrayBuffer(8));
	view.setFloat64(0, value);
	return Buffer.from(view.buffer).toString("hex");
};

const sha256 = (data: Uint8Array | string): string =>
	createHash("sha256").update(data).digest("hex");

const errorMessage = (fn: () => unknown): string | undefined => {
	try {
		fn();
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
	return undefined;
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

// sharp's input and raw output are not reachable through the public API, so
// the prototype is wrapped to record each SVG document compose.ts renders and
// the RGBA librsvg returns before compose.ts adds grain to it in place.
interface Capture {
	svg: string;
	raster: RgbaImage;
}

interface SharpInternals {
	options: { input: { buffer?: Buffer } };
}

type RawToBuffer = (
	this: Sharp,
	options?: { resolveWithObject: true },
) => Promise<{ data: Buffer; info: OutputInfo }>;

const captures: Capture[] = [];
const sharpPrototype = sharp.prototype as unknown as { toBuffer: RawToBuffer };
const originalToBuffer: RawToBuffer = sharpPrototype.toBuffer;
sharpPrototype.toBuffer = async function (
	this: Sharp,
	options?: { resolveWithObject: true },
): Promise<{ data: Buffer; info: OutputInfo }> {
	const input = (this as unknown as SharpInternals).options.input.buffer;
	const result = await originalToBuffer.call(this, options);
	if (input && options?.resolveWithObject) {
		captures.push({
			svg: input.toString("utf8"),
			raster: {
				data: Buffer.from(result.data),
				width: result.info.width,
				height: result.info.height,
			},
		});
	}
	return result;
};

const takeCapture = (): Capture => {
	const capture = captures.shift();
	if (!capture) {
		throw new Error("expected sharp to have rendered a document");
	}
	return capture;
};

const toPng = async (image: RgbaImage): Promise<string> => {
	const png = await sharp(Buffer.from(image.data), {
		raw: { width: image.width, height: image.height, channels: 4 },
	})
		.png({ compressionLevel: 9 })
		.toBuffer();
	return png.toString("base64");
};

interface GeometryVector {
	width: number;
	height: number;
	iconSize: string;
}

interface SettingsVector {
	targetCount: number;
	decoyCount: number;
	strokeWidth: string;
	iconOpacity: string;
	haloOpacity: string;
	backgroundClutter: string;
}

interface PlacementVector {
	x: string;
	y: string;
	kind: string;
	rotation: string;
	hue: string;
	size: string;
}

interface ShuffleVector {
	seed: string;
	length: number;
	order: number[];
	nextAfter: string;
}

interface CollageVector {
	seed: string;
	width: number;
	height: number;
	clutter: string;
	sha256: string;
	length: number;
	markup?: string;
	nextAfter: string;
}

interface PlaceVector {
	seed: string;
	geometry: GeometryVector;
	targetCount: number;
	decoyCount: number;
	targets?: PlacementVector[];
	decoys?: PlacementVector[];
	error?: string;
	nextAfter: string;
}

interface PlaceDigestVector {
	geometry: GeometryVector;
	targetCount: number;
	decoyCount: number;
	seeds: number;
	failures: number;
	sha256: string;
}

interface FrameVector {
	seed: string;
	geometry: GeometryVector;
	settings: SettingsVector;
	targetKinds: string[];
	svgSha256: string;
	svgLength: number;
	svg?: string;
	legendWidth: number;
	legendSvgSha256: string;
	legendSvgLength: number;
	legendSvg?: string;
	compositeSha256: string;
	nextAfter: string;
	raster?: { frame: string; legend: string };
}

interface ClickVector {
	x: string;
	y: string;
}

interface GradeVector {
	targets: { x: string; y: string; size: string }[];
	clicks: ClickVector[];
	tolerance: string;
	result: boolean;
}

interface Vectors {
	numberFormat: [string, string][];
	trig: [string, string, string][];
	hypot: [string, string, string][];
	glyphs: { kinds: string[]; paths: string[] };
	shuffle: ShuffleVector[];
	collage: CollageVector[];
	place: PlaceVector[];
	placeDigests: PlaceDigestVector[];
	frames: FrameVector[];
	grade: GradeVector[];
}

const geometryVector = (geometry: IconOrderGeometry): GeometryVector => ({
	width: geometry.width,
	height: geometry.height,
	iconSize: bits(geometry.iconSize),
});

const settingsVector = (settings: IconOrderRenderSettings): SettingsVector => ({
	targetCount: settings.targetCount,
	decoyCount: settings.decoyCount,
	strokeWidth: bits(settings.strokeWidth),
	iconOpacity: bits(settings.iconOpacity),
	haloOpacity: bits(settings.haloOpacity),
	backgroundClutter: bits(settings.backgroundClutter),
});

const placementVector = (placement: IconPlacement): PlacementVector => ({
	x: bits(placement.x),
	y: bits(placement.y),
	kind: placement.kind,
	rotation: bits(placement.rotation),
	hue: bits(placement.hue),
	size: bits(placement.size),
});

const numberFormat = (): [string, string][] => {
	const values: number[] = [
		0,
		-0,
		1,
		-1,
		0.1,
		0.01,
		-0.01,
		1.005,
		123.45,
		-123.45,
		1e21,
		1e20,
		123456789012345680000,
		1.5e21,
		1e-6,
		1e-7,
		1.5e-7,
		-2.5e-7,
		0.000001234,
		5e-324,
		Number.MAX_VALUE,
		Number.MAX_SAFE_INTEGER,
		Number.EPSILON,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
		0.1 + 0.2,
		100 / 3,
		2 ** 53 + 2,
	];
	const prng = createPrng(seedAt(1));
	for (let i = 0; i < 250; i++) {
		values.push(Math.round((prng.next() - 0.3) * 1e6) / 100);
	}
	for (let i = 0; i < 120; i++) {
		values.push((prng.next() - 0.5) * 10 ** prng.int(-30, 30));
	}
	return values.map((value) => [bits(value), String(value)]);
};

const trig = (): [string, string, string][] => {
	const prng = createPrng(seedAt(2));
	const values: number[] = [
		0,
		Math.PI / 4,
		Math.PI / 2,
		Math.PI,
		(3 * Math.PI) / 2,
		2 * Math.PI,
		(5 * Math.PI) / 2,
		1e-9,
		-1,
		100,
		-12345.678,
	];
	for (let i = 0; i < 200; i++) {
		const a = prng.range(0, Math.PI * 2);
		values.push(a, a + Math.PI / 2);
	}
	return values.map((x) => [bits(x), bits(Math.cos(x)), bits(Math.sin(x))]);
};

const hypot = (): [string, string, string][] => {
	const prng = createPrng(seedAt(3));
	const pairs: [number, number][] = [
		[3, 4],
		[0, 0],
		[-0, 0],
		[300, 200],
		[1e200, 1e200],
		[5e-324, 5e-324],
	];
	for (let i = 0; i < 100; i++) {
		pairs.push([prng.range(-300, 300), prng.range(-200, 200)]);
	}
	return pairs.map(([a, b]) => [bits(a), bits(b), bits(Math.hypot(a, b))]);
};

const shuffleVectors = (): ShuffleVector[] => {
	const out: ShuffleVector[] = [];
	for (let i = 0; i < 24; i++) {
		const seed = seedAt(100 + i);
		const prng = createPrng(seed);
		const length = i % 12;
		const order = shuffle(
			prng,
			Array.from({ length }, (_, index) => index),
		);
		out.push({ seed: hex(seed), length, order, nextAfter: bits(prng.next()) });
	}
	return out;
};

const collageVectors = (): CollageVector[] => {
	const geometries: IconOrderGeometry[] = [
		DEFAULT_GEOMETRY,
		{ width: 120, height: 90, iconSize: 34 },
		{ width: 640, height: 480, iconSize: 38 },
	];
	const clutters = [0, 1, 2.5, 3, 8, 20, -1, Number.NaN];
	const out: CollageVector[] = [];
	let n = 0;
	for (const geometry of geometries) {
		for (const clutter of clutters) {
			for (let k = 0; k < 4; k++) {
				const seed = seedAt(200 + n);
				const prng = createPrng(seed);
				const markup = collageMarkup(prng, geometry, clutter);
				out.push({
					seed: hex(seed),
					width: geometry.width,
					height: geometry.height,
					clutter: bits(clutter),
					sha256: sha256(markup),
					length: markup.length,
					...(n < 2 ? { markup } : {}),
					nextAfter: bits(prng.next()),
				});
				n++;
			}
		}
	}
	return out;
};

interface PlaceConfig {
	geometry: IconOrderGeometry;
	targetCount: number;
	decoyCount: number;
}

const placeConfigs: PlaceConfig[] = [
	{ geometry: DEFAULT_GEOMETRY, targetCount: 3, decoyCount: 4 },
	{ geometry: DEFAULT_GEOMETRY, targetCount: 3, decoyCount: 5 },
	{ geometry: DEFAULT_GEOMETRY, targetCount: 4, decoyCount: 2 },
	{ geometry: DEFAULT_GEOMETRY, targetCount: 3, decoyCount: 7 },
	{ geometry: DEFAULT_GEOMETRY, targetCount: 0, decoyCount: 0 },
	{ geometry: DEFAULT_GEOMETRY, targetCount: 10, decoyCount: 0 },
	{ geometry: DEFAULT_GEOMETRY, targetCount: 3, decoyCount: 8 },
	{ geometry: DEFAULT_GEOMETRY, targetCount: 3, decoyCount: 10 },
	{ geometry: { width: 120, height: 90, iconSize: 34 }, targetCount: 2, decoyCount: 6 },
	{ geometry: { width: 60, height: 60, iconSize: 50 }, targetCount: 3, decoyCount: 0 },
	{ geometry: { width: 60, height: 60, iconSize: 50 }, targetCount: 1, decoyCount: 3 },
	{ geometry: { width: 400, height: 300, iconSize: 45.5 }, targetCount: 5, decoyCount: 5 },
	{ geometry: { width: 150, height: 100, iconSize: 30.25 }, targetCount: 3, decoyCount: 4 },
];

const kindIndex = (kind: GlyphKind): number => GLYPH_KINDS.indexOf(kind);

const placementBytes = (placement: IconPlacement): Buffer => {
	const out = Buffer.alloc(41);
	out.writeDoubleLE(placement.x, 0);
	out.writeDoubleLE(placement.y, 8);
	out.writeDoubleLE(placement.rotation, 16);
	out.writeDoubleLE(placement.hue, 24);
	out.writeDoubleLE(placement.size, 32);
	out.writeUInt8(kindIndex(placement.kind), 40);
	return out;
};

// Bulk layouts are hashed rather than listed to keep the file small: per seed,
// each placement as five f64 LE plus its kind index, 0xFF between targets and
// decoys, or 0xEE and the error message; then the next draw as f64 LE and 0xFE.
const placeDigestVectors = (): PlaceDigestVector[] =>
	placeConfigs.map(({ geometry, targetCount, decoyCount }) => {
		const hash = createHash("sha256");
		const seeds = 1500;
		let failures = 0;
		for (let i = 0; i < seeds; i++) {
			const prng = createPrng(seedAt(10_000 + i));
			try {
				const { targets, decoys } = placeIcons(
					prng,
					geometry,
					targetCount,
					decoyCount,
				);
				for (const placement of targets) hash.update(placementBytes(placement));
				hash.update(Buffer.from([0xff]));
				for (const placement of decoys) hash.update(placementBytes(placement));
			} catch (error) {
				failures++;
				hash.update(Buffer.from([0xee]));
				hash.update(error instanceof Error ? error.message : String(error));
			}
			const next = Buffer.alloc(8);
			next.writeDoubleLE(prng.next(), 0);
			hash.update(next);
			hash.update(Buffer.from([0xfe]));
		}
		return {
			geometry: geometryVector(geometry),
			targetCount,
			decoyCount,
			seeds,
			failures,
			sha256: hash.digest("hex"),
		};
	});

const placeVectors = (): PlaceVector[] => {
	const out: PlaceVector[] = [];
	placeConfigs.forEach(({ geometry, targetCount, decoyCount }, c) => {
		for (let k = 0; k < 2; k++) {
			const seed = seedAt(1000 + c * 10 + k);
			const prng = createPrng(seed);
			let layout: { targets: IconPlacement[]; decoys: IconPlacement[] } | undefined;
			const error = errorMessage(() => {
				layout = placeIcons(prng, geometry, targetCount, decoyCount);
			});
			out.push({
				seed: hex(seed),
				geometry: geometryVector(geometry),
				targetCount,
				decoyCount,
				...(layout
					? {
							targets: layout.targets.map(placementVector),
							decoys: layout.decoys.map(placementVector),
						}
					: { error }),
				nextAfter: bits(prng.next()),
			});
		}
	});
	return out;
};

const frameSettings: IconOrderRenderSettings[] = [
	DEFAULT_RENDER_SETTINGS,
	{ ...DEFAULT_RENDER_SETTINGS, backgroundClutter: 0 },
	{ ...DEFAULT_RENDER_SETTINGS, backgroundClutter: 20 },
	{ ...DEFAULT_RENDER_SETTINGS, targetCount: 4, decoyCount: 2 },
	{
		...DEFAULT_RENDER_SETTINGS,
		strokeWidth: 4.5,
		iconOpacity: 0.555,
		haloOpacity: 0.333,
		backgroundClutter: 2.5,
	},
	{ ...DEFAULT_RENDER_SETTINGS, targetCount: 0, decoyCount: 3 },
];

// renderIconOrder draws its own seed, so this replays its steps on a fixed one.
const frameVectors = async (): Promise<FrameVector[]> => {
	const out: FrameVector[] = [];
	let n = 0;
	for (const settings of frameSettings) {
		for (let k = 0; k < 5; k++) {
			const seed = seedAt(3000 + n);
			const prng: Prng = createPrng(seed);
			const geometry = DEFAULT_GEOMETRY;
			const { targets, decoys } = placeIcons(
				prng,
				geometry,
				settings.targetCount,
				settings.decoyCount,
			);
			captures.length = 0;
			const composite = await compositeIcons(
				prng,
				[...targets, ...decoys],
				geometry,
				settings,
			);
			const frame = takeCapture();
			const legendImage = await renderLegend(targets, LEGEND_ICON_SIZE, settings);
			const legend = takeCapture();
			const withRaster = n === 0 || n === 20;
			out.push({
				seed: hex(seed),
				geometry: geometryVector(geometry),
				settings: settingsVector(settings),
				targetKinds: targets.map((target) => target.kind),
				svgSha256: sha256(frame.svg),
				svgLength: frame.svg.length,
				...(n === 0 ? { svg: frame.svg } : {}),
				legendWidth: legendImage.width,
				legendSvgSha256: sha256(legend.svg),
				legendSvgLength: legend.svg.length,
				...(n === 0 ? { legendSvg: legend.svg } : {}),
				compositeSha256: sha256(composite.data),
				nextAfter: bits(prng.next()),
				...(withRaster
					? {
							raster: {
								frame: await toPng(frame.raster),
								legend: await toPng(legend.raster),
							},
						}
					: {}),
			});
			n++;
		}
	}
	return out;
};

const gradeVectors = (): GradeVector[] => {
	const out: GradeVector[] = [];
	const push = (
		targets: { x: number; y: number; size: number }[],
		clicks: { x: number; y: number }[],
		tolerance: number,
	): void => {
		out.push({
			targets: targets.map(({ x, y, size }) => ({
				x: bits(x),
				y: bits(y),
				size: bits(size),
			})),
			clicks: clicks.map(({ x, y }) => ({ x: bits(x), y: bits(y) })),
			tolerance: bits(tolerance),
			result: gradeClicks(targets, clicks, tolerance),
		});
	};

	push([], [], 0.6);
	push([], [{ x: 0, y: 0 }], 0.6);
	push([{ x: 10, y: 10, size: 40 }], [], 0.6);
	// Exactly on the radius (3-4-5 triangles), then one ulp either side.
	push([{ x: 100, y: 100, size: 50 }], [{ x: 115, y: 120 }], 0.5);
	push([{ x: 100, y: 100, size: 50 }], [{ x: 115, y: 120.00000000000001 }], 0.5);
	push([{ x: 100, y: 100, size: 50 }], [{ x: 115, y: 119.99999999999999 }], 0.5);
	push([{ x: 0, y: 0, size: 10 }], [{ x: 3, y: 4 }], 0.5);
	push([{ x: 0, y: 0, size: 10 }], [{ x: -3, y: -4 }], 0.5);
	push([{ x: 0, y: 0, size: 10 }], [{ x: 3, y: 4 }], 0.49999999999999994);
	push([{ x: 50, y: 50, size: 40 }], [{ x: 50, y: 50 }], 0);
	push([{ x: 50, y: 50, size: 40 }], [{ x: 50.000000000000001, y: 50 }], 0);
	push([{ x: 50, y: 50, size: 40 }], [{ x: 51, y: 50 }], -1);
	push([{ x: 1e200, y: 1e200, size: 1 }], [{ x: -1e200, y: -1e200 }], 1e300);
	push([{ x: 0, y: 0, size: 40 }], [{ x: Number.NaN, y: 0 }], 0.6);
	push([{ x: 0, y: 0, size: 40 }], [{ x: Number.POSITIVE_INFINITY, y: 0 }], 0.6);
	push([{ x: 0, y: 0, size: Number.POSITIVE_INFINITY }], [{ x: 1e300, y: 0 }], 0.6);

	const prng = createPrng(seedAt(5000));
	const tolerances = [0.6, 0.5, 0.75, 1, 0.25];
	for (let i = 0; i < 100; i++) {
		const count = prng.int(1, 5);
		const tolerance = tolerances[i % tolerances.length] ?? 0.6;
		const targets = Array.from({ length: count }, () => ({
			x: prng.range(0, 300),
			y: prng.range(0, 200),
			size: prng.range(30, 45),
		}));
		const clicks = targets.map((target, index) => {
			// The first click sits near the hit radius, so both outcomes are common.
			const reach = index === 0 ? prng.range(0.95, 1.05) : prng.range(0, 0.9);
			const radius = tolerance * target.size * reach;
			const angle = prng.range(0, Math.PI * 2);
			return {
				x: target.x + radius * Math.cos(angle),
				y: target.y + radius * Math.sin(angle),
			};
		});
		const mode = i % 10;
		if (mode === 7 && clicks.length > 1) {
			clicks.reverse();
		} else if (mode === 8) {
			clicks.pop();
		} else if (mode === 9) {
			clicks.push({ x: 0, y: 0 });
		}
		push(targets, clicks, tolerance);
	}
	return out;
};

const main = async (): Promise<void> => {
	const vectors: Vectors = {
		numberFormat: numberFormat(),
		trig: trig(),
		hypot: hypot(),
		glyphs: {
			kinds: [...GLYPH_KINDS],
			paths: GLYPH_KINDS.map((kind) => glyphPath(kind)),
		},
		shuffle: shuffleVectors(),
		collage: collageVectors(),
		place: placeVectors(),
		placeDigests: placeDigestVectors(),
		frames: await frameVectors(),
		grade: gradeVectors(),
	};
	const out = fileURLToPath(new URL("./vectors.json", import.meta.url));
	writeFileSync(out, `${JSON.stringify(vectors, null, "\t")}\n`);
};

await main();
