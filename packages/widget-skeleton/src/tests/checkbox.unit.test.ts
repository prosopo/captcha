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
	CHECKBOX_HOST_CSS_CLASS,
	type CheckboxElement,
	createCheckboxElement,
} from "../elements/checkbox.js";
import { type Theme, darkTheme, lightTheme } from "../theme.js";

const shadowOf = (element: HTMLElement): ShadowRoot => {
	const root = element.shadowRoot;
	if (root === null) {
		throw new Error("the checkbox attached no shadow root");
	}
	return root;
};

const styleTextOf = (checkbox: CheckboxElement): string =>
	shadowOf(checkbox.host).querySelector("style")?.textContent ?? "";

/** Every class actually present in the rendered tree, outermost first. */
const classesIn = (checkbox: CheckboxElement): string[] => {
	const classes: string[] = [];
	const walk = (node: Element): void => {
		if (node.className !== "") {
			classes.push(node.className);
		}
		for (const child of Array.from(node.children)) {
			walk(child);
		}
	};
	for (const child of Array.from(shadowOf(checkbox.host).children)) {
		if (child.tagName.toLowerCase() !== "style") {
			walk(child);
		}
	}
	return classes;
};

const depthOf = (checkbox: CheckboxElement): number => {
	let depth = 0;
	let node: Element | null = checkbox.interactiveArea;
	while (node !== null && node.parentElement !== null) {
		depth += 1;
		node = node.parentElement;
	}
	return depth;
};

describe("createCheckboxElement", () => {
	test("keeps its internals behind an open shadow root", () => {
		// Open rather than closed: the widget itself has to render into the
		// interactive area, and Cypress has to be able to reach the control.
		const checkbox: CheckboxElement = createCheckboxElement(lightTheme);
		expect(checkbox.host.className).toBe(CHECKBOX_HOST_CSS_CLASS);
		expect(checkbox.host.innerHTML).toBe("");
		expect(shadowOf(checkbox.host).children.length).toBeGreaterThan(0);
	});

	test("hands back the node the captcha mounts into", () => {
		// The caller gets the reference rather than a selector to look it up
		// with, which is what allows the class to differ per render.
		const checkbox: CheckboxElement = createCheckboxElement(lightTheme);
		expect(checkbox.interactiveArea.isConnected).toBe(false);
		expect(shadowOf(checkbox.host).contains(checkbox.interactiveArea)).toBe(
			true,
		);
	});

	test("the loading placeholder is the interactive area's only child", () => {
		// The captcha replaces the contents of this node, so anything else left
		// in it would survive the swap and stack up behind the checkbox.
		const checkbox: CheckboxElement = createCheckboxElement(lightTheme);
		expect(checkbox.interactiveArea.children.length).toBe(1);
		expect(
			checkbox.interactiveArea.firstElementChild?.getAttribute("aria-label"),
		).toBe("Loading");
	});

	test("names nothing the same way twice", () => {
		// The whole point: a selector scraped from one page load has to be dead
		// on the next.
		const first: string[] = classesIn(createCheckboxElement(lightTheme));
		const second: string[] = classesIn(createCheckboxElement(lightTheme));
		expect(first.length).toBeGreaterThan(0);
		expect(first.some((name: string) => second.includes(name))).toBe(false);
	});

	test("varies how deeply the interactive area is nested", () => {
		// Depth is drawn from a small range, so this samples rather than
		// comparing two renders that could legitimately agree.
		const depths = new Set(
			Array.from({ length: 40 }, () =>
				depthOf(createCheckboxElement(lightTheme)),
			),
		);
		expect(depths.size).toBeGreaterThan(1);
	});

	test("styles every element it renders", () => {
		// A generated name that reached the markup but not the stylesheet would
		// lose the layout silently, which is exactly what the old fixed markup
		// could not do.
		const checkbox: CheckboxElement = createCheckboxElement(lightTheme);
		const styles: string = styleTextOf(checkbox);
		for (const className of classesIn(checkbox)) {
			expect(styles).toContain(`.${className}`);
		}
	});

	test("pulses the placeholder with its own keyframes", () => {
		const styles: string = styleTextOf(createCheckboxElement(lightTheme));
		const animation = /animation: (\w+) 1\.5s ease-in-out infinite/.exec(
			styles,
		);
		expect(animation).not.toBeNull();
		expect(styles).toContain(`@keyframes ${animation?.[1]}`);
	});

	test("holds still for visitors who ask for reduced motion", () => {
		const styles: string = styleTextOf(createCheckboxElement(lightTheme));
		expect(styles).toMatch(
			/@media \(prefers-reduced-motion: reduce\) \{\s*\.\w+ \{\s*animation: none;/,
		);
	});

	test("draws no spinner while the widget loads", () => {
		// Loading shows a skeleton; the spinner is kept for a check in progress.
		const styles: string = styleTextOf(createCheckboxElement(lightTheme));
		expect(styles).not.toContain("rotate(");
		expect(styles).not.toContain("border-radius: 50%");
	});

	test.each([
		["light", lightTheme],
		["dark", darkTheme],
	])(
		"%s draws the placeholder the size and shape of the checkbox",
		(_n: string, theme: Theme) => {
			const styles: string = styleTextOf(createCheckboxElement(theme));
			expect(styles).toContain("width: 28px !important;");
			expect(styles).toContain("height: 28px !important;");
			expect(styles).toContain(`border-radius: ${theme.shape.checkbox};`);
			expect(styles).toContain(`background-color: ${theme.palette.border};`);
			expect(styles).not.toContain("undefined");
		},
	);

	test("styles the host itself, which only works from inside the shadow root", () => {
		// `:host` with no qualifier, so the rule does not depend on the one class
		// that is still fixed.
		expect(styleTextOf(createCheckboxElement(lightTheme))).toContain(":host {");
	});

	test("keeps its markup out of the embedding page", () => {
		// The widget runs on sites whose own CSS it must neither read nor break.
		const checkbox: CheckboxElement = createCheckboxElement(lightTheme);
		document.body.appendChild(checkbox.host);
		try {
			const [firstClass] = classesIn(checkbox);
			expect(document.querySelector(`.${firstClass}`)).toBeNull();
		} finally {
			checkbox.host.remove();
		}
	});
});
