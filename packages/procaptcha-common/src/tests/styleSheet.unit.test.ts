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
import { injectStyle } from "../dom/styleSheet.js";

/**
 * This replaces Emotion's cache, which the bundle pointed at the widget's own
 * interactive area. Rules must stay inside that element — leaking them into the
 * host page's `<head>` would let the widget restyle the dapp around it.
 */

const container = (): HTMLElement => document.createElement("div");

const styleTags = (element: HTMLElement): HTMLStyleElement[] =>
	Array.from(element.querySelectorAll("style"));

describe("injectStyle", () => {
	test("inserts the css into the container, not the document head", () => {
		const host = container();
		const headBefore = document.head.querySelectorAll("style").length;

		injectStyle(host, "checkbox", ".a { color: red; }");

		expect(styleTags(host)).toHaveLength(1);
		expect(styleTags(host)[0]?.textContent).toBe(".a { color: red; }");
		expect(document.head.querySelectorAll("style")).toHaveLength(headBefore);
	});

	test("tags the style with its id so a repeat call can find it", () => {
		const host = container();
		injectStyle(host, "checkbox", ".a {}");
		expect(styleTags(host)[0]?.getAttribute("data-prosopo-style")).toBe(
			"checkbox",
		);
	});

	test("prepends, so later rules from the skeleton win", () => {
		// Emotion was configured with `prepend: true`; component rules are meant
		// to lose to whatever the widget skeleton sets afterwards.
		const host = container();
		const existing = host.appendChild(document.createElement("div"));

		injectStyle(host, "checkbox", ".a {}");

		expect(host.firstChild).not.toBe(existing);
		expect((host.firstChild as Element).tagName).toBe("STYLE");
	});

	test("is a no-op for a second injection of the same id", () => {
		// Several widgets can share one container across a restart; a duplicate
		// copy of the rules is dead weight in the DOM.
		const host = container();
		injectStyle(host, "checkbox", ".a {}");
		injectStyle(host, "checkbox", ".a {}");
		expect(styleTags(host)).toHaveLength(1);
	});

	test("keeps different ids apart", () => {
		const host = container();
		injectStyle(host, "checkbox", ".a {}");
		injectStyle(host, "banner", ".b {}");
		expect(styleTags(host)).toHaveLength(2);
	});

	test("injects into each container independently", () => {
		// Two widgets on a page have separate shadow roots, so each needs its own
		// copy — the id is scoped to the container, not global.
		const first = container();
		const second = container();
		injectStyle(first, "checkbox", ".a {}");
		injectStyle(second, "checkbox", ".a {}");
		expect(styleTags(first)).toHaveLength(1);
		expect(styleTags(second)).toHaveLength(1);
	});

	test("the disposer removes the tag it inserted", () => {
		const host = container();
		const dispose = injectStyle(host, "checkbox", ".a {}");
		dispose();
		expect(styleTags(host)).toHaveLength(0);
	});

	test("the no-op disposer leaves the existing tag in place", () => {
		// The second widget must not be able to strip the first widget's styles
		// when it tears down.
		const host = container();
		injectStyle(host, "checkbox", ".a {}");
		const disposeSecond = injectStyle(host, "checkbox", ".a {}");

		disposeSecond();

		expect(styleTags(host)).toHaveLength(1);
	});

	test("the first disposer leaves the tag for the second holder", () => {
		// The mirror of the case above, and the one that actually bites: teardown
		// order is not mount order, so the first widget to be destroyed must not
		// strip the rules out from under a sibling that is still mounted.
		const host = container();
		const disposeFirst = injectStyle(host, "checkbox", ".a {}");
		injectStyle(host, "checkbox", ".a {}");

		disposeFirst();

		expect(styleTags(host)).toHaveLength(1);
	});

	test("removes the tag once every holder has disposed", () => {
		const host = container();
		const disposeFirst = injectStyle(host, "checkbox", ".a {}");
		const disposeSecond = injectStyle(host, "checkbox", ".a {}");

		disposeFirst();
		disposeSecond();

		expect(styleTags(host)).toHaveLength(0);
	});

	test("a double dispose cannot release another holder's claim", () => {
		const host = container();
		const disposeFirst = injectStyle(host, "checkbox", ".a {}");
		injectStyle(host, "checkbox", ".a {}");

		disposeFirst();
		disposeFirst();

		expect(styleTags(host)).toHaveLength(1);
	});

	test("re-injects after the disposer ran", () => {
		// The frictionless restart path destroys and remounts into the same
		// container, and the remounted widget needs its rules back.
		const host = container();
		injectStyle(host, "checkbox", ".a {}")();
		injectStyle(host, "checkbox", ".a {}");
		expect(styleTags(host)).toHaveLength(1);
	});

	test("tolerates a disposer called twice", () => {
		const host = container();
		const dispose = injectStyle(host, "checkbox", ".a {}");
		dispose();
		expect(() => dispose()).not.toThrow();
	});
});
