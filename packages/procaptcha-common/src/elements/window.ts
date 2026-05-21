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

/**
 * Procaptcha depends on secure-context-only browser APIs (e.g. SubtleCrypto)
 * to run a challenge. These are unavailable when the widget is served over
 * plain HTTP, which otherwise surfaces as a cryptic provider-selection
 * failure. The browser already treats HTTPS and localhost as secure contexts,
 * so this only flags genuine HTTP origins. Non-browser (SSR) environments are
 * treated as secure since the HTTP restriction does not apply there.
 */
export const isSecureBrowserContext = (): boolean => {
	if (typeof window === "undefined") {
		return true;
	}
	return window.isSecureContext === true;
};
