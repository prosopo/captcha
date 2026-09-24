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

import { ApiParams } from "@prosopo/types";

type ParentForm = HTMLFormElement | null;

export function getParentForm(widgetElement: Element): ParentForm {
	const parentForm = widgetElement.closest("form") as ParentForm;

	if (parentForm) {
		return parentForm;
	}

	// fallback for widgets inside a shadow DOM

	const rootWidgetNode = widgetElement.getRootNode();
	if (rootWidgetNode instanceof ShadowRoot) {
		return rootWidgetNode.host.closest("form") as ParentForm;
	}

	return null;
}

/**
 * Removes the token input a widget added to its form. Given the widget's
 * element, only that widget's form is touched: clearing the whole document let
 * one widget solving, expiring or erroring delete the token another widget on
 * the page had already put in a different form. Without an element (a caller
 * that never added an input of its own) every response input is removed, as
 * before.
 */
export const removeProcaptchaResponse = (widgetElement?: Element): void => {
	const scope: ParentNode | null =
		undefined === widgetElement ? document : getParentForm(widgetElement);
	if (null === scope) {
		return;
	}
	for (const input of Array.from(
		scope.querySelectorAll(`[name="${ApiParams.procaptchaResponse}"]`),
	)) {
		input.remove();
	}
};
