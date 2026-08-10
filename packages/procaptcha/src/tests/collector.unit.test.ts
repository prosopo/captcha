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

import type {
	ProsopoKeyboardEvent,
	ProsopoMouseEvent,
	ProsopoTouchEvent,
} from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { startCollector } from "../modules/collector.js";

/**
 * The collector talks to the DOM directly, so the tests drive real elements and
 * real events under jsdom. Each sink mimics a React `setState` updater so the
 * functional-update path the collector relies on is exercised.
 */
interface Sinks {
	mouse: ProsopoMouseEvent[];
	touch: ProsopoTouchEvent[];
	keyboard: ProsopoKeyboardEvent[];
}

interface Fixture {
	form: HTMLFormElement;
	root: HTMLDivElement;
	sinks: Sinks;
}

const sinkFor = <T>(store: { current: T[] }): ((
	setValueFunc: T[] | ((prev: T[]) => T[]),
) => void) => {
	return (setValueFunc) => {
		store.current =
			typeof setValueFunc === "function"
				? (setValueFunc as (prev: T[]) => T[])(store.current)
				: setValueFunc;
	};
};

let mouseStore: { current: ProsopoMouseEvent[] };
let touchStore: { current: ProsopoTouchEvent[] };
let keyboardStore: { current: ProsopoKeyboardEvent[] };

const build = (
	options: { nested?: boolean; inForm?: boolean } = {},
): Fixture => {
	const root = document.createElement("div");
	let form: HTMLFormElement;
	if (options.inForm === false) {
		form = document.createElement("form");
		document.body.appendChild(root);
	} else {
		form = document.createElement("form");
		if (options.nested) {
			const wrapper = document.createElement("section");
			wrapper.appendChild(root);
			form.appendChild(wrapper);
		} else {
			form.appendChild(root);
		}
		document.body.appendChild(form);
	}
	startCollector(
		sinkFor(mouseStore),
		sinkFor(touchStore),
		sinkFor(keyboardStore),
		root,
	);
	return {
		form,
		root,
		sinks: {
			get mouse() {
				return mouseStore.current;
			},
			get touch() {
				return touchStore.current;
			},
			get keyboard() {
				return keyboardStore.current;
			},
		},
	};
};

/** jsdom has no Touch constructor, so touch points are plain objects. */
const touchEvent = (
	type: string,
	touches: { clientX: number; clientY: number }[],
): Event => {
	const event = new Event(type, { bubbles: true });
	Object.defineProperty(event, "touches", { value: touches });
	return event;
};

beforeEach(() => {
	mouseStore = { current: [] };
	touchStore = { current: [] };
	keyboardStore = { current: [] };
	document.body.innerHTML = "";
});

afterEach(() => {
	document.body.innerHTML = "";
});

describe("form discovery", () => {
	test("collects when the widget is a direct child of a form", () => {
		const fixture = build();
		fixture.form.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
		expect(fixture.sinks.mouse).toHaveLength(1);
	});

	test("walks up through intermediate elements to find the form", () => {
		const fixture = build({ nested: true });
		fixture.form.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
		expect(fixture.sinks.mouse).toHaveLength(1);
	});

	test("collects nothing when the widget sits outside any form", () => {
		const fixture = build({ inForm: false });
		fixture.form.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
		document.body.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
		expect(fixture.sinks.mouse).toHaveLength(0);
	});

	test("treats the widget's own form element as the container", () => {
		const form = document.createElement("form");
		document.body.appendChild(form);
		startCollector(
			sinkFor(mouseStore),
			sinkFor(touchStore),
			sinkFor(keyboardStore),
			// The signature asks for a div, but the walk terminates on any FORM —
			// including the root element itself.
			form as unknown as HTMLDivElement,
		);
		form.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
		expect(mouseStore.current).toHaveLength(1);
	});

	test("collects nothing for a detached element with no ancestors", () => {
		const orphan = document.createElement("div");
		startCollector(
			sinkFor(mouseStore),
			sinkFor(touchStore),
			sinkFor(keyboardStore),
			orphan,
		);
		orphan.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
		expect(mouseStore.current).toHaveLength(0);
	});
});

describe("mouse events", () => {
	test("records the pointer position and timestamp", () => {
		const fixture = build();
		fixture.form.dispatchEvent(
			new MouseEvent("mousemove", { bubbles: true, clientX: 12, clientY: 34 }),
		);
		const [event] = fixture.sinks.mouse;
		expect(event?.x).toBe(12);
		expect(event?.y).toBe(34);
		expect(typeof event?.timestamp).toBe("number");
	});

	test("appends every movement in order", () => {
		const fixture = build();
		for (const x of [1, 2, 3]) {
			fixture.form.dispatchEvent(
				new MouseEvent("mousemove", { bubbles: true, clientX: x }),
			);
		}
		expect(fixture.sinks.mouse.map((e) => e.x)).toEqual([1, 2, 3]);
	});

	test("picks up movement bubbling from inside the widget", () => {
		const fixture = build();
		fixture.root.dispatchEvent(
			new MouseEvent("mousemove", { bubbles: true, clientX: 5 }),
		);
		expect(fixture.sinks.mouse).toHaveLength(1);
	});
});

describe("keyboard events", () => {
	test("records key presses with their modifier flags", () => {
		const fixture = build();
		fixture.form.dispatchEvent(
			new KeyboardEvent("keydown", {
				bubbles: true,
				key: "a",
				shiftKey: true,
				ctrlKey: false,
			}),
		);
		const [event] = fixture.sinks.keyboard;
		expect(event?.key).toBe("a");
		expect(event?.isShiftKey).toBe(true);
		expect(event?.isCtrlKey).toBe(false);
	});

	test("records key releases as well as presses", () => {
		const fixture = build();
		fixture.form.dispatchEvent(
			new KeyboardEvent("keydown", { bubbles: true, key: "b" }),
		);
		fixture.form.dispatchEvent(
			new KeyboardEvent("keyup", { bubbles: true, key: "b", ctrlKey: true }),
		);
		expect(fixture.sinks.keyboard).toHaveLength(2);
		expect(fixture.sinks.keyboard[1]?.isCtrlKey).toBe(true);
	});
});

describe("touch events", () => {
	test("records one entry per touch point", () => {
		const fixture = build();
		fixture.form.dispatchEvent(
			touchEvent("touchstart", [
				{ clientX: 1, clientY: 2 },
				{ clientX: 3, clientY: 4 },
			]),
		);
		expect(fixture.sinks.touch.map((t) => [t.x, t.y])).toEqual([
			[1, 2],
			[3, 4],
		]);
	});

	test("records nothing for a touch event with no active points", () => {
		const fixture = build();
		fixture.form.dispatchEvent(touchEvent("touchend", []));
		expect(fixture.sinks.touch).toHaveLength(0);
	});

	test.each(["touchstart", "touchend", "touchcancel", "touchmove"])(
		"listens for %s",
		(type: string) => {
			const fixture = build();
			fixture.form.dispatchEvent(
				touchEvent(type, [{ clientX: 7, clientY: 8 }]),
			);
			expect(fixture.sinks.touch).toHaveLength(1);
		},
	);
});

describe("collector limit", () => {
	// The buffer is capped at 10,000 entries and drops the oldest, so a long
	// session can't grow the page's memory without bound.
	test("keeps the newest entries once the cap is reached", () => {
		const fixture = build();
		for (let i = 0; i < 10_002; i++) {
			fixture.form.dispatchEvent(
				new MouseEvent("mousemove", { bubbles: true, clientX: i }),
			);
		}
		expect(fixture.sinks.mouse).toHaveLength(10_000);
		expect(fixture.sinks.mouse[0]?.x).toBe(2);
		expect(fixture.sinks.mouse[9_999]?.x).toBe(10_001);
	});
});
