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

import { WIDGET_URL, WIDGET_URL_TEXT } from "../constants.js";
import type { Theme } from "../theme.js";

/**
 * Creates a logo element with appropriate styling
 * @param theme - The theme to apply to the logo
 * @returns An HTMLElement representing the logo
 */
export function createLogoElement(theme: Theme): HTMLElement {
	const widgetLogo = document.createElement("div");
	widgetLogo.className = "logo";
	widgetLogo.innerHTML = LOGO_STYLES + getLogoMarkup(theme);
	return widgetLogo;
}

const LOGO_STYLES = `
<style>
.logo {
    display: inline-flex;
    flex-direction: column;
}

.prosopo-logo {
    padding: 8px;
    flex: 1 1 0;
    text-align: center;
    width: 36px;
    height: 36px;
}

.prosopo-logo-text {
	font-size: 9px;
	text-align: center;
	display: flex;
	font-weight: bold;
	font-family: Helvetica Neue,Helvetica,Arial,sans-serif !important;
	vertical-align: top;
	margin-top: -4px;
}

#logo {
    width: 28px;
    height: 28px;
}

</style>
`;

/**
 * Generates the HTML markup for the logo
 * @param theme - The theme to apply to the logo
 */
function getLogoMarkup(theme: Theme): string {
	return `
			<a href="${WIDGET_URL}?utm_campaign=widget" tabindex="0" target="_blank" role="button"
			   aria-label="${WIDGET_URL_TEXT}"
			   style="text-decoration: none;">
				<div class="prosopo-logo">
					<svg id="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 49.010001 49.009997" style="fill: ${theme.palette.logoFill};"
						 aria-label="Prosopo Logo With Text">
						<title>${WIDGET_URL_TEXT}</title>
						<g transform="matrix(0.11319331,0,0,0.11319331,6.504999,-2.2052113e-4)">
							<g>
								<path d="m 119.79,50.5 a 147.75,147.75 0 0 1 147.75,147.75 h 50.5 C 318.04,88.76 229.28,0 119.79,0 Z"></path>
								<path d="m 53.6,116.7 a 147.74,147.74 0 0 1 147.74,147.74 h 50.5 C 251.84,154.95 163.09,66.2 53.6,66.2 Z"></path>
								<path d="M 198.24,382.48 A 147.75,147.75 0 0 1 50.5,234.74 H 0 c 0,109.49 88.75,198.24 198.24,198.24 z"></path>
								<path d="M 264.41,316.31 A 147.74,147.74 0 0 1 116.67,168.56 H 66.16 c 0,109.49 88.76,198.25 198.25,198.25 z"></path>
							</g>
						</g>
					</svg>
					<span class="prosopo-logo-text" id="logo-text" style="color: ${theme.palette.logoFill};">
					Prosopo
					</span>
				</div>
			</a>
`;
}
