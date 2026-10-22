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

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import i18n, { type BackendModule, type NewableModule } from "i18next";
import FSBackendCjs from "i18next-fs-backend/cjs";
import { i18nSharedOptions } from "./i18SharedOptions.js";
import { createRequestLanguageDetector } from "./requestLanguageDetector.js";
import { NAMESPACES } from "./translationKey.js";
import { isServerSide } from "./util.js";

// The catalogues sit in `locales/` beside the ESM build (and the source), but
// the CJS build runs from `dist/cjs/`, one level below them. Browser bundles
// stub `fs` with an empty module, so it is reached through the default import
// and only on the server.
export const localesDirectory = (
	moduleDirectory: string,
	exists: (file: string) => boolean = fs.existsSync,
): string => {
	const beside = path.join(moduleDirectory, "locales");
	const above = path.join(moduleDirectory, "..", "locales");
	const hasCatalogues = (directory: string): boolean =>
		exists(path.join(directory, "en", `${NAMESPACES.server}.json`));
	return !hasCatalogues(beside) && hasCatalogues(above) ? above : beside;
};

const cataloguePath = (): string =>
	path.join(
		localesDirectory(path.dirname(fileURLToPath(import.meta.url))),
		"{{lng}}",
		"{{ns}}.json",
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
		i18n
			.use(fsBackend())
			.use(createRequestLanguageDetector())
			.init(
				{
					...i18nSharedOptions,
					// Every namespace, so `t()` finds a key wherever it lives:
					// default namespace first, then the others in order.
					ns: [NAMESPACES.server, NAMESPACES.widget, NAMESPACES.target],
					defaultNS: NAMESPACES.server,
					fallbackNS: [NAMESPACES.widget, NAMESPACES.target],
					backend: {
						loadPath: cataloguePath(),
					},
				},
				// init's callback runs once, after every namespace of the initial
				// languages has been read. The "loaded" event used before fires per
				// backend batch, the first one before i18next is even initialised,
				// so it released callers with `widget` and `target` still unread.
				// An error (a missing file) still calls back: i18next then renders
				// keys or English, and untranslated beats a server that never boots.
				() => {
					i18nLoadedCallback?.(i18n);
				},
			);
	} else {
		// Nothing to initialise — either i18next is already up (a frontend
		// consumer got there first) or we are not on the server. The init
		// callback above only exists on the init branch, so without this the
		// callback would never fire and loadI18next() would stay
		// pending forever instead of handing back the instance we already have.
		i18nLoadedCallback?.(i18n);
	}
	return i18n;
}

export default initializeI18n;
