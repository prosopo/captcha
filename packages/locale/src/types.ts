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

/**
 * Interpolation values, plus the `defaultValue` a caller falls back to when its
 * key is not in the catalogue. Values are substituted into `{{name}}`
 * placeholders.
 */
export interface TranslateOptions {
	defaultValue?: string;
	[value: string]: unknown;
}

export type TranslateFn = (key: string, options?: TranslateOptions) => string;

export type I18nEvent = "initialized" | "loaded" | "languageChanged";

/**
 * The slice of an i18n instance this repository uses. Both implementations
 * satisfy it: the browser one in `i18nFrontend.ts`, and i18next itself on the
 * server, where `i18next-http-middleware` needs the real thing.
 */
export interface Ti18n {
	readonly language: string;
	readonly isInitialized: boolean;
	t: TranslateFn;
	changeLanguage(language: string): Promise<unknown>;
	hasLoadedNamespace(namespace: string): boolean;
	on(event: I18nEvent, listener: () => void): void;
	off(event: I18nEvent, listener: () => void): void;
}
