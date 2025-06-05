// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import type { Root } from "react-dom/client";
import { getCaptchaType } from "./util/captcha/captchaType.js";
import { extractParams, getProcaptchaScript } from "./util/config.js";
import { WidgetFactory } from "./util/widgetFactory.js";
import { WidgetThemeResolver } from "./util/widgetThemeResolver.js";

const BUNDLE_NAME = "procaptcha.bundle.js";
let procaptchaRoots: Root[] = [];

const widgetFactory = new WidgetFactory(new WidgetThemeResolver());

// Define a custom event name for procaptcha execution
const PROCAPTCHA_EXECUTE_EVENT = "procaptcha:execute";

// Implicit render for targeting all elements with class 'procaptcha'
const implicitRender = async () => {
	// Get elements with class 'procaptcha', not including buttons
	const elements: Element[] = Array.from(
		document.getElementsByClassName("procaptcha"),
	).filter((element) => element.tagName.toLowerCase() !== "button");

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

	// Check for invisible mode indicators (procaptcha class on buttons)
	const invisibleButtons = Array.from(
		document.getElementsByClassName("procaptcha"),
	).filter((button) => button.tagName.toLowerCase() === "button");

	if (invisibleButtons.length) {
		for (const button of invisibleButtons) {
			const siteKey = button.getAttribute("data-sitekey") || "";
			const callback = button.getAttribute("data-callback") || "";

			const captchaType = getCaptchaType([button]);

			const root = await widgetFactory.createWidgets(
				[button],
				{
					captchaType: captchaType,
					siteKey: siteKey,
					callback: callback,
				},
				true,
				true,
			);

			procaptchaRoots.push(...root);

			// Add click event listener to the button
			button.addEventListener("click", async (event) => {
				event.preventDefault();
				execute();
			});
		}
	}
};

// Explicit render for targeting specific elements
export const render = async (
	element: Element,
	renderOptions: ProcaptchaRenderOptions,
) => {
	const hasInvisibleSize =
		Object.prototype.hasOwnProperty.call(renderOptions, "size") &&
		renderOptions.size === "invisible";

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
		document.addEventListener("DOMContentLoaded", () => {
			console.log("DOMContentLoaded fired");
			console.log(window);
			fn();
		});
	}
}

export const execute = () => {
	const containers = findProcaptchaContainers();

	if (containers.length === 0) {
		console.error("No Procaptcha containers found for execution");
		return;
	}

	// Dispatch a custom event to notify React components to show the modal or perform silent verification
	const executeEvent = new CustomEvent(PROCAPTCHA_EXECUTE_EVENT, {
		detail: {
			containerId: containers[0]?.id || "procaptcha-container",
			containerCount: containers.length,
			timestamp: Date.now(),
		},
		bubbles: true,
		cancelable: true,
	});

	// Dispatch the event on the document
	document.dispatchEvent(executeEvent);
};

function findProcaptchaContainers(): Element[] {
	const containers: Element[] = [];

	// Strategy 1: Look for elements with data-size="invisible"
	const invisibleContainers = Array.from(
		document.querySelectorAll('[data-size="invisible"]'),
	);
	containers.push(...invisibleContainers);

	// Strategy 2: Look for elements with specific IDs
	const idContainers = Array.from(
		document.querySelectorAll(
			'#procaptcha-container, [id$="-procaptcha-container"]',
		),
	);

	// Strategy 3: Look for elements with class 'p-procaptcha'
	const classContainers = Array.from(
		document.getElementsByClassName("p-procaptcha"),
	);
	containers.push(...classContainers);

	for (const container of idContainers) {
		if (!containers.includes(container)) {
			containers.push(container);
		}
	}

	return containers;
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
	let readyCalled = false;

	// Render the Procaptcha component implicitly if renderExplicit is not set to explicit
	if (renderExplicit !== "explicit") {
		getProcaptchaScript(BUNDLE_NAME)?.addEventListener("load", () => {
			ready(implicitRender);
			readyCalled = true;
		});
		// or if the document has already loaded, call the implicit render function
		if (document.readyState === "complete" && !readyCalled) {
			ready(implicitRender);
		}
	}

	if (onloadUrlCallback) {
		// Add event listener to the script tag to call the callback function when the script is loaded
		getProcaptchaScript(BUNDLE_NAME)?.addEventListener("load", () => {
			const onloadCallback = getWindowCallback(onloadUrlCallback);
			ready(onloadCallback);
		});

		// or if the document has already loaded, call the callback function
		if (document.readyState === "complete" && !readyCalled) {
			const onloadCallback = getWindowCallback(onloadUrlCallback);
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
