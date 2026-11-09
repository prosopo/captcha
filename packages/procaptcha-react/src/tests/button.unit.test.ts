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

import type { Component } from "@prosopo/procaptcha-common";
import { darkTheme, lightTheme, withAlpha } from "@prosopo/widget-skeleton";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { type ButtonProps, mountButton } from "../components/button.js";
import {
	type Mounted,
	asRgb,
	fire,
	fireAndReturn,
	mount,
	styleSnapshot,
} from "./render.js";

let mounted: Mounted;
let button: Component<ButtonProps> | undefined;
const onClick = vi.fn<() => void>();

const props = (
	overrides: {
		themeColor?: "light" | "dark";
		buttonType?: "cancel" | "next";
		text?: string;
	} = {},
): ButtonProps => ({
	themeColor: overrides.themeColor ?? "light",
	buttonType: overrides.buttonType ?? "next",
	text: overrides.text ?? "Next",
	onClick,
});

/**
 * The action is not looked up by tag: which element it is made of is drawn per
 * mount, so a solver cannot find every control in the dialog with `button`. It
 * is the only thing the component appends, which is how the tests reach it
 * without naming it.
 */
const render = (overrides: Parameters<typeof props>[0] = {}): HTMLElement => {
	if (button) {
		button.update(props(overrides));
	} else {
		button = mountButton(mounted.container, props(overrides));
	}
	const element = mounted.container.firstElementChild;
	if (!(element instanceof HTMLElement)) {
		throw new Error("expected an action to be rendered");
	}
	return element;
};

/** Pins the draw that picks the element, so both variants are exercised. */
const renderAs = (
	kind: "button" | "generic",
	overrides: Parameters<typeof props>[0] = {},
): HTMLElement => {
	const draws = vi
		.spyOn(Math, "random")
		.mockReturnValue("button" === kind ? 0 : 0.99);
	try {
		return render(overrides);
	} finally {
		draws.mockRestore();
	}
};

/** The shadow roots attached while rendering, which a closed root keeps from
 * the element itself. */
const renderWithLabel = (
	overrides: Parameters<typeof props>[0] = {},
): { element: HTMLElement; shadows: ShadowRoot[] } => {
	const shadows: ShadowRoot[] = [];
	const attach = Element.prototype.attachShadow;
	const spy = vi
		.spyOn(Element.prototype, "attachShadow")
		.mockImplementation(function (
			this: Element,
			init: ShadowRootInit,
		): ShadowRoot {
			const shadow = attach.call(this, init);
			shadows.push(shadow);
			return shadow;
		});
	try {
		return { element: render(overrides), shadows };
	} finally {
		spy.mockRestore();
	}
};

const textNodesIn = (element: HTMLElement): string[] => {
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
	const found: string[] = [];
	while (walker.nextNode()) {
		found.push(walker.currentNode.nodeValue ?? "");
	}
	return found;
};

const LOWER_CASED =
	"translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')";

const textXPathMatches = (word: string): number =>
	document.evaluate(
		`.//button[contains(${LOWER_CASED}, '${word}')] | .//div[@role="button" and contains(${LOWER_CASED}, '${word}')]`,
		mounted.container,
		null,
		XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
		null,
	).snapshotLength;

beforeEach(() => {
	vi.clearAllMocks();
	process.env.NODE_ENV = "test";
	mounted = mount();
	button = undefined;
});

afterEach(() => {
	button?.destroy();
	mounted.unmount();
	vi.unstubAllGlobals();
});

describe("what the button renders", () => {
	test("is at least 44px tall, so a fingertip can hit it", () => {
		const element = render({ text: "Next" });
		expect(Number.parseFloat(element.style.minHeight)).toBeGreaterThanOrEqual(
			44,
		);
	});

	test("shows its text and labels itself with it", () => {
		const { element, shadows } = renderWithLabel({ text: "Submit" });
		expect(shadows.map((shadow: ShadowRoot) => shadow.textContent)).toEqual([
			"Submit",
		]);
		expect(element.getAttribute("aria-label")).toBe("Submit");
		expect(element.getAttribute("aria-labelledby")).toBeNull();
	});

	test("keeps its label in a closed shadow root", () => {
		const { element, shadows } = renderWithLabel({ text: "Submit" });
		expect(shadows.map((shadow: ShadowRoot) => shadow.mode)).toEqual([
			"closed",
		]);
		expect(element.firstElementChild?.shadowRoot).toBeNull();
	});

	test.each(["button", "generic"] as const)(
		"as a %s, holds no text of its own",
		(kind: "button" | "generic") => {
			const element = renderAs(kind, { text: "Submit" });
			expect(element.textContent).toBe("");
			expect(textNodesIn(element)).toEqual([]);
		},
	);

	test.each(["button", "generic"] as const)(
		"as a %s, is not matched by a text XPath for its label",
		(kind: "button" | "generic") => {
			for (const text of ["Next", "Submit", "Cancel"]) {
				renderAs(kind, { text });
				expect(textXPathMatches(text.toLowerCase())).toBe(0);
			}
		},
	);

	test("the text XPath does match a control that holds its label as text", () => {
		const plain = document.createElement("button");
		plain.textContent = "Next";
		mounted.container.appendChild(plain);
		expect(textXPathMatches("next")).toBe(1);
	});

	test("relabels in place when the text changes", () => {
		const { element, shadows } = renderWithLabel({ text: "Next" });
		const label = element.firstElementChild;
		render({ text: "Submit" });
		expect(element.firstElementChild).toBe(label);
		expect(element.childNodes).toHaveLength(1);
		expect(shadows.map((shadow: ShadowRoot) => shadow.textContent)).toEqual([
			"Submit",
		]);
		expect(element.getAttribute("aria-label")).toBe("Submit");
	});

	test("renders an empty label without falling over", () => {
		// The translations may not have loaded yet, in which case the widget
		// would rather show nothing than a raw translation key.
		const { element, shadows } = renderWithLabel({ text: "" });
		expect(element.textContent).toBe("");
		expect(shadows.map((shadow: ShadowRoot) => shadow.textContent)).toEqual([
			"",
		]);
	});

	test("carries the test hook naming its role", () => {
		const element = render({ buttonType: "cancel" });
		expect(element.getAttribute("data-cy")).toBe("button-cancel");
	});

	test("drops the test hook in a production build", () => {
		process.env.NODE_ENV = "production";
		const element = render({ buttonType: "cancel" });
		expect(element.getAttribute("data-cy")).toBeNull();
	});

	test("is a plain button when it is a button", () => {
		// The widget is usually rendered inside the consumer's own form.
		const element = renderAs("button");
		expect(element.tagName).toBe("BUTTON");
		expect(element.getAttribute("type")).toBe("button");
	});

	test("is a tabbable button by role when it is not a button", () => {
		const element = renderAs("generic");
		expect(element.tagName).toBe("DIV");
		expect(element.getAttribute("role")).toBe("button");
		expect(element.getAttribute("tabindex")).toBe("0");
	});
});

describe("theming", () => {
	test("is a borderless pill, not an outlined box", () => {
		// M3 action-row buttons carry no outline: "text" and "filled" both express
		// themselves through fill and state layer alone. jsdom drops the shorthand
		// `border: none` on the floor, so the observable fact is that no border
		// colour or width is ever painted.
		const element = render();
		expect(element.style.borderRadius).toBe(lightTheme.shape.button);
		expect(element.style.borderColor).toBe("");
		expect(element.style.borderWidth).toBe("");
	});

	test("a cancel button is transparent until it is hovered", () => {
		const element = render({ buttonType: "cancel" });
		expect(element.style.backgroundColor).toBe("transparent");
	});

	test("a next button is filled with the brand primary", () => {
		const element = render({ buttonType: "next" });
		expect(element.style.backgroundColor).toBe(
			asRgb(lightTheme.palette.primary.main),
		);
	});

	test("a dark next button takes its fill from the dark theme", () => {
		const element = render({ buttonType: "next", themeColor: "dark" });
		expect(element.style.backgroundColor).toBe(
			asRgb(darkTheme.palette.primary.main),
		);
	});

	test("hovering a cancel button reveals the primary state layer", () => {
		// M3 "text" button hover is the primary colour at the hover state-layer
		// opacity, not an opaque grey fill.
		const element = render({ buttonType: "cancel" });
		fire(element, "mouseenter");
		expect(element.style.backgroundColor).toBe(
			withAlpha(lightTheme.palette.primary.main, lightTheme.stateLayer.hover),
		);
	});

	test("a touch screen gets no state layer", () => {
		// The layer would cost the visitor their first tap: iOS reads a tap that
		// repaints the control as a request to show hover and withholds the
		// click, so the button would have to be tapped twice.
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: "(hover: hover)" !== query,
			media: query,
		}));
		const element = render({ buttonType: "cancel" });

		fire(element, "mouseenter");

		// Still the cancel button's resting fill, not the primary state layer.
		expect(element.style.backgroundColor).toBe("transparent");
	});

	test("hovering a next button composites a state layer over its fill", () => {
		// The fill itself does not change — M3 lays the on-primary colour over it
		// at the hover opacity, which this component paints as an inset shadow.
		const element = render({ buttonType: "next" });
		fire(element, "mouseenter");
		expect(element.style.backgroundColor).toBe(
			asRgb(lightTheme.palette.primary.main),
		);
		expect(element.style.boxShadow).toContain(
			withAlpha(
				lightTheme.palette.primary.contrastText,
				lightTheme.stateLayer.hover,
			),
		);
	});

	test("leaving the button drops the state layer again", () => {
		const element = render({ buttonType: "next" });
		fire(element, "mouseenter");
		fire(element, "mouseleave");
		expect(element.style.backgroundColor).toBe(
			asRgb(lightTheme.palette.primary.main),
		);
		expect(element.style.boxShadow).not.toContain("inset");
	});

	test("a filled button keeps its on-primary text throughout", () => {
		// The label colour is fixed by the fill it sits on, so hovering must not
		// move it — only the state layer above the fill changes.
		const element = render();
		expect(element.style.color).toBe(
			asRgb(lightTheme.palette.primary.contrastText),
		);
		fire(element, "mouseenter");
		expect(element.style.color).toBe(
			asRgb(lightTheme.palette.primary.contrastText),
		);
	});

	test("re-rendering with the same theme keeps the styling stable", () => {
		const element = render({ themeColor: "dark" });
		const before = styleSnapshot(element);
		render({ themeColor: "dark" });
		expect(styleSnapshot(element)).toEqual(before);
	});
});

describe("clicking", () => {
	test("a real click calls the handler", () => {
		fire(render(), "click");
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	test("a synthetic click is ignored", () => {
		// A script-dispatched click is what an automated solver produces; the
		// widget must not treat it as a human pressing the button.
		fire(render(), "click", { trusted: false });
		expect(onClick).not.toHaveBeenCalled();
	});

	test("a real click does not submit the surrounding form", () => {
		// The widget is usually rendered inside the consumer's form, and a
		// button defaults to type=submit.
		const event = fireAndReturn(render(), "click");
		expect(event.defaultPrevented).toBe(true);
	});

	test("an ignored click leaves the event alone", () => {
		const event = fireAndReturn(render(), "click", { trusted: false });
		expect(event.defaultPrevented).toBe(false);
	});

	test("every click is reported, not just the first", () => {
		const element = render();
		fire(element, "click");
		fire(element, "click");
		expect(onClick).toHaveBeenCalledTimes(2);
	});

	test.each(["button", "generic"] as const)(
		"as a %s, can take keyboard focus",
		(kind: "button" | "generic") => {
			const element = renderAs(kind);
			element.focus();
			expect(document.activeElement).toBe(element);
		},
	);

	test("Enter and Space on a button arrive as a click and call the handler", () => {
		// A browser turns either key on a focused button into a click with no
		// press count, which jsdom does not synthesise.
		fire(renderAs("button"), "click", { detail: 0 });
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	test("Enter and Space call the handler when it is not a button", () => {
		const element = renderAs("generic");
		fire(element, "keydown", { key: "Enter" });
		fire(element, "keydown", { key: " " });
		expect(onClick).toHaveBeenCalledTimes(2);
	});

	test("a destroyed button stops listening", () => {
		const element = render();
		button?.destroy();
		button = undefined;
		element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		expect(onClick).not.toHaveBeenCalled();
	});
});
