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

import initializeI18n from "./i18nFrontend.js";
import type { Ti18n, TranslateOptions } from "./types.js";

const NAMESPACE = "translation";

export interface Translator {
	/**
	 * Translate a key against the current language. `options` carries
	 * interpolation values and the `defaultValue` a widget falls back to when
	 * its key has not been added to the bundled catalogues yet.
	 */
	t(key: string, options?: TranslateOptions): string;
	/**
	 * Whether the namespace for the active language has finished loading.
	 * Mirrors `ready` from the old react-i18next hook: widgets render an empty
	 * label until it flips, rather than flashing a raw translation key.
	 */
	isReady(): boolean;
	/**
	 * Notified when the translation output could have changed — initialisation,
	 * a namespace load, or a language switch. Returns an unsubscribe function.
	 */
	subscribe(listener: () => void): () => void;
	readonly i18n: Ti18n;
}

/**
 * Vanilla replacement for the `useTranslation` hook: the instance's `t` plus
 * the three events that used to trigger a React re-render.
 */
export const createTranslator = (existing?: Ti18n): Translator => {
	const i18n: Ti18n = existing ?? initializeI18n();

	const isReady = (): boolean =>
		i18n.isInitialized && i18n.hasLoadedNamespace(NAMESPACE);

	return {
		t: (key: string, options?: TranslateOptions): string =>
			i18n.t(key, options),
		isReady,
		i18n,
		subscribe: (listener: () => void): (() => void) => {
			const events = ["initialized", "loaded", "languageChanged"] as const;
			for (const event of events) {
				i18n.on(event, listener);
			}
			return () => {
				for (const event of events) {
					i18n.off(event, listener);
				}
			};
		},
	};
};
