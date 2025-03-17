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
		document.getElementsByClassName("p-procaptcha")
	);
	
	if (invisibleButtons.length) {
		// Found buttons with p-procaptcha class - this would be invisible mode
		console.log("Invisible Procaptcha mode detected (implicit rendering)");
		
		// Process each invisible button
		invisibleButtons.forEach(button => {
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
				console.log(`Invisible Procaptcha button clicked. SiteKey: ${siteKey}, Callback: ${callback}`);
			});
			
			console.log(`Initialized invisible Procaptcha on button with siteKey: ${siteKey}`);
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
	const hasInvisibleSize = Object.prototype.hasOwnProperty.call(renderOptions, 'size') && 
		(renderOptions as any).size === 'invisible';
	
	if (hasInvisibleSize || element.tagName.toLowerCase() === 'button') {
		console.log("Invisible Procaptcha mode detected (explicit rendering)");
		
		// For MVP, just show an alert and attach a click handler if it's a button
		if (element.tagName.toLowerCase() === 'button') {
			element.addEventListener("click", (event) => {
				event.preventDefault();
				alert("Invisible Procaptcha verification would happen here (explicit rendering)!");
				
				// If a callback is specified, try to call it
				if (renderOptions.callback) {
					try {
						if (typeof renderOptions.callback === "function") {
							// In a real implementation, we would pass the token here
							renderOptions.callback("sample-token-for-testing");
						} else if (typeof renderOptions.callback === "string") {
							const callbackFn = getWindowCallback(renderOptions.callback);
							if (typeof callbackFn === "function") {
								callbackFn("sample-token-for-testing");
							}
						}
					} catch (error) {
						console.error("Error calling callback:", error);
					}
				}
			});
		} else {
			// If it's not a button but has size='invisible', it's for programmatic execution
			console.log("Initialized invisible Procaptcha container for programmatic execution");
		}
		
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
	alert("Procaptcha execute() method called. Invisible verification would happen here!");
	
	// In a real implementation, we would:
	// 1. Find the invisible Procaptcha container
	// 2. Perform verification
	// 3. Call the callback with the token
};

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
