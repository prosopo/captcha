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

//! Replays rust/equivalence/util-vectors.json, written by generate-util.ts from the TS on
//! Node 24: the IP helpers, the IP comparison and its rules, and the hashes.

use crate::client_meta_data::{is_client_session_mismatch, to_stored_client_meta_data};
use crate::composite_ip::{get_composite_ip_address, get_ip_address_from_composite, is_same_ip_origin};
use crate::hashing::{hash_user_agent, hash_user_ip};
use crate::ip_comparison::{compare_ips, IpInfoLookup, LookupFuture};
use crate::ip_validation::{
    deep_validate_ip_address, encode_string_address, evaluate_ip_validation_rules, get_ip_address, get_ip_address_from_big_int,
    validate_ip_address,
};
use prosopo_database::records::{CompositeIpAddress, IpHalf};
use prosopo_logger::{get_logger, LogLevel, Logger};
use prosopo_types::api_types::ClientMetaData;
use prosopo_types::ipapi::{IpComparisonResult, IpInfoResponse};
use prosopo_types::settings_types::IPValidationRules;
use prosopo_types::stored::IpAddressType;
use prosopo_util::IpAddress;
use serde_json::{json, Map, Value};
use std::collections::HashMap;

const VECTORS: &str = include_str!("equivalence/util-vectors.json");

fn vectors() -> Value {
    serde_json::from_str(VECTORS).expect("util-vectors.json parses")
}

fn quiet() -> Logger {
    get_logger(LogLevel::Error, "test")
}

/// JSON equality with numbers compared as the JS numbers they are.
fn same(a: &Value, b: &Value) -> bool {
    match (a, b) {
        (Value::Number(a), Value::Number(b)) => a.as_f64() == b.as_f64(),
        (Value::Array(a), Value::Array(b)) => a.len() == b.len() && a.iter().zip(b).all(|(a, b)| same(a, b)),
        (Value::Object(a), Value::Object(b)) => a.len() == b.len() && a.iter().all(|(key, value)| b.get(key).is_some_and(|other| same(value, other))),
        (a, b) => a == b,
    }
}

fn bigint(value: &Value) -> String {
    value["$bigint"].as_str().expect("a bigint").to_string()
}

fn composite_json(composite: &CompositeIpAddress) -> Value {
    let mut out: Map<String, Value> = Map::new();
    out.insert("lower".to_string(), json!({ "$bigint": composite.lower.0.to_string() }));
    if let Some(upper) = composite.upper {
        out.insert("upper".to_string(), json!({ "$bigint": upper.0.to_string() }));
    }
    out.insert("type".to_string(), json!(composite.ip_type.as_str()));
    Value::Object(out)
}

fn composite_from(value: &Value) -> CompositeIpAddress {
    CompositeIpAddress {
        lower: IpHalf(bigint(&value["lower"]).parse().expect("a u64")),
        upper: value.get("upper").map(|upper| IpHalf(bigint(upper).parse().expect("a u64"))),
        ip_type: if value["type"] == "v6" { IpAddressType::V6 } else { IpAddressType::V4 },
    }
}

/// The fields the generator records of an address. ip-address's `v4` is true for a v6 address
/// that embeds a v4 one.
fn address_json(address: &IpAddress) -> Value {
    let v4: bool = match address {
        IpAddress::V4(_) => true,
        IpAddress::V6(v6) => v6.address4().is_some(),
    };
    json!({
        "address": address.address(),
        "correctForm": address.correct_form(),
        "bigInt": address.big_int().to_string(),
        "v4": v4,
    })
}

fn outcome_of(result: Result<Value, String>) -> Value {
    match result {
        Ok(value) => json!({ "ok": value }),
        Err(error) => json!({ "error": error }),
    }
}

struct Scripted(HashMap<String, IpInfoResponse>);

impl IpInfoLookup for Scripted {
    fn lookup<'a>(&'a self, ip: &'a str) -> LookupFuture<'a> {
        let response: IpInfoResponse = self.0.get(ip).cloned().unwrap_or_else(|| IpInfoResponse::error("unknown", ip));
        Box::pin(async move { response })
    }
}

fn scripted(infos: &Value) -> Scripted {
    Scripted(
        infos
            .as_object()
            .expect("infos")
            .iter()
            .map(|(ip, info)| (ip.clone(), serde_json::from_value(info.clone()).expect("an IP info response")))
            .collect(),
    )
}

fn check(failures: &mut Vec<String>, label: String, actual: &Value, expected: &Value) {
    if !same(actual, expected) {
        failures.push(format!("{label}\n      rust {actual}\n      ts   {expected}"));
    }
}

#[tokio::test]
async fn the_ip_helpers_comparison_and_hashes_return_what_the_ts_returns() {
    let vectors: Value = vectors();
    let mut failures: Vec<String> = Vec::new();
    let logger: Logger = quiet();
    let list = |key: &str| vectors[key].as_array().expect(key).clone();

    for case in list("composites") {
        let ip: &str = case["ip"].as_str().expect("ip");
        check(&mut failures, format!("composite of {ip:?}"), &composite_json(&get_composite_ip_address(ip)), &case["composite"]);
    }
    for case in list("fromComposite") {
        let composite: CompositeIpAddress = composite_from(&case["composite"]);
        let actual: Value = outcome_of(get_ip_address_from_composite(&composite).map(|address| address_json(&address)).map_err(|error| error.to_string()));
        if case["outcome"].get("error").is_some() && actual.get("error").is_some() {
            continue;
        }
        check(&mut failures, format!("address of {}", case["composite"]), &actual, &case["outcome"]);
    }
    for case in list("sameOrigin") {
        let actual: bool = is_same_ip_origin(&composite_from(&case["a"]), &composite_from(&case["b"]));
        check(&mut failures, format!("same origin {} {}", case["a"], case["b"]), &json!(actual), &case["same"]);
    }
    for case in list("providerIp") {
        let ip: &str = case["ip"].as_str().expect("ip");
        let actual: Value = outcome_of(get_ip_address(ip).map(|address| address_json(&address)).map_err(|error| error.translation_key().unwrap_or_default().to_string()));
        check(&mut failures, format!("getIPAddress {ip:?}"), &actual, &case["outcome"]);
    }
    for case in list("fromBigInt") {
        let Ok(value) = case["value"].as_str().expect("a value").parse::<u128>() else {
            continue;
        };
        let actual: Value =
            outcome_of(get_ip_address_from_big_int(value).map(|address| address_json(&address)).map_err(|error| error.translation_key().unwrap_or_default().to_string()));
        check(&mut failures, format!("from big int {value}"), &actual, &case["outcome"]);
    }
    for case in list("validations") {
        let challenge: IpAddress = prosopo_util::get_ip_address(case["challenge"].as_str().expect("challenge")).expect("a challenge address");
        let actual = validate_ip_address(case["ip"].as_str(), &challenge, &logger);
        check(&mut failures, format!("validate {} against {}", case["ip"], case["challenge"]), &json!({ "ok": actual }), &case["outcome"]);
    }
    for case in list("comparisons") {
        let service: Scripted = scripted(&case["infos"]);
        let actual = compare_ips(case["ip1"].as_str().expect("ip1"), case["ip2"].as_str().expect("ip2"), &service).await;
        check(&mut failures, format!("compare {} {}", case["ip1"], case["ip2"]), &serde_json::to_value(&actual).expect("serialises"), &case["outcome"]);
    }
    for case in list("ruleEvaluations") {
        let comparison: IpComparisonResult = serde_json::from_value(case["comparison"].clone()).expect("a comparison");
        let rules: IPValidationRules = serde_json::from_value(case["rules"].clone()).expect("rules");
        let actual = evaluate_ip_validation_rules(&comparison, &rules, &logger);
        check(&mut failures, format!("rules {} on {}", case["rules"], case["comparison"]), &serde_json::to_value(&actual).expect("serialises"), &case["outcome"]);
    }
    for case in list("deepValidations") {
        let service: Scripted = scripted(&case["infos"]);
        let challenge: IpAddress = prosopo_util::get_ip_address(case["challenge"].as_str().expect("challenge")).expect("a challenge address");
        let rules: Option<IPValidationRules> = (!case["rules"].is_null()).then(|| serde_json::from_value(case["rules"].clone()).expect("rules"));
        let actual = deep_validate_ip_address(case["ip"].as_str().expect("ip"), &challenge, &logger, &service, rules.as_ref(), case["dnsPeerIp"].as_str()).await;
        check(&mut failures, format!("deep validate {} against {}", case["ip"], case["challenge"]), &serde_json::to_value(&actual).expect("serialises"), &case["outcome"]);
    }
    for case in vectors["hashes"]["userAgent"].as_array().expect("user agents") {
        check(&mut failures, format!("hash user agent {}", case["input"]), &json!(hash_user_agent(case["input"].as_str().expect("input"))), &case["hash"]);
    }
    for case in vectors["hashes"]["userIp"].as_array().expect("user ips") {
        let actual: String = hash_user_ip(case["user"].as_str().expect("user"), case["ip"].as_str().expect("ip"), case["sitekey"].as_str().expect("sitekey"));
        check(&mut failures, format!("hash user ip {case}"), &json!(actual), &case["hash"]);
    }
    for case in list("addresses") {
        let actual: Value = outcome_of(encode_string_address(case["input"].as_str().expect("input")).map(Value::String).map_err(|error| error.translation_key().unwrap_or_default().to_string()));
        check(&mut failures, format!("encode {}", case["input"]), &actual, &case["outcome"]);
    }
    for case in list("clientMetaData") {
        let input: Option<ClientMetaData> = (!case["input"].is_null()).then(|| serde_json::from_value(case["input"].clone()).expect("client meta data"));
        let actual: Value = serde_json::to_value(to_stored_client_meta_data(input.as_ref())).expect("serialises");
        check(&mut failures, format!("stored client meta data {}", case["input"]), &actual, &case["stored"]);
    }
    for case in list("sessionMismatch") {
        let actual: bool = is_client_session_mismatch(case["expected"].as_str(), case["recorded"].as_str());
        check(&mut failures, format!("session mismatch {case}"), &json!(actual), &case["mismatch"]);
    }
    assert!(failures.is_empty(), "{} differ:\n{}", failures.len(), failures.iter().take(30).cloned().collect::<Vec<String>>().join("\n"));
}
