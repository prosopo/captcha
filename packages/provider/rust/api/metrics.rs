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

//! metrics.ts: the provider's Prometheus metrics, written as prom-client 15 writes them, who
//! may scrape them, and the request counter.
//!
//! prom-client's default metrics are the Node process's. The `process_*` ones are read here
//! from `/proc` under the same names; the `nodejs_*` ones (event loop, heap, handles, GC)
//! describe a runtime this process does not have and are not written.

use crate::api::express::{header, send, socket_address, Requested};
use crate::api::healthz_geo::HealthzGeoOutcome;
use crate::api::public::RedisStatuses;
use axum::body::Body;
use axum::extract::Request;
use axum::response::Response;
use http::header::{HeaderValue, CONTENT_TYPE};
use http::{HeaderMap, Method, StatusCode};
use indexmap::IndexMap;
use prosopo_types::provider_api::{AdminApiPaths, ClientApiPaths, PublicApiPaths};
use prosopo_types::CaptchaType;
use prosopo_util::number_to_string;
use std::net::{Ipv4Addr, Ipv6Addr, SocketAddr};
use std::sync::Mutex;
use std::time::Instant;

pub const CONTENT_TYPE_PROMETHEUS: &str = "text/plain; version=0.0.4; charset=utf-8";

const LATENCY_BUCKETS: [f64; 11] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0];
const SCORE_BUCKETS: [f64; 16] = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0];
const SPAN_BUCKETS: [f64; 13] = [0.0001, 0.00025, 0.0005, 0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0];

/// `metricsEnabled`: on unless `PROSOPO_METRICS_ENABLED=false`.
pub fn metrics_enabled(env: &dyn Fn(&str) -> Option<String>) -> bool {
    env("PROSOPO_METRICS_ENABLED").as_deref() != Some("false")
}

/// `getValueAsString`.
fn value_text(value: f64) -> String {
    if value.is_nan() {
        "Nan".to_string()
    } else if value.is_infinite() {
        if value < 0.0 { "-Inf" } else { "+Inf" }.to_string()
    } else {
        number_to_string(value)
    }
}

fn escape(text: &str) -> String {
    text.replace('\\', "\\\\").replace('\n', "\\n")
}

fn label_text(labels: &[(String, String)]) -> String {
    labels.iter().map(|(name, value)| format!("{name}=\"{}\"", escape(value).replace('"', "\\\""))).collect::<Vec<String>>().join(",")
}

#[derive(Debug, Clone, Copy, PartialEq)]
enum Kind {
    Counter,
    Gauge,
    Histogram(&'static [f64]),
}

#[derive(Debug, Clone)]
struct Series {
    /// The labels as the first recording gave them, in that order.
    labels: Vec<(String, String)>,
    value: f64,
    buckets: Vec<f64>,
    sum: f64,
    count: f64,
}

impl Series {
    fn new(labels: Vec<(String, String)>, kind: Kind) -> Series {
        let buckets: usize = match kind {
            Kind::Histogram(bounds) => bounds.len(),
            _ => 0,
        };
        Series {
            labels,
            value: 0.0,
            buckets: vec![0.0; buckets],
            sum: 0.0,
            count: 0.0,
        }
    }
}

#[derive(Debug, Clone)]
struct Metric {
    name: &'static str,
    help: &'static str,
    kind: Kind,
    /// Keyed by the labels sorted by name, in the order series were first recorded.
    series: IndexMap<Vec<(String, String)>, Series>,
}

impl Metric {
    fn new(name: &'static str, help: &'static str, kind: Kind, labelled: bool) -> Metric {
        let mut series: IndexMap<Vec<(String, String)>, Series> = IndexMap::new();
        if !labelled {
            series.insert(Vec::new(), Series::new(Vec::new(), kind));
        }
        Metric { name, help, kind, series }
    }

    fn series(&mut self, labels: &[(&str, &str)]) -> &mut Series {
        let ordered: Vec<(String, String)> = labels.iter().map(|(name, value)| (name.to_string(), value.to_string())).collect();
        let mut key: Vec<(String, String)> = ordered.clone();
        key.sort();
        let kind: Kind = self.kind;
        self.series.entry(key).or_insert_with(|| Series::new(ordered, kind))
    }

    fn inc(&mut self, labels: &[(&str, &str)], by: f64) {
        self.series(labels).value += by;
    }

    fn set(&mut self, labels: &[(&str, &str)], value: f64) {
        self.series(labels).value = value;
    }

    fn observe(&mut self, labels: &[(&str, &str)], value: f64) {
        let Kind::Histogram(bounds) = self.kind else {
            return;
        };
        let series: &mut Series = self.series(labels);
        if let Some(bucket) = bounds.iter().position(|bound| value <= *bound) {
            series.buckets[bucket] += 1.0;
        }
        series.sum += value;
        series.count += 1.0;
    }

    fn render(&self) -> String {
        let mut lines: Vec<String> = vec![
            format!("# HELP {} {}", escape(self.name), escape(self.help)),
            format!(
                "# TYPE {} {}",
                escape(self.name),
                match self.kind {
                    Kind::Counter => "counter",
                    Kind::Gauge => "gauge",
                    Kind::Histogram(_) => "histogram",
                }
            ),
        ];
        let braced = |parts: Vec<String>| {
            let parts: Vec<String> = parts.into_iter().filter(|part| !part.is_empty()).collect();
            if parts.is_empty() { String::new() } else { format!("{{{}}}", parts.join(",")) }
        };
        for series in self.series.values() {
            let labels: String = label_text(&series.labels);
            match self.kind {
                Kind::Histogram(bounds) => {
                    let mut cumulative: f64 = 0.0;
                    for (bound, count) in bounds.iter().zip(&series.buckets) {
                        cumulative += count;
                        let le: String = format!("le=\"{}\"", number_to_string(*bound));
                        lines.push(format!("{}_bucket{} {}", self.name, braced(vec![le, labels.clone()]), value_text(cumulative)));
                    }
                    lines.push(format!("{}_bucket{} {}", self.name, braced(vec!["le=\"+Inf\"".to_string(), labels.clone()]), value_text(series.count)));
                    lines.push(format!("{}_sum{} {}", self.name, braced(vec![labels.clone()]), value_text(series.sum)));
                    lines.push(format!("{}_count{} {}", self.name, braced(vec![labels.clone()]), value_text(series.count)));
                }
                _ => lines.push(format!("{}{} {}", self.name, braced(vec![labels]), value_text(series.value))),
            }
        }
        lines.join("\n")
    }
}

/// What the process metrics read: where `/proc/self` is, and when the process started.
pub struct ProcessSource {
    pub proc_self: std::path::PathBuf,
    pub start_time_seconds: f64,
}

impl ProcessSource {
    pub fn current() -> ProcessSource {
        let now: f64 = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_or(0.0, |elapsed| elapsed.as_secs_f64());
        ProcessSource {
            proc_self: std::path::PathBuf::from("/proc/self"),
            start_time_seconds: now.round(),
        }
    }

    fn status_bytes(status: &str, field: &str) -> Option<f64> {
        let line: &str = status.lines().find(|line| line.starts_with(field))?;
        let kilobytes: f64 = line[field.len()..].trim_start_matches(':').split_whitespace().next()?.parse().ok()?;
        Some(kilobytes * 1024.0)
    }

    /// The `process_*` series prom-client's default metrics write, read now.
    fn metrics(&self) -> Vec<Metric> {
        let mut out: Vec<Metric> = Vec::new();
        let mut gauge = |name: &'static str, help: &'static str, kind: Kind, value: Option<f64>| {
            let mut metric: Metric = Metric::new(name, help, kind, true);
            if let Some(value) = value {
                metric.set(&[], value);
            }
            out.push(metric);
        };
        let stat: String = std::fs::read_to_string(self.proc_self.join("stat")).unwrap_or_default();
        let fields: Vec<&str> = stat.rsplit_once(") ").map(|(_, rest)| rest.split_whitespace().collect()).unwrap_or_default();
        let ticks = |index: usize| fields.get(index).and_then(|field| field.parse::<f64>().ok()).map(|ticks| ticks / 100.0);
        let (user, system) = (ticks(11), ticks(12));
        gauge("prosopo_process_cpu_user_seconds_total", "Total user CPU time spent in seconds.", Kind::Counter, user);
        gauge("prosopo_process_cpu_system_seconds_total", "Total system CPU time spent in seconds.", Kind::Counter, system);
        gauge("prosopo_process_cpu_seconds_total", "Total user and system CPU time spent in seconds.", Kind::Counter, user.zip(system).map(|(u, s)| u + s));
        gauge("prosopo_process_start_time_seconds", "Start time of the process since unix epoch in seconds.", Kind::Gauge, Some(self.start_time_seconds));
        let status: String = std::fs::read_to_string(self.proc_self.join("status")).unwrap_or_default();
        gauge("prosopo_process_resident_memory_bytes", "Resident memory size in bytes.", Kind::Gauge, Self::status_bytes(&status, "VmRSS"));
        gauge("prosopo_process_virtual_memory_bytes", "Virtual memory size in bytes.", Kind::Gauge, Self::status_bytes(&status, "VmSize"));
        gauge("prosopo_process_heap_bytes", "Process heap size in bytes.", Kind::Gauge, Self::status_bytes(&status, "VmData"));
        let open: Option<f64> = std::fs::read_dir(self.proc_self.join("fd")).ok().map(|entries| entries.count() as f64 - 1.0);
        gauge("prosopo_process_open_fds", "Number of open file descriptors.", Kind::Gauge, open);
        let limits: String = std::fs::read_to_string(self.proc_self.join("limits")).unwrap_or_default();
        let max: Option<f64> = limits
            .lines()
            .find(|line| line.starts_with("Max open files"))
            .and_then(|line| line.split("  ").filter(|part| !part.is_empty()).nth(1))
            .and_then(|soft| soft.trim().parse().ok());
        gauge("prosopo_process_max_fds", "Maximum number of open file descriptors.", Kind::Gauge, max);
        out
    }
}

/// The provider's own metrics, in the order metrics.ts registers them.
pub struct ProviderMetrics {
    metrics: Mutex<Vec<Metric>>,
    process: ProcessSource,
}

const HTTP_REQUESTS: usize = 0;
const HTTP_DURATION: usize = 1;
const CAPTCHA_ISSUED: usize = 2;
const CAPTCHA_ISSUE_ERRORS: usize = 3;
const CAPTCHA_VERIFY: usize = 4;
const FRICTIONLESS_ROUTED: usize = 5;
const BOT_SCORE: usize = 6;
const DETECTOR_TRIGGERED: usize = 7;
const BLOCKED_REQUESTS: usize = 8;
const DOMAIN_VALIDATION: usize = 9;
const SPAM_EMAIL: usize = 10;
const MAINTENANCE_MODE: usize = 11;
const REDIS_READY: usize = 12;
const HEALTHZ_GEO_OUTCOMES: usize = 13;
const DECODER_DURATION: usize = 14;
const DECODER_CALLS: usize = 15;
const SYNC_SPAN_WALL_SECONDS: usize = 16;
const SYNC_SPAN_CALLS: usize = 17;
const SYNC_SPAN_DURATION: usize = 18;

/// A named block of synchronous work `measure_sync` times.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SyncSpan {
    PuzzleBackground,
    PuzzleRender,
    MerkleBuild,
    DecisionMachineDecide,
}

impl SyncSpan {
    pub fn as_str(self) -> &'static str {
        match self {
            SyncSpan::PuzzleBackground => "puzzle_background",
            SyncSpan::PuzzleRender => "puzzle_render",
            SyncSpan::MerkleBuild => "merkle_build",
            SyncSpan::DecisionMachineDecide => "decision_machine_decide",
        }
    }
}

/// Where a verification's answer came from.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VerifySource {
    Real,
    TestKey,
    Maintenance,
    Cached,
}

impl VerifySource {
    pub fn as_str(self) -> &'static str {
        match self {
            VerifySource::Real => "real",
            VerifySource::TestKey => "test_key",
            VerifySource::Maintenance => "maintenance",
            VerifySource::Cached => "cached",
        }
    }
}

impl ProviderMetrics {
    /// `buildMetrics`, with the maintenance gauge seeded from `MAINTENANCE_MODE`.
    pub fn new(maintenance_mode: Option<&str>, process: ProcessSource) -> ProviderMetrics {
        let mut metrics: Vec<Metric> = vec![
            Metric::new("prosopo_http_requests_total", "Total HTTP requests handled by the provider API", Kind::Counter, true),
            Metric::new("prosopo_http_request_duration_seconds", "Provider API request duration in seconds", Kind::Histogram(&LATENCY_BUCKETS), true),
            Metric::new("prosopo_captcha_issued_total", "Captcha challenges issued, by type", Kind::Counter, true),
            Metric::new("prosopo_captcha_issue_errors_total", "Errors while issuing captcha challenges, by type", Kind::Counter, true),
            Metric::new("prosopo_captcha_verify_total", "Captcha verification outcomes, by type/result/source", Kind::Counter, true),
            Metric::new("prosopo_frictionless_routed_total", "Frictionless routing decisions (which captcha the user was sent to)", Kind::Counter, true),
            Metric::new(
                "prosopo_bot_score",
                "Distribution of frictionless bot scores (0=human .. 1=bot; language-rule penalties can push it above 1)",
                Kind::Histogram(&SCORE_BUCKETS),
                false,
            ),
            Metric::new("prosopo_detector_triggered_total", "Count of times each bot detector was triggered", Kind::Counter, true),
            Metric::new("prosopo_blocked_requests_total", "Requests blocked before reaching a captcha handler, by reason", Kind::Counter, true),
            Metric::new("prosopo_domain_validation_total", "Domain/site-key validation outcomes", Kind::Counter, true),
            Metric::new("prosopo_spam_email_total", "Spam email-domain check outcomes", Kind::Counter, true),
            Metric::new("prosopo_maintenance_mode", "1 when the provider is in maintenance mode, else 0", Kind::Gauge, false),
            Metric::new("prosopo_redis_ready", "1 when the given redis connection is ready, else 0", Kind::Gauge, true),
            Metric::new(
                "prosopo_healthz_geo_outcomes_total",
                "Healthz geo steering outcomes (steered/not_steered/target_down/geo_unavailable)",
                Kind::Counter,
                true,
            ),
            Metric::new(
                "prosopo_decoder_duration_seconds",
                "End-to-end duration of a detector payload decode, worker round trip included",
                Kind::Histogram(&SPAN_BUCKETS),
                true,
            ),
            Metric::new("prosopo_decoder_calls_total", "Detector payload decodes by decoder and outcome", Kind::Counter, true),
            Metric::new("prosopo_sync_span_wall_seconds_total", "Seconds the event loop was held by named blocks of synchronous work", Kind::Counter, true),
            Metric::new("prosopo_sync_span_calls_total", "Calls into each named block of synchronous work, successful or not", Kind::Counter, true),
            Metric::new("prosopo_sync_span_duration_seconds", "Duration of each named block of synchronous work", Kind::Histogram(&SPAN_BUCKETS), true),
        ];
        let on: bool = maintenance_mode.is_some_and(|value| value.to_lowercase() == "true");
        metrics[MAINTENANCE_MODE].set(&[], if on { 1.0 } else { 0.0 });
        ProviderMetrics {
            metrics: Mutex::new(metrics),
            process,
        }
    }

    fn with(&self, update: impl FnOnce(&mut Vec<Metric>)) {
        if let Ok(mut metrics) = self.metrics.lock() {
            update(&mut metrics);
        }
    }

    pub fn record_captcha_issued(&self, captcha_type: CaptchaType) {
        self.with(|m| m[CAPTCHA_ISSUED].inc(&[("type", captcha_type.as_str())], 1.0));
    }

    pub fn record_captcha_issue_error(&self, captcha_type: CaptchaType) {
        self.with(|m| m[CAPTCHA_ISSUE_ERRORS].inc(&[("type", captcha_type.as_str())], 1.0));
    }

    pub fn record_captcha_verify(&self, captcha_type: CaptchaType, verified: bool, source: VerifySource) {
        let result: &str = if verified { "verified" } else { "failed" };
        self.with(|m| m[CAPTCHA_VERIFY].inc(&[("type", captcha_type.as_str()), ("result", result), ("source", source.as_str())], 1.0));
    }

    pub fn record_frictionless_decision(&self, decision: &str) {
        self.with(|m| m[FRICTIONLESS_ROUTED].inc(&[("decision", decision)], 1.0));
    }

    pub fn record_bot_score(&self, score: f64) {
        self.with(|m| m[BOT_SCORE].observe(&[], score));
    }

    /// `recordDetectorTriggered`, each detector named as `String(detector)` names it.
    pub fn record_detector_triggered(&self, detectors: &[String]) {
        self.with(|m| {
            for detector in detectors {
                m[DETECTOR_TRIGGERED].inc(&[("detector", detector)], 1.0);
            }
        });
    }

    pub fn record_blocked_request(&self, reason: &str) {
        self.with(|m| m[BLOCKED_REQUESTS].inc(&[("reason", reason)], 1.0));
    }

    pub fn record_domain_validation(&self, result: &str) {
        self.with(|m| m[DOMAIN_VALIDATION].inc(&[("result", result)], 1.0));
    }

    pub fn record_spam_email(&self, result: &str) {
        self.with(|m| m[SPAM_EMAIL].inc(&[("result", result)], 1.0));
    }

    pub fn record_healthz_geo_outcome(&self, outcome: HealthzGeoOutcome) {
        self.with(|m| m[HEALTHZ_GEO_OUTCOMES].inc(&[("outcome", outcome.as_str())], 1.0));
    }

    pub fn set_maintenance_mode(&self, on: bool) {
        self.with(|m| m[MAINTENANCE_MODE].set(&[], if on { 1.0 } else { 0.0 }));
    }

    pub fn record_decoder_outcome(&self, decoder: &str, ok: bool, seconds: f64) {
        let outcome: &str = if ok { "ok" } else { "error" };
        self.with(|m| {
            m[DECODER_CALLS].inc(&[("decoder", decoder), ("outcome", outcome)], 1.0);
            m[DECODER_DURATION].observe(&[("decoder", decoder)], seconds);
        });
    }

    /// What `measureSync` records for a span that took `seconds`.
    pub fn record_sync_span(&self, span: SyncSpan, seconds: f64) {
        self.with(|m| {
            m[SYNC_SPAN_CALLS].inc(&[("span", span.as_str())], 1.0);
            m[SYNC_SPAN_WALL_SECONDS].inc(&[("span", span.as_str())], seconds);
            m[SYNC_SPAN_DURATION].observe(&[("span", span.as_str())], seconds);
        });
    }

    /// `measureSync`: times `work` and records it, whatever it returns.
    pub fn measure_sync<T>(&self, span: SyncSpan, work: impl FnOnce() -> T) -> T {
        let started: Instant = Instant::now();
        let result: T = work();
        self.record_sync_span(span, started.elapsed().as_secs_f64());
        result
    }

    /// What `metricsMiddleware` records for one finished request.
    pub fn record_request(&self, route: &str, method: &str, status: u16, seconds: f64) {
        let status: String = status.to_string();
        let labels: [(&str, &str); 3] = [("route", route), ("method", method), ("status", &status)];
        self.with(|m| {
            m[HTTP_REQUESTS].inc(&labels, 1.0);
            m[HTTP_DURATION].observe(&labels, seconds);
        });
    }

    pub fn set_redis_ready(&self, general: bool, uap: bool) {
        self.with(|m| {
            m[REDIS_READY].set(&[("actor", "general")], if general { 1.0 } else { 0.0 });
            m[REDIS_READY].set(&[("actor", "uap")], if uap { 1.0 } else { 0.0 });
        });
    }

    /// The provider's own metrics as `registry.metrics()` writes them, without the process's.
    pub fn render_own(&self) -> String {
        let metrics = self.metrics.lock().map(|metrics| metrics.clone()).unwrap_or_default();
        format!("{}\n", metrics.iter().map(Metric::render).collect::<Vec<String>>().join("\n\n"))
    }

    /// `registry.metrics()`: the process metrics, then the provider's.
    pub fn render(&self) -> String {
        let mut metrics: Vec<Metric> = self.process.metrics();
        metrics.extend(self.metrics.lock().map(|metrics| metrics.clone()).unwrap_or_default());
        format!("{}\n", metrics.iter().map(Metric::render).collect::<Vec<String>>().join("\n\n"))
    }
}

/// The paths the request counter names; anything else is `other`.
pub fn normalise_route(path: &str) -> &str {
    let known: bool = ClientApiPaths::ALL.iter().any(|route| route.as_str() == path)
        || PublicApiPaths::ALL.iter().any(|route| route.as_str() == path)
        || AdminApiPaths::ALL.iter().any(|route| route.as_str() == path);
    if known {
        path
    } else {
        "other"
    }
}

fn is_internal(address: Option<&str>) -> bool {
    let Some(address) = address.filter(|address| !address.is_empty()) else {
        return false;
    };
    let v4: &str = address.strip_prefix("::ffff:").unwrap_or(address);
    if let Ok(ip) = v4.parse::<Ipv4Addr>() {
        let [a, b, ..] = ip.octets();
        return a == 127 || a == 10 || (a == 172 && (16..32).contains(&b)) || (a == 192 && b == 168);
    }
    if let Ok(ip) = address.parse::<Ipv6Addr>() {
        let first: u16 = ip.segments()[0];
        return ip == Ipv6Addr::LOCALHOST || (first & 0xfe00) == 0xfc00 || (first & 0xffc0) == 0xfe80;
    }
    false
}

/// `metricsAccess`: 200, 401 or 403.
pub fn metrics_access(env: &dyn Fn(&str) -> Option<String>, headers: &HeaderMap, remote_address: Option<&str>) -> u16 {
    if let Some(token) = env("PROSOPO_METRICS_TOKEN").filter(|token| !token.is_empty()) {
        let expected: String = format!("Bearer {token}");
        let actual: String = header(headers, "authorization").unwrap_or_default();
        let matches: bool = actual.len() == expected.len() && constant_time_eq(actual.as_bytes(), expected.as_bytes());
        return if matches { 200 } else { 401 };
    }
    if env("PROSOPO_METRICS_PUBLIC").as_deref() == Some("true") {
        return 200;
    }
    let proxied: bool = ["x-forwarded-for", "forwarded", "x-real-ip"].iter().any(|name| headers.contains_key(*name));
    if !proxied && is_internal(remote_address) {
        200
    } else {
        403
    }
}

fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    a.len() == b.len() && a.iter().zip(b).fold(0u8, |differ, (x, y)| differ | (x ^ y)) == 0
}

/// `metricsHandler`: the exposition for those `metricsAccess` lets in, with the Redis
/// readiness gauges read at scrape time.
pub fn metrics_response(
    metrics: &ProviderMetrics,
    redis: &dyn RedisStatuses,
    env: &dyn Fn(&str) -> Option<String>,
    remote: &SocketAddr,
    request: &Request,
) -> Response {
    let requested: Requested = Requested::of(request);
    let address: String = socket_address(remote);
    let access: u16 = metrics_access(env, request.headers(), Some(&address));
    if access != 200 {
        let (status, text) = if access == 401 { (StatusCode::UNAUTHORIZED, "Unauthorized") } else { (StatusCode::FORBIDDEN, "Forbidden") };
        let headers = vec![(CONTENT_TYPE, HeaderValue::from_static("text/html; charset=utf-8"))];
        return send(&requested, status, headers, text.as_bytes().to_vec());
    }
    match redis.redis_statuses() {
        Ok([(general, _), (uap, _)]) => metrics.set_redis_ready(general, uap),
        Err(_) => metrics.set_redis_ready(false, false),
    }
    let text: String = metrics.render();
    let mut response: Response = Response::new(Body::empty());
    response.headers_mut().insert(CONTENT_TYPE, HeaderValue::from_static(CONTENT_TYPE_PROMETHEUS));
    if request.method() != Method::HEAD {
        response.headers_mut().insert(http::header::CONTENT_LENGTH, HeaderValue::from(text.len()));
        *response.body_mut() = Body::from(text);
    }
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_known_routes_only() {
        assert_eq!(normalise_route("/healthz"), "/healthz");
        assert_eq!(normalise_route("/v1/prosopo/provider/client/captcha/pow"), "/v1/prosopo/provider/client/captcha/pow");
        assert_eq!(normalise_route("/v1/prosopo/provider/client/captcha/pow/"), "other");
        assert_eq!(normalise_route("/nowhere"), "other");
    }
}
