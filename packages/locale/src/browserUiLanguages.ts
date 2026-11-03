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

import type { TextDirection } from "./direction.js";

export type Browser = "chrome" | "firefox";

export interface BrowserUiLanguage {
	readonly tag: string;
	readonly name: string;
	readonly direction: TextDirection;
	readonly browsers: readonly Browser[];
}

const both: readonly Browser[] = ["chrome", "firefox"];
const chrome: readonly Browser[] = ["chrome"];
const firefox: readonly Browser[] = ["firefox"];

/**
 * Every language Chrome and Firefox ship their own interface in, as the tag
 * each browser reports it under. A visitor's browser is most likely set to one
 * of these, so they are the languages worth a catalogue and the ones the
 * widget's layout direction must get right. Taken from Chromium's
 * build/config/locales.gni (`all_chrome_locales`, aliases such as iw, tl and
 * no folded into he, fil and nb) and Firefox's browser/locales/shipped-locales
 * (tl, which Intl canonicalises to fil, folded into fil and ja-JP-mac into
 * ja), both fetched on 2026-10-16.
 */
export const BROWSER_UI_LANGUAGES: readonly BrowserUiLanguage[] = [
	{ tag: "ach", name: "Acholi", direction: "ltr", browsers: firefox },
	{ tag: "af", name: "Afrikaans", direction: "ltr", browsers: both },
	{ tag: "am", name: "Amharic", direction: "ltr", browsers: chrome },
	{ tag: "an", name: "Aragonese", direction: "ltr", browsers: firefox },
	{ tag: "ar", name: "Arabic", direction: "rtl", browsers: both },
	{ tag: "as", name: "Assamese", direction: "ltr", browsers: chrome },
	{ tag: "ast", name: "Asturian", direction: "ltr", browsers: firefox },
	{ tag: "az", name: "Azerbaijani", direction: "ltr", browsers: both },
	{ tag: "be", name: "Belarusian", direction: "ltr", browsers: both },
	{ tag: "bg", name: "Bulgarian", direction: "ltr", browsers: both },
	{ tag: "bn", name: "Bengali", direction: "ltr", browsers: both },
	{ tag: "br", name: "Breton", direction: "ltr", browsers: firefox },
	{ tag: "bs", name: "Bosnian", direction: "ltr", browsers: both },
	{ tag: "ca", name: "Catalan", direction: "ltr", browsers: both },
	{
		tag: "ca-valencia",
		name: "Valencian",
		direction: "ltr",
		browsers: firefox,
	},
	{ tag: "cak", name: "Kaqchikel", direction: "ltr", browsers: firefox },
	{ tag: "cs", name: "Czech", direction: "ltr", browsers: both },
	{ tag: "cy", name: "Welsh", direction: "ltr", browsers: both },
	{ tag: "da", name: "Danish", direction: "ltr", browsers: both },
	{ tag: "de", name: "German", direction: "ltr", browsers: both },
	{ tag: "dsb", name: "Lower Sorbian", direction: "ltr", browsers: firefox },
	{ tag: "el", name: "Greek", direction: "ltr", browsers: both },
	{
		tag: "en-CA",
		name: "English (Canada)",
		direction: "ltr",
		browsers: firefox,
	},
	{ tag: "en-GB", name: "English (UK)", direction: "ltr", browsers: both },
	{ tag: "en-US", name: "English (US)", direction: "ltr", browsers: both },
	{ tag: "eo", name: "Esperanto", direction: "ltr", browsers: firefox },
	{ tag: "es", name: "Spanish", direction: "ltr", browsers: chrome },
	{
		tag: "es-419",
		name: "Spanish (Latin America)",
		direction: "ltr",
		browsers: chrome,
	},
	{
		tag: "es-AR",
		name: "Spanish (Argentina)",
		direction: "ltr",
		browsers: firefox,
	},
	{
		tag: "es-CL",
		name: "Spanish (Chile)",
		direction: "ltr",
		browsers: firefox,
	},
	{
		tag: "es-ES",
		name: "Spanish (Spain)",
		direction: "ltr",
		browsers: firefox,
	},
	{ tag: "es-MX", name: "Spanish (Mexico)", direction: "ltr", browsers: both },
	{ tag: "es-US", name: "Spanish (US)", direction: "ltr", browsers: chrome },
	{ tag: "et", name: "Estonian", direction: "ltr", browsers: both },
	{ tag: "eu", name: "Basque", direction: "ltr", browsers: both },
	{ tag: "fa", name: "Persian", direction: "rtl", browsers: both },
	{ tag: "ff", name: "Fulah", direction: "ltr", browsers: firefox },
	{ tag: "fi", name: "Finnish", direction: "ltr", browsers: both },
	{ tag: "fil", name: "Filipino", direction: "ltr", browsers: both },
	{ tag: "fr", name: "French", direction: "ltr", browsers: both },
	{ tag: "fr-CA", name: "French (Canada)", direction: "ltr", browsers: chrome },
	{ tag: "fur", name: "Friulian", direction: "ltr", browsers: firefox },
	{
		tag: "fy-NL",
		name: "Western Frisian",
		direction: "ltr",
		browsers: firefox,
	},
	{ tag: "ga-IE", name: "Irish", direction: "ltr", browsers: firefox },
	{ tag: "gd", name: "Scottish Gaelic", direction: "ltr", browsers: firefox },
	{ tag: "gl", name: "Galician", direction: "ltr", browsers: both },
	{ tag: "gn", name: "Guarani", direction: "ltr", browsers: firefox },
	{ tag: "gu", name: "Gujarati", direction: "ltr", browsers: chrome },
	{
		tag: "gu-IN",
		name: "Gujarati (India)",
		direction: "ltr",
		browsers: firefox,
	},
	{ tag: "he", name: "Hebrew", direction: "rtl", browsers: both },
	{ tag: "hi", name: "Hindi", direction: "ltr", browsers: chrome },
	{ tag: "hi-IN", name: "Hindi (India)", direction: "ltr", browsers: firefox },
	{ tag: "hr", name: "Croatian", direction: "ltr", browsers: both },
	{ tag: "hsb", name: "Upper Sorbian", direction: "ltr", browsers: firefox },
	{ tag: "hu", name: "Hungarian", direction: "ltr", browsers: both },
	{ tag: "hy", name: "Armenian", direction: "ltr", browsers: chrome },
	{
		tag: "hy-AM",
		name: "Armenian (Armenia)",
		direction: "ltr",
		browsers: firefox,
	},
	{ tag: "ia", name: "Interlingua", direction: "ltr", browsers: firefox },
	{ tag: "id", name: "Indonesian", direction: "ltr", browsers: both },
	{ tag: "is", name: "Icelandic", direction: "ltr", browsers: both },
	{ tag: "it", name: "Italian", direction: "ltr", browsers: both },
	{ tag: "ja", name: "Japanese", direction: "ltr", browsers: both },
	{ tag: "ka", name: "Georgian", direction: "ltr", browsers: both },
	{ tag: "kab", name: "Kabyle", direction: "ltr", browsers: firefox },
	{ tag: "kk", name: "Kazakh", direction: "ltr", browsers: both },
	{ tag: "km", name: "Khmer", direction: "ltr", browsers: both },
	{ tag: "kn", name: "Kannada", direction: "ltr", browsers: both },
	{ tag: "ko", name: "Korean", direction: "ltr", browsers: both },
	{ tag: "ky", name: "Kyrgyz", direction: "ltr", browsers: chrome },
	{ tag: "lij", name: "Ligurian", direction: "ltr", browsers: firefox },
	{ tag: "lo", name: "Lao", direction: "ltr", browsers: chrome },
	{ tag: "lt", name: "Lithuanian", direction: "ltr", browsers: both },
	{ tag: "lv", name: "Latvian", direction: "ltr", browsers: both },
	{ tag: "mk", name: "Macedonian", direction: "ltr", browsers: both },
	{ tag: "ml", name: "Malayalam", direction: "ltr", browsers: chrome },
	{ tag: "mn", name: "Mongolian", direction: "ltr", browsers: chrome },
	{ tag: "mr", name: "Marathi", direction: "ltr", browsers: both },
	{ tag: "ms", name: "Malay", direction: "ltr", browsers: both },
	{ tag: "my", name: "Burmese", direction: "ltr", browsers: both },
	{ tag: "nb", name: "Norwegian Bokmål", direction: "ltr", browsers: chrome },
	{
		tag: "nb-NO",
		name: "Norwegian Bokmål (Norway)",
		direction: "ltr",
		browsers: firefox,
	},
	{ tag: "ne", name: "Nepali", direction: "ltr", browsers: chrome },
	{ tag: "ne-NP", name: "Nepali (Nepal)", direction: "ltr", browsers: firefox },
	{ tag: "nl", name: "Dutch", direction: "ltr", browsers: both },
	{
		tag: "nn-NO",
		name: "Norwegian Nynorsk (Norway)",
		direction: "ltr",
		browsers: firefox,
	},
	{ tag: "oc", name: "Occitan", direction: "ltr", browsers: firefox },
	{ tag: "or", name: "Odia", direction: "ltr", browsers: chrome },
	{ tag: "pa", name: "Punjabi", direction: "ltr", browsers: chrome },
	{
		tag: "pa-IN",
		name: "Punjabi (India)",
		direction: "ltr",
		browsers: firefox,
	},
	{ tag: "pl", name: "Polish", direction: "ltr", browsers: both },
	{
		tag: "pt-BR",
		name: "Portuguese (Brazil)",
		direction: "ltr",
		browsers: both,
	},
	{
		tag: "pt-PT",
		name: "Portuguese (Portugal)",
		direction: "ltr",
		browsers: both,
	},
	{ tag: "rm", name: "Romansh", direction: "ltr", browsers: firefox },
	{ tag: "ro", name: "Romanian", direction: "ltr", browsers: both },
	{ tag: "ru", name: "Russian", direction: "ltr", browsers: both },
	{ tag: "sat", name: "Santali", direction: "ltr", browsers: firefox },
	{ tag: "sc", name: "Sardinian", direction: "ltr", browsers: firefox },
	{ tag: "sco", name: "Scots", direction: "ltr", browsers: firefox },
	{ tag: "si", name: "Sinhala", direction: "ltr", browsers: both },
	{ tag: "sk", name: "Slovak", direction: "ltr", browsers: both },
	{ tag: "skr", name: "Saraiki", direction: "rtl", browsers: firefox },
	{ tag: "sl", name: "Slovenian", direction: "ltr", browsers: both },
	{ tag: "son", name: "Songhay", direction: "ltr", browsers: firefox },
	{ tag: "sq", name: "Albanian", direction: "ltr", browsers: both },
	{ tag: "sr", name: "Serbian", direction: "ltr", browsers: both },
	{
		tag: "sr-Latn",
		name: "Serbian (Latin)",
		direction: "ltr",
		browsers: chrome,
	},
	{ tag: "sv", name: "Swedish", direction: "ltr", browsers: chrome },
	{
		tag: "sv-SE",
		name: "Swedish (Sweden)",
		direction: "ltr",
		browsers: firefox,
	},
	{ tag: "sw", name: "Swahili", direction: "ltr", browsers: chrome },
	{ tag: "szl", name: "Silesian", direction: "ltr", browsers: firefox },
	{ tag: "ta", name: "Tamil", direction: "ltr", browsers: both },
	{ tag: "te", name: "Telugu", direction: "ltr", browsers: both },
	{ tag: "tg", name: "Tajik", direction: "ltr", browsers: firefox },
	{ tag: "th", name: "Thai", direction: "ltr", browsers: both },
	{ tag: "tr", name: "Turkish", direction: "ltr", browsers: both },
	{
		tag: "trs",
		name: "Chicahuaxtla Triqui",
		direction: "ltr",
		browsers: firefox,
	},
	{ tag: "uk", name: "Ukrainian", direction: "ltr", browsers: both },
	{ tag: "ur", name: "Urdu", direction: "rtl", browsers: both },
	{ tag: "uz", name: "Uzbek", direction: "ltr", browsers: both },
	{ tag: "vi", name: "Vietnamese", direction: "ltr", browsers: both },
	{ tag: "xh", name: "Xhosa", direction: "ltr", browsers: firefox },
	{
		tag: "zh-CN",
		name: "Chinese (Simplified)",
		direction: "ltr",
		browsers: both,
	},
	{
		tag: "zh-HK",
		name: "Chinese (Hong Kong)",
		direction: "ltr",
		browsers: chrome,
	},
	{
		tag: "zh-TW",
		name: "Chinese (Traditional)",
		direction: "ltr",
		browsers: both,
	},
	{ tag: "zu", name: "Zulu", direction: "ltr", browsers: chrome },
];
