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

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { type ModalComponent, mountModal } from "../components/modal.js";
import { type Mounted, mount } from "./render.js";

let mounted: Mounted;
let modal: ModalComponent | undefined;

const render = (show: boolean, children = "challenge"): ModalComponent => {
	if (!modal) {
		modal = mountModal({ show });
		if ("" !== children) {
			const paragraph = document.createElement("p");
			paragraph.textContent = children;
			modal.content.appendChild(paragraph);
		}
	} else {
		modal.update({ show });
	}
	return modal;
};

// Every class the modal renders is drawn per mount, so the tests find the
// layer and the panel by their development-only hooks and the inner panel by
// the handle the component hands back — which is what a caller has too.
const OUTER_SELECTOR = '[data-cy="challenge-surface"]';
const PANEL_SELECTOR = '[data-cy="challenge-content"]';

const outer = (): HTMLElement => {
	const element = document.querySelector<HTMLElement>(OUTER_SELECTOR);
	if (!element) throw new Error("expected the modal to be rendered");
	return element;
};

beforeEach(() => {
	mounted = mount();
	modal = undefined;
});

afterEach(() => {
	modal?.destroy();
	mounted.unmount();
});

describe("where the modal renders", () => {
	test("attaches itself to the document body, not to the widget", () => {
		// A consumer's stacking or overflow rules would otherwise clip or hide
		// the challenge, which is why this is portalled in the first place.
		render(true);
		expect(outer().parentElement).toBe(document.body);
		expect(mounted.container.querySelector(OUTER_SELECTOR)).toBeNull();
	});

	test("renders its children inside the inner panel", () => {
		const inner = render(true).content;
		expect(inner.textContent).toBe("challenge");
		expect(outer().contains(inner)).toBe(true);
	});

	test("renders an empty panel when there is nothing to show", () => {
		expect(render(true, "").content.textContent).toBe("");
	});

	test("is removed from the body when the widget unmounts", () => {
		render(true);
		modal?.destroy();
		modal = undefined;
		expect(document.querySelector(OUTER_SELECTOR)).toBeNull();
	});

	test("nothing about its markup survives to the next page load", () => {
		// Names, nesting depth and the panel's exact offset are all drawn per
		// mount, so a selector or a click coordinate written down once is dead.
		const shapes = new Set(
			Array.from({ length: 10 }, () => {
				const instance = mountModal({ show: true });
				const panel = document.querySelector<HTMLElement>(PANEL_SELECTOR);
				const shape = [
					document.querySelector<HTMLElement>(OUTER_SELECTOR)?.className,
					panel?.className,
					instance.content.className,
					panel?.innerHTML,
				].join("|");
				instance.destroy();
				return shape;
			}),
		);
		expect(shapes.size).toBe(10);
	});
});

describe("showing and hiding", () => {
	test("a shown modal lays its contents out", () => {
		render(true);
		expect(outer().style.display).toBe("flex");
	});

	test("a hidden modal stays in the DOM but is not displayed", () => {
		// The children keep their state — the challenge is not re-fetched when
		// the modal is reopened.
		render(false);
		expect(outer().style.display).toBe("none");
		expect(outer().textContent).toBe("challenge");
	});

	test("toggling show flips the display without remounting", () => {
		render(false);
		const before = outer();
		render(true);
		expect(outer()).toBe(before);
		expect(outer().style.display).toBe("flex");
	});
});

describe("stacking", () => {
	test("sits above everything a host page is likely to stack", () => {
		render(true);
		expect(outer().style.zIndex).toBe("2147483646");
	});

	test("covers the viewport so the page behind cannot be clicked", () => {
		render(true);
		expect(outer().style.position).toBe("fixed");
		expect(outer().style.minHeight).toBe("100dvh");
	});

	test("does not lift the challenge by its own height on iOS", () => {
		// The panel used to be translated up by a full 100% of its height, so a
		// challenge taller than half the viewport lost its instruction line and
		// top row of images off the top of the screen, with no way to scroll to
		// them. Centring is the layer's job now.
		render(true);
		const panel = outer().querySelector<HTMLElement>(PANEL_SELECTOR);

		expect(panel?.className).not.toContain("ios-lift");
		expect(panel?.style.transform).toBe("");
		expect(
			document.getElementById("prosopo-challenge-surface-ios-lift"),
		).toBeNull();
	});

	test("lets a challenge taller than the viewport scroll instead of clipping", () => {
		render(true);
		const panel = outer().querySelector<HTMLElement>(PANEL_SELECTOR);

		expect(panel?.style.maxHeight).toBe("100%");
		expect(panel?.style.overflowY).toBe("auto");
	});
});
