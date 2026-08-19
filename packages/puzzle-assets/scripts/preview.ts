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
 * Eyeball the generator.
 *
 * Writes N puzzles as PNG pairs plus a contact-sheet HTML page that lays the
 * piece over the background at its origin, so the output can be judged the way
 * a user would see it.
 *
 *   npm -w @prosopo/puzzle-assets run preview -- --count 24 --out ./preview
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { cutNotch } from "../src/compose.js";
import {
	DEFAULT_GEOMETRY,
	createBackground,
	encodePng,
	renderPuzzle,
} from "../src/index.js";
import { createNotchShape } from "../src/notch.js";
import { createPrng, createSeed } from "../src/prng.js";

interface Args {
	count: number;
	out: string;
}

const parseArgs = (argv: readonly string[]): Args => {
	const args: Args = { count: 24, out: "./preview" };
	for (let i = 0; i < argv.length; i++) {
		const flag = argv[i];
		const value = argv[i + 1];
		if (flag === "--count" && value) {
			args.count = Number.parseInt(value, 10);
			i++;
		} else if (flag === "--out" && value) {
			args.out = value;
			i++;
		}
	}
	return args;
};

// Mirrors the provider's placement ranges (puzzleTasks.ts).
const placementFor = (): {
	targetX: number;
	targetY: number;
	originX: number;
	originY: number;
} => {
	const prng = createPrng(createSeed());
	return {
		targetX: prng.int(150, 280),
		targetY: prng.int(30, 170),
		originX: prng.int(20, 130),
		originY: prng.int(30, 170),
	};
};

const main = async (): Promise<void> => {
	const { count, out } = parseArgs(process.argv.slice(2));
	const outDir = resolve(out);
	mkdirSync(outDir, { recursive: true });

	const cells: string[] = [];
	const sheetTiles: sharp.OverlayOptions[] = [];
	const sheetCols = 3;
	const sheetGap = 10;
	const started = process.hrtime.bigint();

	for (let i = 0; i < count; i++) {
		const placement = placementFor();

		// Same pipeline as renderPuzzle, but kept in PNG so the preview shows
		// the raw output rather than WebP artefacts.
		const background = createBackground(DEFAULT_GEOMETRY);
		const prng = createPrng(createSeed());
		const shape = createNotchShape(prng, DEFAULT_GEOMETRY.notchSize);
		const { background: cut, piece } = cutNotch(
			prng,
			background,
			shape,
			DEFAULT_GEOMETRY.notchSize,
			placement,
		);

		const [bgPng, piecePng] = await Promise.all([
			encodePng(cut),
			encodePng(piece),
		]);
		writeFileSync(join(outDir, `puzzle-${i}-bg.png`), bgPng);
		writeFileSync(join(outDir, `puzzle-${i}-piece.png`), piecePng);

		const half = DEFAULT_GEOMETRY.notchSize / 2;

		// Contact-sheet tile: the piece composited at its origin, so a whole
		// batch can be judged in one image rather than file by file.
		sheetTiles.push({
			input: await sharp(bgPng)
				.composite([
					{
						input: piecePng,
						left: Math.round(placement.originX - half),
						top: Math.round(placement.originY - half),
					},
				])
				.png()
				.toBuffer(),
			left: (i % sheetCols) * (DEFAULT_GEOMETRY.width + sheetGap),
			top: Math.floor(i / sheetCols) * (DEFAULT_GEOMETRY.height + sheetGap),
		});
		cells.push(`
	<figure>
		<div class="stage">
			<img class="bg" src="puzzle-${i}-bg.png" alt="">
			<img class="piece" style="left:${placement.originX - half}px;top:${placement.originY - half}px" src="puzzle-${i}-piece.png" alt="">
		</div>
		<figcaption>#${i} &middot; target ${placement.targetX},${placement.targetY}</figcaption>
	</figure>`);
	}

	const sheetRows = Math.ceil(count / sheetCols);
	writeFileSync(
		join(outDir, "sheet.png"),
		await sharp({
			create: {
				width: sheetCols * DEFAULT_GEOMETRY.width + (sheetCols - 1) * sheetGap,
				height:
					sheetRows * DEFAULT_GEOMETRY.height + (sheetRows - 1) * sheetGap,
				channels: 4,
				background: { r: 20, g: 22, b: 28, alpha: 1 },
			},
		})
			.composite(sheetTiles)
			.png()
			.toBuffer(),
	);

	// Timing for the real (WebP) path, which is what the provider will run.
	const benchStart = process.hrtime.bigint();
	const benchRuns = 20;
	for (let i = 0; i < benchRuns; i++) {
		await renderPuzzle(createBackground(), { targetX: 200, targetY: 100 });
	}
	const perRenderMs =
		Number(process.hrtime.bigint() - benchStart) / 1e6 / benchRuns;

	writeFileSync(
		join(outDir, "index.html"),
		`<!doctype html>
<meta charset="utf-8">
<title>puzzle-assets preview</title>
<style>
	body { background:#14161c; color:#e7e9ee; font:14px/1.5 ui-sans-serif,system-ui,sans-serif; margin:24px; }
	h1 { font-size:16px; font-weight:600; margin:0 0 4px; }
	p { color:#9aa1ad; margin:0 0 24px; }
	.grid { display:flex; flex-wrap:wrap; gap:20px; }
	figure { margin:0; }
	.stage { position:relative; width:${DEFAULT_GEOMETRY.width}px; height:${DEFAULT_GEOMETRY.height}px; border-radius:8px; overflow:hidden; }
	.bg { display:block; width:100%; height:100%; }
	.piece { position:absolute; width:${DEFAULT_GEOMETRY.notchSize}px; height:${DEFAULT_GEOMETRY.notchSize}px; }
	figcaption { color:#9aa1ad; font-size:12px; margin-top:6px; }
</style>
<h1>puzzle-assets preview &mdash; ${count} samples</h1>
<p>Piece shown at its origin. WebP render: ${perRenderMs.toFixed(1)} ms per puzzle.</p>
<div class="grid">${cells.join("")}
</div>
`,
	);

	const totalMs = Number(process.hrtime.bigint() - started) / 1e6;
	console.log(`wrote ${count} puzzles to ${outDir}`);
	console.log(`open ${join(outDir, "index.html")}`);
	console.log(
		`render cost: ${perRenderMs.toFixed(1)} ms/puzzle (webp), preview total ${totalMs.toFixed(0)} ms`,
	);
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
