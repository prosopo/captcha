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

import type { Translator } from "@prosopo/locale";
import type { Component } from "@prosopo/procaptcha-common";
import type { IconClick, IconOrderEvent } from "@prosopo/types";
import { lightTheme } from "@prosopo/widget-skeleton";
import {
	type Mock,
	afterEach,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import {
	type IconOrderCanvasProps,
	mountIconOrderCanvas,
} from "../components/iconOrderCanvas.js";

const CONTAINER_WIDTH = 300;
const CONTAINER_HEIGHT = 200;

/**
 * The real translator fetches over http, which jsdom refuses, so the canvas's
 * English defaults stand in.
 */
const translator = (): Translator => ({
	t: (key: string, options?: Record<string, unknown>): string =>
		(options?.defaultValue as string | undefined) ?? key,
	isReady: () => true,
	subscribe: () => () => undefined,
	i18n: {} as Translator["i18n"],
});

let canvas: Component<IconOrderCanvasProps> | undefined;
let onComplete: Mock<(clicks: IconClick[], events: IconOrderEvent[]) => void>;

const props = (
	overrides: Partial<IconOrderCanvasProps> = {},
): IconOrderCanvasProps => ({
	background: "data:image/webp;base64,UklGRg==",
	legend: "data:image/webp;base64,TEdORA==",
	legendIconSize: 26,
	onComplete,
	showRetry: false,
	submitting: false,
	theme: lightTheme,
	translator: translator(),
	...overrides,
});

const render = (canvasProps: IconOrderCanvasProps): void => {
	if (canvas) {
		canvas.update(canvasProps);
	} else {
		canvas = mountIconOrderCanvas(canvasProps);
	}
};

const destroy = (): void => {
	canvas?.destroy();
	canvas = undefined;
};

/** The canvas portals itself onto the body, out of the widget's container. */
const overlay = (): HTMLElement => document.body;

const query = <E extends HTMLElement>(selector: string): E => {
	const element = overlay().querySelector<E>(selector);
	if (!element) throw new Error(`expected ${selector} to be rendered`);
	return element;
};

const frame = (): HTMLElement => query('[data-cy="prosopo-icon-order-frame"]');
const submitButton = (): HTMLButtonElement =>
	query<HTMLButtonElement>('[data-cy="prosopo-icon-order-submit"]');
const resetButton = (): HTMLButtonElement =>
	query<HTMLButtonElement>('[data-cy="prosopo-icon-order-reset"]');

/**
 * jsdom boxes are zero-sized, which the component treats as unmeasurable, so
 * pin the frame's rect: 1:1 with the coordinate space unless a test says not.
 */
const stubFrameRect = (
	width = CONTAINER_WIDTH,
	height = CONTAINER_HEIGHT,
	left = 0,
	top = 0,
): void => {
	frame().getBoundingClientRect = (): DOMRect => ({
		width,
		height,
		left,
		top,
		right: left + width,
		bottom: top + height,
		x: left,
		y: top,
		toJSON: () => ({}),
	});
};

/** jsdom has no PointerEvent constructor, so a MouseEvent stands in. */
const clickFrame = (clientX: number, clientY: number): void => {
	frame().dispatchEvent(
		new MouseEvent("pointerup", { bubbles: true, clientX, clientY }),
	);
};

const moveOverFrame = (clientX: number, clientY: number): void => {
	frame().dispatchEvent(
		new MouseEvent("pointermove", { bubbles: true, clientX, clientY }),
	);
};

/** A tap's full sequence: pointerup, touchend, then the synthesised click. */
const tapFrame = (clientX: number, clientY: number): void => {
	const touchEnd = new Event("touchend", { bubbles: true });
	Object.defineProperty(touchEnd, "changedTouches", {
		value: [{ clientX, clientY }],
	});
	frame().dispatchEvent(
		new MouseEvent("pointerup", { bubbles: true, clientX, clientY }),
	);
	frame().dispatchEvent(touchEnd);
	frame().dispatchEvent(
		new MouseEvent("click", { bubbles: true, clientX, clientY }),
	);
};

const markers = (): string[] =>
	Array.from(frame().querySelectorAll("div"))
		.map((element: HTMLDivElement) => element.textContent ?? "")
		.filter((text: string) => /^\d+$/.test(text));

const submit = (): void => {
	submitButton().dispatchEvent(new MouseEvent("click", { bubbles: true }));
};

const reset = (): void => {
	resetButton().dispatchEvent(new MouseEvent("click", { bubbles: true }));
};

const dialog = (): HTMLElement => query('[role="dialog"]');

beforeEach(() => {
	onComplete = vi.fn<(clicks: IconClick[], events: IconOrderEvent[]) => void>();
	canvas = undefined;
});

afterEach(() => {
	destroy();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("what it puts on screen", () => {
	test("shows the legend so the user knows which icons to click", () => {
		render(props());
		const legend = overlay().querySelector<HTMLImageElement>(
			'img[alt="Icons to select, in order"]',
		);
		expect(legend?.src).toContain("TEdORA==");
		expect(legend?.style.height).toBe("26px");
	});

	test("asks the user to select in order on the first go", () => {
		render(props());
		expect(overlay().textContent).toContain("Select in this order");
	});

	test("says try again after a failed attempt", () => {
		render(props({ showRetry: true }));
		expect(overlay().textContent).toContain("Not quite");
	});

	test("switches to the retry prompt when a failure arrives as an update", () => {
		render(props());
		render(props({ showRetry: true }));
		expect(overlay().textContent).toContain("Not quite");
	});

	test("starts with no markers and both buttons disabled", () => {
		render(props());
		expect(markers()).toEqual([]);
		expect(submitButton().disabled).toBe(true);
		expect(resetButton().disabled).toBe(true);
	});

	test("never renders the icon positions it was not given", () => {
		render(props());
		expect(overlay().innerHTML).not.toContain("targets");
	});

	test("says it is checking while a solution is in flight", () => {
		render(props({ submitting: true }));
		expect(submitButton().textContent).toBe("Checking…");
	});

	test("the shake on a retry stops on its own", () => {
		vi.useFakeTimers();
		render(props({ showRetry: true }));
		const panel = frame().parentElement;
		expect(panel?.style.animation).toContain("prosopo-icon-order-shake");
		vi.advanceTimersByTime(600);
		expect(panel?.style.animation).toBe("none");
	});

	test("unmounting mid-shake cancels the timer", () => {
		vi.useFakeTimers();
		render(props({ showRetry: true }));
		destroy();
		vi.advanceTimersByTime(600);
		expect(
			overlay().querySelector('[data-cy="prosopo-icon-order-frame"]'),
		).toBeNull();
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

	test("ignores a right or middle click", () => {
		render(props());
		stubFrameRect();
		for (const button of [1, 2]) {
			frame().dispatchEvent(
				new MouseEvent("pointerup", {
					bubbles: true,
					button,
					clientX: 60,
					clientY: 50,
				}),
			);
		}
		expect(markers()).toEqual([]);
		expect(submitButton().disabled).toBe(true);
	});

	test("enables both buttons once there is something to submit", () => {
		render(props());
		stubFrameRect();
		clickFrame(60, 50);
		expect(submitButton().disabled).toBe(false);
		expect(resetButton().disabled).toBe(false);
	});

	test("submits the clicks in the order they were made", () => {
		render(props());
		stubFrameRect();
		clickFrame(60, 50);
		clickFrame(180, 90);
		submit();

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
		submit();
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

	test("counts one click per tap, synthesised click included", () => {
		render(props());
		stubFrameRect();
		tapFrame(120, 80);
		expect(markers()).toEqual(["1"]);

		tapFrame(60, 50);
		tapFrame(180, 90);
		submit();

		const [clicks] = onComplete.mock.calls[0] ?? [];
		expect(clicks).toEqual([
			{ x: 120, y: 80 },
			{ x: 60, y: 50 },
			{ x: 180, y: 90 },
		]);
	});

	test("does not submit an empty answer", () => {
		render(props());
		submit();
		expect(onComplete).not.toHaveBeenCalled();
	});

	test("ignores clicks while a submission is in flight", () => {
		render(props({ submitting: true }));
		stubFrameRect();
		clickFrame(60, 50);
		expect(markers()).toEqual([]);
	});

	test("does not submit again while a submission is in flight", () => {
		render(props());
		stubFrameRect();
		clickFrame(60, 50);
		render(props({ submitting: true }));
		submit();
		expect(onComplete).not.toHaveBeenCalled();
	});

	test("the answer handed over is a copy, safe from later clicks", () => {
		render(props());
		stubFrameRect();
		clickFrame(60, 50);
		submit();
		clickFrame(180, 90);
		const [clicks, events] = onComplete.mock.calls[0] ?? [];
		expect(clicks).toHaveLength(1);
		expect(events).toHaveLength(1);
	});
});

describe("translating pointer positions", () => {
	test("subtracts the frame's offset on the page", () => {
		render(props());
		stubFrameRect(CONTAINER_WIDTH, CONTAINER_HEIGHT, 40, 25);
		clickFrame(100, 75);
		submit();
		const [clicks] = onComplete.mock.calls[0] ?? [];
		expect(clicks).toEqual([{ x: 60, y: 50 }]);
	});

	test("rescales when the host page has shrunk the widget", () => {
		// Half-size box: a click at its centre must still report the centre of
		// the provider's 300x200 coordinate space, or every answer is halved.
		render(props());
		stubFrameRect(CONTAINER_WIDTH / 2, CONTAINER_HEIGHT / 2);
		clickFrame(75, 50);
		submit();
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
		submit();
		const [, events] = onComplete.mock.calls[0] ?? [];
		expect(events?.length).toBeGreaterThanOrEqual(3);
		expect(events?.at(-1)).toMatchObject({ x: 60, y: 50 });
	});

	test("timestamps the trail relative to the challenge, not the epoch", () => {
		render(props());
		stubFrameRect();
		clickFrame(60, 50);
		submit();
		const [, events] = onComplete.mock.calls[0] ?? [];
		for (const event of events ?? []) {
			expect(event.t).toBeLessThan(60_000);
			expect(event.t).toBeGreaterThanOrEqual(0);
		}
	});

	test("movement is not recorded while a submission is in flight", () => {
		render(props({ submitting: true }));
		stubFrameRect();
		moveOverFrame(10, 10);
		render(props());
		clickFrame(60, 50);
		submit();
		const [, events] = onComplete.mock.calls[0] ?? [];
		expect(events).toHaveLength(1);
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

	test("a new legend on its own clears the answer too", () => {
		render(props());
		stubFrameRect();
		clickFrame(60, 50);
		render(props({ legend: "data:image/webp;base64,TkVXTEc=" }));
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

describe("the surface it is presented on", () => {
	test("the panel announces itself as a named dialog", () => {
		render(props());
		expect(dialog().getAttribute("aria-label")).toBe("Icon order challenge");
		expect(dialog().getAttribute("aria-modal")).toBe("true");
	});

	test("escape dismisses the challenge", () => {
		const onDismiss = vi.fn<() => void>();
		render(props({ onDismiss }));
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
		);
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	test("the background image is left out of the reading order", () => {
		render(props());
		const background = frame().querySelector("img");
		expect(background?.getAttribute("alt")).toBe("");
	});
});

describe("after it goes away", () => {
	test("it takes its overlay with it", () => {
		render(props());
		destroy();
		expect(
			overlay().querySelector('[data-cy="prosopo-icon-order-frame"]'),
		).toBeNull();
	});

	test("its listeners go with it", () => {
		const onDismiss = vi.fn<() => void>();
		render(props({ onDismiss }));
		stubFrameRect();
		const detached = frame();
		destroy();
		detached.dispatchEvent(
			new MouseEvent("pointerup", { bubbles: true, clientX: 60, clientY: 50 }),
		);
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
		);
		expect(
			Array.from(detached.querySelectorAll("div")).filter(
				(element: HTMLDivElement) => /^\d+$/.test(element.textContent ?? ""),
			),
		).toHaveLength(0);
		expect(onDismiss).not.toHaveBeenCalled();
	});
});
