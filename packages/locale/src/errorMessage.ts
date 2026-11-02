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

import { isWidgetTranslationKey } from "./translationKey.js";
import type { Ti18n } from "./types.js";

/** What the widget shows for a failure: a provider's error body, or its own. */
export interface DisplayedError {
	code: string;
	errorId: string;
	message?: string;
}

export const FALLBACK_ERROR_TEXT = "Something went wrong";

/**
 * The widget translates errors by code (`ERRORS.<CODE>`) in its own language;
 * the provider sends English only. A code the catalogue does not know keeps the
 * provider's English message. The errorId is always shown so a user's report
 * names the exact place that failed.
 */
export const localiseError = (
	i18n: Ti18n | undefined,
	error: DisplayedError,
): string => {
	const key = `ERRORS.${error.code}`;
	const fallback = error.message ?? FALLBACK_ERROR_TEXT;
	const text =
		i18n?.isInitialized && isWidgetTranslationKey(key)
			? i18n.t(key, { defaultValue: fallback })
			: fallback;
	return `${text} (${error.errorId})`;
};
