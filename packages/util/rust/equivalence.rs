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

// Ported from rust/equivalence/vectors.json, generated from the TS by rust/equivalence/generate.ts

use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use crate::{
    assert_coords_safe_value, at_f64, at_str, build_domain_suffix_candidates,
    decode_google_translate_host, embed_data, extract_data, extract_domain_from_email, flatten,
    get_ip_address, get_ip_address_from_big_int, hash_meets_difficulty, is_protect_deployment,
    number_to_string, parse_url, sanitise_page_url, solve_pow, target_for_difficulty,
    u8a_to_hex_with, validate_domain, validate_domain_for_outbound_request, verify_recency_at,
    Address4, Address6, AtOptions, IpAddress, UtilError,
};

const VECTORS: &str = include_str!("equivalence/vectors.json");

fn vectors() -> Value {
    serde_json::from_str(VECTORS).expect("vectors.json is valid JSON")
}

fn section(name: &str) -> Vec<Value> {
    vectors()[name]
        .as_array()
        .unwrap_or_else(|| panic!("missing section {name}"))
        .clone()
}

fn decode(value: &Value) -> f64 {
    match value {
        Value::Number(n) => n.as_f64().expect("finite number"),
        Value::String(s) if s == "NaN" => f64::NAN,
        Value::String(s) if s == "Infinity" => f64::INFINITY,
        Value::String(s) if s == "-Infinity" => f64::NEG_INFINITY,
        other => panic!("not an encoded number: {other}"),
    }
}

fn encode(n: f64) -> Value {
    if n.is_nan() {
        json!("NaN")
    } else if n.is_infinite() {
        json!(if n > 0.0 { "Infinity" } else { "-Infinity" })
    } else {
        number(n)
    }
}

/// A JS number as JSON: integral values without a fraction, as JSON.stringify writes them.
fn number(n: f64) -> Value {
    if n.trunc() == n && n.abs() < 1e17 {
        json!(n as i64)
    } else {
        json!(n)
    }
}

fn outcome(result: Result<Value, UtilError>) -> Value {
    match result {
        Ok(value) => json!({ "ok": value }),
        Err(error) => json!({ "error": error.message() }),
    }
}

fn str_of(value: &Value) -> &str {
    value.as_str().expect("string")
}

fn opt_str(value: &Value) -> Option<&str> {
    value.as_str()
}

fn assert_vector(name: &str, input: &Value, actual: &Value, expected: &Value) {
    assert_eq!(actual, expected, "{name} {input}");
}

#[test]
fn equivalence_number_to_string() {
    for v in section("numberToString") {
        assert_vector(
            "numberToString",
            &v["n"],
            &json!(number_to_string(decode(&v["n"]))),
            &v["result"],
        );
    }
}

#[test]
fn equivalence_at() {
    for v in section("at") {
        let items: Vec<f64> = v["items"].as_array().unwrap().iter().map(decode).collect();
        let options = AtOptions {
            optional: false,
            no_wrap: v["noWrap"].as_bool().unwrap(),
        };
        let actual = outcome(at_f64(&items, decode(&v["index"]), options).map(|n| number(*n)));
        assert_vector("at", &v, &actual, &v["result"]);
    }
    for v in section("atString") {
        let actual = outcome(
            at_str(str_of(&v["s"]), decode(&v["index"]), AtOptions::default()).map(Value::from),
        );
        assert_vector("atString", &v, &actual, &v["result"]);
    }
}

#[test]
fn equivalence_u8a_to_hex() {
    for v in section("u8aToHex") {
        let bytes: Vec<u8> = v["bytes"]
            .as_array()
            .unwrap()
            .iter()
            .map(|b| b.as_u64().unwrap() as u8)
            .collect();
        let actual = u8a_to_hex_with(
            &bytes,
            v["bitLength"].as_i64().unwrap(),
            v["isPrefixed"].as_bool().unwrap(),
        );
        assert_vector("u8aToHex", &v, &json!(actual), &v["result"]);
    }
}

#[test]
fn equivalence_embed_and_extract_data() {
    for v in section("embedData") {
        let data: Vec<f64> = v["data"].as_array().unwrap().iter().map(decode).collect();
        let actual = outcome(embed_data(str_of(&v["hex"]), &data).map(Value::from));
        assert_vector("embedData", &v, &actual, &v["result"]);
    }
    for v in section("extractData") {
        let actual = outcome(
            extract_data(str_of(&v["hex"]))
                .map(|ns| Value::Array(ns.into_iter().map(encode).collect())),
        );
        assert_vector("extractData", &v["hex"], &actual, &v["result"]);
    }
}

fn v4_fields(ip: &Address4) -> Value {
    json!({
        "v4": true,
        "address": ip.address(),
        "correctForm": ip.correct_form(),
        "bigInt": ip.big_int().to_string(),
        "subnetMask": ip.subnet_mask(),
        "isLoopback": ip.is_loopback(),
        "isLinkLocal": ip.is_link_local(),
    })
}

fn v6_fields(ip: &Address6) -> Value {
    json!({
        "v4": false,
        "address": ip.address(),
        "correctForm": ip.correct_form(),
        "canonicalForm": ip.canonical_form(),
        "bigInt": ip.big_int().to_string(),
        "subnetMask": ip.subnet_mask(),
        "zone": ip.zone(),
        "is4": ip.is4(),
        "address4": ip.address4().map(Address4::address),
        "to4": ip.to4().address(),
        "isLoopback": ip.is_loopback(),
        "isLinkLocal": ip.is_link_local(),
    })
}

fn ip_fields(ip: &IpAddress) -> Value {
    match ip {
        IpAddress::V4(a) => v4_fields(a),
        IpAddress::V6(a) => v6_fields(a),
    }
}

#[test]
fn equivalence_get_ip_address() {
    for v in section("getIPAddress") {
        let actual = outcome(get_ip_address(str_of(&v["input"])).map(|ip| ip_fields(&ip)));
        assert_vector("getIPAddress", &v["input"], &actual, &v["result"]);
    }
    for v in section("fromBigInt") {
        let value: u128 = str_of(&v["value"]).parse().unwrap();
        let v4 = outcome(get_ip_address_from_big_int(value).map(|a| v4_fields(&a)));
        assert_vector("fromBigInt v4", &v["value"], &v4, &v["v4"]);
        let v6 = outcome(Ok(v6_fields(&Address6::from_big_int(value))));
        assert_vector("fromBigInt v6", &v["value"], &v6, &v["v6"]);
    }
}

fn parsed(domain: &str) -> Value {
    outcome(parse_url(domain).map(|url| {
        json!({
            "href": url.as_str(),
            "hostname": url.host_str().unwrap_or(""),
        })
    }))
}

#[test]
fn equivalence_validate_domain() {
    for v in section("validateDomain") {
        let domain = str_of(&v["domain"]);
        assert_vector(
            "validateDomain",
            &v["domain"],
            &json!(validate_domain(domain)),
            &v["valid"],
        );
        assert_vector("parseUrl", &v["domain"], &parsed(domain), &v["parsed"]);
    }
    for v in section("parseUrl") {
        assert_vector(
            "parseUrl",
            &v["domain"],
            &parsed(str_of(&v["domain"])),
            &v["parsed"],
        );
    }
}

#[test]
fn equivalence_validate_domain_for_outbound_request() {
    for v in section("validateDomainForOutboundRequest") {
        let result = validate_domain_for_outbound_request(str_of(&v["domain"]));
        let actual = json!({
            "domain": v["domain"],
            "isValid": result.is_valid,
            "reason": result.reason,
        });
        assert_vector(
            "validateDomainForOutboundRequest",
            &v["domain"],
            &actual,
            &v,
        );
    }
}

#[test]
fn equivalence_host_and_email_helpers() {
    for v in section("decodeGoogleTranslateHost") {
        let actual = json!(decode_google_translate_host(str_of(&v["hostname"])));
        assert_vector(
            "decodeGoogleTranslateHost",
            &v["hostname"],
            &actual,
            &v["result"],
        );
    }
    for v in section("buildDomainSuffixCandidates") {
        let actual = json!(build_domain_suffix_candidates(str_of(&v["domain"])));
        assert_vector(
            "buildDomainSuffixCandidates",
            &v["domain"],
            &actual,
            &v["result"],
        );
    }
    for v in section("extractDomainFromEmail") {
        let actual = json!(extract_domain_from_email(str_of(&v["input"])));
        assert_vector("extractDomainFromEmail", &v["input"], &actual, &v["result"]);
    }
    for v in section("sanitisePageUrl") {
        let actual = json!(sanitise_page_url(opt_str(&v["raw"])));
        assert_vector("sanitisePageUrl", &v["raw"], &actual, &v["result"]);
    }
    for v in section("isProtectDeployment") {
        let actual = json!(is_protect_deployment(
            opt_str(&v["currentUrl"]),
            opt_str(&v["iframeUrl"])
        ));
        assert_vector("isProtectDeployment", &v, &actual, &v["result"]);
    }
}

fn from_hex(hex: &str) -> Vec<u8> {
    (0..hex.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&hex[i..i + 2], 16).unwrap())
        .collect()
}

#[test]
fn equivalence_proof_of_work() {
    let all = vectors();
    let pow = &all["hashMeetsDifficulty"];
    let difficulties: Vec<f64> = pow["difficulties"]
        .as_array()
        .unwrap()
        .iter()
        .map(decode)
        .collect();
    for v in pow["hashes"].as_array().unwrap() {
        let hash = from_hex(str_of(&v["hash"]));
        let actual: Vec<Value> = difficulties
            .iter()
            .map(|d| outcome(hash_meets_difficulty(&hash, *d).map(Value::from)))
            .collect();
        assert_vector(
            "hashMeetsDifficulty",
            &v["hash"],
            &Value::Array(actual),
            &v["results"],
        );
    }
    for v in section("targetForDifficulty") {
        let actual = outcome(
            target_for_difficulty(decode(&v["difficulty"])).map(|t| json!(t.to_str_radix(16))),
        );
        assert_vector(
            "targetForDifficulty",
            &v["difficulty"],
            &actual,
            &v["result"],
        );
    }
    for v in section("solvePoW") {
        let data = str_of(&v["data"]);
        let nonce = solve_pow(data, v["difficulty"].as_f64().unwrap()).unwrap();
        assert_vector("solvePoW", &v, &json!(nonce), &v["nonce"]);
        let hash = Sha256::digest(format!("{nonce}{data}").as_bytes());
        assert!(hash_meets_difficulty(&hash, v["difficulty"].as_f64().unwrap()).unwrap());
    }
}

#[test]
fn equivalence_assert_coords_safe() {
    for v in section("assertCoordsSafe") {
        let actual =
            outcome(assert_coords_safe_value(Some(&v["coords"]), "label").map(|()| Value::Null));
        assert_vector("assertCoordsSafe", &v["coords"], &actual, &v["result"]);
    }
}

#[test]
fn equivalence_flatten() {
    for v in section("flatten") {
        let Value::Object(obj) = &v["obj"] else {
            panic!("flatten input is an object");
        };
        let entries: Vec<Value> = flatten(obj)
            .into_iter()
            .map(|(key, value)| json!([key, value]))
            .collect();
        assert_vector("flatten", &v["obj"], &Value::Array(entries), &v["result"]);
    }
}

#[test]
fn equivalence_verify_recency() {
    for v in section("verifyRecency") {
        let actual = verify_recency_at(
            str_of(&v["challenge"]),
            v["maxVerifiedTime"].as_f64().unwrap(),
            v["now"].as_f64().unwrap(),
        );
        assert_vector("verifyRecency", &v, &json!(actual), &v["result"]);
    }
}

#[test]
fn equivalence_to_fixed() {
    let cases: Vec<(serde_json::Value, usize, String)> =
        serde_json::from_str(include_str!("equivalence/to-fixed.json")).expect("to-fixed.json parses");
    let mut failures: Vec<String> = Vec::new();
    for (x, digits, expected) in &cases {
        let x: f64 = match x {
            serde_json::Value::String(name) => match name.as_str() {
                "NaN" => f64::NAN,
                "Infinity" => f64::INFINITY,
                "-Infinity" => f64::NEG_INFINITY,
                "-0" => -0.0,
                other => panic!("{other}"),
            },
            number => number.as_f64().expect("a number"),
        };
        let actual: String = crate::to_fixed(x, *digits);
        if &actual != expected {
            failures.push(format!("{x:?}.toFixed({digits}): rust {actual}, ts {expected}"));
        }
    }
    assert!(cases.len() > 3000);
    assert!(failures.is_empty(), "{} of {} differ:\n{}", failures.len(), cases.len(), failures.join("\n"));
}
