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
	WIDGET_DIMENSIONS,
	WIDGET_INNER_HEIGHT,
	WIDGET_MAX_WIDTH,
	WIDGET_OUTER_HEIGHT,
	darkTheme,
	lightTheme,
} from "../index.js";

describe("the two themes", () => {
	test("differ in the only two things that make them light or dark", () => {
		// Everything else is shared, and a divergence here would show up as a
		// widget that half-follows the host page's colour scheme.
		expect(lightTheme.palette.background.default).not.toBe(
			darkTheme.palette.background.default,
		);
		expect(lightTheme.font.color).not.toBe(darkTheme.font.color);
	});

	test("keep text readable against their own background", () => {
		expect(lightTheme.palette.background.contrastText).toBe("#000");
		expect(lightTheme.palette.background.default).toBe("#fff");
		expect(darkTheme.palette.background.contrastText).toBe("#fff");
		expect(darkTheme.palette.background.default).toBe("#303030");
	});

	test("draw the logo in a colour that shows on their background", () => {
		expect(lightTheme.palette.logoFill).toBe("#1d1d1b");
		expect(darkTheme.palette.logoFill).toBe("#fff");
	});

	test("share the brand primary and its contrast text", () => {
		expect(darkTheme.palette.primary).toEqual(lightTheme.palette.primary);
	});

	test("share the same grey ramp object", () => {
		expect(darkTheme.palette.grey).toBe(lightTheme.palette.grey);
	});

	test("pick a border grey that contrasts with the background", () => {
		expect(lightTheme.palette.border).toBe(lightTheme.palette.grey[400]);
		expect(darkTheme.palette.border).toBe(darkTheme.palette.grey[300]);
	});

	test("declare their own mode", () => {
		expect(lightTheme.palette.mode).toBe("light");
		expect(darkTheme.palette.mode).toBe("dark");
	});

	test("agree on error red", () => {
		expect(lightTheme.palette.error.main).toBe("#f44336");
		expect(darkTheme.palette.error.main).toBe(lightTheme.palette.error.main);
	});
});

describe("spacing", () => {
	test("halves the unit to a whole number of pixels", () => {
		// Consumers interpolate these straight into px values, so a fractional
		// half would produce sub-pixel rules that render inconsistently.
		expect(lightTheme.spacing.half).toBe(
			Math.floor(lightTheme.spacing.unit / 2),
		);
		expect(Number.isInteger(lightTheme.spacing.half)).toBe(true);
	});

	test("is identical across themes", () => {
		expect(darkTheme.spacing).toEqual(lightTheme.spacing);
	});
});

describe("fonts", () => {
	test("start with a system stack so nothing is fetched", () => {
		// The widget is embedded in third-party pages; a webfont request would
		// be an extra round trip and a tracking vector.
		expect(lightTheme.font.fontFamily.startsWith("ui-sans-serif")).toBe(true);
		expect(lightTheme.font.fontFamily).not.toContain("url(");
	});

	test("use the same stack in both themes", () => {
		expect(darkTheme.font.fontFamily).toBe(lightTheme.font.fontFamily);
	});
});

describe("the published dimensions", () => {
	test("describe the outer, not the inner, height", () => {
		expect(WIDGET_DIMENSIONS.minHeight).toBe(`${WIDGET_OUTER_HEIGHT}px`);
		expect(WIDGET_DIMENSIONS.maxWidth).toBe(WIDGET_MAX_WIDTH);
	});

	test("leave room around the content box", () => {
		expect(WIDGET_OUTER_HEIGHT).toBeGreaterThan(WIDGET_INNER_HEIGHT);
	});
});
