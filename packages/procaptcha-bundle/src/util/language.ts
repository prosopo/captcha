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

import type {
	ProcaptchaClientConfigInput,
	ProcaptchaRenderOptions,
} from "@prosopo/types";
import { LanguageSchema } from "@prosopo/locale";

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
	const languageAttribute =
		renderOptions?.language || element.getAttribute("data-language");

	if (languageAttribute) {
		config.language = validateLanguage(languageAttribute);
	}
};

const validateLanguage = (
	languageAttribute: string | typeof LanguageSchema,
) => {
	try {
		return LanguageSchema.parse(languageAttribute);
	} catch (error) {
		console.error(`Invalid language attribute: ${languageAttribute}`);
		return LanguageSchema.parse("en");
	}
};
