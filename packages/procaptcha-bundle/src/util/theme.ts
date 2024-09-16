// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import type {
	ProcaptchaClientConfigInput,
	ProcaptchaRenderOptions,
} from "@prosopo/types";

/**
 * Set the theme for the captcha widget. The theme can be set to "light" or "dark".
 * If the theme is not set, it will default to "light"
 *
 * @param renderOptions
 * @param element
 * @param config
 */
export const setTheme = (
	renderOptions: ProcaptchaRenderOptions | undefined,
	element: Element,
	config: ProcaptchaClientConfigInput,
) => {
	const themeAttribute =
		renderOptions?.theme || element.getAttribute("data-theme") || "light";
	config.theme = validateTheme(themeAttribute);
};

const customThemeSet = new Set(["light", "dark"]);

const validateTheme = (themeAttribute: string): "light" | "dark" =>
	customThemeSet.has(themeAttribute)
		? (themeAttribute as "light" | "dark")
		: "light";
