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

//! Replays rust/equivalence/public-vectors.json, written by generate-public.ts: the same request
//! bytes sent to the Rust app over a socket must get the answer the express app gave, and the
//! healthz geo config and decisions must be the TS's.
//!
//! Answers are compared on the status line, the body bytes, and the headers other than the
//! ones that frame the connection (`Date`, `Connection`, `Keep-Alive`, `Transfer-Encoding`).
//! `Content-Length` is compared wherever the TS sent one, except on a 204: Node sends
//! `Content-Length: 0` there, and hyper will not, since RFC 9110 §8.6 forbids it.
//!
//! Two kinds of request never reach either app, because the HTTP parsers disagree on the
//! request target: hyper refuses a raw `<` or `>` with a 400 where Node's llhttp takes it, and
//! llhttp refuses a raw byte above 0x7f with a 400 where hyper takes it. Those exchanges are
//! checked for exactly that and counted, so that any other difference still fails.
//!
//! Four bodies the TS reads are refused by the Rust, for the reasons body.rs gives: a lone
//! surrogate escape, a number beyond the double range, nesting 128 or more deep, and UTF-7.
//! Those are checked for exactly that, and counted, too.

use crate::api::healthz_geo::{read_healthz_geo_config, CountryLookup, HealthzGeoConfig, HealthzGeoRouter, HealthzProbe, TargetHealthMonitor};
use crate::api::provider_app;
use crate::api::public::{PublicState, RedisStatus, RedisStatuses};
use base64::Engine;
use prosopo_common::{ErrorClass, ErrorOptions, ErrorSource, ProsopoError};
use prosopo_logger::{get_logger, LogLevel};
use serde_json::Value;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use crate::http_replay::{answer, exchange, shown, Answer};

const VECTORS: &str = include_str!("equivalence/public-vectors.json");

struct Countries {
    available: bool,
    table: HashMap<String, String>,
}

impl CountryLookup for Countries {
    fn is_available(&self) -> bool {
        self.available
    }

    fn country(&self, ip: &str) -> Option<String> {
        self.table.get(ip).cloned()
    }
}

struct FixedRedis(Option<[RedisStatus; 2]>);

impl RedisStatuses for FixedRedis {
    fn redis_statuses(&self) -> Result<[RedisStatus; 2], ProsopoError> {
        self.0.ok_or_else(|| ProsopoError::new(ErrorClass::Db, ErrorSource::message("no redis"), ErrorOptions { silent: true, ..ErrorOptions::default() }))
    }
}

fn string_map(value: &Value) -> HashMap<String, String> {
    serde_json::from_value(value.clone()).expect("a map of strings")
}

fn healthy_probe(healthy: Vec<String>) -> HealthzProbe {
    Arc::new(move |host: String, _timeout: Duration| {
        let up: bool = healthy.contains(&host);
        Box::pin(async move { up })
    })
}

async fn geo_router(env: &HashMap<String, String>, lookup: Countries, healthy: Vec<String>) -> HealthzGeoRouter {
    let config: HealthzGeoConfig = read_healthz_geo_config(&|name: &str| env.get(name).cloned(), None);
    let monitor: TargetHealthMonitor =
        TargetHealthMonitor::new(config.routes.values().cloned().collect(), config.probe_interval_ms, config.probe_timeout_ms, healthy_probe(healthy), None);
    if config.enabled {
        monitor.poll_all().await;
    }
    HealthzGeoRouter::new(config, Arc::new(lookup), Arc::new(monitor))
}

fn redis(db: &Value) -> FixedRedis {
    let status = |status: &Value| (status["ready"].as_bool().expect("ready"), status["awaitingMs"].as_i64().expect("awaitingMs"));
    match db {
        Value::Object(_) => FixedRedis(Some([status(&db["general"]), status(&db["uap"])])),
        _ => FixedRedis(None),
    }
}

/// Which parser refuses this request, when the two disagree about its target.
#[derive(Debug, Clone, Copy, PartialEq)]
enum ParserRefusal {
    Hyper,
    Node,
}

fn parser_refusal(request: &[u8]) -> Option<ParserRefusal> {
    let line_end: usize = request.windows(2).position(|pair| pair == b"\r\n").unwrap_or(request.len());
    let target: &[u8] = request[..line_end].split(|&byte| byte == b' ').nth(1).unwrap_or_default();
    if target.iter().any(|&byte| byte > 0x7f) {
        Some(ParserRefusal::Node)
    } else if target.iter().any(|&byte| byte == b'<' || byte == b'>') {
        Some(ParserRefusal::Hyper)
    } else {
        None
    }
}

/// The status the Rust refuses a body the TS reads with.
fn body_refusal(request: &[u8]) -> Option<&'static str> {
    let split: usize = request.windows(4).position(|window| window == b"\r\n\r\n")? + 4;
    let (head, body) = request.split_at(split);
    let deep: Vec<u8> = [vec![b'['; 200], vec![b']'; 200]].concat();
    if body == br#"{"a":"\ud800"}"# || body == br#"{"a":1e400}"# || body == deep.as_slice() {
        return Some("HTTP/1.1 400 Bad Request");
    }
    head.windows(b"charset=utf-7".len()).any(|window| window == b"charset=utf-7").then_some("HTTP/1.1 415 Unsupported Media Type")
}

#[tokio::test(flavor = "multi_thread")]
async fn the_public_router_answers_as_the_express_app_does() {
    let vectors: Value = serde_json::from_str(VECTORS).expect("public-vectors.json parses");
    let decode = |text: &Value| base64::engine::general_purpose::STANDARD.decode(text.as_str().expect("base64")).expect("base64 decodes");
    let mut failures: Vec<String> = Vec::new();
    let mut compared: usize = 0;
    let mut parser_differences: usize = 0;
    let mut body_differences: usize = 0;
    for app in vectors["apps"].as_array().expect("apps") {
        let name: &str = app["name"].as_str().expect("a name");
        let env: HashMap<String, String> = string_map(&app["env"]);
        let lookup: Countries = Countries {
            available: app["ipInfoAvailable"].as_bool().expect("ipInfoAvailable"),
            table: string_map(&app["countries"]),
        };
        let healthy: Vec<String> = serde_json::from_value(app["healthyHosts"].clone()).expect("healthy hosts");
        let state: PublicState = PublicState {
            host: app["host"].as_str().expect("a host").to_string(),
            version: vectors["version"].as_str().expect("a version").to_string(),
            geo: Arc::new(geo_router(&env, lookup, healthy).await),
            redis: Arc::new(redis(&app["db"])),
            logger: get_logger(LogLevel::Fatal, "equivalence"),
            metrics: None,
            env: Arc::new(|_: &str| None),
            rest: crate::api::not_found_only(),
            pool_push_keys: Arc::new(Vec::new()),
        };
        let listener: tokio::net::TcpListener = tokio::net::TcpListener::bind("[::]:0").await.expect("binds");
        let port: u16 = listener.local_addr().expect("an address").port();
        let server = tokio::spawn(async move {
            axum::serve(listener, provider_app(Arc::new(state)).into_make_service_with_connect_info::<SocketAddr>()).await.expect("serves");
        });
        for exchange_vector in app["exchanges"].as_array().expect("exchanges") {
            let request: Vec<u8> = decode(&exchange_vector["request"]);
            let expected: Answer = answer(&decode(&exchange_vector["response"]));
            let raw: Vec<u8> = exchange(port, &request).await;
            let actual: Answer = answer(&raw);
            compared += 1;
            if let Some(refusal) = parser_refusal(&request) {
                parser_differences += 1;
                let refused: &Answer = if refusal == ParserRefusal::Node { &expected } else { &actual };
                if refused.status_line != "HTTP/1.1 400 Bad Request" {
                    failures.push(format!("{name}: {} should be refused by {refusal:?}, got {:?}", shown(&request).lines().next().unwrap_or_default(), refused.status_line));
                }
                continue;
            }
            if let Some(refused) = body_refusal(&request) {
                body_differences += 1;
                if expected.status_line != "HTTP/1.1 200 OK" || actual.status_line != refused {
                    failures.push(format!("{name}: {} should be read by the TS and refused by the Rust, got {:?} and {:?}", shown(&request).lines().next().unwrap_or_default(), expected.status_line, actual.status_line));
                }
                continue;
            }
            let no_content: bool = expected.status_line.starts_with("HTTP/1.1 204 ");
            let length_agrees: bool = expected.content_length.is_none() || no_content || expected.content_length == actual.content_length;
            if expected.status_line != actual.status_line || expected.headers != actual.headers || expected.body != actual.body || !length_agrees {
                failures.push(format!(
                    "{name}: {}\n      rust {:?} {:?} {:?} {}\n      ts   {:?} {:?} {:?} {}",
                    shown(&request).lines().next().unwrap_or_default(),
                    actual.status_line,
                    actual.headers,
                    actual.content_length,
                    shown(&actual.body),
                    expected.status_line,
                    expected.headers,
                    expected.content_length,
                    shown(&expected.body),
                ));
            }
        }
        server.abort();
    }
    assert!(compared > 600, "only {compared} exchanges");
    assert_eq!(parser_differences, 3 * vectors["apps"].as_array().map_or(0, Vec::len), "the three requests the parsers disagree on, once per app");
    assert_eq!(body_differences, 4 * vectors["apps"].as_array().map_or(0, Vec::len), "the four bodies the Rust refuses, once per app");
    assert!(failures.is_empty(), "{} of {compared} differ:\n{}", failures.len(), failures.iter().take(15).cloned().collect::<Vec<String>>().join("\n"));
}

#[test]
fn the_geo_config_is_read_as_the_ts_reads_it() {
    let vectors: Value = serde_json::from_str(VECTORS).expect("public-vectors.json parses");
    for case in vectors["geoConfigs"].as_array().expect("geo configs") {
        let env: HashMap<String, String> = string_map(&case["env"]);
        let config: HealthzGeoConfig = read_healthz_geo_config(&|name: &str| env.get(name).cloned(), None);
        let routes: Vec<(String, String)> = config.routes.into_iter().collect();
        let expected: Vec<(String, String)> = serde_json::from_value(case["routes"].clone()).expect("routes");
        assert_eq!(config.enabled, case["enabled"].as_bool().expect("enabled"), "{env:?}");
        assert_eq!(routes, expected, "{env:?}");
        assert_eq!(config.probe_interval_ms, case["probeIntervalMs"].as_f64().expect("an interval"), "{env:?}");
        assert_eq!(config.probe_timeout_ms, case["probeTimeoutMs"].as_f64().expect("a timeout"), "{env:?}");
    }
}

#[tokio::test]
async fn the_geo_decisions_are_the_ts_decisions() {
    let vectors: Value = serde_json::from_str(VECTORS).expect("public-vectors.json parses");
    let countries: HashMap<String, String> = string_map(&vectors["countries"]);
    let mut checked: usize = 0;
    for case in vectors["decisions"].as_array().expect("decisions") {
        let env: HashMap<String, String> = string_map(&case["env"]);
        let healthy: Vec<String> = serde_json::from_value(case["healthy"].clone()).expect("healthy");
        let config: HealthzGeoConfig = read_healthz_geo_config(&|name: &str| env.get(name).cloned(), None);
        let monitor: TargetHealthMonitor =
            TargetHealthMonitor::new(config.routes.values().cloned().collect(), config.probe_interval_ms, config.probe_timeout_ms, healthy_probe(healthy), None);
        monitor.poll_all().await;
        let lookup: Countries = Countries {
            available: case["available"].as_bool().expect("available"),
            table: countries.clone(),
        };
        let router: HealthzGeoRouter = HealthzGeoRouter::new(config, Arc::new(lookup), Arc::new(monitor));
        let decision = router.resolve_host(case["ip"].as_str(), case["ownHost"].as_str());
        assert_eq!(decision.host.as_deref(), case["host"].as_str(), "{case}");
        assert_eq!(decision.outcome.as_str(), case["outcome"].as_str().expect("an outcome"), "{case}");
        checked += 1;
    }
    assert!(checked > 300, "only {checked} decisions");
}
