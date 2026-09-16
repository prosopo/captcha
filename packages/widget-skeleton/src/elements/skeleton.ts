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
	WIDGET_BORDER,
	WIDGET_BORDER_RADIUS,
	WIDGET_INNER_HEIGHT,
	WIDGET_MAX_WIDTH,
	WIDGET_MIN_HEIGHT,
	WIDGET_OUTER_HEIGHT,
	WIDGET_PADDING,
} from "../constants.js";
import { type Theme, withAlpha } from "../theme.js";
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
	widgetElement.className = "prosopo-widget";

	const checkboxElement = createCheckboxElement(theme);
	const logoElement = createLogoElement(theme);

	widgetElement.innerHTML =
		getWidgetStyles(theme) + getWidgetMarkup(isDevMode());

	replacePlaceholder(
		widgetElement,
		".prosopo-widget__checkbox",
		checkboxElement,
	);
	replacePlaceholder(widgetElement, ".prosopo-widget__logo", logoElement);

	return widgetElement;
}

/**
 * Swaps a placeholder in the rendered markup for a real element.
 *
 * Throws when the placeholder is absent. It used to be an optional chain, so
 * editing a class name in `getWidgetMarkup` without editing the selector here
 * produced a widget missing its checkbox or its logo — with no error, and
 * `createWidgetSkeleton` reporting only the missing interactive area.
 */
export function replacePlaceholder(
	root: HTMLElement,
	selector: string,
	replacement: HTMLElement,
): void {
	const placeholder = root.querySelector(selector);
	if (placeholder === null) {
		throw new Error(`widget skeleton has no ${selector} placeholder`);
	}
	placeholder.replaceWith(replacement);
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
<div class="prosopo-widget__outer">
	<div class="prosopo-widget__wrapper">
		<div class="prosopo-widget__inner">
			<div class="prosopo-widget__dimensions" ${buttonDataAttribute}>
				<div class="prosopo-widget__content">
					<div class="prosopo-widget__checkbox"></div>
					<div class="prosopo-widget__logo"></div>
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
.prosopo-widget {
    width: 100%;
    min-height: ${WIDGET_MIN_HEIGHT}
}

.prosopo-widget::after,
.prosopo-widget a::before,
.prosopo-widget a::after {
  content: none !important;
  display: none !important;
}

.prosopo-widget__outer {
    max-width: ${WIDGET_MAX_WIDTH};
    min-height: 100%;
    overflow-x: auto;
    width: 100%;
    font-family: ${theme.font.fontFamily};
    color: ${theme.font.color};
    -ms-overflow-style: none;
    scrollbar-width: none;
}

.prosopo-widget__outer::-webkit-scrollbar {
    display: none;
}

.prosopo-widget__wrapper {
    container-type: size;
    container-name: prosopo-widget;
    display: flex;
    flex-direction: column;
    height: ${WIDGET_OUTER_HEIGHT}px;
    min-width: 170px;
}

.prosopo-widget__inner {
    max-height: 100%;
    min-width: 100%;
    overflow: hidden;
    height: ${WIDGET_OUTER_HEIGHT}px;
    width: 100%;
    display: grid;
}

.prosopo-widget__dimensions {
    max-width: ${WIDGET_MAX_WIDTH};
    min-height: ${WIDGET_OUTER_HEIGHT}px;
}

.prosopo-widget__content {
    padding: ${WIDGET_PADDING};
    border: ${WIDGET_BORDER};
    background-color: ${theme.palette.surface};
    border-color: ${theme.palette.border};
    border-radius: ${WIDGET_BORDER_RADIUS};
    transition: background-image 0.15s ease, border-color 0.15s ease;
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    align-items: center !important;
    justify-content: space-between !important;
    width: 100% !important;
    box-sizing: border-box;
    min-height: ${WIDGET_INNER_HEIGHT}px;
    height: 100%;
    direction: ltr !important;
}

/* Shadowless hover: an M3 state layer (onSurface at 8%) laid over the surface
   as a gradient overlay, so the background-color token stays untouched. */
.prosopo-widget__content:hover {
    background-image: linear-gradient(
        ${withAlpha(theme.palette.onSurface, theme.stateLayer.hover)},
        ${withAlpha(theme.palette.onSurface, theme.stateLayer.hover)}
    );
}
</style>
`;
}

/**
 * Where the build mode can be read from.
 *
 * `process` is absent in a browser bundle that was not shimmed, and
 * `import.meta.env` is absent under plain node, so both are optional and both
 * have to be tried.
 */
export interface EnvironmentSources {
	nodeEnv: string | undefined;
	bundlerMode: string | undefined;
}

/**
 * Read both sources without assuming either exists.
 *
 * `import.meta.env` is rewritten to a literal by the bundler, so it is read
 * through a guard rather than a bare access: under a runtime that leaves the
 * expression in place it is simply undefined.
 */
export const readEnvironmentSources = (): EnvironmentSources => {
	return {
		nodeEnv: typeof process === "undefined" ? undefined : process.env.NODE_ENV,
		bundlerMode: readBundlerMode(),
	};
};

const readBundlerMode = (): string | undefined => {
	try {
		const importMeta: ImportMeta & { env?: { MODE?: string } } = import.meta;
		return importMeta.env?.MODE;
	} catch {
		// Bundlers substitute `import.meta.env` for an expression of their own,
		// and some of those read a `process` that a browser build does not have.
		// The mode is a nicety; failing to read it must not stop the widget
		// rendering.
		return undefined;
	}
};

/** The build mode, preferring node's environment over the bundler's. */
export function getCurrentEnvironmentMode(
	sources: EnvironmentSources = readEnvironmentSources(),
): string | undefined {
	return sources.nodeEnv ?? sources.bundlerMode;
}

// Anything other than an explicit "production" counts as development, so an
// unset mode leaves the test hooks in the markup rather than dropping them.
export const isDevMode = (
	sources: EnvironmentSources = readEnvironmentSources(),
): boolean => getCurrentEnvironmentMode(sources) !== "production";
