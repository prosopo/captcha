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
	retryMessage: string;
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
	retryMessage: "Incorrect, please try again",
	submitting: false,
	theme: lightTheme,
	...overrides,
});

const render = (canvasProps: CanvasProps): void => {
	act(() => {
		root.render(createElement(PuzzleCanvas, canvasProps) as ReactElement);
	});
};

const piece = (): HTMLElement => {
	const element = container.querySelector<HTMLElement>(
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

beforeEach(() => {
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
		expect(container.textContent).toContain("Drag the piece to the target");
	});

	// The banner states the failure; the instruction below it stays put and
	// keeps telling the user what to do with the replacement puzzle.
	test("a retry adds the prompt without dropping the instruction", () => {
		render(props({ showRetry: true }));
		expect(container.textContent).toContain("Incorrect, please try again");
		expect(container.textContent).toContain("Drag the piece to the target");
	});

	test("the retry prompt is announced to assistive tech", () => {
		render(props({ showRetry: true }));
		const banner = container.querySelector('[data-cy="prosopo-retry-banner"]');
		expect(banner?.getAttribute("role")).toBe("alert");
		expect(banner?.getAttribute("aria-live")).toBe("polite");
	});

	test("no prompt on the first go", () => {
		render(props());
		expect(
			container.querySelector('[data-cy="prosopo-retry-banner"]'),
		).toBeNull();
		expect(container.textContent).not.toContain("Incorrect");
	});

	// The widget supplies translated copy, so the canvas must render whatever
	// it is handed rather than a hardcoded English string.
	test("the prompt renders the message it is given", () => {
		render(props({ showRetry: true, retryMessage: "Faux — réessayez" }));
		expect(container.textContent).toContain("Faux — réessayez");
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
			container.querySelector('[data-cy="prosopo-puzzle-piece"]'),
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
