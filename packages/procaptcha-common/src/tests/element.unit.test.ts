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
import {
	applyAttributes,
	applyStyles,
	clearElement,
	createElement,
	createSvgElement,
	removeElement,
} from "../dom/element.js";

/**
 * These helpers stand in for JSX across every widget, so the details they get
 * right are load-bearing: React's own style/attribute semantics (undefined
 * removes, booleans are presence flags, numbers go through unchanged) are what
 * the ported components were written against.
 */

describe("applyStyles", () => {
	test("writes a camelCased property as its kebab-case CSS name", () => {
		const element = createElement("div");
		applyStyles(element, { backgroundColor: "red" });
		expect(element.style.backgroundColor).toBe("red");
	});

	test("removes a property set to undefined", () => {
		// Components re-apply a whole style map on update; without removal a
		// declaration from the previous state would linger.
		const element = createElement("div", { style: { color: "red" } });
		applyStyles(element, { color: undefined });
		expect(element.style.color).toBe("");
	});

	test("writes a number without appending px", () => {
		// Every numeric style in the widget is a unitless CSS property, so a
		// helpfully-appended unit would produce an invalid declaration.
		const element = createElement("div");
		applyStyles(element, { opacity: 0 });
		expect(element.style.opacity).toBe("0");
	});

	test("overwrites a previously applied value", () => {
		const element = createElement("div", { style: { color: "red" } });
		applyStyles(element, { color: "blue" });
		expect(element.style.color).toBe("blue");
	});

	test("leaves properties it was not given alone", () => {
		const element = createElement("div", { style: { color: "red" } });
		applyStyles(element, { backgroundColor: "blue" });
		expect(element.style.color).toBe("red");
	});
});

describe("applyAttributes", () => {
	test("sets a string attribute", () => {
		const element = createElement("div");
		applyAttributes(element, { "aria-label": "hello" });
		expect(element.getAttribute("aria-label")).toBe("hello");
	});

	test("stringifies a number", () => {
		const element = createElement("input");
		applyAttributes(element, { tabindex: -1 });
		expect(element.getAttribute("tabindex")).toBe("-1");
	});

	test("renders true as a bare presence flag", () => {
		const element = createElement("input");
		applyAttributes(element, { disabled: true });
		expect(element.getAttribute("disabled")).toBe("");
	});

	test("removes an attribute set to false", () => {
		const element = createElement("input", { attributes: { disabled: true } });
		applyAttributes(element, { disabled: false });
		expect(element.hasAttribute("disabled")).toBe(false);
	});

	test("removes an attribute set to undefined", () => {
		const element = createElement("div", { attributes: { "data-cy": "x" } });
		applyAttributes(element, { "data-cy": undefined });
		expect(element.hasAttribute("data-cy")).toBe(false);
	});
});

describe("createElement", () => {
	test("creates the requested tag", () => {
		expect(createElement("button").tagName).toBe("BUTTON");
	});

	test("applies a class name", () => {
		expect(createElement("div", { className: "a b" }).className).toBe("a b");
	});

	test("applies styles and attributes", () => {
		const element = createElement("input", {
			style: { width: "10px" },
			attributes: { type: "checkbox" },
		});
		expect(element.style.width).toBe("10px");
		expect(element.getAttribute("type")).toBe("checkbox");
	});

	test("sets text content", () => {
		expect(createElement("p", { text: "hello" }).textContent).toBe("hello");
	});

	test("appends children in order", () => {
		const first = createElement("span", { text: "1" });
		const second = createElement("span", { text: "2" });
		const parent = createElement("div", { children: [first, second] });
		expect(Array.from(parent.children)).toEqual([first, second]);
	});

	test("escapes text rather than parsing it as markup", () => {
		// Error messages and translations flow through `text`, so this must not
		// become an injection point.
		const element = createElement("p", { text: "<img src=x onerror=1>" });
		expect(element.children).toHaveLength(0);
		expect(element.textContent).toBe("<img src=x onerror=1>");
	});
});

describe("createSvgElement", () => {
	test("creates the node in the SVG namespace", () => {
		// A `document.createElement("svg")` produces an HTMLUnknownElement that
		// renders nothing, which is the whole reason this helper exists.
		const svg = createSvgElement("svg");
		expect(svg.namespaceURI).toBe("http://www.w3.org/2000/svg");
	});

	test("applies attributes and children", () => {
		const path = createSvgElement("path", { attributes: { d: "M0 0" } });
		const svg = createSvgElement("svg", {
			attributes: { viewBox: "0 0 16 16" },
			children: [path],
		});
		expect(svg.getAttribute("viewBox")).toBe("0 0 16 16");
		expect(svg.firstChild).toBe(path);
		expect(path.getAttribute("d")).toBe("M0 0");
	});

	test("applies styles", () => {
		expect(
			createSvgElement("svg", { style: { display: "flex" } }).style.display,
		).toBe("flex");
	});
});

describe("removeElement", () => {
	test("detaches an attached element", () => {
		const parent = createElement("div");
		const child = createElement("span");
		parent.appendChild(child);
		removeElement(child);
		expect(parent.children).toHaveLength(0);
	});

	test("tolerates an already-detached element", () => {
		// `destroy` runs on paths where the host page may have removed the node
		// first, so a second removal must not throw.
		expect(() => removeElement(createElement("span"))).not.toThrow();
	});

	test("tolerates null and undefined", () => {
		expect(() => removeElement(null)).not.toThrow();
		expect(() => removeElement(undefined)).not.toThrow();
	});
});

describe("clearElement", () => {
	test("removes every child", () => {
		const parent = createElement("div", {
			children: [createElement("span"), createElement("span")],
		});
		clearElement(parent);
		expect(parent.childNodes).toHaveLength(0);
	});

	test("removes text nodes as well as elements", () => {
		const parent = createElement("div", { text: "hello" });
		clearElement(parent);
		expect(parent.textContent).toBe("");
	});

	test("leaves the element's own attributes intact", () => {
		const parent = createElement("div", {
			className: "keep",
			children: [createElement("span")],
		});
		clearElement(parent);
		expect(parent.className).toBe("keep");
	});
});
