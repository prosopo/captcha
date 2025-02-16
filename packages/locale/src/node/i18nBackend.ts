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

import i18n, { type InitOptions } from "i18next";
import Backend from "i18next-http-backend";
import { LanguageDetector as MiddlewareLanguageDetector } from "i18next-http-middleware";
import { translations as resources } from "../translations.js";

const commonOptions: InitOptions = {
	debug: false,
	fallbackLng: "en",
	resources,
};

const nodeOptions: InitOptions = {};

i18n
	.use(new Backend(undefined, { reloadInterval: false })) // THIS IS THE LINE THAT CAUSES THE ERROR WHERE VITE NEVER EXITS THE BUNDLING PROCESS! It is due to a setInterval call in this class. Set reloadInterval to false to avoid the interval setup.
	.use(MiddlewareLanguageDetector)
	.init({ ...commonOptions, ...nodeOptions });

export default i18n;
