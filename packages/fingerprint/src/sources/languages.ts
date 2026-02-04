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
import { isChromium, isChromium86OrNewer } from "../utils/browser";

export default function getLanguages(): string[][] {
	const n = navigator;
	const result: string[][] = [];

	const language =
		n.language || n.userLanguage || n.browserLanguage || n.systemLanguage;
	if (language !== undefined) {
		result.push([language]);
	}

	if (Array.isArray(n.languages)) {
		// Starting from Chromium 86, there is only a single value in `navigator.language` in Incognito mode:
		// the value of `navigator.language`. Therefore the value is ignored in this browser.
		if (!(isChromium() && isChromium86OrNewer())) {
			result.push(n.languages);
		}
	} else if (typeof n.languages === "string") {
		const languages = n.languages as string;
		if (languages) {
			result.push(languages.split(","));
		}
	}

	return result;
}
