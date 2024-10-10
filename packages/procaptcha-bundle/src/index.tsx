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

import type { ProcaptchaRenderOptions } from "@prosopo/types";
import { at } from "@prosopo/util";
import type { Root } from "react-dom/client";
import { getCaptchaType } from "./util/captchaType.js";
import {
	extractParams,
	getConfig,
	getProcaptchaScript,
} from "./util/config.js";
import { getWindowCallback } from "./util/defaultCallbacks.js";
import { renderLogic } from "./util/renderLogic.js";

const BUNDLE_NAME = "procaptcha.bundle.js";
let procaptchaRoots: Root[] = [];

// Implicit render for targeting all elements with class 'procaptcha'
const implicitRender = () => {
	// Get elements with class 'procaptcha'
	const elements: Element[] = Array.from(
		document.getElementsByClassName("procaptcha"),
	);

	// Set siteKey from renderOptions or from the first element's data-sitekey attribute
	if (elements.length) {
		const siteKey = at(elements, 0).getAttribute("data-sitekey");
		if (!siteKey) {
			console.error("No siteKey found");
			return;
		}
		const captchaType = getCaptchaType(elements);

		const root = renderLogic(elements, getConfig(siteKey), {
			captchaType,
			siteKey,
		});

		procaptchaRoots.push(...root);
	}
};

// Explicit render for targeting specific elements
export const render = (
	element: Element,
	renderOptions: ProcaptchaRenderOptions,
) => {
	const siteKey = renderOptions.siteKey;

	const roots = renderLogic([element], getConfig(siteKey), renderOptions);

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

// extend the global Window interface to include the procaptcha object
declare global {
	interface Window {
		procaptcha: {
			ready: typeof ready;
			render: typeof render;
			reset: typeof reset;
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
window.procaptcha = { ready, render, reset };

start();
