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
		// The dialog container takes the M3 surfaceContainerHigh role and its text
		// the matching onSurface role. Asserting the pairing rather than the literal
		// hex is what actually guarantees legibility: retone the scheme and the two
		// still move together.
		expect(lightTheme.palette.background.default).toBe(
			lightTheme.palette.surfaceContainerHigh,
		);
		expect(lightTheme.palette.background.contrastText).toBe(
			lightTheme.palette.onSurface,
		);
		expect(darkTheme.palette.background.default).toBe(
			darkTheme.palette.surfaceContainerHigh,
		);
		expect(darkTheme.palette.background.contrastText).toBe(
			darkTheme.palette.onSurface,
		);
	});

	test("draw the logo in a colour that shows on their background", () => {
		expect(lightTheme.palette.logoFill).toBe("#332C67");
		expect(darkTheme.palette.logoFill).toBe("#cfc9e6");
	});

	test("take their primary from one ramp, lightened for dark mode", () => {
		// M3 dark schemes shift the accent to a lighter tone of the source hue so
		// it keeps contrast on a dark surface — sharing one primary would fail that.
		expect(lightTheme.palette.primary.main).toBe("#4E439F"); // purple 500
		expect(darkTheme.palette.primary.main).toBe("#8C85C1"); // purple 300
	});

	test("share one shape, type and state-layer scale", () => {
		// These are mode-independent in M3; a divergence would mean a widget that
		// changed geometry when the host page flipped to dark.
		expect(darkTheme.shape).toBe(lightTheme.shape);
		expect(darkTheme.typography).toBe(lightTheme.typography);
		expect(darkTheme.stateLayer).toBe(lightTheme.stateLayer);
	});

	test("outline containers in a tone distinct from their surface", () => {
		// Elevation is shadowless here, so the outline is the only thing separating
		// a container from the surface behind it.
		expect(lightTheme.palette.border).not.toBe(
			lightTheme.palette.background.default,
		);
		expect(darkTheme.palette.border).not.toBe(
			darkTheme.palette.background.default,
		);
	});

	test("declare their own mode", () => {
		expect(lightTheme.palette.mode).toBe("light");
		expect(darkTheme.palette.mode).toBe("dark");
	});

	test("use the M3 error role for each mode", () => {
		// M3 pairs a deep error red on light with a light one on dark, rather than
		// carrying a single red across both.
		expect(lightTheme.palette.error.main).toBe("#b3261e");
		expect(darkTheme.palette.error.main).toBe("#f2b8b5");
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
