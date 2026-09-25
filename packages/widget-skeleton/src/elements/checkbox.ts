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
	randomInt,
	randomToken,
	randomTokens,
	randomWrapperTag,
} from "../obfuscation.js";
import type { Theme } from "../theme.js";

/**
 * The class on the element the widget markup swaps its placeholder for. It is
 * in the embedding page's light DOM, where a site's own CSS may target it, so
 * it stays fixed while everything behind the shadow boundary does not.
 */
export const CHECKBOX_HOST_CSS_CLASS = "prosopo-checkbox";

const MIN_WRAPPER_DEPTH = 2;
const MAX_WRAPPER_DEPTH = 5;

interface CheckboxNames {
	readonly content: string;
	readonly spinner: string;
	readonly spin: string;
	readonly wrappers: readonly string[];
}

/**
 * The checkbox host, and the node inside its shadow root that the captcha is
 * mounted into.
 *
 * The interactive area is handed back directly rather than looked up again by
 * class, which is what lets the classes be per-render: a selector written here
 * would be a selector an attacker could write too.
 */
export interface CheckboxElement {
	readonly host: HTMLElement;
	readonly interactiveArea: HTMLElement;
}

export const DEFAULT_LOADING_LABEL = "Loading";

export function createCheckboxElement(
	theme: Theme,
	loadingLabel: string = DEFAULT_LOADING_LABEL,
): CheckboxElement {
	const names: CheckboxNames = {
		content: randomToken(),
		spinner: randomToken(),
		spin: randomToken(),
		wrappers: randomTokens(randomInt(MIN_WRAPPER_DEPTH, MAX_WRAPPER_DEPTH)),
	};

	const host = document.createElement("div");
	host.className = CHECKBOX_HOST_CSS_CLASS;

	const style = document.createElement("style");
	style.textContent = getCheckboxStyles(theme, names);

	const interactiveArea = document.createElement(randomWrapperTag());
	interactiveArea.className = names.content;
	interactiveArea.appendChild(createSpinner(names.spinner, loadingLabel));

	const shadowRoot = host.attachShadow({ mode: "open" });
	shadowRoot.appendChild(style);
	shadowRoot.appendChild(wrap(interactiveArea, names.wrappers));

	return { host, interactiveArea };
}

const createSpinner = (className: string, label: string): HTMLElement => {
	const spinner = document.createElement("div");
	spinner.className = className;
	spinner.setAttribute("role", "progressbar");
	spinner.setAttribute("aria-label", label);
	return spinner;
};

const wrap = (
	innermost: HTMLElement,
	classNames: readonly string[],
): HTMLElement =>
	classNames.reduce((child: HTMLElement, className: string) => {
		const wrapper = document.createElement(randomWrapperTag());
		wrapper.className = className;
		wrapper.appendChild(child);
		return wrapper;
	}, innermost);

/**
 * Every wrapper gets the same centring rules under a different name, so the
 * layout no longer depends on how many of them the current render produced.
 */
const getCheckboxStyles = (theme: Theme, names: CheckboxNames): string => `
:host {
    display: flex;
    flex-direction: column;
}

${names.wrappers
	.map(
		(className: string) => `.${className} {
    align-items: center;
    justify-content: center;
    flex: 0 1 auto !important;
    width: auto !important;
    display: flex !important;
}`,
	)
	.join("\n\n")}

.${names.content} {
    display: inline-flex;
}

.${names.spinner} {
    margin-top: 0;
    margin-left: 15px !important;
    margin-right: 15px !important;
    width: 28px !important;
    height: 28px !important;
    border: 4px solid ${theme.palette.border};
    border-bottom-color: ${theme.palette.primary.main};
    border-radius: 50%;
    display: inherit;
    box-sizing: border-box;
    animation: ${names.spin} 1s linear infinite;
    will-change: transform;
}

@keyframes ${names.spin} {
  0% {
	transform: rotate(0deg);
  }
  100% {
	transform: rotate(360deg);
  }
}
`;
