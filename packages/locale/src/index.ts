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

export { BROWSER_UI_LANGUAGES } from "./browserUiLanguages.js";
export type { Browser, BrowserUiLanguage } from "./browserUiLanguages.js";
export { getLanguageDirection } from "./direction.js";
export type { TextDirection } from "./direction.js";
export { default as i18nMiddleware } from "./i18nMiddleware.js";
export { default as loadI18next } from "./loadI18next.js";
export { isLanguage, LanguageCodes, Languages } from "./translations.js";
export {
	browserLanguages,
	LANGUAGE_HEADER,
	LANGUAGE_QUERY_PARAM,
	languageHeaders,
	matchLanguage,
	matchLanguageTag,
	negotiateLanguage,
	parseLanguageList,
	requestLanguage,
	resolveLanguageList,
	widgetLanguageHeaders,
} from "./languagePreference.js";
export type { LanguageRequest } from "./languagePreference.js";
export type { Language } from "./translations.js";
export { isClientSide } from "./util.js";
export {
	englishText,
	isTargetKey,
	isTranslationKey,
	targetKeys,
	translationKeys,
} from "./serverTranslationKeys.js";
export {
	canTranslate,
	isWidgetTranslationKey,
	NAMESPACES,
} from "./translationKey.js";
export type {
	Namespace,
	TargetKey,
	TranslationKey,
	WidgetTranslationKey,
} from "./translationKey.js";
export { createTranslator } from "./translator.js";
export { createUntranslatedI18n } from "./untranslatedI18n.js";
export type { Translator } from "./translator.js";
export type {
	I18nEvent,
	I18nLookup,
	Ti18n,
	TranslateFn,
	TranslateOptions,
} from "./types.js";
export { FALLBACK_ERROR_TEXT, localiseError } from "./errorMessage.js";
export type { DisplayedError } from "./errorMessage.js";
