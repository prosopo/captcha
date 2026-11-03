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

import { LanguageDetector } from "i18next-http-middleware";
import { requestLanguage } from "./languagePreference.js";

const DETECTOR_NAME = "prosopo";

/**
 * The provider's request language detector: `?lng=`, then the Prosopo-Lang
 * header, then Accept-Language, negotiated exactly as the widget negotiates
 * (languagePreference.ts). It replaces the middleware's built-in
 * header/query/cookie order, which read the cookie (set by the host site, not
 * by us) and did not map `nb`/`nn` to `no`. Nothing is cached in a cookie.
 */
export const createRequestLanguageDetector = (): LanguageDetector => {
	const detector = new LanguageDetector(null, {
		order: [DETECTOR_NAME],
		caches: false,
	});
	detector.addDetector({
		name: DETECTOR_NAME,
		lookup: (request): string => requestLanguage(request),
	});
	return detector;
};
