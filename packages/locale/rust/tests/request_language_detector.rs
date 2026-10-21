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

// Ported from src/tests/requestLanguageDetector.unit.test.ts

use std::sync::LazyLock;

use serde_json::{json, Map, Value};

use crate::catalogue::Catalogues;
use crate::language_preference::{LanguageRequest, LANGUAGE_HEADER};
use crate::translator::{FixedT, I18n, I18nLookup};

static I18N: LazyLock<I18n> = LazyLock::new(|| {
    let resources: Value = json!({
        "en": { "translation": { "TARGET": { "owl": "owl" } } },
        "tr": { "translation": { "TARGET": { "owl": "baykuş" } } },
        "no": { "translation": { "TARGET": { "owl": "ugle" } } },
        "zh": { "translation": { "TARGET": { "owl": "猫头鹰" } } },
        "zh-TW": { "translation": { "TARGET": { "owl": "貓頭鷹" } } },
    });
    let Value::Object(resources) = resources else {
        unreachable!()
    };
    let resources: Map<String, Value> = resources;
    I18n::new(Catalogues::from_resources(resources))
});

struct Answer {
    language: String,
    owl: String,
    content_language: String,
}

fn ask(headers: &[(&str, &str)], query_lng: Option<&str>) -> Answer {
    let request: LanguageRequest = LanguageRequest::from_parts(query_lng, headers.iter().copied());
    let fixed: FixedT<'_> = I18N.for_request(&request);
    Answer {
        language: fixed.language().to_owned(),
        owl: fixed.t("TARGET.owl"),
        content_language: fixed.language().to_owned(),
    }
}

#[test]
fn serves_accept_language() {
    let answer: Answer = ask(&[("Accept-Language", "tr-TR,tr;q=0.9")], None);
    assert_eq!(answer.language, "tr");
    assert_eq!(answer.owl, "baykuş");
}

#[test]
fn prefers_prosopo_lang_over_accept_language() {
    let answer: Answer = ask(&[(LANGUAGE_HEADER, "tr"), ("Accept-Language", "no")], None);
    assert_eq!(answer.language, "tr");
}

#[test]
fn prefers_the_lng_query_over_both_headers() {
    let answer: Answer = ask(
        &[(LANGUAGE_HEADER, "tr"), ("Accept-Language", "tr")],
        Some("no"),
    );
    assert_eq!(answer.language, "no");
    assert_eq!(answer.owl, "ugle");
}

#[test]
fn falls_through_a_header_naming_only_unsupported_languages() {
    let answer: Answer = ask(&[(LANGUAGE_HEADER, "xx"), ("Accept-Language", "tr")], None);
    assert_eq!(answer.language, "tr");
}

#[test]
fn maps_nb_to_no_and_zh_sg_to_zh() {
    assert_eq!(ask(&[(LANGUAGE_HEADER, "nb-NO")], None).language, "no");
    let chinese: Answer = ask(&[("Accept-Language", "zh-SG")], None);
    assert_eq!(chinese.language, "zh");
    assert_eq!(chinese.owl, "猫头鹰");
}

#[test]
fn serves_traditional_chinese_not_simplified_for_zh_tw() {
    let answer: Answer = ask(&[("Accept-Language", "zh-TW, de;q=0.8")], None);
    assert_eq!(answer.language, "zh-TW");
    assert_eq!(answer.owl, "貓頭鷹");
}

#[test]
fn falls_back_to_english_for_an_unsupported_language() {
    let answer: Answer = ask(&[("Accept-Language", "xx")], None);
    assert_eq!(answer.language, "en");
    assert_eq!(answer.owl, "owl");
}

#[test]
fn falls_back_to_english_when_nothing_is_sent() {
    assert_eq!(ask(&[], None).language, "en");
}

// The request carries no cookie at all, so neither reading nor setting one
// is possible.
#[test]
fn ignores_an_i18next_cookie_and_sets_none() {
    let answer: Answer = ask(&[("Cookie", "i18next=tr"), ("Accept-Language", "no")], None);
    assert_eq!(answer.language, "no");
}

#[test]
fn reports_the_chosen_language_in_content_language() {
    assert_eq!(ask(&[(LANGUAGE_HEADER, "tr")], None).content_language, "tr");
}
