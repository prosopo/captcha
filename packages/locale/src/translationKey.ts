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

import translationEn from "./locales/en/translation.json" with { type: "json" };

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

	return Object.keys(obj).reduce((arr, key) => {
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
	}, [] as string[]);
}

export const translationKeys: string[] = getLeafFieldPath(translationEn);

type LeafPath<Node> = {
	[Key in keyof Node & string]: Node[Key] extends string
		? Key
		: `${Key}.${LeafPath<Node[Key]>}`;
}[keyof Node & string];

/** A leaf path in the English catalogue, so a mistyped key fails to compile. */
export type TranslationKey = LeafPath<typeof translationEn>;

const translationKeySet: ReadonlySet<string> = new Set(translationKeys);

/** For keys that only exist at runtime, e.g. an error message. */
export const isTranslationKey = (value: string): value is TranslationKey =>
	translationKeySet.has(value);
