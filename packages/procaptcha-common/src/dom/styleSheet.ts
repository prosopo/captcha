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

const STYLE_MARKER = "data-prosopo-style";

/**
 * Insert a stylesheet into the element the component renders into.
 *
 * This is where Emotion used to put its output: the bundle built its cache with
 * `container: widgetInteractiveArea`, so rules landed inside the checkbox's
 * shadow root rather than the host page's `<head>`. Keeping the same insertion
 * point keeps the widget's CSS out of the dapp's document and keeps container
 * queries resolving against `.prosopo-widget__wrapper` in the light DOM.
 *
 * Repeat calls with the same id are no-ops, so several widgets on one page
 * share a single copy. The returned disposer only removes the tag it inserted.
 */
export const injectStyle = (
	container: HTMLElement,
	id: string,
	css: string,
): (() => void) => {
	const existing = container.querySelector(`style[${STYLE_MARKER}="${id}"]`);
	if (null !== existing) {
		return () => undefined;
	}

	const style = document.createElement("style");
	style.setAttribute(STYLE_MARKER, id);
	style.textContent = css;
	// Prepend so component rules lose to anything the skeleton set later, which
	// is the ordering Emotion's `prepend: true` gave us.
	container.insertBefore(style, container.firstChild);

	return () => {
		style.parentNode?.removeChild(style);
	};
};
