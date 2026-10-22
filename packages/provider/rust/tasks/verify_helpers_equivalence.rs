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

//! Replays verify-helpers-vectors.json, written by equivalence/generate-verify-helpers.ts.

use crate::tasks::dns_event::{compute_dns_asymmetry, extra_ip_infos_from_enriched_dns_event, get_ip_info_asn};
use crate::tasks::email::{evaluate_email_spam_rules, normalise_email_for_matching, normalise_gmail_address, EmailSpam, EmailSpamRulesView};
use crate::tasks::frictionless::frictionless_score;
use crate::tasks::traffic::{check_traffic_filter, derive_traffic_policies, resolve_challenge_policy, resolve_pad_bytes, ResolvedChallengePolicy, TrafficCheckResult, TrafficFilterView};
use prosopo_types::decision_machine::EnrichedDnsEvent;
use prosopo_types::ipapi::IpInfoResponse;
use serde_json::{json, Map, Value};

const VECTORS: &str = include_str!("../equivalence/verify-helpers-vectors.json");

/// Numbers as f64, so `4` and `4.0` compare equal; keys compare regardless of order.
fn numeric(value: Value) -> Value {
    match value {
        Value::Number(number) => json!(number.as_f64().expect("a finite number")),
        Value::Array(items) => Value::Array(items.into_iter().map(numeric).collect()),
        Value::Object(fields) => Value::Object(fields.into_iter().map(|(key, value)| (key, numeric(value))).collect()),
        other => other,
    }
}

fn parse<T: serde::de::DeserializeOwned>(value: &Value) -> Option<T> {
    (!value.is_null()).then(|| serde_json::from_value(value.clone()).expect("a vector input"))
}

fn check_json(check: &TrafficCheckResult) -> Value {
    let matches: Vec<Value> = check
        .matches
        .iter()
        .map(|found| json!({ "category": found.category.as_str(), "policy": found.policy }))
        .collect();
    let mut out: Map<String, Value> = Map::new();
    out.insert("isBlocked".into(), json!(check.blocked.is_some()));
    if let Some(reason) = check.blocked {
        out.insert("reason".into(), json!(reason.as_str()));
    }
    out.insert("matches".into(), Value::Array(matches));
    Value::Object(out)
}

fn challenge_json(policy: &ResolvedChallengePolicy) -> Value {
    let mut out: Map<String, Value> = Map::new();
    let mut put = |key: &str, value: Option<Value>| {
        if let Some(value) = value {
            out.insert(key.into(), value);
        }
    };
    put("captchaType", policy.captcha_type.map(|kind| json!(kind.as_str())));
    put("powDifficulty", policy.pow_difficulty.map(|n| json!(n)));
    put("solvedImagesCount", policy.solved_images_count.map(|n| json!(n)));
    put("puzzleTolerance", policy.puzzle_tolerance.map(|n| json!(n)));
    put("puzzleSettings", policy.puzzle_settings.clone().map(Value::Object));
    put("audioSettings", policy.audio_settings.clone().map(Value::Object));
    put("iconOrderTolerance", policy.icon_order_tolerance.map(|n| json!(n)));
    put("iconOrderSettings", policy.icon_order_settings.clone().map(Value::Object));
    out.insert("sourceCategories".into(), json!(policy.source_categories.iter().map(|category| category.as_str()).collect::<Vec<_>>()));
    Value::Object(out)
}

fn email_json(result: Option<EmailSpam>) -> Value {
    match result {
        None => json!({ "isSpam": false }),
        Some(EmailSpam { reason, pattern: None }) => json!({ "isSpam": true, "reason": reason.as_str() }),
        Some(EmailSpam { reason, pattern: Some(pattern) }) => json!({ "isSpam": true, "reason": reason.as_str(), "pattern": pattern }),
    }
}

fn optional(value: Option<Value>) -> Value {
    value.unwrap_or(Value::Null)
}

#[test]
fn the_traffic_filter_and_dns_asymmetry_decide_as_in_the_ts() {
    let vectors: Value = serde_json::from_str(VECTORS).expect("vectors");
    for (index, case) in vectors["traffic"].as_array().expect("traffic").iter().enumerate() {
        let client: Option<IpInfoResponse> = parse(&case["client"]);
        let filter: TrafficFilterView = parse(&case["filter"]).expect("a filter");
        let enriched: Option<EnrichedDnsEvent> = parse(&case["enriched"]);
        let extras: Vec<IpInfoResponse> = extra_ip_infos_from_enriched_dns_event(enriched.as_ref());
        assert_eq!(numeric(json!(extras)), numeric(case["extras"].clone()), "extras of case {index}");
        let check: TrafficCheckResult = check_traffic_filter(client.as_ref(), &filter, &extras, enriched.as_ref().and_then(|event| event.path_valid));
        let actual: Value = json!({
            "check": check_json(&check),
            "challenge": optional(resolve_challenge_policy(&check.matches).as_ref().map(challenge_json)),
            "padBytes": optional(resolve_pad_bytes(&check.matches).map(|n| json!(n))),
            "policies": optional(derive_traffic_policies(Some(&filter)).map(|policies| json!(policies))),
            "asymmetry": compute_dns_asymmetry(enriched.as_ref(), client.as_ref(), Some(&filter)),
            "asymmetryUnfiltered": compute_dns_asymmetry(enriched.as_ref(), client.as_ref(), None),
            "asn": optional(get_ip_info_asn(client.as_ref()).map(|n| json!(n))),
        });
        let expected: Value = json!({
            "check": case["check"],
            "challenge": case["challenge"],
            "padBytes": case["padBytes"],
            "policies": case["policies"],
            "asymmetry": case["asymmetry"],
            "asymmetryUnfiltered": case["asymmetryUnfiltered"],
            "asn": case["asn"],
        });
        assert_eq!(numeric(actual), numeric(expected), "case {index}: {case}");
    }
}

#[test]
fn email_rules_and_normalisation_agree_with_the_ts() {
    let vectors: Value = serde_json::from_str(VECTORS).expect("vectors");
    let rules: Vec<Option<EmailSpamRulesView>> = vectors["emailRules"].as_array().expect("rules").iter().map(parse).collect();
    for case in vectors["email"].as_array().expect("emails") {
        let email: &str = case["email"].as_str().expect("an email");
        assert_eq!(normalise_gmail_address(email), case["gmail"], "{email:?}");
        assert_eq!(normalise_email_for_matching(email), case["matching"], "{email:?}");
        for (index, rules) in rules.iter().enumerate() {
            let actual: Value = email_json(evaluate_email_spam_rules(Some(email), rules.as_ref()));
            assert_eq!(actual, case["results"][index], "{email:?} under rules {index}");
        }
    }
}

#[test]
fn frictionless_scores_round_as_in_the_ts() {
    let vectors: Value = serde_json::from_str(VECTORS).expect("vectors");
    for case in vectors["scores"].as_array().expect("scores") {
        let components: Vec<f64> = serde_json::from_value(case["components"].clone()).expect("components");
        assert_eq!(json!(frictionless_score(components.iter().copied())), numeric(case["score"].clone()), "{components:?}");
    }
}
