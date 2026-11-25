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
	contrastRatio,
	createTheme,
	darkTheme,
	lightTheme,
	logoFillOn,
	readableTextOn,
	withAlpha,
} from "../index.js";

describe("createTheme", () => {
	test("hands back the stock theme when nothing is customised", () => {
		expect(createTheme("light")).toBe(lightTheme);
		expect(createTheme("dark", { palette: {}, shape: "rounded" })).toBe(
			darkTheme,
		);
	});

	test("treats a missing mode as light, the config default", () => {
		expect(createTheme(undefined)).toBe(lightTheme);
	});

	test("restyles every primary-coloured part from one colour", () => {
		const theme = createTheme("light", { palette: { primary: "#0a7d3b" } });

		expect(theme.palette.primary.main).toBe("#0a7d3b");
		expect(theme.palette.checkbox.fill).toBe("#0a7d3b");
		expect(theme.palette.checkbox.border).toBe("#0a7d3b");
		expect(theme.palette.titleAccent).toBe("#0a7d3b");
		expect(theme.palette.overlay).toBe(withAlpha("#0a7d3b", 0.32));
		expect(theme.palette.primaryContainer.main).not.toBe(
			lightTheme.palette.primaryContainer.main,
		);
		expect(theme.palette.surface).toBe(lightTheme.palette.surface);
	});

	test("picks button text that reads on the primary", () => {
		expect(
			createTheme("light", { palette: { primary: "#000000" } }).palette.primary
				.contrastText,
		).toBe("#ffffff");
		expect(
			createTheme("light", { palette: { primary: "#ffee00" } }).palette.primary
				.contrastText,
		).toBe("#000000");
		expect(readableTextOn("#4e439f")).toBe("#ffffff");
	});

	test("expands three-digit hex", () => {
		const theme = createTheme("light", { palette: { primary: "#F0A" } });
		expect(theme.palette.primary.main).toBe("#ff00aa");
	});

	test("ignores colours that are not hex, keeping the default", () => {
		const theme = createTheme("light", {
			palette: { primary: "red", surface: "url(x)", text: "#12345" },
		});
		expect(theme).toBe(lightTheme);
	});

	test("maps surface, background, text, border and error onto their roles", () => {
		const theme = createTheme("dark", {
			palette: {
				surface: "#101010",
				background: "#202020",
				text: "#fafafa",
				textSecondary: "#aaaaaa",
				border: "#333333",
				error: "#ff5555",
			},
		});

		expect(theme.palette.surface).toBe("#101010");
		expect(theme.palette.background.default).toBe("#202020");
		expect(theme.palette.surfaceContainerHigh).toBe("#202020");
		expect(theme.palette.onSurface).toBe("#fafafa");
		expect(theme.palette.background.contrastText).toBe("#fafafa");
		expect(theme.font.color).toBe("#fafafa");
		expect(theme.palette.onSurfaceVariant).toBe("#aaaaaa");
		expect(theme.palette.border).toBe("#333333");
		expect(theme.palette.tile.border).toBe("#333333");
		expect(theme.palette.error.main).toBe("#ff5555");
		expect(theme.palette.mode).toBe("dark");
	});

	test("squares off every corner", () => {
		const theme = createTheme("light", { shape: "square" });
		for (const radius of Object.values(theme.shape)) {
			expect(radius).toBe("0px");
		}
		expect(theme.palette).toBe(lightTheme.palette);
	});

	test("puts a custom font ahead of the default stack", () => {
		const theme = createTheme("light", { font: '"Inter", Arial' });
		expect(theme.font.fontFamily).toBe(
			`"Inter", Arial, ${lightTheme.font.fontFamily}`,
		);
	});

	test("refuses a font that could break out of the stylesheet", () => {
		for (const font of [
			"Arial; } body { display: none",
			"x, url(https://evil.example/f.woff)",
			"a\\62 c",
		]) {
			expect(createTheme("light", { font })).toBe(lightTheme);
		}
	});

	test("returns the same object for the same settings", () => {
		const appearance = {
			palette: { primary: "#0a7d3b" },
			shape: "square" as const,
		};
		expect(createTheme("light", appearance)).toBe(
			createTheme("light", { ...appearance, palette: { primary: "#0a7d3b" } }),
		);
		expect(createTheme("dark", appearance)).not.toBe(
			createTheme("light", appearance),
		);
	});

	test("keeps the stock logo colour where it already reads", () => {
		expect(
			createTheme("light", { palette: { surface: "#fafafa" } }).palette
				.logoFill,
		).toBe(lightTheme.palette.logoFill);
	});

	test("moves the logo to a purple that reads on a surface of the other mode", () => {
		const fill = createTheme("light", { palette: { surface: "#111111" } })
			.palette.logoFill;
		expect(fill).not.toBe(lightTheme.palette.logoFill);
		expect(fill.toLowerCase()).toMatch(/^#[0-9a-f]{6}$/);
		expect(fill).not.toBe("#ffffff");
		expect(contrastRatio(fill, "#111111")).toBeGreaterThanOrEqual(4.5);
	});

	test("falls back to black or white when no purple reads", () => {
		// Mid-tone: the best brand purple on it reaches only 4.25:1.
		const surface = "#776eb5";
		const fill = logoFillOn(surface, lightTheme.palette.logoFill);
		expect(["#000000", "#ffffff"]).toContain(fill);
		expect(contrastRatio(fill, surface)).toBeGreaterThanOrEqual(4.5);
	});

	test("reads on any surface", () => {
		for (const surface of [
			"#000000",
			"#ffffff",
			"#ff0000",
			"#00ff00",
			"#0000ff",
			"#808080",
			"#4e439f",
			"#ffee00",
		]) {
			const fill = createTheme("dark", { palette: { surface } }).palette
				.logoFill;
			expect(contrastRatio(fill, surface)).toBeGreaterThanOrEqual(4.5);
		}
	});
});
