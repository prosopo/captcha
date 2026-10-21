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

//! Replays rust/equivalence/vectors.json, written by generate.ts on Node 24 against the TS
//! server SDK. Signatures are random, so they are not compared: the TS's and the Rust's
//! must both verify under Alice's key for the message the TS signed.

use crate::test_support::*;
use crate::*;
use prosopo_api::{ApiError, HttpRequest, HttpResponse};
use prosopo_api_route::schema::string_to_number;
use prosopo_common::{ContextValue, ProsopoError};
use prosopo_keyring::KeyringPair;
use prosopo_load_balancer::{
    EnvLookup, IpMode, LoadBalancer, ProviderDirectory, ProviderListFetch,
};
use prosopo_types::config::{prosopo_server_config_schema, ProsopoServerConfig};
use prosopo_util_crypto::signature_verify;
use serde_json::{json, Map, Value};
use std::collections::BTreeMap;
use std::sync::Arc;

const VECTORS: &str = include_str!("equivalence/vectors.json");

fn vectors() -> Value {
    serde_json::from_str(VECTORS).expect("vectors.json parses")
}

fn field<'a>(value: &'a Value, key: &str) -> &'a Value {
    value
        .get(key)
        .unwrap_or_else(|| panic!("vector has no {key}: {value}"))
}

fn text(value: &Value) -> &str {
    value
        .as_str()
        .unwrap_or_else(|| panic!("expected a string: {value}"))
}

fn optional<'a>(value: &'a Value, key: &str) -> Option<&'a str> {
    value.get(key).and_then(Value::as_str)
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

fn env_lookup(env: &Value) -> EnvLookup {
    let env: BTreeMap<String, String> = env
        .as_object()
        .expect("an environment")
        .iter()
        .map(|(name, value)| (name.clone(), text(value).to_string()))
        .collect();
    Arc::new(move |name: &str| env.get(name).cloned())
}

#[test]
fn detect_ip_mode_matches_the_ts() {
    for vector in field(&vectors(), "ipModes").as_array().expect("ip modes") {
        let url: Option<&str> = field(vector, "url").as_str();
        assert_eq!(
            detect_ip_mode(url).map(IpMode::as_str),
            field(vector, "mode").as_str(),
            "{url:?}"
        );
    }
}

#[test]
fn server_url_and_config_match_the_ts() {
    for vector in field(&vectors(), "environments")
        .as_array()
        .expect("environments")
    {
        let env: EnvLookup = env_lookup(field(vector, "env"));
        assert_eq!(get_server_url(&env), text(field(vector, "url")), "{vector}");
        let expected: &Value = field(vector, "config");
        match (get_server_config(&env), expected.get("ok")) {
            (Ok(config), Some(ok)) => {
                let actual: Value = serde_json::to_value(&config).expect("serialises");
                assert!(same_json(&actual, ok), "{vector}: got {actual}");
            }
            (Err(ConfigError(issues)), None) => {
                assert_eq!(Value::from(issues), *field(expected, "issues"), "{vector}");
            }
            (actual, _) => panic!("{vector}: got {actual:?}"),
        }
    }
}

#[test]
fn recency_matches_the_ts() {
    let vectors: Value = vectors();
    let now: f64 = field(&vectors, "now").as_f64().expect("now");
    for vector in field(&vectors, "recency").as_array().expect("recency") {
        let timestamp: f64 = string_to_number(text(field(vector, "timestamp")));
        let timeout: f64 = string_to_number(text(field(vector, "timeout")));
        assert_eq!(
            is_recent(now, timestamp, timeout) == Recency::Recent,
            field(vector, "recent").as_bool().expect("a flag"),
            "{vector}"
        );
    }
}

struct NoListFetch;

impl ProviderListFetch for NoListFetch {
    fn get(&self, url: &str) -> prosopo_load_balancer::FetchFuture {
        panic!("the development list is not fetched, but {url} was")
    }
}

fn config(input: &Value) -> ProsopoServerConfig {
    let parsed: Value = prosopo_server_config_schema()
        .safe_parse(Some(input))
        .expect("a valid config")
        .expect("a config");
    serde_json::from_value(parsed).expect("a ProsopoServerConfig")
}

fn reply(response: &Value) -> Reply {
    if response.get("stall").is_some() {
        return Reply::Stall;
    }
    if let Some(message) = optional(response, "networkError") {
        return Reply::Failure(ApiError::Network(message.to_string()));
    }
    Reply::Response(HttpResponse {
        status: field(response, "status").as_u64().expect("a status") as u16,
        status_text: text(field(response, "statusText")).to_string(),
        url: String::new(),
        content_type: optional(response, "contentType").map(str::to_string),
        body: text(field(response, "body")).as_bytes().to_vec(),
    })
}

/// The request as the generator records it: the body with its signature replaced, and the
/// signature.
fn recorded_request(request: &HttpRequest, placeholder: &str) -> (Value, Option<String>) {
    let signature: Option<String> = request.body.as_deref().and_then(|body| {
        serde_json::from_str::<Value>(body)
            .ok()
            .and_then(|body| optional(&body, "dappSignature").map(str::to_string))
    });
    let body: Option<String> = request.body.as_ref().map(|body| match &signature {
        Some(signature) => body.replacen(signature.as_str(), placeholder, 1),
        None => body.clone(),
    });
    (
        json!({
            "url": request.url,
            "method": request.method,
            "headers": request.headers.iter().map(|(name, value)| json!([name, value])).collect::<Vec<Value>>(),
            "body": body,
        }),
        signature,
    )
}

fn verifies(message: &str, signature: &str) -> bool {
    signature_verify(message, signature, ALICE).is_ok_and(|result| result.is_valid)
}

fn error_json(error: &ProsopoError) -> Value {
    let context_json = |key: &str| match error.context().and_then(|context| context.get(key)) {
        Some(ContextValue::Json(value)) => value.clone(),
        _ => Value::Null,
    };
    json!({
        "key": error.translation_key(),
        "code": context_json("code"),
        "token": context_json("token"),
    })
}

#[tokio::test]
async fn is_verified_matches_the_ts() {
    let vectors: Value = vectors();
    let now: f64 = field(&vectors, "now").as_f64().expect("now");
    let provider_url: String = text(field(&vectors, "providerUrl")).to_string();
    let placeholder: &str = text(field(&vectors, "signaturePlaceholder"));
    let scenarios: &Vec<Value> = field(&vectors, "scenarios").as_array().expect("scenarios");
    for scenario in scenarios {
        let label: &str = text(field(scenario, "label"));
        let development_url: String = provider_url.clone();
        let balancer: LoadBalancer = LoadBalancer::with(
            Arc::new(NoListFetch),
            Arc::new(move |name: &str| {
                (name == "PROSOPO_PROVIDER_URL_DEVELOPMENT").then(|| development_url.clone())
            }),
        );
        let (transport, requests) = ScriptedTransport::new(reply(field(scenario, "response")));
        let pair: Option<KeyringPair> = match text(field(scenario, "signer")) {
            "alice" => Some(alice()),
            "watchOnly" => Some(watch_only(ALICE)),
            _ => None,
        };
        let server: ProsopoServer = ProsopoServer::new(config(field(scenario, "config")), pair)
            .with_provider_directory(Arc::new(ProviderDirectory::new(Arc::new(balancer))))
            .with_transport(transport)
            .with_clock(Arc::new(move || now));
        let token: &str = text(field(scenario, "token"));
        let outcome: Result<Value, ProsopoError> = server
            .is_verified(
                token,
                optional(scenario, "ip"),
                optional(scenario, "email"),
                optional(scenario, "clientSessionId"),
            )
            .await;
        let requests: Vec<HttpRequest> = requests.lock().expect("requests lock").clone();
        let (sent, signatures): (Vec<Value>, Vec<Option<String>>) = requests
            .iter()
            .map(|request| recorded_request(request, placeholder))
            .unzip();
        assert_eq!(
            Value::from(sent),
            *field(scenario, "requests"),
            "{label}: requests"
        );
        let signed: Vec<&str> = field(scenario, "signed")
            .as_array()
            .expect("signed")
            .iter()
            .map(text)
            .collect();
        let ts_signatures: Vec<&str> = field(scenario, "signatures")
            .as_array()
            .expect("signatures")
            .iter()
            .map(text)
            .collect();
        assert_eq!(signatures.len(), ts_signatures.len(), "{label}: signatures");
        for ((rust, ts), message) in signatures.iter().zip(&ts_signatures).zip(&signed) {
            let rust: &str = rust.as_deref().expect("a Rust signature");
            assert!(
                verifies(message, rust),
                "{label}: Rust signature over {message}"
            );
            assert!(
                verifies(message, ts),
                "{label}: TS signature over {message}"
            );
        }
        match (outcome, scenario.get("result"), scenario.get("error")) {
            (Ok(actual), Some(expected), None) => {
                assert!(same_json(&actual, expected), "{label}: got {actual}");
            }
            (Err(error), None, Some(expected)) => {
                let mut expected: Map<String, Value> =
                    expected.as_object().expect("an error").clone();
                expected.remove("name");
                assert_eq!(error_json(&error), Value::Object(expected), "{label}");
            }
            (actual, _, _) => panic!("{label}: TS gave {scenario}, Rust gave {actual:?}"),
        }
    }
}

#[test]
fn public_server_matches_the_ts() {
    for vector in field(&vectors(), "publicServers")
        .as_array()
        .expect("public servers")
    {
        let mut account: Map<String, Value> = Map::new();
        if let Some(address) = optional(vector, "address") {
            account.insert("address".to_string(), Value::from(address));
        }
        let config: ProsopoServerConfig =
            config(&json!({ "defaultEnvironment": "development", "account": account }));
        match (public_prosopo_server(config), vector.get("ok")) {
            (Ok(server), Some(ok)) => {
                let address: Option<String> = server
                    .pair()
                    .map(|pair| pair.address().expect("an address"));
                assert_eq!(address.as_deref(), ok.as_str(), "{vector}");
            }
            (Err(error), None) => {
                assert_eq!(error.to_string(), text(field(vector, "error")), "{vector}")
            }
            (Ok(_), None) => panic!("{vector}: Rust built a server"),
            (Err(error), Some(_)) => panic!("{vector}: Rust failed with {error}"),
        }
    }
}
