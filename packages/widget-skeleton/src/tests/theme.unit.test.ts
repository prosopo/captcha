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
import { type Theme, darkTheme, lightTheme } from "../theme.js";

const themes: ReadonlyArray<[string, Theme]> = [
	["light", lightTheme],
	["dark", darkTheme],
];

const isHexColour = (value: string): boolean =>
	/^#[0-9a-fA-F]{3,8}$/.test(value);

describe("theme", () => {
	test("both themes expose the same shape", () => {
		// Consumers pick one by a runtime string, so a key present on only one
		// would render as "undefined" in a stylesheet rather than failing.
		expect(Object.keys(lightTheme).sort()).toEqual(
			Object.keys(darkTheme).sort(),
		);
		expect(Object.keys(lightTheme.palette).sort()).toEqual(
			Object.keys(darkTheme.palette).sort(),
		);
	});

	test.each(themes)(
		"%s declares its own mode",
		(name: string, theme: Theme) => {
			expect(theme.palette.mode).toBe(name);
		},
	);

	test.each(themes)(
		"%s uses hex colours everywhere they are interpolated",
		(_name: string, theme: Theme) => {
			for (const colour of [
				theme.palette.primary.main,
				theme.palette.primary.contrastText,
				theme.palette.background.default,
				theme.palette.background.contrastText,
				theme.palette.border,
				theme.palette.error.main,
				theme.palette.logoFill,
				theme.font.color,
			]) {
				expect(isHexColour(colour)).toBe(true);
			}
		},
	);

	test.each(themes)(
		"%s contrasts its background against its foreground",
		(_name: string, theme: Theme) => {
			// The contrastText is drawn on top of the default background, so equal
			// values would render invisible text.
			expect(theme.palette.background.contrastText).not.toBe(
				theme.palette.background.default,
			);
			expect(theme.palette.primary.contrastText).not.toBe(
				theme.palette.primary.main,
			);
		},
	);

	test("the two themes actually differ", () => {
		expect(darkTheme.palette.background.default).not.toBe(
			lightTheme.palette.background.default,
		);
		expect(darkTheme.font.color).not.toBe(lightTheme.font.color);
		expect(darkTheme.palette.logoFill).not.toBe(lightTheme.palette.logoFill);
	});

	test("the brand colour is shared", () => {
		// The primary is the brand blue and is deliberately mode independent.
		expect(darkTheme.palette.primary.main).toBe(
			lightTheme.palette.primary.main,
		);
		expect(darkTheme.palette.error.main).toBe(lightTheme.palette.error.main);
	});

	test.each(themes)(
		"%s exposes a full grey ramp",
		(_n: string, theme: Theme) => {
			const keys: string[] = Object.keys(theme.palette.grey);
			expect(keys).toEqual([
				"0",
				"100",
				"200",
				"300",
				"400",
				"500",
				"600",
				"700",
				"800",
				"900",
			]);
			for (const key of keys) {
				expect(isHexColour(theme.palette.grey[Number(key) as 0])).toBe(true);
			}
		},
	);

	test("the ramp runs light to dark", () => {
		// skeleton.ts picks grey[300] for a border on both themes, which only
		// works while the ramp is ordered.
		const luminance = (hex: string): number =>
			Number.parseInt(
				hex.length === 4 ? hex.slice(1, 2).repeat(2) : hex.slice(1, 3),
				16,
			);
		const greys = lightTheme.palette.grey;
		expect(luminance(greys[0])).toBeGreaterThan(luminance(greys[900]));
	});

	test.each(themes)(
		"%s spacing is a whole number of pixels",
		(_n: string, theme: Theme) => {
			// half is floored, so an odd unit must not produce a fractional value
			// that browsers round inconsistently.
			expect(Number.isInteger(theme.spacing.unit)).toBe(true);
			expect(theme.spacing.half).toBe(Math.floor(theme.spacing.unit / 2));
			expect(theme.spacing.unit).toBeGreaterThan(0);
		},
	);

	test.each(themes)(
		"%s font stack is quoted where it needs to be",
		(_n: string, theme: Theme) => {
			// It is interpolated straight into a style block; an unquoted multi-word
			// family would break the declaration.
			for (const family of theme.font.fontFamily.split(",")) {
				const trimmed: string = family.trim();
				if (trimmed.includes(" ")) {
					expect(trimmed.startsWith('"')).toBe(true);
				}
			}
		},
	);

	test("neither theme is frozen, so consumers must not be trusted to leave it alone", () => {
		// Documents current behaviour: these are plain shared objects, so a
		// consumer mutating one affects every widget on the page.
		expect(Object.isFrozen(lightTheme)).toBe(false);
	});
});
