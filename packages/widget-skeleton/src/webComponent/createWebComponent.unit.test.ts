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
import { WIDGET_MAX_WIDTH } from "../constants.js";
import { createWebComponent } from "./createWebComponent.js";

describe("webComponent/createWebComponent", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	afterEach(() => {
		document.body.innerHTML = "";
	});

	describe("createWebComponent", () => {
		it("should create a web component with custom tag", () => {
			const tag = "test-widget";
			const component = createWebComponent(tag);

			expect(component).toBeInstanceOf(HTMLElement);
			expect(component.tagName.toLowerCase()).toBe(tag);
		});

		it("should create shadow DOM with open mode", () => {
			const component = createWebComponent("test-widget");

			expect(component.shadowRoot).toBeInstanceOf(ShadowRoot);
			expect(component.shadowRoot?.mode).toBe("open");
		});

		it("should apply default styles to component", () => {
			const component = createWebComponent("test-widget");

			expect(component.style.display).toBe("flex");
			expect(component.style.flexDirection).toBe("column");
			expect(component.style.width).toBe("100%");
			expect(component.style.maxWidth).toBe(WIDGET_MAX_WIDTH);
		});

		it("should include font family in shadow root styles", () => {
			const component = createWebComponent("test-widget");

			expect(component.shadowRoot?.innerHTML).toContain("font-family");
		});

		it("should accept custom CSS", () => {
			const customCss = ".custom { color: red; }";
			const component = createWebComponent("test-widget", customCss);

			expect(component.shadowRoot?.innerHTML).toContain(customCss);
		});

		it("should work with empty custom CSS", () => {
			const component = createWebComponent("test-widget", "");

			expect(component).toBeInstanceOf(HTMLElement);
			expect(component.shadowRoot).toBeInstanceOf(ShadowRoot);
		});

		it("should include both default and custom styles", () => {
			const customCss = ".custom { color: blue; }";
			const component = createWebComponent("test-widget", customCss);

			const shadowHTML = component.shadowRoot?.innerHTML || "";
			expect(shadowHTML).toContain("font-family");
			expect(shadowHTML).toContain(customCss);
		});

		it("should create multiple independent components", () => {
			const component1 = createWebComponent("widget-1");
			const component2 = createWebComponent("widget-2");

			expect(component1.tagName).toBe("WIDGET-1");
			expect(component2.tagName).toBe("WIDGET-2");
			expect(component1.shadowRoot).not.toBe(component2.shadowRoot);
		});

		it("should be appendable to DOM", () => {
			const component = createWebComponent("test-widget");
			document.body.appendChild(component);

			expect(document.body.querySelector("test-widget")).toBe(component);
		});

		it("should have shadow root accessible", () => {
			const component = createWebComponent("test-widget");

			expect(component.shadowRoot).not.toBeNull();
			expect(component.shadowRoot?.innerHTML).toBeDefined();
		});

		it("should handle different tag names", () => {
			const tags = ["procaptcha-widget", "custom-element", "test-123"];

			for (const tag of tags) {
				const component = createWebComponent(tag);
				expect(component.tagName.toLowerCase()).toBe(tag);
			}
		});

		it("should have styles in shadow root", () => {
			const component = createWebComponent("test-widget");

			const shadowHTML = component.shadowRoot?.innerHTML || "";
			expect(shadowHTML).toContain("<style>");
		});

		it("should apply custom CSS in separate style block", () => {
			const customCss = "body { margin: 0; }";
			const component = createWebComponent("test-widget", customCss);

			const shadowHTML = component.shadowRoot?.innerHTML || "";
			const styleBlocks = shadowHTML.match(/<style>/g);
			expect(styleBlocks?.length).toBe(2); // One for default, one for custom
		});
	});
});
