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

const render = (
	overrides: Parameters<typeof props>[0] = {},
): HTMLButtonElement => {
	if (button) {
		button.update(props(overrides));
	} else {
		button = mountButton(mounted.container, props(overrides));
	}
	const element = mounted.container.querySelector("button");
	if (!element) throw new Error("expected a button to be rendered");
	return element;
};

beforeEach(() => {
	vi.clearAllMocks();
	process.env.NODE_ENV = "test";
	mounted = mount();
	button = undefined;
});

afterEach(() => {
	button?.destroy();
	mounted.unmount();
});

describe("what the button renders", () => {
	test("shows its text and labels itself with it", () => {
		const element = render({ text: "Submit" });
		expect(element.textContent).toBe("Submit");
		expect(element.getAttribute("aria-label")).toBe("Submit");
	});

	test("renders an empty label without falling over", () => {
		// The translations may not have loaded yet, in which case the widget
		// would rather show nothing than a raw translation key.
		const element = render({ text: "" });
		expect(element.textContent).toBe("");
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

	test("a destroyed button stops listening", () => {
		const element = render();
		button?.destroy();
		button = undefined;
		element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		expect(onClick).not.toHaveBeenCalled();
	});
});
