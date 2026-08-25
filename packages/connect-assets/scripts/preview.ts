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
 * Renders N boards to a contact-sheet HTML page laid out the way the widget
 * lays them out, with the winning move marked, so the output can be judged as
 * a user would see it.
 *
 *   npm -w @prosopo/connect-assets run preview -- --count 8 --out ./preview
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
	DEFAULT_BOARD_SETTINGS,
	DEFAULT_GEOMETRY,
	DEFAULT_RENDER_SETTINGS,
	EMPTY,
	createIconSpecs,
	createPrng,
	createSeed,
	createTileJitter,
	createTilePalettes,
	generateBoard,
	pickGlyphFamilies,
	renderTileSvg,
} from "../src/index.js";

interface Args {
	count: number;
	out: string;
	boardSize: number;
	lineLength: number;
}

const parseArgs = (argv: readonly string[]): Args => {
	const args: Args = {
		count: 8,
		out: "./preview",
		boardSize: DEFAULT_GEOMETRY.boardSize,
		lineLength: DEFAULT_GEOMETRY.lineLength,
	};
	for (let i = 0; i < argv.length; i++) {
		const flag = argv[i];
		const value = argv[i + 1];
		if (!value) continue;
		if (flag === "--count") {
			args.count = Number.parseInt(value, 10);
			i++;
		} else if (flag === "--out") {
			args.out = value;
			i++;
		} else if (flag === "--board") {
			args.boardSize = Number.parseInt(value, 10);
			i++;
		} else if (flag === "--line") {
			args.lineLength = Number.parseInt(value, 10);
			i++;
		}
	}
	return args;
};

const args = parseArgs(process.argv.slice(2));
const outDir = resolve(args.out);
mkdirSync(outDir, { recursive: true });

const geometry = {
	boardSize: args.boardSize,
	lineLength: args.lineLength,
};

const sections: string[] = [];

for (let n = 0; n < args.count; n++) {
	const prng = createPrng(createSeed());
	const layout = generateBoard(prng, geometry, DEFAULT_BOARD_SETTINGS);

	const renderPrng = createPrng(createSeed());
	const families = pickGlyphFamilies(
		renderPrng,
		DEFAULT_BOARD_SETTINGS.iconCount,
	);
	const palettes = createTilePalettes(
		renderPrng,
		DEFAULT_BOARD_SETTINGS.iconCount,
	);
	const icons = createIconSpecs(renderPrng, families, palettes);

	const cells: string[] = [];
	for (let index = 0; index < layout.board.length; index++) {
		const iconIndex = layout.board[index];
		if (iconIndex === undefined || iconIndex === EMPTY) {
			const marker = index === layout.solution.to ? " target" : "";
			cells.push(`<div class="cell empty${marker}"></div>`);
			continue;
		}
		const icon = icons[iconIndex];
		if (!icon) throw new Error("preview: missing icon spec");
		const svg = renderTileSvg(
			icon,
			createTileJitter(renderPrng, DEFAULT_RENDER_SETTINGS),
			DEFAULT_RENDER_SETTINGS,
		);
		const source = index === layout.solution.from ? " source" : "";
		cells.push(`<div class="cell${source}">${svg}</div>`);
	}

	sections.push(`
		<figure>
			<div class="board" style="--n:${geometry.boardSize}">${cells.join("")}</div>
			<figcaption>drag <b>${layout.solution.from}</b> &rarr; <b>${layout.solution.to}</b></figcaption>
		</figure>`);
}

const html = `<!doctype html>
<meta charset="utf-8">
<title>connect-assets preview</title>
<style>
	:root { color-scheme: light dark; }
	body {
		margin: 0; padding: 32px;
		font: 14px/1.5 ui-sans-serif, system-ui, sans-serif;
		background: #12131a; color: #e7e8ee;
		display: flex; flex-wrap: wrap; gap: 32px;
	}
	figure { margin: 0; }
	.board {
		display: grid;
		grid-template-columns: repeat(var(--n), 56px);
		gap: 6px;
		padding: 14px;
		border-radius: 18px;
		background: #1c1e29;
		box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);
	}
	.cell { width: 56px; height: 56px; border-radius: 14px; }
	.cell svg { width: 100%; height: 100%; display: block; }
	.cell.empty { background: rgba(255,255,255,.035); box-shadow: inset 0 0 0 1px rgba(255,255,255,.05); }
	.cell.empty.target { outline: 2px dashed #4ade80; outline-offset: -3px; }
	.cell.source { outline: 2px solid #facc15; outline-offset: 2px; border-radius: 16px; }
	figcaption { margin-top: 10px; opacity: .7; text-align: center; }
</style>
${sections.join("\n")}
`;

const file = join(outDir, "index.html");
writeFileSync(file, html);
console.log(`wrote ${args.count} boards to ${file}`);
