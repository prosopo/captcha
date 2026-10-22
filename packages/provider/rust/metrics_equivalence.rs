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

//! Replays rust/equivalence/metrics-vectors.json, written by generate-metrics.ts.
//!
//! The provider's own metrics must be written byte for byte as prom-client wrote them after
//! the same recordings. The process metrics must carry prom-client's names, help and types;
//! their values are this process's. The `nodejs_*` metrics have no counterpart (metrics.rs).
//! In a scrape over HTTP, the request-duration histogram is compared on its counts only,
//! since its buckets and sum hold real timings.

use crate::api::healthz_geo::{read_healthz_geo_config, CountryLookup, HealthzGeoOutcome, HealthzGeoRouter, HealthzProbe, TargetHealthMonitor};
use crate::api::metrics::{metrics_access, ProcessSource, ProviderMetrics, SyncSpan, VerifySource};
use crate::api::provider_app;
use crate::api::public::{EnvReader, PublicState, RedisStatus, RedisStatuses};
use crate::http_replay::{answer, exchange, shown, Answer};
use base64::Engine;
use http::{HeaderMap, HeaderName, HeaderValue};
use prosopo_common::{ErrorClass, ErrorOptions, ErrorSource, ProsopoError};
use prosopo_logger::{get_logger, LogLevel};
use prosopo_types::CaptchaType;
use serde_json::Value;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use std::time::Duration;

const VECTORS: &str = include_str!("equivalence/metrics-vectors.json");

fn vectors() -> Value {
    serde_json::from_str(VECTORS).expect("metrics-vectors.json parses")
}

fn text<'a>(op: &'a Value, key: &str) -> &'a str {
    op[key].as_str().unwrap_or_else(|| panic!("{key} in {op}"))
}

fn number(op: &Value, key: &str) -> f64 {
    op[key].as_f64().unwrap_or_else(|| panic!("{key} in {op}"))
}

fn captcha_type(op: &Value) -> CaptchaType {
    serde_json::from_value(op["type"].clone()).expect("a captcha type")
}

fn replay(metrics: &ProviderMetrics, op: &Value) {
    match text(op, "op") {
        "issued" => metrics.record_captcha_issued(captcha_type(op)),
        "issueError" => metrics.record_captcha_issue_error(captcha_type(op)),
        "verify" => {
            let source: VerifySource = match text(op, "source") {
                "real" => VerifySource::Real,
                "test_key" => VerifySource::TestKey,
                "maintenance" => VerifySource::Maintenance,
                _ => VerifySource::Cached,
            };
            metrics.record_captcha_verify(captcha_type(op), op["verified"].as_bool().expect("verified"), source);
        }
        "frictionless" => metrics.record_frictionless_decision(text(op, "value")),
        "blocked" => metrics.record_blocked_request(text(op, "value")),
        "domain" => metrics.record_domain_validation(text(op, "value")),
        "spam" => metrics.record_spam_email(text(op, "value")),
        "botScore" => metrics.record_bot_score(number(op, "score")),
        "detectors" => {
            let detectors: Vec<String> = op["detectors"]
                .as_array()
                .expect("detectors")
                .iter()
                .map(|detector| match detector {
                    Value::String(name) => name.clone(),
                    other => prosopo_util::number_to_string(other.as_f64().expect("a number")),
                })
                .collect();
            metrics.record_detector_triggered(&detectors);
        }
        "geo" => {
            let outcome: HealthzGeoOutcome = match text(op, "outcome") {
                "steered" => HealthzGeoOutcome::Steered,
                "not_steered" => HealthzGeoOutcome::NotSteered,
                "target_down" => HealthzGeoOutcome::TargetDown,
                _ => HealthzGeoOutcome::GeoUnavailable,
            };
            metrics.record_healthz_geo_outcome(outcome);
        }
        "maintenance" => metrics.set_maintenance_mode(op["on"].as_bool().expect("on")),
        "decoder" => metrics.record_decoder_outcome(text(op, "decoder"), text(op, "outcome") == "ok", number(op, "seconds")),
        "span" => {
            let span: SyncSpan = match text(op, "span") {
                "puzzle_background" => SyncSpan::PuzzleBackground,
                "puzzle_render" => SyncSpan::PuzzleRender,
                "merkle_build" => SyncSpan::MerkleBuild,
                _ => SyncSpan::DecisionMachineDecide,
            };
            metrics.record_sync_span(span, number(op, "seconds"));
        }
        "http" => metrics.record_request(text(op, "route"), text(op, "method"), text(op, "status").parse().expect("a status"), number(op, "seconds")),
        "redis" => metrics.set_redis_ready(op["general"].as_bool().expect("general"), op["uap"].as_bool().expect("uap")),
        other => panic!("unknown op {other}"),
    }
}

fn is_process(block: &str) -> bool {
    block.starts_with("# HELP prosopo_process_")
}

fn is_nodejs(block: &str) -> bool {
    block.starts_with("# HELP prosopo_nodejs_")
}

/// The provider's own metrics out of a whole exposition.
fn own(exposition: &str) -> String {
    let blocks: Vec<&str> = exposition.trim_end_matches('\n').split("\n\n").filter(|block| !is_process(block) && !is_nodejs(block)).collect();
    format!("{}\n", blocks.join("\n\n"))
}

/// Process blocks agree when they have the same help and type, and the same series names with
/// numeric values.
fn process_shape(exposition: &str) -> Vec<(String, String, Vec<String>)> {
    exposition
        .trim_end_matches('\n')
        .split("\n\n")
        .filter(|block| is_process(block))
        .map(|block| {
            let mut lines = block.lines();
            let help: String = lines.next().unwrap_or_default().to_string();
            let kind: String = lines.next().unwrap_or_default().to_string();
            let series: Vec<String> = lines
                .map(|line| {
                    let (name, value) = line.rsplit_once(' ').unwrap_or((line, ""));
                    assert!(value.parse::<f64>().is_ok(), "{line} has no number");
                    name.to_string()
                })
                .collect();
            (help, kind, series)
        })
        .collect()
}

fn fresh_metrics(vectors: &Value) -> ProviderMetrics {
    ProviderMetrics::new(vectors["maintenanceModeEnv"].as_str(), ProcessSource::current())
}

#[test]
fn the_exposition_is_what_prom_client_writes_after_the_same_recordings() {
    let vectors: Value = vectors();
    let metrics: ProviderMetrics = fresh_metrics(&vectors);
    let initial: Vec<String> = serde_json::from_value(vectors["initial"].clone()).expect("initial blocks");
    assert_eq!(metrics.render_own(), own(&initial.join("\n\n")), "before any recording");
    for op in vectors["ops"].as_array().expect("ops") {
        replay(&metrics, op);
    }
    let expected: &str = vectors["exposition"].as_str().expect("an exposition");
    assert_eq!(metrics.render_own(), own(expected));
    assert_eq!(process_shape(&metrics.render()), process_shape(expected));
}

#[test]
fn metrics_access_is_decided_as_the_ts_decides_it() {
    let vectors: Value = vectors();
    let mut checked: usize = 0;
    for case in vectors["access"].as_array().expect("access cases") {
        let env: HashMap<String, String> = serde_json::from_value(case["env"].clone()).expect("env");
        let mut headers: HeaderMap = HeaderMap::new();
        for (name, value) in case["headers"].as_object().expect("headers") {
            let value: Vec<u8> = value.as_str().expect("a header").chars().map(|c| c as u8).collect();
            headers.insert(HeaderName::from_bytes(name.as_bytes()).expect("a name"), HeaderValue::from_bytes(&value).expect("a value"));
        }
        let address: Option<&str> = case["address"].as_str().filter(|address| !address.is_empty());
        let status: u16 = metrics_access(&|name: &str| env.get(name).cloned(), &headers, address);
        assert_eq!(Some(u64::from(status)), case["status"].as_u64(), "{case}");
        checked += 1;
    }
    assert!(checked > 1000, "only {checked}");
}

struct NoRedis;

impl RedisStatuses for NoRedis {
    fn redis_statuses(&self) -> Result<[RedisStatus; 2], ProsopoError> {
        Err(ProsopoError::new(ErrorClass::Env, ErrorSource::message("db not setup! Please call isReady() first"), ErrorOptions { silent: true, ..ErrorOptions::default() }))
    }
}

struct NoCountries;

impl CountryLookup for NoCountries {
    fn is_available(&self) -> bool {
        false
    }

    fn country(&self, _ip: &str) -> Option<String> {
        None
    }
}

/// A 200 scrape's body: the provider's own metrics, with the request-duration histogram cut
/// down to its counts, and the process metrics' shape.
fn scrape(body: &[u8]) -> (String, Vec<(String, String, Vec<String>)>) {
    let text: String = String::from_utf8_lossy(body).into_owned();
    let own: String = own(&text)
        .lines()
        .filter(|line| !(line.starts_with("prosopo_http_request_duration_seconds_bucket") || line.starts_with("prosopo_http_request_duration_seconds_sum")))
        .collect::<Vec<&str>>()
        .join("\n");
    (own, process_shape(&text))
}

#[tokio::test(flavor = "multi_thread")]
async fn metrics_and_the_request_counter_are_served_as_the_express_app_serves_them() {
    let vectors: Value = vectors();
    let metrics: Arc<ProviderMetrics> = Arc::new(fresh_metrics(&vectors));
    for op in vectors["ops"].as_array().expect("ops") {
        replay(&metrics, op);
    }
    let variables: Arc<Mutex<HashMap<String, String>>> = Arc::new(Mutex::new(HashMap::new()));
    let reader: Arc<Mutex<HashMap<String, String>>> = variables.clone();
    let env: EnvReader = Arc::new(move |name: &str| reader.lock().ok().and_then(|variables| variables.get(name).cloned()));
    let config = read_healthz_geo_config(&|_: &str| None, None);
    let probe: HealthzProbe = Arc::new(|_: String, _: Duration| Box::pin(async { false }));
    let monitor: TargetHealthMonitor = TargetHealthMonitor::new(Vec::new(), config.probe_interval_ms, config.probe_timeout_ms, probe, None);
    let state: PublicState = PublicState {
        host: "pronode1.prosopo.io".to_string(),
        version: "dev".to_string(),
        geo: Arc::new(HealthzGeoRouter::new(config, Arc::new(NoCountries), Arc::new(monitor))),
        redis: Arc::new(NoRedis),
        logger: get_logger(LogLevel::Fatal, "equivalence"),
        metrics: Some(metrics),
        env,
        rest: crate::api::not_found_only(),
    };
    let listener: tokio::net::TcpListener = tokio::net::TcpListener::bind("[::]:0").await.expect("binds");
    let port: u16 = listener.local_addr().expect("an address").port();
    let server = tokio::spawn(async move {
        axum::serve(listener, provider_app(Arc::new(state)).into_make_service_with_connect_info::<SocketAddr>()).await.expect("serves");
    });
    let decode = |text: &Value| base64::engine::general_purpose::STANDARD.decode(text.as_str().expect("base64")).expect("base64 decodes");
    let mut failures: Vec<String> = Vec::new();
    let mut scrapes: usize = 0;
    for step in vectors["exchanges"].as_array().expect("exchanges") {
        *variables.lock().expect("the env") = serde_json::from_value(step["env"].clone()).expect("env");
        let request: Vec<u8> = decode(&step["request"]);
        let expected: Answer = answer(&decode(&step["response"]));
        let actual: Answer = answer(&exchange(port, &request).await);
        let scraped: bool = expected.status_line == "HTTP/1.1 200 OK" && expected.headers.iter().any(|(_, value)| value.starts_with("text/plain; version=0.0.4"));
        let bodies_agree: bool = if scraped && !expected.body.is_empty() {
            scrapes += 1;
            scrape(&expected.body) == scrape(&actual.body)
        } else {
            expected.body == actual.body
        };
        let length_agrees: bool = scraped || expected.content_length.is_none() || expected.content_length == actual.content_length;
        if expected.status_line != actual.status_line || expected.headers != actual.headers || !bodies_agree || !length_agrees {
            let (expected_own, _) = scrape(&expected.body);
            let (actual_own, _) = scrape(&actual.body);
            failures.push(format!(
                "{}\n      rust {:?} {:?} {:?}\n      ts   {:?} {:?} {:?}\n      rust body {}\n      ts   body {}",
                shown(&request).lines().next().unwrap_or_default(),
                actual.status_line,
                actual.headers,
                actual.content_length,
                expected.status_line,
                expected.headers,
                expected.content_length,
                if scraped { actual_own } else { shown(&actual.body) },
                if scraped { expected_own } else { shown(&expected.body) },
            ));
        }
    }
    server.abort();
    assert_eq!(scrapes, 2, "two full scrapes");
    assert!(failures.is_empty(), "{} differ:\n{}", failures.len(), failures.join("\n"));
}
