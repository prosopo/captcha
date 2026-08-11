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
// @vitest-environment jsdom

import { describe, expect, test } from "vitest";
import { WIDGET_URL } from "../constants.js";
import { createLogoElement } from "../elements/logo.js";
import { type Theme, darkTheme, lightTheme } from "../theme.js";

const logoAnchor = (theme: Theme): HTMLAnchorElement => {
	const anchor = createLogoElement(theme).querySelector("a");
	if (!(anchor instanceof HTMLAnchorElement)) {
		throw new Error("the logo rendered no anchor");
	}
	return anchor;
};

describe("createLogoElement", () => {
	test("returns a detached container that is not yet in the document", () => {
		// The caller decides where it goes; touching the document here would make
		// the element order depend on construction order.
		const logo: HTMLElement = createLogoElement(lightTheme);
		expect(logo.className).toBe("prosopo-logo-container");
		expect(logo.isConnected).toBe(false);
	});

	test("links to the marketing site in a new tab without leaking the opener", () => {
		const anchor: HTMLAnchorElement = logoAnchor(lightTheme);
		// rel=noopener matters: the widget is embedded in third party pages, and
		// without it the opened tab can navigate the embedder.
		expect(anchor.getAttribute("rel")).toBe("noopener");
		expect(anchor.getAttribute("target")).toBe("_blank");
		expect(anchor.getAttribute("href")).toBe(`${WIDGET_URL}/`);
	});

	test("the resolved href stays on the prosopo origin", () => {
		// href is built by interpolation, so this is what catches a WIDGET_URL
		// that stopped being absolute.
		expect(new URL(logoAnchor(lightTheme).href).origin).toBe(
			new URL(WIDGET_URL).origin,
		);
	});

	test.each([
		["light", lightTheme],
		["dark", darkTheme],
	])(
		"%s applies its logo fill to both the text and the svg",
		(_n: string, theme: Theme) => {
			const anchor: HTMLAnchorElement = logoAnchor(theme);
			expect(anchor.style.color).not.toBe("");
			const svg = anchor.querySelector("svg");
			expect(svg).not.toBeNull();
			expect(svg?.getAttribute("style")).toContain(theme.palette.logoFill);
		},
	);

	test("hides the decorative mark from assistive technology", () => {
		// The adjacent text already says "Prosopo", so announcing the mark as
		// well would read the name twice.
		const svg = createLogoElement(lightTheme).querySelector("svg");
		expect(svg?.getAttribute("aria-hidden")).toBe("true");
		expect(
			createLogoElement(lightTheme).querySelector(".prosopo-logo-text")
				?.textContent,
		).toBe("Prosopo");
	});

	test("ships its own styles inline", () => {
		// There is no stylesheet to link against on a third party page.
		const style = createLogoElement(lightTheme).querySelector("style");
		expect(style?.textContent).toContain(".prosopo-logo-container");
	});

	test("produces an independent element on every call", () => {
		const first: HTMLElement = createLogoElement(lightTheme);
		const second: HTMLElement = createLogoElement(lightTheme);
		expect(first).not.toBe(second);
		first.remove();
		expect(second.querySelector("a")).not.toBeNull();
	});

	test("light and dark differ only in the interpolated fill", () => {
		const light: string = createLogoElement(lightTheme).innerHTML;
		const dark: string = createLogoElement(darkTheme).innerHTML;
		expect(light).not.toBe(dark);
		expect(light.split(lightTheme.palette.logoFill).join("X")).toBe(
			dark.split(darkTheme.palette.logoFill).join("X"),
		);
	});
});
