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

import { LanguageSchema } from "@prosopo/locale";
import i18n from "i18next";
import { default as LanguageDetector } from "i18next-browser-languagedetector";
import ChainedBackend from "i18next-chained-backend";
import resourcesToBackend from "i18next-resources-to-backend";
import { initReactI18next } from "react-i18next";
console.log(`${import.meta.url.split("/").slice(0, -1).join("/")}`);
i18n
	.use(ChainedBackend)
	.use(initReactI18next)
	.use(LanguageDetector)
	// @ts-ignore
	.init(
		{
			// @ts-ignore
			lng: LanguageSchema.enum.en, // default language
			fallbackLng: LanguageSchema.enum.en,
			defaultNS: "translation", // default namespace, if you don't want to specify it in JS files every time.
			interpolation: {
				escapeValue: false,
			},
			react: {
				useSuspense: false,
			},
			detection: {
				order: ["navigator", "htmlTag", "path", "subdomain"],
				caches: ["localStorage", "cookie"],
			},
			// @ts-ignore
			backend: {
				// @ts-ignore
				backends: [
					//HttpBackend, // if you need to check translation files from server
					resourcesToBackend(async (language, namespace) => {
						const jsonTranslation = /*#__PURE__*/ await import(
							`${import.meta.url.split("/").slice(0, -1).join("/")}/locales/${language}/${namespace}.json`,
							{ assert: { type: "json" } }
						);
						console.log("jsonTranslation", jsonTranslation);
						return jsonTranslation;
					}),
				],
				// the most important part that allows you to lazy-load translations
				// @ts-ignore
				backendOptions: [
					{
						loadPath: `${import.meta.url.split("/").slice(0, -1).join("/")}/locales/{{lng}}/{{ns}}.json`,
					},
				],
			},
		},
		undefined,
	);

export default i18n as typeof i18n;
