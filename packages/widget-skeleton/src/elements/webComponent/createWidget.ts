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

import { getCheckboxInteractiveArea } from "../checkbox.js";
import { createWidgetSkeletonElement } from "../skeleton.js";
import type { Theme } from "../../theme.js";
import { createWebComponent } from "./createWebComponent.js";
import { createShadowDomDetector, type ShadowDomDetector } from "../shadowDomDetector.js";

export interface CreateWidgetSkeletonOptions {
	/** The HTML element to attach the widget to */
	container: Element;
	/** The theme to apply to the widget */
	theme: Theme;
	/** The tag name for the web component */
	webComponentTag: string;
	/** Optional callback to trigger when automated Shadow DOM access is detected */
	onAutomatedAccess?: () => void;
	/** Optional callback for logging Shadow DOM interactions */
	onInteraction?: (type: 'click' | 'access' | 'attach', target: Element) => void;
	/** Whether to enable Shadow DOM detection (default: true) */
	enableShadowDomDetection?: boolean;
}

export interface WidgetSkeletonResult {
	/** The interactive area of the widget */
	interactiveArea: HTMLElement;
	/** The Shadow DOM detector instance (if enabled) */
	shadowDomDetector?: ShadowDomDetector;
}

/**
 * Creates a widget skeleton and attaches it to the provided container
 *
 * @param options - Configuration options for widget creation
 * @returns The widget result containing interactive area and optional detector
 */
export function createWidgetSkeleton(
	options: CreateWidgetSkeletonOptions,
): WidgetSkeletonResult;

/**
 * Creates a widget skeleton and attaches it to the provided container (legacy signature)
 *
 * @param container - The HTML element to attach the widget to
 * @param theme - The theme to apply to the widget
 * @param webComponentTag - The tag name for the web component
 * @returns The interactive area of the widget as an HTMLElement
 * @deprecated Use the options-based signature instead
 */
export function createWidgetSkeleton(
	container: Element,
	theme: Theme,
	webComponentTag: string,
): HTMLElement;

export function createWidgetSkeleton(
	containerOrOptions: Element | CreateWidgetSkeletonOptions,
	theme?: Theme,
	webComponentTag?: string,
): HTMLElement | WidgetSkeletonResult {
	// Handle both legacy and new function signatures
	const isLegacyCall = containerOrOptions instanceof Element;
	
	const options: CreateWidgetSkeletonOptions = isLegacyCall ? {
		container: containerOrOptions as Element,
		theme: theme!,
		webComponentTag: webComponentTag!,
		enableShadowDomDetection: true, // Default to enabled for legacy calls
	} : containerOrOptions as CreateWidgetSkeletonOptions;

	const {
		container,
		theme: widgetTheme,
		webComponentTag: componentTag,
		onAutomatedAccess,
		onInteraction,
		enableShadowDomDetection = true,
	} = options;

	// Create the widget components
	const widget = createWidgetSkeletonElement(widgetTheme);
	const webComponent = createWebComponent(componentTag);
	const webComponentRoot = getWebComponentRoot(webComponent);
	webComponentRoot.appendChild(widget);

	// Attach to container
	container.innerHTML = "";
	container.appendChild(webComponent);

	// Get the interactive area
	const widgetInteractiveArea = getCheckboxInteractiveArea(webComponent);

	if (!(widgetInteractiveArea instanceof HTMLElement)) {
		throw new Error("Fail to initialize widget: interactive area is not found");
	}

	// Create Shadow DOM detector if enabled
	let shadowDomDetector: ShadowDomDetector | undefined;
	
	if (enableShadowDomDetection) {
		const defaultOnAutomatedAccess = () => {
			console.warn('[Widget] Automated Shadow DOM access detected - potential bot activity');
			// Default behavior could be to trigger frictionless restart
			// This can be overridden by the onAutomatedAccess callback
		};

		const defaultOnInteraction = (type: 'click' | 'access' | 'attach', target: Element) => {
			console.log(`[Widget] Shadow DOM ${type} detected on:`, target);
		};

		shadowDomDetector = createShadowDomDetector({
			element: webComponent,
			onAutomatedAccess: onAutomatedAccess || defaultOnAutomatedAccess,
			onInteraction: onInteraction || defaultOnInteraction,
			targetTagName: componentTag,
		});

		// Start monitoring immediately
		shadowDomDetector.start();
	}

	// Return based on call signature
	if (isLegacyCall) {
		return widgetInteractiveArea;
	}

	return {
		interactiveArea: widgetInteractiveArea,
		shadowDomDetector,
	};
}

const getWebComponentRoot = (webComponent: HTMLElement) =>
	webComponent.shadowRoot || webComponent;
