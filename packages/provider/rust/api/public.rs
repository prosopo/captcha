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

//! public.ts and assetDocument.ts: `/healthz`, the provider details, and the asset document
//! page any other GET with `?m=n&u=<url>` gets. What none of them takes falls through to
//! express's 404.

use crate::api::express::{client_ip, hostname, send, send_json, Requested};
use crate::api::healthz_geo::{HealthzGeoDecision, HealthzGeoRouter};
use crate::api::metrics::{metrics_response, normalise_route, ProviderMetrics};
use crate::api::query::query_string;
use axum::extract::{ConnectInfo, Request, State};
use axum::response::Response;
use http::header::{HeaderName, HeaderValue, CACHE_CONTROL, CONTENT_TYPE};
use http::{Method, StatusCode};
use prosopo_common::{unwrap_error, ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError, ThrownError, UnwrappedError};
use prosopo_database::provider::ProviderDatabase;
use prosopo_logger::{LogRecord, Logger};
use serde_json::{json, Map, Value};
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Instant;

pub const HEALTHZ: &str = "/healthz";
pub const PROVIDER_DETAILS: &str = "/v1/prosopo/provider/public/details";
pub const METRICS: &str = "/metrics";

/// A Redis connection's readiness and how long it has been connecting, in milliseconds.
pub type RedisStatus = (bool, i64);

/// What the details route reports about the provider's two Redis connections.
pub trait RedisStatuses: Send + Sync {
    /// The general connection, then the access rules one; an error when there is no database
    /// or no connection.
    fn redis_statuses(&self) -> Result<[RedisStatus; 2], ProsopoError>;
}

/// The statuses of the environment's database, which may not be set up.
pub struct DatabaseRedisStatuses(pub Option<Arc<ProviderDatabase>>);

impl RedisStatuses for DatabaseRedisStatuses {
    fn redis_statuses(&self) -> Result<[RedisStatus; 2], ProsopoError> {
        let db: &Arc<ProviderDatabase> = self.0.as_ref().ok_or_else(|| {
            ProsopoError::new(ErrorClass::Env, ErrorSource::message("db not setup! Please call isReady() first"), ErrorOptions::default())
        })?;
        let general = db.get_redis_connection()?;
        let access_rules = db.get_redis_access_rules_connection()?;
        Ok([(general.is_ready(), general.get_awaiting_time_ms()), (access_rules.is_ready(), access_rules.get_awaiting_time_ms())])
    }
}

/// The environment variables a route reads per request, as `process.env` gives them.
pub type EnvReader = Arc<dyn Fn(&str) -> Option<String> + Send + Sync>;

pub struct PublicState {
    /// `config.host`.
    pub host: String,
    /// `version` from util: the build's `PROSOPO_PACKAGE_VERSION`, else `dev`.
    pub version: String,
    pub geo: Arc<HealthzGeoRouter>,
    pub redis: Arc<dyn RedisStatuses>,
    pub logger: Logger,
    /// `None` when `PROSOPO_METRICS_ENABLED=false`: no `/metrics` and nothing recorded.
    pub metrics: Option<Arc<ProviderMetrics>>,
    pub env: EnvReader,
    /// What follows the public router.
    pub rest: axum::Router,
}

impl PublicState {
    /// The node's own name, or the request's host when none is configured.
    fn own_host(&self, request: &Request) -> Option<String> {
        if self.host.is_empty() {
            hostname(request.headers())
        } else {
            Some(self.host.clone())
        }
    }
}

/// An express route path matching as path-to-regexp 0.1 makes it: any case, one optional
/// trailing slash.
fn route_matches(path: &str, route: &str) -> bool {
    let path: &str = path.strip_suffix('/').filter(|stripped| stripped.len() == route.len()).unwrap_or(path);
    path.eq_ignore_ascii_case(route)
}

fn healthz_body(host: Option<String>) -> Value {
    let mut body: Map<String, Value> = Map::new();
    body.insert("ok".to_string(), Value::Bool(true));
    if let Some(host) = host {
        body.insert("host".to_string(), Value::String(host));
    }
    Value::Object(body)
}

fn healthz(state: &PublicState, remote: &SocketAddr, request: &Request) -> Response {
    let requested: Requested = Requested::of(request);
    let own_host: Option<String> = state.own_host(request);
    if !state.geo.enabled {
        return send_json(&requested, StatusCode::OK, Vec::new(), &healthz_body(own_host));
    }
    let ip: String = client_ip(remote, request.headers());
    let decision: HealthzGeoDecision = state.geo.resolve_host(Some(&ip), own_host.as_deref());
    if let Some(metrics) = &state.metrics {
        metrics.record_healthz_geo_outcome(decision.outcome);
    }
    let headers: Vec<(HeaderName, HeaderValue)> = vec![(CACHE_CONTROL, HeaderValue::from_static("no-store, private"))];
    send_json(&requested, StatusCode::OK, headers, &healthz_body(decision.host))
}

/// `Math.ceil(ms / 1000)`.
fn seconds(ms: i64) -> Value {
    let seconds: f64 = (ms as f64 / 1000.0).ceil();
    serde_json::Number::from_f64(if seconds == 0.0 { 0.0 } else { seconds }).map_or(Value::Null, Value::Number)
}

fn details(state: &PublicState, request: &Request) -> Response {
    let requested: Requested = Requested::of(request);
    match state.redis.redis_statuses() {
        Ok([(general_ready, general_ms), (uap_ready, uap_ms)]) => {
            let mut body: Map<String, Value> = Map::new();
            body.insert("version".to_string(), json!(state.version));
            body.insert("message".to_string(), json!("Provider online"));
            if let Some(host) = state.own_host(request) {
                body.insert("host".to_string(), json!(host));
            }
            body.insert(
                "redis".to_string(),
                json!([
                    { "actor": "General", "isReady": general_ready, "awaitingTimeSeconds": seconds(general_ms) },
                    { "actor": "UAP", "isReady": uap_ready, "awaitingTimeSeconds": seconds(uap_ms) },
                ]),
            );
            send_json(&requested, StatusCode::OK, Vec::new(), &Value::Object(body))
        }
        Err(error) => {
            state.logger.error(|| {
                LogRecord::msg("Error getting provider details").with_err(error.to_string()).with_data(json!({ "reqParams": {} }))
            });
            let error: ProsopoError = ProsopoError::new(
                ErrorClass::Api,
                ErrorSource::key("API.BAD_REQUEST"),
                ErrorOptions {
                    context: Some(ErrorContext::new().with("code", 500)),
                    ..ErrorOptions::default()
                },
            );
            handle_errors(&requested, &ThrownError::from(error))
        }
    }
}

/// `handleErrors` in the public router, which runs before the request has a language.
fn handle_errors(requested: &Requested, error: &ThrownError) -> Response {
    let UnwrappedError { code, status_message, json_error } = unwrap_error(error, None);
    let status: StatusCode = StatusCode::from_u16(code).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let mut response: Response = send_json(requested, status, Vec::new(), &json!({ "error": json_error }));
    if status.canonical_reason() != Some(status_message) {
        if let Ok(phrase) = hyper::ext::ReasonPhrase::try_from(status_message.as_bytes().to_vec()) {
            response.extensions_mut().insert(phrase);
        }
    }
    response
}

/// `JSON.stringify` of a string, with `<` and `>` escaped for a script element.
fn script_literal(value: &str) -> String {
    prosopo_logger::json_stringify(&Value::String(value.to_string()), 0).replace('<', "\\u003c").replace('>', "\\u003e")
}

/// The page that frames `inner` and tells the top window when it has loaded.
fn page(inner: &str, id: &str) -> String {
    format!(
        "<!doctype html>\n<meta charset=\"utf-8\">\n<body><script>\nvar f=document.createElement('iframe');\nf.src={};\nf.onload=function(){{window.top.postMessage({{p:'n',i:{}}},'*')}};\ndocument.body.appendChild(f);\n</script></body>",
        script_literal(inner),
        script_literal(id)
    )
}

/// An http(s) URL, as `new URL(raw).href` writes it.
fn inner_url(raw: &str) -> Option<String> {
    let url: url::Url = url::Url::parse(raw).ok()?;
    matches!(url.scheme(), "http" | "https").then(|| url.to_string())
}

fn probe_id(raw: Option<String>) -> String {
    raw.filter(|id| (1..=64).contains(&id.len()) && id.bytes().all(|byte| byte.is_ascii_alphanumeric())).unwrap_or_default()
}

fn asset_document(request: &Request) -> Option<Response> {
    let query: &str = request.uri().query().unwrap_or_default();
    if query_string(query, "m").as_deref() != Some("n") {
        return None;
    }
    let inner: String = query_string(query, "u").filter(|raw| !raw.is_empty()).and_then(|raw| inner_url(&raw))?;
    let id: String = probe_id(query_string(query, "i"));
    let headers: Vec<(HeaderName, HeaderValue)> = vec![
        (CONTENT_TYPE, HeaderValue::from_static("text/html; charset=utf-8")),
        (CACHE_CONTROL, HeaderValue::from_static("no-store")),
        (HeaderName::from_static("content-security-policy"), HeaderValue::from_static("frame-ancestors *")),
    ];
    Some(send(&Requested::of(request), StatusCode::OK, headers, page(&inner, &id).into_bytes()))
}

/// The public router, then the request counter around what follows it (so far, express's 404).
pub async fn public_routes(State(state): State<Arc<PublicState>>, ConnectInfo(remote): ConnectInfo<SocketAddr>, request: Request) -> Response {
    let get: bool = request.method() == Method::GET || request.method() == Method::HEAD;
    let path: &str = request.uri().path();
    if get && route_matches(path, HEALTHZ) {
        return healthz(&state, &remote, &request);
    }
    if get && route_matches(path, METRICS) {
        if let Some(metrics) = &state.metrics {
            return metrics_response(metrics, state.redis.as_ref(), state.env.as_ref(), &remote, &request);
        }
    }
    if get && route_matches(path, PROVIDER_DETAILS) {
        return details(&state, &request);
    }
    if get {
        if let Some(response) = asset_document(&request) {
            return response;
        }
    }
    let route: String = normalise_route(path).to_string();
    let method: String = request.method().as_str().to_string();
    let started: Instant = Instant::now();
    let response: Response = match tower::ServiceExt::oneshot(state.rest.clone(), request).await {
        Ok(response) => response,
        Err(never) => match never {},
    };
    if let Some(metrics) = &state.metrics {
        metrics.record_request(&route, &method, response.status().as_u16(), started.elapsed().as_secs_f64());
    }
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_routes_as_express_does() {
        assert!(route_matches("/healthz", HEALTHZ));
        assert!(route_matches("/HEALTHZ/", HEALTHZ));
        assert!(!route_matches("//healthz", HEALTHZ));
        assert!(!route_matches("/healthz//", HEALTHZ));
        assert!(!route_matches("/healthzz", HEALTHZ));
    }
}
