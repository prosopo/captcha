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

const render = (themeColor: "light" | "dark" = "light"): HTMLButtonElement => {
	const props: ReloadButtonProps = { themeColor, onReload };
	if (reload) {
		reload.update(props);
	} else {
		reload = mountReloadButton(mounted.container, props);
	}
	const element = mounted.container.querySelector("button");
	if (!element) throw new Error("expected a button to be rendered");
	return element;
};

beforeEach(() => {
	vi.clearAllMocks();
	mounted = mount();
	reload = undefined;
});

afterEach(() => {
	reload?.destroy();
	mounted.unmount();
});

describe("what the button renders", () => {
	test("labels itself for assistive tech", () => {
		expect(render().getAttribute("aria-label")).toBe("Reload");
	});

	test("is a plain button, not a form submit", () => {
		// The widget is usually rendered inside the dapp's own form.
		expect(render().getAttribute("type")).toBe("button");
	});

	test("carries the class the skeleton's css hooks onto", () => {
		expect(render().className).toBe("reload-button");
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

	test("is a 40dp circular container", () => {
		const element = render();
		expect(element.style.height).toBe("40px");
		expect(element.style.width).toBe("40px");
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
		expect(mounted.container.querySelector("button")).toBeNull();
	});

	test("stops listening", () => {
		const element = render();
		reload?.destroy();
		reload = undefined;

		element.dispatchEvent(new MouseEvent("click", { bubbles: true }));

		expect(onReload).not.toHaveBeenCalled();
	});
});
