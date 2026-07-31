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

import { describe, expect, test } from "vitest";
import { WIDGET_MAX_WIDTH } from "../constants.js";
import {
	applyDefaultStyles,
	createWebComponent,
} from "../webComponent/createWebComponent.js";

describe("applyDefaultStyles", () => {
	test("lays the host out as a full width column capped at the widget width", () => {
		// The host is dropped into an unknown page, so it takes all the width it
		// is given up to the design's maximum rather than sizing to content.
		const element: HTMLElement = document.createElement("div");
		applyDefaultStyles(element);
		expect(element.style.display).toBe("flex");
		expect(element.style.flexDirection).toBe("column");
		expect(element.style.width).toBe("100%");
		expect(element.style.maxWidth).toBe(WIDGET_MAX_WIDTH);
	});

	test("writes inline styles, which outrank the embedding page's stylesheet", () => {
		const element: HTMLElement = document.createElement("div");
		applyDefaultStyles(element);
		expect(element.getAttribute("style")).toContain("display: flex");
	});

	test("overwrites conflicting styles already on the element", () => {
		const element: HTMLElement = document.createElement("div");
		element.style.display = "none";
		applyDefaultStyles(element);
		expect(element.style.display).toBe("flex");
	});

	test("leaves unrelated styles alone", () => {
		const element: HTMLElement = document.createElement("div");
		element.style.opacity = "0.5";
		applyDefaultStyles(element);
		expect(element.style.opacity).toBe("0.5");
	});
});

describe("createWebComponent", () => {
	test("creates the requested tag with an open shadow root", () => {
		const component: HTMLElement = createWebComponent("procaptcha-test");
		expect(component.tagName.toLowerCase()).toBe("procaptcha-test");
		expect(component.shadowRoot).not.toBeNull();
	});

	test("applies the default host styles", () => {
		expect(createWebComponent("procaptcha-test").style.maxWidth).toBe(
			WIDGET_MAX_WIDTH,
		);
	});

	test("sets a font stack inside the shadow root", () => {
		// Shadow DOM inherits inheritable properties, but the widget pins its own
		// stack so it does not adopt the embedding site's font.
		const shadow = createWebComponent("procaptcha-test").shadowRoot;
		expect(shadow?.innerHTML).toContain("font-family:");
		expect(shadow?.querySelectorAll("style").length).toBe(2);
	});

	test("defaults to no custom css", () => {
		const shadow = createWebComponent("procaptcha-test").shadowRoot;
		const styles = shadow?.querySelectorAll("style") ?? [];
		expect(styles[1]?.textContent?.trim()).toBe("");
	});

	test("injects the caller's css into its own style block", () => {
		// A separate block so a malformed rule from the caller cannot swallow the
		// font declaration that follows it.
		const shadow = createWebComponent(
			"procaptcha-test",
			".a{color:red}",
		).shadowRoot;
		expect(shadow?.querySelectorAll("style")[1]?.textContent).toContain(
			".a{color:red}",
		);
		expect(shadow?.querySelectorAll("style")[0]?.textContent).toContain(
			"font-family:",
		);
	});

	test("the shadow root hides the styles from the page", () => {
		const component: HTMLElement = createWebComponent("procaptcha-test");
		document.body.appendChild(component);
		try {
			expect(document.querySelector("style")).toBeNull();
		} finally {
			component.remove();
		}
	});

	test("rejects a tag name the DOM cannot create", () => {
		// The tag comes from caller configuration, so an empty or spaced value is
		// reachable; document.createElement throws rather than returning null.
		expect(() => createWebComponent("")).toThrow();
		expect(() => createWebComponent("not a tag")).toThrow();
	});

	test("produces an independent component per call", () => {
		const first: HTMLElement = createWebComponent("procaptcha-test", ".a{}");
		const second: HTMLElement = createWebComponent("procaptcha-test", ".b{}");
		expect(first).not.toBe(second);
		expect(first.shadowRoot?.innerHTML).not.toBe(second.shadowRoot?.innerHTML);
	});
});
