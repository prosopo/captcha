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

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { darkTheme, lightTheme } from "../theme.js";
import { createWidgetSkeleton } from "./createWidget.js";

describe("webComponent/createWidget", () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
	});

	afterEach(() => {
		document.body.innerHTML = "";
	});

	describe("createWidgetSkeleton", () => {
		it("should create widget skeleton with light theme", () => {
			const result = createWidgetSkeleton(container, lightTheme, "test-widget");

			expect(result.widgetInteractiveArea).toBeInstanceOf(HTMLElement);
			expect(result.webComponent).toBeInstanceOf(HTMLElement);
		});

		it("should create widget skeleton with dark theme", () => {
			const result = createWidgetSkeleton(container, darkTheme, "test-widget");

			expect(result.widgetInteractiveArea).toBeInstanceOf(HTMLElement);
			expect(result.webComponent).toBeInstanceOf(HTMLElement);
		});

		it("should attach web component to container", () => {
			const result = createWidgetSkeleton(container, lightTheme, "test-widget");

			expect(container.firstElementChild).toBe(result.webComponent);
		});

		it("should clear container before appending", () => {
			container.innerHTML = "<div>Previous content</div>";
			createWidgetSkeleton(container, lightTheme, "test-widget");

			expect(container.querySelector("div:not(test-widget)")).toBeNull();
		});

		it("should create web component with correct tag", () => {
			const tag = "custom-widget-tag";
			const result = createWidgetSkeleton(container, lightTheme, tag);

			expect(result.webComponent.tagName.toLowerCase()).toBe(tag);
		});

		it("should find interactive area in shadow DOM", () => {
			const result = createWidgetSkeleton(container, lightTheme, "test-widget");

			expect(result.widgetInteractiveArea.className).toBe("checkbox__content");
		});

		it("should verify interactive area exists in created widget", () => {
			const result = createWidgetSkeleton(container, lightTheme, "test-widget");
			const interactiveArea = result.widgetInteractiveArea;

			expect(interactiveArea).toBeInstanceOf(HTMLElement);
			expect(interactiveArea).not.toBeNull();
		});

		it("should return widget interactive area as HTMLElement", () => {
			const result = createWidgetSkeleton(container, lightTheme, "test-widget");

			expect(result.widgetInteractiveArea).toBeInstanceOf(HTMLElement);
			expect(result.widgetInteractiveArea).not.toBeNull();
		});

		it("should return web component as HTMLElement", () => {
			const result = createWidgetSkeleton(container, lightTheme, "test-widget");

			expect(result.webComponent).toBeInstanceOf(HTMLElement);
			expect(result.webComponent.tagName.toLowerCase()).toBe("test-widget");
		});

		it("should work with different container types", () => {
			const containers = [
				document.createElement("div"),
				document.createElement("section"),
				document.createElement("article"),
			];

			for (const cont of containers) {
				document.body.appendChild(cont);
				const result = createWidgetSkeleton(cont, lightTheme, "test-widget");

				expect(result.widgetInteractiveArea).toBeInstanceOf(HTMLElement);
				expect(result.webComponent).toBeInstanceOf(HTMLElement);
				cont.remove();
			}
		});

		it("should create widget with skeleton structure", () => {
			const result = createWidgetSkeleton(container, lightTheme, "test-widget");

			const shadowRoot = result.webComponent.shadowRoot;
			expect(shadowRoot).toBeInstanceOf(ShadowRoot);

			const widget = shadowRoot?.querySelector(".widget");
			expect(widget).toBeInstanceOf(HTMLElement);
		});

		it("should include checkbox in widget", () => {
			const result = createWidgetSkeleton(container, lightTheme, "test-widget");

			const shadowRoot = result.webComponent.shadowRoot;
			const checkbox = shadowRoot?.querySelector(".checkbox");
			expect(checkbox).toBeInstanceOf(HTMLElement);
		});

		it("should include logo in widget", () => {
			const result = createWidgetSkeleton(container, lightTheme, "test-widget");

			const shadowRoot = result.webComponent.shadowRoot;
			const logo = shadowRoot?.querySelector(".logo");
			expect(logo).toBeInstanceOf(HTMLElement);
		});

		it("should apply theme to widget skeleton", () => {
			const lightResult = createWidgetSkeleton(
				container,
				lightTheme,
				"test-widget",
			);
			container.innerHTML = "";

			const darkResult = createWidgetSkeleton(
				container,
				darkTheme,
				"test-widget",
			);

			const lightShadow = lightResult.webComponent.shadowRoot?.innerHTML || "";
			const darkShadow = darkResult.webComponent.shadowRoot?.innerHTML || "";

			expect(lightShadow).toContain(lightTheme.palette.background.default);
			expect(darkShadow).toContain(darkTheme.palette.background.default);
		});

		it("should handle multiple widget creations", () => {
			const container1 = document.createElement("div");
			const container2 = document.createElement("div");
			document.body.appendChild(container1);
			document.body.appendChild(container2);

			const result1 = createWidgetSkeleton(container1, lightTheme, "widget-1");
			const result2 = createWidgetSkeleton(container2, darkTheme, "widget-2");

			expect(result1.webComponent).not.toBe(result2.webComponent);
			expect(result1.widgetInteractiveArea).not.toBe(
				result2.widgetInteractiveArea,
			);
		});

		it("should use webComponent as root when shadowRoot is null", async () => {
			const { getCheckboxInteractiveArea } = await import(
				"../elements/checkbox.js"
			);

			const webComponent = document.createElement("test-widget");
			Object.defineProperty(webComponent, "shadowRoot", {
				get: () => null,
				configurable: true,
			});

			const widget = document.createElement("div");
			widget.className = "widget";
			const checkboxContent = document.createElement("div");
			checkboxContent.className = "checkbox__content";
			const checkbox = document.createElement("div");
			checkbox.className = "checkbox";
			checkbox.appendChild(checkboxContent);
			widget.appendChild(checkbox);
			webComponent.appendChild(widget);

			const interactiveArea = getCheckboxInteractiveArea(webComponent);

			expect(interactiveArea).toBeInstanceOf(HTMLElement);
			expect(interactiveArea?.className).toBe("checkbox__content");
		});
	});
});
