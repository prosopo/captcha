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
	ApiParams,
	type Callbacks,
	type ProcaptchaRenderOptions,
	type ProcaptchaToken,
} from "@prosopo/types";
import {
	clearFailureNotice,
	showFailureNotice,
} from "../elements/failureNotice.js";
import { getParentForm, removeProcaptchaResponse } from "../elements/form.js";
import { getWindowCallback } from "../elements/window.js";

export const FAILED_NOTICE_FALLBACK =
	"You answered one or more captchas incorrectly. Please try again";

/**
 * @param getFailedMessage returns the localized failure text; read when the
 * failure happens, as translations load after the callbacks are built.
 */
export const getDefaultCallbacks = (
	element?: Element,
	getFailedMessage?: () => string | undefined,
): Callbacks => ({
	onHuman: (token: ProcaptchaToken) => handleOnHuman(token, element),
	onChallengeExpired: () => {
		removeProcaptchaResponse();
		console.log("Challenge expired");
	},
	onExtensionNotFound: () => {
		console.error("Extension not found");
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
		// Never alert(): it blocks the page, cannot be translated and takes
		// focus away from assistive technology mid-flow.
		if (element) {
			showFailureNotice(
				element,
				getFailedMessage?.() || FAILED_NOTICE_FALLBACK,
			);
		}
		console.log("Challenge failed");
	},
	onReset: () => {
		removeProcaptchaResponse();
		console.log("Captcha widget reset");
	},
	onReload: () => {
		console.log("Challenge reloaded");
	},
});

/**
 * Set the a user callback function for an element. Data tags take precedence over renderOptions.
 */
const getUserCallback = <Args extends unknown[]>(
	callback: string,
	element: Element,
	callbackFnOrName: string | ((...args: Args) => void) | undefined,
): ((...args: Args) => unknown) | undefined => {
	const callbackFnName = element.getAttribute(`data-${callback}`);
	if (callbackFnName) {
		return getWindowCallback(callbackFnName);
	}
	if (typeof callbackFnOrName === "function") {
		return callbackFnOrName;
	}
	if (typeof callbackFnOrName === "string") {
		return getWindowCallback(callbackFnOrName);
	}
	return undefined;
};

export function setUserCallbacks(
	renderOptions: ProcaptchaRenderOptions | undefined,
	callbacks: Callbacks,
	element: Element,
) {
	const humanCallback = getUserCallback(
		"callback",
		element,
		renderOptions?.callback,
	);
	if (humanCallback) {
		// wrap the user's callback in a function that also calls handleOnHuman
		callbacks.onHuman = (token: ProcaptchaToken) => {
			handleOnHuman(token, element);
			humanCallback(token);
		};
	}

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

const handleOnHuman = (token: ProcaptchaToken, element?: Element) => {
	removeProcaptchaResponse();
	if (element) {
		clearFailureNotice(element);
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
	}
};
