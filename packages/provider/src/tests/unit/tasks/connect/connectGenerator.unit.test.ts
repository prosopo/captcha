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

import { EMPTY, parseBoard } from "@prosopo/connect-assets";
import { CaptchaType } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import {
	downgradeConnectIfUnavailable,
	generateConnectBoard,
	isConnectRenderAvailable,
	renderConnectTiles,
	resolveConnectSettings,
} from "../../../../tasks/connect/connectGenerator.js";

describe("resolveConnectSettings", () => {
	it("falls back to the asset defaults when nothing overrides", () => {
		expect(resolveConnectSettings()).toEqual({
			geometry: { boardSize: 5, lineLength: 5 },
			board: { iconCount: 4, decoyCount: 4, nearMissCount: 1 },
		});
	});

	it("ignores undefined override sources", () => {
		expect(resolveConnectSettings(undefined, undefined)).toEqual(
			resolveConnectSettings(),
		);
	});

	it("applies a partial override without disturbing the rest", () => {
		const resolved = resolveConnectSettings({ decoyCount: 9 });
		expect(resolved.board.decoyCount).toBe(9);
		expect(resolved.board.iconCount).toBe(4);
		expect(resolved.geometry).toEqual({ boardSize: 5, lineLength: 5 });
	});

	it("lets a later source win, field by field", () => {
		const resolved = resolveConnectSettings(
			{ boardSize: 6, decoyCount: 2 },
			{ boardSize: 7 },
		);
		expect(resolved.geometry.boardSize).toBe(7);
		// decoyCount came from the earlier source and must survive.
		expect(resolved.board.decoyCount).toBe(2);
	});

	it("clamps a line that a later override made longer than the board", () => {
		// Each source is individually valid; only their combination is not.
		// Left unclamped this reaches the generator and throws on every
		// challenge, taking the site's captcha down.
		const resolved = resolveConnectSettings(
			{ lineLength: 5 },
			{ boardSize: 4 },
		);
		expect(resolved.geometry).toEqual({ boardSize: 4, lineLength: 4 });
	});
});

describe("generateConnectBoard", () => {
	it("returns a serialised board with the solution marked", () => {
		const layout = generateConnectBoard(resolveConnectSettings());
		expect(layout.board).toHaveLength(25);
		expect(layout.boardSize).toBe(5);
		expect(layout.lineLength).toBe(5);
		expect(layout.iconCount).toBe(4);

		const cells = parseBoard(layout.board);
		expect(cells[layout.solutionTargetIndex]).toBe(EMPTY);
		expect(cells[layout.solutionSourceIndex]).not.toBe(EMPTY);
	});

	it("honours a configured geometry", () => {
		const layout = generateConnectBoard(
			resolveConnectSettings({ boardSize: 7, lineLength: 4 }),
		);
		expect(layout.board).toHaveLength(49);
		expect(layout.boardSize).toBe(7);
		expect(layout.lineLength).toBe(4);
	});

	it("produces a different board each call", () => {
		const settings = resolveConnectSettings();
		const boards = new Set(
			Array.from({ length: 8 }, () => generateConnectBoard(settings).board),
		);
		expect(boards.size).toBeGreaterThan(1);
	});
});

describe("renderConnectTiles", () => {
	it("renders one data-uri tile per occupied cell", async () => {
		const settings = resolveConnectSettings();
		const layout = generateConnectBoard(settings);
		const rendered = await renderConnectTiles(
			layout.board,
			settings.geometry,
			layout.iconCount,
		);

		const occupied = parseBoard(layout.board).filter(
			(icon) => icon !== EMPTY,
		).length;
		expect(rendered.tiles).toHaveLength(occupied);
		expect(rendered.tileSize).toBeGreaterThan(0);
		for (const tile of rendered.tiles) {
			expect(tile.image.startsWith("data:image/webp;base64,")).toBe(true);
			expect(tile.index).toBeGreaterThanOrEqual(0);
			expect(tile.index).toBeLessThan(layout.board.length);
		}
	});

	it("never renders a tile on the cell the answer goes in", async () => {
		const settings = resolveConnectSettings();
		const layout = generateConnectBoard(settings);
		const rendered = await renderConnectTiles(
			layout.board,
			settings.geometry,
			layout.iconCount,
		);
		expect(
			rendered.tiles.some((tile) => tile.index === layout.solutionTargetIndex),
		).toBe(false);
	});
});

describe("downgradeConnectIfUnavailable", () => {
	it("reports rendering as available", () => {
		// Boards are synthesised in-process; there is no asset to be missing.
		expect(isConnectRenderAvailable()).toBe(true);
	});

	it("leaves connect alone while rendering is available", () => {
		expect(downgradeConnectIfUnavailable(CaptchaType.connect)).toBe(
			CaptchaType.connect,
		);
	});

	it("passes other captcha types through untouched", () => {
		expect(downgradeConnectIfUnavailable(CaptchaType.pow)).toBe(CaptchaType.pow);
		expect(downgradeConnectIfUnavailable(CaptchaType.image)).toBe(
			CaptchaType.image,
		);
		expect(downgradeConnectIfUnavailable(CaptchaType.puzzle)).toBe(
			CaptchaType.puzzle,
		);
	});
});
