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
import { LanguageSchema, Languages } from "./translations.js";

// Guard the `process.env` read so the module is loadable in a plain browser
// runtime where `process` is undefined. Without the guard, any side-effectful
// runtime import of `@prosopo/types` (which transitively reaches here via
// `LanguageSchema`) crashes the page in Vite's dev/preview mode.
const logLevel =
	typeof process !== "undefined" ? process.env?.PROSOPO_LOG_LEVEL : undefined;

export const i18nSharedOptions = {
	debug: logLevel === "debug",
	fallbackLng: LanguageSchema.enum.en,
	namespace: "translation",
	supportedLngs: Object.values(Languages),
	nonExplicitSupportedLngs: false,
};
