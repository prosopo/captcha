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

// Ported from src/tests/localePlaceholders.unit.test.ts

use std::collections::HashMap;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use crate::languages::{Language, LANGUAGES};
use crate::tests::{flatten, read_locale};

static PLACEHOLDER: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\{\{[^}]*\}\}").expect("valid regex"));
static WHITESPACE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s+").expect("valid regex"));

fn placeholders(text: &str) -> String {
    let mut found: Vec<String> = PLACEHOLDER
        .find_iter(text)
        .map(|token| WHITESPACE.replace_all(token.as_str(), "").into_owned())
        .collect();
    found.sort();
    found.join(",")
}

fn strings(language: &str) -> Vec<(String, String)> {
    flatten(&read_locale(language))
        .into_iter()
        .filter_map(|(key, value)| match value {
            Value::String(text) => Some((key, text)),
            _ => None,
        })
        .collect()
}

#[test]
fn every_locale_keeps_every_placeholder_of_the_en_source() {
    let en: HashMap<String, String> = strings("en").into_iter().collect();
    for language in LANGUAGES
        .iter()
        .filter(|language| **language != Language::English)
    {
        let mismatches: Vec<String> = strings(language.code())
            .into_iter()
            .filter(|(key, value)| {
                en.get(key)
                    .is_some_and(|english| placeholders(value) != placeholders(english))
            })
            .map(|(key, value)| format!("{key}: {value}"))
            .collect();
        assert!(mismatches.is_empty(), "{language}: {mismatches:?}");
    }
}

#[test]
fn hi_translations_keep_their_devanagari_vowel_signs() {
    let letter: Regex = Regex::new(r"[\u{0904}-\u{0939}\u{0958}-\u{0961}]").expect("valid regex");
    let sign: Regex =
        Regex::new(r"[\u{0900}-\u{0903}\u{093A}-\u{094F}\u{0955}-\u{0957}\u{0962}\u{0963}]")
            .expect("valid regex");
    let stripped: Vec<String> = strings("hi")
        .into_iter()
        .filter(|(_, value)| letter.find_iter(value).count() >= 4 && !sign.is_match(value))
        .map(|(key, value)| format!("{key}: {value}"))
        .collect();
    assert!(stripped.is_empty(), "{stripped:?}");
}
