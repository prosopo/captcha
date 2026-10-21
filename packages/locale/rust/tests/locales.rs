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

// Ported from src/tests/locales.unit.test.ts

use std::collections::{BTreeSet, HashMap, HashSet};
use std::fs;
use std::sync::LazyLock;

use regex::Regex;
use serde_json::Value;

use crate::catalogue::default_locales_directory;
use crate::languages::{Language, LANGUAGES};
use crate::tests::{flatten, read_locale, read_namespace};
use crate::translation_key::NAMESPACES;

const KEPT_AS_IS: &str = include_str!("../../src/tests/keptAsIs.ts");

static KEPT: LazyLock<HashMap<String, HashSet<String>>> = LazyLock::new(|| {
    let body: &str = KEPT_AS_IS
        .split_once("= {")
        .map(|(_, body)| body)
        .expect("keptAsIs object literal");
    let entry: Regex =
        Regex::new(r#"(?s)(?:"([A-Za-z-]+)"|([a-z]+)):\s*\[([^\]]*)\]"#).expect("valid regex");
    let quoted: Regex = Regex::new(r#""([^"]+)""#).expect("valid regex");
    entry
        .captures_iter(body)
        .map(|captures| {
            let language: String = captures
                .get(1)
                .or_else(|| captures.get(2))
                .map(|m| m.as_str().to_owned())
                .expect("a language");
            let keys: HashSet<String> = quoted
                .captures_iter(&captures[3])
                .map(|key| key[1].to_owned())
                .collect();
            (language, keys)
        })
        .collect()
});

fn kept_for(language: Language) -> HashSet<String> {
    KEPT.get(language.code()).cloned().unwrap_or_default()
}

fn others() -> impl Iterator<Item = Language> {
    LANGUAGES
        .iter()
        .copied()
        .filter(|language| *language != Language::English)
}

fn english() -> HashMap<String, Value> {
    flatten(&read_locale("en")).into_iter().collect()
}

fn leaf_name(key: &str) -> &str {
    key.rsplit('.').next().unwrap_or(key)
}

fn script(language: Language) -> Option<&'static str> {
    Some(match language.code() {
        "am" => r"\p{Script=Ethiopic}",
        "ar" | "fa" | "ur" => r"\p{Script=Arabic}",
        "as" | "bn" => r"\p{Script=Bengali}",
        "be" | "bg" | "kk" | "ky" | "mk" | "mn" | "ru" | "sr" | "tg" | "uk" => {
            r"\p{Script=Cyrillic}"
        }
        "el" => r"\p{Script=Greek}",
        "gu" => r"\p{Script=Gujarati}",
        "he" => r"\p{Script=Hebrew}",
        "hi" | "mr" | "ne" => r"\p{Script=Devanagari}",
        "hy" => r"\p{Script=Armenian}",
        "ja" => r"[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]",
        "ka" => r"\p{Script=Georgian}",
        "km" => r"\p{Script=Khmer}",
        "kn" => r"\p{Script=Kannada}",
        "ko" => r"\p{Script=Hangul}",
        "lo" => r"\p{Script=Lao}",
        "ml" => r"\p{Script=Malayalam}",
        "my" => r"\p{Script=Myanmar}",
        "or" => r"\p{Script=Oriya}",
        "pa" => r"\p{Script=Gurmukhi}",
        "si" => r"\p{Script=Sinhala}",
        "ta" => r"\p{Script=Tamil}",
        "te" => r"\p{Script=Telugu}",
        "th" => r"\p{Script=Thai}",
        "zh" | "zh-CN" | "zh-HK" | "zh-TW" => r"\p{Script=Han}",
        _ => return None,
    })
}

fn homoglyph_script(language: Language) -> Option<&'static str> {
    Some(match language.code() {
        "be" | "bg" | "kk" | "ky" | "mk" | "mn" | "ru" | "sr" | "tg" | "uk" => {
            r"\p{Script=Cyrillic}"
        }
        "el" => r"\p{Script=Greek}",
        _ => return None,
    })
}

fn sorted_keys(tree: &serde_json::Map<String, Value>) -> Vec<String> {
    let mut keys: Vec<String> = flatten(tree).into_iter().map(|(key, _)| key).collect();
    keys.sort();
    keys
}

#[test]
fn every_language_has_one_file_per_namespace_each_with_the_keys_of_en() {
    let mut expected_files: Vec<String> = NAMESPACES
        .iter()
        .map(|namespace| format!("{}.json", namespace.name()))
        .collect();
    expected_files.sort();
    for language in LANGUAGES {
        let mut files: Vec<String> =
            fs::read_dir(default_locales_directory().join(language.code()))
                .expect("locale directory")
                .map(|entry| {
                    entry
                        .expect("entry")
                        .file_name()
                        .to_string_lossy()
                        .into_owned()
                })
                .collect();
        files.sort();
        assert_eq!(files, expected_files, "{language}");
        for namespace in NAMESPACES {
            assert_eq!(
                sorted_keys(&read_namespace(language.code(), namespace)),
                sorted_keys(&read_namespace("en", namespace)),
                "{language}/{}.json",
                namespace.name()
            );
        }
    }
}

#[test]
fn every_language_has_exactly_the_keys_of_en() {
    let en: HashMap<String, Value> = english();
    for language in LANGUAGES {
        let keys: Vec<String> = flatten(&read_locale(language.code()))
            .into_iter()
            .map(|(key, _)| key)
            .collect();
        let extra: Vec<&String> = keys.iter().filter(|key| !en.contains_key(*key)).collect();
        assert!(extra.is_empty(), "{language}: {extra:?}");
        let missing: Vec<&String> = en.keys().filter(|key| !keys.contains(key)).collect();
        assert!(missing.is_empty(), "{language}: {missing:?}");
    }
}

#[test]
fn every_language_has_a_non_empty_string_for_every_key() {
    for language in LANGUAGES {
        let bad: Vec<String> = flatten(&read_locale(language.code()))
            .into_iter()
            .filter(|(_, value)| {
                value
                    .as_str()
                    .is_none_or(|text| crate::js::js_trim(text).is_empty())
            })
            .map(|(key, _)| key)
            .collect();
        assert!(bad.is_empty(), "{language}: {bad:?}");
    }
}

#[test]
fn every_language_has_no_unicode_replacement_characters() {
    for language in LANGUAGES {
        let bad: Vec<String> = flatten(&read_locale(language.code()))
            .into_iter()
            .filter(|(_, value)| value.as_str().is_some_and(|text| text.contains('\u{FFFD}')))
            .map(|(key, _)| key)
            .collect();
        assert!(bad.is_empty(), "{language}: {bad:?}");
    }
}

#[test]
fn every_other_language_translates_every_value_apart_from_kept_as_is() {
    let en: HashMap<String, Value> = english();
    for language in others() {
        let kept: HashSet<String> = kept_for(language);
        let untranslated: Vec<String> = flatten(&read_locale(language.code()))
            .into_iter()
            .filter(|(key, value)| {
                !kept.contains(key)
                    && (Some(value) == en.get(key) || value.as_str() == Some(leaf_name(key)))
            })
            .map(|(key, value)| format!("{key}: {value}"))
            .collect();
        assert!(untranslated.is_empty(), "{language}: {untranslated:?}");
    }
}

#[test]
fn every_other_language_kept_as_is_entries_still_match_en() {
    let en: HashMap<String, Value> = english();
    for language in others() {
        let catalogue: HashMap<String, Value> =
            flatten(&read_locale(language.code())).into_iter().collect();
        let stale: BTreeSet<String> = kept_for(language)
            .into_iter()
            .filter(|key| {
                catalogue.get(key) != en.get(key)
                    && catalogue.get(key).and_then(Value::as_str) != Some(leaf_name(key))
            })
            .collect();
        assert!(stale.is_empty(), "{language}: {stale:?}");
    }
}

#[test]
fn every_non_latin_language_writes_every_value_in_its_own_script() {
    let mut checked: usize = 0;
    for language in others() {
        let Some(pattern) = script(language) else {
            continue;
        };
        let script: Regex = Regex::new(pattern).expect("valid regex");
        let kept: HashSet<String> = kept_for(language);
        let wrong: Vec<String> = flatten(&read_locale(language.code()))
            .into_iter()
            .filter(|(key, value)| {
                !kept.contains(key) && value.as_str().is_some_and(|text| !script.is_match(text))
            })
            .map(|(key, value)| format!("{key}: {value}"))
            .collect();
        assert!(wrong.is_empty(), "{language}: {wrong:?}");
        checked += 1;
    }
    assert_eq!(checked, 41);
}

#[test]
fn every_cyrillic_or_greek_language_has_no_latin_letters_inside_native_words() {
    let word: Regex = Regex::new(r"\p{L}+").expect("valid regex");
    let latin: Regex = Regex::new(r"\p{Script=Latin}").expect("valid regex");
    for language in others() {
        let Some(pattern) = homoglyph_script(language) else {
            continue;
        };
        let script: Regex = Regex::new(pattern).expect("valid regex");
        let mixed: Vec<String> = flatten(&read_locale(language.code()))
            .into_iter()
            .flat_map(|(key, value)| {
                let text: String = value.as_str().unwrap_or_default().to_owned();
                word.find_iter(&text)
                    .map(|found| found.as_str())
                    .filter(|found| script.is_match(found) && latin.is_match(found))
                    .map(|found| format!("{key}: {found}"))
                    .collect::<Vec<String>>()
            })
            .collect();
        assert!(mixed.is_empty(), "{language}: {mixed:?}");
    }
}

#[test]
fn every_language_ends_the_select_all_prompt_with_a_colon() {
    for language in LANGUAGES {
        let prompt: Option<Value> = flatten(&read_locale(language.code()))
            .into_iter()
            .find(|(key, _)| key == "WIDGET.SELECT_ALL")
            .map(|(_, value)| value);
        let text: &str = prompt.as_ref().and_then(Value::as_str).unwrap_or_default();
        assert!(
            text.ends_with([':', '\u{FF1A}', '\u{17D6}']),
            "{language}: {text}"
        );
    }
}
