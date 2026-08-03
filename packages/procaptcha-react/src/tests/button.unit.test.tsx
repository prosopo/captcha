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

import { darkTheme, lightTheme } from "@prosopo/widget-skeleton";
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
	test("a light button takes its border from the light theme", () => {
		const button = render({ themeColor: "light" });
		expect(button.style.borderColor).toBe(asRgb(lightTheme.palette.grey[500]));
	});

	test("a dark button takes its border from the dark theme", () => {
		const button = render({ themeColor: "dark" });
		expect(button.style.borderColor).toBe(asRgb(darkTheme.palette.grey[500]));
	});

	test("a cancel button is transparent until it is hovered", () => {
		const button = render({ buttonType: "cancel" });
		expect(button.style.backgroundColor).toBe("transparent");
	});

	test("a next button is filled with the background colour", () => {
		const button = render({ buttonType: "next" });
		expect(button.style.backgroundColor).toBe(
			asRgb(lightTheme.palette.background.default),
		);
	});

	test("hovering a cancel button reveals the grey fill", () => {
		const button = render({ buttonType: "cancel" });
		fire(button, "mouseover");
		expect(button.style.backgroundColor).toBe(
			asRgb(lightTheme.palette.grey[600]),
		);
	});

	test("hovering a next button reveals the primary fill", () => {
		const button = render({ buttonType: "next" });
		fire(button, "mouseover");
		expect(button.style.backgroundColor).toBe(
			asRgb(lightTheme.palette.primary.main),
		);
	});

	test("leaving the button puts the resting fill back", () => {
		const button = render({ buttonType: "next" });
		fire(button, "mouseover");
		fire(button, "mouseout");
		expect(button.style.backgroundColor).toBe(
			asRgb(lightTheme.palette.background.default),
		);
	});

	test("hover switches the text to the contrast colour", () => {
		const button = render();
		expect(button.style.color).toBe(
			asRgb(lightTheme.palette.background.contrastText),
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
