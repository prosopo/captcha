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

//! Replays rust/equivalence/vectors.json (written by generate.ts from the TS
//! implementation) and asserts the Rust port produces the same outputs.

use std::collections::{HashMap, VecDeque};
use std::sync::Arc;

use ed25519_dalek::{Signer, SigningKey};
use serde::Deserialize;
use serde_json::Value;

use crate::base64::{decode_base64, decode_base64_url, Base64Error};
use crate::ed25519::verify_zip215;
use crate::jwks_resolver::{
    BoxFuture, ChunkedBody, JwksError, JwksFetch, JwksFetchError, JwksResolverOptions, JwksResponse,
};
use crate::parse_signature_agent::{normalise_signature_agent_url, parse_signature_agent_header};
use crate::signature_base::{build_signature_base, SignatureBaseInput};
use crate::structured_fields::{parse_signature, parse_signature_input, ParamValue};
use crate::tests::support::{FakeClock, MockFetch};
use crate::verify::{VerifiableRequest, VerifyError, VerifyResult};

const VECTORS: &str = include_str!("equivalence/vectors.json");

#[derive(Deserialize, Debug, PartialEq)]
#[serde(rename_all = "lowercase")]
enum Outcome<T> {
    Ok(T),
    Error(String),
}

fn outcome<T, E: ToString>(result: Result<T, E>) -> Outcome<T> {
    match result {
        Ok(v) => Outcome::Ok(v),
        Err(e) => Outcome::Error(e.to_string()),
    }
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b: &u8| format!("{b:02x}")).collect()
}

fn unhex(s: &str) -> Vec<u8> {
    (0..s.len())
        .step_by(2)
        .map(|i: usize| u8::from_str_radix(&s[i..i + 2], 16).expect("hex"))
        .collect()
}

#[derive(Deserialize)]
struct Base64Vector {
    input: String,
    result: Outcome<String>,
}

#[derive(Deserialize)]
#[serde(tag = "type", content = "value", rename_all = "lowercase")]
enum ParamJson {
    String(String),
    Number(Value),
    Boolean(bool),
    Bytes(String),
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SignatureInputJson {
    label: String,
    covered_components: Vec<String>,
    params: Vec<(String, ParamJson)>,
    serialised_value: String,
}

#[derive(Deserialize)]
struct SignatureInputVector {
    header: String,
    result: Option<SignatureInputJson>,
}

#[derive(Deserialize)]
struct SignatureVector {
    header: String,
    label: String,
    result: Option<String>,
}

#[derive(Deserialize)]
struct SignatureAgentVector {
    header: String,
    result: Outcome<Option<String>>,
}

#[derive(Deserialize)]
struct NormaliseVector {
    input: String,
    result: Outcome<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SignatureBaseVector {
    covered: Vec<String>,
    authority: String,
    signature_agent: String,
    params: String,
    result: Outcome<String>,
}

#[derive(Deserialize, Clone)]
#[serde(untagged)]
enum Chunk {
    Text(String),
    Repeat { repeat: String, times: usize },
    Hex { hex: String },
}

impl Chunk {
    fn bytes(&self) -> Vec<u8> {
        match self {
            Chunk::Text(text) => text.as_bytes().to_vec(),
            Chunk::Repeat { repeat, times } => repeat.repeat(*times).into_bytes(),
            Chunk::Hex { hex } => unhex(hex),
        }
    }
}

#[derive(Deserialize, Clone)]
#[serde(tag = "kind", rename_all = "lowercase")]
enum MockResponse {
    Response {
        status: u16,
        headers: Vec<(String, String)>,
        chunks: Option<Vec<Chunk>>,
    },
    Hang,
    Throw {
        message: String,
    },
}

fn mock_fetch(spec: MockResponse) -> Arc<MockFetch> {
    MockFetch::new(
        move |_url: &str| -> BoxFuture<'static, Result<JwksResponse, JwksFetchError>> {
            match spec.clone() {
                MockResponse::Hang => Box::pin(std::future::pending()),
                MockResponse::Throw { message } => {
                    Box::pin(async move { Err(JwksFetchError(message)) })
                }
                MockResponse::Response {
                    status,
                    headers,
                    chunks,
                } => {
                    let body = chunks.map(|chunks: Vec<Chunk>| {
                        Box::new(ChunkedBody(
                            chunks
                                .iter()
                                .map(Chunk::bytes)
                                .collect::<VecDeque<Vec<u8>>>(),
                        )) as Box<dyn crate::jwks_resolver::JwksBody>
                    });
                    Box::pin(async move {
                        Ok(JwksResponse {
                            status,
                            headers,
                            body,
                        })
                    })
                }
            }
        },
    )
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct ResolverOptionsJson {
    ttl_ms: Option<f64>,
    timeout_ms: Option<u64>,
    allow_local_signers: Option<bool>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct JwksStep {
    now_ms: f64,
    result: Outcome<Vec<Value>>,
    fetched_urls: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct JwksVector {
    name: String,
    signer_url: String,
    options: ResolverOptionsJson,
    response: MockResponse,
    steps: Vec<JwksStep>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SignVector {
    seed: String,
    message: String,
    public_key: String,
    signature: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawVerifyVector {
    name: String,
    signature: String,
    message: String,
    public_key: String,
    valid: bool,
}

#[derive(Deserialize, Debug, PartialEq)]
#[serde(untagged)]
enum VerifyResultJson {
    Verified {
        verified: bool,
        #[serde(rename = "signerUrl")]
        signer_url: String,
        keyid: String,
    },
    Failed {
        verified: bool,
        reason: String,
    },
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct VerifyVector {
    name: String,
    now_ms: f64,
    url: String,
    headers: HashMap<String, String>,
    allow_local_signers: bool,
    response: MockResponse,
    result: Outcome<VerifyResultJson>,
    fetched_urls: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Vectors {
    decode_base64: Vec<Base64Vector>,
    decode_base64_url: Vec<Base64Vector>,
    parse_signature_input: Vec<SignatureInputVector>,
    parse_signature: Vec<SignatureVector>,
    parse_signature_agent_header: Vec<SignatureAgentVector>,
    normalise_signature_agent_url: Vec<NormaliseVector>,
    build_signature_base: Vec<SignatureBaseVector>,
    resolve_jwks: Vec<JwksVector>,
    ed25519_sign: Vec<SignVector>,
    ed25519_verify: Vec<RawVerifyVector>,
    verify_web_bot_auth: Vec<VerifyVector>,
}

fn vectors() -> Vectors {
    serde_json::from_str(VECTORS).expect("vectors.json")
}

/// Numbers compare as JS doubles (`-0 === 0`, integers vs floats); a string
/// stands for a non-finite value JSON cannot hold.
fn js_number_matches(expected: &Value, actual: f64) -> bool {
    match expected {
        Value::Number(n) => n.as_f64() == Some(actual),
        Value::String(s) => {
            s.parse::<f64>().ok() == Some(actual) || (s == "NaN" && actual.is_nan())
        }
        _ => false,
    }
}

fn json_matches(expected: &Value, actual: &Value) -> bool {
    match (expected, actual) {
        (Value::Number(e), Value::Number(a)) => e.as_f64() == a.as_f64(),
        (Value::Array(e), Value::Array(a)) => {
            e.len() == a.len() && e.iter().zip(a).all(|(x, y)| json_matches(x, y))
        }
        (Value::Object(e), Value::Object(a)) => {
            e.len() == a.len()
                && e.iter()
                    .all(|(k, v)| a.get(k).is_some_and(|w: &Value| json_matches(v, w)))
        }
        _ => expected == actual,
    }
}

fn param_matches(expected: &ParamJson, actual: &ParamValue) -> bool {
    match (expected, actual) {
        (ParamJson::String(e), ParamValue::String(a)) => e == a,
        (ParamJson::Number(e), ParamValue::Number(a)) => js_number_matches(e, *a),
        (ParamJson::Boolean(e), ParamValue::Boolean(a)) => e == a,
        (ParamJson::Bytes(e), ParamValue::Bytes(a)) => *e == hex(a),
        _ => false,
    }
}

#[test]
fn equivalence_decode_base64() {
    let v: Vectors = vectors();
    for (vectors, decode) in [
        (
            &v.decode_base64,
            decode_base64 as fn(&str) -> Result<Vec<u8>, Base64Error>,
        ),
        (
            &v.decode_base64_url,
            decode_base64_url as fn(&str) -> Result<Vec<u8>, Base64Error>,
        ),
    ] {
        for vector in vectors {
            let actual: Outcome<String> = outcome(decode(&vector.input).map(|b: Vec<u8>| hex(&b)));
            assert_eq!(actual, vector.result, "input {:?}", vector.input);
        }
    }
}

#[test]
fn equivalence_parse_signature_input() {
    for vector in vectors().parse_signature_input {
        let actual = parse_signature_input(&vector.header);
        match (&vector.result, &actual) {
            (None, None) => {}
            (Some(expected), Some(actual)) => {
                assert_eq!(actual.label, expected.label, "{:?}", vector.header);
                assert_eq!(
                    actual.covered_components, expected.covered_components,
                    "{:?}",
                    vector.header
                );
                assert_eq!(
                    actual.serialised_value, expected.serialised_value,
                    "{:?}",
                    vector.header
                );
                let actual_params: Vec<(&str, &ParamValue)> = actual.params.iter().collect();
                assert_eq!(
                    actual_params.len(),
                    expected.params.len(),
                    "{:?}: {actual_params:?}",
                    vector.header
                );
                for ((ek, ev), (ak, av)) in expected.params.iter().zip(&actual_params) {
                    assert_eq!(ek, ak, "{:?}", vector.header);
                    assert!(
                        param_matches(ev, av),
                        "{:?}: param {ek} = {av:?}",
                        vector.header
                    );
                }
            }
            _ => panic!(
                "{:?}: expected {} got {actual:?}",
                vector.header,
                vector.result.is_some()
            ),
        }
    }
}

#[test]
fn equivalence_parse_signature() {
    for vector in vectors().parse_signature {
        let actual: Option<String> =
            parse_signature(&vector.header, &vector.label).map(|b: Vec<u8>| hex(&b));
        assert_eq!(
            actual, vector.result,
            "{:?} / {:?}",
            vector.header, vector.label
        );
    }
}

#[test]
fn equivalence_parse_signature_agent_header() {
    let v: Vectors = vectors();
    for vector in v.parse_signature_agent_header {
        assert_eq!(
            outcome(parse_signature_agent_header(&vector.header)),
            vector.result,
            "{:?}",
            vector.header
        );
    }
    for vector in v.normalise_signature_agent_url {
        assert_eq!(
            outcome(normalise_signature_agent_url(&vector.input)),
            vector.result,
            "{:?}",
            vector.input
        );
    }
}

#[test]
fn equivalence_build_signature_base() {
    for vector in vectors().build_signature_base {
        let actual = build_signature_base(
            &vector.covered,
            &SignatureBaseInput {
                authority: vector.authority.clone(),
                signature_agent: vector.signature_agent.clone(),
            },
            &vector.params,
        );
        assert_eq!(outcome(actual), vector.result, "{:?}", vector.covered);
    }
}

fn jwks_error_text(error: &JwksError) -> String {
    match error {
        JwksError::InvalidJson(_) => "SyntaxError".to_string(),
        other => other.to_string(),
    }
}

#[tokio::test]
async fn equivalence_resolve_jwks() {
    for vector in vectors().resolve_jwks {
        let clock: FakeClock = FakeClock::new(0.0);
        let resolver = clock.resolver();
        for step in &vector.steps {
            clock.set(step.now_ms);
            let fetch: Arc<MockFetch> = mock_fetch(vector.response.clone());
            let options: JwksResolverOptions = JwksResolverOptions {
                fetch: Some(Arc::clone(&fetch) as Arc<dyn JwksFetch>),
                ttl_ms: vector.options.ttl_ms,
                timeout_ms: vector.options.timeout_ms,
                allow_local_signers: vector.options.allow_local_signers.unwrap_or(false),
            };
            let actual = resolver
                .resolve_jwks_from_signature_agent(&vector.signer_url, &options)
                .await;
            match (&step.result, &actual) {
                (Outcome::Ok(expected), Ok(keys)) => {
                    let actual_values: Vec<Value> = keys.iter().map(|k| k.0.clone()).collect();
                    assert!(
                        json_matches(
                            &Value::Array(expected.clone()),
                            &Value::Array(actual_values.clone())
                        ),
                        "{}: {expected:?} vs {actual_values:?}",
                        vector.name
                    );
                }
                (Outcome::Error(expected), Err(error)) => {
                    assert_eq!(&jwks_error_text(error), expected, "{}", vector.name);
                }
                _ => panic!(
                    "{} at {}: expected {:?}, got {actual:?}",
                    vector.name, step.now_ms, step.result
                ),
            }
            assert_eq!(fetch.seen_urls(), step.fetched_urls, "{}", vector.name);
        }
    }
}

#[test]
fn equivalence_ed25519_sign() {
    for vector in vectors().ed25519_sign {
        let seed: [u8; 32] = unhex(&vector.seed).try_into().expect("seed");
        let key: SigningKey = SigningKey::from_bytes(&seed);
        assert_eq!(hex(key.verifying_key().as_bytes()), vector.public_key);
        assert_eq!(
            hex(&key.sign(vector.message.as_bytes()).to_bytes()),
            vector.signature
        );
        let signature: Vec<u8> = unhex(&vector.signature);
        assert!(verify_zip215(
            &signature,
            vector.message.as_bytes(),
            &unhex(&vector.public_key)
        ));
    }
}

#[test]
fn equivalence_ed25519_verify() {
    for vector in vectors().ed25519_verify {
        let actual: bool = verify_zip215(
            &unhex(&vector.signature),
            &unhex(&vector.message),
            &unhex(&vector.public_key),
        );
        assert_eq!(actual, vector.valid, "{}", vector.name);
    }
}

fn verify_result_json(result: VerifyResult) -> VerifyResultJson {
    match result {
        VerifyResult::Verified { signer_url, keyid } => VerifyResultJson::Verified {
            verified: true,
            signer_url,
            keyid,
        },
        VerifyResult::Failed(reason) => VerifyResultJson::Failed {
            verified: false,
            reason: reason.as_str().to_string(),
        },
    }
}

#[tokio::test]
async fn equivalence_verify_web_bot_auth() {
    for vector in vectors().verify_web_bot_auth {
        let resolver = FakeClock::new(vector.now_ms).resolver();
        let fetch: Arc<MockFetch> = mock_fetch(vector.response.clone());
        let request: VerifiableRequest<HashMap<String, String>> = VerifiableRequest {
            method: "GET".to_string(),
            url: vector.url.clone(),
            headers: vector.headers.clone(),
        };
        let options: JwksResolverOptions = JwksResolverOptions {
            fetch: Some(Arc::clone(&fetch) as Arc<dyn JwksFetch>),
            allow_local_signers: vector.allow_local_signers,
            ..JwksResolverOptions::default()
        };
        let actual: Outcome<VerifyResultJson> =
            match resolver.verify_web_bot_auth(&request, &options).await {
                Ok(result) => Outcome::Ok(verify_result_json(result)),
                Err(error) => Outcome::Error(VerifyError::to_string(&error)),
            };
        assert_eq!(actual, vector.result, "{}", vector.name);
        assert_eq!(fetch.seen_urls(), vector.fetched_urls, "{}", vector.name);
    }
}
