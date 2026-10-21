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

use std::fmt;

use serde::{Deserialize, Deserializer, Serialize, Serializer};

macro_rules! languages {
	($($variant:ident => $code:literal, $name:literal;)*) => {
		/// A language we have a catalogue for (`Languages` in translations.ts).
		#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
		pub enum Language {
			$($variant,)*
		}

		/// Every language, in the declaration order of `Languages`.
		pub const LANGUAGES: &[Language] = &[$(Language::$variant,)*];

		/// `LanguageCodes`: every catalogue code, in declaration order.
		pub const LANGUAGE_CODES: &[&str] = &[$($code,)*];

		impl Language {
			/// The BCP 47 code, which is also the catalogue directory name.
			pub const fn code(self) -> &'static str {
				match self {
					$(Language::$variant => $code,)*
				}
			}

			/// The key this language has in the TS `Languages` object.
			pub const fn name(self) -> &'static str {
				match self {
					$(Language::$variant => $name,)*
				}
			}

			/// The language with exactly this code (case sensitive).
			pub fn from_code(code: &str) -> Option<Language> {
				match code {
					$($code => Some(Language::$variant),)*
					_ => None,
				}
			}
		}
	};
}

languages! {
    Afrikaans => "af", "afrikaans";
    Amharic => "am", "amharic";
    Aragonese => "an", "aragonese";
    Arabic => "ar", "arabic";
    Assamese => "as", "assamese";
    Asturian => "ast", "asturian";
    Azerbaijani => "az", "azerbaijani";
    Belarusian => "be", "belarusian";
    Bulgarian => "bg", "bulgarian";
    Bengali => "bn", "bengali";
    Bosnian => "bs", "bosnian";
    Catalan => "ca", "catalan";
    Czech => "cs", "czech";
    Welsh => "cy", "welsh";
    Danish => "da", "danish";
    German => "de", "german";
    Greek => "el", "greek";
    English => "en", "english";
    Esperanto => "eo", "esperanto";
    Spanish => "es", "spanish";
    Estonian => "et", "estonian";
    Basque => "eu", "basque";
    Persian => "fa", "persian";
    Finnish => "fi", "finnish";
    Filipino => "fil", "filipino";
    French => "fr", "french";
    Frisian => "fy", "frisian";
    Irish => "ga", "irish";
    ScottishGaelic => "gd", "scottishGaelic";
    Galician => "gl", "galician";
    Gujarati => "gu", "gujarati";
    Hebrew => "he", "hebrew";
    Hindi => "hi", "hindi";
    Croatian => "hr", "croatian";
    Hungarian => "hu", "hungarian";
    Armenian => "hy", "armenian";
    Interlingua => "ia", "interlingua";
    Indonesian => "id", "indonesian";
    Icelandic => "is", "icelandic";
    Italian => "it", "italian";
    Japanese => "ja", "japanese";
    Javanese => "jv", "javanese";
    Georgian => "ka", "georgian";
    Kazakh => "kk", "kazakh";
    Khmer => "km", "khmer";
    Kannada => "kn", "kannada";
    Korean => "ko", "korean";
    Kyrgyz => "ky", "kyrgyz";
    Lao => "lo", "lao";
    Lithuanian => "lt", "lithuanian";
    Latvian => "lv", "latvian";
    Macedonian => "mk", "macedonian";
    Malayalam => "ml", "malayalam";
    Mongolian => "mn", "mongolian";
    Marathi => "mr", "marathi";
    Malay => "ms", "malay";
    Burmese => "my", "burmese";
    Nepali => "ne", "nepali";
    Dutch => "nl", "dutch";
    NorwegianNynorsk => "nn", "norwegianNynorsk";
    Norwegian => "no", "norwegian";
    Occitan => "oc", "occitan";
    Odia => "or", "odia";
    Punjabi => "pa", "punjabi";
    Polish => "pl", "polish";
    Portuguese => "pt", "portuguese";
    PortugeseBrazil => "pt-BR", "portugeseBrazil";
    Romansh => "rm", "romansh";
    Romanian => "ro", "romanian";
    Russian => "ru", "russian";
    Scots => "sco", "scots";
    Sinhala => "si", "sinhala";
    Slovak => "sk", "slovak";
    Slovenian => "sl", "slovenian";
    Albanian => "sq", "albanian";
    Serbian => "sr", "serbian";
    Swedish => "sv", "swedish";
    Swahili => "sw", "swahili";
    Tamil => "ta", "tamil";
    Telugu => "te", "telugu";
    Tajik => "tg", "tajik";
    Thai => "th", "thai";
    Turkish => "tr", "turkish";
    Ukrainian => "uk", "ukrainian";
    Urdu => "ur", "urdu";
    Uzbek => "uz", "uzbek";
    Vietnamese => "vi", "vietnamese";
    Xhosa => "xh", "xhosa";
    Chinese => "zh", "chinese";
    ChineseChina => "zh-CN", "chineseChina";
    ChineseHongKong => "zh-HK", "chineseHongKong";
    ChineseTaiwan => "zh-TW", "chineseTaiwan";
    Zulu => "zu", "zulu";
}

/// i18next's `fallbackLng`.
pub const FALLBACK_LANGUAGE: Language = Language::English;

/// `isLanguage`: whether `value` is exactly one of the catalogue codes.
pub fn is_language(value: &str) -> bool {
    Language::from_code(value).is_some()
}

impl fmt::Display for Language {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.code())
    }
}

impl Serialize for Language {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(self.code())
    }
}

impl<'de> Deserialize<'de> for Language {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let code: String = String::deserialize(deserializer)?;
        Language::from_code(&code)
            .ok_or_else(|| serde::de::Error::custom(format!("unsupported language code {code}")))
    }
}
