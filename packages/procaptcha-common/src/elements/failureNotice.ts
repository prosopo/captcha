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

const NOTICE_ATTRIBUTE = "data-procaptcha-failed-notice";

// An invisible widget's host is the site's own button: text inside it would
// become part of the button's label, so the notice goes beside it instead.
const isInlineHost = (element: Element): boolean =>
	"button" === element.tagName.toLowerCase();

const findNotice = (element: Element): Element | null => {
	if (isInlineHost(element)) {
		const next = element.nextElementSibling;
		return next?.hasAttribute(NOTICE_ATTRIBUTE) ? next : null;
	}
	return element.querySelector(`:scope > [${NOTICE_ATTRIBUTE}]`);
};

export const clearFailureNotice = (element: Element): void => {
	findNotice(element)?.remove();
};

/**
 * Shows a failed-challenge message next to the widget. `role="alert"` makes
 * screen readers announce it without moving focus.
 */
export const showFailureNotice = (element: Element, message: string): void => {
	clearFailureNotice(element);
	const notice = element.ownerDocument.createElement("div");
	notice.setAttribute(NOTICE_ATTRIBUTE, "");
	notice.setAttribute("role", "alert");
	notice.textContent = message;
	notice.style.fontSize = "14px";
	notice.style.lineHeight = "1.4";
	notice.style.margin = "4px 0";
	if (isInlineHost(element)) {
		element.insertAdjacentElement("afterend", notice);
	} else {
		element.appendChild(notice);
	}
};
