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

import { WIDGET_MAX_WIDTH } from "../constants.js";
import { createStyleElement } from "../elements/style.js";

const FONT_FAMILY =
	'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

/**
 * Creates a web component with shadow DOM and basic styles
 *
 * @param webComponentTag - The tag name for the web component
 * @param customCss - Optional custom CSS to apply
 * @param nonce - The page's CSP nonce, for the component's stylesheets
 */
export function createWebComponent(
	webComponentTag: string,
	customCss = "",
	nonce?: string,
): HTMLElement {
	const webComponent = document.createElement(webComponentTag);
	applyDefaultStyles(webComponent);

	const shadowRoot = webComponent.attachShadow({ mode: "open" });
	shadowRoot.append(
		createStyleElement(`*{font-family: ${FONT_FAMILY};}`, nonce),
		createStyleElement(customCss, nonce),
	);

	return webComponent;
}

const applyDefaultStyles = (webComponent: HTMLElement) => {
	webComponent.style.display = "flex";
	webComponent.style.flexDirection = "column";
	webComponent.style.width = "100%";
	webComponent.style.maxWidth = WIDGET_MAX_WIDTH;
};

export { applyDefaultStyles };
