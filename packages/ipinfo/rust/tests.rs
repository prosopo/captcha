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

//! Ports of src/tests/{ipapi,maxmind,ipInfoService}.unit.test.ts. src/tests/ipinfo.test-d.ts
//! checks TS types only. Five cases have no Rust counterpart, because the types rule them
//! out: a non-string IP from an untyped caller, a model whose getters throw while being
//! mapped (two cases), a backend that throws, and a failed result without an `error`.

use crate::*;
use prosopo_logger::{
    get_logger_with_runtime, ConsoleMethod, DirectiveStore, LogLevel, LogRuntime, Logger, Sink,
    SystemClock,
};
use prosopo_types::ipapi::{IpInfoResponse, IpInfoResult, IpInfoSource, ProviderType, VpnType};
use prosopo_types::JsNumber;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

const IP: &str = "8.8.8.8";

#[derive(Default)]
struct Lines(Mutex<Vec<Value>>);

impl Sink for Lines {
    fn write(&self, _method: ConsoleMethod, line: &str) {
        self.0
            .lock()
            .expect("lines lock")
            .push(serde_json::from_str(line).expect("log JSON"));
    }
}

impl Lines {
    fn at(&self, level: &str) -> Vec<Value> {
        self.0
            .lock()
            .expect("lines lock")
            .iter()
            .filter(|line| line["level"] == level)
            .cloned()
            .collect()
    }

    fn messages(&self, level: &str) -> Vec<String> {
        self.at(level)
            .iter()
            .map(|line| line["msg"].as_str().unwrap_or("").to_string())
            .collect()
    }
}

fn capture() -> (Logger, Arc<Lines>) {
    let lines: Arc<Lines> = Arc::new(Lines::default());
    let runtime: LogRuntime = LogRuntime {
        sink: lines.clone(),
        clock: Arc::new(SystemClock),
        directives: Arc::new(DirectiveStore::new("")),
    };
    (
        get_logger_with_runtime(LogLevel::Trace, "ipinfo-test", runtime),
        lines,
    )
}

fn expect_valid(response: IpInfoResponse) -> IpInfoResult {
    match response {
        IpInfoResponse::Valid(result) => *result,
        IpInfoResponse::Invalid(error) => panic!("expected a valid result, got: {}", error.error),
    }
}

fn failure(error: &str, ip: &str) -> IpInfoResponse {
    IpInfoResponse::error(error, ip)
}

mod ipapi {
    use super::*;

    const BASE_URL: &str = "https://api.ipapi.test/";

    fn base_response(overrides: Value) -> Value {
        let mut response: Value = json!({
            "ip": IP, "rir": "ARIN", "is_bogon": false, "is_mobile": false, "is_satellite": false,
            "is_crawler": false, "is_datacenter": false, "is_tor": false, "is_proxy": false,
            "is_vpn": false, "is_abuser": false, "elapsed_ms": 1,
        });
        for (key, value) in overrides.as_object().cloned().unwrap_or_default() {
            response[key] = value;
        }
        response
    }

    type Responder =
        Box<dyn Fn(&FetchRequest) -> Option<Result<FetchResponse, FetchError>> + Send + Sync>;

    /// A fetch built from a closure; `None` from the closure means it never answers.
    struct FnFetch {
        respond: Responder,
        requests: Arc<Mutex<Vec<FetchRequest>>>,
        delay: Option<Duration>,
    }

    impl Fetch for FnFetch {
        fn fetch(&self, request: FetchRequest) -> FetchFuture<'_> {
            let outcome: Option<Result<FetchResponse, FetchError>> = (self.respond)(&request);
            self.requests.lock().expect("requests lock").push(request);
            let delay: Option<Duration> = self.delay;
            Box::pin(async move {
                if let Some(delay) = delay {
                    tokio::time::sleep(delay).await;
                }
                match outcome {
                    Some(outcome) => outcome,
                    None => std::future::pending().await,
                }
            })
        }
    }

    fn respond_with(body: Value, status: u16, status_text: &str) -> Responder {
        let status_text: String = status_text.to_string();
        Box::new(move |_| {
            Some(Ok(FetchResponse {
                status,
                status_text: status_text.clone(),
                body: body.to_string(),
            }))
        })
    }

    fn ok(body: Value) -> Responder {
        respond_with(body, 200, "OK")
    }

    fn respond_never() -> Responder {
        Box::new(|_| None)
    }

    fn backend_with(
        respond: Responder,
        api_key: Option<&str>,
        timeout_ms: Option<u64>,
        delay: Option<Duration>,
    ) -> (IpapiBackend, Arc<Mutex<Vec<FetchRequest>>>) {
        let requests: Arc<Mutex<Vec<FetchRequest>>> = Arc::new(Mutex::new(Vec::new()));
        let backend: IpapiBackend = IpapiBackend::new(IpapiBackendConfig {
            base_url: BASE_URL.to_string(),
            api_key: api_key.map(str::to_string),
            logger: None,
            fetch: Some(Box::new(FnFetch {
                respond,
                requests: requests.clone(),
                delay,
            })),
            timeout_ms,
        });
        (backend, requests)
    }

    fn backend(respond: Responder) -> (IpapiBackend, Arc<Mutex<Vec<FetchRequest>>>) {
        backend_with(respond, None, None, None)
    }

    fn close(actual: Option<JsNumber>, expected: f64) -> bool {
        actual.is_some_and(|actual| (actual.get() - expected).abs() < 1e-9)
    }

    #[test]
    fn reads_the_numeric_prefix_of_a_scored_string() {
        assert!((parse_abuser_score(Some("0.0012 (Low)")).expect("score") - 0.0012).abs() < 1e-12);
    }

    #[test]
    fn reads_a_bare_number_with_no_qualifier() {
        assert_eq!(parse_abuser_score(Some("0.5")), Some(0.5));
    }

    #[test]
    fn reports_a_missing_score_as_unknown() {
        assert_eq!(parse_abuser_score(None), None);
    }

    #[test]
    fn reports_an_empty_string_as_unknown() {
        assert_eq!(parse_abuser_score(Some("")), None);
    }

    #[test]
    fn reports_a_non_numeric_score_as_unknown_never_nan() {
        assert_eq!(parse_abuser_score(Some("unknown")), None);
        assert_eq!(parse_abuser_score(Some("(Low)")), None);
    }

    #[test]
    fn distinguishes_a_genuine_zero_from_an_unknown_score() {
        assert_eq!(parse_abuser_score(Some("0 (Very Low)")), Some(0.0));
        assert_eq!(parse_abuser_score(Some("0")), Some(0.0));
        assert_eq!(parse_abuser_score(None), None);
    }

    #[test]
    fn is_available_when_a_base_url_is_configured() {
        assert!(backend(ok(base_response(json!({})))).0.is_available());
    }

    #[test]
    fn is_unavailable_when_the_base_url_is_blank() {
        let blank: IpapiBackend = IpapiBackend::new(IpapiBackendConfig {
            base_url: String::new(),
            api_key: None,
            logger: None,
            fetch: None,
            timeout_ms: None,
        });
        assert!(!blank.is_available());
    }

    #[tokio::test]
    async fn posts_the_ip_as_json_to_the_configured_url() {
        let (backend, requests) = backend(ok(base_response(json!({}))));
        backend.lookup(IP).await;
        let request: FetchRequest = requests.lock().expect("lock")[0].clone();
        assert_eq!(request.url, BASE_URL);
        assert_eq!(request.method, "POST");
        assert_eq!(
            serde_json::from_str::<Value>(&request.body).expect("JSON"),
            json!({ "q": IP })
        );
    }

    #[tokio::test]
    async fn includes_the_api_key_when_one_is_configured() {
        let (backend, requests) =
            backend_with(ok(base_response(json!({}))), Some("secret"), None, None);
        backend.lookup(IP).await;
        let body: Value =
            serde_json::from_str(&requests.lock().expect("lock")[0].body).expect("JSON");
        assert_eq!(body, json!({ "q": IP, "key": "secret" }));
    }

    #[tokio::test]
    async fn omits_an_empty_api_key() {
        let (backend, requests) = backend_with(ok(base_response(json!({}))), Some(""), None, None);
        backend.lookup(IP).await;
        let body: Value =
            serde_json::from_str(&requests.lock().expect("lock")[0].body).expect("JSON");
        assert_eq!(body, json!({ "q": IP }));
    }

    #[tokio::test]
    async fn asks_for_and_declares_json() {
        let (backend, requests) = backend(ok(base_response(json!({}))));
        backend.lookup(IP).await;
        let headers: Vec<(&str, &str)> = requests.lock().expect("lock")[0].headers.clone();
        assert!(headers.contains(&("Content-Type", "application/json")));
        assert!(headers.contains(&("Accept", "application/json")));
    }

    #[tokio::test]
    async fn rejects_an_empty_ip_without_calling_out() {
        let (backend, requests) = backend(ok(base_response(json!({}))));
        assert_eq!(
            backend.lookup("").await,
            failure("Invalid IP address provided", "undefined")
        );
        assert!(requests.lock().expect("lock").is_empty());
    }

    #[tokio::test]
    async fn maps_a_full_response_onto_the_shared_result_shape() {
        let (backend, _) = backend(ok(base_response(json!({
            "is_vpn": true,
            "is_datacenter": true,
            "company": { "name": "Example Co", "abuser_score": "0.01 (Low)", "domain": "example.com", "type": "hosting", "network": "8.8.8.0/24", "whois": "" },
            "asn": { "asn": 15169, "abuser_score": "0.002 (Very Low)", "route": "8.8.8.0/24", "descr": "", "country": "US", "active": true, "org": "Google LLC", "domain": "google.com", "abuse": "", "type": "hosting", "created": "", "updated": "", "rir": "ARIN", "whois": "" },
            "location": { "is_eu_member": false, "calling_code": "1", "currency_code": "USD", "continent": "NA", "country": "United States", "country_code": "US", "state": "California", "city": "Mountain View", "latitude": 37.4, "longitude": -122.1, "zip": "94035", "timezone": "America/Los_Angeles", "local_time": "", "local_time_unix": 0, "is_dst": false },
            "vpn": { "ip": IP, "service": "ExampleVPN", "url": "", "type": "exit_node", "last_seen": 0, "last_seen_str": "", "country_code": "US", "city_name": "Mountain View", "latitude": 37.4, "longitude": -122.1 },
        }))));
        let result: IpInfoResult = expect_valid(backend.lookup(IP).await);
        assert_eq!(result.ip.as_deref(), Some(IP));
        assert_eq!(result.is_vpn, Some(true));
        assert_eq!(result.is_datacenter, Some(true));
        assert_eq!(result.provider_name.as_deref(), Some("Example Co"));
        assert_eq!(result.provider_type, Some(ProviderType::Hosting));
        assert_eq!(result.asn_number, Some(JsNumber(15169.0)));
        assert_eq!(result.asn_organization.as_deref(), Some("Google LLC"));
        assert_eq!(result.country.as_deref(), Some("United States"));
        assert_eq!(result.country_code.as_deref(), Some("US"));
        assert_eq!(result.region.as_deref(), Some("California"));
        assert_eq!(result.city.as_deref(), Some("Mountain View"));
        assert_eq!(result.timezone.as_deref(), Some("America/Los_Angeles"));
        assert_eq!(result.vpn_service.as_deref(), Some("ExampleVPN"));
        assert_eq!(result.vpn_type, Some(VpnType::ExitNode));
        assert!(close(result.abuser_score, 0.002));
        assert!(close(result.company_abuser_score, 0.01));
    }

    #[tokio::test]
    async fn survives_a_response_missing_every_optional_section() {
        let (backend, _) = backend(ok(base_response(json!({}))));
        let result: IpInfoResult = expect_valid(backend.lookup(IP).await);
        assert_eq!(result.country, None);
        assert_eq!(result.asn_number, None);
        assert_eq!(result.provider_name, None);
        assert_eq!(result.abuser_score, None);
        assert_eq!(result.company_abuser_score, None);
    }

    #[tokio::test]
    async fn keeps_a_successful_lookup_when_the_abuser_scores_are_absent() {
        let (backend, _) = backend(ok(base_response(json!({
            "asn": { "asn": 64512, "route": "", "descr": "", "country": "US", "active": true, "org": "Test", "domain": "", "abuse": "", "type": "isp", "created": "", "updated": "", "rir": "ARIN", "whois": "" },
        }))));
        let result: IpInfoResult = expect_valid(backend.lookup(IP).await);
        assert_eq!(result.asn_number, Some(JsNumber(64512.0)));
        assert_eq!(result.abuser_score, None);
    }

    #[tokio::test]
    async fn prefers_the_company_name_but_falls_back_to_the_datacenter() {
        let (backend, _) = backend(ok(base_response(json!({
            "datacenter": { "datacenter": "AWS", "network": "1.2.3.0/24" },
        }))));
        let result: IpInfoResult = expect_valid(backend.lookup(IP).await);
        assert_eq!(result.provider_name.as_deref(), Some("AWS"));
        assert_eq!(result.datacenter_name.as_deref(), Some("AWS"));
    }

    #[tokio::test]
    async fn reports_a_bogon_address_as_invalid() {
        let (backend, _) = backend(ok(base_response(json!({ "is_bogon": true }))));
        assert_eq!(
            backend.lookup(IP).await,
            failure("IP address is bogon (non-routable)", IP)
        );
    }

    #[tokio::test]
    async fn reports_a_non_2xx_status_with_the_code_and_text() {
        let (backend, _) = backend(respond_with(json!({}), 429, "Too Many Requests"));
        assert_eq!(
            backend.lookup(IP).await,
            failure("API request failed with status 429: Too Many Requests", IP)
        );
    }

    #[tokio::test]
    async fn reports_a_500_without_throwing() {
        let (backend, _) = backend(respond_with(json!({}), 500, "Internal Server Error"));
        assert!(!backend.lookup(IP).await.is_valid());
    }

    #[tokio::test]
    async fn turns_malformed_json_into_an_error_response() {
        let (backend, _) = backend(Box::new(|_| {
            Some(Ok(FetchResponse {
                status: 200,
                status_text: String::new(),
                body: "not json".to_string(),
            }))
        }));
        match backend.lookup(IP).await {
            IpInfoResponse::Invalid(error) => {
                assert_eq!(error.ip, IP);
                assert!(
                    error.error.contains("Network or parsing error"),
                    "{}",
                    error.error
                );
            }
            valid => panic!("expected an error, got {valid:?}"),
        }
    }

    #[tokio::test]
    async fn turns_a_network_failure_into_an_error_response() {
        let (backend, _) = backend(Box::new(|_| {
            Some(Err(FetchError::Failed("ECONNREFUSED".to_string())))
        }));
        assert_eq!(
            backend.lookup(IP).await,
            failure("Network or parsing error: ECONNREFUSED", IP)
        );
    }

    #[tokio::test]
    async fn describes_a_non_error_rejection() {
        let (backend, _) = backend(Box::new(|_| {
            Some(Err(FetchError::Failed("socket hang up".to_string())))
        }));
        assert_eq!(
            backend.lookup(IP).await,
            failure("Network or parsing error: socket hang up", IP)
        );
    }

    #[tokio::test]
    async fn gives_up_on_a_hanging_upstream_and_says_so() {
        let (backend, _) = backend_with(respond_never(), None, Some(20), None);
        assert_eq!(
            backend.lookup(IP).await,
            failure("Request timed out after 20ms", IP)
        );
    }

    #[tokio::test]
    async fn reports_the_default_budget_when_none_is_configured() {
        assert_eq!(DEFAULT_TIMEOUT_MS, 700);
        let (backend, _) = backend(respond_never());
        assert_eq!(
            backend.lookup(IP).await,
            failure("Request timed out after 700ms", IP)
        );
        assert!(backend.is_available());
    }

    #[tokio::test]
    async fn does_not_time_out_a_response_that_arrives_in_time() {
        let (backend, _) = backend_with(
            ok(base_response(json!({}))),
            None,
            Some(200),
            Some(Duration::from_millis(5)),
        );
        assert!(backend.lookup(IP).await.is_valid());
    }

    #[tokio::test]
    async fn hands_the_upstream_its_time_budget() {
        let (backend, requests) = backend(ok(base_response(json!({}))));
        backend.lookup(IP).await;
        assert_eq!(
            requests.lock().expect("lock")[0].timeout,
            Duration::from_millis(DEFAULT_TIMEOUT_MS)
        );
    }

    #[tokio::test]
    async fn uses_the_real_fetch_when_none_is_injected() {
        let backend: IpapiBackend = IpapiBackend::new(IpapiBackendConfig {
            base_url: "http://127.0.0.1:1/".to_string(),
            api_key: None,
            logger: None,
            fetch: None,
            timeout_ms: Some(2000),
        });
        assert!(!backend.lookup(IP).await.is_valid());
    }
}

mod maxmind {
    use super::*;

    const CITY_DB: &str = "/dbs/GeoLite2-City.mmdb";
    const ASN_DB: &str = "/dbs/GeoLite2-ASN.mmdb";

    type Answer<T> = Box<dyn Fn() -> Result<T, ReaderError> + Send + Sync>;

    #[derive(Default)]
    struct Calls {
        city: AtomicUsize,
        country: AtomicUsize,
        asn: AtomicUsize,
    }

    /// A reader that answers however the test needs, counting the calls.
    struct FnReader {
        city: Option<Answer<CityModel>>,
        country: Option<Answer<CountryModel>>,
        asn: Option<Answer<AsnModel>>,
        calls: Arc<Calls>,
    }

    fn unsupported<T>() -> Result<T, ReaderError> {
        Err(ReaderError::Other {
            name: "Error".to_string(),
            message: "database does not support this lookup".to_string(),
        })
    }

    impl GeoReader for FnReader {
        fn city(&self, _ip: &str) -> Result<CityModel, ReaderError> {
            self.calls.city.fetch_add(1, Ordering::SeqCst);
            self.city
                .as_ref()
                .map_or_else(unsupported, |answer| answer())
        }

        fn country(&self, _ip: &str) -> Result<CountryModel, ReaderError> {
            self.calls.country.fetch_add(1, Ordering::SeqCst);
            self.country
                .as_ref()
                .map_or_else(unsupported, |answer| answer())
        }

        fn asn(&self, _ip: &str) -> Result<AsnModel, ReaderError> {
            self.calls.asn.fetch_add(1, Ordering::SeqCst);
            self.asn
                .as_ref()
                .map_or_else(unsupported, |answer| answer())
        }
    }

    /// Hands out the same reader on every open, as the TS `opens` helper does.
    struct Shared(Arc<FnReader>);

    impl GeoReader for Shared {
        fn city(&self, ip: &str) -> Result<CityModel, ReaderError> {
            self.0.city(ip)
        }

        fn country(&self, ip: &str) -> Result<CountryModel, ReaderError> {
            self.0.country(ip)
        }

        fn asn(&self, ip: &str) -> Result<AsnModel, ReaderError> {
            self.0.asn(ip)
        }
    }

    #[derive(Default)]
    struct ReaderBuilder {
        city: Option<Answer<CityModel>>,
        country: Option<Answer<CountryModel>>,
        asn: Option<Answer<AsnModel>>,
    }

    impl ReaderBuilder {
        fn build(self, calls: &Arc<Calls>) -> Arc<FnReader> {
            Arc::new(FnReader {
                city: self.city,
                country: self.country,
                asn: self.asn,
                calls: calls.clone(),
            })
        }

        fn city(
            mut self,
            answer: impl Fn() -> Result<CityModel, ReaderError> + Send + Sync + 'static,
        ) -> Self {
            self.city = Some(Box::new(answer));
            self
        }

        fn country(
            mut self,
            answer: impl Fn() -> Result<CountryModel, ReaderError> + Send + Sync + 'static,
        ) -> Self {
            self.country = Some(Box::new(answer));
            self
        }

        fn asn(
            mut self,
            answer: impl Fn() -> Result<AsnModel, ReaderError> + Send + Sync + 'static,
        ) -> Self {
            self.asn = Some(Box::new(answer));
            self
        }
    }

    fn reader() -> ReaderBuilder {
        ReaderBuilder::default()
    }

    fn bad_method_call<T>() -> Result<T, ReaderError> {
        Err(ReaderError::BadMethodCall(
            "The city() method cannot be used with the GeoLite2-Country database".to_string(),
        ))
    }

    fn missing<T>() -> Result<T, ReaderError> {
        Err(ReaderError::Other {
            name: "Error".to_string(),
            message: "address not found".to_string(),
        })
    }

    fn model<T: serde::de::DeserializeOwned>(value: Value) -> T {
        serde_json::from_value(value).expect("model")
    }

    fn city_data(overrides: Value) -> CityModel {
        let mut city: Value = json!({
            "country": { "isoCode": "US", "names": { "en": "United States" } },
            "city": { "names": { "en": "Mountain View" } },
            "subdivisions": [{ "names": { "en": "California" } }],
            "location": { "latitude": 37.4, "longitude": -122.1, "timeZone": "America/Los_Angeles" },
            "traits": {},
        });
        for (key, value) in overrides.as_object().cloned().unwrap_or_default() {
            city[key] = value;
        }
        model(city)
    }

    fn country_data(overrides: Value) -> CountryModel {
        let mut country: Value = json!({ "country": { "isoCode": "US", "names": { "en": "United States" } }, "traits": {} });
        for (key, value) in overrides.as_object().cloned().unwrap_or_default() {
            country[key] = value;
        }
        model(country)
    }

    fn asn_data(number: f64) -> AsnModel {
        AsnModel {
            autonomous_system_number: Some(number),
            autonomous_system_organization: Some("Google LLC".to_string()),
        }
    }

    struct Opened {
        backend: MaxMindBackend,
        city_calls: Arc<Calls>,
        asn_calls: Arc<Calls>,
        opens: Arc<Mutex<Vec<PathBuf>>>,
    }

    fn backend_with(
        city: Option<ReaderBuilder>,
        asn: Option<ReaderBuilder>,
        paths: (bool, bool),
        logger: Option<Logger>,
    ) -> Opened {
        let city_calls: Arc<Calls> = Arc::new(Calls::default());
        let asn_calls: Arc<Calls> = Arc::new(Calls::default());
        let opens: Arc<Mutex<Vec<PathBuf>>> = Arc::new(Mutex::new(Vec::new()));
        let city_reader: Option<Arc<FnReader>> = city.map(|builder| builder.build(&city_calls));
        let asn_reader: Option<Arc<FnReader>> = asn.map(|builder| builder.build(&asn_calls));
        let recorded: Arc<Mutex<Vec<PathBuf>>> = opens.clone();
        let backend: MaxMindBackend = MaxMindBackend::new(MaxMindBackendConfig {
            city_db_path: paths.0.then(|| CITY_DB.into()),
            asn_db_path: paths.1.then(|| ASN_DB.into()),
            logger,
            open_reader: Some(Box::new(move |path: &Path| {
                recorded
                    .lock()
                    .expect("opens lock")
                    .push(path.to_path_buf());
                let reader: Option<&Arc<FnReader>> = if path == Path::new(CITY_DB) {
                    city_reader.as_ref()
                } else {
                    asn_reader.as_ref()
                };
                reader
                    .map(|reader| Box::new(Shared(reader.clone())) as Box<dyn GeoReader>)
                    .ok_or_else(|| ReaderError::Other {
                        name: "Error".to_string(),
                        message: format!("no database at {}", path.display()),
                    })
            })),
        });
        Opened {
            backend,
            city_calls,
            asn_calls,
            opens,
        }
    }

    fn initialised(city: Option<ReaderBuilder>, asn: Option<ReaderBuilder>) -> Opened {
        let paths: (bool, bool) = (city.is_some(), asn.is_some());
        let mut opened: Opened = backend_with(city, asn, paths, None);
        opened.backend.initialize();
        opened
    }

    #[test]
    fn opens_only_the_databases_that_are_configured() {
        let mut opened = backend_with(
            Some(reader().city(|| Ok(city_data(json!({}))))),
            None,
            (true, false),
            None,
        );
        opened.backend.initialize();
        assert_eq!(
            *opened.opens.lock().expect("lock"),
            vec![PathBuf::from(CITY_DB)]
        );
    }

    #[test]
    fn opens_neither_database_when_no_paths_are_configured() {
        let mut opened = backend_with(None, None, (false, false), None);
        opened.backend.initialize();
        assert!(opened.opens.lock().expect("lock").is_empty());
    }

    #[test]
    fn logs_the_readers_it_did_open() {
        let (logger, lines) = capture();
        let mut opened = backend_with(
            Some(reader().city(|| Ok(city_data(json!({}))))),
            Some(reader().asn(|| Ok(asn_data(15169.0)))),
            (true, true),
            Some(logger),
        );
        opened.backend.initialize();
        assert_eq!(
            lines.messages("info"),
            [
                "MaxMind City reader initialized",
                "MaxMind ASN reader initialized"
            ]
        );
    }

    #[test]
    fn keeps_the_asn_database_when_the_city_database_fails_to_open() {
        let mut opened = backend_with(
            None,
            Some(reader().asn(|| Ok(asn_data(15169.0)))),
            (true, true),
            None,
        );
        opened.backend.initialize();
        assert!(opened.backend.is_available());
    }

    #[test]
    fn does_not_throw_when_every_database_fails_to_open() {
        let mut opened = backend_with(None, None, (true, true), None);
        opened.backend.initialize();
        assert!(!opened.backend.is_available());
    }

    #[test]
    fn logs_a_warning_for_each_database_it_could_not_open() {
        let (logger, lines) = capture();
        let mut opened = backend_with(None, None, (true, true), Some(logger));
        opened.backend.initialize();
        assert_eq!(
            lines.messages("warn"),
            [
                "Failed to initialize MaxMind City reader",
                "Failed to initialize MaxMind ASN reader"
            ]
        );
    }

    #[test]
    fn is_safe_to_call_twice() {
        let mut opened = backend_with(
            Some(reader().city(|| Ok(city_data(json!({}))))),
            None,
            (true, false),
            None,
        );
        opened.backend.initialize();
        opened.backend.initialize();
        assert!(opened.backend.is_available());
    }

    #[test]
    fn is_unavailable_before_initialize_even_when_paths_are_configured() {
        let mut opened = backend_with(
            Some(reader().city(|| Ok(city_data(json!({}))))),
            None,
            (true, false),
            None,
        );
        assert!(!opened.backend.is_available());
        opened.backend.initialize();
        assert!(opened.backend.is_available());
    }

    #[test]
    fn refuses_to_look_up_before_the_databases_are_open() {
        let opened = backend_with(None, None, (true, false), None);
        assert_eq!(
            opened.backend.lookup(IP),
            failure("MaxMind readers not initialized", IP)
        );
    }

    #[test]
    fn maps_city_data_onto_the_shared_result_shape() {
        let result = expect_valid(
            initialised(Some(reader().city(|| Ok(city_data(json!({}))))), None)
                .backend
                .lookup(IP),
        );
        assert_eq!(result.source, IpInfoSource::MaxMind);
        assert_eq!(result.ip.as_deref(), Some(IP));
        assert_eq!(result.country.as_deref(), Some("United States"));
        assert_eq!(result.country_code.as_deref(), Some("US"));
        assert_eq!(result.region.as_deref(), Some("California"));
        assert_eq!(result.city.as_deref(), Some("Mountain View"));
        assert_eq!(result.latitude, Some(JsNumber(37.4)));
        assert_eq!(result.longitude, Some(JsNumber(-122.1)));
        assert_eq!(result.timezone.as_deref(), Some("America/Los_Angeles"));
    }

    #[test]
    fn reports_threat_indicators_the_free_databases_never_populate_as_false() {
        let result = expect_valid(
            initialised(Some(reader().city(|| Ok(city_data(json!({}))))), None)
                .backend
                .lookup(IP),
        );
        for flag in [
            result.is_vpn,
            result.is_tor,
            result.is_proxy,
            result.is_abuser,
            result.is_mobile,
            result.is_crawler,
        ] {
            assert_eq!(flag, Some(false));
        }
    }

    #[test]
    fn reads_the_anonymity_traits_when_a_paid_database_supplies_them() {
        let traits: Value = json!({ "traits": { "isAnonymousVpn": true, "isTorExitNode": true, "isHostingProvider": true, "isSatelliteProvider": true } });
        let result = expect_valid(
            initialised(
                Some(reader().city(move || Ok(city_data(traits.clone())))),
                None,
            )
            .backend
            .lookup(IP),
        );
        assert_eq!(result.is_vpn, Some(true));
        assert_eq!(result.is_tor, Some(true));
        assert_eq!(result.is_datacenter, Some(true));
        assert_eq!(result.is_satellite, Some(true));
    }

    #[test]
    fn treats_a_residential_proxy_as_a_proxy() {
        let residential = initialised(
            Some(reader().city(|| {
                Ok(city_data(
                    json!({ "traits": { "isResidentialProxy": true } }),
                ))
            })),
            None,
        );
        let public = initialised(
            Some(reader().city(|| Ok(city_data(json!({ "traits": { "isPublicProxy": true } }))))),
            None,
        );
        assert_eq!(
            expect_valid(residential.backend.lookup(IP)).is_proxy,
            Some(true)
        );
        assert_eq!(expect_valid(public.backend.lookup(IP)).is_proxy, Some(true));
    }

    #[test]
    fn falls_back_to_the_asn_database_for_the_as_number() {
        let result = expect_valid(
            initialised(
                Some(reader().city(|| Ok(city_data(json!({}))))),
                Some(reader().asn(|| Ok(asn_data(15169.0)))),
            )
            .backend
            .lookup(IP),
        );
        assert_eq!(result.asn_number, Some(JsNumber(15169.0)));
        assert_eq!(result.asn_organization.as_deref(), Some("Google LLC"));
    }

    #[test]
    fn prefers_the_city_databases_asn_traits_over_the_asn_database() {
        let traits: Value = json!({ "traits": { "autonomousSystemNumber": 111, "autonomousSystemOrganization": "From City" } });
        let result = expect_valid(
            initialised(
                Some(reader().city(move || Ok(city_data(traits.clone())))),
                Some(reader().asn(|| Ok(asn_data(222.0)))),
            )
            .backend
            .lookup(IP),
        );
        assert_eq!(result.asn_number, Some(JsNumber(111.0)));
        assert_eq!(result.asn_organization.as_deref(), Some("From City"));
    }

    #[test]
    fn returns_asn_only_data_when_no_city_database_is_configured() {
        let result = expect_valid(
            initialised(None, Some(reader().asn(|| Ok(asn_data(15169.0)))))
                .backend
                .lookup(IP),
        );
        assert_eq!(result.asn_number, Some(JsNumber(15169.0)));
        assert_eq!(result.country, None);
    }

    #[test]
    fn reports_no_data_when_the_ip_is_in_neither_database() {
        let opened = initialised(Some(reader().city(missing)), Some(reader().asn(missing)));
        assert_eq!(
            opened.backend.lookup(IP),
            failure("No MaxMind data available for IP", IP)
        );
    }

    #[test]
    fn still_answers_from_the_asn_database_when_the_city_lookup_throws() {
        let result = expect_valid(
            initialised(
                Some(reader().city(missing)),
                Some(reader().asn(|| Ok(asn_data(15169.0)))),
            )
            .backend
            .lookup(IP),
        );
        assert_eq!(result.asn_number, Some(JsNumber(15169.0)));
        assert_eq!(result.country, None);
    }

    fn provider_type_for(user_type: &'static str) -> Option<ProviderType> {
        let traits: Value = json!({ "traits": { "userType": user_type } });
        expect_valid(
            initialised(
                Some(reader().city(move || Ok(city_data(traits.clone())))),
                None,
            )
            .backend
            .lookup(IP),
        )
        .provider_type
    }

    #[test]
    fn maps_a_hosting_user_type_onto_the_provider_type() {
        assert_eq!(provider_type_for("hosting"), Some(ProviderType::Hosting));
    }

    #[test]
    fn maps_every_user_type_maxmind_can_emit() {
        let expected: [(&str, Option<ProviderType>); 16] = [
            ("hosting", Some(ProviderType::Hosting)),
            ("content_delivery_network", Some(ProviderType::Hosting)),
            ("college", Some(ProviderType::Education)),
            ("school", Some(ProviderType::Education)),
            ("library", Some(ProviderType::Education)),
            ("government", Some(ProviderType::Government)),
            ("military", Some(ProviderType::Government)),
            ("business", Some(ProviderType::Business)),
            ("residential", Some(ProviderType::Isp)),
            ("cellular", Some(ProviderType::Isp)),
            ("dialup", Some(ProviderType::Isp)),
            ("cafe", Some(ProviderType::Isp)),
            ("traveler", Some(ProviderType::Isp)),
            ("router", Some(ProviderType::Isp)),
            ("consumer_privacy_network", None),
            ("search_engine_spider", None),
        ];
        for (user_type, provider_type) in expected {
            assert_eq!(provider_type_for(user_type), provider_type, "{user_type}");
        }
    }

    #[test]
    fn logs_each_failed_database_lookup_with_the_ip_and_the_cause() {
        let (logger, lines) = capture();
        let mut opened = backend_with(
            Some(reader().city(missing)),
            Some(reader().asn(missing)),
            (true, true),
            Some(logger),
        );
        opened.backend.initialize();
        opened.backend.lookup(IP);
        let debug: Vec<Value> = lines.at("debug");
        assert_eq!(
            lines.messages("debug"),
            ["MaxMind City lookup failed", "MaxMind ASN lookup failed"]
        );
        assert!(debug.iter().all(|line| line["data"]["ip"] == IP));
    }

    #[test]
    fn leaves_the_provider_type_unset_for_a_user_type_it_does_not_map() {
        assert_eq!(provider_type_for("search_engine_spider"), None);
    }

    #[test]
    fn leaves_the_provider_type_unset_when_there_is_no_user_type_at_all() {
        let result = expect_valid(
            initialised(Some(reader().city(|| Ok(city_data(json!({}))))), None)
                .backend
                .lookup(IP),
        );
        assert_eq!(result.provider_type, None);
    }

    fn country_backend(
        city: Option<Answer<CityModel>>,
        country: Option<Answer<CountryModel>>,
        logger: Option<Logger>,
    ) -> Opened {
        let builder: ReaderBuilder = ReaderBuilder {
            city: Some(city.unwrap_or_else(|| Box::new(bad_method_call))),
            country: Some(country.unwrap_or_else(|| Box::new(|| Ok(country_data(json!({})))))),
            asn: None,
        };
        let mut opened = backend_with(Some(builder), None, (true, false), logger);
        opened.backend.initialize();
        opened
    }

    #[test]
    fn answers_from_country_when_city_rejects_the_database_type() {
        let result = expect_valid(country_backend(None, None, None).backend.lookup(IP));
        assert_eq!(result.ip.as_deref(), Some(IP));
        assert_eq!(result.country.as_deref(), Some("United States"));
        assert_eq!(result.country_code.as_deref(), Some("US"));
    }

    #[test]
    fn leaves_the_city_only_fields_unset() {
        let result = expect_valid(country_backend(None, None, None).backend.lookup(IP));
        assert_eq!(result.city, None);
        assert_eq!(result.region, None);
        assert_eq!(result.latitude, None);
        assert_eq!(result.longitude, None);
        assert_eq!(result.timezone, None);
    }

    #[test]
    fn still_reads_the_traits_the_country_record_carries() {
        let country: Answer<CountryModel> = Box::new(|| {
            Ok(country_data(
                json!({ "traits": { "isAnonymousVpn": true, "autonomousSystemNumber": 15169, "autonomousSystemOrganization": "Google LLC" } }),
            ))
        });
        let result = expect_valid(
            country_backend(None, Some(country), None)
                .backend
                .lookup(IP),
        );
        assert_eq!(result.is_vpn, Some(true));
        assert_eq!(result.asn_number, Some(JsNumber(15169.0)));
        assert_eq!(result.provider_name.as_deref(), Some("Google LLC"));
    }

    #[test]
    fn stops_calling_city_once_the_database_type_is_known() {
        let opened = country_backend(None, None, None);
        for _ in 0..3 {
            opened.backend.lookup(IP);
        }
        assert_eq!(opened.city_calls.city.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn warns_once_naming_the_database_when_it_discovers_the_mismatch() {
        let (logger, lines) = capture();
        let opened = country_backend(None, None, Some(logger));
        opened.backend.lookup(IP);
        opened.backend.lookup(IP);
        let warnings: Vec<Value> = lines.at("warn");
        assert_eq!(warnings.len(), 1);
        assert_eq!(
            warnings[0]["msg"],
            "MaxMind geo database is not a City database; falling back to country-level lookups"
        );
        assert_eq!(warnings[0]["data"]["dbPath"], CITY_DB);
    }

    #[test]
    fn reports_no_data_when_the_country_lookup_finds_nothing_either() {
        let opened = country_backend(None, Some(Box::new(missing)), None);
        assert_eq!(
            opened.backend.lookup(IP),
            failure("No MaxMind data available for IP", IP)
        );
    }

    #[test]
    fn never_calls_country_when_the_database_really_is_a_city_database() {
        let opened = initialised(
            Some(
                reader()
                    .city(|| Ok(city_data(json!({}))))
                    .country(|| Ok(country_data(json!({})))),
            ),
            None,
        );
        opened.backend.lookup(IP);
        opened.backend.lookup(IP);
        assert_eq!(opened.city_calls.country.load(Ordering::SeqCst), 0);
    }

    #[test]
    fn does_not_throw_when_the_real_database_file_is_missing() {
        let mut backend: MaxMindBackend = MaxMindBackend::new(MaxMindBackendConfig {
            city_db_path: Some("/nonexistent/prosopo-test/GeoLite2-City.mmdb".into()),
            asn_db_path: None,
            logger: None,
            open_reader: None,
        });
        backend.initialize();
        assert!(!backend.is_available());
    }

    #[test]
    fn country_code_reads_the_country_from_a_city_database() {
        let opened = initialised(Some(reader().city(|| Ok(city_data(json!({}))))), None);
        assert_eq!(opened.backend.country_code(IP).as_deref(), Some("US"));
    }

    #[test]
    fn country_code_falls_back_to_country_and_latches_the_choice() {
        let opened = country_backend(None, None, None);
        assert_eq!(opened.backend.country_code(IP).as_deref(), Some("US"));
        assert_eq!(opened.backend.country_code(IP).as_deref(), Some("US"));
        assert_eq!(opened.city_calls.city.load(Ordering::SeqCst), 1);
        assert_eq!(opened.city_calls.country.load(Ordering::SeqCst), 2);
    }

    #[test]
    fn country_code_has_no_answer_when_the_address_is_absent() {
        let opened = initialised(Some(reader().city(missing)), None);
        assert_eq!(opened.backend.country_code(IP), None);
    }

    #[test]
    fn country_code_has_no_answer_when_no_geo_database_was_opened() {
        let opened = initialised(None, Some(reader().asn(|| Ok(asn_data(15169.0)))));
        assert!(opened.backend.is_available());
        assert_eq!(opened.backend.country_code(IP), None);
    }

    #[test]
    fn country_code_does_not_read_the_asn_database() {
        let opened = initialised(
            Some(reader().city(|| Ok(city_data(json!({}))))),
            Some(reader().asn(|| Ok(asn_data(15169.0)))),
        );
        assert_eq!(opened.backend.country_code(IP).as_deref(), Some("US"));
        assert_eq!(opened.asn_calls.asn.load(Ordering::SeqCst), 0);
    }
}

mod service {
    use super::*;

    fn result(source: &str) -> IpInfoResponse {
        IpInfoResponse::Valid(Box::new(IpInfoResult {
            source: IpInfoSource::IpApi,
            ip: Some(IP.to_string()),
            country_code: Some(source.to_string()),
            is_vpn: Some(false),
            is_tor: Some(false),
            is_proxy: Some(false),
            is_datacenter: Some(false),
            is_abuser: Some(false),
            is_mobile: Some(false),
            is_satellite: Some(false),
            is_crawler: Some(false),
            ..IpInfoResult::default()
        }))
    }

    #[derive(Default)]
    struct Counters {
        initialize: AtomicUsize,
        is_available: AtomicUsize,
        lookup: AtomicUsize,
        country_code: AtomicUsize,
        looked_up: Mutex<Vec<String>>,
    }

    struct Stub {
        available: Arc<AtomicBool>,
        answer: IpInfoResponse,
        country: Option<String>,
        fail_initialize: bool,
        counters: Arc<Counters>,
    }

    fn stub(
        available: bool,
        answer: IpInfoResponse,
        country: Option<&str>,
    ) -> (Stub, Arc<Counters>) {
        let counters: Arc<Counters> = Arc::new(Counters::default());
        (
            Stub {
                available: Arc::new(AtomicBool::new(available)),
                answer,
                country: country.map(str::to_string),
                fail_initialize: false,
                counters: counters.clone(),
            },
            counters,
        )
    }

    impl LocalBackend for Stub {
        fn initialize(&mut self) -> Result<(), BackendError> {
            self.counters.initialize.fetch_add(1, Ordering::SeqCst);
            if self.fail_initialize {
                return Err("disk on fire".into());
            }
            Ok(())
        }

        fn is_available(&self) -> bool {
            self.counters.is_available.fetch_add(1, Ordering::SeqCst);
            self.available.load(Ordering::SeqCst)
        }

        fn lookup(&self, ip: &str) -> IpInfoResponse {
            self.counters.lookup.fetch_add(1, Ordering::SeqCst);
            self.counters
                .looked_up
                .lock()
                .expect("lock")
                .push(ip.to_string());
            self.answer.clone()
        }

        fn country_code(&self, _ip: &str) -> Option<String> {
            self.counters.country_code.fetch_add(1, Ordering::SeqCst);
            self.country.clone()
        }
    }

    impl RemoteBackend for Stub {
        fn is_available(&self) -> bool {
            self.counters.is_available.fetch_add(1, Ordering::SeqCst);
            self.available.load(Ordering::SeqCst)
        }

        fn lookup<'a>(&'a self, ip: &'a str) -> LookupFuture<'a> {
            self.counters.lookup.fetch_add(1, Ordering::SeqCst);
            self.counters
                .looked_up
                .lock()
                .expect("lock")
                .push(ip.to_string());
            let answer: IpInfoResponse = self.answer.clone();
            Box::pin(async move { answer })
        }
    }

    fn service(
        maxmind: Option<Stub>,
        ipapi: Option<Stub>,
        logger: Option<Logger>,
    ) -> IpInfoService {
        IpInfoService::with_backends(
            logger,
            IpInfoBackends {
                maxmind: maxmind.map(|stub| Box::new(stub) as Box<dyn LocalBackend>),
                ipapi: ipapi.map(|stub| Box::new(stub) as Box<dyn RemoteBackend>),
            },
        )
    }

    fn configured(config: IpInfoServiceConfig) -> IpInfoService {
        IpInfoService::new(config)
    }

    #[test]
    fn rejects_the_ipv4_loopback_and_private_ranges() {
        for ip in [
            "127.0.0.1",
            "127.255.255.255",
            "10.0.0.1",
            "192.168.1.1",
            "169.254.1.1",
            "0.0.0.0",
        ] {
            assert!(is_non_routable(ip), "{ip}");
        }
    }

    #[test]
    fn rejects_the_whole_172_16_12_block_and_nothing_either_side_of_it() {
        assert!(is_non_routable("172.16.0.0"));
        assert!(is_non_routable("172.31.255.255"));
        assert!(!is_non_routable("172.15.0.1"));
        assert!(!is_non_routable("172.32.0.1"));
        assert!(!is_non_routable("172.217.16.1"));
    }

    #[test]
    fn treats_a_malformed_172_address_as_routable() {
        assert!(!is_non_routable("172."));
        assert!(!is_non_routable("172.abc.0.1"));
    }

    #[test]
    fn sees_through_the_ipv4_mapped_ipv6_prefix() {
        assert!(is_non_routable("::ffff:127.0.0.1"));
        assert!(is_non_routable("::FFFF:192.168.0.1"));
        assert!(!is_non_routable("::ffff:8.8.8.8"));
    }

    #[test]
    fn rejects_the_ipv6_loopback_unspecified_ula_and_link_local_ranges() {
        for ip in [
            "::1",
            "::",
            "fc00::1",
            "fd12:3456::1",
            "FD00::1",
            "fe80::1",
            "feb0::1",
            "FE80::1",
        ] {
            assert!(is_non_routable(ip), "{ip}");
        }
    }

    #[test]
    fn accepts_public_ipv4_and_ipv6_addresses() {
        for ip in ["8.8.8.8", "1.1.1.1", "2001:4860:4860::8888", "fec0::1"] {
            assert!(!is_non_routable(ip), "{ip}");
        }
    }

    #[test]
    fn treats_an_empty_string_as_routable() {
        assert!(!is_non_routable(""));
    }

    #[test]
    fn builds_no_backends_when_nothing_is_configured() {
        assert!(!configured(IpInfoServiceConfig::default()).is_available());
    }

    #[tokio::test]
    async fn builds_maxmind_from_either_database_path_alone() {
        let city = configured(IpInfoServiceConfig {
            maxmind_city_db_path: Some("/city.mmdb".into()),
            ..IpInfoServiceConfig::default()
        });
        let asn = configured(IpInfoServiceConfig {
            maxmind_asn_db_path: Some("/asn.mmdb".into()),
            ..IpInfoServiceConfig::default()
        });
        assert_eq!(
            city.lookup(IP).await,
            failure("No IP info backend available", IP)
        );
        assert_eq!(
            asn.lookup(IP).await,
            failure("No IP info backend available", IP)
        );
    }

    #[test]
    fn builds_ipapi_when_a_url_is_configured() {
        assert!(configured(IpInfoServiceConfig {
            ipapi_url: Some("https://api.ipapi.is".to_string()),
            ..IpInfoServiceConfig::default()
        })
        .is_available());
    }

    #[test]
    fn does_not_build_ipapi_from_a_key_with_no_url() {
        assert!(!configured(IpInfoServiceConfig {
            ipapi_key: Some("secret".to_string()),
            ..IpInfoServiceConfig::default()
        })
        .is_available());
    }

    #[test]
    fn uses_injected_backends_in_place_of_configured_ones() {
        let (ipapi, counters) = stub(false, result("stub"), Some("US"));
        assert!(!service(None, Some(ipapi), None).is_available());
        assert!(counters.is_available.load(Ordering::SeqCst) > 0);
    }

    #[test]
    fn initializes_maxmind_and_leaves_ipapi_alone() {
        let (maxmind, maxmind_counters) = stub(true, result("stub"), Some("US"));
        let (ipapi, ipapi_counters) = stub(true, result("stub"), Some("US"));
        service(Some(maxmind), Some(ipapi), None)
            .initialize()
            .expect("initialises");
        assert_eq!(maxmind_counters.initialize.load(Ordering::SeqCst), 1);
        assert_eq!(ipapi_counters.initialize.load(Ordering::SeqCst), 0);
    }

    #[test]
    fn succeeds_when_there_are_no_backends_at_all() {
        assert!(configured(IpInfoServiceConfig::default())
            .initialize()
            .is_ok());
    }

    #[test]
    fn logs_the_availability_of_both_backends() {
        let (logger, lines) = capture();
        let (maxmind, _) = stub(true, result("stub"), Some("US"));
        let (ipapi, _) = stub(false, result("stub"), Some("US"));
        service(Some(maxmind), Some(ipapi), Some(logger))
            .initialize()
            .expect("initialises");
        let info: Vec<Value> = lines.at("info");
        assert_eq!(info.len(), 1);
        assert_eq!(
            info[0]["data"],
            json!({ "maxmindAvailable": true, "ipapiAvailable": false })
        );
    }

    #[test]
    fn propagates_a_maxmind_initialize_failure() {
        let (mut maxmind, _) = stub(true, result("stub"), Some("US"));
        maxmind.fail_initialize = true;
        let error = service(Some(maxmind), None, None)
            .initialize()
            .expect_err("fails");
        assert_eq!(error.to_string(), "disk on fire");
    }

    #[test]
    fn is_available_when_either_backend_is() {
        for (maxmind_up, ipapi_up, expected) in [
            (true, true, true),
            (true, false, true),
            (false, true, true),
            (false, false, false),
        ] {
            let (maxmind, _) = stub(maxmind_up, result("stub"), Some("US"));
            let (ipapi, _) = stub(ipapi_up, result("stub"), Some("US"));
            assert_eq!(
                service(Some(maxmind), Some(ipapi), None).is_available(),
                expected
            );
        }
    }

    #[tokio::test]
    async fn short_circuits_a_non_routable_ip_without_touching_a_backend() {
        let (maxmind, maxmind_counters) = stub(true, result("maxmind"), Some("US"));
        let (ipapi, ipapi_counters) = stub(true, result("ipapi"), Some("US"));
        assert_eq!(
            service(Some(maxmind), Some(ipapi), None)
                .lookup("127.0.0.1")
                .await,
            failure("Non-routable IP address", "127.0.0.1")
        );
        assert_eq!(ipapi_counters.lookup.load(Ordering::SeqCst), 0);
        assert_eq!(maxmind_counters.lookup.load(Ordering::SeqCst), 0);
    }

    #[tokio::test]
    async fn prefers_ipapi_when_both_are_available() {
        let (maxmind, maxmind_counters) = stub(true, result("maxmind"), Some("US"));
        let (ipapi, _) = stub(true, result("ipapi"), Some("US"));
        assert_eq!(
            service(Some(maxmind), Some(ipapi), None).lookup(IP).await,
            result("ipapi")
        );
        assert_eq!(maxmind_counters.lookup.load(Ordering::SeqCst), 0);
    }

    #[tokio::test]
    async fn falls_back_to_maxmind_when_ipapi_returns_an_invalid_result() {
        let (maxmind, _) = stub(true, result("maxmind"), Some("US"));
        let (ipapi, _) = stub(true, failure("upstream 503", IP), Some("US"));
        assert_eq!(
            service(Some(maxmind), Some(ipapi), None).lookup(IP).await,
            result("maxmind")
        );
    }

    #[tokio::test]
    async fn returns_the_ipapi_error_when_maxmind_cannot_cover_for_it() {
        let (maxmind, _) = stub(false, result("maxmind"), Some("US"));
        let (ipapi, _) = stub(true, failure("upstream 503", IP), Some("US"));
        assert_eq!(
            service(Some(maxmind), Some(ipapi), None).lookup(IP).await,
            failure("upstream 503", IP)
        );
    }

    #[tokio::test]
    async fn returns_the_ipapi_error_when_maxmind_is_not_configured_at_all() {
        let (ipapi, _) = stub(true, failure("upstream 503", IP), Some("US"));
        assert_eq!(
            service(None, Some(ipapi), None).lookup(IP).await,
            failure("upstream 503", IP)
        );
    }

    #[tokio::test]
    async fn logs_the_fallback_with_the_upstream_error_attached() {
        let (logger, lines) = capture();
        let (maxmind, _) = stub(true, result("maxmind"), Some("US"));
        let (ipapi, _) = stub(true, failure("upstream 503", IP), Some("US"));
        service(Some(maxmind), Some(ipapi), Some(logger))
            .lookup(IP)
            .await;
        let debug: Vec<Value> = lines.at("debug");
        assert_eq!(debug.len(), 1);
        assert_eq!(
            debug[0]["data"],
            json!({ "ip": IP, "error": "upstream 503" })
        );
    }

    #[tokio::test]
    async fn does_not_log_a_fallback_when_ipapi_succeeds() {
        let (logger, lines) = capture();
        let (maxmind, _) = stub(true, result("maxmind"), Some("US"));
        let (ipapi, _) = stub(true, result("ipapi"), Some("US"));
        service(Some(maxmind), Some(ipapi), Some(logger))
            .lookup(IP)
            .await;
        assert!(lines.at("debug").is_empty());
    }

    #[tokio::test]
    async fn uses_maxmind_alone_when_ipapi_is_unavailable() {
        let (maxmind, _) = stub(true, result("maxmind"), Some("US"));
        let (ipapi, ipapi_counters) = stub(false, result("ipapi"), Some("US"));
        assert_eq!(
            service(Some(maxmind), Some(ipapi), None).lookup(IP).await,
            result("maxmind")
        );
        assert_eq!(ipapi_counters.lookup.load(Ordering::SeqCst), 0);
    }

    #[tokio::test]
    async fn reports_that_no_backend_is_available_when_neither_is() {
        let (maxmind, _) = stub(false, result("maxmind"), Some("US"));
        let (ipapi, _) = stub(false, result("ipapi"), Some("US"));
        assert_eq!(
            service(Some(maxmind), Some(ipapi), None).lookup(IP).await,
            failure("No IP info backend available", IP)
        );
    }

    #[tokio::test]
    async fn reports_that_no_backend_is_available_when_none_is_configured() {
        assert_eq!(
            configured(IpInfoServiceConfig::default()).lookup(IP).await,
            failure("No IP info backend available", IP)
        );
    }

    #[tokio::test]
    async fn passes_the_ip_through_to_the_backend_unmodified() {
        let (ipapi, counters) = stub(true, result("ipapi"), Some("US"));
        service(None, Some(ipapi), None)
            .lookup("2001:4860:4860::8888")
            .await;
        assert_eq!(
            *counters.looked_up.lock().expect("lock"),
            ["2001:4860:4860::8888"]
        );
    }

    #[tokio::test]
    async fn re_checks_availability_on_every_lookup() {
        let (ipapi, _) = stub(false, result("recovered"), None);
        let up: Arc<AtomicBool> = ipapi.available.clone();
        let service = service(None, Some(ipapi), None);
        assert_eq!(
            service.lookup(IP).await,
            failure("No IP info backend available", IP)
        );
        up.store(true, Ordering::SeqCst);
        assert_eq!(service.lookup(IP).await, result("recovered"));
    }

    #[test]
    fn country_answers_from_maxmind() {
        let (maxmind, _) = stub(true, result("maxmind"), Some("GB"));
        assert_eq!(
            service(Some(maxmind), None, None).country(IP).as_deref(),
            Some("GB")
        );
    }

    #[test]
    fn country_never_consults_ipapi() {
        let (ipapi, ipapi_counters) = stub(true, result("ipapi"), Some("US"));
        let (maxmind, _) = stub(true, result("maxmind"), Some("FR"));
        assert_eq!(
            service(Some(maxmind), Some(ipapi), None)
                .country(IP)
                .as_deref(),
            Some("FR")
        );
        assert_eq!(ipapi_counters.lookup.load(Ordering::SeqCst), 0);
        assert_eq!(ipapi_counters.is_available.load(Ordering::SeqCst), 0);
    }

    #[test]
    fn country_has_no_answer_for_a_loopback_caller_without_reading_the_database() {
        let (maxmind, counters) = stub(true, result("maxmind"), Some("US"));
        let service = service(Some(maxmind), None, None);
        for ip in ["127.0.0.1", "::1", "10.1.2.3"] {
            assert_eq!(service.country(ip), None, "{ip}");
        }
        assert_eq!(counters.country_code.load(Ordering::SeqCst), 0);
    }

    #[test]
    fn country_has_no_answer_when_no_maxmind_backend_is_configured() {
        let (ipapi, _) = stub(true, result("ipapi"), Some("US"));
        assert_eq!(service(None, Some(ipapi), None).country(IP), None);
    }

    #[test]
    fn country_has_no_answer_while_maxmind_is_still_unavailable() {
        let (maxmind, counters) = stub(false, result("maxmind"), Some("DE"));
        assert_eq!(service(Some(maxmind), None, None).country(IP), None);
        assert_eq!(counters.country_code.load(Ordering::SeqCst), 0);
    }

    #[test]
    fn country_has_no_answer_when_the_address_is_absent_from_the_database() {
        let (maxmind, _) = stub(true, result("maxmind"), None);
        assert_eq!(service(Some(maxmind), None, None).country(IP), None);
    }
}
