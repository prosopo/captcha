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

import type { ConnectEvent, ConnectTile } from "@prosopo/types";
import { type Theme, lightTheme } from "@prosopo/widget-skeleton";
import { type ReactElement, act, createElement } from "react";
import { type Root, createRoot } from "react-dom/client";
import {
	type Mock,
	afterEach,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import { ConnectBoard, cellSizeFor } from "../components/ConnectBoard.js";

/**
 * The board is the only piece of the connect flow the user actually touches:
 * it owns tile selection, the drag, the drop-target rules, and the trail of
 * positions the provider records alongside the move. Every test drives real
 * DOM events against a real render rather than calling handlers directly.
 */

const BOARD_SIZE = 5;
const CELL = cellSizeFor(BOARD_SIZE);
const GAP = 6;
const PADDING = 14;

// A 5x5 board with tiles on 0, 1, 2, 3 and 24. Cell 4 is the gap that
// completes the top row; every other cell is empty.
const TILE_INDICES = [0, 1, 2, 3, 24];

const tiles = (indices: number[] = TILE_INDICES): ConnectTile[] =>
	indices.map((index) => ({
		index,
		image: "data:image/webp;base64,UklGRg==",
	}));

interface BoardProps {
	boardSize: number;
	tiles: ConnectTile[];
	onComplete: Mock<
		(source: number, target: number, events: ConnectEvent[]) => void
	>;
	showRetry: boolean;
	submitting: boolean;
	theme: Theme;
	instruction: string;
	retryText: string;
}

let container: HTMLDivElement;
let root: Root;
let onComplete: Mock<
	(source: number, target: number, events: ConnectEvent[]) => void
>;

const props = (overrides: Partial<BoardProps> = {}): BoardProps => ({
	boardSize: BOARD_SIZE,
	tiles: tiles(),
	onComplete,
	showRetry: false,
	submitting: false,
	theme: lightTheme,
	instruction: "Drag a tile to line up 5 identical tiles in a row",
	retryText: "Not quite — try again",
	...overrides,
});

const render = (boardProps: BoardProps): void => {
	act(() => {
		root.render(createElement(ConnectBoard, boardProps) as ReactElement);
	});
};

const grid = (): HTMLElement => {
	const element = container.querySelector<HTMLElement>('[role="grid"]');
	if (!element) throw new Error("expected the board to be rendered");
	return element;
};

const cells = (): HTMLElement[] =>
	Array.from(container.querySelectorAll<HTMLElement>('[role="gridcell"]'));

const cell = (index: number): HTMLElement => {
	const element = cells()[index];
	if (!element) throw new Error(`expected a cell at ${index}`);
	return element;
};

/**
 * jsdom gives every element a zero-size rect, so the component's coordinate
 * maths would divide by zero. Stub the board and cell rects with the geometry
 * the real layout produces.
 */
const stubRects = (): void => {
	grid().getBoundingClientRect = () =>
		({
			x: 0,
			y: 0,
			left: 0,
			top: 0,
			width: PADDING * 2 + CELL * BOARD_SIZE + GAP * (BOARD_SIZE - 1),
			height: PADDING * 2 + CELL * BOARD_SIZE + GAP * (BOARD_SIZE - 1),
		}) as DOMRect;
	cells().forEach((element, index) => {
		const row = Math.floor(index / BOARD_SIZE);
		const col = index % BOARD_SIZE;
		const left = PADDING + col * (CELL + GAP);
		const top = PADDING + row * (CELL + GAP);
		element.getBoundingClientRect = () =>
			({ x: left, y: top, left, top, width: CELL, height: CELL }) as DOMRect;
	});
};

/** Centre of a cell, in the stubbed viewport coordinates. */
const centreOf = (index: number): { x: number; y: number } => {
	const row = Math.floor(index / BOARD_SIZE);
	const col = index % BOARD_SIZE;
	return {
		x: PADDING + col * (CELL + GAP) + CELL / 2,
		y: PADDING + row * (CELL + GAP) + CELL / 2,
	};
};

const pointer = (
	type: string,
	target: HTMLElement,
	at: { x: number; y: number },
): void => {
	act(() => {
		// jsdom has no PointerEvent constructor, so carry the fields the
		// component reads on a MouseEvent, which React routes to the same
		// onPointerX handlers.
		const event = new MouseEvent(type, {
			bubbles: true,
			cancelable: true,
			clientX: at.x,
			clientY: at.y,
		});
		target.dispatchEvent(event);
	});
};

const pressTile = (index: number): void => {
	// setPointerCapture does not exist in jsdom.
	cell(index).setPointerCapture = () => {};
	pointer("pointerdown", cell(index), centreOf(index));
};

const moveTo = (index: number): void =>
	pointer("pointermove", grid(), centreOf(index));

const releaseOver = (index: number): void =>
	pointer("pointerup", grid(), centreOf(index));

beforeEach(() => {
	container = document.createElement("div");
	document.body.appendChild(container);
	act(() => {
		root = createRoot(container);
	});
	onComplete = vi.fn();
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
	vi.restoreAllMocks();
});

describe("cellSizeFor", () => {
	test("sizes a default board to fit the widget", () => {
		expect(cellSizeFor(5)).toBeGreaterThanOrEqual(34);
		expect(cellSizeFor(5)).toBeLessThanOrEqual(56);
	});

	test("never shrinks tiles below the legibility floor", () => {
		// A 9x9 board would compute ~27px without the clamp, which is too
		// small to tell the silhouettes apart on a phone.
		expect(cellSizeFor(9)).toBe(34);
	});

	test("never grows a tiny board past the ceiling", () => {
		expect(cellSizeFor(4)).toBeLessThanOrEqual(56);
	});
});

describe("ConnectBoard rendering", () => {
	test("renders one cell per board square", () => {
		render(props());
		expect(cells()).toHaveLength(BOARD_SIZE * BOARD_SIZE);
	});

	test("renders a tile image only on occupied cells", () => {
		render(props());
		for (let index = 0; index < BOARD_SIZE * BOARD_SIZE; index++) {
			const hasImage = cell(index).querySelector("img") !== null;
			expect(hasImage).toBe(TILE_INDICES.includes(index));
		}
	});

	test("labels occupied and empty cells distinctly for screen readers", () => {
		render(props());
		expect(cell(0).getAttribute("aria-label")).toBe("Tile, row 1 column 1");
		expect(cell(4).getAttribute("aria-label")).toBe(
			"Empty space, row 1 column 5",
		);
	});

	test("shows the instruction, and the retry copy when a move failed", () => {
		render(props());
		expect(container.textContent).toContain("line up 5 identical tiles");
		render(props({ showRetry: true }));
		expect(container.textContent).toContain("Not quite");
	});

	test("exposes the board as a grid of the right shape", () => {
		render(props());
		expect(grid().getAttribute("aria-rowcount")).toBe(String(BOARD_SIZE));
		expect(grid().getAttribute("aria-colcount")).toBe(String(BOARD_SIZE));
	});
});

describe("dragging a tile", () => {
	test("reports the move when a tile is dropped on an empty cell", () => {
		render(props());
		stubRects();
		pressTile(3);
		moveTo(4);
		releaseOver(4);
		expect(onComplete).toHaveBeenCalledTimes(1);
		expect(onComplete.mock.calls[0]?.[0]).toBe(3);
		expect(onComplete.mock.calls[0]?.[1]).toBe(4);
	});

	test("records a drag trail in normalised board coordinates", () => {
		render(props());
		stubRects();
		pressTile(0);
		moveTo(2);
		moveTo(4);
		releaseOver(4);
		const events = onComplete.mock.calls[0]?.[2] ?? [];
		expect(events.length).toBeGreaterThanOrEqual(3);
		for (const event of events) {
			expect(event.x).toBeGreaterThanOrEqual(0);
			expect(event.x).toBeLessThanOrEqual(1);
			expect(event.y).toBeGreaterThanOrEqual(0);
			expect(event.y).toBeLessThanOrEqual(1);
			expect(event.t).toBeGreaterThanOrEqual(0);
		}
		// The trail has to move across the board, not sit on one point.
		expect(new Set(events.map((e) => e.x)).size).toBeGreaterThan(1);
	});

	test("refuses to drop a tile onto an occupied cell", () => {
		render(props());
		stubRects();
		pressTile(3);
		moveTo(0);
		releaseOver(0);
		expect(onComplete).not.toHaveBeenCalled();
	});

	test("cancels a drag released outside the board", () => {
		render(props());
		stubRects();
		pressTile(3);
		pointer("pointermove", grid(), { x: 9999, y: 9999 });
		pointer("pointerup", grid(), { x: 9999, y: 9999 });
		expect(onComplete).not.toHaveBeenCalled();
	});

	test("ignores a press on an empty cell", () => {
		render(props());
		stubRects();
		pressTile(10);
		releaseOver(4);
		expect(onComplete).not.toHaveBeenCalled();
	});

	test("does nothing while a move is being submitted", () => {
		render(props({ submitting: true }));
		stubRects();
		pressTile(3);
		moveTo(4);
		releaseOver(4);
		expect(onComplete).not.toHaveBeenCalled();
	});

	test("reports only the first move, even if events keep arriving", () => {
		render(props());
		stubRects();
		pressTile(3);
		releaseOver(4);
		pressTile(0);
		releaseOver(5);
		expect(onComplete).toHaveBeenCalledTimes(1);
	});
});

describe("selecting a tile by tapping", () => {
	// The tap-then-tap path is the only workable one on touch, where there is
	// no cursor to drag under.
	test("a press then a tap on an empty cell completes the move", () => {
		render(props());
		stubRects();
		pressTile(3);
		releaseOver(3); // released without moving: stays selected
		expect(onComplete).not.toHaveBeenCalled();
		releaseOver(4); // second tap lands the move
		expect(onComplete).toHaveBeenCalledWith(3, 4, expect.anything());
	});

	test("pressing the selected tile again puts it back down", () => {
		render(props());
		stubRects();
		pressTile(3);
		releaseOver(3);
		pressTile(3);
		releaseOver(3);
		// Deselected, so a later tap on an empty cell does nothing.
		releaseOver(4);
		expect(onComplete).not.toHaveBeenCalled();
	});

	test("pressing a different tile moves the selection to it", () => {
		render(props());
		stubRects();
		pressTile(3);
		releaseOver(3);
		pressTile(0);
		releaseOver(0);
		releaseOver(4);
		expect(onComplete).toHaveBeenCalledWith(0, 4, expect.anything());
	});
});

describe("keyboard control", () => {
	const key = (index: number, value: string): void => {
		act(() => {
			cell(index).dispatchEvent(
				new KeyboardEvent("keydown", { key: value, bubbles: true }),
			);
		});
	};

	test("Enter picks a tile up and drops it", () => {
		render(props());
		stubRects();
		key(3, "Enter");
		key(4, "Enter");
		expect(onComplete).toHaveBeenCalledWith(3, 4, expect.anything());
	});

	test("Space works the same as Enter", () => {
		render(props());
		stubRects();
		key(3, " ");
		key(4, " ");
		expect(onComplete).toHaveBeenCalledWith(3, 4, expect.anything());
	});

	test("Enter on the selected tile puts it back down", () => {
		render(props());
		stubRects();
		key(3, "Enter");
		key(3, "Enter");
		key(4, "Enter");
		expect(onComplete).not.toHaveBeenCalled();
	});

	test("other keys are ignored", () => {
		render(props());
		stubRects();
		key(3, "a");
		key(4, "a");
		expect(onComplete).not.toHaveBeenCalled();
	});

	test("cells are focusable while playable and inert once submitting", () => {
		render(props());
		expect(cell(0).getAttribute("tabindex")).toBe("0");
		render(props({ submitting: true }));
		expect(cell(0).getAttribute("tabindex")).toBe("-1");
	});
});
