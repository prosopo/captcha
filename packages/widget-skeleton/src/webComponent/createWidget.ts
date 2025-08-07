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

import { getCheckboxInteractiveArea } from "../elements/checkbox.js";
import { createWidgetSkeletonElement } from "../elements/skeleton.js";
import type { Theme } from "../theme.js";
import { createWebComponent } from "./createWebComponent.js";

/**
 * Creates a widget skeleton and attaches it to the provided container
 *
 * @param container - The HTML element to attach the widget to
 * @param theme - The theme to apply to the widget
 * @param webComponentTag - The tag name for the web component
 * @returns The interactive area of the widget as an HTMLElement
 */
export function createWidgetSkeleton(
	container: Element,
	theme: Theme,
	webComponentTag: string,
): {widgetInteractiveArea: HTMLElement, webComponent: HTMLElement} {
	const widget = createWidgetSkeletonElement(theme);
	const webComponent = createWebComponent(webComponentTag);
	const webComponentRoot = getWebComponentRoot(webComponent);
	webComponentRoot.appendChild(widget);

	container.innerHTML = "";
	container.appendChild(webComponent);

	const widgetInteractiveArea = getCheckboxInteractiveArea(webComponent);

	if (!(widgetInteractiveArea instanceof HTMLElement)) {
		throw new Error("Fail to initialize widget: interactive area is not found");
	}

	return {widgetInteractiveArea, webComponent};
}

const getWebComponentRoot = (webComponent: HTMLElement) =>
	webComponent.shadowRoot || webComponent;
