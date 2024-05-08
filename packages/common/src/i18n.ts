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
import { LanguageDetector as MiddlewareLanguageDetector } from 'i18next-http-middleware'
import { initReactI18next } from 'react-i18next'
import { isClientSide } from './utils.js'
import Backend from 'i18next-http-backend'
import { default as LanguageDetector } from 'i18next-browser-languagedetector'
import i18n, { InitOptions } from 'i18next'
import translationEn from './locales/en.json' assert { type: 'json' }

const commonOptions: InitOptions = {
    debug: false,
    fallbackLng: 'en',
    resources: {
        en: {
            translation: translationEn,
        },
    },
}

const reactOptions: InitOptions = {
    react: {
        useSuspense: false,
    },
}

const nodeOptions: InitOptions = {}

if (isClientSide()) {
    i18n.use(LanguageDetector)
        .use(initReactI18next)
        .init({ ...commonOptions, ...reactOptions })
} else {
    i18n.use(new Backend(undefined, { reloadInterval: false })) // THIS IS THE LINE THAT CAUSES THE ERROR WHERE VITE NEVER EXITS THE BUNDLING PROCESS! It is due to a setInterval call in this class. Set reloadInterval to false to avoid the interval setup.
        .use(MiddlewareLanguageDetector)
        .init({ ...commonOptions, ...nodeOptions })
}

export default i18n
