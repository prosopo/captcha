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

//! Replays rust/equivalence/api-vectors.json, written by generate-api.ts on Node 24: the
//! provider API's paths, rate limits and every request and response schema.

use crate::api_types::*;
use crate::provider_api::*;
use crate::BlockRuleType;
use prosopo_api_route::schema::{Data, Schema};
use serde::Deserialize;
use serde_json::{Map, Value};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;

const VECTORS: &str = include_str!("equivalence/api-vectors.json");

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Vectors {
    api_prefix: String,
    default_solved_count: f64,
    default_unsolved_count: f64,
    client_api_paths: Vec<(String, String)>,
    public_api_paths: Vec<(String, String)>,
    admin_api_paths: Vec<(String, String)>,
    block_rule_type: Vec<(String, String)>,
    provider_default_rate_limits: Vec<(String, u64, u64)>,
    request_array_limits: Vec<(String, usize)>,
    max_icon_clicks: usize,
    schemas: Vec<String>,
    schema_vectors: Vec<SchemaVector>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum Expected {
    Ok {
        ok: Value,
    },
    OkDigest {
        #[serde(rename = "okDigest")]
        ok_digest: String,
    },
    OkUndefined {
        #[serde(rename = "okUndefined")]
        _ok_undefined: bool,
    },
    Issues {
        issues: Value,
    },
    /// The TS threw out of `safeParse`; only `PowChallengeIdSchema` does that.
    Throws {
        #[serde(rename = "throws")]
        _throws: String,
    },
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct SchemaVector {
    schema: String,
    #[serde(default, deserialize_with = "present")]
    input: Option<Value>,
    result: Expected,
}

fn present<'de, D: serde::Deserializer<'de>>(deserializer: D) -> Result<Option<Value>, D::Error> {
    Value::deserialize(deserializer).map(Some)
}

/// generate-api.ts's `decode`: `{"$repeat": [unit, count]}` and `{"$array": [item, count]}`.
fn decode(value: &Value) -> Value {
    match value {
        Value::Array(items) => Value::Array(items.iter().map(decode).collect()),
        Value::Object(object) if object.len() == 1 && object.contains_key("$repeat") => {
            let parts: &Vec<Value> = object["$repeat"].as_array().expect("repeat pair");
            let unit: &str = parts[0].as_str().expect("repeat unit");
            let count: usize = parts[1].as_u64().expect("repeat count") as usize;
            Value::from(unit.repeat(count))
        }
        Value::Object(object) if object.len() == 1 && object.contains_key("$array") => {
            let parts: &Vec<Value> = object["$array"].as_array().expect("array pair");
            let item: Value = decode(&parts[0]);
            let count: usize = parts[1].as_u64().expect("array count") as usize;
            Value::Array(vec![item; count])
        }
        Value::Object(object) => Value::Object(
            object
                .iter()
                .map(|(key, item)| (key.clone(), decode(item)))
                .collect::<Map<String, Value>>(),
        ),
        other => other.clone(),
    }
}

fn same_json(a: &Value, b: &Value) -> bool {
    match (a, b) {
        (Value::Number(a), Value::Number(b)) => a.as_f64() == b.as_f64(),
        (Value::Array(a), Value::Array(b)) => {
            a.len() == b.len() && a.iter().zip(b).all(|(a, b)| same_json(a, b))
        }
        (Value::Object(a), Value::Object(b)) => {
            a.len() == b.len()
                && a.iter()
                    .zip(b.iter())
                    .all(|((ka, va), (kb, vb))| ka == kb && same_json(va, vb))
        }
        (a, b) => a == b,
    }
}

fn schemas() -> BTreeMap<&'static str, Schema> {
    BTreeMap::from([
        ("providerDetails", provider_details_schema()),
        ("captchaRequestBody", captcha_request_body()),
        ("clientMetaData", client_meta_data_schema()),
        ("captchaSolutionBody", captcha_solution_body()),
        ("verifySolutionBody", verify_solution_body()),
        (
            "serverCaptchaVerifyRequestBody",
            server_captcha_verify_request_body(),
        ),
        ("dnsEventKind", dns_event_kind_schema()),
        ("dnsEvent", dns_event_schema()),
        ("dnsEventBatch", dns_event_batch_schema()),
        ("dnsEventIngestBatch", dns_event_ingest_batch_schema()),
        ("getChallengeRequestBody", get_challenge_request_body()),
        (
            "submitPowCaptchaSolutionBody",
            submit_pow_captcha_solution_body(),
        ),
        (
            "getFrictionlessCaptchaChallengeRequestBody",
            get_frictionless_captcha_challenge_request_body(),
        ),
        (
            "assignDetectorBundleRequestBody",
            assign_detector_bundle_request_body(),
        ),
        ("replaceDetectorPoolBody", replace_detector_pool_body()),
        ("puzzleEvent", puzzle_event_schema()),
        (
            "submitPuzzleCaptchaSolutionBody",
            submit_puzzle_captcha_solution_body(),
        ),
        ("audioEvent", audio_event_schema()),
        (
            "submitAudioCaptchaSolutionBody",
            submit_audio_captcha_solution_body(),
        ),
        ("iconClick", icon_click_schema()),
        (
            "submitIconOrderCaptchaSolutionBody",
            submit_icon_order_captcha_solution_body(),
        ),
        (
            "verifyPowCaptchaSolutionBody",
            verify_pow_captcha_solution_body(),
        ),
        ("registerSitekeyBody", register_sitekey_body()),
        ("registerSitekeysBody", register_sitekeys_body()),
        ("removeSitekeyBody", remove_sitekey_body()),
        ("removeSitekeysBody", remove_sitekeys_body()),
        ("updateDecisionMachineBody", update_decision_machine_body()),
        ("decisionMachineIdBody", decision_machine_id_body()),
        ("emptyBody", empty_body()),
        ("clearAllCountersBody", clear_all_counters_body()),
        ("clearAllCountersResponse", clear_all_counters_response()),
        ("decisionMachineSummary", decision_machine_summary_schema()),
        (
            "getDecisionMachineResponse",
            get_decision_machine_response(),
        ),
        (
            "getAllDecisionMachinesResponse",
            get_all_decision_machines_response(),
        ),
        (
            "removeDecisionMachineResponse",
            remove_decision_machine_response(),
        ),
        (
            "removeAllDecisionMachinesResponse",
            remove_all_decision_machines_response(),
        ),
        ("toggleMaintenanceModeBody", toggle_maintenance_mode_body()),
        ("getSessionBody", get_session_body()),
        (
            "prosopoCaptchaCountConfig",
            prosopo_captcha_count_config_schema(),
        ),
        ("blockRuleSpec", block_rule_spec()),
        ("dappDomainRequestBody", dapp_domain_request_body()),
        ("apiPathRateLimits", api_path_rate_limits_schema()),
    ])
}

/// Deserialises a parse output into its struct and serialises it back.
fn round_trip<T: serde::de::DeserializeOwned + serde::Serialize>(value: &Value) -> Option<Value> {
    let typed: T = serde_json::from_value(value.clone()).ok()?;
    serde_json::to_value(&typed).ok()
}

/// Every schema with a typed output, so its struct is checked against every valid output.
fn typed_round_trip(schema: &str, value: &Value) -> Option<Option<Value>> {
    let round_tripped: Option<Value> = match schema {
        "providerDetails" => round_trip::<ProviderDetails>(value),
        "captchaRequestBody" => round_trip::<CaptchaRequestBody>(value),
        "clientMetaData" => round_trip::<ClientMetaData>(value),
        "captchaSolutionBody" => round_trip::<CaptchaSolutionBody>(value),
        "verifySolutionBody" => round_trip::<VerifySolutionBody>(value),
        "serverCaptchaVerifyRequestBody" => round_trip::<ServerCaptchaVerifyRequestBody>(value),
        "dnsEvent" => round_trip::<DnsEvent>(value),
        "dnsEventBatch" => round_trip::<DnsEventBatch>(value),
        "dnsEventIngestBatch" => round_trip::<DnsEventIngestBatch>(value),
        "getChallengeRequestBody" => round_trip::<GetChallengeRequestBody>(value),
        "submitPowCaptchaSolutionBody" => round_trip::<SubmitPowCaptchaSolutionBody>(value),
        "getFrictionlessCaptchaChallengeRequestBody" => {
            round_trip::<GetFrictionlessCaptchaChallengeRequestBody>(value)
        }
        "assignDetectorBundleRequestBody" => round_trip::<AssignDetectorBundleRequestBody>(value),
        "replaceDetectorPoolBody" => round_trip::<ReplaceDetectorPoolBody>(value),
        "puzzleEvent" => round_trip::<PuzzleEvent>(value),
        "submitPuzzleCaptchaSolutionBody" => round_trip::<SubmitPuzzleCaptchaSolutionBody>(value),
        "audioEvent" => round_trip::<AudioEvent>(value),
        "submitAudioCaptchaSolutionBody" => round_trip::<SubmitAudioCaptchaSolutionBody>(value),
        "iconClick" => round_trip::<IconClick>(value),
        "submitIconOrderCaptchaSolutionBody" => {
            round_trip::<SubmitIconOrderCaptchaSolutionBody>(value)
        }
        "verifyPowCaptchaSolutionBody" => round_trip::<VerifyPowCaptchaSolutionBody>(value),
        "registerSitekeyBody" => round_trip::<RegisterSitekeyBody>(value),
        "registerSitekeysBody" => round_trip::<RegisterSitekeysBody>(value),
        "removeSitekeyBody" => round_trip::<RemoveSitekeyBody>(value),
        "removeSitekeysBody" => round_trip::<RemoveSitekeysBody>(value),
        "updateDecisionMachineBody" => round_trip::<UpdateDecisionMachineBody>(value),
        "decisionMachineIdBody" => round_trip::<DecisionMachineIdBody>(value),
        "emptyBody" => round_trip::<EmptyBody>(value),
        "clearAllCountersBody" => round_trip::<ClearAllCountersBody>(value),
        "clearAllCountersResponse" => round_trip::<ClearAllCountersResponse>(value),
        "decisionMachineSummary" => round_trip::<DecisionMachineSummary>(value),
        "getDecisionMachineResponse" => round_trip::<GetDecisionMachineResponse>(value),
        "getAllDecisionMachinesResponse" => round_trip::<Vec<GetDecisionMachineResponse>>(value),
        "removeDecisionMachineResponse" => round_trip::<RemoveDecisionMachineResponse>(value),
        "removeAllDecisionMachinesResponse" => {
            round_trip::<RemoveAllDecisionMachinesResponse>(value)
        }
        "toggleMaintenanceModeBody" => round_trip::<ToggleMaintenanceModeBody>(value),
        "getSessionBody" => round_trip::<GetSessionBody>(value),
        "prosopoCaptchaCountConfig" => round_trip::<CaptchaCountConfig>(value),
        "blockRuleSpec" => round_trip::<BlockRule>(value),
        "dappDomainRequestBody" => round_trip::<DappDomainRequestBody>(value),
        "apiPathRateLimits" => round_trip::<ApiPathRateLimits>(value),
        _ => return None,
    };
    Some(round_tripped)
}

const THROWING_SCHEMAS: [&str; 4] = [
    "submitPowCaptchaSolutionBody",
    "submitPuzzleCaptchaSolutionBody",
    "submitAudioCaptchaSolutionBody",
    "submitIconOrderCaptchaSolutionBody",
];

#[test]
fn schemas_match_the_ts() {
    let vectors: Vectors = serde_json::from_str(VECTORS).expect("api-vectors.json parses");
    let schemas: BTreeMap<&'static str, Schema> = schemas();
    let mut recorded: Vec<&str> = vectors.schemas.iter().map(String::as_str).collect();
    recorded.sort_unstable();
    assert_eq!(recorded, schemas.keys().copied().collect::<Vec<&str>>());
    let mut failures: Vec<String> = Vec::new();
    let mut typed: usize = 0;
    for vector in &vectors.schema_vectors {
        let input: Option<Value> = vector.input.as_ref().map(decode);
        let actual: Result<Data, Vec<Map<String, Value>>> =
            schemas[vector.schema.as_str()].safe_parse(input.as_ref());
        let matches: bool = match (&actual, &vector.result) {
            (Ok(Some(value)), Expected::Ok { ok }) => {
                let typed: bool = match typed_round_trip(&vector.schema, value) {
                    Some(Some(round_tripped)) => {
                        typed += 1;
                        same_json(&round_tripped, value)
                    }
                    Some(None) => false,
                    None => true,
                };
                typed && same_json(value, ok)
            }
            (Ok(Some(value)), Expected::OkDigest { ok_digest }) => {
                let text: String = serde_json::to_string(value).expect("serialises");
                hex::encode(Sha256::digest(text.as_bytes())) == *ok_digest
            }
            (Ok(None), Expected::OkUndefined { .. }) => true,
            (Err(issues), Expected::Issues { issues: expected }) => same_json(
                &Value::Array(issues.iter().cloned().map(Value::Object).collect()),
                expected,
            ),
            (Err(_), Expected::Throws { .. }) => THROWING_SCHEMAS.contains(&vector.schema.as_str()),
            _ => false,
        };
        if !matches {
            failures.push(format!(
                "{} {}: got {}",
                vector.schema,
                vector.input.as_ref().map_or("undefined".to_string(), |v| v
                    .to_string()
                    .chars()
                    .take(200)
                    .collect()),
                match &actual {
                    Ok(value) => format!(
                        "ok {}",
                        value.as_ref().map_or(String::new(), |v| v
                            .to_string()
                            .chars()
                            .take(300)
                            .collect())
                    ),
                    Err(issues) => serde_json::to_string(issues)
                        .unwrap_or_default()
                        .chars()
                        .take(600)
                        .collect(),
                }
            ));
        }
    }
    assert!(
        failures.is_empty(),
        "{} differ:\n{}",
        failures.len(),
        failures.join("\n")
    );
    assert!(
        typed > 300,
        "only {typed} outputs round-tripped through their structs"
    );
}

#[test]
fn paths_and_limits_match_the_ts() {
    let vectors: Vectors = serde_json::from_str(VECTORS).expect("api-vectors.json parses");
    assert_eq!(API_PREFIX, vectors.api_prefix);
    assert_eq!(DEFAULT_SOLVED_COUNT, vectors.default_solved_count);
    assert_eq!(DEFAULT_UNSOLVED_COUNT, vectors.default_unsolved_count);
    macro_rules! entries {
        ($name:ty) => {
            <$name>::TS_KEYS
                .iter()
                .zip(<$name>::ALL.map(<$name>::as_str))
                .map(|(key, value)| (key.to_string(), value.to_string()))
                .collect::<Vec<(String, String)>>()
        };
    }
    assert_eq!(entries!(ClientApiPaths), vectors.client_api_paths);
    assert_eq!(entries!(PublicApiPaths), vectors.public_api_paths);
    assert_eq!(entries!(AdminApiPaths), vectors.admin_api_paths);
    assert_eq!(entries!(BlockRuleType), vectors.block_rule_type);
    let limits: Vec<(String, u64, u64)> = PROVIDER_DEFAULT_RATE_LIMITS
        .iter()
        .map(|(path, window, limit)| (path.to_string(), *window, *limit))
        .collect();
    assert_eq!(limits, vectors.provider_default_rate_limits);
    let arrays: Vec<(String, usize)> = vec![
        ("datasetId".to_string(), RequestArrayLimits::DATASET_ID),
        ("captchas".to_string(), RequestArrayLimits::CAPTCHAS),
        ("solution".to_string(), RequestArrayLimits::SOLUTION),
        (
            "puzzleEvents".to_string(),
            RequestArrayLimits::PUZZLE_EVENTS,
        ),
        (
            "iconOrderEvents".to_string(),
            RequestArrayLimits::ICON_ORDER_EVENTS,
        ),
        ("audioEvents".to_string(), RequestArrayLimits::AUDIO_EVENTS),
    ];
    assert_eq!(arrays, vectors.request_array_limits);
    assert_eq!(MAX_ICON_CLICKS, vectors.max_icon_clicks);
}
