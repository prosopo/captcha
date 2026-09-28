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
const REF_COUNT_MARKER = "data-prosopo-style-refs";

/**
 * Insert a stylesheet into the element the component renders into.
 *
 * This is where Emotion used to put its output: the bundle built its cache with
 * `container: widgetInteractiveArea`, so rules landed inside the checkbox's
 * shadow root rather than the host page's `<head>`. Keeping the same insertion
 * point keeps the widget's CSS out of the dapp's document and keeps container
 * queries resolving against `.prosopo-widget__wrapper` in the light DOM.
 *
 * Components sharing a container share a single copy of the tag, so the tag is
 * reference-counted: it is removed only once every caller that asked for it has
 * disposed. Without the count, the first component to be destroyed would strip
 * the CSS out from under its still-mounted siblings. Each disposer is
 * idempotent, so a double `destroy` cannot decrement someone else's claim.
 */
export const injectStyle = (
	container: HTMLElement,
	id: string,
	css: string,
): (() => void) => {
	const readRefCount = (element: Element): number =>
		Number(element.getAttribute(REF_COUNT_MARKER) ?? "0");

	const existing = container.querySelector(`style[${STYLE_MARKER}="${id}"]`);
	const style = null !== existing ? existing : document.createElement("style");

	if (null === existing) {
		style.setAttribute(STYLE_MARKER, id);
		style.textContent = css;
		// Prepend so component rules lose to anything the skeleton set later,
		// which is the ordering Emotion's `prepend: true` gave us.
		container.insertBefore(style, container.firstChild);
	}

	style.setAttribute(REF_COUNT_MARKER, String(readRefCount(style) + 1));

	let disposed = false;
	return () => {
		if (disposed) {
			return;
		}
		disposed = true;
		const remaining = readRefCount(style) - 1;
		if (remaining > 0) {
			style.setAttribute(REF_COUNT_MARKER, String(remaining));
			return;
		}
		style.parentNode?.removeChild(style);
	};
};
