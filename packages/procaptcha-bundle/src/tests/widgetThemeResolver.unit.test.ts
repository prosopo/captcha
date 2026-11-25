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

import type { ProcaptchaRenderOptions } from "@prosopo/types";
import { describe, expect, test } from "vitest";
import { WidgetThemeResolver } from "../util/widgetThemeResolver.js";

const elementWith = (attributes: Record<string, string>): Element => {
	const element = document.createElement("div");
	for (const [name, value] of Object.entries(attributes)) {
		element.setAttribute(name, value);
	}
	return element;
};

const options = (
	overrides: Partial<ProcaptchaRenderOptions> = {},
): ProcaptchaRenderOptions => ({ siteKey: "site", ...overrides });

describe("WidgetThemeResolver.resolveWidgetAppearance", () => {
	const resolver = new WidgetThemeResolver();

	test("reads palette, shape and font from data attributes", () => {
		const element = elementWith({
			"data-palette-primary": "#0a7d3b",
			"data-palette-text-secondary": "#555555",
			"data-shape": "square",
			"data-font": "Inter",
		});

		expect(resolver.resolveWidgetAppearance(element, options())).toEqual({
			palette: { primary: "#0a7d3b", textSecondary: "#555555" },
			shape: "square",
			font: "Inter",
		});
	});

	test("reads the same settings from render options", () => {
		expect(
			resolver.resolveWidgetAppearance(
				elementWith({}),
				options({
					palette: { surface: "#ffffff" },
					shape: "rounded",
					font: "Georgia",
				}),
			),
		).toEqual({
			palette: { surface: "#ffffff" },
			shape: "rounded",
			font: "Georgia",
		});
	});

	test("lets render options win colour by colour over attributes", () => {
		const element = elementWith({
			"data-palette-primary": "#111111",
			"data-palette-border": "#222222",
			"data-shape": "square",
		});

		expect(
			resolver.resolveWidgetAppearance(
				element,
				options({ palette: { primary: "#333333" }, shape: "rounded" }),
			),
		).toEqual({
			palette: { primary: "#333333", border: "#222222" },
			shape: "rounded",
			font: undefined,
		});
	});

	test("drops a shape it does not know", () => {
		expect(
			resolver.resolveWidgetAppearance(
				elementWith({ "data-shape": "blob" }),
				options(),
			).shape,
		).toBeUndefined();
	});
});
