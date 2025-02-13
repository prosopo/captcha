// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import FSBackend from "i18next-fs-backend";
import { LanguageDetector as MiddlewareLanguageDetector } from "i18next-http-middleware";
import { LanguageSchema } from "./translations.js";

const loadPath =
	`${path.dirname(import.meta.url)}/locales/{{lng}}/{{ns}}.json`.replace(
		"file://",
		"",
	);

if (!i18n.isInitialized) {
	i18n
		.use(FSBackend)
		.use(MiddlewareLanguageDetector)
		.init({
			debug: process.env.NODE_ENV === "development",
			fallbackLng: LanguageSchema.enum.en,
			ns: ["translation"],
			backend: {
				loadPath,
			},
			detection: { order: ["header", "query", "cookie"] },
		});
	i18n.on("loaded", () => {
		console.log("i18n loaded");
	});
}

export default i18n;
