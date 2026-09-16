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

import { darkTheme, lightTheme, withAlpha } from "@prosopo/widget-skeleton";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import Button from "../components/Button.js";
import { type Mounted, asRgb, fire, fireAndReturn, mount } from "./render.js";

let mounted: Mounted;
const onClick = vi.fn<() => void>();

const render = (
	props: {
		themeColor?: "light" | "dark";
		buttonType?: "cancel" | "next";
		text?: string;
	} = {},
): HTMLButtonElement => {
	mounted.render(
		<Button
			themeColor={props.themeColor ?? "light"}
			buttonType={props.buttonType ?? "next"}
			text={props.text ?? "Next"}
			onClick={onClick}
		/>,
	);
	const button = mounted.container.querySelector("button");
	if (!button) throw new Error("expected a button to be rendered");
	return button;
};

beforeEach(() => {
	vi.clearAllMocks();
	process.env.NODE_ENV = "test";
	mounted = mount();
});

afterEach(() => {
	mounted.unmount();
});

describe("what the button renders", () => {
	test("shows its text and labels itself with it", () => {
		const button = render({ text: "Submit" });
		expect(button.textContent).toBe("Submit");
		expect(button.getAttribute("aria-label")).toBe("Submit");
	});

	test("renders an empty label without falling over", () => {
		// The translations may not have loaded yet, in which case the widget
		// would rather show nothing than a raw translation key.
		const button = render({ text: "" });
		expect(button.textContent).toBe("");
	});

	test("carries the test hook naming its role", () => {
		const button = render({ buttonType: "cancel" });
		expect(button.getAttribute("data-cy")).toBe("button-cancel");
	});

	test("drops the test hook in a production build", () => {
		process.env.NODE_ENV = "production";
		const button = render({ buttonType: "cancel" });
		expect(button.getAttribute("data-cy")).toBeNull();
	});
});

describe("theming", () => {
	test("is a borderless pill, not an outlined box", () => {
		// M3 action-row buttons carry no outline: "text" and "filled" both express
		// themselves through fill and state layer alone. jsdom drops the shorthand
		// `border: none` on the floor, so the observable fact is that no border
		// colour or width is ever painted.
		const button = render();
		expect(button.style.borderRadius).toBe(lightTheme.shape.button);
		expect(button.style.borderColor).toBe("");
		expect(button.style.borderWidth).toBe("");
	});

	test("a cancel button is transparent until it is hovered", () => {
		const button = render({ buttonType: "cancel" });
		expect(button.style.backgroundColor).toBe("transparent");
	});

	test("a next button is filled with the brand primary", () => {
		const button = render({ buttonType: "next" });
		expect(button.style.backgroundColor).toBe(
			asRgb(lightTheme.palette.primary.main),
		);
	});

	test("a dark next button takes its fill from the dark theme", () => {
		const button = render({ buttonType: "next", themeColor: "dark" });
		expect(button.style.backgroundColor).toBe(
			asRgb(darkTheme.palette.primary.main),
		);
	});

	test("hovering a cancel button reveals the primary state layer", () => {
		// M3 "text" button hover is the primary colour at the hover state-layer
		// opacity, not an opaque grey fill.
		const button = render({ buttonType: "cancel" });
		fire(button, "mouseover");
		expect(button.style.backgroundColor).toBe(
			withAlpha(lightTheme.palette.primary.main, lightTheme.stateLayer.hover),
		);
	});

	test("hovering a next button composites a state layer over its fill", () => {
		// The fill itself does not change — M3 lays the on-primary colour over it
		// at the hover opacity, which this component paints as an inset shadow.
		const button = render({ buttonType: "next" });
		fire(button, "mouseover");
		expect(button.style.backgroundColor).toBe(
			asRgb(lightTheme.palette.primary.main),
		);
		expect(button.style.boxShadow).toContain(
			withAlpha(
				lightTheme.palette.primary.contrastText,
				lightTheme.stateLayer.hover,
			),
		);
	});

	test("leaving the button drops the state layer again", () => {
		const button = render({ buttonType: "next" });
		fire(button, "mouseover");
		fire(button, "mouseout");
		expect(button.style.backgroundColor).toBe(
			asRgb(lightTheme.palette.primary.main),
		);
		expect(button.style.boxShadow).not.toContain("inset");
	});

	test("a filled button keeps its on-primary text throughout", () => {
		// The label colour is fixed by the fill it sits on, so hovering must not
		// move it — only the state layer above the fill changes.
		const button = render();
		expect(button.style.color).toBe(
			asRgb(lightTheme.palette.primary.contrastText),
		);
		fire(button, "mouseover");
		expect(button.style.color).toBe(
			asRgb(lightTheme.palette.primary.contrastText),
		);
	});

	test("re-rendering with the same theme keeps the styling stable", () => {
		const button = render({ themeColor: "dark" });
		const before = button.getAttribute("style");
		render({ themeColor: "dark" });
		expect(button.getAttribute("style")).toBe(before);
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
		const button = render();
		fire(button, "click");
		fire(button, "click");
		expect(onClick).toHaveBeenCalledTimes(2);
	});
});
