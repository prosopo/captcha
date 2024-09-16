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
	const fn = (window as any)[callbackName.replace("window.", "")];
	if (typeof fn !== "function") {
		throw new Error(
			`Callback ${callbackName} is not defined on the window object`,
		);
	}
	return fn;
};

export const getDefaultCallbacks = (element: Element) => ({
	onHuman: (token: ProcaptchaToken) => handleOnHuman(element, token),
	onChallengeExpired: () => {
		removeProcaptchaResponse();
		console.log("Challenge expired");
	},
	onExpired: () => {
		removeProcaptchaResponse();
		alert("Completed challenge has expired, please try again");
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
});

export function setUserCallbacks(
	renderOptions: ProcaptchaRenderOptions | undefined,
	callbacks: {
		onHuman: (token: ProcaptchaToken) => void;
		onChallengeExpired: () => void;
		onExpired: () => void;
		onError: (error: Error) => void;
		onClose: () => void;
		onOpen: () => void;
	},
	element: Element,
) {
	if (typeof renderOptions?.callback === "function") {
		const fn = renderOptions.callback;
		callbacks.onHuman = (token: ProcaptchaToken) => {
			handleOnHuman(element, token);
			fn(token);
		};
	} else {
		const callbackName =
			typeof renderOptions?.callback === "string"
				? renderOptions?.callback
				: element.getAttribute("data-callback");
		if (callbackName)
			// wrap the user's callback in a function that also calls handleOnHuman
			callbacks.onHuman = (token: ProcaptchaToken) => {
				handleOnHuman(element, token);
				const fn = getWindowCallback(callbackName);
				fn(token);
			};
	}

	if (
		renderOptions?.["chalexpired-callback"] &&
		typeof renderOptions["chalexpired-callback"] === "function"
	) {
		const fn = renderOptions["chalexpired-callback"];
		callbacks.onChallengeExpired = () => {
			removeProcaptchaResponse();
			fn();
		};
	} else {
		const chalExpiredCallbackName =
			typeof renderOptions?.["chalexpired-callback"] === "string"
				? renderOptions?.["chalexpired-callback"]
				: element.getAttribute("data-chalexpired-callback");
		if (chalExpiredCallbackName)
			callbacks.onChallengeExpired = () => {
				const fn = getWindowCallback(chalExpiredCallbackName);
				removeProcaptchaResponse();
				fn();
			};
	}

	if (
		renderOptions?.["expired-callback"] &&
		typeof renderOptions["expired-callback"] === "function"
	) {
		const fn = renderOptions["expired-callback"];
		callbacks.onExpired = () => {
			removeProcaptchaResponse();
			fn();
		};
	} else {
		const onExpiredCallbackName =
			typeof renderOptions?.["expired-callback"] === "string"
				? renderOptions?.["expired-callback"]
				: element.getAttribute("data-expired-callback");
		if (onExpiredCallbackName)
			callbacks.onExpired = () => {
				const fn = getWindowCallback(onExpiredCallbackName);
				removeProcaptchaResponse();
				fn();
			};
	}

	if (
		renderOptions?.["error-callback"] &&
		typeof renderOptions["error-callback"] === "function"
	) {
		const fn = renderOptions["error-callback"];
		callbacks.onError = () => {
			removeProcaptchaResponse();
			fn();
		};
	} else {
		const errorCallbackName =
			typeof renderOptions?.["error-callback"] === "string"
				? renderOptions?.["error-callback"]
				: element.getAttribute("data-error-callback");
		if (errorCallbackName)
			callbacks.onError = () => {
				const fn = getWindowCallback(errorCallbackName);
				removeProcaptchaResponse();
				fn();
			};
	}

	if (typeof renderOptions?.["close-callback"] === "function") {
		callbacks.onClose = renderOptions["close-callback"];
	} else {
		const onCloseCallbackName =
			typeof renderOptions?.["close-callback"] === "string"
				? renderOptions?.["close-callback"]
				: element.getAttribute("data-close-callback");
		if (onCloseCallbackName)
			callbacks.onClose = getWindowCallback(onCloseCallbackName);
	}

	if (renderOptions?.["open-callback"]) {
		if (typeof renderOptions["open-callback"] === "function") {
			callbacks.onOpen = renderOptions["open-callback"];
		} else {
			const onOpenCallbackName =
				typeof renderOptions?.["open-callback"] === "string"
					? renderOptions?.["open-callback"]
					: element.getAttribute("data-open-callback");
			if (onOpenCallbackName)
				callbacks.onOpen = getWindowCallback(onOpenCallbackName);
		}
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
