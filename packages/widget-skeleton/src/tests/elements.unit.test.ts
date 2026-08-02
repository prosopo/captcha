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

import { afterEach, describe, expect, test } from "vitest";
import {
	CHECKBOX_MARKUP,
	createCheckboxElement,
	getCheckboxInteractiveArea,
} from "../elements/checkbox.js";
import { createLogoElement } from "../elements/logo.js";
import { createWidgetSkeletonElement } from "../elements/skeleton.js";
import { WIDGET_CHECKBOX_SPINNER_CSS_CLASS, WIDGET_URL } from "../index.js";
import { darkTheme, lightTheme } from "../theme.js";

const shadowOf = (element: HTMLElement): ShadowRoot => {
	const root = element.shadowRoot;
	if (!root) throw new Error("expected an open shadow root");
	return root;
};

describe("the checkbox element", () => {
	test("hides its internals behind an open shadow root", () => {
		// Closed would stop the widget itself from reaching the interactive
		// area; no shadow root at all would let host page CSS restyle it.
		const checkbox = createCheckboxElement(lightTheme);
		expect(checkbox.shadowRoot).not.toBeNull();
		expect(checkbox.className).toBe("prosopo-checkbox");
	});

	test("keeps its markup out of the light DOM", () => {
		const checkbox = createCheckboxElement(lightTheme);
		expect(checkbox.innerHTML).toBe("");
		expect(shadowOf(checkbox).innerHTML).toContain("prosopo-checkbox__content");
	});

	test("renders a labelled loading spinner", () => {
		const checkbox = createCheckboxElement(lightTheme);
		const spinner = shadowOf(checkbox).querySelector(
			`.${WIDGET_CHECKBOX_SPINNER_CSS_CLASS}`,
		);
		expect(spinner?.getAttribute("aria-label")).toBe("Loading spinner");
	});

	test("colours the spinner from the theme", () => {
		const light = shadowOf(createCheckboxElement(lightTheme)).innerHTML;
		const dark = shadowOf(createCheckboxElement(darkTheme)).innerHTML;
		expect(light).toContain(lightTheme.palette.background.contrastText);
		expect(dark).toContain(darkTheme.palette.background.contrastText);
		expect(light).not.toBe(dark);
	});

	test("publishes the same markup it renders", () => {
		const checkbox = createCheckboxElement(lightTheme);
		expect(shadowOf(checkbox).innerHTML).toContain(CHECKBOX_MARKUP.trim());
	});
});

describe("finding the interactive area", () => {
	test("reaches through both shadow roots of a real widget", () => {
		const host = document.createElement("div");
		host.appendChild(createWidgetSkeletonElement(lightTheme));
		const area = getCheckboxInteractiveArea(host);
		expect(area?.className).toBe("prosopo-checkbox__content");
	});

	test("returns null when there is no checkbox to find", () => {
		expect(
			getCheckboxInteractiveArea(document.createElement("div")),
		).toBeNull();
	});

	test("prefers the host's shadow root over its light DOM", () => {
		const host = document.createElement("div");
		host.attachShadow({ mode: "open" });
		// The light-DOM copy must be ignored, otherwise a host page could plant
		// a decoy checkbox and steal the clicks.
		host.appendChild(createCheckboxElement(lightTheme));
		expect(getCheckboxInteractiveArea(host)).toBeNull();
	});

	test("falls back to a plain element without a shadow root", () => {
		const host = document.createElement("div");
		host.appendChild(createCheckboxElement(lightTheme));
		expect(getCheckboxInteractiveArea(host)?.className).toBe(
			"prosopo-checkbox__content",
		);
	});

	test("returns null when the checkbox has no content node", () => {
		const host = document.createElement("div");
		const decoy = document.createElement("div");
		decoy.className = "prosopo-checkbox";
		host.appendChild(decoy);
		expect(getCheckboxInteractiveArea(host)).toBeNull();
	});
});

describe("the logo", () => {
	test("links out to the product page in a new, unprivileged tab", () => {
		// rel=noopener is what stops the opened page reaching back into the
		// consumer's window.
		const logo = createLogoElement(lightTheme);
		const link = logo.querySelector("a");
		expect(link?.getAttribute("href")).toBe(`${WIDGET_URL}/`);
		expect(link?.getAttribute("target")).toBe("_blank");
		expect(link?.getAttribute("rel")).toBe("noopener");
	});

	test("hides the mark from assistive technology and names it in text", () => {
		const logo = createLogoElement(lightTheme);
		expect(logo.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
		expect(logo.querySelector(".prosopo-logo-text")?.textContent).toBe(
			"Prosopo",
		);
	});

	test("fills the mark from the theme", () => {
		expect(createLogoElement(darkTheme).innerHTML).toContain(
			darkTheme.palette.logoFill,
		);
		expect(createLogoElement(lightTheme).innerHTML).toContain(
			lightTheme.palette.logoFill,
		);
	});

	test("carries its own styles so it survives an unstyled host", () => {
		expect(createLogoElement(lightTheme).querySelector("style")).not.toBeNull();
	});
});

describe("the widget skeleton", () => {
	const originalNodeEnv: string | undefined = process.env.NODE_ENV;

	afterEach(() => {
		process.env.NODE_ENV = originalNodeEnv;
	});

	test("swaps the placeholders for the real checkbox and logo", () => {
		const widget = createWidgetSkeletonElement(lightTheme);
		expect(widget.querySelector(".prosopo-widget__checkbox")).toBeNull();
		expect(widget.querySelector(".prosopo-widget__logo")).toBeNull();
		expect(widget.querySelector(".prosopo-checkbox")).not.toBeNull();
		expect(widget.querySelector(".prosopo-logo-container")).not.toBeNull();
	});

	test("puts the checkbox before the logo", () => {
		const content = createWidgetSkeletonElement(lightTheme).querySelector(
			".prosopo-widget__content",
		);
		const children = Array.from(content?.children ?? []);
		expect(children[0]?.className).toBe("prosopo-checkbox");
		expect(children[1]?.className).toBe("prosopo-logo-container");
	});

	test("adds the end-to-end hook outside production", () => {
		process.env.NODE_ENV = "development";
		expect(
			createWidgetSkeletonElement(lightTheme).querySelector(
				'[data-cy="captcha-checkbox"]',
			),
		).not.toBeNull();
	});

	test("drops the end-to-end hook in a production build", () => {
		// It is a stable selector for the one control a solver wants to click.
		process.env.NODE_ENV = "production";
		expect(
			createWidgetSkeletonElement(lightTheme).querySelector(
				'[data-cy="captcha-checkbox"]',
			),
		).toBeNull();
	});

	test("treats an unset NODE_ENV as development", () => {
		Reflect.deleteProperty(process.env, "NODE_ENV");
		expect(
			createWidgetSkeletonElement(lightTheme).querySelector(
				'[data-cy="captcha-checkbox"]',
			),
		).not.toBeNull();
	});

	test("takes its surface colours from the theme", () => {
		expect(createWidgetSkeletonElement(darkTheme).innerHTML).toContain(
			darkTheme.palette.background.default,
		);
		expect(createWidgetSkeletonElement(lightTheme).innerHTML).toContain(
			lightTheme.palette.background.default,
		);
	});

	test("neutralises pseudo-element content a host page might inject", () => {
		// Consumers' resets frequently add ::after content to every element,
		// which would otherwise push the checkbox off its row.
		expect(createWidgetSkeletonElement(lightTheme).innerHTML).toContain(
			"content: none !important",
		);
	});
});
