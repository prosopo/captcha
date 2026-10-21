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

//! The provider's request language detector (requestLanguageDetector.ts)
//! together with what i18next-http-middleware does with its answer.

use crate::language_preference::{request_language, LanguageRequest};
use crate::language_utils::best_match_from_codes;
use crate::languages::{Language, FALLBACK_LANGUAGE};

/// The language a request is served in: [`request_language`], passed through
/// i18next's `getBestMatchFromCodes` and fallback check as the middleware
/// does. The HTTP layer reports it in a `Content-Language` response header
/// and sets no cookie.
pub fn detect_language(request: &LanguageRequest) -> Language {
    let detected: Language = request_language(request);
    let found: String = best_match_from_codes(&[detected.code()]);
    let is_fallback_substitute: bool = !found.eq_ignore_ascii_case(detected.code())
        && found.eq_ignore_ascii_case(FALLBACK_LANGUAGE.code());
    if is_fallback_substitute {
        return FALLBACK_LANGUAGE;
    }
    Language::from_code(&found).unwrap_or(FALLBACK_LANGUAGE)
}
