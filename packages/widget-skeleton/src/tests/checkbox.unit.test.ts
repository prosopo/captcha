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
import { WIDGET_CHECKBOX_SPINNER_CSS_CLASS } from "../constants.js";
import {
	CHECKBOX_MARKUP,
	createCheckboxElement,
	getCheckboxInteractiveArea,
} from "../elements/checkbox.js";
import { type Theme, darkTheme, lightTheme } from "../theme.js";

const shadowOf = (element: HTMLElement): ShadowRoot => {
	const root = element.shadowRoot;
	if (root === null) {
		throw new Error("the checkbox attached no shadow root");
	}
	return root;
};

describe("createCheckboxElement", () => {
	test("encapsulates its markup in an open shadow root", () => {
		// Open rather than closed on purpose: getCheckboxInteractiveArea has to
		// reach inside to hand the host page something to click.
		const checkbox: HTMLElement = createCheckboxElement(lightTheme);
		expect(checkbox.className).toBe("prosopo-checkbox");
		expect(
			shadowOf(checkbox).querySelector(".prosopo-checkbox__content"),
		).not.toBeNull();
	});

	test("the shadow root keeps the styles out of the embedding page", () => {
		// The widget runs on sites whose own CSS it must neither read nor break.
		const checkbox: HTMLElement = createCheckboxElement(lightTheme);
		document.body.appendChild(checkbox);
		try {
			expect(document.querySelector(".prosopo-checkbox__content")).toBeNull();
		} finally {
			checkbox.remove();
		}
	});

	test.each([
		["light", lightTheme],
		["dark", darkTheme],
	])(
		"%s colours the spinner with its background contrast",
		(_n: string, theme: Theme) => {
			// The spinner is drawn on the widget background, so it takes the
			// contrasting colour rather than the primary.
			const styles: string = shadowOf(createCheckboxElement(theme)).innerHTML;
			expect(styles).toContain(theme.palette.background.contrastText);
		},
	);

	test("the spinner is labelled and animated", () => {
		const shadow: ShadowRoot = shadowOf(createCheckboxElement(lightTheme));
		const spinner = shadow.querySelector(
			`.${WIDGET_CHECKBOX_SPINNER_CSS_CLASS}`,
		);
		// It is the only thing shown before the captcha loads, so a screen reader
		// needs to know it is a busy indicator rather than empty content.
		expect(spinner?.getAttribute("aria-label")).toBe("Loading spinner");
		expect(shadow.innerHTML).toContain(
			`@keyframes ${WIDGET_CHECKBOX_SPINNER_CSS_CLASS}-rotation`,
		);
	});

	test("styles the host itself, which only works from inside the shadow root", () => {
		expect(shadowOf(createCheckboxElement(lightTheme)).innerHTML).toContain(
			":host(.prosopo-checkbox)",
		);
	});

	test("the exported markup is what gets rendered", () => {
		// CHECKBOX_MARKUP is exported so consumers can mirror the structure; a
		// drift between it and the rendered tree would be silent.
		expect(shadowOf(createCheckboxElement(lightTheme)).innerHTML).toContain(
			CHECKBOX_MARKUP,
		);
	});
});

describe("getCheckboxInteractiveArea", () => {
	test("finds the content through the checkbox's shadow root", () => {
		const host: HTMLElement = document.createElement("div");
		host.appendChild(createCheckboxElement(lightTheme));
		const area = getCheckboxInteractiveArea(host);
		expect(area).toBeInstanceOf(HTMLElement);
		expect(area?.className).toBe("prosopo-checkbox__content");
	});

	test("prefers the host's own shadow root when it has one", () => {
		// createWidgetSkeleton may hand it a web component whose children live in
		// a shadow root; searching the light DOM would miss them.
		const host: HTMLElement = document.createElement("div");
		host
			.attachShadow({ mode: "open" })
			.appendChild(createCheckboxElement(lightTheme));
		expect(getCheckboxInteractiveArea(host)?.className).toBe(
			"prosopo-checkbox__content",
		);
	});

	test("ignores a checkbox in the light DOM when the host is shadowed", () => {
		// The shadow root is searched instead of, not as well as, the children.
		const host: HTMLElement = document.createElement("div");
		host.attachShadow({ mode: "open" });
		host.appendChild(createCheckboxElement(lightTheme));
		expect(getCheckboxInteractiveArea(host)).toBeNull();
	});

	test("returns null when there is no checkbox at all", () => {
		expect(
			getCheckboxInteractiveArea(document.createElement("div")),
		).toBeNull();
	});

	test("returns null for a checkbox with no content inside it", () => {
		// A hand rolled element carrying the class but not the structure: the
		// second lookup has to fail independently of the first.
		const host: HTMLElement = document.createElement("div");
		const bare: HTMLElement = document.createElement("div");
		bare.className = "prosopo-checkbox";
		host.appendChild(bare);
		expect(getCheckboxInteractiveArea(host)).toBeNull();
	});

	test("falls back to the light DOM of an unshadowed checkbox", () => {
		const host: HTMLElement = document.createElement("div");
		host.innerHTML = `<div class="prosopo-checkbox">${CHECKBOX_MARKUP}</div>`;
		expect(getCheckboxInteractiveArea(host)?.className).toBe(
			"prosopo-checkbox__content",
		);
	});

	test("returns the first checkbox when a page nests two widgets", () => {
		const host: HTMLElement = document.createElement("div");
		const first: HTMLElement = createCheckboxElement(lightTheme);
		host.appendChild(first);
		host.appendChild(createCheckboxElement(darkTheme));
		expect(getCheckboxInteractiveArea(host)).toBe(
			shadowOf(first).querySelector(".prosopo-checkbox__content"),
		);
	});
});
