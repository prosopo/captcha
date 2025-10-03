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

import { WIDGET_CHECKBOX_SPINNER_CSS_CLASS } from "../constants.js";
import type { Theme } from "../theme.js";

/**
 * Creates a checkbox element with appropriate styling
 * @param theme - The theme to apply to the checkbox
 * @returns An HTMLElement representing the checkbox
 */
export function createCheckboxElement(theme: Theme): HTMLElement {
	const checkbox = document.createElement("div");
	checkbox.className = "checkbox";
	checkbox.innerHTML = getCheckboxStyles(theme) + CHECKBOX_MARKUP;
	return checkbox;
}

/**
 * Finds the interactive area within a widget element
 * @param widget - The widget element to search within
 * @returns The interactive area element or null if not found
 */
export const getCheckboxInteractiveArea = (
	widget: HTMLElement,
): HTMLElement | null => {
	const widgetRoot = widget.shadowRoot || widget;
	return widgetRoot.querySelector(".checkbox__content");
};

export const CHECKBOX_MARKUP = `
    <div class="checkbox__outer">
        <div class="checkbox__wrapper">
            <div class="checkbox__inner">
                <div class="checkbox__content">
                    <svg class="${WIDGET_CHECKBOX_SPINNER_CSS_CLASS}" viewBox="0 0 50 50" aria-label="Loading spinner">
                        <circle cx="25" cy="25" r="20" fill="none" stroke-width="4" stroke-linecap="round" />
                    </svg>
                </div>
            </div>
        </div>
    </div>
`;

/**
 * Generates the CSS styles for the checkbox
 * @param theme - The theme to apply to the styles
 */
const getCheckboxStyles = (theme: Theme): string => `
<style>
.checkbox {
    display: flex;
    flex-direction: column;
}

.checkbox__outer {
    align-items: center;
    flex: 1;
}

.checkbox__wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    vertical-align: middle;
}

.checkbox__inner {
    display: flex;
}

.checkbox__content {
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.${WIDGET_CHECKBOX_SPINNER_CSS_CLASS} {
    width: 2.5em;
    height: 2.5em;
    margin: 0 12px;
    display: block;
    animation: checkbox__loading-spinner-rotation 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    will-change: transform;
}

.${WIDGET_CHECKBOX_SPINNER_CSS_CLASS} circle {
    stroke: ${theme.palette.background.contrastText};
    stroke-dasharray: 90, 150;
    stroke-dashoffset: 0;
    animation: checkbox__loading-spinner-dash 1.5s ease-in-out infinite;
}

@keyframes checkbox__loading-spinner-rotation {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

@keyframes checkbox__loading-spinner-dash {
    0% {
        stroke-dasharray: 1, 150;
        stroke-dashoffset: 0;
    }
    50% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -35;
    }
    100% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -124;
    }
}
</style>
`;
