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

//! Replays rust/equivalence/vectors.json, recorded from the TS by generate.ts.

use crate::js::locale_compare;
use crate::*;
use prosopo_types::config::EnvironmentTypes;
use prosopo_util_crypto::json_parse;
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};

const VECTORS: &str = include_str!("equivalence/vectors.json");

fn vectors() -> Value {
    serde_json::from_str(VECTORS).expect("vectors.json parses")
}

fn field<'a>(value: &'a Value, key: &str) -> &'a Value {
    value
        .get(key)
        .unwrap_or_else(|| panic!("vector has no {key}: {value}"))
}

fn list<'a>(value: &'a Value, key: &str) -> &'a Vec<Value> {
    field(value, key)
        .as_array()
        .unwrap_or_else(|| panic!("{key} is not a list"))
}

fn text(value: &Value) -> &str {
    value
        .as_str()
        .unwrap_or_else(|| panic!("expected a string: {value}"))
}

fn ip_mode(value: &Value) -> Option<IpMode> {
    match value.as_str() {
        None => None,
        Some("ipv4") => Some(IpMode::Ipv4),
        Some("ipv6") => Some(IpMode::Ipv6),
        Some(other) => panic!("unknown ipMode {other}"),
    }
}

fn environment(value: &Value) -> EnvironmentTypes {
    text(value).parse().expect("an environment")
}

fn check(context: &str, expected: &Value, actual: Result<Value>) {
    match (expected.get("result"), expected.get("error"), actual) {
        (Some(result), None, Ok(actual)) => assert_eq!(&actual, result, "{context}"),
        (None, Some(error), Err(actual)) => {
            assert_eq!(actual.to_string(), text(error), "{context}")
        }
        (_, _, actual) => panic!("{context}: TS gave {expected}, Rust gave {actual:?}"),
    }
}

fn providers_json(providers: Vec<HardcodedProvider>) -> Value {
    serde_json::to_value(providers).expect("serialises")
}

#[test]
fn locale_compare_matches_the_ts() {
    for pair in list(&vectors(), "localeCompare") {
        let (a, b): (&str, &str) = (text(&pair[0]), text(&pair[1]));
        let expected: i64 = pair[2].as_i64().expect("a sign");
        let actual: i64 = match locale_compare(a, b) {
            std::cmp::Ordering::Less => -1,
            std::cmp::Ordering::Equal => 0,
            std::cmp::Ordering::Greater => 1,
        };
        let ascii: bool = a.chars().chain(b.chars()).all(|c| (' '..='~').contains(&c));
        if ascii {
            assert_eq!(actual, expected, "{a:?}.localeCompare({b:?})");
        }
    }
}

#[test]
fn convert_hosted_provider_matches_the_ts() {
    for vector in list(&vectors(), "convert") {
        let input: &str = text(field(vector, "text"));
        let mode: Option<IpMode> = ip_mode(field(vector, "ipMode"));
        let parsed = json_parse(input).expect("valid JSON");
        let actual: Result<Value> = convert_hosted_provider(&parsed, mode).map(providers_json);
        check(
            &format!("convertHostedProvider({input}, {mode:?})"),
            vector,
            actual,
        );
    }
}

#[test]
fn provider_hostnames_match_the_ts() {
    for vector in list(&vectors(), "hostnames") {
        let provider: HardcodedProvider = HardcodedProvider {
            address: String::new(),
            url: text(field(vector, "url")).to_string(),
            dataset_id: String::new(),
            weight: 1,
        };
        let actual: Result<Value> = get_provider_hostname(&provider).map(Value::String);
        check(
            &format!("getProviderHostname({})", provider.url),
            vector,
            actual,
        );
    }
}

#[test]
fn provider_list_overrides_match_the_ts() {
    for vector in list(&vectors(), "overrides") {
        let raw: Option<&str> = field(vector, "raw").as_str();
        let mode: Option<IpMode> = ip_mode(field(vector, "ipMode"));
        assert_eq!(
            providers_json(get_provider_list_override(raw, mode)),
            *field(vector, "result"),
            "getProviderListOverride({raw:?}, {mode:?})"
        );
    }
}

#[test]
fn development_provider_urls_match_the_ts() {
    for vector in list(&vectors(), "development") {
        let override_url: Option<&str> = field(vector, "override").as_str();
        assert_eq!(
            get_development_provider_url(override_url),
            text(field(vector, "result")),
            "getDevelopmentProviderUrl({override_url:?})"
        );
    }
}

#[test]
fn load_balancer_urls_match_the_ts() {
    for vector in list(&vectors(), "loadBalancerUrls") {
        let environment: EnvironmentTypes = environment(field(vector, "environment"));
        match (vector.get("envError"), get_load_balancer_url(environment)) {
            (None, Ok(url)) => assert_eq!(url, text(field(vector, "result")), "{environment}"),
            (Some(expected), Err(LoadBalancerError::UnknownEnvironment(error))) => {
                assert_eq!(
                    error.message(),
                    text(field(expected, "message")),
                    "{environment}"
                );
                assert_eq!(
                    error.translation_key(),
                    field(expected, "translationKey").as_str(),
                    "{environment}"
                );
                let context: Value = error
                    .context()
                    .map_or(Value::Null, |context| context.to_json());
                assert_eq!(
                    context,
                    *field(expected, "context"),
                    "{environment}: context"
                );
            }
            (_, actual) => panic!("{environment}: TS gave {vector}, Rust gave {actual:?}"),
        }
    }
}

/// Answers with the scenario's body, or never when the scenario stalls.
struct ScenarioFetch {
    body: Option<Vec<u8>>,
    requests: Arc<Mutex<Vec<String>>>,
}

impl ProviderListFetch for ScenarioFetch {
    fn get(&self, url: &str) -> FetchFuture {
        self.requests
            .lock()
            .expect("requests lock")
            .push(url.to_string());
        let body: Option<Vec<u8>> = self.body.clone();
        Box::pin(async move {
            match body {
                Some(body) => Ok(body),
                None => std::future::pending().await,
            }
        })
    }
}

fn scenario_body(scenario: &Value) -> Option<Vec<u8>> {
    if scenario.get("stall").and_then(Value::as_bool) == Some(true) {
        return None;
    }
    if let Some(encoded) = scenario.get("bodyBase64").and_then(Value::as_str) {
        return Some(prosopo_util_crypto::base64_decode(encoded, false).expect("base64"));
    }
    Some(
        scenario
            .get("body")
            .and_then(Value::as_str)
            .unwrap_or("")
            .as_bytes()
            .to_vec(),
    )
}

#[tokio::test]
async fn load_balancer_matches_the_ts() {
    for vector in list(&vectors(), "loads") {
        let scenario: &Value = field(vector, "scenario");
        let label: &str = text(field(scenario, "label"));
        let requests: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));
        let variables: Value = json!({
            PROVIDER_LIST_ENV: scenario.get("listOverride"),
            DEVELOPMENT_PROVIDER_URL_ENV: scenario.get("developmentOverride"),
        });
        let env: EnvLookup = Arc::new(move |name: &str| {
            variables
                .get(name)
                .and_then(Value::as_str)
                .map(str::to_string)
        });
        let balancer: LoadBalancer = LoadBalancer::with(
            Arc::new(ScenarioFetch {
                body: scenario_body(scenario),
                requests: requests.clone(),
            }),
            env,
        );
        let timeout_ms: u64 = scenario
            .get("timeoutMs")
            .and_then(Value::as_u64)
            .unwrap_or(PROVIDER_LIST_FETCH_TIMEOUT_MS);
        let actual: Result<Value> = balancer
            .providers(
                environment(field(scenario, "environment")),
                ip_mode(scenario.get("ipMode").unwrap_or(&Value::Null)),
                timeout_ms,
            )
            .await
            .map(providers_json);
        let recorded: Vec<String> = requests.lock().expect("requests lock").clone();
        assert_eq!(
            json!(recorded),
            *field(vector, "requests"),
            "{label}: requests"
        );
        if vector.get("name").and_then(Value::as_str) == Some("SyntaxError") {
            assert!(
                actual.is_err(),
                "{label}: TS threw a SyntaxError, Rust gave {actual:?}"
            );
        } else {
            check(label, vector, actual);
        }
    }
}
