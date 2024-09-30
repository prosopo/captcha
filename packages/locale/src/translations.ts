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
import z from "zod";
import translationsEn from "./locales/en.json" assert { type: "json" };
import translationsEs from "./locales/es.json" assert { type: "json" };
import translationsFr from "./locales/fr.json" assert { type: "json" };
import translationsIt from "./locales/it.json" assert { type: "json" };
import translationsPtBR from "./locales/pt-BR.json" assert { type: "json" };
import translationsPt from "./locales/pt.json" assert { type: "json" };

export const LanguageSchema = z.enum(["en", "es", "fr","it", "pt", "pt-BR"]);

export const translations = {
	[LanguageSchema.enum.en]: { translation: translationsEn },
	[LanguageSchema.enum.es]: { translation: translationsEs },
	[LanguageSchema.enum.fr]: { translation: translationsFr },
	[LanguageSchema.enum.it]: { translation: translationsIt },
	[LanguageSchema.enum.pt]: { translation: translationsPt },
	[LanguageSchema.enum["pt-BR"]]: { translation: translationsPtBR },
};
