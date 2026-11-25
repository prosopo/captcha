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

import {
	PALETTE_DATA_ATTRIBUTES,
	type ProcaptchaAppearance,
	type ProcaptchaPalette,
	type ProcaptchaRenderOptions,
	type ProcaptchaShape,
} from "@prosopo/types";

const isShape = (value: string | null | undefined): value is ProcaptchaShape =>
	"rounded" === value || "square" === value;

class WidgetThemeResolver {
	private readonly themesSet = new Set(["light", "dark"]);
	private readonly defaultTheme = "light";

	public resolveWidgetTheme(
		element: Element,
		renderOptions: ProcaptchaRenderOptions,
	): "light" | "dark" {
		const themeAttribute =
			renderOptions.theme ||
			element.getAttribute("data-theme") ||
			this.defaultTheme;

		return this.validateTheme(themeAttribute);
	}

	// Render options win colour by colour; `data-*` attributes fill the rest.
	public resolveWidgetAppearance(
		element: Element,
		renderOptions: ProcaptchaRenderOptions,
	): ProcaptchaAppearance {
		const palette: ProcaptchaPalette = {};
		for (const [key, attribute] of Object.entries(PALETTE_DATA_ATTRIBUTES) as [
			keyof ProcaptchaPalette,
			string,
		][]) {
			const colour =
				renderOptions.palette?.[key] || element.getAttribute(attribute);
			if (colour) {
				palette[key] = colour;
			}
		}
		const shape = renderOptions.shape || element.getAttribute("data-shape");
		const font = renderOptions.font || element.getAttribute("data-font");
		return {
			palette,
			shape: isShape(shape) ? shape : undefined,
			font: font || undefined,
		};
	}

	protected validateTheme(themeAttribute: string): "light" | "dark" {
		return this.themesSet.has(themeAttribute)
			? (themeAttribute as "light" | "dark")
			: this.defaultTheme;
	}
}

export { WidgetThemeResolver };
