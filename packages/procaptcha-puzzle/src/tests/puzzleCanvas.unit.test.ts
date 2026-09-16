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

import type { PuzzleEvent } from "@prosopo/types";
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
import { PuzzleCanvas } from "../components/PuzzleCanvas.js";

/**
 * The canvas is the only piece of the puzzle flow the user actually touches:
 * it owns the drag, the clamping that keeps the piece inside the board, and the
 * trail of positions the provider scores. Every test drives real DOM events
 * against a real render rather than calling the handlers directly.
 */

/**
 * The real locale package reaches for an http backend the moment a component
 * asks it for a string, which jsdom refuses. The English defaults the canvas
 * ships stand in instead, interpolated the way i18next would, so the
 * assertions below read as the copy a user is actually given.
 */
vi.mock("@prosopo/locale", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/locale")>();
	const t = (
		key: string,
		options?: { defaultValue?: string } & Record<string, unknown>,
	): string =>
		(options?.defaultValue ?? key).replace(
			/{{(\w+)}}/g,
			(placeholder: string, name: string) =>
				options && name in options ? String(options[name]) : placeholder,
		);
	return { ...actual, useTranslation: () => ({ t, ready: true }) };
});

const CONTAINER_WIDTH = 300;
const CONTAINER_HEIGHT = 200;
const PIECE_SIZE = 44;

interface CanvasProps {
	originX: number;
	originY: number;
	background: string;
	piece: string;
	pieceSize: number;
	onComplete: Mock<
		(finalX: number, finalY: number, puzzleEvents: PuzzleEvent[]) => void
	>;
	showRetry: boolean;
	submitting: boolean;
	theme: Theme;
}

let container: HTMLDivElement;
let root: Root;
let onComplete: Mock<
	(finalX: number, finalY: number, puzzleEvents: PuzzleEvent[]) => void
>;

const props = (overrides: Partial<CanvasProps> = {}): CanvasProps => ({
	originX: 20,
	originY: 100,
	background: "data:image/webp;base64,UklGRg==",
	piece: "data:image/webp;base64,UklGRg==",
	pieceSize: 44,
	onComplete,
	showRetry: false,
	submitting: false,
	theme: lightTheme,
	...overrides,
});

const render = (canvasProps: CanvasProps): void => {
	act(() => {
		root.render(createElement(PuzzleCanvas, canvasProps) as ReactElement);
	});
};

/**
 * The canvas portals itself onto the body — it has to escape the query
 * container the widget skeleton wraps it in — so it is never inside the render
 * container, and everything that reads the rendered output reads the body.
 */
const overlay = (): HTMLElement => document.body;

const piece = (): HTMLElement => {
	const element = overlay().querySelector<HTMLElement>(
		'[data-cy="prosopo-puzzle-piece"]',
	);
	if (!element) throw new Error("expected the puzzle piece to be rendered");
	return element;
};

/** The piece is positioned by its centre, so undo the offset the style adds. */
const piecePosition = (): { x: number; y: number } => ({
	x: Number.parseFloat(piece().style.left) + PIECE_SIZE / 2,
	y: Number.parseFloat(piece().style.top) + PIECE_SIZE / 2,
});

const mouseDown = (clientX: number, clientY: number): void => {
	act(() => {
		piece().dispatchEvent(
			new MouseEvent("mousedown", { bubbles: true, clientX, clientY }),
		);
	});
};

const mouseMove = (clientX: number, clientY: number): void => {
	act(() => {
		document.dispatchEvent(
			new MouseEvent("mousemove", { bubbles: true, clientX, clientY }),
		);
	});
};

const mouseUp = (): void => {
	act(() => {
		document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
	});
};

/**
 * jsdom has no touch constructors, so the event carries a plain object shaped
 * like the single Touch the component reads.
 */
const touchEvent = (
	type: string,
	touches: { clientX: number; clientY: number }[],
): Event => {
	const event = new Event(type, { bubbles: true });
	Object.defineProperty(event, "touches", { value: touches });
	return event;
};

const touchStart = (touches: { clientX: number; clientY: number }[]): void => {
	act(() => {
		piece().dispatchEvent(touchEvent("touchstart", touches));
	});
};

const touchMove = (touches: { clientX: number; clientY: number }[]): void => {
	act(() => {
		document.dispatchEvent(touchEvent("touchmove", touches));
	});
};

const touchEnd = (): void => {
	act(() => {
		document.dispatchEvent(touchEvent("touchend", []));
	});
};

const keyDown = (key: string, options: { shiftKey?: boolean } = {}): void => {
	act(() => {
		piece().dispatchEvent(
			new KeyboardEvent("keydown", {
				key,
				bubbles: true,
				cancelable: true,
				shiftKey: options.shiftKey ?? false,
			}),
		);
	});
};

/**
 * `isTrusted` is unforgeable, so jsdom can only ever produce the synthetic
 * events the canvas refuses. Opening the allowance is how the firefox cypress
 * leg drives the widget too; the gate itself is covered by the one test that
 * shuts it again.
 */
const allowSyntheticEvents = (allowed: boolean): void => {
	vi.stubGlobal("__PROSOPO_ALLOW_UNTRUSTED_EVENTS__", allowed);
};

const required = (element: HTMLElement | null, what: string): HTMLElement => {
	if (!element) throw new Error(`expected ${what} to be rendered`);
	return element;
};

const dialog = (): HTMLElement =>
	required(
		overlay().querySelector<HTMLElement>('[role="dialog"]'),
		"the dialog",
	);

/** An `output` element carries the implicit `status` role a live region needs. */
const liveRegion = (): HTMLElement =>
	required(overlay().querySelector<HTMLElement>("output"), "the live region");

/** The text a screen reader reads out when the piece takes focus. */
const pieceDescription = (): string =>
	(piece().getAttribute("aria-describedby") ?? "")
		.split(" ")
		.map((id) => document.getElementById(id)?.textContent ?? "")
		.join(" ");

beforeEach(() => {
	allowSyntheticEvents(true);
	onComplete =
		vi.fn<
			(finalX: number, finalY: number, puzzleEvents: PuzzleEvent[]) => void
		>();
	container = document.createElement("div");
	document.body.appendChild(container);
	act(() => {
		root = createRoot(container);
	});
});

afterEach(() => {
	act(() => {
		root.unmount();
	});
	container.remove();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("what it puts on screen", () => {
	test("the piece starts at the origin the challenge named", () => {
		render(props());
		expect(piecePosition()).toEqual({ x: 20, y: 100 });
	});

	test("a new challenge moves the piece back to its new origin", () => {
		render(props());
		mouseDown(20, 100);
		mouseMove(120, 120);
		render(props({ originX: 50, originY: 60 }));
		expect(piecePosition()).toEqual({ x: 50, y: 60 });
	});

	test("re-rendering with the same origin leaves a dragged piece alone", () => {
		render(props());
		mouseDown(20, 100);
		mouseMove(120, 120);
		render(props());
		expect(piecePosition()).toEqual({ x: 120, y: 120 });
	});

	test("the first go asks the user to drag the piece", () => {
		render(props());
		expect(overlay().textContent).toContain("Drag the piece to the target");
	});

	test("a retry says so instead", () => {
		render(props({ showRetry: true }));
		expect(overlay().textContent).toContain("Not quite");
	});

	test("the piece cannot be grabbed while a solution is in flight", () => {
		render(props({ submitting: true }));
		mouseDown(20, 100);
		mouseMove(120, 120);
		mouseUp();
		expect(piecePosition()).toEqual({ x: 20, y: 100 });
		expect(onComplete).not.toHaveBeenCalled();
	});

	test("a tap cannot be started while a solution is in flight either", () => {
		render(props({ submitting: true }));
		touchStart([{ clientX: 20, clientY: 100 }]);
		touchMove([{ clientX: 120, clientY: 120 }]);
		touchEnd();
		expect(onComplete).not.toHaveBeenCalled();
	});

	test("the shake on a retry stops on its own", () => {
		vi.useFakeTimers();
		render(props({ showRetry: true }));
		act(() => {
			vi.advanceTimersByTime(600);
		});
		// Nothing to assert beyond survival: the timer fires into a live
		// component rather than leaking past the shake.
		expect(piecePosition()).toEqual({ x: 20, y: 100 });
	});

	test("unmounting mid-shake cancels the timer", () => {
		vi.useFakeTimers();
		render(props({ showRetry: true }));
		act(() => {
			root.unmount();
		});
		act(() => {
			vi.advanceTimersByTime(600);
		});
		act(() => {
			root = createRoot(container);
		});
		expect(
			overlay().querySelector('[data-cy="prosopo-puzzle-piece"]'),
		).toBeNull();
	});
});

describe("dragging with a mouse", () => {
	test("the piece follows the pointer", () => {
		render(props());
		mouseDown(20, 100);
		mouseMove(150, 90);
		expect(piecePosition()).toEqual({ x: 150, y: 90 });
	});

	test("grabbing the piece off-centre keeps the offset", () => {
		render(props());
		// Grabbed 5px right of the centre, so the centre trails the pointer by 5.
		mouseDown(25, 100);
		mouseMove(150, 100);
		expect(piecePosition()).toEqual({ x: 145, y: 100 });
	});

	test("a pointer moving before the piece is grabbed is ignored", () => {
		render(props());
		mouseMove(150, 90);
		expect(piecePosition()).toEqual({ x: 20, y: 100 });
	});

	test("the piece cannot be dragged off the left or top of the board", () => {
		render(props());
		mouseDown(20, 100);
		mouseMove(-500, -500);
		expect(piecePosition()).toEqual({ x: 0, y: 0 });
	});

	test("nor off the right or bottom", () => {
		render(props());
		mouseDown(20, 100);
		mouseMove(5000, 5000);
		expect(piecePosition()).toEqual({
			x: CONTAINER_WIDTH,
			y: CONTAINER_HEIGHT,
		});
	});

	test("letting go reports where the piece landed, with the trail", () => {
		render(props());
		mouseDown(20, 100);
		mouseMove(100, 95);
		mouseMove(200, 80);
		mouseUp();
		expect(onComplete).toHaveBeenCalledTimes(1);
		const [finalX, finalY, events] = onComplete.mock.calls[0] ?? [];
		expect(finalX).toBe(200);
		expect(finalY).toBe(80);
		expect(events?.map((event) => [event.x, event.y])).toEqual([
			[100, 95],
			[200, 80],
		]);
	});

	test("a grab released without moving reports the origin and no trail", () => {
		render(props());
		mouseDown(20, 100);
		mouseUp();
		expect(onComplete).toHaveBeenCalledWith(20, 100, []);
	});

	test("letting go without having grabbed anything reports nothing", () => {
		render(props());
		mouseUp();
		expect(onComplete).not.toHaveBeenCalled();
	});

	test("a second release after the drop is ignored", () => {
		render(props());
		mouseDown(20, 100);
		mouseMove(200, 80);
		mouseUp();
		mouseUp();
		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	test("moving after the drop no longer moves the piece", () => {
		render(props());
		mouseDown(20, 100);
		mouseMove(200, 80);
		mouseUp();
		mouseMove(50, 50);
		expect(piecePosition()).toEqual({ x: 200, y: 80 });
	});

	test("a second drag starts from a clean trail", () => {
		render(props());
		mouseDown(20, 100);
		mouseMove(100, 95);
		mouseUp();
		mouseDown(100, 95);
		mouseMove(200, 80);
		mouseUp();
		const events = onComplete.mock.calls[1]?.[2];
		expect(events?.map((event) => [event.x, event.y])).toEqual([[200, 80]]);
	});

	test("the trail is timestamped in order", () => {
		render(props());
		mouseDown(20, 100);
		mouseMove(100, 95);
		mouseMove(200, 80);
		mouseUp();
		const events = onComplete.mock.calls[0]?.[2] ?? [];
		expect(events).toHaveLength(2);
		expect(events[1]?.t).toBeGreaterThanOrEqual(events[0]?.t ?? 0);
	});

	test("the trail handed over is a copy, safe from the next drag", () => {
		render(props());
		mouseDown(20, 100);
		mouseMove(200, 80);
		mouseUp();
		const events = onComplete.mock.calls[0]?.[2] ?? [];
		mouseDown(200, 80);
		mouseMove(10, 10);
		expect(events).toHaveLength(1);
	});
});

describe("dragging with a finger", () => {
	test("the piece follows the touch", () => {
		render(props());
		touchStart([{ clientX: 20, clientY: 100 }]);
		touchMove([{ clientX: 150, clientY: 90 }]);
		expect(piecePosition()).toEqual({ x: 150, y: 90 });
	});

	test("lifting the finger reports the drop", () => {
		render(props());
		touchStart([{ clientX: 20, clientY: 100 }]);
		touchMove([{ clientX: 200, clientY: 80 }]);
		touchEnd();
		expect(onComplete).toHaveBeenCalledWith(200, 80, [
			expect.objectContaining({ x: 200, y: 80 }),
		]);
	});

	test("a touchstart carrying no touches does not start a drag", () => {
		render(props());
		touchStart([]);
		touchMove([{ clientX: 150, clientY: 90 }]);
		touchEnd();
		expect(piecePosition()).toEqual({ x: 20, y: 100 });
		expect(onComplete).not.toHaveBeenCalled();
	});

	test("a touchmove carrying no touches is ignored mid-drag", () => {
		render(props());
		touchStart([{ clientX: 20, clientY: 100 }]);
		touchMove([]);
		expect(piecePosition()).toEqual({ x: 20, y: 100 });
	});

	test("a finger drag is clamped to the board like a mouse drag", () => {
		render(props());
		touchStart([{ clientX: 20, clientY: 100 }]);
		touchMove([{ clientX: 9999, clientY: -9999 }]);
		expect(piecePosition()).toEqual({ x: CONTAINER_WIDTH, y: 0 });
	});
});

describe("driving it from the keyboard", () => {
	test("the piece takes focus as soon as the puzzle opens", () => {
		render(props());
		expect(document.activeElement).toBe(piece());
	});

	test("an arrow key walks the piece a step across the board", () => {
		render(props());
		keyDown("ArrowRight");
		expect(piecePosition()).toEqual({ x: 30, y: 100 });
	});

	test("holding shift walks it a finer step", () => {
		render(props());
		keyDown("ArrowRight", { shiftKey: true });
		expect(piecePosition()).toEqual({ x: 22, y: 100 });
	});

	test("all four arrows move the piece the way they point", () => {
		render(props());
		keyDown("ArrowRight");
		keyDown("ArrowDown");
		keyDown("ArrowLeft");
		keyDown("ArrowUp");
		expect(piecePosition()).toEqual({ x: 20, y: 100 });
	});

	test("the board's edge stops the piece just as a drag does", () => {
		render(props());
		for (let press = 0; press < 5; press++) keyDown("ArrowLeft");
		expect(piecePosition()).toEqual({ x: 0, y: 100 });
	});

	test("home puts the piece back where it started", () => {
		render(props());
		keyDown("ArrowRight");
		keyDown("ArrowDown");
		keyDown("Home");
		expect(piecePosition()).toEqual({ x: 20, y: 100 });
	});

	test("enter hands over where the piece is, with the trail", () => {
		render(props());
		keyDown("ArrowRight");
		keyDown("ArrowRight");
		keyDown("Enter");
		expect(onComplete).toHaveBeenCalledTimes(1);
		const [finalX, finalY, events] = onComplete.mock.calls[0] ?? [];
		expect(finalX).toBe(40);
		expect(finalY).toBe(100);
		expect(events?.map((event) => [event.x, event.y])).toEqual([
			[30, 100],
			[40, 100],
		]);
	});

	test("space submits too", () => {
		render(props());
		keyDown("ArrowRight");
		keyDown(" ");
		expect(onComplete).toHaveBeenCalledWith(30, 100, [
			expect.objectContaining({ x: 30, y: 100 }),
		]);
	});

	test("a second keyboard go starts from a clean trail", () => {
		render(props());
		keyDown("ArrowRight");
		keyDown("Enter");
		keyDown("ArrowDown");
		keyDown("Enter");
		const events = onComplete.mock.calls[1]?.[2];
		expect(events?.map((event) => [event.x, event.y])).toEqual([[30, 110]]);
	});

	test("a key press no user made is ignored", () => {
		allowSyntheticEvents(false);
		render(props());
		keyDown("ArrowRight");
		keyDown("Enter");
		expect(piecePosition()).toEqual({ x: 20, y: 100 });
		expect(onComplete).not.toHaveBeenCalled();
	});

	test("keys that mean nothing here are left to the page", () => {
		render(props());
		keyDown("a");
		expect(piecePosition()).toEqual({ x: 20, y: 100 });
		expect(onComplete).not.toHaveBeenCalled();
	});

	test("the piece cannot be moved or submitted while a solution is in flight", () => {
		render(props({ submitting: true }));
		keyDown("ArrowRight");
		keyDown("Enter");
		expect(piecePosition()).toEqual({ x: 20, y: 100 });
		expect(onComplete).not.toHaveBeenCalled();
	});

	test("nor can it be tabbed to while a solution is in flight", () => {
		render(props({ submitting: true }));
		expect(piece().tabIndex).toBe(-1);
	});

	test("tab cannot leave the dialog for the page behind it", () => {
		render(props());
		act(() => {
			document.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
			);
		});
		expect(document.activeElement).toBe(piece());
	});

	test("closing hands focus back to whatever opened the puzzle", () => {
		const opener = document.createElement("button");
		document.body.appendChild(opener);
		opener.focus();

		render(props());
		expect(document.activeElement).toBe(piece());

		act(() => {
			root.unmount();
		});
		expect(document.activeElement).toBe(opener);

		opener.remove();
		act(() => {
			root = createRoot(container);
		});
	});
});

describe("what it says to a screen reader", () => {
	test("the panel announces itself as a named dialog", () => {
		render(props());
		expect(dialog().getAttribute("aria-label")).toBe("Puzzle challenge");
		expect(dialog().getAttribute("aria-modal")).toBe("true");
	});

	test("the piece carries a name and says it can be dragged", () => {
		render(props());
		expect(piece().getAttribute("aria-label")).toBe("Puzzle piece");
		expect(piece().getAttribute("aria-roledescription")).toBe(
			"draggable puzzle piece",
		);
	});

	test("the piece is described by the instruction and the key help", () => {
		render(props());
		expect(pieceDescription()).toContain("Drag the piece to the target");
		expect(pieceDescription()).toContain("arrow keys");
		expect(pieceDescription()).toContain("Escape");
	});

	test("taking focus reports where the piece is, in proportions", () => {
		render(props());
		expect(liveRegion().textContent).toBe("7 percent across, 50 percent down");
	});

	test("a move is reported once the keys stop, not on every press", () => {
		vi.useFakeTimers();
		render(props());
		keyDown("ArrowRight");
		keyDown("ArrowRight");
		expect(liveRegion().textContent).toBe("7 percent across, 50 percent down");
		act(() => {
			vi.advanceTimersByTime(500);
		});
		expect(liveRegion().textContent).toBe("13 percent across, 50 percent down");
	});

	test("a solution in flight is announced", () => {
		render(props({ submitting: true }));
		expect(liveRegion().textContent).toBe("Checking your answer");
	});

	test("a retry says the puzzle has been replaced", () => {
		render(props({ showRetry: true }));
		expect(liveRegion().textContent).toContain("A new puzzle has loaded");
	});

	test("the background tiles are left out of the reading order", () => {
		render(props());
		const images = Array.from(overlay().querySelectorAll("img"));
		expect(images.length).toBeGreaterThan(0);
		expect(images.every((image) => image.getAttribute("alt") === "")).toBe(
			true,
		);
	});
});

describe("after it goes away", () => {
	test("its document listeners go with it", () => {
		render(props());
		mouseDown(20, 100);
		act(() => {
			root.unmount();
		});
		mouseMove(150, 90);
		mouseUp();
		expect(onComplete).not.toHaveBeenCalled();
		act(() => {
			root = createRoot(container);
		});
	});
});
