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
import { WIDGET_MAX_WIDTH } from "../constants.js";
import { type Theme, darkTheme, lightTheme } from "../theme.js";
import { createWidgetSkeleton } from "../webComponent/createWidget.js";

const TAG = "procaptcha-widget-test";

describe("createWidgetSkeleton", () => {
	test("mounts the widget inside a host element in the container", () => {
		const container: HTMLElement = document.createElement("div");
		const { webComponent } = createWidgetSkeleton(container, lightTheme, TAG);
		expect(webComponent.tagName.toLowerCase()).toBe(TAG);
		expect(container.children.length).toBe(1);
		expect(container.firstElementChild).toBe(webComponent);
		expect(webComponent.querySelector(".prosopo-widget")).not.toBeNull();
	});

	test("returns the checkbox content as the interactive area", () => {
		// This is what the caller attaches its click handler to, so it has to be
		// the innermost content node rather than the host.
		const { widgetInteractiveArea, webComponent } = createWidgetSkeleton(
			document.createElement("div"),
			lightTheme,
			TAG,
		);
		expect(widgetInteractiveArea.className).toBe("prosopo-checkbox__content");
		expect(widgetInteractiveArea).toBe(
			webComponent
				.querySelector(".prosopo-checkbox")
				?.shadowRoot?.querySelector(".prosopo-checkbox__content"),
		);
	});

	test("clears whatever the container held before", () => {
		// Callers re-render into the same container on config changes; leaving
		// the previous widget would stack two of them.
		const container: HTMLElement = document.createElement("div");
		container.innerHTML = "<p>previous contents</p>";
		createWidgetSkeleton(container, lightTheme, TAG);
		expect(container.querySelector("p")).toBeNull();
		expect(container.children.length).toBe(1);
	});

	test("is idempotent when called twice on the same container", () => {
		const container: HTMLElement = document.createElement("div");
		const first = createWidgetSkeleton(container, lightTheme, TAG);
		const second = createWidgetSkeleton(container, lightTheme, TAG);
		expect(container.children.length).toBe(1);
		expect(container.firstElementChild).toBe(second.webComponent);
		expect(first.webComponent.isConnected).toBe(false);
	});

	test("styles the host so it does not collapse in the container", () => {
		const { webComponent } = createWidgetSkeleton(
			document.createElement("div"),
			lightTheme,
			TAG,
		);
		// An unknown tag has no default display, so without this it would be
		// inline and ignore the width.
		expect(webComponent.style.display).toBe("flex");
		expect(webComponent.style.maxWidth).toBe(WIDGET_MAX_WIDTH);
	});

	test("leaves the host in the light DOM, not a shadow root", () => {
		// getCheckboxInteractiveArea prefers a shadow root if one exists; the
		// widget is appended as a child instead, so there must not be one.
		const { webComponent } = createWidgetSkeleton(
			document.createElement("div"),
			lightTheme,
			TAG,
		);
		expect(webComponent.shadowRoot).toBeNull();
	});

	test.each([
		["light", lightTheme],
		["dark", darkTheme],
	])("%s reaches the rendered styles", (_n: string, theme: Theme) => {
		const { webComponent } = createWidgetSkeleton(
			document.createElement("div"),
			theme,
			TAG,
		);
		expect(webComponent.querySelector("style")?.textContent).toContain(
			theme.palette.background.default,
		);
	});

	test("works with a container already in the document", () => {
		const container: HTMLElement = document.createElement("div");
		document.body.appendChild(container);
		try {
			const { widgetInteractiveArea } = createWidgetSkeleton(
				container,
				lightTheme,
				TAG,
			);
			expect(widgetInteractiveArea.isConnected).toBe(true);
		} finally {
			container.remove();
		}
	});

	test("accepts any Element, not just an HTMLElement", () => {
		// The signature takes Element because callers pass the result of a
		// querySelector, which may well be an SVG or custom element.
		const container: Element = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"svg",
		);
		expect(() =>
			createWidgetSkeleton(container, lightTheme, TAG),
		).not.toThrow();
	});

	test("rejects a tag name the DOM cannot create", () => {
		expect(() =>
			createWidgetSkeleton(document.createElement("div"), lightTheme, ""),
		).toThrow();
	});

	test("leaves the container untouched when the tag is invalid", () => {
		// The host is created before the container is cleared, so a bad tag must
		// not destroy the caller's existing content.
		const container: HTMLElement = document.createElement("div");
		container.innerHTML = "<p>previous contents</p>";
		expect(() =>
			createWidgetSkeleton(container, lightTheme, "not a tag"),
		).toThrow();
		expect(container.querySelector("p")).not.toBeNull();
	});
});
