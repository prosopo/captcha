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

use serde_json::{Map, Value};

use crate::catalogue::Catalogues;
use crate::error_message::{localise_error_message, KeyedErrorMessage};
use crate::js::number_to_string;
use crate::language_preference::{
    language_headers, match_language_tag, parse_language_list, request_language, LanguageRequest,
};
use crate::tests::files_i18n;
use crate::translation_key::{
    english_text, get_leaf_field_path, is_target_key, is_translation_key,
    is_widget_translation_key, target_keys, translation_keys,
};
use crate::translator::{I18n, I18nLookup, InterpolationValue, TranslateOptions};

const VECTORS: &str = include_str!("equivalence/vectors.json");

fn vectors() -> Value {
    serde_json::from_str(VECTORS).expect("vectors.json is valid JSON")
}

fn string(value: &Value) -> &str {
    value.as_str().expect("a string")
}

fn optional_string(value: &Value) -> Option<String> {
    value.as_str().map(str::to_owned)
}

fn strings(value: &Value) -> Vec<String> {
    value
        .as_array()
        .expect("an array")
        .iter()
        .map(|item| string(item).to_owned())
        .collect()
}

/// `firstString` from languagePreference.ts, applied to a parsed query value.
fn first_string(value: &Value) -> Option<String> {
    match value {
        Value::String(text) => Some(text.clone()),
        Value::Array(items) => items.first().and_then(Value::as_str).map(str::to_owned),
        _ => None,
    }
}

fn expected_text(value: &Value) -> String {
    match value {
        Value::String(text) => text.clone(),
        Value::Bool(flag) => flag.to_string(),
        Value::Number(number) => number_to_string(number.as_f64().expect("a finite number")),
        other => panic!("unexpected result {other}"),
    }
}

fn translate_options(value: &Value) -> TranslateOptions {
    let Value::Object(options) = value else {
        return TranslateOptions::default();
    };
    let mut translate: TranslateOptions = TranslateOptions {
        default_value: options.get("defaultValue").and_then(optional_string),
        lng: options.get("lng").and_then(optional_string),
        values: Vec::new(),
    };
    if let Some(Value::Object(values)) = options.get("values") {
        for (name, value) in values {
            let value: InterpolationValue = match value {
                Value::String(text) => InterpolationValue::String(text.clone()),
                Value::Number(number) => {
                    InterpolationValue::Number(number.as_f64().expect("finite"))
                }
                Value::Bool(flag) => InterpolationValue::Bool(*flag),
                Value::Null => InterpolationValue::Null,
                other => panic!("unexpected value {other}"),
            };
            translate.values.push((name.clone(), value));
        }
    }
    translate
}

#[test]
fn equivalence_parse_language_list() {
    let vectors: Value = vectors();
    for case in vectors["parseLanguageList"].as_array().expect("cases") {
        let input: &str = string(&case["input"]);
        assert_eq!(
            parse_language_list(Some(input)),
            strings(&case["output"]),
            "input {input:?}"
        );
    }
}

#[test]
fn equivalence_match_language_tag() {
    let vectors: Value = vectors();
    for case in vectors["matchLanguageTag"].as_array().expect("cases") {
        let tag: &str = string(&case["tag"]);
        assert_eq!(
            match_language_tag(tag).map(|language| language.code()),
            case["output"].as_str(),
            "tag {tag:?}"
        );
    }
}

#[test]
fn equivalence_language_headers() {
    let vectors: Value = vectors();
    for case in vectors["languageHeaders"].as_array().expect("cases") {
        let preferences: Vec<String> = strings(&case["preferences"]);
        let expected: Option<(String, String)> = case["output"]
            .as_object()
            .expect("an object")
            .iter()
            .next()
            .map(|(name, value)| (name.clone(), string(value).to_owned()));
        assert_eq!(
            language_headers(&preferences).map(|(name, value)| (name.to_owned(), value)),
            expected
        );
    }
}

#[test]
fn equivalence_request_language() {
    let vectors: Value = vectors();
    for case in vectors["requestLanguage"].as_array().expect("cases") {
        let request: LanguageRequest = LanguageRequest {
            query_lng: optional_string(&case["queryLng"]),
            prosopo_lang: optional_string(&case["prosopoLang"]),
            accept_language: optional_string(&case["acceptLanguage"]),
        };
        assert_eq!(
            request_language(&request).code(),
            string(&case["output"]),
            "{request:?}"
        );
    }
}

#[test]
fn equivalence_http_middleware() {
    let vectors: Value = vectors();
    let i18n: &I18n = files_i18n();
    for case in vectors["http"].as_array().expect("cases") {
        let request: LanguageRequest = LanguageRequest {
            query_lng: first_string(&case["parsedQueryLng"]),
            prosopo_lang: optional_string(&case["prosopoLang"]),
            accept_language: optional_string(&case["acceptLanguage"]),
        };
        let fixed = i18n.for_request(&request);
        assert_eq!(fixed.language(), string(&case["language"]), "{case}");
        assert_eq!(
            Some(fixed.language()),
            case["contentLanguage"].as_str(),
            "{case}"
        );
        assert!(case["setCookie"].is_null());
        for (key, expected) in case["translations"].as_object().expect("translations") {
            assert_eq!(fixed.t(key), string(expected), "{key} in {case}");
        }
        for (key, expected) in case["exists"].as_object().expect("exists") {
            assert_eq!(
                fixed.exists(key),
                expected.as_bool().expect("a bool"),
                "{key}"
            );
        }
    }
}

#[test]
fn equivalence_translation_keys() {
    let vectors: Value = vectors();
    assert_eq!(
        translation_keys(),
        strings(&vectors["translationKeys"]).as_slice()
    );
    assert_eq!(target_keys(), strings(&vectors["targetKeys"]).as_slice());
    for case in vectors["keyChecks"].as_array().expect("cases") {
        let value: &str = string(&case["value"]);
        assert_eq!(
            is_translation_key(value),
            case["isTranslationKey"] == true,
            "{value}"
        );
        assert_eq!(
            is_widget_translation_key(value),
            case["isWidgetTranslationKey"] == true,
            "{value}"
        );
        assert_eq!(is_target_key(value), case["isTargetKey"] == true, "{value}");
        assert_eq!(english_text(value), string(&case["englishText"]), "{value}");
    }
}

#[test]
fn equivalence_leaf_paths() {
    let vectors: Value = vectors();
    for case in vectors["leafPaths"].as_array().expect("cases") {
        assert_eq!(
            get_leaf_field_path(&case["tree"]).expect("no nulls"),
            strings(&case["output"]),
            "{}",
            case["tree"]
        );
    }
}

#[test]
fn equivalence_error_messages() {
    let vectors: Value = vectors();
    let i18n: &I18n = files_i18n();
    for case in vectors["errorMessages"].as_array().expect("cases") {
        let fixed = i18n.fixed_t(string(&case["language"]));
        let error: KeyedErrorMessage = KeyedErrorMessage {
            message: string(&case["message"]).to_owned(),
            key: optional_string(&case["key"]),
        };
        assert_eq!(
            localise_error_message(Some(&fixed), &error),
            string(&case["result"]),
            "{case}"
        );
    }
}

#[test]
fn equivalence_translations() {
    let vectors: Value = vectors();
    let resources: Map<String, Value> = vectors["syntheticResources"]
        .as_object()
        .expect("resources")
        .clone();
    let synthetic: I18n = I18n::new(Catalogues::from_resources(resources.clone()));
    let unescaped: I18n = I18n::new(Catalogues::from_resources(resources)).with_escape_value(false);
    let mut checked: usize = 0;
    for group in vectors["translations"].as_array().expect("groups") {
        let i18n: &I18n = match string(&group["instance"]) {
            "files" => files_i18n(),
            "synthetic" => &synthetic,
            "syntheticUnescaped" => &unescaped,
            other => panic!("unknown instance {other}"),
        };
        let language: &str = string(&group["language"]);
        let fixed = i18n.fixed_t(language);
        assert_eq!(
            fixed.language(),
            string(&group["resolvedLanguage"]),
            "{language}"
        );
        for call in group["calls"].as_array().expect("calls") {
            let key: &str = string(&call[0]);
            let options: TranslateOptions = translate_options(&call[1]);
            assert_eq!(
                fixed.t_with(key, &options),
                expected_text(&call[2]),
                "{} {language} {key:?} {options:?}",
                string(&group["instance"])
            );
            assert_eq!(
                i18n.exists_with(fixed.language(), key, &options),
                call[3] == true,
                "exists {language} {key:?} {options:?}"
            );
            checked += 1;
        }
    }
    assert!(checked > 1000);
}
