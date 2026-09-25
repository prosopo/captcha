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
import { type CheckboxProps, mountCheckbox } from "../components/checkbox.js";
import type { Component } from "../dom/component.js";
import {
	type Mounted,
	asRgb,
	fire,
	fireAndReturn,
	mount,
} from "./domHarness.js";

/**
 * The checkbox is the only control on the resting widget, so it carries the
 * whole trusted-input gate: a script-dispatched click is exactly how a solver
 * would ask for a captcha, and honouring one hands the challenge over.
 */

// The class names are drawn per mount, so the tests reach for what the control
// means rather than what this render happened to call it — which is the same
// constraint the change puts on anyone scripting the widget from outside.
const SPINNER_SELECTOR = '[role="status"]';

const STYLE_SELECTOR = (mode: string): string =>
	`style[data-prosopo-style^="checkbox-"][data-prosopo-style$="-${mode}"]`;

let mounted: Mounted;
let checkbox: Component<CheckboxProps> | undefined;
const onChange = vi.fn<CheckboxProps["onChange"]>();

const props = (overrides: Partial<CheckboxProps> = {}): CheckboxProps => ({
	theme: lightTheme,
	checked: false,
	onChange,
	labelText: "I am human",
	loading: false,
	...overrides,
});

const render = (overrides: Partial<CheckboxProps> = {}): void => {
	if (checkbox) {
		checkbox.update(props(overrides));
	} else {
		checkbox = mountCheckbox(mounted.container, props(overrides));
	}
};

const box = (): HTMLInputElement => {
	const element = mounted.container.querySelector("input");
	if (!element) throw new Error("expected a checkbox to be rendered");
	return element;
};

const label = (): HTMLLabelElement => {
	const element = mounted.container.querySelector("label");
	if (!element) throw new Error("expected a label to be rendered");
	return element;
};

beforeEach(() => {
	vi.clearAllMocks();
	mounted = mount();
	checkbox = undefined;
});

afterEach(() => {
	checkbox?.destroy();
	mounted.unmount();
	vi.unstubAllGlobals();
});

describe("what the checkbox renders", () => {
	test("renders a checkbox input labelled for assistive tech", () => {
		render();
		expect(box().getAttribute("type")).toBe("checkbox");
		expect(box().getAttribute("aria-label")).toBe("I am human");
	});

	test("shows the label text", () => {
		render({ labelText: "Ich bin ein Mensch" });
		expect(label().textContent).toBe("Ich bin ein Mensch");
	});

	test("renders an empty label rather than a raw translation key", () => {
		// The widget mounts before i18next has loaded its namespace.
		render({ labelText: "" });
		expect(label().textContent).toBe("");
	});

	test("carries the test hook cypress selects on", () => {
		render();
		expect(box().getAttribute("data-cy")).toBe("captcha-checkbox");
	});

	test("withholds the test hook from a production build", () => {
		// It is a fixed selector for the one control a solver wants to click, so
		// it must not survive the build that ships to real sites. isDevMode is
		// read per render, which is what lets this be set after import.
		const originalNodeEnv: string | undefined = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";
		try {
			render();
			expect(box().getAttribute("data-cy")).toBeNull();
		} finally {
			if (originalNodeEnv === undefined) {
				Reflect.deleteProperty(process.env, "NODE_ENV");
			} else {
				process.env.NODE_ENV = originalNodeEnv;
			}
		}
	});

	test("reflects the checked prop", () => {
		render({ checked: true });
		expect(box().checked).toBe(true);
	});

	test("swaps the box for a spinner while loading", () => {
		render({ loading: true });
		expect(mounted.container.querySelector("input")).toBeNull();
		expect(mounted.container.querySelector(SPINNER_SELECTOR)).not.toBeNull();
	});

	test("puts the box back when loading finishes", () => {
		render({ loading: true });
		render({ loading: false });
		expect(box()).not.toBeNull();
		expect(mounted.container.querySelector(SPINNER_SELECTOR)).toBeNull();
	});

	test("keeps the label visible alongside the spinner", () => {
		render({ loading: true });
		expect(label().textContent).toBe("I am human");
	});

	test("injects its stylesheet into the widget's own container", () => {
		// Emitting into the host page's head would let the widget restyle the
		// dapp around it.
		render();
		expect(
			mounted.container.querySelector(STYLE_SELECTOR("light")),
		).not.toBeNull();
	});

	test("swaps the stylesheet when the theme changes", () => {
		// The sheet carries the label colour, font and focus ring, so a theme
		// that only re-applied the inline box styles would leave those stale.
		render();
		render({ theme: darkTheme });

		expect(mounted.container.querySelector(STYLE_SELECTOR("light"))).toBeNull();
		const dark = mounted.container.querySelector(STYLE_SELECTOR("dark"));
		expect(dark).not.toBeNull();
		expect(dark?.textContent).toContain(darkTheme.palette.onSurface);
	});
});

describe("what a scripted solver can hold on to", () => {
	const mountFresh = (): Mounted => {
		const fresh: Mounted = mount();
		mountCheckbox(fresh.container, props());
		return fresh;
	};

	const inputIn = (target: Mounted): HTMLInputElement => {
		const element = target.container.querySelector("input");
		if (!element) throw new Error("expected a checkbox to be rendered");
		return element;
	};

	test("names the box and the label differently on every mount", () => {
		render();
		const other: Mounted = mountFresh();
		try {
			expect(box().className).not.toBe(inputIn(other).className);
			expect(box().className).not.toBe("");
			expect(label().className).not.toBe(
				other.container.querySelector("label")?.className,
			);
		} finally {
			other.unmount();
		}
	});

	test("the names it renders are the names its stylesheet targets", () => {
		// A generated name reaching the markup but not the sheet would silently
		// drop the focus ring and the label's colour.
		render();
		const styles: string =
			mounted.container.querySelector(STYLE_SELECTOR("light"))?.textContent ??
			"";
		expect(styles).toContain(`.${box().className}:focus-visible`);
		expect(styles).toContain(`.${label().className} {`);
	});

	test("gives two checkboxes in one container their own stylesheets", () => {
		// The sheets used to be shared by theme; now they describe different
		// elements, so one being torn down must not strip the other's rules.
		render();
		const second: Component<CheckboxProps> = mountCheckbox(
			mounted.container,
			props(),
		);
		try {
			expect(
				mounted.container.querySelectorAll(STYLE_SELECTOR("light")),
			).toHaveLength(2);
		} finally {
			second.destroy();
		}
	});

	test("puts the box in the same place on every mount", () => {
		const offsets = new Set<string>();
		for (let attempt = 0; attempt < 40; attempt += 1) {
			const fresh: Mounted = mountFresh();
			const style = inputIn(fresh).style;
			const [top, right, bottom, left] = [
				style.marginTop,
				style.marginRight,
				style.marginBottom,
				style.marginLeft,
			].map((margin: string) => Number.parseInt(margin, 10));
			expect((top ?? 0) + (bottom ?? 0)).toBe(30);
			expect((left ?? 0) + (right ?? 0)).toBe(30);
			offsets.add(`${top}/${left}`);
			fresh.unmount();
		}
		expect(offsets).toEqual(new Set(["15/15"]));
	});

	test("keeps the spinner on the same offset as the box", () => {
		// The spinner stands in for the box, so a different offset would make the
		// widget twitch every time a check started.
		render();
		const boxMargin: string = box().style.margin;
		render({ loading: true });
		const styles: string =
			mounted.container.querySelector(STYLE_SELECTOR("light"))?.textContent ??
			"";
		const spinnerClass: string =
			mounted.container.querySelector(SPINNER_SELECTOR)?.className ?? "";
		expect(styles).toContain(`.${spinnerClass} {`);
		expect(styles).toContain(`margin: ${boxMargin} !important`);
	});
});

describe("the error state", () => {
	test("replaces the label with a link to the FAQ", () => {
		render({ error: "Cannot load CAPTCHA" });
		const link = label().querySelector("a");
		expect(link?.textContent).toBe("Cannot load CAPTCHA");
		expect(link?.getAttribute("href")).toContain("faq");
	});

	test("paints the message in the theme's error colour", () => {
		render({ error: "Cannot load CAPTCHA" });
		expect(label().querySelector("a")?.style.color).toBe(
			asRgb(lightTheme.palette.error.main),
		);
	});

	test("makes the message selectable so a support code can be copied", () => {
		render({ error: "Cannot load CAPTCHA" });
		expect(label().style.userSelect).toBe("text");
		expect(label().querySelector("a")?.style.userSelect).toBe("text");
	});

	test("disables the box, since there is nothing to solve", () => {
		render({ error: "Cannot load CAPTCHA" });
		expect(box().disabled).toBe(true);
	});

	test("drops the selectable override once the error clears", () => {
		render({ error: "Cannot load CAPTCHA" });
		render({ error: undefined });
		expect(label().style.userSelect).toBe("");
		expect(label().textContent).toBe("I am human");
		expect(box().disabled).toBe(false);
	});

	test("announces the error through a live region that was there from mount", () => {
		render();
		const region = mounted.container.querySelector('[aria-live="polite"]');
		expect(region?.textContent).toBe("");
		render({ error: "Cannot load CAPTCHA" });
		expect(mounted.container.querySelector('[aria-live="polite"]')).toBe(
			region,
		);
		expect(region?.textContent).toBe("Cannot load CAPTCHA");
		render({ error: undefined });
		expect(region?.textContent).toBe("");
	});

	test("takes its live region with it on destroy", () => {
		render({ error: "Cannot load CAPTCHA" });
		checkbox?.destroy();
		checkbox = undefined;
		expect(mounted.container.querySelector("[aria-live]")).toBeNull();
	});
});

describe("theming", () => {
	test("takes its outline from the theme's checkbox border when unchecked", () => {
		render();
		expect(box().style.borderColor).toBe(
			asRgb(lightTheme.palette.checkbox.border),
		);
		expect(box().style.backgroundColor).toBe(asRgb(lightTheme.palette.surface));
	});

	test("fills with the checkbox colour when checked", () => {
		render({ checked: true });
		expect(box().style.backgroundColor).toBe(
			asRgb(lightTheme.palette.checkbox.fill),
		);
		expect(box().style.borderColor).toBe(
			asRgb(lightTheme.palette.checkbox.fill),
		);
	});

	test("paints the tick itself rather than relying on the native control", () => {
		// The native checked appearance cannot be themed, so the state must look
		// identical in light and dark mode. jsdom's CSS parser rejects the inline
		// `url("data:image/svg+xml,…")` (the payload carries spaces and quotes),
		// so the tick image itself is unobservable here — what is observable is
		// that the control is unstyled and laid out to receive a painted tick.
		render({ checked: true });
		expect(box().style.appearance).toBe("none");
		expect(box().style.backgroundRepeat).toBe("no-repeat");
		expect(box().style.backgroundPosition).toBe("center");
		expect(box().style.backgroundSize).toBe("20px 20px");
	});

	test("shows no tick when unchecked", () => {
		render();
		expect(box().style.backgroundImage).toBe("none");
	});

	test("takes the dark theme's tokens in dark mode", () => {
		render({ theme: darkTheme });
		expect(box().style.borderColor).toBe(
			asRgb(darkTheme.palette.checkbox.border),
		);
		expect(box().style.backgroundColor).toBe(asRgb(darkTheme.palette.surface));
	});

	test("hover lays an on-surface state layer around the box", () => {
		// M3 expresses hover as a state layer, not as a change of stroke colour.
		render();
		fire(box(), "mouseenter");
		expect(box().style.boxShadow).toContain(
			withAlpha(lightTheme.palette.onSurface, lightTheme.stateLayer.hover),
		);
	});

	test("a checked box hovers with its own fill as the state layer", () => {
		render({ checked: true });
		fire(box(), "mouseenter");
		expect(box().style.boxShadow).toContain(
			withAlpha(lightTheme.palette.checkbox.fill, lightTheme.stateLayer.hover),
		);
	});

	test("lays no state layer on a touch screen", () => {
		// The layer would cost the visitor their first tap: iOS reads a tap that
		// repaints the control as a request to show hover, and withholds the
		// click, so the box has to be tapped twice to tick.
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: "(hover: hover)" !== query,
			media: query,
		}));
		render();

		fire(box(), "mouseenter");

		expect(box().style.boxShadow).toBe("none");
	});

	test("leaving drops the state layer", () => {
		render();
		fire(box(), "mouseenter");
		fire(box(), "mouseleave");
		expect(box().style.boxShadow).toBe("none");
	});
});

describe("activating it", () => {
	test("a real click reports the change", async () => {
		render();
		fire(box(), "click");
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	test("the label names the box, so pressing the words activates it", () => {
		render();
		expect(label().htmlFor).toBe(box().id);
		expect(label().htmlFor).not.toBe("");
	});

	test("the label follows the box when the id is regenerated", () => {
		render();
		const first = box().id;
		render({ labelText: "still human" });
		expect(box().id).not.toBe(first);
		expect(label().htmlFor).toBe(box().id);
	});

	test("a synthetic click is ignored", async () => {
		// A script-dispatched click is what an automated solver produces.
		render();
		fire(box(), "click", { trusted: false });
		expect(onChange).not.toHaveBeenCalled();
	});

	test("Enter activates it from the keyboard", () => {
		render();
		fire(box(), "keydown", { key: "Enter" });
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	test("other keys do not activate it", () => {
		render();
		fire(box(), "keydown", { key: "a" });
		fire(box(), "keydown", { key: "Tab" });
		expect(onChange).not.toHaveBeenCalled();
	});

	test("a synthetic Enter is ignored", () => {
		render();
		fire(box(), "keydown", { key: "Enter", trusted: false });
		expect(onChange).not.toHaveBeenCalled();
	});

	test("hands the raw event through, so coordinates survive", () => {
		// The solution salt records where on the page the user clicked.
		render();
		fire(box(), "click", { clientX: 42, clientY: 7 });
		const event = onChange.mock.calls[0]?.[0] as MouseEvent;
		expect(event.clientX).toBe(42);
		expect(event.clientY).toBe(7);
	});

	test("prevents the browser toggling the box itself", () => {
		// The input is controlled by `props.checked`; letting the browser flip it
		// would show a tick the widget never agreed to. Only the cancellation is
		// asserted — jsdom's canceled-activation behaviour restores the post-flip
		// checkedness rather than the pre-click one, so the resulting `checked`
		// here is jsdom's, not the browser's.
		render();
		const event = fireAndReturn(box(), "click");
		expect(event.defaultPrevented).toBe(true);
	});

	test("re-rendering puts the box back in the state the props describe", () => {
		// The definitive guarantee: whatever the click did to the control, the
		// next render restores what the widget actually believes.
		render();
		fire(box(), "click");
		render({ checked: false });
		expect(box().checked).toBe(false);
	});

	test("does not prevent the default of an ignored click", () => {
		render();
		const event = fireAndReturn(box(), "click", { trusted: false });
		expect(event.defaultPrevented).toBe(false);
	});

	test("stops the click reaching the surrounding page", () => {
		// The widget is usually inside the dapp's own clickable chrome.
		render();
		const onOuter = vi.fn<() => void>();
		mounted.container.addEventListener("click", onOuter);
		fire(box(), "click");
		expect(onOuter).not.toHaveBeenCalled();
	});

	test("reports every activation, not just the first", () => {
		render();
		fire(box(), "click");
		fire(box(), "click");
		expect(onChange).toHaveBeenCalledTimes(2);
	});
});

describe("tearing down", () => {
	test("removes itself from the container", () => {
		render();
		checkbox?.destroy();
		checkbox = undefined;
		expect(mounted.container.querySelector("input")).toBeNull();
	});

	test("stops listening", () => {
		render();
		const element = box();
		checkbox?.destroy();
		checkbox = undefined;

		element.dispatchEvent(new MouseEvent("click", { bubbles: true }));

		expect(onChange).not.toHaveBeenCalled();
	});

	test("removes the stylesheet it injected", () => {
		render();
		checkbox?.destroy();
		checkbox = undefined;
		expect(
			mounted.container.querySelector('style[data-prosopo-style^="checkbox-"]'),
		).toBeNull();
	});
});

describe("handing focus across the loading swap", () => {
	const spinner = (): HTMLElement => {
		const element =
			mounted.container.querySelector<HTMLElement>(SPINNER_SELECTOR);
		if (!element) throw new Error("expected a spinner to be rendered");
		return element;
	};

	test("names the spinner so a screen reader says what is happening", () => {
		render({ loading: true, loadingText: "Checking that you are human" });
		expect(spinner().getAttribute("aria-label")).toBe(
			"Checking that you are human",
		);
		expect(spinner().getAttribute("role")).toBe("status");
	});

	test("moves focus onto the spinner when the box it was on disappears", () => {
		render();
		box().focus();

		render({ loading: true });

		expect(document.activeElement).toBe(spinner());
	});

	test("gives focus back to the box when the check finishes", () => {
		render();
		box().focus();
		render({ loading: true });

		render({ loading: false });

		expect(document.activeElement).toBe(box());
	});

	test("leaves focus alone when the user never had it on the box", () => {
		const elsewhere = document.createElement("input");
		document.body.appendChild(elsewhere);
		render();
		elsewhere.focus();

		render({ loading: true });

		expect(document.activeElement).toBe(elsewhere);
		elsewhere.remove();
	});

	test("leaves focus alone when the user moved on during the check", () => {
		// The check lasts as long as the network does; dragging the user out of
		// a field they have since started typing in is worse than saying nothing.
		const elsewhere = document.createElement("input");
		document.body.appendChild(elsewhere);
		render();
		box().focus();
		render({ loading: true });
		elsewhere.focus();

		render({ loading: false });

		expect(document.activeElement).toBe(elsewhere);
		elsewhere.remove();
	});
});
