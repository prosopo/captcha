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

import { LanguageSchema, type Languages } from "@prosopo/locale";
import type {
	ProcaptchaClientConfigInput,
	ProcaptchaRenderOptions,
} from "@prosopo/types";

/**
 * Prioritizes language selection from:
 * 1. renderOptions.language
 * 2. element's data-language attribute
 * 3. Defaults to 'en'
 *
 * Validates the language against currently supported languages
 *
 * @param renderOptions
 * @param element
 * @param config
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

// Resolves the site-owner language before an i18n singleton has been created,
// so the widget can boot i18n with the correct language on first init instead
// of having to run a post-mount changeLanguage() effect. Returning `undefined`
// preserves the existing "fall back to browser detection" behaviour.
export const resolveLanguage = (
	renderOptions: ProcaptchaRenderOptions | undefined,
	element: Element,
): string | undefined => {
	const languageAttribute =
		renderOptions?.language || element.getAttribute("data-language");

	if (!languageAttribute) {
		return undefined;
	}

	return validateLanguage(languageAttribute);
};

const validateLanguage = (languageAttribute: string | typeof Languages) => {
	try {
		return LanguageSchema.parse(languageAttribute);
	} catch (error) {
		console.error(`Invalid language attribute: ${languageAttribute}`);
		return LanguageSchema.parse("en");
	}
};
