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
	WIDGET_BORDER,
	WIDGET_BORDER_RADIUS,
	WIDGET_CHECKBOX_SPINNER_CSS_CLASS,
	WIDGET_DIMENSIONS,
	WIDGET_INNER_HEIGHT,
	WIDGET_MAX_WIDTH,
	WIDGET_MIN_HEIGHT,
	WIDGET_OUTER_HEIGHT,
	WIDGET_PADDING,
	WIDGET_URL,
	WIDGET_URL_TEXT,
} from "../constants.js";
import { CHECKBOX_MARKUP } from "../elements/checkbox.js";

describe("constants", () => {
	test("the widget link is an absolute https url", () => {
		// It is rendered into an anchor with target="_blank"; a relative or
		// javascript: value would resolve against the embedding site.
		const url: URL = new URL(WIDGET_URL);
		expect(url.protocol).toBe("https:");
		expect(WIDGET_URL_TEXT.length).toBeGreaterThan(0);
	});

	test("the inner height leaves room for the outer padding", () => {
		// The content box is nested inside the wrapper, so an inner height at or
		// above the outer one overflows a container that hides overflow.
		expect(WIDGET_INNER_HEIGHT).toBeLessThan(WIDGET_OUTER_HEIGHT);
		expect(WIDGET_INNER_HEIGHT).toBeGreaterThan(0);
	});

	test("the shared dimensions agree with the height constants", () => {
		// WIDGET_DIMENSIONS is handed to consumers as the placeholder size; if it
		// drifted from the CSS the widget would resize once it rendered.
		expect(WIDGET_DIMENSIONS).toEqual({
			maxWidth: WIDGET_MAX_WIDTH,
			minHeight: `${WIDGET_OUTER_HEIGHT}px`,
		});
		expect(WIDGET_MIN_HEIGHT).toBe(`${WIDGET_OUTER_HEIGHT}px`);
	});

	test("css length constants carry a unit", () => {
		for (const value of [
			WIDGET_MIN_HEIGHT,
			WIDGET_MAX_WIDTH,
			WIDGET_BORDER_RADIUS,
			WIDGET_PADDING,
		]) {
			// A bare number is silently ignored by the CSS parser rather than
			// erroring, so this is the only place it can be caught.
			expect(value).toMatch(/^\d+(\.\d+)?(px|%|em|rem)$/);
		}
	});

	test("the border is a valid shorthand missing only its colour", () => {
		// skeleton.ts sets border-color separately from the theme, so the
		// shorthand must not carry one of its own or it would win.
		expect(WIDGET_BORDER).toBe("1px solid");
	});

	test("the spinner class is a legal css identifier and is used", () => {
		expect(WIDGET_CHECKBOX_SPINNER_CSS_CLASS).toMatch(/^[a-zA-Z_-][\w-]*$/);
		// The class is public API: procaptcha-common's React checkbox renders it
		// while the styles that animate it live here.
		expect(CHECKBOX_MARKUP).toContain(WIDGET_CHECKBOX_SPINNER_CSS_CLASS);
	});
});
