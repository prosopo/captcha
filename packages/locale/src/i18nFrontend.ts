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

import { dirname } from "node:path";
import i18n, { type InitOptions } from "i18next";
import I18nextBrowserLanguageDetector from "i18next-browser-languagedetector";
import ChainedBackend from "i18next-chained-backend";
import HttpBackend from "i18next-http-backend";
import resourcesToBackend from "i18next-resources-to-backend";
import { initReactI18next } from "react-i18next";
import { LanguageSchema, Languages } from "./translations.js";

const reactOptions: InitOptions = {
	react: {
		useSuspense: true,
	},
	detection: {
		order: ["navigator", "htmlTag", "path", "subdomain"],
		caches: ["localStorage", "cookie"],
	},
};

const getLoadPath = (language: string, namespace: string) => {
	const filename = import.meta.url.split("/").pop();
	return `${import.meta.url.replace(`/${filename}`, "")}/locales/${language}/${namespace}.json`;
};

export function initializeI18n() {
	if (!i18n.isInitialized) {
		i18n
			// @ts-ignore
			.use(ChainedBackend)
			.use(I18nextBrowserLanguageDetector)
			.use(initReactI18next)
			.init({
				debug: true,
				fallbackLng: LanguageSchema.enum.en,
				namespace: "translation",
				supportedLngs: Languages,
				backend: {
					backends: [
						HttpBackend, // if a namespace can't be loaded via normal http-backend loadPath, then the inMemoryLocalBackend will try to return the correct resources
						// with dynamic import, you have to use the "default" key of the module ( https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import#importing_defaults )
						resourcesToBackend(
							(language: string, namespace: string) =>
								import(getLoadPath(language, namespace)),
						),
					],
					backendOptions: [
						{
							loadPath: getLoadPath("{{lng}}", "{{ns}}"),
						},
					],
				},
				...reactOptions,
			} as InitOptions);
	}
	return i18n;
}

export default initializeI18n;
