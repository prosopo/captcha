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
 * @vitest-environment jsdom
 */

import type { Translator } from "@prosopo/locale";
import { lightTheme } from "@prosopo/widget-skeleton";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type PuzzleCanvasProps,
	mountPuzzleCanvas,
} from "../components/puzzleCanvas.js";

const translator: Translator = {
	t: (key: string, options?: Record<string, unknown>): string =>
		(options?.defaultValue as string | undefined) ?? key,
	isReady: () => true,
	subscribe: () => () => undefined,
	i18n: {} as Translator["i18n"],
};

const props = (
	overrides: Partial<PuzzleCanvasProps> = {},
): PuzzleCanvasProps => ({
	originX: 20,
	originY: 100,
	background: "data:image/webp;base64,UklGRg==",
	piece: "data:image/webp;base64,UklGRg==",
	pieceSize: 44,
	onComplete: vi.fn(),
	showRetry: false,
	submitting: false,
	theme: lightTheme,
	translator,
	...overrides,
});

type ListenerMethod = EventTarget["addEventListener"];

/** Net listeners the canvas holds on window and document, keyed `target:type`. */
const trackHostListeners = (): (() => string[]) => {
	const live = new Map<string, number>();
	const hostName = (target: EventTarget): string | undefined =>
		target === window ? "window" : target === document ? "document" : undefined;
	const count = (target: EventTarget, type: string, delta: number): void => {
		const host = hostName(target);
		if (undefined === host) return;
		const key = `${host}:${type}`;
		live.set(key, Math.max(0, (live.get(key) ?? 0) + delta));
	};
	for (const target of [window, document]) {
		const add: ListenerMethod = target.addEventListener.bind(target);
		const remove: ListenerMethod = target.removeEventListener.bind(target);
		vi.spyOn(target, "addEventListener").mockImplementation(
			(...args: Parameters<ListenerMethod>): void => {
				count(target, args[0], 1);
				add(...args);
			},
		);
		vi.spyOn(target, "removeEventListener").mockImplementation(
			(...args: Parameters<ListenerMethod>): void => {
				count(target, args[0], -1);
				remove(...args);
			},
		);
	}
	return () =>
		[...live.entries()]
			.filter(([, n]: [string, number]) => n > 0)
			.map(([key]: [string, number]) => key)
			.sort();
};

/**
 * Focus moving into the dialog makes jsdom queue zero-delay selection tasks on
 * the same faked clock; flushing those leaves only what the canvas scheduled.
 */
const widgetTimers = (): number => {
	vi.advanceTimersByTime(0);
	return vi.getTimerCount();
};

let liveListeners: () => string[];

beforeEach(() => {
	document.body.replaceChildren();
	// jsdom's selector engine hangs mouseover/mouseout listeners on the
	// document the first time anything queries it.
	document.querySelector("*");
	vi.useFakeTimers({
		toFake: [
			"setTimeout",
			"clearTimeout",
			"setInterval",
			"clearInterval",
			"requestAnimationFrame",
			"cancelAnimationFrame",
		],
	});
	liveListeners = trackHostListeners();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("puzzle canvas leaves the page as it found it", () => {
	it("before its entrance frame has run", () => {
		const canvas = mountPuzzleCanvas(props());

		canvas.destroy();

		expect(document.body.childNodes).toHaveLength(0);
		expect(liveListeners()).toEqual([]);
		expect(widgetTimers()).toBe(0);
	});

	it("mid-shake and mid-announcement", () => {
		const canvas = mountPuzzleCanvas(props());
		vi.advanceTimersToNextFrame();
		canvas.update(props({ submitting: true }));
		canvas.update(props({ showRetry: true, originX: 30 }));
		expect(vi.getTimerCount()).toBeGreaterThan(0);

		canvas.destroy();

		expect(document.body.childNodes).toHaveLength(0);
		expect(liveListeners()).toEqual([]);
		expect(widgetTimers()).toBe(0);
	});

	it("mid-drag", () => {
		const canvas = mountPuzzleCanvas(props());
		const piece = document.querySelector<HTMLElement>(
			'[data-cy="prosopo-puzzle-piece"]',
		);
		if (null === piece) throw new Error("expected the puzzle piece");
		piece.dispatchEvent(
			new MouseEvent("mousedown", { bubbles: true, clientX: 30, clientY: 30 }),
		);
		document.dispatchEvent(
			new MouseEvent("mousemove", { bubbles: true, clientX: 60, clientY: 30 }),
		);

		canvas.destroy();

		expect(document.body.childNodes).toHaveLength(0);
		expect(liveListeners()).toEqual([]);
		expect(widgetTimers()).toBe(0);
	});
});
