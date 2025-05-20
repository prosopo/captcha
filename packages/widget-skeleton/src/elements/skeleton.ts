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

import {
	WIDGET_BORDER,
	WIDGET_BORDER_RADIUS,
	WIDGET_INNER_HEIGHT,
	WIDGET_MAX_WIDTH,
	WIDGET_MIN_HEIGHT,
	WIDGET_OUTER_HEIGHT,
	WIDGET_PADDING,
} from "../constants.js";
import type { Theme } from "../theme.js";
import { createCheckboxElement } from "./checkbox.js";
import { createLogoElement } from "./logo.js";

/**
 * Creates a widget skeleton element with theme styling
 *
 * @param theme - The theme to apply to the widget
 * @returns HTMLElement for the widget skeleton
 */
export function createWidgetSkeletonElement(theme: Theme): HTMLElement {
	const widgetElement = document.createElement("div");
	widgetElement.className = "widget";

	const checkboxElement = createCheckboxElement(theme);
	const logoElement = createLogoElement(theme);

	widgetElement.innerHTML =
		getWidgetStyles(theme) + getWidgetMarkup(isDevMode());

	widgetElement
		.querySelector(".widget__checkbox")
		?.replaceWith(checkboxElement);

	widgetElement.querySelector(".widget__logo")?.replaceWith(logoElement);

	return widgetElement;
}

/**
 * Generates the HTML markup for the widget
 *
 * @param isDevelopmentMode - Whether the app is in development mode
 */
function getWidgetMarkup(isDevelopmentMode: boolean): string {
	const buttonDataAttribute = isDevelopmentMode
		? 'data-cy="captcha-checkbox"'
		: "";

	return `
<div class="widget__outer">
	<div class="widget__wrapper">
		<div class="widget__inner">
			<div class="widget__dimensions" ${buttonDataAttribute}>
				<div class="widget__content">
					<div class="widget__checkbox"></div>
					<div class="widget__logo"></div>
				</div>
			</div>
		</div>
	</div>
</div>
`;
}

/**
 * Generates the CSS styles for the widget
 *
 * @param theme - The theme to apply to the styles
 */
function getWidgetStyles(theme: Theme): string {
	return `
<style>
.widget {
    width: 100%;
    min-height: ${WIDGET_MIN_HEIGHT}
}

.widget__outer {
    max-width: ${WIDGET_MAX_WIDTH};
    min-height: 100%;
    overflow-x: auto;
    width: 100%;
    font-family: ${theme.font.fontFamily};
    color: ${theme.font.color};
}

.widget__wrapper {
    container-type: size;
    container-name: widget;
    display: flex;
    flex-direction: column;
    height: ${WIDGET_OUTER_HEIGHT}px;
    min-width: 220px;
}

.widget__inner {
    max-height: 100%;
    min-width: 100%;
    overflow: hidden;
    height: ${WIDGET_OUTER_HEIGHT}px;
    width: 100%;
    display: grid;
}

.widget__dimensions {
    max-width: ${WIDGET_MAX_WIDTH};
    min-height: ${WIDGET_OUTER_HEIGHT}px;
}

.widget__content {
    padding: ${WIDGET_PADDING};
    border: ${WIDGET_BORDER};
    background-color: ${theme.palette.background.default};
    border-color: ${theme.palette.grey[300]};
    border-radius: ${WIDGET_BORDER_RADIUS};
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: space-between;
    min-height: ${WIDGET_INNER_HEIGHT}px;
    overflow: hidden;
}
</style>
`;
}

function getCurrentEnvironmentMode(): string | undefined {
	if (typeof process !== "undefined") {
		return process.env.NODE_ENV;
	}

	const importMeta = import.meta as { env?: { MODE?: string } };
	return importMeta.env?.MODE;
}

const isDevMode = () => getCurrentEnvironmentMode() !== "production";
