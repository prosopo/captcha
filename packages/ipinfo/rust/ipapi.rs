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

//! The ipapi.is backend: a POST to the sidecar or the hosted API.

use crate::js::parse_float;
use prosopo_logger::Logger;
use prosopo_types::ipapi::{IpApiResponse, IpInfoResponse, IpInfoResult, IpInfoSource};
use prosopo_types::JsNumber;
use serde_json::{Map, Value};
use std::future::Future;
use std::pin::Pin;
use std::time::Duration;

/// The per-lookup budget: a lookup sits in the request path.
pub const DEFAULT_TIMEOUT_MS: u64 = 700;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FetchRequest {
    pub url: String,
    pub method: &'static str,
    pub headers: Vec<(&'static str, &'static str)>,
    pub body: String,
    pub timeout: Duration,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FetchResponse {
    pub status: u16,
    pub status_text: String,
    pub body: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FetchError {
    TimedOut,
    Failed(String),
}

pub type FetchFuture<'a> =
    Pin<Box<dyn Future<Output = Result<FetchResponse, FetchError>> + Send + 'a>>;

/// The subset of `fetch` the backend uses; injected so tests need no network.
pub trait Fetch: Send + Sync {
    fn fetch(&self, request: FetchRequest) -> FetchFuture<'_>;
}

/// `fetch` over reqwest. The status text is the canonical reason phrase: undici reports the
/// server's own, which reqwest does not expose.
pub struct ReqwestFetch {
    client: reqwest::Client,
}

impl Default for ReqwestFetch {
    fn default() -> ReqwestFetch {
        ReqwestFetch {
            client: reqwest::Client::new(),
        }
    }
}

impl Fetch for ReqwestFetch {
    fn fetch(&self, request: FetchRequest) -> FetchFuture<'_> {
        Box::pin(async move {
            let mut builder = self
                .client
                .post(&request.url)
                .timeout(request.timeout)
                .body(request.body);
            for (name, value) in request.headers {
                builder = builder.header(name, value);
            }
            let response = builder.send().await.map_err(|error| {
                if error.is_timeout() {
                    FetchError::TimedOut
                } else {
                    FetchError::Failed(error.to_string())
                }
            })?;
            let status = response.status();
            let body: String = response.text().await.map_err(|error| {
                if error.is_timeout() {
                    FetchError::TimedOut
                } else {
                    FetchError::Failed(error.to_string())
                }
            })?;
            Ok(FetchResponse {
                status: status.as_u16(),
                status_text: status.canonical_reason().unwrap_or("").to_string(),
                body,
            })
        })
    }
}

pub struct IpapiBackendConfig {
    pub base_url: String,
    pub api_key: Option<String>,
    pub logger: Option<Logger>,
    pub fetch: Option<Box<dyn Fetch>>,
    pub timeout_ms: Option<u64>,
}

/// `parseAbuserScore`: the number in an upstream score such as `"0.0012 (Low)"`, or `None`
/// when it is absent or unparseable, which means unknown rather than clean.
pub fn parse_abuser_score(score: Option<&str>) -> Option<f64> {
    let head: &str = score?.split(' ').next().unwrap_or("");
    if head.is_empty() {
        return None;
    }
    parse_float(head)
}

/// `a || b` over two optional strings: an empty string falls through.
fn or_else(a: Option<String>, b: Option<String>) -> Option<String> {
    match a {
        Some(a) if !a.is_empty() => Some(a),
        _ => b,
    }
}

pub struct IpapiBackend {
    config: IpapiBackendConfig,
    default_fetch: ReqwestFetch,
}

impl IpapiBackend {
    pub fn new(config: IpapiBackendConfig) -> IpapiBackend {
        IpapiBackend {
            config,
            default_fetch: ReqwestFetch::default(),
        }
    }

    pub fn is_available(&self) -> bool {
        !self.config.base_url.is_empty()
    }

    fn timeout_ms(&self) -> u64 {
        self.config.timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS)
    }

    /// The request body, `JSON.stringify({ q: ip, key })`.
    fn body(&self, ip: &str) -> String {
        let mut body: Map<String, Value> = Map::new();
        body.insert("q".to_string(), Value::from(ip));
        if let Some(key) = self.config.api_key.as_deref().filter(|key| !key.is_empty()) {
            body.insert("key".to_string(), Value::from(key));
        }
        serde_json::to_string(&Value::Object(body)).unwrap_or_default()
    }

    pub async fn lookup(&self, ip: &str) -> IpInfoResponse {
        if ip.is_empty() {
            return IpInfoResponse::error("Invalid IP address provided", "undefined");
        }
        let fetch: &dyn Fetch = self.config.fetch.as_deref().unwrap_or(&self.default_fetch);
        let request: FetchRequest = FetchRequest {
            url: self.config.base_url.clone(),
            method: "POST",
            headers: vec![
                ("Content-Type", "application/json"),
                ("Accept", "application/json"),
            ],
            body: self.body(ip),
            timeout: Duration::from_millis(self.timeout_ms()),
        };
        let budget: Duration = request.timeout;
        let response: FetchResponse = match tokio::time::timeout(budget, fetch.fetch(request))
            .await
            .unwrap_or(Err(FetchError::TimedOut))
        {
            Ok(response) => response,
            Err(FetchError::TimedOut) => {
                return IpInfoResponse::error(
                    format!("Request timed out after {}ms", self.timeout_ms()),
                    ip,
                )
            }
            Err(FetchError::Failed(message)) => {
                return IpInfoResponse::error(format!("Network or parsing error: {message}"), ip)
            }
        };
        if !(200..=299).contains(&response.status) {
            return IpInfoResponse::error(
                format!(
                    "API request failed with status {}: {}",
                    response.status, response.status_text
                ),
                ip,
            );
        }
        match parse_response(&response.body) {
            Ok(data) if data.is_bogon == Some(true) => {
                IpInfoResponse::error("IP address is bogon (non-routable)", ip)
            }
            Ok(data) => IpInfoResponse::Valid(Box::new(result_from(data))),
            Err(message) => {
                IpInfoResponse::error(format!("Network or parsing error: {message}"), ip)
            }
        }
    }
}

/// The response as the TS reads it: `response.json()` cast without validation. A score that
/// is not a string makes the TS's `score?.split` throw, failing the whole lookup.
fn parse_response(body: &str) -> Result<IpApiResponse, String> {
    let value: Value = serde_json::from_str(body).map_err(|error| error.to_string())?;
    for (section, field) in [("asn", "abuser_score"), ("company", "abuser_score")] {
        let score: Option<&Value> = value.get(section).and_then(|section| section.get(field));
        if matches!(score, Some(score) if !score.is_string() && !score.is_null()) {
            return Err("score?.split is not a function".to_string());
        }
    }
    serde_json::from_value(value).map_err(|error| error.to_string())
}

fn result_from(data: IpApiResponse) -> IpInfoResult {
    let company = data.company.unwrap_or_default();
    let datacenter = data.datacenter.unwrap_or_default();
    let asn = data.asn.unwrap_or_default();
    let location = data.location.unwrap_or_default();
    let vpn = data.vpn.unwrap_or_default();
    IpInfoResult {
        source: IpInfoSource::IpApi,
        ip: data.ip,
        is_vpn: data.is_vpn,
        is_tor: data.is_tor,
        is_proxy: data.is_proxy,
        is_datacenter: data.is_datacenter,
        is_abuser: data.is_abuser,
        is_mobile: data.is_mobile,
        is_satellite: data.is_satellite,
        is_crawler: data.is_crawler,
        provider_name: or_else(company.name, datacenter.datacenter.clone()),
        provider_type: company.company_type.or(asn.asn_type),
        asn_number: asn.asn,
        asn_organization: asn.org,
        datacenter_name: datacenter.datacenter,
        country: location.country,
        country_code: location.country_code,
        region: location.state,
        city: location.city,
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: location.timezone,
        vpn_service: vpn.service,
        vpn_type: vpn.vpn_type,
        abuser_score: parse_abuser_score(asn.abuser_score.as_deref()).map(JsNumber),
        company_abuser_score: parse_abuser_score(company.abuser_score.as_deref()).map(JsNumber),
    }
}
