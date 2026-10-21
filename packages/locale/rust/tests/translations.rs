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

// Ported from src/tests/translations.unit.test.ts

use std::collections::HashSet;
use std::fs;
use std::sync::LazyLock;

use regex::Regex;

use crate::catalogue::default_locales_directory;
use crate::languages::{is_language, Language, LANGUAGES, LANGUAGE_CODES};
use crate::translation_key::NAMESPACES;

fn codes() -> Vec<&'static str> {
    LANGUAGES.iter().map(|language| language.code()).collect()
}

#[test]
fn is_non_empty() {
    assert!(!codes().is_empty());
}

#[test]
fn maps_english_language_names_to_bcp47_codes() {
    assert_eq!(Language::English.code(), "en");
    assert_eq!(Language::Chinese.code(), "zh");
    assert_eq!(Language::ChineseChina.code(), "zh-CN");
    assert_eq!(Language::PortugeseBrazil.code(), "pt-BR");
    assert_eq!(Language::PortugeseBrazil.name(), "portugeseBrazil");
}

#[test]
fn includes_the_fallback_language() {
    assert!(codes().contains(&"en"));
}

#[test]
fn has_no_duplicate_codes() {
    let unique: HashSet<&str> = codes().into_iter().collect();
    assert_eq!(unique.len(), codes().len());
}

static WELL_FORMED: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^[a-z]{2,3}(-[A-Z]{2})?$").expect("valid regex"));

#[test]
fn every_code_is_a_well_formed_lowercase_primary_language_tag() {
    for code in codes() {
        assert!(WELL_FORMED.is_match(code), "{code}");
    }
}

#[test]
fn every_code_has_a_locales_directory_with_every_namespace_file() {
    for code in codes() {
        for namespace in NAMESPACES {
            let file = default_locales_directory()
                .join(code)
                .join(format!("{}.json", namespace.name()));
            assert!(file.exists(), "missing {code}/{}", namespace.name());
        }
    }
}

#[test]
fn every_locales_directory_is_claimed_by_a_code() {
    for entry in fs::read_dir(default_locales_directory()).expect("locales directory") {
        let name: String = entry
            .expect("entry")
            .file_name()
            .to_string_lossy()
            .into_owned();
        assert!(
            codes().contains(&name.as_str()),
            "orphan locale directory {name}"
        );
    }
}

#[test]
fn is_language_accepts_every_declared_code() {
    for code in codes() {
        assert!(is_language(code), "{code}");
    }
}

#[test]
fn every_declared_code_is_in_language_codes() {
    let declared: HashSet<&str> = codes().into_iter().collect();
    let listed: HashSet<&str> = LANGUAGE_CODES.iter().copied().collect();
    assert_eq!(listed, declared);
}

#[test]
fn exposes_each_code_as_a_constant_for_use_in_code() {
    assert_eq!(Language::English.code(), "en");
}

#[test]
fn rejects_an_undeclared_language_code() {
    assert!(!is_language("xx"));
}

#[test]
fn rejects_the_empty_string() {
    assert!(!is_language(""));
}

#[test]
fn rejects_a_regional_variant_of_a_supported_language() {
    assert!(!is_language("en-GB"));
}

#[test]
fn is_case_sensitive() {
    assert!(!is_language("EN"));
}
