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

import { getWindowCallback } from "@prosopo/procaptcha-common";
import type { ProcaptchaRenderOptions } from "@prosopo/types";
import { at } from "@prosopo/util";
import { getWidgetSkeleton } from "@prosopo/widget-skeleton";
import type { Root } from "react-dom/client";
import { getCaptchaType } from "./util/captcha/captchaType.js";
import { extractParams, getProcaptchaScript } from "./util/config.js";
import { WidgetFactory } from "./util/widgetFactory.js";
import { WidgetThemeResolver } from "./util/widgetThemeResolver.js";

const BUNDLE_NAME = "procaptcha.bundle.js";
let procaptchaRoots: Root[] = [];

const widgetFactory = new WidgetFactory(
	getWidgetSkeleton().getFactory(),
	new WidgetThemeResolver(),
);

// Define a custom event name for procaptcha execution
const PROCAPTCHA_EXECUTE_EVENT = 'procaptcha:execute';

// Implicit render for targeting all elements with class 'procaptcha'
const implicitRender = async () => {
	// Get elements with class 'procaptcha'
	const elements: Element[] = Array.from(
		document.getElementsByClassName("procaptcha"),
	);

	// Set siteKey from renderOptions or from the first element's data-sitekey attribute
	if (elements.length) {
		const siteKey = at(elements, 0).getAttribute("data-sitekey");
		const web3 = at(elements, 0).getAttribute("data-web3");
		if (!siteKey) {
			console.error("No siteKey found");
			return;
		}

		const captchaType = getCaptchaType(elements);

		const root = await widgetFactory.createWidgets(
			elements,
			{
				captchaType: captchaType,
				siteKey: siteKey,
			},
			!(web3 === "true"),
		);

		procaptchaRoots.push(...root);
	}

	// NEW: Check for invisible mode indicators (p-procaptcha class on buttons)
	const invisibleButtons = Array.from(
		document.getElementsByClassName("p-procaptcha"),
	);

	if (invisibleButtons.length) {
		// Found buttons with p-procaptcha class - this would be invisible mode
		console.log("Invisible Procaptcha mode detected (implicit rendering)");

		// Process each invisible button
		invisibleButtons.forEach((button) => {
			const siteKey = button.getAttribute("data-sitekey");
			const callback = button.getAttribute("data-callback");

			if (!siteKey) {
				console.error("No siteKey found for invisible button");
				return;
			}

			// Add click event listener to the button
			button.addEventListener("click", (event) => {
				// Prevent default button action temporarily
				event.preventDefault();

				// Show alert for MVP
				alert("Invisible Procaptcha verification would happen here!");

				// If a callback is specified, try to call it
				if (callback) {
					try {
						const callbackFn = getWindowCallback(callback);
						if (typeof callbackFn === "function") {
							// In a real implementation, we would pass the token here
							callbackFn("sample-token-for-testing");
						}
					} catch (error) {
						console.error("Error calling callback:", error);
					}
				}

				// Log for debugging
				console.log(
					`Invisible Procaptcha button clicked. SiteKey: ${siteKey}, Callback: ${callback}`,
				);
			});

			console.log(
				`Initialized invisible Procaptcha on button with siteKey: ${siteKey}`,
			);
		});
	}
};

// Explicit render for targeting specific elements
export const render = async (
	element: Element,
	renderOptions: ProcaptchaRenderOptions,
) => {
	// Check if this is an invisible mode request
	// Use a type-safe way to check for the 'size' property
	const hasInvisibleSize =
		Object.prototype.hasOwnProperty.call(renderOptions, "size") &&
		(renderOptions as any).size === "invisible";

	if (hasInvisibleSize || element.tagName.toLowerCase() === "button") {
		const roots = await widgetFactory.createWidgets(
			[element],
			renderOptions,
			true,
			true,
		);
		procaptchaRoots.push(...roots);
		return;
	}

	const roots = await widgetFactory.createWidgets([element], renderOptions);

	procaptchaRoots.push(...roots);
};

export default function ready(fn: () => void) {
	if (document && document.readyState !== "loading") {
		console.log("document.readyState ready!");
		fn();
	} else {
		console.log("DOMContentLoaded listener!");
		document.addEventListener("DOMContentLoaded", fn);
	}
}

// Add execute method for invisible mode
export const execute = () => {
	console.log("Procaptcha execute() method called");
	
	// Find all potential Procaptcha containers
	const containers = findProcaptchaContainers();
	
	if (containers.length === 0) {
		console.error("No Procaptcha containers found for execution");
		return;
	}
	
	// Log the containers and their elements - but avoid circular reference issues
	containers.forEach((container, index) => {
		console.log(`Found Procaptcha container ${index + 1}:`, container);
		
		// Safely log container attributes
		const containerAttrs = getElementAttributes(container);
		console.log(`Container ${index + 1} attributes:`, containerAttrs);
		
		// Log child elements
		const children = Array.from(container.children);
		console.log(`Container ${index + 1} has ${children.length} child elements`);
		
		// Log each child element safely
		children.forEach((child, childIndex) => {
			console.log(`Child ${childIndex + 1} of container ${index + 1}:`, child);
			
			// Safely log child attributes
			const childAttrs = getElementAttributes(child);
			console.log(`Child ${childIndex + 1} attributes:`, childAttrs);
		});
	});
	
	// Dispatch a custom event to notify React components to show the modal or perform silent verification
	const executeEvent = new CustomEvent(PROCAPTCHA_EXECUTE_EVENT, {
		detail: {
			containerId: containers[0]?.id || 'procaptcha-container', // Use optional chaining to avoid undefined error
			containerCount: containers.length,
			timestamp: Date.now()
		},
		bubbles: true,
		cancelable: true
	});
	
	// Dispatch the event on the document
	document.dispatchEvent(executeEvent);
	console.log(`Dispatched "${PROCAPTCHA_EXECUTE_EVENT}" event to trigger verification`);
	console.log(`This will either:
- Show a CAPTCHA modal for regular image verification
- Silently perform Proof of Work verification if in PoW mode
- Do nothing if no appropriate handler is registered`);
	
	// In a real implementation, we would:
	// 1. Perform verification on the found container
	// 2. Call the callback with the token
};

// Helper function to find all potential Procaptcha containers
function findProcaptchaContainers(): Element[] {
	const containers: Element[] = [];
	
	// Strategy 1: Look for elements with data-size="invisible"
	const invisibleContainers = Array.from(
		document.querySelectorAll('[data-size="invisible"]')
	);
	containers.push(...invisibleContainers);
	
	// Strategy 2: Look for elements with specific IDs
	const idContainers = Array.from(
		document.querySelectorAll('#procaptcha-container, [id$="-procaptcha-container"]')
	);
	
	// Add only unique elements
	idContainers.forEach(container => {
		if (!containers.includes(container)) {
			containers.push(container);
		}
	});
	
	return containers;
}

// Helper function to get all attributes of an element
function getElementAttributes(element: Element): Record<string, string> {
	const attributes: Record<string, string> = {};
	
	if (element && element.attributes) {
		for (let i = 0; i < element.attributes.length; i++) {
			const attr = element.attributes[i];
			if (attr && attr.name && attr.value !== undefined) {
				attributes[attr.name] = attr.value;
			}
		}
	}
	
	return attributes;
}

// extend the global Window interface to include the procaptcha object
declare global {
	interface Window {
		procaptcha: {
			ready: typeof ready;
			render: typeof render;
			reset: typeof reset;
			execute: typeof execute;
		};
	}
}

const start = () => {
	// onLoadUrlCallback defines the name of the callback function to be called when the script is loaded
	// onRenderExplicit takes values of either explicit or implicit
	const { onloadUrlCallback, renderExplicit } = extractParams(BUNDLE_NAME);

	// Render the Procaptcha component implicitly if renderExplicit is not set to explicit
	if (renderExplicit !== "explicit") {
		ready(implicitRender);
	}

	if (onloadUrlCallback) {
		const onloadCallback = getWindowCallback(onloadUrlCallback);
		let readyCalled = false;
		// Add event listener to the script tag to call the callback function when the script is loaded
		getProcaptchaScript(BUNDLE_NAME)?.addEventListener("load", () => {
			ready(onloadCallback);
			readyCalled = true;
		});
		// or if the document has already loaded, call the callback function
		if (document.readyState === "complete" && !readyCalled) {
			ready(onloadCallback);
		}
	}
};

export const reset = () => {
	for (const root of procaptchaRoots) {
		root.unmount();
	}
	procaptchaRoots = [];

	start();
};

// set the procaptcha attribute on the window
window.procaptcha = { ready, render, reset, execute };

start();

