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

//! Replays rust/equivalence/vectors.json, recorded from the TS by generate.ts: the request
//! each call sends, and what it makes of the response.

use crate::*;
use prosopo_types::client::Tier;
use prosopo_types::provider_api::ClientApiPaths;
use prosopo_types::settings_types::UserSettings;
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};

const VECTORS: &str = include_str!("equivalence/vectors.json");

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

fn headers(value: Option<&Value>) -> Option<Headers> {
    value.and_then(Value::as_object).map(|headers| {
        headers
            .iter()
            .map(|(name, value)| (name.clone(), text(value).to_string()))
            .collect()
    })
}

/// Answers every request with the scenario's response, recording what was sent.
struct ScenarioTransport {
    response: Value,
    requests: Arc<Mutex<Vec<HttpRequest>>>,
}

impl Transport for ScenarioTransport {
    fn send(&self, request: HttpRequest) -> TransportFuture {
        let url: String = request.url.clone();
        self.requests.lock().expect("requests lock").push(request);
        let response: Value = self.response.clone();
        Box::pin(async move {
            if let Some(message) = response.get("networkError") {
                return Err(ApiError::Network(text(message).to_string()));
            }
            Ok(HttpResponse {
                status: field(&response, "status").as_u64().expect("a status") as u16,
                status_text: text(field(&response, "statusText")).to_string(),
                url,
                content_type: response
                    .get("contentType")
                    .and_then(Value::as_str)
                    .map(str::to_string),
                body: text(field(&response, "body")).as_bytes().to_vec(),
            })
        })
    }
}

fn options(client: &Value, transport: Arc<dyn Transport>) -> ClientOptions {
    ClientOptions {
        timeout_ms: client.get("timeoutMs").and_then(Value::as_u64),
        default_headers: headers(client.get("defaultHeaders")).unwrap_or_default(),
        transport: Some(transport),
    }
}

fn request_options(call: &Value) -> RequestOptions {
    let init: Option<&Value> = call.get("init");
    RequestOptions {
        method: init
            .and_then(|init| init.get("method"))
            .and_then(Value::as_str)
            .map(str::to_string),
        headers: headers(init.and_then(|init| init.get("headers"))),
    }
}

async fn run(
    client: &Value,
    call: &Value,
    transport: Arc<dyn Transport>,
) -> Result<Value, ApiError> {
    let base_url: &str = text(field(client, "baseUrl"));
    let account: &str = client.get("account").and_then(Value::as_str).unwrap_or("");
    let options: ClientOptions = options(client, transport);
    match (text(field(client, "kind")), text(field(call, "op"))) {
        ("base", "fetch") => {
            let prefix: &str = client.get("prefix").and_then(Value::as_str).unwrap_or("");
            HttpClient::new(base_url, prefix, options)
                .fetch(text(field(call, "input")), request_options(call))
                .await
        }
        ("base", "post") => {
            let prefix: &str = client.get("prefix").and_then(Value::as_str).unwrap_or("");
            HttpClient::new(base_url, prefix, options)
                .post(
                    text(field(call, "input")),
                    call.get("body"),
                    request_options(call),
                )
                .await
        }
        ("apiClient", "fetch") => {
            ApiClient::new(base_url, account, options)
                .http()
                .fetch(text(field(call, "input")), RequestOptions::default())
                .await
        }
        ("providerApi", "forwardVerify") => {
            let path: ClientApiPaths = text(field(call, "path")).parse().expect("a client path");
            ProviderApi::new(base_url, account, options)
                .forward_verify(path, field(call, "body"), text(field(call, "user")))
                .await
        }
        ("providerApi", "registerSiteKey") => {
            let tier: Tier = text(field(call, "tier")).parse().expect("a tier");
            let settings: UserSettings =
                serde_json::from_value(field(call, "settings").clone()).expect("settings");
            ProviderApi::new(base_url, account, options)
                .register_site_key(
                    text(field(call, "siteKey")),
                    tier,
                    &settings,
                    text(field(call, "jwt")),
                )
                .await
        }
        (kind, op) => panic!("no {kind} {op} call"),
    }
}

fn request_json(request: &HttpRequest) -> Value {
    json!({
        "url": request.url,
        "method": request.method,
        "headers": request.headers.iter().map(|(name, value)| json!([name, value])).collect::<Vec<Value>>(),
        "body": request.body,
    })
}

#[tokio::test]
async fn requests_and_responses_match_the_ts() {
    let vectors: Value = serde_json::from_str(VECTORS).expect("vectors.json parses");
    for scenario in field(&vectors, "scenarios").as_array().expect("scenarios") {
        let label: &str = text(field(scenario, "label"));
        let requests: Arc<Mutex<Vec<HttpRequest>>> = Arc::new(Mutex::new(Vec::new()));
        let transport: Arc<dyn Transport> = Arc::new(ScenarioTransport {
            response: field(scenario, "response").clone(),
            requests: requests.clone(),
        });
        let outcome: Result<Value, ApiError> = run(
            field(scenario, "client"),
            field(scenario, "call"),
            transport,
        )
        .await;
        let sent: Vec<Value> = requests
            .lock()
            .expect("requests lock")
            .iter()
            .map(request_json)
            .collect();
        assert_eq!(
            Value::Array(sent),
            *field(scenario, "requests"),
            "{label}: requests"
        );
        match (
            scenario.get("result"),
            scenario.get("name").and_then(Value::as_str),
            outcome,
        ) {
            (Some(expected), None, Ok(actual)) => assert_eq!(&actual, expected, "{label}"),
            (None, Some("HttpError"), Err(error @ ApiError::Http(_))) => {
                assert_eq!(error.to_string(), text(field(scenario, "error")), "{label}");
            }
            (None, Some("TypeError"), Err(ApiError::Network(message))) => {
                assert_eq!(message, text(field(scenario, "error")), "{label}");
            }
            (None, Some("SyntaxError"), Err(ApiError::InvalidJson(_))) => {}
            (_, _, outcome) => panic!("{label}: TS gave {scenario}, Rust gave {outcome:?}"),
        }
    }
}
