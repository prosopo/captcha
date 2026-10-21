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

//! Server-side port of `@prosopo/locale`: the language catalogues, the
//! request language detector and the subset of i18next the provider uses.

pub mod catalogue;
pub mod detector;
pub mod error_message;
pub mod interpolator;
mod js;
pub mod language_preference;
pub mod language_utils;
pub mod languages;
pub mod translation_key;
pub mod translator;

#[cfg(test)]
mod equivalence;
#[cfg(test)]
mod tests;

pub use catalogue::{default_locales_directory, locales_directory, Catalogues, LoadProblem};
pub use detector::detect_language;
pub use error_message::{localise_error_message, KeyedErrorMessage};
pub use language_preference::{
    language_headers, match_language, match_language_tag, negotiate_language, parse_language_list,
    request_language, resolve_language_list, LanguageRequest, LANGUAGE_HEADER,
    LANGUAGE_QUERY_PARAM,
};
pub use languages::{is_language, Language, FALLBACK_LANGUAGE, LANGUAGES, LANGUAGE_CODES};
pub use translation_key::{
    english_text, get_leaf_field_path, is_target_key, is_translation_key,
    is_widget_translation_key, target_keys, translation_keys, LeafPathError, Namespace, NAMESPACES,
};
pub use translator::{
    can_translate, FixedT, I18n, I18nLookup, InterpolationValue, TranslateOptions,
};
