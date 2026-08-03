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
import {
	WIDGET_MAX_WIDTH,
	createWidgetSkeleton,
	lightTheme,
} from "../index.js";
import {
	applyDefaultStyles,
	createWebComponent,
} from "../webComponent/createWebComponent.js";

const TAG = "prosopo-test-widget";

describe("creating a web component", () => {
	test("uses the requested tag", () => {
		expect(createWebComponent(TAG).tagName.toLowerCase()).toBe(TAG);
	});

	test("opens its shadow root so the widget can reach inside", () => {
		expect(createWebComponent(TAG).shadowRoot).not.toBeNull();
	});

	test("pins its own font stack against the host page", () => {
		// Without this the widget inherits whatever the consumer set, which has
		// broken the layout of the checkbox row before.
		const html = createWebComponent(TAG).shadowRoot?.innerHTML ?? "";
		expect(html).toContain("ui-sans-serif");
		expect(html).toContain("font-family");
	});

	test("injects the caller's css alongside the defaults", () => {
		const html =
			createWebComponent(TAG, ".x { color: red; }").shadowRoot?.innerHTML ?? "";
		expect(html).toContain(".x { color: red; }");
		expect(html).toContain("ui-sans-serif");
	});

	test("still renders a style block when given no custom css", () => {
		const styles =
			createWebComponent(TAG).shadowRoot?.querySelectorAll("style");
		expect(styles?.length).toBe(2);
	});

	test("lays itself out as a full-width column up to the widget's max width", () => {
		const component = createWebComponent(TAG);
		expect(component.style.display).toBe("flex");
		expect(component.style.flexDirection).toBe("column");
		expect(component.style.width).toBe("100%");
		expect(component.style.maxWidth).toBe(WIDGET_MAX_WIDTH);
	});

	test("applies the same defaults to any element handed to it", () => {
		const element = document.createElement("div");
		applyDefaultStyles(element);
		expect(element.style.maxWidth).toBe(WIDGET_MAX_WIDTH);
	});
});

describe("attaching the skeleton to a container", () => {
	const container = (): HTMLElement => document.createElement("div");

	test("returns both the host element and the clickable area", () => {
		const { webComponent, widgetInteractiveArea } = createWidgetSkeleton(
			container(),
			lightTheme,
			TAG,
		);
		expect(webComponent.tagName.toLowerCase()).toBe(TAG);
		expect(widgetInteractiveArea.className).toBe("prosopo-checkbox__content");
	});

	test("mounts the host inside the container it was given", () => {
		const target = container();
		const { webComponent } = createWidgetSkeleton(target, lightTheme, TAG);
		expect(target.firstElementChild).toBe(webComponent);
	});

	test("clears whatever the container held before", () => {
		// Re-rendering must not leave a second widget behind, which would leave
		// two checkboxes competing for the same click.
		const target = container();
		target.innerHTML = "<p>old</p>";
		createWidgetSkeleton(target, lightTheme, TAG);
		expect(target.querySelector("p")).toBeNull();
		expect(target.children).toHaveLength(1);
	});

	test("replaces itself cleanly when called twice", () => {
		const target = container();
		createWidgetSkeleton(target, lightTheme, TAG);
		createWidgetSkeleton(target, lightTheme, TAG);
		expect(target.children).toHaveLength(1);
	});

	test("styles the host even though it is not the shadow-rooted component", () => {
		const { webComponent } = createWidgetSkeleton(container(), lightTheme, TAG);
		expect(webComponent.style.maxWidth).toBe(WIDGET_MAX_WIDTH);
		expect(webComponent.shadowRoot).toBeNull();
	});

	test("throws when the skeleton has no interactive area", () => {
		// A silent null here would produce a widget that looks right and can
		// never be clicked, so it has to fail loudly at construction.
		const target = container();
		const appendChild = Element.prototype.appendChild;
		const stripped = function <T extends Node>(this: Element, node: T): T {
			if (node instanceof HTMLElement) {
				node.querySelector(".prosopo-checkbox")?.remove();
			}
			return appendChild.call(this, node) as T;
		};
		Element.prototype.appendChild = stripped as typeof appendChild;
		try {
			expect(() => createWidgetSkeleton(target, lightTheme, TAG)).toThrow(
				"Fail to initialize widget: interactive area is not found",
			);
		} finally {
			Element.prototype.appendChild = appendChild;
		}
	});
});
