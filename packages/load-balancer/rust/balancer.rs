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

//! balancer.ts: the provider list, from the `PROSOPO_PROVIDER_LIST` override, the
//! development provider, or Prosopo's hosted list.

use crate::error::{thrown, LoadBalancerError, Result};
use crate::js::js_trim;
use crate::overrides::{
    get_development_provider_url, strip_trailing_slash, DEVELOPMENT_PROVIDER_URL_ENV,
    PROVIDER_LIST_ENV,
};
use prosopo_common::{ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError};
use prosopo_types::config::EnvironmentTypes;
use prosopo_types::js_math_round;
use prosopo_util_crypto::locale_compare;
use prosopo_util_crypto::{js_entry_order, json_parse, json_stringify, JsonValue};
use serde::{Deserialize, Serialize};
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::time::Duration;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HardcodedProvider {
    pub address: String,
    pub url: String,
    pub dataset_id: String,
    /// A capacity weight, 1 to 100.
    pub weight: u32,
}

/// Selects the list's single-stack `ipv4` or `ipv6` sub-list.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum IpMode {
    Ipv4,
    Ipv6,
}

impl IpMode {
    pub fn as_str(self) -> &'static str {
        match self {
            IpMode::Ipv4 => "ipv4",
            IpMode::Ipv6 => "ipv6",
        }
    }
}

const IP_MODE_KEYS: [&str; 2] = ["ipv4", "ipv6"];

/// `PROVIDER_LIST_FETCH_TIMEOUT_MS`: the provider list is fetched in the request path.
pub const PROVIDER_LIST_FETCH_TIMEOUT_MS: u64 = 10_000;

fn malformed(entry: &str) -> LoadBalancerError {
    thrown(format!(
        "Malformed provider entry in the provider list: {entry}"
    ))
}

/// `parseHardcodedProvider`: an entry of the fetched list, checked rather than trusted.
fn parse_hardcoded_provider(value: &JsonValue) -> Result<HardcodedProvider> {
    let text = |key: &str| {
        value
            .get(key)
            .and_then(JsonValue::as_str)
            .map(str::to_string)
    };
    let weight: Option<f64> = match value.get("weight") {
        None => Some(1.0),
        Some(JsonValue::Number(weight)) => Some(*weight),
        Some(_) => None,
    };
    match (text("address"), text("url"), text("datasetId"), weight) {
        (Some(address), Some(url), Some(dataset_id), Some(weight)) => Ok(HardcodedProvider {
            address,
            url,
            dataset_id,
            weight: js_math_round(weight).clamp(1.0, 100.0) as u32,
        }),
        _ => Err(malformed(&json_stringify(value))),
    }
}

/// `JSON.stringify` of one UTF-16 code unit, which escapes a lone surrogate.
fn code_unit_json(unit: u16) -> String {
    match char::from_u32(u32::from(unit)) {
        Some(c) => json_stringify(&JsonValue::String(c.to_string())),
        None => format!("\"\\u{unit:04x}\""),
    }
}

/// `Object.entries(source)` for whatever JSON the list turned out to be.
fn entry_values(source: &JsonValue) -> Result<Vec<&JsonValue>> {
    match source {
        JsonValue::Null => Err(thrown("Cannot convert undefined or null to object")),
        JsonValue::Object(entries) => Ok(js_entry_order(entries)
            .into_iter()
            .filter(|(key, _)| !IP_MODE_KEYS.contains(&key.as_str()))
            .map(|(_, value)| value)
            .collect()),
        JsonValue::Array(items) => Ok(items.iter().collect()),
        JsonValue::String(text) => match text.encode_utf16().next() {
            Some(unit) => Err(malformed(&code_unit_json(unit))),
            None => Ok(Vec::new()),
        },
        JsonValue::Number(_) | JsonValue::Bool(_) => Ok(Vec::new()),
    }
}

/// `convertHostedProvider(provider, ipMode)`: the dual-stack providers, or the `ipMode`
/// sub-list when the list has one, sorted by url as `localeCompare` sorts.
pub fn convert_hosted_provider(
    provider: &JsonValue,
    ip_mode: Option<IpMode>,
) -> Result<Vec<HardcodedProvider>> {
    let source: &JsonValue = match (ip_mode, provider) {
        (Some(mode), JsonValue::Null) => {
            return Err(thrown(format!(
                "Cannot read properties of null (reading '{}')",
                mode.as_str()
            )));
        }
        (Some(mode), _) => match provider.get(mode.as_str()) {
            Some(sub_list @ (JsonValue::Object(_) | JsonValue::Array(_))) => sub_list,
            _ => provider,
        },
        (None, _) => provider,
    };
    let mut providers: Vec<HardcodedProvider> = entry_values(source)?
        .into_iter()
        .map(parse_hardcoded_provider)
        .collect::<Result<Vec<HardcodedProvider>>>()?;
    providers.sort_by(|a, b| locale_compare(&a.url, &b.url));
    Ok(providers)
}

/// Drops the `ipv4.`/`ipv6.` label the single-stack sub-lists put on a hostname.
pub fn strip_ip_mode_label(hostname: &str) -> &str {
    hostname
        .strip_prefix("ipv4.")
        .or_else(|| hostname.strip_prefix("ipv6."))
        .unwrap_or(hostname)
}

/// `getProviderHostname`: the provider's hostname without its `ipv4.`/`ipv6.` label.
pub fn get_provider_hostname(provider: &HardcodedProvider) -> Result<String> {
    let url: url::Url = url::Url::parse(&provider.url).map_err(|_| thrown("Invalid URL"))?;
    Ok(strip_ip_mode_label(url.host_str().unwrap_or("")).to_string())
}

/// Stands in for the account and dataset a bare-url override cannot name.
const SELF_HOSTED_ADDRESS: &str = "self-hosted";
const SELF_HOSTED_DATASET_ID: &str = "";

fn providers_from_url_list(raw: &str) -> Vec<HardcodedProvider> {
    raw.split(',')
        .map(|url| strip_trailing_slash(js_trim(url)))
        .filter(|url| !url.is_empty())
        .map(|url| HardcodedProvider {
            address: SELF_HOSTED_ADDRESS.to_string(),
            url: url.to_string(),
            dataset_id: SELF_HOSTED_DATASET_ID.to_string(),
            weight: 1,
        })
        .collect()
}

/// `getProviderListOverride(raw, ipMode)`: `raw` is the hosted list's JSON, or comma-separated
/// urls. Empty when unset, and when malformed, so a typo falls back to normal discovery.
/// Trailing slashes are dropped, because a verifier matches a token's provider url exactly.
pub fn get_provider_list_override(
    raw: Option<&str>,
    ip_mode: Option<IpMode>,
) -> Vec<HardcodedProvider> {
    let Some(trimmed) = raw.map(js_trim).filter(|raw| !raw.is_empty()) else {
        return Vec::new();
    };
    if !trimmed.starts_with('{') {
        return providers_from_url_list(trimmed);
    }
    json_parse(trimmed)
        .ok()
        .and_then(|json| convert_hosted_provider(&json, ip_mode).ok())
        .map(|providers| {
            providers
                .into_iter()
                .map(|provider| HardcodedProvider {
                    url: strip_trailing_slash(&provider.url).to_string(),
                    ..provider
                })
                .collect()
        })
        .unwrap_or_default()
}

pub fn get_load_balancer_url(environment: EnvironmentTypes) -> Result<&'static str> {
    match environment {
        EnvironmentTypes::Production => Ok("https://provider-list.prosopo.io/"),
        EnvironmentTypes::Staging => Ok("https://provider-list.prosopo.io/staging.json"),
        EnvironmentTypes::Development => Err(LoadBalancerError::UnknownEnvironment(Box::new(
            ProsopoError::new(
                ErrorClass::Env,
                ErrorSource::key("CONFIG.UNKNOWN_ENVIRONMENT"),
                ErrorOptions {
                    context: Some(ErrorContext::new().with("environment", environment.as_str())),
                    ..ErrorOptions::default()
                },
            ),
        ))),
    }
}

pub type FetchFuture = Pin<Box<dyn Future<Output = Result<Vec<u8>>> + Send>>;

/// The subset of `fetch` the list is loaded with; injected so tests need no network.
pub trait ProviderListFetch: Send + Sync {
    /// The body of a GET of `url`. The status is not checked, as the TS does not check it.
    fn get(&self, url: &str) -> FetchFuture;
}

#[derive(Default)]
pub struct ReqwestFetch {
    client: reqwest::Client,
}

impl ProviderListFetch for ReqwestFetch {
    fn get(&self, url: &str) -> FetchFuture {
        let request = self.client.get(url);
        Box::pin(async move {
            let response = request.send().await.map_err(|_| thrown("fetch failed"))?;
            let body = response.bytes().await.map_err(|_| thrown("terminated"))?;
            Ok(body.to_vec())
        })
    }
}

/// Reads an environment variable; injected so tests need not change the process's.
pub type EnvLookup = Arc<dyn Fn(&str) -> Option<String> + Send + Sync>;

const DEVELOPMENT_PROVIDER_ADDRESS: &str = "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV";
const DEVELOPMENT_DATASET_ID: &str =
    "0x7984714b92d61fd92fd6a7bc9b56b729481470bcc771c19c382ec679acf02e67";

/// `res.json()`: the body decoded as UTF-8, less any byte order mark, then `JSON.parse`d.
fn parse_body(body: &[u8]) -> Result<JsonValue> {
    let text = String::from_utf8_lossy(body.strip_prefix(b"\xEF\xBB\xBF").unwrap_or(body));
    json_parse(&text).map_err(|error| thrown(error.message()))
}

#[derive(Clone)]
pub struct LoadBalancer {
    fetch: Arc<dyn ProviderListFetch>,
    env: EnvLookup,
}

impl Default for LoadBalancer {
    fn default() -> LoadBalancer {
        LoadBalancer::with(
            Arc::new(ReqwestFetch::default()),
            Arc::new(|name: &str| std::env::var(name).ok()),
        )
    }
}

impl LoadBalancer {
    pub fn with(fetch: Arc<dyn ProviderListFetch>, env: EnvLookup) -> LoadBalancer {
        LoadBalancer { fetch, env }
    }

    /// `loadBalancer(environment, ipMode, timeoutMs)`. An override answers first, in every
    /// environment and without a request; the bare-url form ignores `ip_mode`.
    pub async fn providers(
        &self,
        environment: EnvironmentTypes,
        ip_mode: Option<IpMode>,
        timeout_ms: u64,
    ) -> Result<Vec<HardcodedProvider>> {
        let overridden: Vec<HardcodedProvider> =
            get_provider_list_override((self.env)(PROVIDER_LIST_ENV).as_deref(), ip_mode);
        if !overridden.is_empty() {
            return Ok(overridden);
        }
        if environment == EnvironmentTypes::Development {
            return Ok(vec![HardcodedProvider {
                address: DEVELOPMENT_PROVIDER_ADDRESS.to_string(),
                url: get_development_provider_url(
                    (self.env)(DEVELOPMENT_PROVIDER_URL_ENV).as_deref(),
                ),
                dataset_id: DEVELOPMENT_DATASET_ID.to_string(),
                weight: 1,
            }]);
        }
        let url: &str = get_load_balancer_url(environment)?;
        let body: Vec<u8> =
            tokio::time::timeout(Duration::from_millis(timeout_ms), self.fetch.get(url))
                .await
                .map_err(|_| LoadBalancerError::TimedOut)??;
        convert_hosted_provider(&parse_body(&body)?, ip_mode)
    }
}
