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

import widgetEn from "./locales/en/widget.json" with { type: "json" };
import type { I18nLookup } from "./types.js";

// Types only: the widget bundles this module, and the browser has no use for
// the server and target catalogues (`serverTranslationKeys.ts` reads them).
type ServerCatalogue = typeof import("./locales/en/translation.json");
type TargetCatalogue = typeof import("./locales/en/target.json");

/**
 * The catalogue is split into i18next namespaces so the browser downloads only
 * what it renders. Keys keep their section prefix (`WIDGET.`, `TARGET.`), so a
 * key reads the same whichever namespace holds it:
 * - `widget`: the widget's own text and the errors it shows (WIDGET, API,
 *   CAPTCHA, GENERAL, ACCOUNT, DEVELOPER). The only namespace the browser
 *   fetches.
 * - `target`: image labels. The provider translates these into the challenge.
 * - `translation` (i18next's default): server-only text (DATABASE, DATASET,
 *   CONTRACT, CONFIG, PORTAL, CLI, FS).
 */
export const NAMESPACES = {
	widget: "widget",
	target: "target",
	server: "translation",
} as const;

export type Namespace = (typeof NAMESPACES)[keyof typeof NAMESPACES];

type EnglishCatalogue = ServerCatalogue & typeof widgetEn & TargetCatalogue;

export type TranslationNode =
	| {
			[key: string]: TranslationNode | string;
	  }
	| string;

// Exported so the traversal can be exercised directly against shapes the
// bundled English translation happens not to contain (deep nesting, empty
// objects, explicitly-undefined values).
export function getLeafFieldPath(obj: TranslationNode): string[] {
	if (typeof obj === "string") {
		return [];
	}

	return Object.keys(obj).reduce<string[]>((arr, key) => {
		const value = obj[key];
		if (value === undefined) {
			throw new Error(`Undefined value for key ${key}`);
		}

		// A string value IS the leaf, so the path ends here. Recursing into it
		// returns [] and the `children.map` below then contributes nothing,
		// which is how this function used to return an empty array for every
		// input — leaving `translationKeys` empty. That list is spread into
		// three mongoose `reason` fields (types-database provider.ts), and
		// mongoose registers its enum validator even for an empty list, so
		// every non-null reason failed validation.
		if (typeof value === "string") {
			return arr.concat(key);
		}

		const children = getLeafFieldPath(value);

		return arr.concat(
			children.map((child) => {
				return `${key}.${child}`;
			}),
		);
	}, []);
}

type LeafPath<Node> = {
	[Key in keyof Node & string]: Node[Key] extends string
		? Key
		: `${Key}.${LeafPath<Node[Key]>}`;
}[keyof Node & string];

/** A leaf path in the English catalogue, so a mistyped key fails to compile. */
export type TranslationKey = LeafPath<EnglishCatalogue>;

/** A key in the widget namespace: the only keys the browser has text for. */
export type WidgetTranslationKey = LeafPath<typeof widgetEn>;

const widgetKeySet: ReadonlySet<string> = new Set(getLeafFieldPath(widgetEn));

/** For a key from the provider, e.g. an error: can the widget translate it? */
export const isWidgetTranslationKey = (
	value: string,
): value is WidgetTranslationKey => widgetKeySet.has(value);

/** An image label in the English catalogue, e.g. `owl` for `TARGET.owl`. */
export type TargetKey = keyof TargetCatalogue["TARGET"];

/**
 * For a key only known at runtime, e.g. an error message: does this instance
 * have text for it? Every catalogue has English's keys, so a key it has text
 * for is a `TranslationKey`.
 */
export const canTranslate = (
	i18n: Pick<I18nLookup, "exists">,
	value: string,
): value is TranslationKey => i18n.exists(value);
