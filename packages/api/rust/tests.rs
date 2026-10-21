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

//! Ports of the server-side cases in src/tests/*.unit.test.ts, one test each. Not ported,
//! because the code they cover stays TS in the widget or the server SDK: `postWithHeaders`
//! (only the widget's frictionless call uses it), and every `ProviderApi` method but
//! `forwardVerify` and `registerSiteKey`. "A caller's own abort signal still works alongside
//! the timeout" has no counterpart: a Rust caller cancels by dropping the future.

use crate::*;
use prosopo_types::client::Tier;
use prosopo_types::provider_api::{AdminApiPaths, ClientApiPaths};
use prosopo_types::settings::client_settings_schema;
use prosopo_types::settings_types::UserSettings;
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

const BASE_URL: &str = "https://provider.prosopo.io";
const SITE_KEY: &str = "5site000000000000000000000000000000000000000000000000";
const USER: &str = "5user000000000000000000000000000000000000000000000000";

/// What a stubbed response looks like; `fail` makes the transport reject instead.
#[derive(Clone)]
struct Reply {
    status: u16,
    status_text: &'static str,
    content_type: Option<&'static str>,
    body: String,
    fail: Option<&'static str>,
}

fn json_reply(body: Value) -> Reply {
    Reply {
        status: 200,
        status_text: "OK",
        content_type: Some("application/json"),
        body: body.to_string(),
        fail: None,
    }
}

fn reply(status: u16, content_type: Option<&'static str>, body: &str) -> Reply {
    Reply {
        status,
        status_text: "Error",
        content_type,
        body: body.to_string(),
        fail: None,
    }
}

fn failure(message: &'static str) -> Reply {
    Reply {
        fail: Some(message),
        ..json_reply(json!({}))
    }
}

/// The `stubFetch` harness: records every request and answers with `reply`.
#[derive(Clone)]
struct Stub {
    reply: Arc<Mutex<Reply>>,
    requests: Arc<Mutex<Vec<HttpRequest>>>,
}

impl Stub {
    fn new() -> Stub {
        Stub {
            reply: Arc::new(Mutex::new(json_reply(json!({ "status": "ok" })))),
            requests: Arc::new(Mutex::new(Vec::new())),
        }
    }

    fn respond(&self, reply: Reply) {
        *self.reply.lock().expect("reply lock") = reply;
    }

    fn last(&self) -> HttpRequest {
        self.requests
            .lock()
            .expect("requests lock")
            .last()
            .cloned()
            .expect("a request was made")
    }

    fn header(&self, name: &str) -> Option<String> {
        self.last()
            .headers
            .iter()
            .find(|(header, _)| header == name)
            .map(|(_, value)| value.clone())
    }

    fn body(&self) -> Value {
        serde_json::from_str(self.last().body.as_deref().expect("a body")).expect("a JSON body")
    }

    fn options(&self, default_headers: Headers) -> ClientOptions {
        ClientOptions {
            timeout_ms: None,
            default_headers,
            transport: Some(Arc::new(self.clone())),
        }
    }

    fn client(&self, prefix: &str) -> HttpClient {
        HttpClient::new(BASE_URL, prefix, self.options(Vec::new()))
    }
}

impl Transport for Stub {
    fn send(&self, request: HttpRequest) -> TransportFuture {
        let url: String = request.url.clone();
        self.requests.lock().expect("requests lock").push(request);
        let reply: Reply = self.reply.lock().expect("reply lock").clone();
        Box::pin(async move {
            if let Some(message) = reply.fail {
                return Err(ApiError::Network(message.to_string()));
            }
            Ok(HttpResponse {
                status: reply.status,
                status_text: reply.status_text.to_string(),
                url,
                content_type: reply.content_type.map(str::to_string),
                body: reply.body.into_bytes(),
            })
        })
    }
}

fn headers(pairs: &[(&str, &str)]) -> Headers {
    pairs
        .iter()
        .map(|(name, value)| (name.to_string(), value.to_string()))
        .collect()
}

fn with_headers(pairs: &[(&str, &str)]) -> RequestOptions {
    RequestOptions {
        method: None,
        headers: Some(headers(pairs)),
    }
}

fn none() -> Option<&'static Value> {
    None
}

mod the_base_url {
    use super::*;

    #[test]
    fn defaults_to_no_prefix() {
        assert_eq!(Stub::new().client("").base_url(), BASE_URL);
    }

    #[tokio::test]
    async fn appends_the_prefix_so_paths_stay_relative_to_it() {
        let stub = Stub::new();
        let with_prefix: HttpClient = stub.client("/v1");
        assert_eq!(with_prefix.base_url(), format!("{BASE_URL}/v1"));
        with_prefix
            .fetch("/status", RequestOptions::default())
            .await
            .expect("responds");
        assert_eq!(stub.last().url, format!("{BASE_URL}/v1/status"));
    }

    #[tokio::test]
    async fn an_empty_path_still_hits_the_base_url() {
        let stub = Stub::new();
        stub.client("")
            .fetch("", RequestOptions::default())
            .await
            .expect("responds");
        assert_eq!(stub.last().url, BASE_URL);
    }
}

mod fetch {
    use super::*;

    async fn get(stub: &Stub) -> Result<Value, ApiError> {
        stub.client("")
            .fetch("/status", RequestOptions::default())
            .await
    }

    #[tokio::test]
    async fn returns_the_parsed_json_body() {
        let stub = Stub::new();
        stub.respond(json_reply(json!({ "registered": true })));
        assert_eq!(get(&stub).await, Ok(json!({ "registered": true })));
    }

    #[tokio::test]
    async fn passes_the_callers_init_straight_through() {
        let stub = Stub::new();
        stub.client("")
            .fetch("/status", with_headers(&[("X-Test", "1")]))
            .await
            .expect("responds");
        assert_eq!(stub.last().headers, headers(&[("X-Test", "1")]));
    }

    #[tokio::test]
    async fn throws_an_http_error_for_a_non_json_failure() {
        let stub = Stub::new();
        stub.respond(Reply {
            status_text: "Bad Gateway",
            ..reply(502, Some("text/plain"), "gateway down")
        });
        assert!(matches!(get(&stub).await, Err(ApiError::Http(_))));
    }

    #[tokio::test]
    async fn a_json_error_body_is_handed_back_instead_of_thrown_so_callers_can_read_the_error() {
        let stub = Stub::new();
        stub.respond(reply(
            429,
            Some("application/json"),
            r#"{"error":{"message":"rate limited"}}"#,
        ));
        assert_eq!(
            get(&stub).await,
            Ok(json!({ "error": { "message": "rate limited" } }))
        );
    }

    #[tokio::test]
    async fn a_400_is_handed_back_even_without_a_json_content_type() {
        let stub = Stub::new();
        stub.respond(reply(400, Some("text/plain"), r#"{"error":"bad request"}"#));
        assert_eq!(get(&stub).await, Ok(json!({ "error": "bad request" })));
    }

    #[tokio::test]
    async fn a_response_with_no_content_type_at_all_is_treated_as_a_failure() {
        let stub = Stub::new();
        stub.respond(reply(500, None, ""));
        assert!(matches!(get(&stub).await, Err(ApiError::Http(_))));
    }

    #[tokio::test]
    async fn rejects_with_the_network_error_when_fetch_itself_fails() {
        let stub = Stub::new();
        stub.respond(failure("network down"));
        assert_eq!(
            get(&stub).await,
            Err(ApiError::Network("network down".to_string()))
        );
    }

    #[tokio::test]
    async fn rejects_when_the_body_is_not_valid_json() {
        let stub = Stub::new();
        stub.respond(reply(
            200,
            Some("application/json"),
            "<html>not json</html>",
        ));
        assert!(matches!(get(&stub).await, Err(ApiError::InvalidJson(_))));
    }

    #[tokio::test]
    async fn an_empty_200_body_is_a_parse_failure_not_a_silent_undefined() {
        let stub = Stub::new();
        stub.respond(reply(200, Some("application/json"), ""));
        assert!(matches!(get(&stub).await, Err(ApiError::InvalidJson(_))));
    }
}

mod post {
    use super::*;

    #[tokio::test]
    async fn sends_the_body_as_json_with_the_right_method() {
        let stub = Stub::new();
        stub.client("")
            .post(
                "/solve",
                Some(&json!({ "nonce": 1 })),
                RequestOptions::default(),
            )
            .await
            .expect("responds");
        assert_eq!(stub.last().method, "POST");
        assert_eq!(stub.body(), json!({ "nonce": 1 }));
        assert_eq!(
            stub.header("Content-Type").as_deref(),
            Some("application/json")
        );
    }

    #[tokio::test]
    async fn caller_headers_are_merged_on_top_of_the_content_type() {
        let stub = Stub::new();
        stub.client("")
            .post(
                "/solve",
                Some(&json!({})),
                with_headers(&[("Prosopo-Site-Key", "key")]),
            )
            .await
            .expect("responds");
        assert_eq!(
            stub.last().headers,
            headers(&[
                ("Content-Type", "application/json"),
                ("Prosopo-Site-Key", "key")
            ])
        );
    }

    #[tokio::test]
    async fn a_caller_may_override_the_content_type() {
        let stub = Stub::new();
        stub.client("")
            .post(
                "/solve",
                Some(&json!({})),
                with_headers(&[("Content-Type", "text/*")]),
            )
            .await
            .expect("responds");
        assert_eq!(stub.header("Content-Type").as_deref(), Some("text/*"));
    }

    #[tokio::test]
    async fn headers_survive_an_init_that_also_carries_other_options() {
        let stub = Stub::new();
        let options: RequestOptions = RequestOptions {
            method: Some("PUT".to_string()),
            headers: Some(headers(&[("X-A", "1")])),
        };
        stub.client("")
            .post("/solve", Some(&json!({})), options)
            .await
            .expect("responds");
        assert_eq!(stub.last().method, "PUT");
        assert_eq!(
            stub.header("Content-Type").as_deref(),
            Some("application/json")
        );
        assert_eq!(stub.header("X-A").as_deref(), Some("1"));
    }

    #[tokio::test]
    async fn an_undefined_body_still_produces_a_request() {
        let stub = Stub::new();
        stub.client("")
            .post("/solve", none(), RequestOptions::default())
            .await
            .expect("responds");
        assert_eq!(stub.last().body, None);
    }

    #[tokio::test]
    async fn a_zero_length_array_body_is_sent_not_dropped() {
        let stub = Stub::new();
        stub.client("")
            .post("/events", Some(&json!([])), RequestOptions::default())
            .await
            .expect("responds");
        assert_eq!(stub.last().body.as_deref(), Some("[]"));
    }

    #[tokio::test]
    async fn returns_the_parsed_response() {
        let stub = Stub::new();
        stub.respond(json_reply(json!({ "verified": true })));
        let response = stub
            .client("")
            .post("/solve", Some(&json!({})), RequestOptions::default())
            .await;
        assert_eq!(response, Ok(json!({ "verified": true })));
    }

    #[tokio::test]
    async fn throws_an_http_error_for_a_non_json_failure() {
        let stub = Stub::new();
        stub.respond(reply(503, None, "nope"));
        let response = stub
            .client("")
            .post("/solve", Some(&json!({})), RequestOptions::default())
            .await;
        assert!(matches!(response, Err(ApiError::Http(_))));
    }

    #[tokio::test]
    async fn hands_back_a_400_json_body() {
        let stub = Stub::new();
        stub.respond(reply(400, Some("application/json"), r#"{"error":"bad"}"#));
        let response = stub
            .client("")
            .post("/solve", Some(&json!({})), RequestOptions::default())
            .await;
        assert_eq!(response, Ok(json!({ "error": "bad" })));
    }

    #[tokio::test]
    async fn rejects_with_the_network_error() {
        let stub = Stub::new();
        stub.respond(failure("offline"));
        let response = stub
            .client("")
            .post("/solve", Some(&json!({})), RequestOptions::default())
            .await;
        assert_eq!(response, Err(ApiError::Network("offline".to_string())));
    }
}

mod http_error {
    use super::*;

    #[test]
    fn carries_the_status_text_and_url_a_caller_needs_to_triage() {
        let error: HttpError = HttpError {
            status: 429,
            status_text: "Too Many Requests".to_string(),
            url: format!("{BASE_URL}/pow"),
        };
        assert_eq!(error.status, 429);
        assert_eq!(error.status_text, "Too Many Requests");
        assert_eq!(error.url, format!("{BASE_URL}/pow"));
        assert_eq!(
            ApiError::Http(error).to_string(),
            format!("HTTP error! status: 429 (Too Many Requests) for URL: {BASE_URL}/pow")
        );
    }

    #[test]
    fn is_distinguishable_from_any_other_error_at_a_catch_site() {
        let http: ApiError = ApiError::Http(HttpError {
            status: 500,
            status_text: String::new(),
            url: String::new(),
        });
        assert!(matches!(http, ApiError::Http(_)));
        assert!(!matches!(
            ApiError::Network("plain".to_string()),
            ApiError::Http(_)
        ));
    }
}

mod api_client {
    use super::*;

    fn probe(stub: &Stub, base_url: &str) -> ApiClient {
        ApiClient::new(base_url, "account", stub.options(Vec::new()))
    }

    #[test]
    fn keeps_an_explicit_protocol() {
        let stub = Stub::new();
        assert_eq!(
            probe(&stub, "http://localhost:9229").http().base_url(),
            "http://localhost:9229"
        );
    }

    #[tokio::test]
    async fn assumes_https_when_the_url_has_no_protocol() {
        let stub = Stub::new();
        probe(&stub, "provider.prosopo.io")
            .http()
            .fetch("/status", RequestOptions::default())
            .await
            .expect("responds");
        assert_eq!(stub.last().url, "https://provider.prosopo.io/status");
    }

    #[tokio::test]
    async fn does_not_upgrade_an_https_url_twice() {
        let stub = Stub::new();
        probe(&stub, "https://provider.prosopo.io")
            .http()
            .fetch("/status", RequestOptions::default())
            .await
            .expect("responds");
        assert_eq!(stub.last().url, "https://provider.prosopo.io/status");
    }

    #[tokio::test]
    async fn an_empty_base_url_becomes_a_relative_https_url_not_a_crash() {
        let stub = Stub::new();
        probe(&stub, "")
            .http()
            .fetch("/status", RequestOptions::default())
            .await
            .expect("responds");
        assert_eq!(stub.last().url, "https:///status");
    }
}

mod default_headers {
    use super::*;

    fn language() -> Headers {
        headers(&[("Prosopo-Lang", "tr,en")])
    }

    fn with_defaults(stub: &Stub) -> HttpClient {
        HttpClient::new(BASE_URL, "", stub.options(language()))
    }

    #[tokio::test]
    async fn go_with_every_get() {
        let stub = Stub::new();
        with_defaults(&stub)
            .fetch("/status", RequestOptions::default())
            .await
            .expect("responds");
        assert_eq!(stub.last().headers, language());
    }

    #[tokio::test]
    async fn go_with_every_post_next_to_the_json_content_type() {
        let stub = Stub::new();
        with_defaults(&stub)
            .post(
                "/captcha",
                Some(&json!({ "a": 1 })),
                RequestOptions::default(),
            )
            .await
            .expect("responds");
        assert_eq!(
            stub.last().headers,
            headers(&[
                ("Content-Type", "application/json"),
                ("Prosopo-Lang", "tr,en")
            ])
        );
    }

    #[tokio::test]
    async fn lose_to_a_header_the_call_passes_itself() {
        let stub = Stub::new();
        with_defaults(&stub)
            .fetch("/status", with_headers(&[("Prosopo-Lang", "de")]))
            .await
            .expect("responds");
        assert_eq!(stub.header("Prosopo-Lang").as_deref(), Some("de"));
        with_defaults(&stub)
            .post(
                "/captcha",
                Some(&json!({})),
                with_headers(&[("Prosopo-Lang", "fr")]),
            )
            .await
            .expect("responds");
        assert_eq!(stub.header("Prosopo-Lang").as_deref(), Some("fr"));
    }

    #[tokio::test]
    async fn are_passed_on_by_api_client() {
        let stub = Stub::new();
        ApiClient::new(BASE_URL, "account", stub.options(language()))
            .http()
            .fetch("/status", RequestOptions::default())
            .await
            .expect("responds");
        assert_eq!(stub.last().headers, language());
    }

    #[tokio::test]
    async fn leave_a_gets_init_untouched_when_there_are_none() {
        let stub = Stub::new();
        stub.client("")
            .fetch("/status", RequestOptions::default())
            .await
            .expect("responds");
        assert!(stub.last().headers.is_empty());
    }
}

mod forward_verify {
    use super::*;

    fn api(stub: &Stub) -> ProviderApi {
        ProviderApi::new(BASE_URL, SITE_KEY, stub.options(Vec::new()))
    }

    #[tokio::test]
    async fn marks_the_request_as_forwarded_so_the_receiver_does_not_forward_again() {
        let stub = Stub::new();
        api(&stub)
            .forward_verify(
                ClientApiPaths::VerifyPowCaptchaSolution,
                &json!({ "token": "token" }),
                USER,
            )
            .await
            .expect("responds");
        assert_eq!(
            stub.last().url,
            format!(
                "{BASE_URL}{}",
                ClientApiPaths::VerifyPowCaptchaSolution.as_str()
            )
        );
        assert_eq!(
            stub.header(VERIFY_FORWARDED_HEADER).as_deref(),
            Some("true")
        );
    }

    #[test]
    fn the_marker_header_is_lowercase_to_match_expresss_normalised_keys() {
        assert_eq!(
            VERIFY_FORWARDED_HEADER,
            VERIFY_FORWARDED_HEADER.to_lowercase()
        );
    }

    #[tokio::test]
    async fn forwards_the_body_verbatim() {
        let stub = Stub::new();
        let forwarded: Value = json!({ "token": "token", "extra": "kept" });
        api(&stub)
            .forward_verify(
                ClientApiPaths::VerifyImageCaptchaSolutionDapp,
                &forwarded,
                USER,
            )
            .await
            .expect("responds");
        assert_eq!(stub.body(), forwarded);
    }
}

mod admin_endpoints {
    use super::*;

    const JWT: &str = "jwt-token";

    fn settings() -> UserSettings {
        let parsed: Value = client_settings_schema()
            .safe_parse(Some(&json!({
                "captchaType": "pow",
                "domains": ["example.com"],
                "frictionlessThreshold": 0.5,
                "powDifficulty": 4,
            })))
            .expect("valid settings")
            .expect("an object");
        serde_json::from_value(parsed).expect("UserSettings")
    }

    fn api(stub: &Stub) -> ProviderApi {
        ProviderApi::new(BASE_URL, SITE_KEY, stub.options(Vec::new()))
    }

    #[tokio::test]
    async fn every_admin_call_is_bearer_authorised_and_site_key_scoped() {
        let stub = Stub::new();
        api(&stub)
            .register_site_key(SITE_KEY, Tier::Free, &settings(), JWT)
            .await
            .expect("responds");
        assert_eq!(stub.header("Authorization"), Some(format!("Bearer {JWT}")));
        assert_eq!(stub.header("Prosopo-Site-Key").as_deref(), Some(SITE_KEY));
    }

    #[tokio::test]
    async fn registers_one_site_key() {
        let stub = Stub::new();
        let settings: UserSettings = settings();
        api(&stub)
            .register_site_key(SITE_KEY, Tier::Free, &settings, JWT)
            .await
            .expect("responds");
        assert_eq!(
            stub.last().url,
            format!("{BASE_URL}{}", AdminApiPaths::SiteKeyRegister.as_str())
        );
        let expected: Value = serde_json::to_value(&settings).expect("serialises");
        assert_eq!(
            stub.body(),
            json!({ "siteKey": SITE_KEY, "tier": "free", "settings": expected })
        );
    }

    #[tokio::test]
    async fn an_admin_failure_surfaces_as_an_http_error() {
        let stub = Stub::new();
        stub.respond(reply(403, None, "forbidden"));
        let result = api(&stub)
            .register_site_key(SITE_KEY, Tier::Free, &settings(), JWT)
            .await;
        assert!(matches!(
            result,
            Err(ApiError::Http(HttpError { status: 403, .. }))
        ));
    }
}

/// httpClientTimeout.unit.test.ts: against a real local server that stalls, so the timeout
/// is proven on the real transport.
mod request_timeout {
    use super::*;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    const TIMEOUT_MS: u64 = 200;

    /// `/fast` answers, `/stall-body` sends headers and half a body, anything else never answers.
    async fn server() -> String {
        let listener: TcpListener = TcpListener::bind("127.0.0.1:0").await.expect("binds");
        let address = listener.local_addr().expect("an address");
        tokio::spawn(async move {
            loop {
                let Ok((mut socket, _)) = listener.accept().await else {
                    return;
                };
                tokio::spawn(async move {
                    let mut request: Vec<u8> = Vec::new();
                    let mut buffer: [u8; 1024] = [0; 1024];
                    while !request.windows(4).any(|window| window == b"\r\n\r\n") {
                        match socket.read(&mut buffer).await {
                            Ok(0) | Err(_) => return,
                            Ok(read) => request.extend_from_slice(&buffer[..read]),
                        }
                    }
                    let head: String = String::from_utf8_lossy(&request).to_string();
                    if head.starts_with("GET /fast ") {
                        let body: &str = r#"{"ok":true}"#;
                        let response: String = format!(
                            "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\n\r\n{body}",
                            body.len()
                        );
                        let _ = socket.write_all(response.as_bytes()).await;
                    } else if head.starts_with("GET /stall-body ") {
                        let _ = socket
                            .write_all(b"HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: 100\r\n\r\n{\"ok\":")
                            .await;
                    }
                    tokio::time::sleep(Duration::from_secs(60)).await;
                });
            }
        });
        format!("http://{address}")
    }

    fn client(base_url: &str, timeout_ms: Option<u64>) -> HttpClient {
        HttpClient::new(
            base_url,
            "",
            ClientOptions {
                timeout_ms,
                ..ClientOptions::default()
            },
        )
    }

    async fn expect_timeout(call: impl std::future::Future<Output = Result<Value, ApiError>>) {
        let started: Instant = Instant::now();
        assert_eq!(call.await, Err(ApiError::TimedOut));
        let elapsed: Duration = started.elapsed();
        assert!(
            elapsed >= Duration::from_millis(TIMEOUT_MS / 2),
            "{elapsed:?}"
        );
        assert!(elapsed < Duration::from_secs(2), "{elapsed:?}");
    }

    #[tokio::test]
    async fn get_against_a_stalled_server_fails_at_the_timeout() {
        let base_url: String = server().await;
        expect_timeout(
            client(&base_url, Some(TIMEOUT_MS)).fetch("/stall", RequestOptions::default()),
        )
        .await;
    }

    #[tokio::test]
    async fn post_against_a_stalled_server_fails_at_the_timeout() {
        let base_url: String = server().await;
        let client: HttpClient = client(&base_url, Some(TIMEOUT_MS));
        expect_timeout(client.post(
            "/stall",
            Some(&json!({ "a": 1 })),
            RequestOptions::default(),
        ))
        .await;
    }

    #[tokio::test]
    async fn a_body_that_stalls_after_the_headers_is_also_cut_off() {
        let base_url: String = server().await;
        expect_timeout(
            client(&base_url, Some(TIMEOUT_MS)).fetch("/stall-body", RequestOptions::default()),
        )
        .await;
    }

    #[tokio::test]
    async fn api_client_forwards_the_timeout_to_the_transport() {
        let base_url: String = server().await;
        let api: ApiClient = ApiClient::new(
            &base_url,
            "account",
            ClientOptions {
                timeout_ms: Some(TIMEOUT_MS),
                ..ClientOptions::default()
            },
        );
        expect_timeout(api.http().fetch("/stall", RequestOptions::default())).await;
    }

    #[tokio::test]
    async fn a_fast_response_is_unaffected() {
        let base_url: String = server().await;
        let response = client(&base_url, Some(5_000))
            .fetch("/fast", RequestOptions::default())
            .await;
        assert_eq!(response, Ok(json!({ "ok": true })));
    }

    #[tokio::test]
    async fn without_a_timeout_the_request_is_left_to_the_platform_default() {
        let base_url: String = server().await;
        let client: HttpClient = client(&base_url, None);
        let outcome = tokio::time::timeout(
            Duration::from_millis(TIMEOUT_MS * 2),
            client.fetch("/stall", RequestOptions::default()),
        )
        .await;
        assert!(outcome.is_err(), "the request settled: {outcome:?}");
    }
}
