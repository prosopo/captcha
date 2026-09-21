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
import { CHECKBOX_HOST_CSS_CLASS } from "../elements/checkbox.js";
import { createLogoElement } from "../elements/logo.js";
import { createWidgetSkeletonElement } from "../elements/skeleton.js";
import { WIDGET_URL } from "../index.js";
import { type Theme, darkTheme, lightTheme } from "../theme.js";

const skeletonOf = (theme: Theme): HTMLElement =>
	createWidgetSkeletonElement(theme).element;

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
		const widget = skeletonOf(lightTheme);
		expect(widget.querySelector(".prosopo-widget__checkbox")).toBeNull();
		expect(widget.querySelector(".prosopo-widget__logo")).toBeNull();
		expect(widget.querySelector(`.${CHECKBOX_HOST_CSS_CLASS}`)).not.toBeNull();
		expect(widget.querySelector(".prosopo-logo-container")).not.toBeNull();
	});

	test("puts the checkbox before the logo", () => {
		const content = skeletonOf(lightTheme).querySelector(
			".prosopo-widget__content",
		);
		const children = Array.from(content?.children ?? []);
		expect(children[0]?.className).toBe(CHECKBOX_HOST_CSS_CLASS);
		expect(children[1]?.className).toBe("prosopo-logo-container");
	});

	test("hands back the interactive area from inside the checkbox", () => {
		// The caller mounts the captcha into this node, and the returned
		// reference is the only route to it — nothing outside can name it.
		const { element, interactiveArea } =
			createWidgetSkeletonElement(lightTheme);
		const checkbox = element.querySelector(`.${CHECKBOX_HOST_CSS_CLASS}`);
		expect(checkbox?.shadowRoot?.contains(interactiveArea)).toBe(true);
	});

	test("adds the end-to-end hook outside production", () => {
		process.env.NODE_ENV = "development";
		expect(
			skeletonOf(lightTheme).querySelector('[data-cy="captcha-checkbox"]'),
		).not.toBeNull();
	});

	test("drops the end-to-end hook in a production build", () => {
		// It is a stable selector for the one control a solver wants to click.
		process.env.NODE_ENV = "production";
		expect(
			skeletonOf(lightTheme).querySelector('[data-cy="captcha-checkbox"]'),
		).toBeNull();
	});

	test("treats an unset NODE_ENV as development", () => {
		Reflect.deleteProperty(process.env, "NODE_ENV");
		expect(
			skeletonOf(lightTheme).querySelector('[data-cy="captcha-checkbox"]'),
		).not.toBeNull();
	});

	test("takes its surface colours from the theme", () => {
		// The on-page widget rests on the flat `surface` role — the dialog is the
		// one that sits on surfaceContainerHigh.
		expect(skeletonOf(darkTheme).innerHTML).toContain(
			darkTheme.palette.surface,
		);
		expect(skeletonOf(lightTheme).innerHTML).toContain(
			lightTheme.palette.surface,
		);
	});

	test("neutralises pseudo-element content a host page might inject", () => {
		// Consumers' resets frequently add ::after content to every element,
		// which would otherwise push the checkbox off its row.
		expect(skeletonOf(lightTheme).innerHTML).toContain(
			"content: none !important",
		);
	});
});
