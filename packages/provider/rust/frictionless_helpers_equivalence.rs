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

//! The frictionless route's pure helpers against frictionless-helpers-vectors.json, which
//! equivalence/generate-frictionless-helpers.ts writes from the TS on Node 24.

use crate::api::dns_event_url::{build_dns_event_url, derive_path};
use crate::honeypot::encode_honeypot_question;
use crate::tasks::captcha_type_selection::{allowed_types_json, resolve_site_allowed_captcha_types, switch_type_after_refreshes, switch_type_on_user_request};
use crate::tasks::frictionless::{check_lang_rules, rounds_from_triggered_detectors, timestamp_decay_function, LangScore};
use prosopo_types::captcha_type::CaptchaType;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::LazyLock;

static VECTORS: LazyLock<Value> = LazyLock::new(|| serde_json::from_str(include_str!("equivalence/frictionless-helpers-vectors.json")).expect("frictionless-helpers-vectors.json parses"));

fn cases(section: &str) -> &'static [Value] {
    let cases: &[Value] = VECTORS[section].as_array().expect("a section");
    assert!(!cases.is_empty(), "{section} has cases");
    cases
}

#[test]
fn equivalence_encode_honeypot_question() {
    for case in cases("honeypot") {
        let encoding = serde_json::from_value(case["encoding"].clone()).ok();
        assert_eq!(json!(encode_honeypot_question(case["text"].as_str().expect("text"), encoding)), case["result"], "{case}");
    }
}

#[test]
fn equivalence_check_lang_rules() {
    for case in cases("lang") {
        let actual = check_lang_rules(case["rules"].as_object(), case["header"].as_str().expect("a header"));
        match (&case["result"]["ok"], actual) {
            (Value::String(_), LangScore::Poisoned) => {}
            (Value::Number(expected), LangScore::Number(score)) => assert_eq!(expected.as_f64(), Some(score), "{case}"),
            (expected, actual) => panic!("{case}: {actual:?} for {expected}"),
        }
    }
}

#[test]
fn equivalence_timestamp_decay_function() {
    for case in cases("decay") {
        let number = |key: &str| case[key].as_f64().expect("a number");
        assert_eq!(Some(timestamp_decay_function(number("timestamp"), number("imageMaxRounds"), number("now"))), case["result"].as_f64(), "{case}");
    }
}

#[test]
fn equivalence_dns_event_url() {
    for case in cases("dns") {
        let session_id: &str = case["sessionId"].as_str().expect("a session");
        assert_eq!(json!(derive_path(session_id, case["secret"].as_str().expect("a secret"))), case["path"], "{case}");
        let env: HashMap<String, String> = serde_json::from_value(case["env"].clone()).expect("env");
        assert_eq!(json!(build_dns_event_url(session_id, &|name: &str| env.get(name).cloned())), case["url"], "{case}");
    }
}

#[test]
fn equivalence_type_switches_and_allowed_types() {
    for case in cases("switches") {
        let resolved: CaptchaType = serde_json::from_value(case["resolved"].clone()).expect("a type");
        let allowed: Option<&Value> = Some(&case["allowed"]).filter(|allowed| !allowed.is_null());
        let actual: CaptchaType = if case["kind"] == "refreshes" {
            switch_type_after_refreshes(resolved, case["value"].as_f64(), allowed)
        } else {
            switch_type_on_user_request(resolved, case["value"].as_bool() == Some(true), allowed)
        };
        assert_eq!(json!(actual.as_str()), case["result"], "{case}");
    }
    for case in cases("allowedTypes") {
        assert_eq!(allowed_types_json(resolve_site_allowed_captcha_types(Some(&case["settings"]))), case["result"], "{case}");
    }
    for case in cases("rounds") {
        let triggered: Option<Vec<f64>> = serde_json::from_value(case["triggered"].clone()).expect("triggered");
        assert_eq!(Some(rounds_from_triggered_detectors(case["base"].as_f64().expect("a base"), triggered.as_deref())), case["result"].as_f64(), "{case}");
    }
}

#[test]
fn equivalence_image_switch_request() {
    for case in cases("imageSwitch") {
        let replaced: Option<CaptchaType> = serde_json::from_value(case["replaced"].clone()).expect("a type");
        let actual: bool = crate::tasks::frictionless::is_image_switch_request_valid(case["asked"].as_bool() == Some(true), replaced, case["enabled"].as_bool() == Some(true));
        assert_eq!(json!(actual), case["result"], "{case}");
    }
}
