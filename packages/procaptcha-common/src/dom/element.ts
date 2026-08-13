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

/**
 * Minimal DOM construction helpers used in place of JSX.
 *
 * Values are written straight through to the element: numbers are stringified
 * as-is and never get a `px` suffix appended. Every numeric style in the widget
 * is a unitless CSS property (`opacity`, `flex-grow`, `font-weight`,
 * `line-height`, `z-index`) or a bare `0`, so this matches what React emitted
 * for the same style objects.
 */

export type StyleValue = string | number | undefined;
export type StyleMap = Readonly<Record<string, StyleValue>>;

export type AttributeValue = string | number | boolean | undefined;
export type AttributeMap = Readonly<Record<string, AttributeValue>>;

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const toKebabCase = (property: string): string =>
	property.replace(/[A-Z]/g, (letter: string) => `-${letter.toLowerCase()}`);

/**
 * Apply a camelCased style map to an element. `undefined` removes the property
 * so a style map can be re-applied on update without leaving stale declarations
 * behind.
 */
export const applyStyles = (
	element: ElementCSSInlineStyle,
	styles: StyleMap,
) => {
	for (const [property, value] of Object.entries(styles)) {
		const name = toKebabCase(property);
		if (undefined === value) {
			element.style.removeProperty(name);
		} else {
			element.style.setProperty(name, String(value));
		}
	}
};

/**
 * Apply an attribute map. `undefined` and `false` remove the attribute, `true`
 * sets it to the empty string — the same shape React used for boolean attrs.
 */
export const applyAttributes = (element: Element, attributes: AttributeMap) => {
	for (const [name, value] of Object.entries(attributes)) {
		if (undefined === value || false === value) {
			element.removeAttribute(name);
		} else {
			element.setAttribute(name, true === value ? "" : String(value));
		}
	}
};

export interface ElementOptions {
	className?: string;
	style?: StyleMap;
	attributes?: AttributeMap;
	text?: string;
	children?: readonly Node[];
}

export const createElement = <K extends keyof HTMLElementTagNameMap>(
	tag: K,
	options: ElementOptions = {},
): HTMLElementTagNameMap[K] => {
	const element = document.createElement(tag);

	if (undefined !== options.className) {
		element.className = options.className;
	}
	if (undefined !== options.style) {
		applyStyles(element, options.style);
	}
	if (undefined !== options.attributes) {
		applyAttributes(element, options.attributes);
	}
	if (undefined !== options.text) {
		element.textContent = options.text;
	}
	if (undefined !== options.children) {
		for (const child of options.children) {
			element.appendChild(child);
		}
	}

	return element;
};

export interface SvgElementOptions {
	style?: StyleMap;
	attributes?: AttributeMap;
	children?: readonly Node[];
}

export const createSvgElement = <K extends keyof SVGElementTagNameMap>(
	tag: K,
	options: SvgElementOptions = {},
): SVGElementTagNameMap[K] => {
	const element = document.createElementNS(SVG_NAMESPACE, tag);

	if (undefined !== options.style) {
		applyStyles(element, options.style);
	}
	if (undefined !== options.attributes) {
		applyAttributes(element, options.attributes);
	}
	if (undefined !== options.children) {
		for (const child of options.children) {
			element.appendChild(child);
		}
	}

	return element;
};

/** Detach an element from its parent, tolerating an already-detached node. */
export const removeElement = (element: Node | null | undefined) => {
	element?.parentNode?.removeChild(element);
};

/** Remove every child of an element without touching the element itself. */
export const clearElement = (element: Node) => {
	while (element.firstChild) {
		element.removeChild(element.firstChild);
	}
};
