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

//! Replays the app half of packages/provider/rust/equivalence/pipeline-vectors.json: the
//! provider's express app (startProviderApi, with no database) against the Rust app built the
//! way `start` builds it, from the config the same environment gives.
//!
//! Every request is sent, in order, so each side's rate limits count the same hits; those
//! marked `compare: false` reach a stage the Rust provider does not serve yet and are not
//! compared. Beside what the public router's test leaves out, two header values are compared
//! by form, since they are made fresh on each side: a generated `x-request-id` (`e-<uuid>`)
//! and `X-RateLimit-Reset` (an epoch second).

use crate::config::{get_config, Environment};
use crate::start::{locales, provider_router, AppParts};
use base64::Engine;
use prosopo_keyring::{get_pair, KeyringPair, Secret};
use prosopo_logger::{get_logger, LogLevel};
use prosopo_provider::api::healthz_geo::{CountryLookup, HealthzProbe};
use prosopo_provider::http_replay::{answer, exchange, shown, Answer};
use prosopo_types::config::ProsopoConfig;
use prosopo_util_crypto::jwt::JwtIssueOptions;
use prosopo_util_crypto::U8aLike;
use serde_json::Value;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

const VECTORS: &str = include_str!("../../provider/rust/equivalence/pipeline-vectors.json");

struct NoCountries;

impl CountryLookup for NoCountries {
    fn is_available(&self) -> bool {
        false
    }

    fn country(&self, _ip: &str) -> Option<String> {
        None
    }
}

/// A header the two sides make fresh, reduced to its form.
fn by_form(headers: &[(String, String)]) -> Vec<(String, String)> {
    headers
        .iter()
        .map(|(name, value)| match name.as_str() {
            "x-request-id" if value.starts_with("e-") => {
                let uuid: bool = value.len() == 38 && uuid::Uuid::parse_str(&value[2..]).is_ok();
                (name.clone(), if uuid { "e-<uuid>".to_string() } else { value.clone() })
            }
            "x-ratelimit-reset" if value.parse::<u64>().is_ok() => (name.clone(), "<epoch seconds>".to_string()),
            _ => (name.clone(), value.clone()),
        })
        .collect()
}

#[tokio::test(flavor = "multi_thread")]
async fn the_pipeline_answers_as_the_express_app_does() {
    let vectors: Value = serde_json::from_str(VECTORS).expect("pipeline-vectors.json parses");
    let decode = |text: &Value| base64::engine::general_purpose::STANDARD.decode(text.as_str().expect("base64")).expect("base64 decodes");
    let mnemonic: &str = vectors["mnemonic"].as_str().expect("a mnemonic");
    let mut failures: Vec<String> = Vec::new();
    let mut compared: usize = 0;
    for app in vectors["apps"].as_array().expect("apps") {
        let mut variables: HashMap<String, String> = serde_json::from_value(app["variables"].clone()).expect("variables");
        variables.insert("NODE_ENV".to_string(), "production".to_string());
        let config: ProsopoConfig = get_config(&Environment::from_map(variables.clone()), None, None, None, None).expect("a config");
        let pair: KeyringPair = get_pair(Some(Secret::Text(mnemonic)), None, None, None).expect("the provider pair");
        let admin: KeyringPair = get_pair(None, Some(U8aLike::Str(vectors["admin"].as_str().expect("an admin"))), None, None).expect("the admin pair");
        let probe: HealthzProbe = Arc::new(|_: String, _: Duration| Box::pin(async { false }));
        let (router, _geo) = provider_router(AppParts {
            config,
            pair: Some(pair.clone()),
            auth_account: Some(admin),
            logger: get_logger(LogLevel::Fatal, "equivalence"),
            db: None,
            countries: Arc::new(NoCountries),
            ip_info: None,
            probe,
            env: Arc::new(move |name: &str| variables.get(name).cloned()),
            i18n: locales(),
            version: "dev".to_string(),
            simd_decoder: None,
            seeds: Arc::new(prosopo_provider::api::challenge::FreshSeeds),
            dataset_id: None,
        });
        let listener: tokio::net::TcpListener = tokio::net::TcpListener::bind("[::]:0").await.expect("binds");
        let port: u16 = listener.local_addr().expect("an address").port();
        let server = tokio::spawn(async move {
            axum::serve(listener, router.into_make_service_with_connect_info::<SocketAddr>()).await.expect("serves");
        });
        for step in app["exchanges"].as_array().expect("exchanges") {
            let request: Vec<u8> = decode(&step["request"]);
            let token: String = pair.jwt_issue(&JwtIssueOptions { expires_in: Some(300.0), not_before: None }, &[]).expect("a token");
            let sent: Vec<u8> = String::from_utf8_lossy(&request).replace("{{ADMIN_JWT}}", &token).into_bytes();
            let actual: Answer = answer(&exchange(port, &sent).await);
            if step["compare"] == Value::Bool(false) {
                continue;
            }
            compared += 1;
            let expected: Answer = answer(&decode(&step["response"]));
            let no_content: bool = expected.status_line.starts_with("HTTP/1.1 204 ");
            let length_agrees: bool = expected.content_length.is_none() || no_content || expected.content_length == actual.content_length;
            if expected.status_line != actual.status_line || by_form(&expected.headers) != by_form(&actual.headers) || expected.body != actual.body || !length_agrees {
                failures.push(format!(
                    "{}: {}\n      rust {:?} {:?} {:?} {}\n      ts   {:?} {:?} {:?} {}",
                    app["defaultEnvironment"],
                    shown(&request).lines().next().unwrap_or_default(),
                    actual.status_line,
                    by_form(&actual.headers),
                    actual.content_length,
                    shown(&actual.body),
                    expected.status_line,
                    by_form(&expected.headers),
                    expected.content_length,
                    shown(&expected.body),
                ));
            }
        }
        server.abort();
    }
    assert!(compared > 50, "only {compared} compared");
    assert!(failures.is_empty(), "{} of {compared} differ:\n{}", failures.len(), failures.join("\n"));
}
