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

// @ts-nocheck

import path from "node:path";
import i18n, { type InitOptions } from "i18next";
import Backend from "i18next-http-backend";
import HttpBackend from "i18next-http-backend";
import { LanguageDetector as MiddlewareLanguageDetector } from "i18next-http-middleware";
import resourcesToBackend from "i18next-resources-to-backend";
import { LanguageSchema } from "../translations.js";

const commonOptions = {
	debug: false,
	fallbackLng: LanguageSchema.enum.en,
	backend: {
		// @ts-ignore
		backends: [
			HttpBackend, // if you need to check translation files from server
			resourcesToBackend(
				(language, namespace) => import(`./${language}/${namespace}.json`),
			),
		],
		// the most important part that allows you to lazy-load translations
		// @ts-ignore
		backendOptions: [
			{
				loadPath: "./{{lng}}/{{ns}}.json",
			},
		],
	},
};

const nodeOptions: InitOptions = {};

i18n
	.use(new Backend(undefined, { reloadInterval: false })) // THIS IS THE LINE THAT CAUSES THE ERROR WHERE VITE NEVER EXITS THE BUNDLING PROCESS! It is due to a setInterval call in this class. Set reloadInterval to false to avoid the interval setup.
	.use(MiddlewareLanguageDetector)
	.init({ ...commonOptions, ...nodeOptions }, undefined);

export default i18n;
