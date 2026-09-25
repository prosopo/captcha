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
import {
	type ReloadButtonProps,
	mountReloadButton,
} from "../components/reload.js";
import type { Component } from "../dom/component.js";
import {
	type Mounted,
	asRgb,
	fire,
	fireAndReturn,
	mount,
} from "./domHarness.js";

/**
 * The reload button sits in the challenge dialog's action row, so it has to be
 * reachable and legible in both themes — the previous grey-on-grey treatment
 * gave no hover feedback at all in dark mode.
 */

let mounted: Mounted;
let reload: Component<ReloadButtonProps> | undefined;
const onReload = vi.fn<() => void>();

/**
 * The control is found by its development-only test hook, never by class or by
 * tag: both are drawn per mount, which is the point of the change that made
 * them so.
 */
const CONTROL_SELECTOR = '[data-cy="reload-button"]';

const render = (themeColor: "light" | "dark" = "light"): HTMLElement => {
	const props: ReloadButtonProps = { themeColor, onReload };
	if (reload) {
		reload.update(props);
	} else {
		reload = mountReloadButton(mounted.container, props);
	}
	const element =
		mounted.container.querySelector<HTMLElement>(CONTROL_SELECTOR);
	if (!element) throw new Error("expected a reload control to be rendered");
	return element;
};

/**
 * Pins the draw that picks the element the control is made of, so both variants
 * are exercised rather than whichever one this run happened to get.
 */
const renderAs = (
	kind: "button" | "generic",
	themeColor: "light" | "dark" = "light",
): HTMLElement => {
	const draws = vi
		.spyOn(Math, "random")
		.mockReturnValue("button" === kind ? 0 : 0.99);
	try {
		return render(themeColor);
	} finally {
		draws.mockRestore();
	}
};

beforeEach(() => {
	vi.clearAllMocks();
	mounted = mount();
	reload = undefined;
});

afterEach(() => {
	reload?.destroy();
	mounted.unmount();
	vi.unstubAllGlobals();
});

describe("what the button renders", () => {
	test("labels itself for assistive tech", () => {
		expect(render().getAttribute("aria-label")).toBe("Reload");
	});

	test("is a plain button, not a form submit, when it is a button", () => {
		// The widget is usually rendered inside the dapp's own form.
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

	test("goes by a different name on every mount", () => {
		// A class scraped from one page load names nothing on the next.
		const names = new Set(
			Array.from({ length: 20 }, () => {
				const container = mount();
				const control = mountReloadButton(container.container, {
					themeColor: "light",
					onReload,
				});
				const className =
					container.container.querySelector<HTMLElement>(CONTROL_SELECTOR)
						?.className ?? "";
				control.destroy();
				container.unmount();
				return className;
			}),
		);
		expect(names.size).toBe(20);
	});

	test("withholds the test hook from a production build", () => {
		const originalNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";
		try {
			reload = mountReloadButton(mounted.container, {
				themeColor: "light",
				onReload,
			});
			expect(mounted.container.querySelector(CONTROL_SELECTOR)).toBeNull();
		} finally {
			if (undefined === originalNodeEnv) {
				Reflect.deleteProperty(process.env, "NODE_ENV");
			} else {
				process.env.NODE_ENV = originalNodeEnv;
			}
		}
	});

	test("renders the reload glyph as inline svg", () => {
		const svg = render().querySelector("svg");
		expect(svg?.namespaceURI).toBe("http://www.w3.org/2000/svg");
		expect(svg?.querySelector("title")?.textContent).toBe("reload");
	});

	test("sizes the icon to the M3 24dp glyph", () => {
		const svg = render().querySelector("svg");
		expect(svg?.getAttribute("width")).toBe("24px");
		expect(svg?.getAttribute("height")).toBe("24px");
	});

	test("is a circular container big enough to tap, 44px", () => {
		const element = render();
		expect(element.style.height).toBe("44px");
		expect(element.style.width).toBe("44px");
		expect(element.style.borderRadius).toBe("50%");
	});
});

describe("theming", () => {
	test("rests on the light theme's tonal container", () => {
		const element = render("light");
		expect(element.style.backgroundColor).toBe(
			asRgb(lightTheme.palette.primaryContainer.main),
		);
		expect(element.style.color).toBe(
			asRgb(lightTheme.palette.primaryContainer.contrastText),
		);
	});

	test("rests on the dark theme's tonal container in dark mode", () => {
		const element = render("dark");
		expect(element.style.backgroundColor).toBe(
			asRgb(darkTheme.palette.primaryContainer.main),
		);
	});

	test("fills the glyph with the container's on-colour", () => {
		expect(render().querySelector("path")?.getAttribute("fill")).toBe(
			lightTheme.palette.primaryContainer.contrastText,
		);
	});

	test("hover swaps to the state-layer fill", () => {
		// A brightness filter is not a state layer and is invisible in dark mode,
		// which is why the hover is a distinct token.
		const element = render();
		fire(element, "mouseenter");
		expect(element.style.backgroundColor).toBe(
			asRgb(lightTheme.palette.primaryContainer.hover),
		);
	});

	test("a touch screen gets no state layer", () => {
		// The layer would cost the visitor their first tap: iOS reads a tap that
		// repaints the control as a request to show hover and withholds the
		// click, so reload would have to be tapped twice.
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: "(hover: hover)" !== query,
			media: query,
		}));
		const element = render();

		fire(element, "mouseenter");

		expect(element.style.backgroundColor).toBe(
			asRgb(lightTheme.palette.primaryContainer.main),
		);
	});

	test("leaving restores the resting fill", () => {
		const element = render();
		fire(element, "mouseenter");
		fire(element, "mouseleave");
		expect(element.style.backgroundColor).toBe(
			asRgb(lightTheme.palette.primaryContainer.main),
		);
	});

	test("keeps the glyph colour fixed across hover", () => {
		const element = render();
		fire(element, "mouseenter");
		expect(element.querySelector("path")?.getAttribute("fill")).toBe(
			lightTheme.palette.primaryContainer.contrastText,
		);
	});

	test("re-themes in place when the theme prop changes", () => {
		render("light");
		const element = render("dark");
		expect(element.style.backgroundColor).toBe(
			asRgb(darkTheme.palette.primaryContainer.main),
		);
	});
});

describe("focus", () => {
	test("shows no focus ring at rest", () => {
		expect(render().style.outline).toBe("none");
	});

	test("drops the ring on blur", () => {
		// jsdom never reports :focus-visible, so focus cannot raise the ring here;
		// blur clearing it is the half of the pair that is observable.
		const element = render();
		fire(element, "focus");
		fire(element, "blur");
		expect(element.style.outline).toBe("none");
	});
});

describe("clicking", () => {
	test("calls the reload handler", () => {
		fire(render(), "click");
		expect(onReload).toHaveBeenCalledTimes(1);
	});

	test("does not submit the surrounding form", () => {
		const event = fireAndReturn(render(), "click");
		expect(event.defaultPrevented).toBe(true);
	});

	test("reports every click, not just the first", () => {
		const element = render();
		fire(element, "click");
		fire(element, "click");
		expect(onReload).toHaveBeenCalledTimes(2);
	});

	test("ignores a click no user made", () => {
		// A script-dispatched click is how a solver asks for a fresh challenge.
		fire(render(), "click", { trusted: false });
		expect(onReload).not.toHaveBeenCalled();
	});

	test("reloads on Enter and on Space when it is not a button", () => {
		// A real button does this for free; the generic variant has to be given
		// it, or the control drops out of reach of a keyboard user.
		const element = renderAs("generic");
		fire(element, "keydown", { key: "Enter" });
		fire(element, "keydown", { key: " " });
		expect(onReload).toHaveBeenCalledTimes(2);
	});

	test("stops Space scrolling the dialog", () => {
		const event = fireAndReturn(renderAs("generic"), "keydown", { key: " " });
		expect(event.defaultPrevented).toBe(true);
	});

	test("ignores keys that do not activate a button", () => {
		fire(renderAs("generic"), "keydown", { key: "a" });
		expect(onReload).not.toHaveBeenCalled();
	});

	test("calls the handler the latest props carry", () => {
		// The dialog rebuilds its callbacks on each render; a stale closure would
		// reload against a challenge that is no longer on screen.
		const element = render();
		const replacement = vi.fn<() => void>();
		reload?.update({ themeColor: "light", onReload: replacement });

		fire(element, "click");

		expect(replacement).toHaveBeenCalledTimes(1);
		expect(onReload).not.toHaveBeenCalled();
	});
});

describe("tearing down", () => {
	test("removes itself from the container", () => {
		render();
		reload?.destroy();
		reload = undefined;
		expect(mounted.container.querySelector(CONTROL_SELECTOR)).toBeNull();
	});

	test("stops listening", () => {
		const element = render();
		reload?.destroy();
		reload = undefined;

		element.dispatchEvent(new MouseEvent("click", { bubbles: true }));

		expect(onReload).not.toHaveBeenCalled();
	});
});
