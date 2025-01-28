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
import {
	ApiParams,
	type ProcaptchaRenderOptions,
	type ProcaptchaToken,
} from "@prosopo/types";
import { getParentForm } from "./form.js";

export const getWindowCallback = (callbackName: string) => {
	// biome-ignore lint/suspicious/noExplicitAny: TODO fix any
	const fn = (window as any)[callbackName.replace("window.", "")];
	if (typeof fn !== "function") {
		throw new Error(
			`Callback ${callbackName} is not defined on the window object`,
		);
	}
	return fn;
};

export interface Callbacks {
	onHuman: (token: ProcaptchaToken) => void;
	onChallengeExpired: () => void;
	onExpired: () => void;
	onError: (error: Error) => void;
	onClose: () => void;
	onOpen: () => void;
	onFailed: () => void;
	onReset: () => void;
}

export const getDefaultCallbacks = (element: Element): Callbacks => ({
	onHuman: (token: ProcaptchaToken) => handleOnHuman(element, token),
	onChallengeExpired: () => {
		removeProcaptchaResponse();
		console.log("Challenge expired");
	},
	onExpired: () => {
		removeProcaptchaResponse();
	},
	onError: (error: Error) => {
		removeProcaptchaResponse();
		console.error(error);
	},
	onClose: () => {
		console.log("Challenge closed");
	},
	onOpen: () => {
		console.log("Challenge opened");
	},
	onFailed: () => {
		alert("Captcha challenge failed. Please try again");
		console.log("Challenge failed");
	},
	onReset: () => {
		removeProcaptchaResponse();
		console.log("Captcha widget reset");
	},
});

/**
 * Set the a user callback function for an element. Data tags take precedence over renderOptions.
 */
const getUserCallback = (
	callback: string,
	element: Element,
	callbackFnOrName: string | ((token: string) => void) | undefined,
) => {
	const callbackFnName = element.getAttribute(`data-${callback}`);
	if (callbackFnName) {
		const callbackFn = getWindowCallback(callbackFnName);
		if (callbackFn) {
			return callbackFn;
		}
	}
	if (typeof callbackFnOrName === "function") {
		return callbackFnOrName;
	}
	if (typeof callbackFnOrName === "string") {
		return getWindowCallback(callbackFnOrName);
	}
};

export function setUserCallbacks(
	renderOptions: ProcaptchaRenderOptions | undefined,
	callbacks: Callbacks,
	element: Element,
) {
	// human callback
	const humanCallback = getUserCallback(
		"callback",
		element,
		renderOptions?.callback,
	);
	if (humanCallback) {
		// wrap the user's callback in a function that also calls handleOnHuman
		callbacks.onHuman = (token: ProcaptchaToken) => {
			handleOnHuman(element, token);
			humanCallback(token);
		};
	}

	// challenge expired callback
	const chalExpiredCallback = getUserCallback(
		"chalexpired-callback",
		element,
		renderOptions?.["chalexpired-callback"],
	);
	if (chalExpiredCallback) {
		callbacks.onChallengeExpired = () => {
			removeProcaptchaResponse();
			chalExpiredCallback();
		};
	}

	// expired callback
	const expiredCallback = getUserCallback(
		"expired-callback",
		element,
		renderOptions?.["expired-callback"],
	);
	if (expiredCallback) {
		callbacks.onExpired = () => {
			removeProcaptchaResponse();
			expiredCallback();
		};
	}

	// error callback
	const errorCallback = getUserCallback(
		"error-callback",
		element,
		renderOptions?.["error-callback"],
	);
	if (errorCallback) {
		callbacks.onError = (error: Error) => {
			removeProcaptchaResponse();
			errorCallback(error);
		};
	}

	// close callback
	const closeCallback = getUserCallback(
		"close-callback",
		element,
		renderOptions?.["close-callback"],
	);
	if (closeCallback) {
		callbacks.onClose = () => {
			closeCallback();
		};
	}

	// open callback
	const openCallback = getUserCallback(
		"open-callback",
		element,
		renderOptions?.["open-callback"],
	);
	if (openCallback) {
		callbacks.onOpen = () => {
			openCallback();
		};
	}

	// failed callback
	const failedCallback = getUserCallback(
		"failed-callback",
		element,
		renderOptions?.["failed-callback"],
	);
	if (failedCallback) {
		callbacks.onFailed = () => {
			failedCallback();
		};
	}

	// reset callback
	const resetCallback = getUserCallback(
		"reset-callback",
		element,
		renderOptions?.["reset-callback"],
	);
	if (resetCallback) {
		callbacks.onReset = () => {
			removeProcaptchaResponse();
			resetCallback();
		};
	}
}

const handleOnHuman = (element: Element, token: ProcaptchaToken) => {
	removeProcaptchaResponse();
	const form = getParentForm(element);

	if (!form) {
		console.error("Parent form not found for the element:", element);
		return;
	}

	const input = document.createElement("input");
	input.type = "hidden";
	input.name = ApiParams.procaptchaResponse;
	input.value = token;
	form.appendChild(input);
};

const removeProcaptchaResponse = () => {
	const element = Array.from(
		document.getElementsByName(ApiParams.procaptchaResponse),
	);
	element.map((el) => el.remove());
};
