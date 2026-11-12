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

import { WIDGET_LINK_PATH, WIDGET_URL } from "../constants.js";
import type { Theme } from "../theme.js";

/** What the logo link tells the page about the widget the visitor clicked. */
export interface WidgetLinkContext {
	/** The site's chosen widget language, else the browser's. */
	readonly language?: string;
	readonly siteKey?: string;
}

/**
 * The logo's destination, told which site the visitor came from, which site
 * key it uses and which language they were reading. The page is for the
 * person who was shown the widget, not for someone shopping for a captcha.
 */
export function widgetLinkUrl(
	host: string,
	{ language, siteKey }: WidgetLinkContext = {},
): string {
	const url = new URL(WIDGET_LINK_PATH, WIDGET_URL);
	if (host) {
		url.searchParams.set("ref", host);
	}
	if (siteKey) {
		url.searchParams.set("utm_campaign", siteKey);
	}
	url.searchParams.set("utm_medium", "checkbox");
	if (language) {
		url.searchParams.set("hl", language);
	}
	return url.href;
}

/**
 * Creates a logo element with appropriate styling
 * @param theme - The theme to apply to the logo
 * @param link - What the logo link tells the page it opens
 * @returns An HTMLElement representing the logo
 */
export function createLogoElement(
	theme: Theme,
	link: WidgetLinkContext = {},
): HTMLElement {
	const widgetLogo = document.createElement("div");
	widgetLogo.className = "prosopo-logo-container";
	widgetLogo.innerHTML = LOGO_STYLES + getLogoMarkup(theme);
	widgetLogo.querySelector("a")?.setAttribute(
		"href",
		widgetLinkUrl(window.location.hostname, {
			...link,
			language: link.language ?? navigator.language,
		}),
	);
	return widgetLogo;
}

const LOGO_STYLES = `
<style>
.prosopo-logo-container {
    display: flex !important;
    width: auto !important;
    flex-shrink: 0 !important;
    align-items: center !important;
    justify-content: center !important;
    margin-inline-start: auto !important;
}

.prosopo-logo-container a {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    text-decoration: none !important;
    gap: 2px !important;
    padding: 0 8px !important;
}

.prosopo-logo-text {
    all: unset;
    display: block !important;
    font-size: 9px !important;
    font-weight: bold !important;
    font-family: Helvetica Neue, Helvetica, Arial, sans-serif !important;
    line-height: 1 !important;
    text-align: center !important;
}

#prosopo-logo {
    width: 28px !important;
    height: 28px !important;
    display: block !important;
}
</style>
`;

/**
 * Generates the HTML markup for the logo
 * @param theme - The theme to apply to the logo
 */
function getLogoMarkup(theme: Theme): string {
	return `
<a href="${WIDGET_URL}${WIDGET_LINK_PATH}" target="_blank" rel="noopener" style="color: ${theme.palette.logoFill};">
    <svg id="prosopo-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 49.010001 49.009997" style="fill: ${theme.palette.logoFill};" aria-hidden="true">
        <g transform="matrix(0.11319331,0,0,0.11319331,6.504999,-2.2052113e-4)">
            <g>
                <path d="m 119.79,50.5 a 147.75,147.75 0 0 1 147.75,147.75 h 50.5 C 318.04,88.76 229.28,0 119.79,0 Z"></path>
                <path d="m 53.6,116.7 a 147.74,147.74 0 0 1 147.74,147.74 h 50.5 C 251.84,154.95 163.09,66.2 53.6,66.2 Z"></path>
                <path d="M 198.24,382.48 A 147.75,147.75 0 0 1 50.5,234.74 H 0 c 0,109.49 88.75,198.24 198.24,198.24 z"></path>
                <path d="M 264.41,316.31 A 147.74,147.74 0 0 1 116.67,168.56 H 66.16 c 0,109.49 88.76,198.25 198.25,198.25 z"></path>
            </g>
        </g>
    </svg>
    <span class="prosopo-logo-text">Prosopo</span>
</a>
`;
}
