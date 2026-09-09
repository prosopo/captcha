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

import type { IconClick, IconOrderEvent } from "@prosopo/types";
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
import { IconOrderCanvas } from "../components/IconOrderCanvas.js";

/**
 * The canvas is the only part of the icon-order flow the user touches: it owns
 * click capture, the order those clicks are recorded in, and the trail the
 * provider scores. Every test drives real DOM events against a real render.
 */

const CONTAINER_WIDTH = 300;
const CONTAINER_HEIGHT = 200;

interface CanvasProps {
	background: string;
	legend: string;
	legendIconSize: number;
	onComplete: Mock<(clicks: IconClick[], events: IconOrderEvent[]) => void>;
	showRetry: boolean;
	submitting: boolean;
	theme: Theme;
}

let container: HTMLDivElement;
let root: Root;
let onComplete: Mock<(clicks: IconClick[], events: IconOrderEvent[]) => void>;

const props = (overrides: Partial<CanvasProps> = {}): CanvasProps => ({
	background: "data:image/webp;base64,UklGRg==",
	legend: "data:image/webp;base64,TEdORA==",
	legendIconSize: 26,
	onComplete,
	showRetry: false,
	submitting: false,
	theme: lightTheme,
	...overrides,
});

const render = (canvasProps: CanvasProps): void => {
	act(() => {
		root.render(createElement(IconOrderCanvas, canvasProps) as ReactElement);
	});
};

const query = (selector: string): HTMLElement => {
	const element = container.querySelector<HTMLElement>(selector);
	if (!element) throw new Error(`expected ${selector} to be rendered`);
	return element;
};

const frame = (): HTMLElement => query('[data-cy="prosopo-icon-order-frame"]');
const submitButton = (): HTMLButtonElement =>
	query('[data-cy="prosopo-icon-order-submit"]') as HTMLButtonElement;
const resetButton = (): HTMLButtonElement =>
	query('[data-cy="prosopo-icon-order-reset"]') as HTMLButtonElement;

/**
 * jsdom gives every element a zero-sized box, which the component treats as
 * unmeasurable. Pin the frame's rect so click maths has something real to work
 * against — 1:1 with the coordinate space unless a test says otherwise.
 */
const stubFrameRect = (
	width = CONTAINER_WIDTH,
	height = CONTAINER_HEIGHT,
	left = 0,
	top = 0,
): void => {
	frame().getBoundingClientRect = () =>
		({
			width,
			height,
			left,
			top,
			right: left + width,
			bottom: top + height,
			x: left,
			y: top,
			toJSON: () => ({}),
		}) as DOMRect;
};

/**
 * The frame listens for `pointerup` only, so that is what these dispatch.
 * jsdom has no `PointerEvent` constructor; `MouseEvent` carries the
 * `clientX`/`clientY` React reads and dispatch matches on `type` alone.
 */
const clickFrame = (clientX: number, clientY: number): void => {
	act(() => {
		frame().dispatchEvent(
			new MouseEvent("pointerup", { bubbles: true, clientX, clientY }),
		);
	});
};

const moveOverFrame = (clientX: number, clientY: number): void => {
	act(() => {
		frame().dispatchEvent(
			new MouseEvent("pointermove", { bubbles: true, clientX, clientY }),
		);
	});
};

/**
 * A touch device's full event sequence for one tap: `touchend`, then the
 * compatibility `click` the browser synthesises at the same coordinates.
 * Both are dispatched so the "one tap, one click" test below is checking the
 * real thing rather than a convenient subset of it.
 */
const tapFrame = (clientX: number, clientY: number): void => {
	const touchEnd = new Event("touchend", { bubbles: true });
	Object.defineProperty(touchEnd, "changedTouches", {
		value: [{ clientX, clientY }],
	});
	act(() => {
		frame().dispatchEvent(
			new MouseEvent("pointerup", { bubbles: true, clientX, clientY }),
		);
		frame().dispatchEvent(touchEnd);
		frame().dispatchEvent(
			new MouseEvent("click", { bubbles: true, clientX, clientY }),
		);
	});
};

const markers = (): string[] =>
	Array.from(frame().querySelectorAll("div"))
		.map((el) => el.textContent ?? "")
		.filter((text) => /^\d+$/.test(text));

const click = (): void => {
	act(() => {
		submitButton().dispatchEvent(new MouseEvent("click", { bubbles: true }));
	});
};

const reset = (): void => {
	act(() => {
		resetButton().dispatchEvent(new MouseEvent("click", { bubbles: true }));
	});
};

beforeEach(() => {
	onComplete = vi.fn<(clicks: IconClick[], events: IconOrderEvent[]) => void>();
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
	test("shows the legend so the user knows which icons to click", () => {
		render(props());
		const legend = container.querySelector<HTMLImageElement>(
			'img[alt="Icons to select, in order"]',
		);
		expect(legend?.src).toContain("TEdORA==");
		expect(legend?.style.height).toBe("26px");
	});

	test("asks the user to select in order on the first go", () => {
		render(props());
		expect(container.textContent).toContain("Select in this order");
	});

	test("says try again after a failed attempt", () => {
		render(props({ showRetry: true }));
		expect(container.textContent).toContain("Not quite");
	});

	test("starts with no markers and both buttons disabled", () => {
		render(props());
		expect(markers()).toEqual([]);
		expect(submitButton().disabled).toBe(true);
		expect(resetButton().disabled).toBe(true);
	});

	test("never renders the icon positions it was not given", () => {
		// The component only receives imagery. If this ever fails, something
		// has started passing target geometry to the client.
		render(props());
		expect(container.innerHTML).not.toContain("targets");
	});
});

describe("capturing an ordered answer", () => {
	test("numbers each click in the order it was made", () => {
		render(props());
		stubFrameRect();
		clickFrame(60, 50);
		clickFrame(180, 90);
		clickFrame(240, 150);
		expect(markers()).toEqual(["1", "2", "3"]);
	});

	test("submits the clicks in the order they were made", () => {
		render(props());
		stubFrameRect();
		clickFrame(60, 50);
		clickFrame(180, 90);
		click();

		expect(onComplete).toHaveBeenCalledOnce();
		const [clicks] = onComplete.mock.calls[0] ?? [];
		expect(clicks).toEqual([
			{ x: 60, y: 50 },
			{ x: 180, y: 90 },
		]);
	});

	test("keeps duplicate positions as separate entries", () => {
		// Clicking the same icon twice is a wrong answer, not a no-op — the
		// grader has to see it to reject it.
		render(props());
		stubFrameRect();
		clickFrame(60, 50);
		clickFrame(60, 50);
		click();
		const [clicks] = onComplete.mock.calls[0] ?? [];
		expect(clicks).toHaveLength(2);
	});

	test("reset clears the answer so the user can start over", () => {
		render(props());
		stubFrameRect();
		clickFrame(60, 50);
		clickFrame(180, 90);
		reset();
		expect(markers()).toEqual([]);
		expect(submitButton().disabled).toBe(true);
	});

	/**
	 * Regression: the frame used to listen for `click` *and* `touchend`, so a
	 * phone recorded two clicks per tap. Three correct taps submitted six
	 * clicks against three targets and the provider rejected the answer on
	 * length alone — icon-order was unsolvable on every touch device.
	 */
	test("counts one click per tap, synthesised click included", () => {
		render(props());
		stubFrameRect();
		tapFrame(120, 80);
		expect(markers()).toEqual(["1"]);

		tapFrame(60, 50);
		tapFrame(180, 90);
		click();

		const [clicks] = onComplete.mock.calls[0] ?? [];
		expect(clicks).toEqual([
			{ x: 120, y: 80 },
			{ x: 60, y: 50 },
			{ x: 180, y: 90 },
		]);
	});

	test("does not submit an empty answer", () => {
		render(props());
		click();
		expect(onComplete).not.toHaveBeenCalled();
	});

	test("ignores clicks while a submission is in flight", () => {
		render(props({ submitting: true }));
		stubFrameRect();
		clickFrame(60, 50);
		expect(markers()).toEqual([]);
	});
});

describe("translating pointer positions", () => {
	test("subtracts the frame's offset on the page", () => {
		render(props());
		stubFrameRect(CONTAINER_WIDTH, CONTAINER_HEIGHT, 40, 25);
		clickFrame(100, 75);
		click();
		const [clicks] = onComplete.mock.calls[0] ?? [];
		expect(clicks).toEqual([{ x: 60, y: 50 }]);
	});

	test("rescales when the host page has shrunk the widget", () => {
		// Half-size box: a click at its centre must still report the centre of
		// the provider's 300x200 coordinate space, or every answer is halved.
		render(props());
		stubFrameRect(CONTAINER_WIDTH / 2, CONTAINER_HEIGHT / 2);
		clickFrame(75, 50);
		click();
		const [clicks] = onComplete.mock.calls[0] ?? [];
		expect(clicks).toEqual([{ x: 150, y: 100 }]);
	});

	test("ignores clicks when the frame has no measurable box", () => {
		// jsdom's default zero-size rect. Recording a click here would send
		// NaN coordinates to the provider.
		render(props());
		clickFrame(60, 50);
		expect(markers()).toEqual([]);
	});
});

describe("the pointer trail", () => {
	test("records movement as well as clicks", () => {
		render(props());
		stubFrameRect();
		moveOverFrame(10, 10);
		moveOverFrame(30, 20);
		clickFrame(60, 50);
		click();
		const [, events] = onComplete.mock.calls[0] ?? [];
		expect(events?.length).toBeGreaterThanOrEqual(3);
		expect(events?.at(-1)).toMatchObject({ x: 60, y: 50 });
	});

	test("timestamps the trail relative to the challenge, not the epoch", () => {
		render(props());
		stubFrameRect();
		clickFrame(60, 50);
		click();
		const [, events] = onComplete.mock.calls[0] ?? [];
		for (const event of events ?? []) {
			expect(event.t).toBeLessThan(60_000);
			expect(event.t).toBeGreaterThanOrEqual(0);
		}
	});
});

describe("a fresh challenge", () => {
	test("clears the previous answer when new imagery arrives", () => {
		render(props());
		stubFrameRect();
		clickFrame(60, 50);
		clickFrame(180, 90);
		expect(markers()).toEqual(["1", "2"]);

		render(props({ background: "data:image/webp;base64,TkVXQkc=" }));
		expect(markers()).toEqual([]);
	});

	test("leaves the answer alone on a re-render with the same imagery", () => {
		render(props());
		stubFrameRect();
		clickFrame(60, 50);
		render(props({ showRetry: true }));
		expect(markers()).toEqual(["1"]);
	});
});
