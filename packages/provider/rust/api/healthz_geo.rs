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

//! healthzGeo.ts: `/healthz` answering with the node mapped to the caller's country, when
//! that node answers its own health check. Off unless `PROSOPO_HEALTHZ_GEO_STEERING=true`
//! with a non-empty `PROSOPO_HEALTHZ_GEO_ROUTES`; a map that does not parse leaves it off.

use indexmap::IndexMap;
use prosopo_ipinfo::IpInfoService;
use prosopo_logger::{LogRecord, Logger};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;
use std::sync::{Arc, RwLock};
use std::time::Duration;
use tokio::task::JoinHandle;

const DEFAULT_PROBE_INTERVAL_MS: f64 = 30_000.0;
const DEFAULT_PROBE_TIMEOUT_MS: f64 = 2_000.0;
const MIN_PROBE_INTERVAL_MS: f64 = 1_000.0;

#[derive(Debug, Clone, PartialEq)]
pub struct HealthzGeoConfig {
    pub enabled: bool,
    /// Upper-cased country code to hostname, in the map's order.
    pub routes: IndexMap<String, String>,
    pub probe_interval_ms: f64,
    pub probe_timeout_ms: f64,
}

/// Why a `/healthz` call was or was not steered, for the metrics.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HealthzGeoOutcome {
    Steered,
    NotSteered,
    TargetDown,
    GeoUnavailable,
}

impl HealthzGeoOutcome {
    pub fn as_str(self) -> &'static str {
        match self {
            HealthzGeoOutcome::Steered => "steered",
            HealthzGeoOutcome::NotSteered => "not_steered",
            HealthzGeoOutcome::TargetDown => "target_down",
            HealthzGeoOutcome::GeoUnavailable => "geo_unavailable",
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct HealthzGeoDecision {
    pub host: Option<String>,
    pub outcome: HealthzGeoOutcome,
}

/// `parsePositiveInt`.
fn positive_int(raw: Option<&str>, fallback: f64) -> f64 {
    let Some(raw) = raw else {
        return fallback;
    };
    let parsed: f64 = prosopo_util::parse_int(raw, 10);
    if parsed.is_finite() && parsed > 0.0 {
        parsed
    } else {
        fallback
    }
}

/// The hostname pattern: dot-separated labels of letters, digits and inner hyphens.
fn is_hostname(text: &str) -> bool {
    let label = |label: &str| {
        let bytes: &[u8] = label.as_bytes();
        !bytes.is_empty()
            && bytes[0].is_ascii_alphanumeric()
            && bytes[bytes.len() - 1].is_ascii_alphanumeric()
            && bytes.iter().all(|byte| byte.is_ascii_alphanumeric() || *byte == b'-')
    };
    (1..=253).contains(&text.encode_utf16().count()) && text.split('.').all(label)
}

/// `routesSchema.parse(JSON.parse(raw))`, upper-casing the countries.
fn routes(raw: &str) -> Option<IndexMap<String, String>> {
    let parsed: Value = serde_json::from_str(raw).ok()?;
    let mut routes: IndexMap<String, String> = IndexMap::new();
    for (country, host) in parsed.as_object()? {
        let host: &str = host.as_str().filter(|host| is_hostname(host))?;
        if country.len() != 2 || !country.bytes().all(|byte| byte.is_ascii_alphabetic()) {
            return None;
        }
        routes.insert(country.to_ascii_uppercase(), host.to_string());
    }
    Some(routes)
}

/// `readHealthzGeoConfig`.
pub fn read_healthz_geo_config(env: &dyn Fn(&str) -> Option<String>, logger: Option<&Logger>) -> HealthzGeoConfig {
    let raw: Option<String> = env("PROSOPO_HEALTHZ_GEO_ROUTES");
    let routes: IndexMap<String, String> = match raw.as_deref().filter(|raw| !raw.trim().is_empty()) {
        None => IndexMap::new(),
        Some(raw) => routes(raw).unwrap_or_else(|| {
            if let Some(logger) = logger {
                logger.warn(|| LogRecord::msg("PROSOPO_HEALTHZ_GEO_ROUTES is not a valid country->host map; healthz geo steering stays off"));
            }
            IndexMap::new()
        }),
    };
    HealthzGeoConfig {
        enabled: env("PROSOPO_HEALTHZ_GEO_STEERING").as_deref() == Some("true") && !routes.is_empty(),
        routes,
        probe_interval_ms: MIN_PROBE_INTERVAL_MS.max(positive_int(env("PROSOPO_HEALTHZ_GEO_PROBE_INTERVAL_MS").as_deref(), DEFAULT_PROBE_INTERVAL_MS)),
        probe_timeout_ms: positive_int(env("PROSOPO_HEALTHZ_GEO_PROBE_TIMEOUT_MS").as_deref(), DEFAULT_PROBE_TIMEOUT_MS),
    }
}

/// Whether a host answered its own `/healthz` within the timeout.
pub type HealthzProbe = Arc<dyn Fn(String, Duration) -> Pin<Box<dyn Future<Output = bool> + Send>> + Send + Sync>;

/// `fetchHealthzProbe`: a GET of `https://<host>/healthz` with a 2xx answer.
pub fn fetch_healthz_probe() -> HealthzProbe {
    let client: reqwest::Client = reqwest::Client::new();
    Arc::new(move |host: String, timeout: Duration| {
        let client: reqwest::Client = client.clone();
        Box::pin(async move {
            match client.get(format!("https://{host}/healthz")).timeout(timeout).send().await {
                Ok(response) => response.status().is_success(),
                Err(_) => false,
            }
        })
    })
}

/// `TargetHealthMonitor`: every host down until a probe says otherwise, polled in the
/// background and read without waiting.
pub struct TargetHealthMonitor {
    hosts: Vec<String>,
    interval: Duration,
    timeout: Duration,
    probe: HealthzProbe,
    logger: Option<Logger>,
    up: RwLock<HashMap<String, bool>>,
    timer: std::sync::Mutex<Option<JoinHandle<()>>>,
}

impl TargetHealthMonitor {
    pub fn new(hosts: Vec<String>, interval_ms: f64, timeout_ms: f64, probe: HealthzProbe, logger: Option<Logger>) -> TargetHealthMonitor {
        let mut unique: Vec<String> = Vec::new();
        for host in hosts {
            if !unique.contains(&host) {
                unique.push(host);
            }
        }
        TargetHealthMonitor {
            hosts: unique,
            interval: Duration::from_millis(interval_ms as u64),
            timeout: Duration::from_millis(timeout_ms as u64),
            probe,
            logger,
            up: RwLock::new(HashMap::new()),
            timer: std::sync::Mutex::new(None),
        }
    }

    pub fn is_up(&self, host: &str) -> bool {
        self.up.read().map(|up| up.get(host) == Some(&true)).unwrap_or(false)
    }

    /// One probe round over every host.
    pub async fn poll_all(&self) {
        let probes = self.hosts.iter().map(|host: &String| {
            let probe: HealthzProbe = self.probe.clone();
            let host: String = host.clone();
            let timeout: Duration = self.timeout;
            async move { (host.clone(), probe(host, timeout).await) }
        });
        for (host, healthy) in futures_util::future::join_all(probes).await {
            let previous: Option<bool> = self.up.write().ok().and_then(|mut up| up.insert(host.clone(), healthy));
            if previous != Some(healthy) {
                if let Some(logger) = &self.logger {
                    logger.info(|| LogRecord::msg("healthz geo target health changed").with_data(json!({ "host": host, "healthy": healthy })));
                }
            }
        }
    }

    /// Polls now and then every interval, until stopped or dropped.
    pub fn start(self: &Arc<TargetHealthMonitor>) {
        let Ok(mut timer) = self.timer.lock() else {
            return;
        };
        if timer.is_some() || self.hosts.is_empty() {
            return;
        }
        let monitor: std::sync::Weak<TargetHealthMonitor> = Arc::downgrade(self);
        let interval: Duration = self.interval;
        *timer = Some(tokio::spawn(async move {
            let mut ticks: tokio::time::Interval = tokio::time::interval(interval);
            loop {
                ticks.tick().await;
                let Some(monitor) = monitor.upgrade() else {
                    return;
                };
                tokio::spawn(async move { monitor.poll_all().await });
            }
        }));
    }

    pub fn stop(&self) {
        if let Some(timer) = self.timer.lock().ok().and_then(|mut timer| timer.take()) {
            timer.abort();
        }
    }
}

impl Drop for TargetHealthMonitor {
    fn drop(&mut self) {
        self.stop();
    }
}

/// The country lookup steering needs.
pub trait CountryLookup: Send + Sync {
    fn is_available(&self) -> bool;
    fn country(&self, ip: &str) -> Option<String>;
}

impl CountryLookup for IpInfoService {
    fn is_available(&self) -> bool {
        IpInfoService::is_available(self)
    }

    fn country(&self, ip: &str) -> Option<String> {
        IpInfoService::country(self, ip)
    }
}

/// `HealthzGeoRouter`.
pub struct HealthzGeoRouter {
    pub enabled: bool,
    routes: IndexMap<String, String>,
    lookup: Arc<dyn CountryLookup>,
    monitor: Arc<TargetHealthMonitor>,
}

impl HealthzGeoRouter {
    pub fn new(config: HealthzGeoConfig, lookup: Arc<dyn CountryLookup>, monitor: Arc<TargetHealthMonitor>) -> HealthzGeoRouter {
        HealthzGeoRouter {
            enabled: config.enabled,
            routes: config.routes,
            lookup,
            monitor,
        }
    }

    /// The router with its own monitor over the mapped hosts.
    pub fn with_probe(config: HealthzGeoConfig, lookup: Arc<dyn CountryLookup>, probe: HealthzProbe, logger: Option<Logger>) -> HealthzGeoRouter {
        let monitor: TargetHealthMonitor =
            TargetHealthMonitor::new(config.routes.values().cloned().collect(), config.probe_interval_ms, config.probe_timeout_ms, probe, logger);
        HealthzGeoRouter::new(config, lookup, Arc::new(monitor))
    }

    pub fn start(&self) {
        if self.enabled {
            self.monitor.start();
        }
    }

    pub fn stop(&self) {
        self.monitor.stop();
    }

    /// `resolveHost`.
    pub fn resolve_host(&self, client_ip: Option<&str>, own_host: Option<&str>) -> HealthzGeoDecision {
        let own = |outcome: HealthzGeoOutcome| HealthzGeoDecision {
            host: own_host.map(str::to_string),
            outcome,
        };
        if !self.enabled {
            return own(HealthzGeoOutcome::NotSteered);
        }
        let Some(client_ip) = client_ip.filter(|ip| !ip.is_empty()) else {
            return own(HealthzGeoOutcome::GeoUnavailable);
        };
        if !self.lookup.is_available() {
            return own(HealthzGeoOutcome::GeoUnavailable);
        }
        let Some(country) = self.lookup.country(client_ip).filter(|country| !country.is_empty()) else {
            return own(HealthzGeoOutcome::GeoUnavailable);
        };
        let target: &String = match self.routes.get(&country.to_uppercase()) {
            Some(target) if Some(target.as_str()) != own_host => target,
            _ => return own(HealthzGeoOutcome::NotSteered),
        };
        if !self.monitor.is_up(target) {
            return own(HealthzGeoOutcome::TargetDown);
        }
        HealthzGeoDecision {
            host: Some(target.clone()),
            outcome: HealthzGeoOutcome::Steered,
        }
    }
}
