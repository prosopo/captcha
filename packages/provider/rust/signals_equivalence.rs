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

//! Replays the header-reading parts of rust/equivalence/pipeline-vectors.json, written by
//! generate-pipeline.ts: Node's base64 decoding, the JA4 of a ClientHello header, the
//! handshake timings, the raw TLS signals, and the subject the admin rate limit keys on.
//! The app's answers are replayed in the cli crate, which builds the app from a config.

use crate::api::pipeline::jwt_subject;
use crate::api::signals::{get_handshake_timing, get_ja4, get_raw_tls_signals, node_base64_decode};
use http::{HeaderMap, HeaderName, HeaderValue};
use serde_json::Value;

const VECTORS: &str = include_str!("equivalence/pipeline-vectors.json");

fn vectors() -> Value {
    serde_json::from_str(VECTORS).expect("pipeline-vectors.json parses")
}

/// The headers as Node would have received them: each character one byte.
fn headers(value: &Value) -> HeaderMap {
    let mut map: HeaderMap = HeaderMap::new();
    for (name, value) in value.as_object().expect("headers") {
        let Some(text) = value.as_str() else {
            continue;
        };
        let bytes: Vec<u8> = text.chars().map(|c| c as u8).collect();
        map.insert(HeaderName::from_bytes(name.as_bytes()).expect("a name"), HeaderValue::from_bytes(&bytes).expect("a value"));
    }
    map
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

/// `JSON.stringify` drops absent fields and writes a non-finite number as null.
fn as_json<T: serde::Serialize>(value: &T) -> Value {
    serde_json::to_value(value).expect("serialises")
}

#[test]
fn base64_is_decoded_as_node_decodes_it() {
    for case in vectors()["base64"].as_array().expect("base64") {
        let text: &str = case["text"].as_str().expect("text");
        assert_eq!(hex::encode(node_base64_decode(text)), case["hex"].as_str().expect("hex"), "{text:?}");
    }
}

#[test]
fn ja4_is_read_as_the_ts_reads_it() {
    for case in vectors()["ja4"].as_array().expect("ja4") {
        assert_eq!(get_ja4(&headers(&case["headers"]), Some("production")), case["ja4"].as_str().expect("a ja4"), "{case}");
    }
}

#[test]
fn handshake_timings_are_read_as_the_ts_reads_them() {
    for case in vectors()["timing"].as_array().expect("timing") {
        let actual: Value = as_json(&get_handshake_timing(&headers(&case["headers"])));
        assert!(same(&actual, &case["timing"]), "{case}: {actual}");
    }
}

#[test]
fn raw_tls_signals_are_read_as_the_ts_reads_them() {
    let cases: Vec<Value> = vectors()["rawTls"].as_array().expect("raw TLS").clone();
    assert!(cases.len() > 400);
    for case in cases {
        let actual: Value = as_json(&get_raw_tls_signals(&headers(&case["headers"])));
        assert!(same(&actual, &case["signals"]), "{case}: {actual}");
    }
}

#[test]
fn the_admin_limit_keys_on_the_ts_subject() {
    for case in vectors()["jwtSubjects"].as_array().expect("subjects") {
        let mut map: HeaderMap = HeaderMap::new();
        if let Some(authorization) = case["authorization"].as_str() {
            map.insert("authorization", HeaderValue::from_str(authorization).expect("a header"));
        }
        let expected: Option<String> = match (case["type"].as_str(), &case["sub"]) {
            (Some("string"), Value::String(sub)) if !sub.is_empty() => Some(format!("string:{sub}")),
            (Some("number"), Value::Number(sub)) if sub.as_f64() != Some(0.0) => Some(format!("number:{sub}")),
            (Some("boolean"), Value::Bool(true)) => Some("boolean:true".to_string()),
            _ => None,
        };
        assert_eq!(jwt_subject(&map), expected, "{case}");
    }
}
