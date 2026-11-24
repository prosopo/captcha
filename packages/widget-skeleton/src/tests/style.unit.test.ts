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
import { createStyleElement } from "../elements/style.js";
import { lightTheme } from "../theme.js";
import { createWebComponent } from "../webComponent/createWebComponent.js";
import { createWidgetSkeleton } from "../webComponent/createWidget.js";

const NONCE = "page-nonce";

/** Every stylesheet in the tree, including those behind shadow roots. */
const stylesIn = (root: ParentNode): HTMLStyleElement[] =>
	Array.from(root.querySelectorAll("*")).flatMap((element: Element) => [
		...(element instanceof HTMLStyleElement ? [element] : []),
		...(element.shadowRoot ? stylesIn(element.shadowRoot) : []),
	]);

describe("createStyleElement", () => {
	test("carries the css", () => {
		expect(createStyleElement(".a {}").textContent).toBe(".a {}");
	});

	test("carries the nonce it is given", () => {
		expect(createStyleElement(".a {}", NONCE).getAttribute("nonce")).toBe(
			NONCE,
		);
	});

	test("has no nonce attribute when given none", () => {
		expect(createStyleElement(".a {}").hasAttribute("nonce")).toBe(false);
	});
});

describe("a widget rendered with a nonce", () => {
	test("stamps it on every stylesheet, shadow roots included", () => {
		const container: HTMLElement = document.createElement("div");
		createWidgetSkeleton(
			container,
			lightTheme,
			"prosopo-procaptcha",
			undefined,
			undefined,
			NONCE,
		);
		const styles: HTMLStyleElement[] = stylesIn(container);

		expect(styles.length).toBeGreaterThanOrEqual(3);
		for (const style of styles) {
			expect(style.getAttribute("nonce")).toBe(NONCE);
		}
	});

	test("stamps it on a web component's stylesheets", () => {
		const component: HTMLElement = createWebComponent(
			"procaptcha-test",
			".a {}",
			NONCE,
		);
		const styles: HTMLStyleElement[] = Array.from(
			component.shadowRoot?.querySelectorAll("style") ?? [],
		);

		expect(styles).toHaveLength(2);
		for (const style of styles) {
			expect(style.getAttribute("nonce")).toBe(NONCE);
		}
	});
});
