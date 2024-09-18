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

import { ProcaptchaFrictionless } from "@prosopo/procaptcha-frictionless";
import { ProcaptchaPow } from "@prosopo/procaptcha-pow";
import { Procaptcha } from "@prosopo/procaptcha-react";
import type {
	ProcaptchaClientConfigOutput,
	ProcaptchaRenderOptions,
} from "@prosopo/types";
import { at } from "@prosopo/util";
import { createRoot } from "react-dom/client";
import { getCaptchaType } from "./util/captchaType.js";
import {
	extractParams,
	getConfig,
	getProcaptchaScript,
} from "./util/config.js";
import {
	getDefaultCallbacks,
	getWindowCallback,
	setUserCallbacks,
} from "./util/defaultCallbacks.js";
import { setLanguage } from "./util/language.js";
import { setTheme } from "./util/theme.js";
import { setValidChallengeLength } from "./util/timeout.js";

const BUNDLE_NAME = "procaptcha.bundle.js";

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

		renderLogic(elements, getConfig(siteKey), { captchaType, siteKey });
	}
};

const renderLogic = (
	elements: Element[],
	config: ProcaptchaClientConfigOutput,
	renderOptions?: ProcaptchaRenderOptions,
) => {
	for (const element of elements) {
		const callbacks = getDefaultCallbacks(element);

		setUserCallbacks(renderOptions, callbacks, element);
		setTheme(renderOptions, element, config);
		setValidChallengeLength(renderOptions, element, config);
		setLanguage(renderOptions, element, config);

		switch (renderOptions?.captchaType) {
			case "pow":
				createRoot(element).render(
					<ProcaptchaPow config={config} callbacks={callbacks} />,
				);
				break;
			case "frictionless":
				createRoot(element).render(
					<ProcaptchaFrictionless config={config} callbacks={callbacks} />,
				);
				break;
			default:
				createRoot(element).render(
					<Procaptcha config={config} callbacks={callbacks} />,
				);
				break;
		}
	}
};

// Explicit render for targeting specific elements
export const render = (
	element: Element,
	renderOptions: ProcaptchaRenderOptions,
) => {
	const siteKey = renderOptions.siteKey;

	renderLogic([element], getConfig(siteKey), renderOptions);
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
		procaptcha: { ready: typeof ready; render: typeof render };
	}
}

// set the procaptcha attribute on the window
window.procaptcha = { ready, render };

// onLoadUrlCallback defines the name of the callback function to be called when the script is loaded
// onRenderExplicit takes values of either explicit or implicit
const { onloadUrlCallback, renderExplicit } = extractParams(BUNDLE_NAME);

// Render the Procaptcha component implicitly if renderExplicit is not set to explicit
if (renderExplicit !== "explicit") {
	ready(implicitRender);
}

if (onloadUrlCallback) {
	const onloadCallback = getWindowCallback(onloadUrlCallback);
	// Add event listener to the script tag to call the callback function when the script is loaded
	getProcaptchaScript(BUNDLE_NAME)?.addEventListener("load", () => {
		ready(onloadCallback);
	});
}
