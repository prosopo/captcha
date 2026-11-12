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

import { BYPASS_KEY_COOKIE_NAME } from "@prosopo/types";

export const parseBypassKeyCookie = (
	cookieString: string,
): string | undefined => {
	for (const pair of cookieString.split(";")) {
		const separator = pair.indexOf("=");
		if (separator === -1) {
			continue;
		}
		if (pair.slice(0, separator).trim() !== BYPASS_KEY_COOKIE_NAME) {
			continue;
		}
		const value = pair.slice(separator + 1).trim();
		if (value.length === 0) {
			return undefined;
		}
		try {
			return decodeURIComponent(value);
		} catch {
			return value;
		}
	}
	return undefined;
};

export const readBypassKeyCookie = (): string | undefined => {
	if (typeof document === "undefined") {
		return undefined;
	}
	// Reading document.cookie throws a SecurityError in sandboxed iframes.
	try {
		return parseBypassKeyCookie(document.cookie);
	} catch {
		return undefined;
	}
};
