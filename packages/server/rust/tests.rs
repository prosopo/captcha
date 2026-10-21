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

//! Ports of src/tests/*.unit.test.ts, one test each. The TS spies on `ProviderApi` and
//! `findProvider`; here the provider list is a fixed one and the transport records each
//! request, so a test reads which endpoint was called from the request it sent. The TS
//! stub signer returns fixed bytes; here Alice signs, and a watch-only pair is the signer
//! that cannot.

use crate::test_support::*;
use crate::*;
use prosopo_api::{ApiError, HttpRequest};
use prosopo_common::{ContextValue, ProsopoError};
use prosopo_keyring::KeyringPair;
use prosopo_load_balancer::{EnvLookup, HardcodedProvider, IpMode};
use prosopo_locale::{Catalogues, I18n, I18nLookup, TranslateOptions};
use prosopo_types::config::{prosopo_server_config_schema, ProsopoServerConfig};
use prosopo_types::provider_api::ClientApiPaths;
use prosopo_types::timeouts::DEFAULT_PROVIDER_REQUEST_TIMEOUT_MS;
use prosopo_types::{
    decode_procaptcha_output, encode_procaptcha_output, procaptcha_token_codec_enc,
    procaptcha_token_codec_v1_enc, CaptchaType, OutputSignatures, ProcaptchaOutput, SignatureTypes,
    TokenDecodeError,
};
use prosopo_util_crypto::u8a::hex_to_u8a;
use serde_json::{json, Map, Value};
use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};

const PROVIDER_URL: &str = "https://pronode1.example";
const DAPP: &str = "5C1cs9CfxYQfNi3ARtprMDzR7BFRWFVSoDaLb1JytkiXwq5m";
const USER: &str = "5CFHA8d3S1XXkZuBwGqiuA6SECTzfoucq397YL34FuPAH89G";
const NOW: f64 = 1_710_000_060_000.0;

fn config_from(input: Value) -> ProsopoServerConfig {
    let parsed: Value = prosopo_server_config_schema()
        .safe_parse(Some(&input))
        .expect("a valid config")
        .expect("a config");
    serde_json::from_value(parsed).expect("a ProsopoServerConfig")
}

fn timeouts(pow: u64, image: u64, puzzle: u64) -> Value {
    json!({
        "image": { "challengeTimeout": 10_000, "solutionTimeout": 10_000, "verifiedTimeout": 10_000, "cachedTimeout": image },
        "pow": { "verifiedTimeout": 10_000, "solutionTimeout": 10_000, "cachedTimeout": pow },
        "puzzle": { "verifiedTimeout": 10_000, "solutionTimeout": 10_000, "cachedTimeout": puzzle },
        "iconOrder": { "verifiedTimeout": 10_000, "solutionTimeout": 10_000, "cachedTimeout": puzzle },
        "audio": { "verifiedTimeout": 10_000, "solutionTimeout": 10_000, "cachedTimeout": puzzle },
        "contract": { "maxVerifiedTime": 10_000 },
    })
}

fn build_config(pow: u64, image: u64, puzzle: u64) -> ProsopoServerConfig {
    config_from(json!({
        "dappName": "test",
        "logLevel": "info",
        "defaultEnvironment": "development",
        "account": { "address": DAPP },
        "timeouts": timeouts(pow, image, puzzle),
    }))
}

fn signatures(provider: SignatureTypes) -> OutputSignatures {
    OutputSignatures {
        provider,
        user: SignatureTypes {
            timestamp: Some("usig".to_string()),
            ..SignatureTypes::default()
        },
    }
}

fn base_output(timestamp: f64) -> ProcaptchaOutput {
    ProcaptchaOutput {
        commitment_id: None,
        provider_url: Some(PROVIDER_URL.to_string()),
        dapp: DAPP.to_string(),
        user: USER.to_string(),
        challenge: Some("challenge-string".to_string()),
        nonce: None,
        timestamp: format!("{timestamp}"),
        signature: signatures(SignatureTypes {
            challenge: Some("psig".to_string()),
            ..SignatureTypes::default()
        }),
        captcha_type: None,
    }
}

/// The TS image-shape override: a commitment and a request hash instead of a challenge.
fn image_shape(output: ProcaptchaOutput) -> ProcaptchaOutput {
    ProcaptchaOutput {
        challenge: None,
        commitment_id: Some("0xdeadbeef".to_string()),
        signature: signatures(SignatureTypes {
            request_hash: Some("req".to_string()),
            ..SignatureTypes::default()
        }),
        ..output
    }
}

fn build_token(timestamp: f64, captcha_type: Option<CaptchaType>) -> String {
    encode_procaptcha_output(&ProcaptchaOutput {
        captcha_type,
        ..base_output(timestamp)
    })
}

fn build_image_token(timestamp: f64, captcha_type: Option<CaptchaType>) -> String {
    encode_procaptcha_output(&ProcaptchaOutput {
        captcha_type,
        ..image_shape(base_output(timestamp))
    })
}

fn stub_provider_list() -> Vec<HardcodedProvider> {
    vec![provider(DAPP, PROVIDER_URL, "0xdatasetId")]
}

type Requests = Arc<Mutex<Vec<HttpRequest>>>;

fn server_with(
    config: ProsopoServerConfig,
    pair: Option<KeyringPair>,
    providers: Vec<HardcodedProvider>,
) -> (ProsopoServer, Requests) {
    let (transport, requests) =
        ScriptedTransport::new(json_reply(r#"{"status":"ok","verified":true}"#));
    let server: ProsopoServer = ProsopoServer::new(config, pair)
        .with_provider_directory(provider_directory(providers))
        .with_transport(transport)
        .with_clock(Arc::new(|| NOW));
    (server, requests)
}

fn server(config: ProsopoServerConfig) -> (ProsopoServer, Requests) {
    server_with(config, Some(alice()), stub_provider_list())
}

/// The endpoints called, by path.
fn called(requests: &Requests) -> Vec<ClientApiPaths> {
    requests
        .lock()
        .expect("requests lock")
        .iter()
        .map(|request: &HttpRequest| {
            request
                .url
                .strip_prefix(PROVIDER_URL)
                .and_then(|path: &str| path.parse().ok())
                .unwrap_or_else(|| panic!("not a client path: {}", request.url))
        })
        .collect()
}

fn verified(response: &Value) -> bool {
    response["verified"] == json!(true)
}

mod verify_provider_captcha_type_dispatch {
    use super::*;

    async fn dispatch(token: String) -> Vec<ClientApiPaths> {
        let (server, requests) = server(build_config(60_000, 60_000, 60_000));
        let result: Value = server
            .is_verified(&token, None, None, None)
            .await
            .expect("verifies");
        assert!(verified(&result));
        called(&requests)
    }

    #[tokio::test]
    async fn routes_puzzle_tokens_to_submit_puzzle_captcha_verify_only() {
        assert_eq!(
            dispatch(build_token(NOW, Some(CaptchaType::Puzzle))).await,
            vec![ClientApiPaths::VerifyPuzzleCaptchaSolution]
        );
    }

    #[tokio::test]
    async fn routes_icon_order_tokens_to_submit_icon_order_captcha_verify_only() {
        assert_eq!(
            dispatch(build_token(NOW, Some(CaptchaType::IconOrder))).await,
            vec![ClientApiPaths::VerifyIconOrderCaptchaSolution]
        );
    }

    #[tokio::test]
    async fn routes_audio_tokens_to_submit_audio_captcha_verify_only() {
        assert_eq!(
            dispatch(build_token(NOW, Some(CaptchaType::Audio))).await,
            vec![ClientApiPaths::VerifyAudioCaptchaSolution]
        );
    }

    #[tokio::test]
    async fn routes_pow_tokens_to_submit_pow_captcha_verify_only() {
        assert_eq!(
            dispatch(build_token(NOW, Some(CaptchaType::Pow))).await,
            vec![ClientApiPaths::VerifyPowCaptchaSolution]
        );
    }

    #[tokio::test]
    async fn routes_image_tokens_to_verify_dapp_user_only() {
        assert_eq!(
            dispatch(build_image_token(NOW, Some(CaptchaType::Image))).await,
            vec![ClientApiPaths::VerifyImageCaptchaSolutionDapp]
        );
    }
}

mod verify_provider_legacy_tokens {
    use super::*;

    async fn dispatch(token: String) -> Vec<ClientApiPaths> {
        let (server, requests) = server(build_config(60_000, 60_000, 60_000));
        server
            .is_verified(&token, None, None, None)
            .await
            .expect("verifies");
        called(&requests)
    }

    #[tokio::test]
    async fn legacy_token_with_challenge_routes_to_pow_preserves_historical_behaviour() {
        assert_eq!(
            dispatch(build_token(NOW, None)).await,
            vec![ClientApiPaths::VerifyPowCaptchaSolution]
        );
    }

    #[tokio::test]
    async fn legacy_token_without_challenge_routes_to_image() {
        assert_eq!(
            dispatch(build_image_token(NOW, None)).await,
            vec![ClientApiPaths::VerifyImageCaptchaSolutionDapp]
        );
    }

    /// Puzzle tokens minted before the captchaType field existed carry a challenge but no
    /// discriminant, so they cannot be told apart from pow tokens and go to the pow endpoint.
    #[tokio::test]
    async fn legacy_puzzle_looking_token_routes_to_pow_documents_the_unavoidable_compromise() {
        assert_eq!(
            dispatch(build_token(NOW, None)).await,
            vec![ClientApiPaths::VerifyPowCaptchaSolution]
        );
    }
}

mod verify_provider_recency_checks {
    use super::*;

    async fn verify(config: ProsopoServerConfig, token: String) -> (Value, Vec<ClientApiPaths>) {
        let (server, requests) = server(config);
        let result: Value = server
            .is_verified(&token, None, None, None)
            .await
            .expect("answers");
        (result, called(&requests))
    }

    #[tokio::test]
    async fn puzzle_uses_timeouts_puzzle_cached_timeout_expired_token_short_circuits() {
        let puzzle_cached: u64 = 1_000;
        let stale: f64 = NOW - (puzzle_cached + 100) as f64;
        let (result, called) = verify(
            build_config(60_000, 60_000, puzzle_cached),
            build_token(stale, Some(CaptchaType::Puzzle)),
        )
        .await;
        assert!(!verified(&result));
        assert_eq!(
            result["status"],
            json!("API.USER_NOT_VERIFIED_TIME_EXPIRED")
        );
        assert!(called.is_empty());
    }

    #[tokio::test]
    async fn pow_uses_timeouts_pow_cached_timeout_expired_token_short_circuits() {
        let pow_cached: u64 = 1_000;
        let stale: f64 = NOW - (pow_cached + 100) as f64;
        let (result, called) = verify(
            build_config(pow_cached, 60_000, 60_000),
            build_token(stale, Some(CaptchaType::Pow)),
        )
        .await;
        assert!(!verified(&result));
        assert!(called.is_empty());
    }

    #[tokio::test]
    async fn image_uses_timeouts_image_cached_timeout_expired_token_short_circuits() {
        let image_cached: u64 = 1_000;
        let stale: f64 = NOW - (image_cached + 100) as f64;
        let (result, called) = verify(
            build_config(60_000, image_cached, 60_000),
            build_image_token(stale, Some(CaptchaType::Image)),
        )
        .await;
        assert!(!verified(&result));
        assert!(called.is_empty());
    }

    #[tokio::test]
    async fn a_future_dated_token_beyond_the_clock_skew_allowance_short_circuits() {
        let (result, called) = verify(
            build_config(60_000, 60_000, 60_000),
            build_token(NOW + 60.0 * 60_000.0, Some(CaptchaType::Pow)),
        )
        .await;
        assert!(!verified(&result));
        assert!(called.is_empty());
    }

    #[tokio::test]
    async fn a_token_within_the_clock_skew_allowance_still_verifies() {
        let (result, called) = verify(
            build_config(60_000, 60_000, 60_000),
            build_token(NOW + 5_000.0, Some(CaptchaType::Pow)),
        )
        .await;
        assert!(verified(&result));
        assert_eq!(called, vec![ClientApiPaths::VerifyPowCaptchaSolution]);
    }
}

mod verify_provider_authenticated_web_bot_auth_tokens {
    use super::*;

    fn authenticated_token(timestamp: f64) -> String {
        build_token(timestamp, Some(CaptchaType::Authenticated))
    }

    #[tokio::test]
    async fn routes_to_submit_authenticated_captcha_verify_only_passing_ip_through() {
        let token: String = authenticated_token(NOW);
        let (server, requests) = server(build_config(60_000, 60_000, 60_000));
        let result: Value = server
            .is_verified(
                &token,
                Some("203.0.113.7"),
                Some("a@example.com"),
                Some("session-1"),
            )
            .await
            .expect("verifies");
        assert!(verified(&result));
        assert_eq!(
            called(&requests),
            vec![ClientApiPaths::VerifyAuthenticatedSession]
        );
        let request: HttpRequest = requests.lock().expect("requests lock")[0].clone();
        let body: Value =
            serde_json::from_str(request.body.as_deref().expect("a body")).expect("json");
        assert_eq!(body["token"], json!(token));
        assert!(body["dappSignature"].is_string());
        assert_eq!(body["ip"], json!("203.0.113.7"));
        assert_eq!(body["email"], json!("a@example.com"));
        assert_eq!(body["clientSessionId"], json!("session-1"));
        assert!(request
            .headers
            .contains(&("Prosopo-User".to_string(), USER.to_string())));
    }

    #[tokio::test]
    async fn rejects_a_token_older_than_the_pow_cached_timeout_without_calling_the_provider() {
        let pow_cached: u64 = 1_000;
        let (server, requests) = server(build_config(pow_cached, 60_000, 60_000));
        let result: Value = server
            .is_verified(
                &authenticated_token(NOW - (pow_cached + 100) as f64),
                None,
                None,
                None,
            )
            .await
            .expect("answers");
        assert!(!verified(&result));
        assert!(called(&requests).is_empty());
    }

    #[tokio::test]
    async fn accepts_a_token_inside_the_pow_window_even_when_other_windows_are_shorter() {
        let (server, requests) = server(build_config(60_000, 1_000, 1_000));
        let result: Value = server
            .is_verified(&authenticated_token(NOW - 5_000.0), None, None, None)
            .await
            .expect("verifies");
        assert!(verified(&result));
        assert_eq!(
            called(&requests),
            vec![ClientApiPaths::VerifyAuthenticatedSession]
        );
    }
}

mod is_verified_short_circuits {
    use super::*;

    #[tokio::test]
    async fn provider_not_in_the_provider_list_returns_user_not_verified() {
        let (server, _requests) = server_with(
            build_config(60_000, 60_000, 60_000),
            Some(alice()),
            vec![provider(
                DAPP,
                "https://a-different-provider.example",
                "0xother",
            )],
        );
        let result: Value = server
            .is_verified(
                &build_token(NOW, Some(CaptchaType::Puzzle)),
                None,
                None,
                None,
            )
            .await
            .expect("answers");
        assert!(!verified(&result));
        assert_eq!(result["status"], json!("API.USER_NOT_VERIFIED"));
    }

    #[tokio::test]
    async fn throws_bad_request_for_an_unparseable_token() {
        let (server, _requests) = server(build_config(60_000, 60_000, 60_000));
        let error: ProsopoError = server
            .is_verified("0xdeadbeef", None, None, None)
            .await
            .expect_err("rejects");
        assert_eq!(error.translation_key(), Some("API.BAD_REQUEST"));
    }
}

fn edge_config(cached: u64) -> ProsopoServerConfig {
    build_config(cached, cached, cached)
}

fn legacy_token(timestamp: f64, with_challenge: bool) -> String {
    encode_procaptcha_output(&ProcaptchaOutput {
        challenge: with_challenge.then(|| "challenge-string".to_string()),
        ..base_output(timestamp)
    })
}

mod verify_provider_signer_failures {
    use super::*;

    #[tokio::test]
    async fn throws_when_the_signer_cannot_produce_a_signature() {
        let (server, requests) = server_with(
            edge_config(60_000),
            Some(watch_only(ALICE)),
            stub_provider_list(),
        );
        server
            .is_verified(&legacy_token(NOW, true), None, None, None)
            .await
            .expect_err("rejects");
        assert!(called(&requests).is_empty());
    }
}

mod verify_provider_legacy_token_recency {
    use super::*;

    async fn verify(cached: u64, token: String) -> (Value, Vec<ClientApiPaths>) {
        let (server, requests) = server(edge_config(cached));
        let result: Value = server
            .is_verified(&token, None, None, None)
            .await
            .expect("answers");
        (result, called(&requests))
    }

    #[tokio::test]
    async fn rejects_a_stale_legacy_pow_token_without_calling_the_provider() {
        let (result, called) = verify(1, legacy_token(NOW - 60_000.0, true)).await;
        assert!(!verified(&result));
        assert!(called.is_empty());
    }

    #[tokio::test]
    async fn verifies_a_fresh_legacy_pow_token_via_the_pow_endpoint() {
        let (result, called) = verify(60_000, legacy_token(NOW, true)).await;
        assert!(verified(&result));
        assert_eq!(called, vec![ClientApiPaths::VerifyPowCaptchaSolution]);
    }

    #[tokio::test]
    async fn rejects_a_stale_legacy_image_token_without_calling_the_provider() {
        let (result, called) = verify(1, legacy_token(NOW - 60_000.0, false)).await;
        assert!(!verified(&result));
        assert!(called.is_empty());
    }

    #[tokio::test]
    async fn verifies_a_fresh_legacy_image_token_via_verify_dapp_user() {
        let (result, called) = verify(60_000, legacy_token(NOW, false)).await;
        assert!(verified(&result));
        assert_eq!(called, vec![ClientApiPaths::VerifyImageCaptchaSolutionDapp]);
    }
}

mod public_prosopo_server {
    use super::*;

    #[test]
    fn builds_a_server_from_a_config_alone_deriving_the_pair_from_the_site_key() {
        let mut config: ProsopoServerConfig = edge_config(60_000);
        config.account.address = Some(ALICE.to_string());
        let server: ProsopoServer = crate::public_prosopo_server(config).expect("builds");
        assert_eq!(
            server
                .pair()
                .map(|pair| pair.address().expect("an address")),
            Some(ALICE.to_string())
        );
    }

    #[test]
    fn rejects_a_site_key_that_is_not_a_valid_address() {
        assert!(crate::public_prosopo_server(edge_config(60_000)).is_err());
    }
}

/// A provider that accepts the verify request and never answers must not hold the site
/// owner's request open: `is_verified` has to fail closed, promptly. Over a real socket.
mod prosopo_server_against_a_stalled_provider {
    use super::*;
    use std::time::{Duration, Instant};
    use tokio::net::TcpListener;

    const TIMEOUT_MS: u64 = 250;

    fn build_config(timeout_ms: Option<u64>) -> Result<ProsopoServerConfig, Value> {
        let mut input: Map<String, Value> = Map::new();
        input.insert("defaultEnvironment".to_string(), json!("development"));
        input.insert("account".to_string(), json!({ "address": DAPP }));
        if let Some(timeout_ms) = timeout_ms {
            input.insert("providerRequestTimeoutMs".to_string(), json!(timeout_ms));
        }
        prosopo_server_config_schema()
            .safe_parse(Some(&Value::Object(input)))
            .map(|parsed| serde_json::from_value(parsed.expect("a config")).expect("a config"))
            .map_err(Value::from)
    }

    /// Accepts connections and holds them open without answering.
    async fn stalled_provider() -> String {
        let listener: TcpListener = TcpListener::bind("127.0.0.1:0").await.expect("binds");
        let address = listener.local_addr().expect("an address");
        tokio::spawn(async move {
            let mut held = Vec::new();
            while let Ok((socket, _)) = listener.accept().await {
                held.push(socket);
            }
        });
        format!("http://{address}")
    }

    async fn fails_closed_with_a_504_at_the_timeout(captcha_type: CaptchaType) {
        let provider_url: String = stalled_provider().await;
        let token: String = encode_procaptcha_output(&ProcaptchaOutput {
            provider_url: Some(provider_url.clone()),
            captcha_type: Some(captcha_type),
            ..base_output(prosopo_util_crypto::jwt::now_millis())
        });
        let server: ProsopoServer = ProsopoServer::new(
            build_config(Some(TIMEOUT_MS)).expect("a config"),
            Some(alice()),
        )
        .with_provider_directory(provider_directory(vec![provider(
            DAPP,
            &provider_url,
            "0xdataset",
        )]));
        let started: Instant = Instant::now();
        let error: ProsopoError = server
            .is_verified(&token, None, None, None)
            .await
            .expect_err("fails closed");
        let elapsed: Duration = started.elapsed();
        match error.context().and_then(|context| context.get("code")) {
            Some(ContextValue::Json(code)) => assert_eq!(*code, json!(504)),
            other => panic!("no code: {other:?}"),
        }
        assert!(
            elapsed >= Duration::from_millis(TIMEOUT_MS / 2),
            "{elapsed:?}"
        );
        assert!(elapsed < Duration::from_millis(5_000), "{elapsed:?}");
    }

    #[test]
    fn defaults_the_provider_timeout_to_10s() {
        assert_eq!(
            build_config(None)
                .expect("a config")
                .provider_request_timeout_ms
                .get(),
            DEFAULT_PROVIDER_REQUEST_TIMEOUT_MS as f64
        );
        assert_eq!(DEFAULT_PROVIDER_REQUEST_TIMEOUT_MS, 10_000);
    }

    #[test]
    fn rejects_a_non_positive_timeout() {
        assert!(build_config(Some(0)).is_err());
    }

    #[tokio::test]
    async fn fails_closed_with_a_504_at_the_timeout_pow() {
        fails_closed_with_a_504_at_the_timeout(CaptchaType::Pow).await;
    }

    #[tokio::test]
    async fn fails_closed_with_a_504_at_the_timeout_puzzle() {
        fails_closed_with_a_504_at_the_timeout(CaptchaType::Puzzle).await;
    }

    #[tokio::test]
    async fn fails_closed_with_a_504_at_the_timeout_image() {
        fails_closed_with_a_504_at_the_timeout(CaptchaType::Image).await;
    }

    #[tokio::test]
    async fn fails_closed_with_a_504_at_the_timeout_authenticated() {
        fails_closed_with_a_504_at_the_timeout(CaptchaType::Authenticated).await;
    }
}

mod translate {
    use super::*;

    struct English(I18n);

    impl I18nLookup for English {
        fn t(&self, key: &str) -> String {
            self.0.t("en", key, &TranslateOptions::default())
        }

        fn t_with(&self, key: &str, options: &TranslateOptions) -> String {
            self.0.t("en", key, options)
        }

        fn exists(&self, key: &str) -> bool {
            self.0.exists("en", key)
        }
    }

    /// The TS checks one process-wide i18next before and after `init`; here each server
    /// has its own translations or none.
    #[test]
    fn returns_the_key_before_i18next_is_initialised_then_the_translation() {
        let (untranslated, _requests) = server(edge_config(60_000));
        assert_eq!(
            untranslated.translate("API.USER_NOT_VERIFIED"),
            "API.USER_NOT_VERIFIED"
        );
        let mut resources: Map<String, Value> = Map::new();
        resources.insert(
            "en".to_string(),
            json!({ "translation": { "API": { "USER_NOT_VERIFIED": "Not verified" } } }),
        );
        let (server, _requests) = server(edge_config(60_000));
        let server: ProsopoServer = server.with_i18n(Arc::new(English(I18n::new(
            Catalogues::from_resources(resources),
        ))));
        assert_eq!(server.translate("API.USER_NOT_VERIFIED"), "Not verified");
        assert_eq!(
            server.translate("API.USER_NOT_VERIFIED_TIME_EXPIRED"),
            "API.USER_NOT_VERIFIED_TIME_EXPIRED"
        );
    }
}

mod detect_ip_mode {
    use super::*;

    fn mode(url: &str) -> Option<IpMode> {
        crate::detect_ip_mode(Some(url))
    }

    #[test]
    fn detects_ipv4_on_a_single_stack_sub_zone_url() {
        assert_eq!(
            mode("https://ipv4.pronode15.prosopo.io"),
            Some(IpMode::Ipv4)
        );
    }

    #[test]
    fn detects_ipv6_on_a_single_stack_sub_zone_url() {
        assert_eq!(
            mode("https://ipv6.pronode15.prosopo.io"),
            Some(IpMode::Ipv6)
        );
    }

    #[test]
    fn returns_undefined_for_a_dual_stack_url() {
        assert_eq!(mode("https://pronode15.prosopo.io"), None);
    }

    #[test]
    fn detects_ipv4_with_a_trailing_slash() {
        assert_eq!(
            mode("https://ipv4.pronode15.prosopo.io/"),
            Some(IpMode::Ipv4)
        );
    }

    #[test]
    fn detects_ipv4_with_a_path() {
        assert_eq!(
            mode("https://ipv4.pronode15.prosopo.io/some/path?q=1"),
            Some(IpMode::Ipv4)
        );
    }

    #[test]
    fn does_not_treat_an_ipv4_dash_prefix_as_ipv4() {
        assert_eq!(mode("https://ipv4-shim.pronode15.prosopo.io"), None);
    }

    #[test]
    fn does_not_treat_ipv4_as_a_substring_elsewhere_in_the_hostname() {
        assert_eq!(mode("https://pronode15.ipv4-thing.prosopo.io"), None);
    }

    #[test]
    fn detects_ipv4_regardless_of_scheme() {
        assert_eq!(mode("http://ipv4.pronode15.prosopo.io"), Some(IpMode::Ipv4));
    }

    #[test]
    fn returns_undefined_for_an_unparseable_url() {
        assert_eq!(mode("not-a-url"), None);
    }

    #[test]
    fn returns_undefined_for_an_empty_string() {
        assert_eq!(mode(""), None);
    }
}

fn env(pairs: &[(&str, &str)]) -> EnvLookup {
    let values: BTreeMap<String, String> = pairs
        .iter()
        .map(|(name, value)| (name.to_string(), value.to_string()))
        .collect();
    Arc::new(move |name: &str| values.get(name).cloned())
}

mod get_server_url {
    use super::*;

    #[test]
    fn falls_back_to_localhost_when_no_server_url_is_configured() {
        assert_eq!(crate::get_server_url(&env(&[])), "https://localhost:9228");
    }

    #[test]
    fn returns_a_url_that_already_carries_a_port_unchanged() {
        assert_eq!(
            crate::get_server_url(&env(&[(
                "PROSOPO_SERVER_URL",
                "https://provider.test:8080"
            )])),
            "https://provider.test:8080"
        );
    }

    #[test]
    fn appends_the_configured_port_to_a_portless_url() {
        assert_eq!(
            crate::get_server_url(&env(&[
                ("PROSOPO_SERVER_URL", "https://provider.test"),
                ("PROSOPO_SERVER_PORT", "1234"),
            ])),
            "https://provider.test:1234"
        );
    }

    #[test]
    fn appends_the_default_port_when_only_the_url_is_set() {
        assert_eq!(
            crate::get_server_url(&env(&[("PROSOPO_SERVER_URL", "https://provider.test")])),
            "https://provider.test:9228"
        );
    }

    #[test]
    fn treats_an_empty_server_url_as_absent() {
        assert_eq!(
            crate::get_server_url(&env(&[("PROSOPO_SERVER_URL", "")])),
            "https://localhost:9228"
        );
    }

    #[test]
    fn appends_the_default_port_when_the_port_is_an_empty_string() {
        assert_eq!(
            crate::get_server_url(&env(&[
                ("PROSOPO_SERVER_URL", "https://provider.test"),
                ("PROSOPO_SERVER_PORT", ""),
            ])),
            "https://provider.test:9228"
        );
    }
}

mod get_server_config {
    use super::*;
    use prosopo_types::config::{AccountConfig, EnvironmentTypes};

    #[test]
    fn builds_a_config_from_the_environment() {
        let config: ProsopoServerConfig = crate::get_server_config(&env(&[
            ("PROSOPO_DEFAULT_ENVIRONMENT", "development"),
            ("PROSOPO_DAPP_NAME", "my-dapp"),
            ("PROSOPO_SITE_KEY", "site-key"),
            ("PROSOPO_SITE_PRIVATE_KEY", "site-secret"),
            ("PROSOPO_SERVER_URL", "https://provider.test:8080"),
        ]))
        .expect("a config");
        assert_eq!(config.default_environment, EnvironmentTypes::Development);
        assert_eq!(config.dapp_name, "my-dapp");
        assert_eq!(
            config.server_url.as_deref(),
            Some("https://provider.test:8080")
        );
        assert_eq!(
            config.account,
            AccountConfig {
                address: Some("site-key".to_string()),
                secret: Some("site-secret".to_string()),
                password: Some(String::new()),
            }
        );
    }

    #[test]
    fn defaults_the_dapp_name_when_none_is_configured() {
        assert_eq!(
            crate::get_server_config(&env(&[]))
                .expect("a config")
                .dapp_name,
            "client-example-server"
        );
    }

    #[test]
    fn defaults_the_account_fields_to_empty_strings() {
        let account: AccountConfig = crate::get_server_config(&env(&[]))
            .expect("a config")
            .account;
        assert_eq!(account.address.as_deref(), Some(""));
        assert_eq!(account.secret.as_deref(), Some(""));
    }

    #[test]
    fn rejects_an_unknown_default_environment() {
        assert!(crate::get_server_config(&env(&[(
            "PROSOPO_DEFAULT_ENVIRONMENT",
            "not-an-environment"
        )]))
        .is_err());
    }
}

/// Source-level checks on every `encodeProcaptchaOutput` call site in the widget's Manager
/// packages, which stay TS: a Manager that stops setting `captchaType` brings the
/// puzzle-verify bug back silently.
mod client_manager_mint_sites_captcha_type_regression {
    use std::path::Path;

    fn source(relative_path: &str) -> String {
        let path = Path::new(env!("CARGO_MANIFEST_DIR")).join(relative_path);
        std::fs::read_to_string(&path).unwrap_or_else(|error| panic!("{path:?}: {error}"))
    }

    fn passes_captcha_type(relative_path: &str, expected_captcha_type: &str) {
        let source: String = source(relative_path);
        assert!(source.contains("encodeProcaptchaOutput"));
        assert!(source.contains("[ApiParams.captchaType]:"));
        assert!(source.contains(expected_captcha_type));
    }

    /// `/from\s+["']@prosopo\/types["']/`.
    fn imports_from_types(source: &str) -> bool {
        source.match_indices("from").any(|(at, keyword)| {
            let rest: &str = &source[at + keyword.len()..];
            let trimmed: &str = rest.trim_start_matches(char::is_whitespace);
            trimmed.len() < rest.len()
                && [
                    "\"@prosopo/types\"",
                    "'@prosopo/types'",
                    "\"@prosopo/types'",
                    "'@prosopo/types\"",
                ]
                .iter()
                .any(|quoted| trimmed.starts_with(quoted))
        })
    }

    fn imports_captcha_type(relative_path: &str) {
        let source: String = source(relative_path);
        assert!(imports_from_types(&source));
        assert!(source.contains("CaptchaType"));
    }

    const POW: &str = "../procaptcha-pow/src/services/Manager.ts";
    const PUZZLE: &str = "../procaptcha-puzzle/src/services/Manager.ts";
    const IMAGE: &str = "../procaptcha/src/modules/Manager.ts";

    #[test]
    fn procaptcha_pow_passes_captcha_type_pow_to_encode_procaptcha_output() {
        passes_captcha_type(POW, "CaptchaType.pow");
    }

    #[test]
    fn procaptcha_pow_imports_captcha_type_from_prosopo_types() {
        imports_captcha_type(POW);
    }

    #[test]
    fn procaptcha_puzzle_passes_captcha_type_puzzle_to_encode_procaptcha_output() {
        passes_captcha_type(PUZZLE, "CaptchaType.puzzle");
    }

    #[test]
    fn procaptcha_puzzle_imports_captcha_type_from_prosopo_types() {
        imports_captcha_type(PUZZLE);
    }

    #[test]
    fn procaptcha_passes_captcha_type_image_to_encode_procaptcha_output() {
        passes_captcha_type(IMAGE, "CaptchaType.image");
    }

    #[test]
    fn procaptcha_imports_captcha_type_from_prosopo_types() {
        imports_captcha_type(IMAGE);
    }

    #[test]
    fn the_import_check_needs_whitespace_and_matching_the_package() {
        assert!(imports_from_types("import { a } from \"@prosopo/types\";"));
        assert!(imports_from_types("} from\n\t'@prosopo/types'"));
        assert!(!imports_from_types("} from\"@prosopo/types\""));
        assert!(!imports_from_types("} from \"@prosopo/types-private\""));
    }
}

fn token_output() -> ProcaptchaOutput {
    ProcaptchaOutput {
        timestamp: "1710000000000".to_string(),
        signature: OutputSignatures {
            provider: SignatureTypes {
                challenge: Some("provider-sig".to_string()),
                ..SignatureTypes::default()
            },
            user: SignatureTypes {
                timestamp: Some("user-sig".to_string()),
                ..SignatureTypes::default()
            },
        },
        ..base_output(0.0)
    }
}

fn image_token_output(commitment_id: &str, captcha_type: Option<CaptchaType>) -> ProcaptchaOutput {
    ProcaptchaOutput {
        challenge: None,
        commitment_id: Some(commitment_id.to_string()),
        signature: OutputSignatures {
            provider: SignatureTypes {
                request_hash: Some("req-hash".to_string()),
                ..SignatureTypes::default()
            },
            user: SignatureTypes {
                timestamp: Some("user-sig".to_string()),
                ..SignatureTypes::default()
            },
        },
        captcha_type,
        ..token_output()
    }
}

mod procaptcha_token_codec_round_trip {
    use super::*;

    fn preserves(captcha_type: CaptchaType) {
        let output: ProcaptchaOutput = ProcaptchaOutput {
            captcha_type: Some(captcha_type),
            ..token_output()
        };
        let decoded: ProcaptchaOutput =
            decode_procaptcha_output(&encode_procaptcha_output(&output)).expect("decodes");
        assert_eq!(decoded.captcha_type, Some(captcha_type));
        assert_eq!(decoded.dapp, output.dapp);
        assert_eq!(decoded.user, output.user);
        assert_eq!(decoded.challenge, output.challenge);
    }

    #[test]
    fn preserves_captcha_type_pow() {
        preserves(CaptchaType::Pow);
    }

    #[test]
    fn preserves_captcha_type_image() {
        preserves(CaptchaType::Image);
    }

    #[test]
    fn preserves_captcha_type_puzzle() {
        preserves(CaptchaType::Puzzle);
    }

    #[test]
    fn preserves_captcha_type_frictionless() {
        preserves(CaptchaType::Frictionless);
    }

    #[test]
    fn preserves_captcha_type_undefined_opt_out_path() {
        let decoded: ProcaptchaOutput =
            decode_procaptcha_output(&encode_procaptcha_output(&token_output())).expect("decodes");
        assert_eq!(decoded.captcha_type, None);
    }

    #[test]
    fn image_shape_token_no_challenge_has_commitment_id_round_trips_with_captcha_type() {
        let output: ProcaptchaOutput = image_token_output("0xdeadbeef", Some(CaptchaType::Image));
        let decoded: ProcaptchaOutput =
            decode_procaptcha_output(&encode_procaptcha_output(&output)).expect("decodes");
        assert_eq!(decoded.captcha_type, Some(CaptchaType::Image));
        assert_eq!(decoded.commitment_id.as_deref(), Some("0xdeadbeef"));
        assert_eq!(decoded.challenge, None);
    }
}

mod procaptcha_token_codec_legacy_v1_fallback {
    use super::*;

    #[test]
    fn decodes_a_legacy_v1_encoded_pow_shape_token_as_captcha_type_undefined() {
        let decoded: ProcaptchaOutput =
            decode_procaptcha_output(&procaptcha_token_codec_v1_enc(&token_output()))
                .expect("decodes");
        assert_eq!(decoded.captcha_type, None);
        assert_eq!(decoded.challenge.as_deref(), Some("challenge-string"));
        assert_eq!(decoded.dapp, DAPP);
    }

    #[test]
    fn decodes_a_legacy_v1_encoded_image_shape_token_as_captcha_type_undefined() {
        let decoded: ProcaptchaOutput = decode_procaptcha_output(&procaptcha_token_codec_v1_enc(
            &image_token_output("0xcafebabe", None),
        ))
        .expect("decodes");
        assert_eq!(decoded.captcha_type, None);
        assert_eq!(decoded.challenge, None);
        assert_eq!(decoded.commitment_id.as_deref(), Some("0xcafebabe"));
    }

    /// The v1 encoding is a strict prefix of the v2 one with no captchaType: the layout
    /// stayed additive, and the trailing byte is the `Option<str>` None discriminant.
    #[test]
    fn legacy_tokens_do_not_carry_the_captcha_type_byte_on_the_wire() {
        let v1: Vec<u8> = hex_to_u8a(&procaptcha_token_codec_v1_enc(&token_output()));
        let v2: Vec<u8> = hex_to_u8a(&encode_procaptcha_output(&token_output()));
        assert_eq!(v2.len(), v1.len() + 1);
        assert_eq!(v2[..v1.len()], v1[..]);
        assert_eq!(v2[v2.len() - 1], 0);
    }
}

mod procaptcha_token_codec_rejection_paths {
    use super::*;

    #[test]
    fn throws_on_truncated_hex_input() {
        assert!(decode_procaptcha_output("0x00").is_err());
    }

    #[test]
    fn throws_on_non_hex_input() {
        assert!(decode_procaptcha_output("not-a-hex-token").is_err());
    }

    /// The TS decoder throws a ZodError rather than accept a type the server would then
    /// dispatch on.
    #[test]
    fn rejects_unknown_captcha_type_strings_via_zod() {
        let output: ProcaptchaOutput = ProcaptchaOutput {
            challenge: Some("c".to_string()),
            signature: OutputSignatures {
                provider: SignatureTypes {
                    challenge: Some("s".to_string()),
                    ..SignatureTypes::default()
                },
                user: SignatureTypes {
                    timestamp: Some("s".to_string()),
                    ..SignatureTypes::default()
                },
            },
            ..token_output()
        };
        assert!(matches!(
            decode_procaptcha_output(&procaptcha_token_codec_enc(
                &output,
                Some("bogus-captcha-type")
            )),
            Err(TokenDecodeError::UnknownCaptchaType(_))
        ));
    }

    /// `ProcaptchaOutputSchema.parse` with an unknown type: the Rust output holds a
    /// `CaptchaType`, so the closest equivalent is deserialising one from JSON.
    #[test]
    fn procaptcha_output_schema_rejects_unknown_captcha_type_directly() {
        let mut output: Value = serde_json::to_value(token_output()).expect("serialises");
        output["captchaType"] = json!("not-a-real-type");
        assert!(serde_json::from_value::<ProcaptchaOutput>(output).is_err());
    }
}

#[test]
fn a_provider_error_reports_its_http_status() {
    let error: VerifyError = VerifyError::Provider(ApiError::Http(prosopo_api::HttpError {
        status: 503,
        status_text: "Service Unavailable".to_string(),
        url: PROVIDER_URL.to_string(),
    }));
    assert_eq!(error.code(), 503);
    assert_eq!(VerifyError::Provider(ApiError::TimedOut).code(), 504);
    assert_eq!(VerifyError::Signer("x".to_string()).code(), 500);
}
