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

import path from "node:path";
import i18n, { type BackendModule, type NewableModule } from "i18next";
import FSBackendCjs from "i18next-fs-backend/cjs";
import { LanguageDetector as MiddlewareLanguageDetector } from "i18next-http-middleware";
import { i18nSharedOptions } from "./i18SharedOptions.js";
import { isServerSide } from "./util.js";

const loadPath =
	`${path.dirname(import.meta.url)}/locales/{{lng}}/{{ns}}.json`.replace(
		"file://",
		"",
	);

// The ESM entry uses top-level await, which breaks every non-ESM browser
// bundle that reaches this file through loadI18next's dynamic import (the
// Cypress spec bundles are UMD). The CJS entry has none, but its .d.ts
// declares an ES default export while the file sets `module.exports` to the
// class itself (https://github.com/i18next/i18next-fs-backend/issues/57), so
// the value is checked rather than trusted.
const isBackendClass = (
	value: unknown,
): value is NewableModule<BackendModule> =>
	typeof value === "function" && "type" in value && value.type === "backend";

export const fsBackend = (
	loaded: unknown = FSBackendCjs,
): NewableModule<BackendModule> => {
	if (!isBackendClass(loaded)) {
		throw new Error("i18next-fs-backend/cjs did not export a backend class");
	}
	return loaded;
};

export function initializeI18n(
	i18nLoadedCallback?: (value: typeof i18n) => void,
) {
	if (!i18n.isInitialized && isServerSide()) {
		const lngDetector = new MiddlewareLanguageDetector(null, {
			order: ["header", "query", "cookie"],
		});
		i18n
			.use(fsBackend())
			.use(lngDetector) // this line should switch the language to the one the user reports in the Accept-Language header
			.init({
				...i18nSharedOptions,
				ns: ["translation"],
				backend: {
					loadPath,
				},
			});
		// "loaded" fires once per namespace, and again after changeLanguage(),
		// so the raw event is not the one-shot signal the callback expects.
		// Latch it here as well as in loadI18next: this callback is public and
		// a caller could reasonably use it to run a side effect.
		let notified = false;
		i18n.on("loaded", () => {
			if (notified) {
				return;
			}
			notified = true;
			i18nLoadedCallback?.(i18n);
		});
	} else {
		// Nothing to initialise — either i18next is already up (a frontend
		// consumer got there first) or we are not on the server. The `loaded`
		// handler above is only registered inside the init branch, so without
		// this the callback would never fire and loadI18next() would stay
		// pending forever instead of handing back the instance we already have.
		i18nLoadedCallback?.(i18n);
	}
	return i18n;
}

export default initializeI18n;
