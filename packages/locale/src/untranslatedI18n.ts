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

import type { Ti18n, TranslateOptions } from "./types.js";

/**
 * A Ti18n with no catalogues: `t` gives back the caller's `defaultValue`, else
 * the key, and nothing ever loads. It has every method the real instances
 * have, so code handed one cannot rely on a method that does not exist.
 */
export const createUntranslatedI18n = (
	overrides: Partial<Ti18n> = {},
): Ti18n => ({
	language: "en",
	isInitialized: true,
	t: (key: string, options?: TranslateOptions): string =>
		options?.defaultValue ?? key,
	exists: (): boolean => false,
	changeLanguage: async (): Promise<void> => undefined,
	hasLoadedNamespace: (): boolean => true,
	on: (): void => undefined,
	off: (): void => undefined,
	...overrides,
});
