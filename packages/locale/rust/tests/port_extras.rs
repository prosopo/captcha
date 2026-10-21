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

// Rust-only checks of the JS semantics the port reproduces.

use serde_json::{json, Map, Value};

use crate::catalogue::Catalogues;
use crate::detector::detect_language;
use crate::js::{byte_offset, js_trim, number_to_string, object_keys};
use crate::language_preference::LanguageRequest;
use crate::language_utils::{best_match_from_codes, to_resolve_hierarchy};
use crate::languages::{Language, LANGUAGES};
use crate::tests::read_locale;
use crate::translation_key::{get_leaf_field_path, LeafPathError};
use crate::translator::{I18n, TranslateOptions};

#[test]
fn object_keys_puts_array_indices_first() {
    let Value::Object(map) = json!({ "b": 1, "2": 1, "a": 1, "1": 1, "01": 1 }) else {
        unreachable!()
    };
    let map: Map<String, Value> = map;
    assert_eq!(object_keys(&map), ["1", "2", "b", "a", "01"]);
}

#[test]
fn numbers_format_as_javascript_does() {
    assert_eq!(number_to_string(1.0), "1");
    assert_eq!(number_to_string(-0.0), "0");
    assert_eq!(number_to_string(1e21), "1e+21");
    assert_eq!(number_to_string(0.1), "0.1");
    assert_eq!(number_to_string(f64::NAN), "NaN");
    assert_eq!(number_to_string(f64::INFINITY), "Infinity");
}

#[test]
fn trim_uses_the_ecmascript_whitespace_set() {
    assert_eq!(js_trim("\u{feff}\u{a0} de \u{3000}"), "de");
    assert_eq!(js_trim("\u{85}de"), "\u{85}de");
}

#[test]
fn utf16_offsets_map_to_byte_offsets() {
    assert_eq!(byte_offset("é😀x", 0), Some(0));
    assert_eq!(byte_offset("é😀x", 1), Some(2));
    assert_eq!(byte_offset("é😀x", 3), Some(6));
    assert_eq!(byte_offset("é😀x", 4), Some(7));
    assert_eq!(byte_offset("é😀x", 5), None);
}

#[test]
fn leaf_paths_reject_null_as_object_keys_does() {
    let error: LeafPathError =
        get_leaf_field_path(&json!({ "section": { "broken": null } })).unwrap_err();
    assert_eq!(
        error.to_string(),
        "Cannot convert undefined or null to object"
    );
}

#[test]
fn every_language_is_its_own_best_match() {
    for language in LANGUAGES {
        assert_eq!(best_match_from_codes(&[language.code()]), language.code());
    }
}

#[test]
fn regional_catalogues_resolve_through_their_base_language() {
    assert_eq!(to_resolve_hierarchy("pt-BR"), ["pt-BR", "pt", "en"]);
    assert_eq!(to_resolve_hierarchy("zh-TW"), ["zh-TW", "zh", "en"]);
    assert_eq!(to_resolve_hierarchy("pt_BR"), ["pt", "en"]);
    assert_eq!(to_resolve_hierarchy("en"), ["en"]);
    assert_eq!(to_resolve_hierarchy("cimode"), ["cimode", "en"]);
}

#[test]
fn repeated_language_headers_are_joined_as_node_joins_them() {
    let request: LanguageRequest = LanguageRequest::from_parts(
        None,
        [
            ("prosopo-lang", "xx"),
            ("Prosopo-Lang", "de"),
            ("accept-language", "fr"),
        ],
    );
    assert_eq!(request.prosopo_lang.as_deref(), Some("xx, de"));
    assert_eq!(detect_language(&request), Language::German);
}

#[test]
fn every_supported_language_is_loaded_from_the_files() {
    let i18n: &I18n = crate::tests::files_i18n();
    for language in LANGUAGES {
        assert!(
            i18n.catalogues()
                .has_language_some_translations(language.code()),
            "{language}"
        );
    }
    assert!(!i18n.catalogues().has_language_some_translations("xx"));
}

#[test]
fn escape_value_is_configurable() {
    let Value::Object(resources) = json!({ "en": { "translation": { "greet": "Hi {{name}}" } } })
    else {
        unreachable!()
    };
    let options: TranslateOptions = TranslateOptions::new().value("name", "<b>");
    let escaped: I18n = I18n::new(Catalogues::from_resources(resources.clone()));
    let raw: I18n = I18n::new(Catalogues::from_resources(resources)).with_escape_value(false);
    assert_eq!(escaped.t("en", "greet", &options), "Hi &lt;b&gt;");
    assert_eq!(raw.t("en", "greet", &options), "Hi <b>");
}

#[test]
fn shipped_catalogues_use_no_unported_i18next_features() {
    let plural = regex::Regex::new(r"_(zero|one|two|few|many|other)$").expect("valid regex");
    let formatted = regex::Regex::new(r"\{\{[^}]*,[^}]*\}\}").expect("valid regex");
    for language in LANGUAGES {
        for (key, value) in crate::tests::flatten(&read_locale(language.code())) {
            assert!(!plural.is_match(&key), "plural key {language}/{key}");
            let text: &str = value.as_str().unwrap_or_default();
            assert!(!text.contains("$t("), "nesting in {language}/{key}");
            assert!(!formatted.is_match(text), "formatting in {language}/{key}");
        }
    }
}
