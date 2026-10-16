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

import { type Language, resolveLanguageList } from "@prosopo/locale";
import type {
	ProcaptchaClientConfigInput,
	ProcaptchaRenderOptions,
} from "@prosopo/types";

/**
 * Sets config.language from the site's choice, if it made one we support.
 * See resolveLanguage.
 */
export const setLanguage = (
	renderOptions: ProcaptchaRenderOptions | undefined,
	element: Element,
	config: ProcaptchaClientConfigInput,
) => {
	const resolved = resolveLanguage(renderOptions, element);

	if (resolved) {
		config.language = resolved;
	}
};

const requestedLanguage = (
	renderOptions: ProcaptchaRenderOptions | undefined,
	element: Element,
): string | null | undefined =>
	renderOptions?.language || element.getAttribute("data-language");

/** resolveLanguage without the console error, for callers other than the widget. */
export const siteLanguage = (
	renderOptions: ProcaptchaRenderOptions | undefined,
	element: Element,
): Language | undefined =>
	resolveLanguageList(requestedLanguage(renderOptions, element));

/**
 * The site owner's language: renderOptions.language, else the element's
 * `data-language`. Either may list several codes in Accept-Language form
 * (`"xx, tr-TR, de"`); the first one with a catalogue wins, regional tags
 * falling back to their parent (`pt-PT` to `pt`, `nb` to `no`).
 *
 * `undefined` means the site did not choose, or chose only languages we do
 * not have: the widget then uses the browser's languages, then English. So
 * the order is attribute, browser, English.
 *
 * Resolved before i18n is created, so the widget boots in the right language
 * instead of flashing the browser's first.
 */
export const resolveLanguage = (
	renderOptions: ProcaptchaRenderOptions | undefined,
	element: Element,
): Language | undefined => {
	const requested: string | null | undefined = requestedLanguage(
		renderOptions,
		element,
	);

	if (!requested) {
		return undefined;
	}

	const resolved = resolveLanguageList(requested);
	if (!resolved) {
		console.error(
			`Unsupported language attribute: ${requested}; using the browser's language`,
		);
	}
	return resolved;
};
