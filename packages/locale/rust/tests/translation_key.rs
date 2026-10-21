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

// Ported from src/tests/translationKey.unit.test.ts

use std::collections::{BTreeMap, HashSet};

use serde_json::{json, Map, Value};

use crate::catalogue::default_locales_directory;
use crate::translation_key::{
    english_text, get_leaf_field_path, is_target_key, is_translation_key,
    is_widget_translation_key, target_keys, translation_keys, Namespace, NAMESPACES,
};
use crate::translator::{can_translate, I18nLookup, TranslateOptions};

const WIDGET_SECTIONS: [&str; 6] = [
    "WIDGET",
    "API",
    "CAPTCHA",
    "GENERAL",
    "ACCOUNT",
    "DEVELOPER",
];

fn english(namespace: Namespace) -> Value {
    let path = default_locales_directory()
        .join("en")
        .join(format!("{}.json", namespace.name()));
    serde_json::from_str(&std::fs::read_to_string(path).expect("catalogue")).expect("JSON")
}

fn leaves(tree: Value) -> Vec<String> {
    get_leaf_field_path(&tree).expect("no nulls")
}

#[test]
fn returns_no_paths_for_a_bare_string() {
    assert!(leaves(json!("a string")).is_empty());
}

#[test]
fn returns_no_paths_for_the_empty_string() {
    assert!(leaves(json!("")).is_empty());
}

#[test]
fn emits_a_top_level_string_value_under_its_own_key() {
    assert_eq!(leaves(json!({ "topLevel": "value" })), ["topLevel"]);
}

#[test]
fn emits_section_key_for_a_one_level_deep_section() {
    assert_eq!(
        leaves(json!({ "section": { "key": "value" } })),
        ["section.key"]
    );
}

#[test]
fn emits_every_key_of_a_section_in_insertion_order() {
    assert_eq!(
        leaves(json!({ "section": { "first": "1", "second": "2", "third": "3" } })),
        ["section.first", "section.second", "section.third"]
    );
}

#[test]
fn recurses_to_arbitrary_depth() {
    assert_eq!(
        leaves(json!({ "a": { "b": { "c": { "d": "leaf" } } } })),
        ["a.b.c.d"]
    );
}

#[test]
fn handles_sibling_branches_of_differing_depth() {
    assert_eq!(
        leaves(json!({ "shallow": { "key": "v" }, "deep": { "nested": { "key": "v" } } })),
        ["shallow.key", "deep.nested.key"]
    );
}

#[test]
fn returns_no_paths_for_an_empty_object() {
    assert!(leaves(json!({})).is_empty());
}

#[test]
fn drops_an_empty_nested_section_rather_than_erroring() {
    assert!(leaves(json!({ "section": {} })).is_empty());
}

#[test]
fn keeps_populated_siblings_when_one_section_is_empty() {
    assert_eq!(
        leaves(json!({ "empty": {}, "full": { "key": "v" } })),
        ["full.key"]
    );
}

#[test]
fn does_not_mutate_the_input() {
    let node: Value = json!({ "section": { "key": "value" } });
    let snapshot: String = node.to_string();
    get_leaf_field_path(&node).expect("no nulls");
    assert_eq!(node.to_string(), snapshot);
}

fn expected_keys() -> Vec<String> {
    [Namespace::Widget, Namespace::Target, Namespace::Server]
        .into_iter()
        .flat_map(|namespace| leaves(english(namespace)))
        .collect()
}

#[test]
fn translation_keys_is_non_empty() {
    assert!(!expected_keys().is_empty());
}

#[test]
fn translation_keys_is_exactly_the_set_derived_from_the_english_translation() {
    let actual: HashSet<&String> = translation_keys().iter().collect();
    let expected: Vec<String> = expected_keys();
    assert_eq!(actual, expected.iter().collect::<HashSet<&String>>());
}

#[test]
fn translation_keys_has_each_key_in_one_namespace_only() {
    let keys: Vec<String> = expected_keys();
    assert_eq!(translation_keys().len(), keys.len());
    assert_eq!(keys.iter().collect::<HashSet<&String>>().len(), keys.len());
}

#[test]
fn translation_keys_holds_leaves_not_section_names() {
    let keys: Vec<String> = expected_keys();
    let section: &str = keys[0].split('.').next().expect("a section");
    assert!(!translation_keys().iter().any(|key| key == section));
}

#[test]
fn translation_keys_does_not_contain_a_key_absent_from_english() {
    assert!(!translation_keys().iter().any(|key| key == "no.such.key"));
}

#[test]
fn translation_keys_does_not_contain_the_empty_string() {
    assert!(!translation_keys().iter().any(String::is_empty));
}

#[test]
fn is_translation_key_accepts_a_leaf_of_the_english_catalogue() {
    assert!(is_translation_key("WIDGET.I_AM_HUMAN"));
    assert!(is_translation_key("API.INVALID_SITE_KEY"));
}

#[test]
fn is_translation_key_rejects_a_section_a_mistyped_key_free_text_and_empty() {
    assert!(!is_translation_key("WIDGET"));
    assert!(!is_translation_key("WIDGET.I_AM_HUMANN"));
    assert!(!is_translation_key("Invalid site key"));
    assert!(!is_translation_key(""));
}

#[test]
fn target_keys_is_every_target_label_of_the_english_catalogue() {
    let target: Value = english(Namespace::Target);
    let labels: Vec<String> = target["TARGET"]
        .as_object()
        .expect("TARGET")
        .keys()
        .cloned()
        .collect();
    assert_eq!(target_keys(), labels.as_slice());
}

#[test]
fn target_keys_is_the_target_leaves_of_translation_keys_without_the_prefix() {
    let from_keys: HashSet<&str> = translation_keys()
        .iter()
        .filter_map(|key| key.strip_prefix("TARGET."))
        .collect();
    assert_eq!(
        target_keys()
            .iter()
            .map(String::as_str)
            .collect::<HashSet<&str>>(),
        from_keys
    );
}

#[test]
fn is_target_key_accepts_a_label_including_a_hyphenated_one() {
    assert!(is_target_key("owl"));
    assert!(is_target_key("fire-hydrant"));
}

#[test]
fn is_target_key_rejects_the_prefixed_key_a_section_an_unknown_label_and_empty() {
    assert!(!is_target_key("TARGET.owl"));
    assert!(!is_target_key("TARGET"));
    assert!(!is_target_key("not-a-label"));
    assert!(!is_target_key(""));
}

#[test]
fn is_target_key_is_case_sensitive() {
    assert!(!is_target_key("Owl"));
}

#[test]
fn namespaces_keep_i18next_default_namespace_for_server_only_text() {
    let names: Vec<&str> = NAMESPACES
        .iter()
        .map(|namespace| namespace.name())
        .collect();
    assert_eq!(names, ["widget", "target", "translation"]);
}

#[test]
fn namespaces_put_widget_sections_in_widget_labels_in_target_and_the_rest_in_translation() {
    let mut widget: Vec<String> = english(Namespace::Widget)
        .as_object()
        .expect("widget")
        .keys()
        .cloned()
        .collect();
    widget.sort();
    let mut sections: Vec<&str> = WIDGET_SECTIONS.to_vec();
    sections.sort();
    assert_eq!(widget, sections);
    let target: Vec<String> = english(Namespace::Target)
        .as_object()
        .expect("target")
        .keys()
        .cloned()
        .collect();
    assert_eq!(target, ["TARGET"]);
    for section in english(Namespace::Server)
        .as_object()
        .expect("translation")
        .keys()
    {
        assert!(!WIDGET_SECTIONS.contains(&section.as_str()), "{section}");
        assert_ne!(section, "TARGET");
    }
}

#[test]
fn is_widget_translation_key_accepts_every_key_in_the_widget_namespace() {
    for key in leaves(english(Namespace::Widget)) {
        assert!(is_widget_translation_key(&key), "{key}");
    }
}

#[test]
fn is_widget_translation_key_rejects_keys_only_the_server_has_text_for() {
    assert!(!is_widget_translation_key("TARGET.owl"));
    assert!(!is_widget_translation_key("DATABASE.UNKNOWN"));
    assert!(is_translation_key("DATABASE.UNKNOWN"));
}

#[test]
fn is_widget_translation_key_rejects_a_section_free_text_and_empty() {
    assert!(!is_widget_translation_key("WIDGET"));
    assert!(!is_widget_translation_key("Invalid site key"));
    assert!(!is_widget_translation_key(""));
}

#[test]
fn english_text_reads_each_namespace_english_text() {
    assert_eq!(
        english_text("TARGET.owl"),
        english(Namespace::Target)["TARGET"]["owl"]
    );
    assert_eq!(
        english_text("WIDGET.SELECT_ALL"),
        english(Namespace::Widget)["WIDGET"]["SELECT_ALL"]
    );
    assert_eq!(
        english_text("DATABASE.UNKNOWN"),
        english(Namespace::Server)["DATABASE"]["UNKNOWN"]
    );
}

fn flatten(tree: &Map<String, Value>, prefix: &str, into: &mut BTreeMap<String, String>) {
    for (key, value) in tree {
        match value {
            Value::Object(child) => flatten(child, &format!("{prefix}{key}."), into),
            Value::String(text) => {
                into.insert(format!("{prefix}{key}"), text.clone());
            }
            _ => {}
        }
    }
}

#[test]
fn english_text_matches_the_flattened_english_catalogues_for_every_key() {
    let mut english_flat: BTreeMap<String, String> = BTreeMap::new();
    for namespace in [Namespace::Server, Namespace::Widget, Namespace::Target] {
        flatten(
            english(namespace).as_object().expect("object"),
            "",
            &mut english_flat,
        );
    }
    for key in translation_keys() {
        if is_translation_key(key) {
            assert_eq!(Some(&english_text(key)), english_flat.get(key), "{key}");
        }
    }
}

struct Knowing(Vec<&'static str>);

impl I18nLookup for Knowing {
    fn t(&self, key: &str) -> String {
        key.to_owned()
    }

    fn t_with(&self, key: &str, _options: &TranslateOptions) -> String {
        key.to_owned()
    }

    fn exists(&self, key: &str) -> bool {
        self.0.contains(&key)
    }
}

#[test]
fn can_translate_accepts_a_key_the_instance_has_text_for() {
    assert!(can_translate(
        &Knowing(vec!["WIDGET.SELECT_ALL"]),
        "WIDGET.SELECT_ALL"
    ));
}

#[test]
fn can_translate_rejects_a_key_the_instance_lacks_even_one_english_has() {
    assert!(!can_translate(&Knowing(vec![]), "TARGET.owl"));
    assert!(!can_translate(
        &Knowing(vec!["WIDGET.SELECT_ALL"]),
        "Free text."
    ));
}
