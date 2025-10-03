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
                    <div class="checkbox__showcase">
                        <!-- Unchecked State -->
                        <div class="checkbox__item">
                            <svg class="checkbox__svg" viewBox="0 0 24 24" aria-label="Unchecked checkbox">
                                <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke-width="2" />
                            </svg>
                            <span class="checkbox__label">Unchecked</span>
                        </div>
                        
                        <!-- Checked State -->
                        <div class="checkbox__item">
                            <svg class="checkbox__svg" viewBox="0 0 24 24" aria-label="Checked checkbox">
                                <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke-width="2" />
                                <path d="M7 12 L10 15 L17 8" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                            <span class="checkbox__label">Checked</span>
                        </div>
                        
                        <!-- Spinner Option 1: Circle Dash -->
                        <div class="checkbox__item">
                            <svg class="spinner-1" viewBox="0 0 50 50" aria-label="Spinner 1">
                                <circle cx="25" cy="25" r="20" fill="none" stroke-width="4" stroke-linecap="round" />
                            </svg>
                            <span class="checkbox__label">Spinner 1</span>
                        </div>
                        
                        <!-- Spinner Option 2: Dots -->
                        <div class="checkbox__item">
                            <svg class="spinner-2" viewBox="0 0 50 50" aria-label="Spinner 2">
                                <circle cx="25" cy="10" r="4" />
                                <circle cx="25" cy="10" r="4" transform="rotate(45 25 25)" opacity="0.875" />
                                <circle cx="25" cy="10" r="4" transform="rotate(90 25 25)" opacity="0.75" />
                                <circle cx="25" cy="10" r="4" transform="rotate(135 25 25)" opacity="0.625" />
                                <circle cx="25" cy="10" r="4" transform="rotate(180 25 25)" opacity="0.5" />
                                <circle cx="25" cy="10" r="4" transform="rotate(225 25 25)" opacity="0.375" />
                                <circle cx="25" cy="10" r="4" transform="rotate(270 25 25)" opacity="0.25" />
                                <circle cx="25" cy="10" r="4" transform="rotate(315 25 25)" opacity="0.125" />
                            </svg>
                            <span class="checkbox__label">Spinner 2</span>
                        </div>
                        
                        <!-- Spinner Option 3: Arc -->
                        <div class="checkbox__item">
                            <svg class="spinner-3" viewBox="0 0 50 50" aria-label="Spinner 3">
                                <circle cx="25" cy="25" r="20" fill="none" stroke-width="4" stroke-linecap="round" stroke-dasharray="31.4 94.2" />
                            </svg>
                            <span class="checkbox__label">Spinner 3</span>
                        </div>
                        
                        <!-- Spinner Option 4: Double Ring -->
                        <div class="checkbox__item">
                            <svg class="spinner-4" viewBox="0 0 50 50" aria-label="Spinner 4">
                                <circle cx="25" cy="25" r="20" fill="none" stroke-width="3" stroke-linecap="round" stroke-dasharray="31.4 94.2" />
                                <circle cx="25" cy="25" r="15" fill="none" stroke-width="3" stroke-linecap="round" stroke-dasharray="23.5 70.5" />
                            </svg>
                            <span class="checkbox__label">Spinner 4</span>
                        </div>
                    </div>
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
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
}

.checkbox__showcase {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    padding: 10px;
    align-items: center;
    justify-content: center;
}

.checkbox__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.checkbox__label {
    font-size: 0.75em;
    color: ${theme.palette.background.contrastText};
    text-align: center;
}

/* Checkbox SVGs */
.checkbox__svg {
    width: 2.5em;
    height: 2.5em;
    display: block;
}

.checkbox__svg rect {
    stroke: ${theme.palette.background.contrastText};
}

.checkbox__svg path {
    stroke: ${theme.palette.background.contrastText};
}

/* Spinner 1: Circle Dash Animation */
.spinner-1 {
    width: 2.5em;
    height: 2.5em;
    display: block;
    animation: spinner-rotation 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.spinner-1 circle {
    stroke: ${theme.palette.background.contrastText};
    stroke-dasharray: 90, 150;
    stroke-dashoffset: 0;
    animation: spinner-dash 1.5s ease-in-out infinite;
}

/* Spinner 2: Rotating Dots */
.spinner-2 {
    width: 2.5em;
    height: 2.5em;
    display: block;
    animation: spinner-rotation 1.2s linear infinite;
}

.spinner-2 circle {
    fill: ${theme.palette.background.contrastText};
}

/* Spinner 3: Simple Arc */
.spinner-3 {
    width: 2.5em;
    height: 2.5em;
    display: block;
    animation: spinner-rotation 1s linear infinite;
}

.spinner-3 circle {
    stroke: ${theme.palette.background.contrastText};
}

/* Spinner 4: Double Ring */
.spinner-4 {
    width: 2.5em;
    height: 2.5em;
    display: block;
    animation: spinner-rotation 1.5s linear infinite;
}

.spinner-4 circle:first-child {
    stroke: ${theme.palette.background.contrastText};
    animation: spinner-rotation-reverse 2s linear infinite;
}

.spinner-4 circle:last-child {
    stroke: ${theme.palette.background.contrastText};
    opacity: 0.6;
}

/* Animations */
@keyframes spinner-rotation {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

@keyframes spinner-rotation-reverse {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(-360deg);
    }
}

@keyframes spinner-dash {
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
