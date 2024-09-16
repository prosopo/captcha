import {
	LanguageSchema,
	type ProcaptchaClientConfigInput,
	type ProcaptchaRenderOptions,
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
	const languageAttribute =
		renderOptions?.language || element.getAttribute("data-language") || "en";
	config.language = validateLanguage(languageAttribute);
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