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
import type { Ti18n } from "./types.js";

export interface KeyedErrorMessage {
	message: string;
	key?: string;
}

/**
 * The provider translates error messages into the request's Accept-Language,
 * which is the browser's language rather than the widget's. Re-translating the
 * error key on the client shows the error in the language the widget renders
 * in. Free text and keys the catalogue doesn't have keep the server's message.
 */
export const localiseErrorMessage = (
	i18n: Ti18n | undefined,
	error: KeyedErrorMessage,
): string => {
	const { key, message } = error;
	if (!key || !i18n?.isInitialized) {
		return message;
	}
	return i18n.t(key, { defaultValue: message });
};
