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

type WindowCallback = (...args: unknown[]) => unknown;

const WINDOW_PREFIX = "window.";

const isWindowCallback = (value: unknown): value is WindowCallback =>
	typeof value === "function";

/**
 * A stand-in for a callback the embedding page names by string, looked up when
 * it fires rather than when the widget mounts.
 *
 * The widget is loaded `async` — that is the embed we document, and what the
 * demo pages use — so it can and does run before the rest of the page has
 * executed. Resolving the name at mount meant the widget threw and failed to
 * render whenever it won that race against the script defining the callback,
 * which is a coin toss decided by how fast the bundle arrives. Deferring the
 * lookup costs nothing and means the page only has to have defined its
 * callback by the time the visitor has solved a captcha.
 *
 * A name that is never defined still throws, just at the point where it would
 * have been called: the site's own handler breaks rather than the captcha.
 */
export const getWindowCallback = (callbackName: string): WindowCallback => {
	const name = callbackName.startsWith(WINDOW_PREFIX)
		? callbackName.slice(WINDOW_PREFIX.length)
		: callbackName;
	return (...args: unknown[]): unknown => {
		const fn: unknown = Reflect.get(window, name);
		if (!isWindowCallback(fn)) {
			throw new Error(
				`Callback ${callbackName} is not defined on the window object`,
			);
		}
		return fn(...args);
	};
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
