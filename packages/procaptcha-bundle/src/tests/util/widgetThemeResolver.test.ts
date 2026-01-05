// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WidgetThemeResolver } from "../../util/widgetThemeResolver.js";

describe("WidgetThemeResolver", () => {
	let dom: JSDOM;
	let element: Element;
	let resolver: WidgetThemeResolver;

	beforeEach(() => {
		dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
		global.document = dom.window.document;
		element = document.createElement("div");
		resolver = new WidgetThemeResolver();
	});

	afterEach(() => {
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix any
		(global as any).document = undefined;
	});

	it("should return theme from renderOptions when provided", () => {
		const theme = resolver.resolveWidgetTheme(element, { theme: "dark" });

		expect(theme).toBe("dark");
	});

	it("should return theme from element data attribute when renderOptions theme is not provided", () => {
		element.setAttribute("data-theme", "dark");
		const theme = resolver.resolveWidgetTheme(element, {});

		expect(theme).toBe("dark");
	});

	it("should prioritize renderOptions theme over element attribute", () => {
		element.setAttribute("data-theme", "dark");
		const theme = resolver.resolveWidgetTheme(element, { theme: "light" });

		expect(theme).toBe("light");
	});

	it("should default to light theme when neither renderOptions nor element attribute is provided", () => {
		const theme = resolver.resolveWidgetTheme(element, {});

		expect(theme).toBe("light");
	});

	it("should return light theme for valid light value", () => {
		const theme = resolver.resolveWidgetTheme(element, { theme: "light" });

		expect(theme).toBe("light");
	});

	it("should return dark theme for valid dark value", () => {
		const theme = resolver.resolveWidgetTheme(element, { theme: "dark" });

		expect(theme).toBe("dark");
	});

	it("should default to light theme for invalid theme value in renderOptions", () => {
		const theme = resolver.resolveWidgetTheme(element, {
			theme: "invalid" as "light" | "dark",
		});

		expect(theme).toBe("light");
	});

	it("should default to light theme for invalid theme value in element attribute", () => {
		element.setAttribute("data-theme", "invalid");
		const theme = resolver.resolveWidgetTheme(element, {});

		expect(theme).toBe("light");
	});

	it("should handle empty string in element attribute", () => {
		element.setAttribute("data-theme", "");
		const theme = resolver.resolveWidgetTheme(element, {});

		expect(theme).toBe("light");
	});

	it("should validate theme correctly for light", () => {
		const theme = resolver.resolveWidgetTheme(element, { theme: "light" });

		expect(theme).toBe("light");
	});

	it("should validate theme correctly for dark", () => {
		const theme = resolver.resolveWidgetTheme(element, { theme: "dark" });

		expect(theme).toBe("dark");
	});
});

