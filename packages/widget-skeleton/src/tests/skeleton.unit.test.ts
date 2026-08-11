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

import { afterEach, describe, expect, test } from "vitest";
import {
	WIDGET_MAX_WIDTH,
	WIDGET_MIN_HEIGHT,
	WIDGET_OUTER_HEIGHT,
} from "../constants.js";
import {
	type EnvironmentSources,
	createWidgetSkeletonElement,
	getCurrentEnvironmentMode,
	isDevMode,
	readEnvironmentSources,
	replacePlaceholder,
} from "../elements/skeleton.js";
import { type Theme, darkTheme, lightTheme } from "../theme.js";

const originalNodeEnv: string | undefined = process.env.NODE_ENV;

afterEach(() => {
	if (originalNodeEnv === undefined) {
		Reflect.deleteProperty(process.env, "NODE_ENV");
	} else {
		process.env.NODE_ENV = originalNodeEnv;
	}
});

describe("createWidgetSkeletonElement", () => {
	test("renders the full nesting the styles target", () => {
		// Each level exists for a specific declaration — the container query, the
		// overflow clip, the padded content box — so a missing one silently
		// changes the layout rather than failing.
		const widget: HTMLElement = createWidgetSkeletonElement(lightTheme);
		expect(widget.className).toBe("prosopo-widget");
		for (const selector of [
			".prosopo-widget__outer",
			".prosopo-widget__wrapper",
			".prosopo-widget__inner",
			".prosopo-widget__dimensions",
			".prosopo-widget__content",
		]) {
			expect(widget.querySelector(selector)).not.toBeNull();
		}
	});

	test("substitutes real elements for both placeholders", () => {
		const widget: HTMLElement = createWidgetSkeletonElement(lightTheme);
		// The placeholders are gone, not merely filled: replaceWith swaps the node.
		expect(widget.querySelector(".prosopo-widget__checkbox")).toBeNull();
		expect(widget.querySelector(".prosopo-widget__logo")).toBeNull();
		expect(
			widget.querySelector(".prosopo-checkbox")?.shadowRoot,
		).not.toBeNull();
		expect(widget.querySelector(".prosopo-logo-container a")).not.toBeNull();
	});

	test("keeps the checkbox before the logo", () => {
		// The content row is a space-between flex row; swapping the order would
		// put the brand mark where the click target is expected.
		const content = createWidgetSkeletonElement(lightTheme).querySelector(
			".prosopo-widget__content",
		);
		expect(content?.children[0]?.className).toBe("prosopo-checkbox");
		expect(content?.children[1]?.className).toBe("prosopo-logo-container");
	});

	test.each([
		["light", lightTheme],
		["dark", darkTheme],
	])(
		"%s interpolates its own palette into the styles",
		(_n: string, theme: Theme) => {
			const styles: string =
				createWidgetSkeletonElement(theme).querySelector("style")
					?.textContent ?? "";
			expect(styles).toContain(theme.palette.background.default);
			expect(styles).toContain(theme.font.color);
			expect(styles).toContain(theme.font.fontFamily);
			// Never the literal "undefined", which is what a renamed theme key would
			// produce inside a template string.
			expect(styles).not.toContain("undefined");
		},
	);

	test("pins the widget to the shared dimensions", () => {
		const styles: string =
			createWidgetSkeletonElement(lightTheme).querySelector("style")
				?.textContent ?? "";
		expect(styles).toContain(WIDGET_MAX_WIDTH);
		expect(styles).toContain(WIDGET_MIN_HEIGHT);
		expect(styles).toContain(`height: ${WIDGET_OUTER_HEIGHT}px`);
	});

	test("neutralises pseudo elements the embedding page may inject", () => {
		// Host stylesheets frequently add ::after content to links and divs; the
		// widget is not in a shadow root at this level, so it has to opt out.
		const styles: string =
			createWidgetSkeletonElement(lightTheme).querySelector("style")
				?.textContent ?? "";
		expect(styles).toContain("content: none !important");
	});

	test("forces ltr regardless of the embedding page's direction", () => {
		const styles: string =
			createWidgetSkeletonElement(lightTheme).querySelector("style")
				?.textContent ?? "";
		expect(styles).toContain("direction: ltr !important");
	});

	test("adds the test hook outside production", () => {
		process.env.NODE_ENV = "development";
		expect(
			createWidgetSkeletonElement(lightTheme).querySelector(
				'[data-cy="captcha-checkbox"]',
			),
		).not.toBeNull();
	});

	test("omits the test hook in production", () => {
		// It is read by the e2e suite; shipping it would expose an automation
		// selector to the bots the widget exists to stop.
		process.env.NODE_ENV = "production";
		const widget: HTMLElement = createWidgetSkeletonElement(lightTheme);
		expect(widget.querySelector("[data-cy]")).toBeNull();
		expect(widget.querySelector(".prosopo-widget__dimensions")).not.toBeNull();
	});

	test("re-reads the mode on every call", () => {
		// The mode is not captured at import time, so a bundler that sets it
		// late still takes effect.
		process.env.NODE_ENV = "production";
		expect(
			createWidgetSkeletonElement(lightTheme).querySelector("[data-cy]"),
		).toBeNull();
		process.env.NODE_ENV = "development";
		expect(
			createWidgetSkeletonElement(lightTheme).querySelector("[data-cy]"),
		).not.toBeNull();
	});

	test("returns a detached element on each call", () => {
		const widget: HTMLElement = createWidgetSkeletonElement(lightTheme);
		expect(widget.isConnected).toBe(false);
		expect(widget).not.toBe(createWidgetSkeletonElement(lightTheme));
	});
});

describe("isDevMode", () => {
	test.each([
		["production", false],
		["development", true],
		["test", true],
		["", true],
		["PRODUCTION", true],
	])("%s -> %s", (mode: string, expected: boolean) => {
		// Only the exact lowercase string counts, which is what bundlers emit.
		process.env.NODE_ENV = mode;
		expect(isDevMode()).toBe(expected);
	});

	test("treats an unset mode as development", () => {
		// With no NODE_ENV the bundler's mode is consulted, which under the test
		// runner is "test" — still not production.
		Reflect.deleteProperty(process.env, "NODE_ENV");
		expect(getCurrentEnvironmentMode()).not.toBe("production");
		expect(isDevMode()).toBe(true);
	});
});

describe("getCurrentEnvironmentMode", () => {
	const sources = (
		nodeEnv: string | undefined,
		bundlerMode: string | undefined,
	): EnvironmentSources => ({ nodeEnv, bundlerMode });

	test("prefers node's environment when there is one", () => {
		expect(getCurrentEnvironmentMode(sources("staging", "production"))).toBe(
			"staging",
		);
	});

	test("falls back to the bundler's mode when process is absent", () => {
		// A browser bundle with no process shim: without this branch the widget
		// would treat every build as development and ship its test hooks.
		expect(getCurrentEnvironmentMode(sources(undefined, "production"))).toBe(
			"production",
		);
		expect(isDevMode(sources(undefined, "production"))).toBe(false);
	});

	test("is undefined when neither source has a mode", () => {
		expect(
			getCurrentEnvironmentMode(sources(undefined, undefined)),
		).toBeUndefined();
		expect(isDevMode(sources(undefined, undefined))).toBe(true);
	});

	test("keeps an empty node mode rather than falling through", () => {
		// Only a nullish value falls back; an explicitly empty NODE_ENV is the
		// caller's answer, and it is not "production".
		expect(getCurrentEnvironmentMode(sources("", "production"))).toBe("");
		expect(isDevMode(sources("", "production"))).toBe(true);
	});
});

describe("readEnvironmentSources", () => {
	test("reads NODE_ENV from the live environment", () => {
		process.env.NODE_ENV = "staging";
		expect(readEnvironmentSources().nodeEnv).toBe("staging");
	});

	test("reports an unset NODE_ENV as undefined, not an empty string", () => {
		Reflect.deleteProperty(process.env, "NODE_ENV");
		expect(readEnvironmentSources().nodeEnv).toBeUndefined();
	});

	test("reports an absent process rather than throwing", () => {
		// A browser bundle with no process shim: `typeof` is used precisely so
		// this does not become a ReferenceError on load.
		const savedProcess: NodeJS.Process = globalThis.process;
		Reflect.defineProperty(globalThis, "process", {
			configurable: true,
			value: undefined,
			writable: true,
		});
		try {
			expect(typeof process).toBe("undefined");
			expect(readEnvironmentSources().nodeEnv).toBeUndefined();
		} finally {
			globalThis.process = savedProcess;
		}
	});

	test("returns both fields whatever the runtime provides", () => {
		// bundlerMode is whatever the bundler substituted, so it is only
		// asserted to be a string or absent.
		const read: EnvironmentSources = readEnvironmentSources();
		expect(Object.keys(read).sort()).toEqual(["bundlerMode", "nodeEnv"]);
		expect(["string", "undefined"]).toContain(typeof read.bundlerMode);
	});
});

describe("replacePlaceholder", () => {
	test("swaps the matched node for the replacement", () => {
		const root: HTMLElement = document.createElement("div");
		root.innerHTML = '<span class="slot"></span>';
		const replacement: HTMLElement = document.createElement("p");
		replacePlaceholder(root, ".slot", replacement);
		expect(root.querySelector(".slot")).toBeNull();
		expect(root.firstElementChild).toBe(replacement);
	});

	test("throws when the placeholder is missing", () => {
		// The failure the optional chain used to swallow: a renamed class in the
		// markup produced a widget with no checkbox and no error.
		expect(() =>
			replacePlaceholder(
				document.createElement("div"),
				".missing",
				document.createElement("p"),
			),
		).toThrow("no .missing placeholder");
	});

	test("replaces only the first match", () => {
		const root: HTMLElement = document.createElement("div");
		root.innerHTML =
			'<span class="slot" id="a"></span><span class="slot" id="b"></span>';
		replacePlaceholder(root, ".slot", document.createElement("p"));
		expect(root.querySelector(".slot")?.id).toBe("b");
	});
});
