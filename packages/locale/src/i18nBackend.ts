// Copyright 2021-2025 Prosopo (UK) Ltd.
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
import i18n from "i18next";
import FSBackend from "i18next-fs-backend/cjs"; // https://github.com/i18next/i18next-fs-backend/issues/57
import { LanguageDetector as MiddlewareLanguageDetector } from "i18next-http-middleware";
import { LanguageSchema, Languages } from "./translations.js";
import { isServerSide } from "./util.js";

const loadPath =
	`${path.dirname(import.meta.url)}/locales/{{lng}}/{{ns}}.json`.replace(
		"file://",
		"",
	);

export function initializeI18n(): Promise<typeof i18n> {
	return new Promise((resolve) => {
		if (!i18n.isInitialized && isServerSide()) {
			i18n
				// @ts-ignore https://github.com/i18next/i18next-fs-backend/issues/57
				.use(FSBackend)
				.use(MiddlewareLanguageDetector)
				.init({
					debug: process.env.PROSOPO_LOG_LEVEL === "debug",
					fallbackLng: LanguageSchema.enum.en,
					supportedLngs: Languages,

					ns: ["translation"],
					backend: {
						loadPath,
					},
					detection: { order: ["header", "query", "cookie"] },
				});
			i18n.on("loaded", () => {
				console.log("i18n backend loaded");
				resolve(i18n);
			});
		}
	});
}

export default initializeI18n;
