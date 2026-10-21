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

//! Replays rust/equivalence/vectors.json, written by generate.ts on Node 24 from the TS
//! backends: the same fake readers and fetch responses are rebuilt here from the recorded
//! scenarios, and every result (as JSON, key order included), request and log line must
//! match.

use crate::*;
use prosopo_logger::{
    get_logger_with_runtime, ConsoleMethod, DirectiveStore, LogLevel, LogRuntime, Logger, Sink,
    SystemClock,
};
use prosopo_types::ipapi::IpInfoResponse;
use serde::Deserialize;
use serde_json::Value;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

const VECTORS: &str = include_str!("equivalence/vectors.json");
const CITY_PATH: &str = "/dbs/geo.mmdb";
const ASN_PATH: &str = "/dbs/asn.mmdb";

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
enum Behaviour {
    Model { model: Value },
    Throws { throws: Thrown },
    Unsupported(#[allow(dead_code)] String),
}

#[derive(Debug, Clone, Deserialize)]
struct Thrown {
    name: String,
    message: String,
}

#[derive(Debug, Clone, Deserialize)]
struct ReaderSpec {
    opens: bool,
    city: Option<Behaviour>,
    country: Option<Behaviour>,
    asn: Option<Behaviour>,
}

#[derive(Debug, Clone, Deserialize)]
struct Call {
    op: String,
    ip: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MaxMindScenario {
    label: String,
    city_db: Option<ReaderSpec>,
    asn_db: Option<ReaderSpec>,
    calls: Vec<Call>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
enum FetchSpec {
    Response {
        status: u16,
        #[serde(rename = "statusText")]
        status_text: String,
        body: String,
    },
    NetworkError {
        #[serde(rename = "networkError")]
        network_error: String,
    },
    Abort {
        #[serde(rename = "abort")]
        _abort: bool,
    },
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IpapiScenario {
    label: String,
    api_key: Option<String>,
    timeout_ms: Option<u64>,
    ip: String,
    response: FetchSpec,
}

#[derive(Debug, Clone, Deserialize)]
struct IpapiSpec {
    response: FetchSpec,
}

#[derive(Debug, Clone, Deserialize)]
struct ServiceScenario {
    label: String,
    maxmind: Option<MaxMindScenario>,
    ipapi: Option<IpapiSpec>,
    calls: Vec<Call>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
struct LogLine {
    level: String,
    msg: String,
}

#[derive(Debug, Deserialize)]
struct MaxMindVector {
    scenario: MaxMindScenario,
    available: bool,
    results: Vec<Value>,
    logs: Vec<LogLine>,
}

#[derive(Debug, Deserialize)]
struct IpapiVector {
    scenario: IpapiScenario,
    result: String,
    requests: Vec<Value>,
}

#[derive(Debug, Deserialize)]
struct ServiceVector {
    scenario: ServiceScenario,
    available: bool,
    results: Vec<Value>,
    logs: Vec<LogLine>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConfiguredVector {
    config: ServiceConfig,
    available_before: bool,
    available: bool,
    result: Option<Value>,
    logs: Vec<LogLine>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ServiceConfig {
    city_path: Option<String>,
    asn_path: Option<String>,
    ipapi_url: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Vectors {
    non_routable: Vec<(String, bool)>,
    is_ip: Vec<(String, bool)>,
    parse_abuser_score: Vec<(Option<String>, Option<Value>)>,
    maxmind: Vec<MaxMindVector>,
    ipapi: Vec<IpapiVector>,
    service: Vec<ServiceVector>,
    configured: Vec<ConfiguredVector>,
}

fn vectors() -> Vectors {
    serde_json::from_str(VECTORS).expect("vectors.json parses")
}

struct FakeReader(ReaderSpec);

fn answer<T: serde::de::DeserializeOwned>(behaviour: &Option<Behaviour>) -> Result<T, ReaderError> {
    match behaviour {
        Some(Behaviour::Model { model }) => {
            Ok(serde_json::from_value(model.clone()).expect("model shape"))
        }
        Some(Behaviour::Throws { throws }) if throws.name == "BadMethodCallError" => {
            Err(ReaderError::BadMethodCall(throws.message.clone()))
        }
        Some(Behaviour::Throws { throws }) => Err(ReaderError::Other {
            name: throws.name.clone(),
            message: throws.message.clone(),
        }),
        Some(Behaviour::Unsupported(_)) | None => Err(ReaderError::Other {
            name: "Error".to_string(),
            message: "database does not support this lookup".to_string(),
        }),
    }
}

impl GeoReader for FakeReader {
    fn city(&self, _ip: &str) -> Result<CityModel, ReaderError> {
        answer(&self.0.city)
    }

    fn country(&self, _ip: &str) -> Result<CountryModel, ReaderError> {
        answer(&self.0.country)
    }

    fn asn(&self, _ip: &str) -> Result<AsnModel, ReaderError> {
        answer(&self.0.asn)
    }
}

#[derive(Default)]
struct LineSink {
    lines: Mutex<Vec<String>>,
}

impl Sink for LineSink {
    fn write(&self, _method: ConsoleMethod, line: &str) {
        self.lines.lock().expect("sink lock").push(line.to_string());
    }
}

impl LineSink {
    fn logs(&self) -> Vec<LogLine> {
        self.lines
            .lock()
            .expect("sink lock")
            .iter()
            .map(|line| {
                let record: Value = serde_json::from_str(line).expect("log JSON");
                LogLine {
                    level: record["level"].as_str().unwrap_or("").to_string(),
                    msg: record["msg"].as_str().unwrap_or("").to_string(),
                }
            })
            .collect()
    }
}

fn logger() -> (Logger, Arc<LineSink>) {
    let sink: Arc<LineSink> = Arc::new(LineSink::default());
    let runtime: LogRuntime = LogRuntime {
        sink: sink.clone(),
        clock: Arc::new(SystemClock),
        directives: Arc::new(DirectiveStore::new("")),
    };
    (
        get_logger_with_runtime(LogLevel::Trace, "ipinfo-equivalence", runtime),
        sink,
    )
}

fn maxmind_backend(scenario: &MaxMindScenario, logger: &Logger) -> MaxMindBackend {
    let city: Option<ReaderSpec> = scenario.city_db.clone();
    let asn: Option<ReaderSpec> = scenario.asn_db.clone();
    MaxMindBackend::new(MaxMindBackendConfig {
        city_db_path: city.as_ref().map(|_| CITY_PATH.into()),
        asn_db_path: asn.as_ref().map(|_| ASN_PATH.into()),
        logger: Some(logger.clone()),
        open_reader: Some(Box::new(move |path: &Path| {
            let spec: Option<&ReaderSpec> = if path == Path::new(CITY_PATH) {
                city.as_ref()
            } else {
                asn.as_ref()
            };
            match spec {
                Some(spec) if spec.opens => {
                    Ok(Box::new(FakeReader(spec.clone())) as Box<dyn GeoReader>)
                }
                _ => Err(ReaderError::Other {
                    name: "Error".to_string(),
                    message: format!("no database at {}", path.display()),
                }),
            }
        })),
    })
}

struct FakeFetch {
    spec: FetchSpec,
    requests: Arc<Mutex<Vec<Value>>>,
}

impl Fetch for FakeFetch {
    fn fetch(&self, request: FetchRequest) -> FetchFuture<'_> {
        let headers: serde_json::Map<String, Value> = request
            .headers
            .iter()
            .map(|(name, value)| (name.to_string(), Value::from(*value)))
            .collect();
        self.requests
            .lock()
            .expect("requests lock")
            .push(serde_json::json!({
                "url": request.url,
                "method": request.method,
                "headers": headers,
                "body": request.body,
            }));
        let outcome: Result<FetchResponse, FetchError> = match &self.spec {
            FetchSpec::Response {
                status,
                status_text,
                body,
            } => Ok(FetchResponse {
                status: *status,
                status_text: status_text.clone(),
                body: body.clone(),
            }),
            FetchSpec::NetworkError { network_error } => {
                Err(FetchError::Failed(network_error.clone()))
            }
            FetchSpec::Abort { .. } => Err(FetchError::TimedOut),
        };
        Box::pin(async move { outcome })
    }
}

fn ipapi_backend(
    spec: &FetchSpec,
    api_key: Option<String>,
    timeout_ms: Option<u64>,
) -> (IpapiBackend, Arc<Mutex<Vec<Value>>>) {
    let requests: Arc<Mutex<Vec<Value>>> = Arc::new(Mutex::new(Vec::new()));
    let backend: IpapiBackend = IpapiBackend::new(IpapiBackendConfig {
        base_url: "https://ipapi.example/api".to_string(),
        api_key,
        logger: None,
        fetch: Some(Box::new(FakeFetch {
            spec: spec.clone(),
            requests: requests.clone(),
        })),
        timeout_ms,
    });
    (backend, requests)
}

fn json(response: &IpInfoResponse) -> Value {
    Value::from(serde_json::to_string(response).expect("serialises"))
}

fn country_value(country: Option<String>) -> Value {
    country.map_or(Value::Null, Value::from)
}

#[test]
fn helpers_match_the_ts() {
    let vectors: Vectors = vectors();
    for (ip, expected) in &vectors.non_routable {
        assert_eq!(is_non_routable(ip), *expected, "isNonRoutable({ip:?})");
    }
    for (ip, expected) in &vectors.is_ip {
        assert_eq!(is_ip(ip), *expected, "net.isIP({ip:?})");
    }
    for (score, expected) in &vectors.parse_abuser_score {
        let actual: Option<Value> = parse_abuser_score(score.as_deref()).map(|parsed| {
            if parsed.is_finite() {
                Value::from(parsed)
            } else if parsed > 0.0 {
                Value::from("Infinity")
            } else {
                Value::from("-Infinity")
            }
        });
        let same: bool = match (&actual, expected) {
            (Some(Value::Number(a)), Some(Value::Number(b))) => a.as_f64() == b.as_f64(),
            (a, b) => a == b,
        };
        assert!(
            same,
            "parseAbuserScore({score:?}): {actual:?} vs {expected:?}"
        );
    }
}

#[test]
fn maxmind_matches_the_ts() {
    for vector in vectors().maxmind {
        let label: &str = &vector.scenario.label;
        let (logger, sink) = logger();
        let mut backend: MaxMindBackend = maxmind_backend(&vector.scenario, &logger);
        backend.initialize();
        let results: Vec<Value> = vector
            .scenario
            .calls
            .iter()
            .map(|call| match call.op.as_str() {
                "lookup" => json(&backend.lookup(&call.ip)),
                _ => country_value(backend.country_code(&call.ip)),
            })
            .collect();
        assert_eq!(
            backend.is_available(),
            vector.available,
            "{label}: available"
        );
        assert_eq!(results, vector.results, "{label}: results");
        assert_eq!(sink.logs(), vector.logs, "{label}: logs");
    }
}

#[tokio::test]
async fn ipapi_matches_the_ts() {
    for vector in vectors().ipapi {
        let scenario: &IpapiScenario = &vector.scenario;
        let (backend, requests) = ipapi_backend(
            &scenario.response,
            scenario.api_key.clone(),
            scenario.timeout_ms,
        );
        let result: IpInfoResponse = backend.lookup(&scenario.ip).await;
        assert_eq!(
            json(&result),
            Value::from(vector.result.clone()),
            "{}: result",
            scenario.label
        );
        assert_eq!(
            *requests.lock().expect("requests lock"),
            vector.requests,
            "{}: requests",
            scenario.label
        );
    }
}

#[tokio::test]
async fn service_matches_the_ts() {
    for vector in vectors().service {
        let scenario: &ServiceScenario = &vector.scenario;
        let (logger, sink) = logger();
        let mut service: IpInfoService = IpInfoService::with_backends(
            Some(logger.clone()),
            IpInfoBackends {
                maxmind: scenario.maxmind.as_ref().map(|maxmind| {
                    Box::new(maxmind_backend(maxmind, &logger)) as Box<dyn LocalBackend>
                }),
                ipapi: scenario.ipapi.as_ref().map(|ipapi| {
                    Box::new(ipapi_backend(&ipapi.response, None, None).0) as Box<dyn RemoteBackend>
                }),
            },
        );
        service.initialize().expect("initialises");
        let mut results: Vec<Value> = Vec::new();
        for call in &scenario.calls {
            results.push(match call.op.as_str() {
                "lookup" => json(&service.lookup(&call.ip).await),
                _ => country_value(service.country(&call.ip)),
            });
        }
        assert_eq!(
            service.is_available(),
            vector.available,
            "{}: available",
            scenario.label
        );
        assert_eq!(results, vector.results, "{}: results", scenario.label);
        assert_eq!(sink.logs(), vector.logs, "{}: logs", scenario.label);
    }
}

#[tokio::test]
async fn configured_service_matches_the_ts() {
    for vector in vectors().configured {
        let label: String = format!("{:?}", vector.config);
        let (logger, sink) = logger();
        let mut service: IpInfoService = IpInfoService::new(IpInfoServiceConfig {
            logger: Some(logger),
            maxmind_city_db_path: vector.config.city_path.map(PathBuf::from),
            maxmind_asn_db_path: vector.config.asn_path.map(PathBuf::from),
            ipapi_url: vector.config.ipapi_url.clone(),
            ipapi_key: None,
        });
        assert_eq!(
            service.is_available(),
            vector.available_before,
            "{label}: available before"
        );
        service.initialize().expect("initialises");
        if vector.config.ipapi_url.is_none_or(|url| url.is_empty()) {
            assert_eq!(
                Some(json(&service.lookup("8.8.8.8").await)),
                vector.result,
                "{label}: result"
            );
        }
        assert_eq!(
            service.is_available(),
            vector.available,
            "{label}: available"
        );
        assert_eq!(sink.logs(), vector.logs, "{label}: logs");
    }
}
