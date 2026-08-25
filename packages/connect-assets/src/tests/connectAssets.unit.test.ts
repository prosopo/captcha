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
	type BoardGeometry,
	DEFAULT_BOARD_SETTINGS,
	DEFAULT_GEOMETRY,
	DEFAULT_RENDER_SETTINGS,
	EMPTY,
	GLYPH_FAMILIES,
	createGlyph,
	createIconSpecs,
	createPrng,
	createSeed,
	createTileJitter,
	createTilePalettes,
	enumerateLines,
	generateBoard,
	hasLine,
	isWinningMove,
	parseBoard,
	pickGlyphFamilies,
	renderBoard,
	renderTileSvg,
	serialiseBoard,
	winningMoves,
} from "../index.js";

const SEED_A = Buffer.from("0123456789abcdef", "utf-8");
const SEED_B = Buffer.from("fedcba9876543210", "utf-8");

describe("prng", () => {
	it("is deterministic for a given seed", () => {
		const a = createPrng(SEED_A);
		const b = createPrng(SEED_A);
		expect([a.next(), a.next(), a.next()]).toEqual([
			b.next(),
			b.next(),
			b.next(),
		]);
	});

	it("diverges for different seeds", () => {
		expect(createPrng(SEED_A).next()).not.toBe(createPrng(SEED_B).next());
	});

	it("rejects a seed shorter than 128 bits", () => {
		expect(() => createPrng(Buffer.alloc(8))).toThrow(/at least 16 bytes/);
	});

	it("issues 128-bit seeds", () => {
		expect(createSeed().length).toBe(16);
	});

	it("shuffles without dropping or duplicating members", () => {
		const prng = createPrng(SEED_A);
		const input = [0, 1, 2, 3, 4, 5, 6, 7];
		const shuffled = prng.shuffle(input);
		expect([...shuffled].sort((a, b) => a - b)).toEqual(input);
		// The input must not be mutated — callers rely on reusing it.
		expect(input).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
	});
});

describe("enumerateLines", () => {
	it("covers rows, columns and both diagonals", () => {
		// 3x3 with lines of 3: 3 rows + 3 columns + 2 diagonals.
		const lines = enumerateLines({ boardSize: 3, lineLength: 3 });
		expect(lines).toHaveLength(8);
		expect(lines).toContainEqual([0, 1, 2]);
		expect(lines).toContainEqual([0, 3, 6]);
		expect(lines).toContainEqual([0, 4, 8]);
		expect(lines).toContainEqual([2, 4, 6]);
	});

	it("slides shorter lines along each axis", () => {
		// 4x4 with lines of 3: 4 rows x 2 offsets, same for columns,
		// then 2x2 starting cells for each diagonal direction.
		const lines = enumerateLines({ boardSize: 4, lineLength: 3 });
		expect(lines).toHaveLength(8 + 8 + 4 + 4);
	});

	it("returns nothing when the line cannot fit", () => {
		expect(enumerateLines({ boardSize: 3, lineLength: 4 })).toEqual([]);
	});

	it("only ever references cells on the board", () => {
		const geometry: BoardGeometry = { boardSize: 5, lineLength: 4 };
		for (const line of enumerateLines(geometry)) {
			for (const index of line) {
				expect(index).toBeGreaterThanOrEqual(0);
				expect(index).toBeLessThan(geometry.boardSize ** 2);
			}
		}
	});
});

describe("hasLine", () => {
	const geometry: BoardGeometry = { boardSize: 3, lineLength: 3 };
	const lines = enumerateLines(geometry);

	it("finds a completed row", () => {
		expect(
			hasLine([1, 1, 1, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY], lines),
		).toBe(true);
	});

	it("finds a completed diagonal", () => {
		expect(
			hasLine([2, EMPTY, EMPTY, EMPTY, 2, EMPTY, EMPTY, EMPTY, 2], lines),
		).toBe(true);
	});

	it("does not treat a run of empties as a line", () => {
		expect(hasLine(new Array(9).fill(EMPTY), lines)).toBe(false);
	});

	it("does not match a mixed run", () => {
		expect(
			hasLine([0, 1, 0, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY], lines),
		).toBe(false);
	});
});

describe("winningMoves", () => {
	const geometry: BoardGeometry = { boardSize: 3, lineLength: 3 };
	const lines = enumerateLines(geometry);

	it("finds the single move that completes a row", () => {
		//  0 0 .
		//  . . .
		//  0 . .
		const board = [0, 0, EMPTY, EMPTY, EMPTY, EMPTY, 0, EMPTY, EMPTY];
		expect(winningMoves(board, lines)).toContainEqual({ from: 6, to: 2 });
	});

	it("returns nothing when no single move can finish a line", () => {
		const board = [0, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY];
		expect(winningMoves(board, lines)).toEqual([]);
	});
});

describe("isWinningMove", () => {
	const geometry: BoardGeometry = { boardSize: 3, lineLength: 3 };
	const board = [0, 0, EMPTY, EMPTY, EMPTY, EMPTY, 0, EMPTY, EMPTY];

	it("accepts the completing move", () => {
		expect(isWinningMove(board, geometry, { from: 6, to: 2 })).toBe(true);
	});

	it("rejects a move onto an occupied cell", () => {
		expect(isWinningMove(board, geometry, { from: 6, to: 0 })).toBe(false);
	});

	it("rejects picking up an empty cell", () => {
		expect(isWinningMove(board, geometry, { from: 4, to: 2 })).toBe(false);
	});

	it("rejects a move that does not complete a line", () => {
		expect(isWinningMove(board, geometry, { from: 6, to: 5 })).toBe(false);
	});

	it("rejects out-of-range and non-integer indices", () => {
		expect(isWinningMove(board, geometry, { from: -1, to: 2 })).toBe(false);
		expect(isWinningMove(board, geometry, { from: 6, to: 99 })).toBe(false);
		expect(isWinningMove(board, geometry, { from: 1.5, to: 2 })).toBe(false);
		expect(isWinningMove(board, geometry, { from: Number.NaN, to: 2 })).toBe(
			false,
		);
	});
});

describe("generateBoard", () => {
	// Enough repetitions that a rare bad layout would show up, without making
	// the suite slow — the generator is pure arithmetic.
	const RUNS = 60;

	it("always yields a board with exactly one winning move", () => {
		for (let i = 0; i < RUNS; i++) {
			const layout = generateBoard(createPrng(createSeed()));
			const lines = enumerateLines(layout);
			expect(hasLine(layout.board, lines)).toBe(false);
			expect(winningMoves(layout.board, lines)).toEqual([layout.solution]);
		}
	});

	it("reports a solution that actually wins", () => {
		for (let i = 0; i < RUNS; i++) {
			const layout = generateBoard(createPrng(createSeed()));
			expect(isWinningMove(layout.board, layout, layout.solution)).toBe(true);
		}
	});

	it("never places a tile on the target cell", () => {
		for (let i = 0; i < RUNS; i++) {
			const layout = generateBoard(createPrng(createSeed()));
			expect(layout.board[layout.solution.to]).toBe(EMPTY);
			expect(layout.board[layout.solution.from]).not.toBe(EMPTY);
		}
	});

	it("stays within the declared icon count", () => {
		const settings = { ...DEFAULT_BOARD_SETTINGS, iconCount: 3 };
		for (let i = 0; i < RUNS; i++) {
			const layout = generateBoard(
				createPrng(createSeed()),
				DEFAULT_GEOMETRY,
				settings,
			);
			for (const icon of layout.board) {
				if (icon === EMPTY) continue;
				expect(icon).toBeGreaterThanOrEqual(0);
				expect(icon).toBeLessThan(settings.iconCount);
			}
		}
	});

	it("is reproducible from its seed", () => {
		const a = generateBoard(createPrng(SEED_A));
		const b = generateBoard(createPrng(SEED_A));
		expect(a.board).toEqual(b.board);
		expect(a.solution).toEqual(b.solution);
	});

	it("produces a different board for a different seed", () => {
		const a = generateBoard(createPrng(SEED_A));
		const b = generateBoard(createPrng(SEED_B));
		expect(a.board).not.toEqual(b.board);
	});

	it("handles the alternative geometries operators can configure", () => {
		const geometries: BoardGeometry[] = [
			{ boardSize: 4, lineLength: 3 },
			{ boardSize: 6, lineLength: 4 },
			{ boardSize: 7, lineLength: 5 },
			{ boardSize: 9, lineLength: 5 },
		];
		for (const geometry of geometries) {
			const layout = generateBoard(createPrng(createSeed()), geometry);
			expect(layout.board).toHaveLength(geometry.boardSize ** 2);
			expect(winningMoves(layout.board, enumerateLines(geometry))).toEqual([
				layout.solution,
			]);
		}
	});

	it("rejects a geometry whose line cannot fit", () => {
		expect(() =>
			generateBoard(createPrng(SEED_A), { boardSize: 4, lineLength: 5 }),
		).toThrow(/exceeds boardSize/);
	});

	it("rejects a degenerate line length", () => {
		expect(() =>
			generateBoard(createPrng(SEED_A), { boardSize: 5, lineLength: 2 }),
		).toThrow(/at least 3/);
	});
});

describe("board serialisation", () => {
	it("round-trips", () => {
		const layout = generateBoard(createPrng(SEED_A));
		expect(parseBoard(serialiseBoard(layout.board))).toEqual(layout.board);
	});

	it("uses one character per cell", () => {
		const layout = generateBoard(createPrng(SEED_A));
		expect(serialiseBoard(layout.board)).toHaveLength(layout.board.length);
	});

	it("marks empty cells with a dot", () => {
		expect(serialiseBoard([EMPTY, 0, 1])).toBe(".01");
	});
});

describe("pickGlyphFamilies", () => {
	it("returns the requested number of distinct families", () => {
		for (let i = 0; i < 40; i++) {
			const families = pickGlyphFamilies(createPrng(createSeed()), 4);
			expect(families).toHaveLength(4);
			expect(new Set(families).size).toBe(4);
		}
	});

	it("never pairs two four-sided silhouettes on one board", () => {
		for (let i = 0; i < 60; i++) {
			const families = pickGlyphFamilies(createPrng(createSeed()), 4);
			expect(families.includes("diamond") && families.includes("square")).toBe(
				false,
			);
		}
	});

	it("never pairs a triangle with a chevron on one board", () => {
		for (let i = 0; i < 60; i++) {
			const families = pickGlyphFamilies(createPrng(createSeed()), 4);
			expect(
				families.includes("triangle") && families.includes("chevron"),
			).toBe(false);
		}
	});

	it("refuses to invent families it does not have", () => {
		expect(() =>
			pickGlyphFamilies(createPrng(SEED_A), GLYPH_FAMILIES.length + 1),
		).toThrow(/only \d+ exist/);
	});
});

describe("createGlyph", () => {
	it("produces a non-empty path for every family", () => {
		for (const family of GLYPH_FAMILIES) {
			const glyph = createGlyph(family, 0);
			expect(glyph.d.length).toBeGreaterThan(0);
			expect(glyph.d).toMatch(/^M/);
		}
	});

	it("emits no NaN coordinates for any rotation", () => {
		for (const family of GLYPH_FAMILIES) {
			for (const rotation of [0, 37, 90, 180, 271, 359]) {
				expect(createGlyph(family, rotation).d).not.toMatch(/NaN/);
			}
		}
	});
});

describe("createTilePalettes", () => {
	it("keeps hues far apart", () => {
		for (let i = 0; i < 40; i++) {
			const palettes = createTilePalettes(createPrng(createSeed()), 4);
			const hues = palettes
				.map((p) => ((p.hue % 360) + 360) % 360)
				.sort((a, b) => a - b);
			for (let j = 0; j < hues.length; j++) {
				const current = hues[j] ?? 0;
				const next = hues[(j + 1) % hues.length] ?? 0;
				const gap =
					j === hues.length - 1 ? next + 360 - current : next - current;
				// 360/4 slice, +/-14 jitter each side, so the worst case is 62.
				expect(gap).toBeGreaterThan(60);
			}
		}
	});

	it("rejects a non-positive count", () => {
		expect(() => createTilePalettes(createPrng(SEED_A), 0)).toThrow(
			/must be positive/,
		);
	});
});

describe("renderTileSvg", () => {
	const specsFor = (count: number) => {
		const prng = createPrng(SEED_A);
		return {
			prng,
			icons: createIconSpecs(
				prng,
				pickGlyphFamilies(prng, count),
				createTilePalettes(prng, count),
			),
		};
	};

	it("emits well-formed standalone svg", () => {
		const { prng, icons } = specsFor(4);
		const icon = icons[0];
		if (!icon) throw new Error("expected an icon spec");
		const svg = renderTileSvg(
			icon,
			createTileJitter(prng, DEFAULT_RENDER_SETTINGS),
		);
		expect(svg.startsWith("<svg xmlns=")).toBe(true);
		expect(svg.endsWith("</svg>")).toBe(true);
		expect(svg).not.toMatch(/NaN|undefined/);
	});

	it("gives every tile its own gradient ids", () => {
		// Two tiles inlined into one document must not share `url(#...)`
		// targets, or the second renders in the first one's colours.
		const { prng, icons } = specsFor(4);
		const icon = icons[0];
		if (!icon) throw new Error("expected an icon spec");
		const first = renderTileSvg(
			icon,
			createTileJitter(prng, DEFAULT_RENDER_SETTINGS),
		);
		const second = renderTileSvg(
			icon,
			createTileJitter(prng, DEFAULT_RENDER_SETTINGS),
		);
		const idOf = (svg: string): string => {
			const match = svg.match(/<linearGradient id="(c[^"]+)"/);
			if (!match?.[1]) throw new Error("no chip gradient id found");
			return match[1];
		};
		expect(idOf(first)).not.toBe(idOf(second));
	});

	it("honours the configured tile size", () => {
		const { prng, icons } = specsFor(4);
		const icon = icons[0];
		if (!icon) throw new Error("expected an icon spec");
		const settings = { ...DEFAULT_RENDER_SETTINGS, tileSize: 64 };
		const svg = renderTileSvg(icon, createTileJitter(prng, settings), settings);
		expect(svg).toContain('width="64" height="64"');
		// The drawing box is fixed regardless of output size.
		expect(svg).toContain('viewBox="0 0 100 100"');
	});

	it("rejects a palette/family count mismatch", () => {
		const prng = createPrng(SEED_A);
		expect(() =>
			createIconSpecs(
				prng,
				pickGlyphFamilies(prng, 3),
				createTilePalettes(prng, 2),
			),
		).toThrow(/count mismatch/);
	});
});

describe("renderBoard", () => {
	it("renders one webp per occupied cell and nothing for the gaps", async () => {
		const layout = generateBoard(createPrng(SEED_A));
		const rendered = await renderBoard(layout.board, layout);
		const occupied = layout.board.filter((icon) => icon !== EMPTY).length;
		expect(rendered.tiles).toHaveLength(occupied);
		const indices = rendered.tiles
			.map((tile) => tile.index)
			.sort((a, b) => a - b);
		expect(indices).toEqual(
			layout.board.flatMap((icon, index) => (icon === EMPTY ? [] : [index])),
		);
	});

	it("emits real webp bytes", async () => {
		const layout = generateBoard(createPrng(SEED_A));
		const rendered = await renderBoard(layout.board, layout);
		for (const tile of rendered.tiles) {
			expect(tile.webp.length).toBeGreaterThan(0);
			// RIFF....WEBP
			expect(tile.webp.subarray(0, 4).toString("ascii")).toBe("RIFF");
			expect(tile.webp.subarray(8, 12).toString("ascii")).toBe("WEBP");
		}
	});

	it("never emits two byte-identical tiles", async () => {
		// Per-tile jitter is the whole defence against a solver grouping tiles
		// by hash instead of by sight.
		const layout = generateBoard(createPrng(createSeed()));
		const rendered = await renderBoard(layout.board, layout);
		const digests = new Set(
			rendered.tiles.map((tile) => tile.webp.toString("base64")),
		);
		expect(digests.size).toBe(rendered.tiles.length);
	});

	it("stays small enough to inline as data uris", async () => {
		const layout = generateBoard(createPrng(createSeed()));
		const rendered = await renderBoard(layout.board, layout);
		const total = rendered.tiles.reduce(
			(sum, tile) => sum + tile.webp.length,
			0,
		);
		// Base64 inflates by 4/3. The budget is the same order as the slider
		// puzzle's background + piece pair, which is the bar a new captcha
		// type has to meet to be routable in place of it.
		expect((total * 4) / 3).toBeLessThan(56 * 1024);
	});

	it("rejects a board that references an icon it was not given", async () => {
		await expect(
			renderBoard(
				[0, 9, EMPTY, EMPTY],
				{ boardSize: 2, lineLength: 3 },
				undefined,
				2,
			),
		).rejects.toThrow(/references icon 9/);
	});
});
