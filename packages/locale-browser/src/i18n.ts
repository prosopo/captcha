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

import { LanguageSchema, translations as resources } from "@prosopo/locale";
import i18n, { type InitOptions } from "i18next";
import { default as LanguageDetector } from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

const commonOptions: InitOptions = {
	debug: false,
	fallbackLng: LanguageSchema.enum.en,
	resources,
};

const reactOptions: InitOptions = {
	react: {
		useSuspense: false,
	},
	detection: {
		order: ["navigator", "htmlTag", "path", "subdomain"],
		caches: ["localStorage", "cookie"],
	},
};

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({ ...commonOptions, ...reactOptions });

export default i18n;
