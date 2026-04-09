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

import { WIDGET_CHECKBOX_SPINNER_CSS_CLASS } from "../constants.js";
import type { Theme } from "../theme.js";

/**
 * Creates a checkbox element with appropriate styling
 * @param theme - The theme to apply to the checkbox
 * @returns An HTMLElement representing the checkbox
 */
export function createCheckboxElement(theme: Theme): HTMLElement {
	const checkbox = document.createElement("div");
	checkbox.className = "prosopo-checkbox";

	const shadowRoot = checkbox.attachShadow({ mode: "open" });
	shadowRoot.innerHTML = getCheckboxStyles(theme) + CHECKBOX_MARKUP;

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
	const checkbox = widgetRoot.querySelector(".prosopo-checkbox") as HTMLElement | null;
	if (!checkbox) {
		return null;
	}
	const checkboxRoot = (checkbox as HTMLElement).shadowRoot || checkbox;
	return checkboxRoot.querySelector(".prosopo-checkbox__content");
};

export const CHECKBOX_MARKUP = `
    <div class="prosopo-checkbox__outer">
        <div class="prosopo-checkbox__wrapper">
            <div class="prosopo-checkbox__inner">
                <div class="prosopo-checkbox__content">
                    <div class="${WIDGET_CHECKBOX_SPINNER_CSS_CLASS}" aria-label="Loading spinner"></div>
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
:host(.prosopo-checkbox) {
    display: flex;
    flex-direction: column;
}

.prosopo-checkbox__outer {
    align-items: center;
    flex: 1;
}

.prosopo-checkbox__wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    vertical-align: middle;
}

.prosopo-checkbox__inner {
    display: flex;
}

.prosopo-checkbox__content {
    display: inline-flex;
}

.${WIDGET_CHECKBOX_SPINNER_CSS_CLASS} {
    margin-top: 0;
    margin-left: 15px !important;
    margin-right: 15px !important;
    width: 28px !important;
    height: 28px !important;
    border: 4px solid ${theme.palette.background.contrastText};
    border-bottom-color: transparent;
    border-radius: 50%;
    display: inherit;
    box-sizing: border-box;
    animation: ${WIDGET_CHECKBOX_SPINNER_CSS_CLASS}-rotation 1s linear infinite;
    will-change: transform;
}

@keyframes ${WIDGET_CHECKBOX_SPINNER_CSS_CLASS}-rotation {
  0% {
	transform: rotate(0deg);
  }
  100% {
	transform: rotate(360deg);
  }
}
</style>
`;
