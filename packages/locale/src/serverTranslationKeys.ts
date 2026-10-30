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

import targetEn from "./locales/en/target.json" with { type: "json" };
import serverEn from "./locales/en/translation.json" with { type: "json" };
import widgetEn from "./locales/en/widget.json" with { type: "json" };
import {
	type TargetKey,
	type TranslationKey,
	type TranslationNode,
	getLeafFieldPath,
} from "./translationKey.js";

// Server-only: these read every English catalogue, which the widget must not
// bundle. Nothing on the widget's path imports this module.
const translationEn = { ...serverEn, ...widgetEn, ...targetEn };

export const translationKeys: string[] = getLeafFieldPath(translationEn);

const translationKeySet: ReadonlySet<string> = new Set(translationKeys);

/** For keys that only exist at runtime, e.g. an error message. */
export const isTranslationKey = (value: string): value is TranslationKey =>
	translationKeySet.has(value);

export const targetKeys: readonly string[] = Object.keys(targetEn.TARGET);

const targetKeySet: ReadonlySet<string> = new Set(targetKeys);

/**
 * For a dataset's target, which is only known at runtime. A dataset can carry
 * a label the catalogue does not have yet, so callers must handle `false`.
 */
export const isTargetKey = (value: string): value is TargetKey =>
	targetKeySet.has(value);

/**
 * The English text for a key, whatever the request's language. The provider
 * sends it beside translated text the widget cannot look up itself (image
 * labels, server-only errors), so logs and crash reports can be read in
 * English. Read from the bundled catalogues, not i18next, so it cannot depend
 * on which languages the server has loaded.
 */
export const englishText = (key: TranslationKey): string => {
	const text: TranslationNode | undefined = key
		.split(".")
		.reduce<TranslationNode | undefined>(
			(node: TranslationNode | undefined, part: string) =>
				typeof node === "object" ? node[part] : undefined,
			translationEn,
		);
	return typeof text === "string" ? text : key;
};
