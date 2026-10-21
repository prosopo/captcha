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

// Ported from src/tests/i18SharedOptions.unit.test.ts

use std::collections::HashSet;

use crate::language_utils::to_resolve_hierarchy;
use crate::languages::{FALLBACK_LANGUAGE, LANGUAGES, LANGUAGE_CODES};

#[test]
fn falls_back_to_english() {
    assert_eq!(FALLBACK_LANGUAGE.code(), "en");
}

#[test]
fn supports_exactly_the_declared_language_codes() {
    let supported: HashSet<&str> = LANGUAGE_CODES.iter().copied().collect();
    let declared: HashSet<&str> = LANGUAGES.iter().map(|language| language.code()).collect();
    assert_eq!(supported, declared);
}

// nonExplicitSupportedLngs is false: `en-GB` is not itself supported, so it
// resolves through its base language rather than being served as `en-GB`.
#[test]
fn does_not_accept_non_explicit_regional_variants() {
    assert_eq!(to_resolve_hierarchy("en-GB"), ["en"]);
    assert_eq!(to_resolve_hierarchy("de-AT"), ["de", "en"]);
}
