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

import z from "zod";

export const Languages = {
	arabic: "ar",
	azerbaijani: "az",
	czech: "cs",
	german: "de",
	greek: "el",
	english: "en",
	spanish: "es",
	finnish: "fi",
	french: "fr",
	hindi: "hi",
	hungarian: "hu",
	indonesian: "id",
	italian: "it",
	japanese: "ja",
	javanese: "jv",
	korean: "ko",
	malayalam: "ml",
	malay: "ms",
	dutch: "nl",
	norwegian: "no",
	polish: "pl",
	portugeseBrazil: "pt-br",
	portuguese: "pt",
	romanian: "ro",
	russian: "ru",
	serbian: "sr",
	swedish: "sv",
	thai: "th",
	turkish: "tr",
	ukrainian: "uk",
	vietnamese: "vi",
	chinese: "zh-cn",
} as const;

export const LanguageSchema = z.enum(
	Object.values(Languages) as [string, ...string[]],
);
