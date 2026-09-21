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

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Teardown } from "../dom/component.js";
import { createElement } from "../dom/element.js";
import {
	type ControlKind,
	createControl,
	randomControlKind,
	wrapRandomly,
} from "../dom/obfuscation.js";
import { type Mounted, fire, fireAndReturn, mount } from "./domHarness.js";

let teardown: Teardown;
let mounted: Mounted;
const onActivate = vi.fn<(event: MouseEvent | KeyboardEvent) => void>();

const depthAbove = (innermost: HTMLElement, outermost: HTMLElement): number => {
	let depth = 0;
	let node: HTMLElement | null = innermost;
	while (node && node !== outermost) {
		node = node.parentElement;
		depth += 1;
	}
	return depth;
};

const ancestorsOf = (
	innermost: HTMLElement,
	outermost: HTMLElement,
): HTMLElement[] => {
	const ancestors: HTMLElement[] = [];
	let node: HTMLElement | null = innermost.parentElement;
	while (node) {
		ancestors.push(node);
		if (node === outermost) {
			break;
		}
		node = node.parentElement;
	}
	return ancestors;
};

const render = (kind?: ControlKind): HTMLElement => {
	const control = createControl(teardown, {
		kind,
		text: "Reload",
		onActivate,
	});
	mounted.container.appendChild(control);
	return control;
};

beforeEach(() => {
	vi.clearAllMocks();
	teardown = new Teardown();
	mounted = mount();
});

afterEach(() => {
	teardown.run();
	mounted.unmount();
});

describe("wrapRandomly", () => {
	test("keeps the wrapped node intact and hands back the outermost wrapper", () => {
		const innermost = createElement("div", { text: "panel" });

		const outermost = wrapRandomly(innermost, 2, 2);

		expect(outermost).not.toBe(innermost);
		expect(outermost.textContent).toBe("panel");
		expect(depthAbove(innermost, outermost)).toBe(2);
	});

	test("returns the node itself when no wrappers are drawn", () => {
		const innermost = createElement("div");

		expect(wrapRandomly(innermost, 0, 0)).toBe(innermost);
	});

	test("varies the depth within the bounds it is given", () => {
		const depths = new Set<number>();
		for (let attempt = 0; attempt < 200; attempt += 1) {
			const innermost = createElement("div");
			depths.add(depthAbove(innermost, wrapRandomly(innermost, 1, 3)));
		}
		expect(Array.from(depths).sort()).toEqual([1, 2, 3]);
	});

	test("generates no boxes, so the wrapped node keeps its place in the layout", () => {
		// Depth that changed the layout would move the challenge around the
		// screen rather than only move its markup.
		const innermost = createElement("div");
		const outermost = wrapRandomly(innermost, 3, 3);

		for (const wrapper of ancestorsOf(innermost, outermost)) {
			expect(wrapper.style.display).toBe("contents");
		}
	});

	test("only uses elements a screen reader announces nothing for", () => {
		const tags = new Set<string>();
		for (let attempt = 0; attempt < 200; attempt += 1) {
			const innermost = createElement("div");
			for (const wrapper of ancestorsOf(
				innermost,
				wrapRandomly(innermost, 2, 2),
			)) {
				tags.add(wrapper.tagName);
			}
		}
		expect(Array.from(tags).sort()).toEqual(["DIV", "SPAN"]);
	});

	test("names every wrapper differently", () => {
		const innermost = createElement("div");
		const outermost = wrapRandomly(innermost, 4, 4);

		const names = ancestorsOf(innermost, outermost).map(
			(wrapper: HTMLElement) => wrapper.className,
		);
		expect(new Set(names).size).toBe(4);
		for (const name of names) {
			expect(name).toMatch(/^[a-zA-Z][a-zA-Z0-9]{7}$/);
		}
	});
});

describe("randomControlKind", () => {
	test("reaches both kinds", () => {
		const kinds = new Set(
			Array.from({ length: 200 }, () => randomControlKind()),
		);
		expect(Array.from(kinds).sort()).toEqual(["button", "generic"]);
	});
});

describe("a control made of a button", () => {
	test("is a button that cannot submit the page's form", () => {
		const control = render("button");

		expect(control.tagName).toBe("BUTTON");
		expect(control.getAttribute("type")).toBe("button");
	});

	test("activates on a click", () => {
		fire(render("button"), "click");

		expect(onActivate).toHaveBeenCalledTimes(1);
	});

	test("leaves the browser to turn Enter into a click", () => {
		// Adding a keydown handler here would fire the callback twice for one
		// press, because the browser synthesises the click as well.
		fire(render("button"), "keydown", { key: "Enter" });

		expect(onActivate).not.toHaveBeenCalled();
	});
});

describe("a control made of anything else", () => {
	test("is a button to assistive tech, and is tabbable", () => {
		const control = render("generic");

		expect(control.tagName).toBe("DIV");
		expect(control.getAttribute("role")).toBe("button");
		expect(control.getAttribute("tabindex")).toBe("0");
	});

	test("activates on a click", () => {
		fire(render("generic"), "click");

		expect(onActivate).toHaveBeenCalledTimes(1);
	});

	test("activates on Enter and on Space", () => {
		const control = render("generic");

		fire(control, "keydown", { key: "Enter" });
		fire(control, "keydown", { key: " " });

		expect(onActivate).toHaveBeenCalledTimes(2);
	});

	test("stops Space scrolling the page out from under the challenge", () => {
		const event = fireAndReturn(render("generic"), "keydown", { key: " " });

		expect(event.defaultPrevented).toBe(true);
	});

	test("ignores keys that do not activate a button", () => {
		fire(render("generic"), "keydown", { key: "a" });

		expect(onActivate).not.toHaveBeenCalled();
	});
});

describe("whichever element it is made of", () => {
	const kinds: ControlKind[] = ["button", "generic"];

	test("ignores a click no user made", () => {
		for (const kind of kinds) {
			fire(render(kind), "click", { trusted: false });
		}

		expect(onActivate).not.toHaveBeenCalled();
	});

	test("ignores a keypress no user made", () => {
		fire(render("generic"), "keydown", { key: "Enter", trusted: false });

		expect(onActivate).not.toHaveBeenCalled();
	});

	test("carries the caller's content and attributes", () => {
		for (const kind of kinds) {
			const control = createControl(teardown, {
				kind,
				className: "given",
				text: "Cancel",
				attributes: { "aria-label": "Cancel" },
				onActivate,
			});

			expect(control.className).toBe("given");
			expect(control.textContent).toBe("Cancel");
			expect(control.getAttribute("aria-label")).toBe("Cancel");
		}
	});

	test("stops listening once the component tears down", () => {
		const control = render();
		teardown.run();

		fire(control, "click");
		fire(control, "keydown", { key: "Enter" });

		expect(onActivate).not.toHaveBeenCalled();
	});

	test("picks its element per control, not once per page", () => {
		const tags = new Set(Array.from({ length: 200 }, () => render().tagName));
		expect(Array.from(tags).sort()).toEqual(["BUTTON", "DIV"]);
	});
});
