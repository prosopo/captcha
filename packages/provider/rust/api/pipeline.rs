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

//! startProviderApi.ts after the public router, in its order: the rate limits, the robots
//! headers, the non-API 404, the request logger and language, the request signals (JA4,
//! handshake timing, raw TLS signals, IP information), the header check on the client routes,
//! the admin JWT gate, the access-policy block, and the client routes' domain check. Routes the
//! Rust provider does not serve yet end in express's 404.

use crate::api::block::BlockState;
use crate::api::captcha::CaptchaState;
use crate::api::domain::DomainState;
use crate::api::express::{self, client_ip, header, send, send_json, Requested};
use crate::api::signals::{get_handshake_timing, get_ja4, get_raw_tls_signals, node_base64_decode, HandshakeTiming, RawTlsSignals};
use axum::extract::{ConnectInfo, Request, State};
use axum::middleware::{from_fn, from_fn_with_state, Next};
use axum::response::Response;
use axum::Router;
use http::header::{HeaderValue, CONTENT_TYPE};
use http::{HeaderMap, StatusCode};
use prosopo_api_router::{auth_middleware, i18n_middleware, request_logger_middleware, AuthState, RequestI18n, RequestLog};
use prosopo_common::{unwrap_error, ErrorClass, ErrorContext, ErrorOptions, ErrorSource, ProsopoError, ThrownError, UnwrappedError};
use prosopo_types::ipapi::IpInfoResponse;
use prosopo_locale::{I18n, I18nLookup};
use prosopo_logger::{LogObject, LogRecord, Logger};
use prosopo_types::provider_api::{AdminApiPaths, ClientApiPaths, API_PREFIX};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::future::Future;
use std::net::SocketAddr;
use std::pin::Pin;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

pub const ADMIN_PREFIX: &str = "/v1/prosopo/provider/admin";

/// `app.use(mount, …)`: the path is the mount path, or under it, in any case.
pub fn mounted(path: &str, mount: &str) -> bool {
    let Some(head) = path.get(..mount.len()) else {
        return false;
    };
    head.eq_ignore_ascii_case(mount) && (path.len() == mount.len() || path.as_bytes()[mount.len()] == b'/')
}

/// `getClientApiPathsExpectingProsopoHeaders`: the client routes but verify, spam and detector
/// assignment.
pub fn client_paths_expecting_headers() -> Vec<&'static str> {
    ClientApiPaths::ALL
        .iter()
        .map(|path| path.as_str())
        .filter(|path| !path.contains("verify") && !path.contains("spam") && !path.contains("detector/assign"))
        .collect()
}

fn now_ms() -> f64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map_or(0.0, |elapsed| elapsed.as_millis() as f64)
}

/// How a limiter tells callers apart.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RateLimitKey {
    /// `req.ip`.
    Ip,
    /// The admin JWT's `sub`, else the IP.
    AdminUser,
    /// `Prosopo-Site-Key`, else the IP, so verify calls from shared lambdas are not limited
    /// together.
    SiteKey,
}

/// One `rateLimit({ windowMs, limit, handler, keyGenerator })` with its memory store: each key
/// counted in a window that starts at its first hit.
pub struct RateLimiter {
    pub path: String,
    pub window_ms: f64,
    pub limit: f64,
    pub key: RateLimitKey,
    clients: Mutex<HashMap<String, (f64, f64)>>,
}

impl RateLimiter {
    pub fn new(path: String, window_ms: f64, limit: f64, key: RateLimitKey) -> RateLimiter {
        RateLimiter {
            path,
            window_ms,
            limit,
            key,
            clients: Mutex::new(HashMap::new()),
        }
    }

    /// The hit counted: the hits in this window and when it resets, in epoch milliseconds.
    fn increment(&self, key: &str, now: f64) -> (f64, f64) {
        let Ok(mut clients) = self.clients.lock() else {
            return (1.0, now + self.window_ms);
        };
        if clients.len() > 100_000 {
            clients.retain(|_, (_, reset)| *reset > now);
        }
        let client: &mut (f64, f64) = clients.entry(key.to_string()).or_insert((0.0, now + self.window_ms));
        if client.1 <= now {
            *client = (0.0, now + self.window_ms);
        }
        client.0 += 1.0;
        *client
    }
}

/// `getUserFromJWT`'s `sub`, as a store key: its type kept, as a JS `Map` key keeps it. An
/// object or array is a new key each time, as each parse makes a new object.
pub fn jwt_subject(headers: &HeaderMap) -> Option<String> {
    let authorization: String = header(headers, "authorization")?;
    let jwt: String = authorization.replacen("Bearer ", "", 1);
    let parts: Vec<&str> = jwt.split('.').collect();
    if parts.len() != 3 || parts[1].is_empty() {
        return None;
    }
    let payload: Value = serde_json::from_str(&String::from_utf8_lossy(&node_base64_decode(parts[1]))).ok()?;
    match payload.get("sub")? {
        Value::String(sub) if !sub.is_empty() => Some(format!("string:{sub}")),
        Value::Number(sub) if sub.as_f64().is_some_and(|sub| sub != 0.0 && !sub.is_nan()) => Some(format!("number:{sub}")),
        Value::Bool(true) => Some("boolean:true".to_string()),
        Value::Array(_) | Value::Object(_) => Some(format!("object:{}", uuid::Uuid::new_v4())),
        _ => None,
    }
}

/// The IP information lookup the request signals use.
pub trait IpInfoLookup: Send + Sync {
    fn is_available(&self) -> bool;
    fn lookup<'a>(&'a self, ip: &'a str) -> Pin<Box<dyn Future<Output = IpInfoResponse> + Send + 'a>>;
}

/// What the request-signal middlewares put on `req`.
#[derive(Debug, Clone)]
pub struct RequestSignals {
    pub ip: String,
    pub ja4: String,
    pub timing: HandshakeTiming,
    pub raw_tls: RawTlsSignals,
    pub ip_info: Option<IpInfoResponse>,
}

/// `req.user` and `req.siteKey`, once the header check has passed them.
#[derive(Debug, Clone)]
pub struct RequestAccount {
    pub user: String,
    pub site_key: String,
}

pub struct PipelineState {
    /// Empty in development and test, where the TS mounts none.
    pub limiters: Vec<RateLimiter>,
    pub logger: Logger,
    pub node_env: Option<String>,
    pub ip_info: Option<Arc<dyn IpInfoLookup>>,
}

/// The rate limits applying to the request, in mount order; the first exceeded answers 429.
async fn rate_limits(State(state): State<Arc<PipelineState>>, ConnectInfo(remote): ConnectInfo<SocketAddr>, request: Request, next: Next) -> Response {
    let path: String = request.uri().path().to_string();
    let ip: String = client_ip(&remote, request.headers());
    let mut headers: Vec<(&'static str, String)> = Vec::new();
    for limiter in state.limiters.iter().filter(|limiter| mounted(&path, &limiter.path)) {
        let key: String = match limiter.key {
            RateLimitKey::Ip => ip.clone(),
            RateLimitKey::AdminUser => jwt_subject(request.headers()).unwrap_or_else(|| ip.clone()),
            RateLimitKey::SiteKey => header(request.headers(), "prosopo-site-key").filter(|key| !key.is_empty()).unwrap_or_else(|| ip.clone()),
        };
        let now: f64 = now_ms();
        let (hits, reset) = limiter.increment(&key, now);
        let number = prosopo_util::number_to_string;
        headers.retain(|(name, _)| !name.starts_with("x-ratelimit-"));
        headers.push(("x-ratelimit-limit", number(limiter.limit)));
        headers.push(("x-ratelimit-remaining", number((limiter.limit - hits).max(0.0))));
        headers.push(("x-ratelimit-reset", number((reset / 1000.0).ceil())));
        if hits > limiter.limit {
            let retry_after: f64 = ((reset - now_ms()) / 1000.0).ceil().max(0.0);
            headers.push(("retry-after", number(retry_after)));
            state.logger.warn(|| {
                LogRecord::msg("Rate limit exceeded").with_data(json!({
                    "path": limiter.path,
                    "ip": ip,
                    "siteKey": header(request.headers(), "prosopo-site-key"),
                }))
            });
            let message: &str = "Too many requests, please try again later.";
            let html = vec![(CONTENT_TYPE, HeaderValue::from_static("text/html; charset=utf-8"))];
            let mut response: Response = send(&Requested::of(&request), StatusCode::TOO_MANY_REQUESTS, html, message.as_bytes().to_vec());
            apply_if_absent(response.headers_mut(), &headers);
            return response;
        }
    }
    let mut response: Response = next.run(request).await;
    apply_if_absent(response.headers_mut(), &headers);
    response
}

/// Headers a middleware set before `next()`: later stages win.
fn apply_if_absent(response: &mut HeaderMap, headers: &[(&'static str, String)]) {
    for (name, value) in headers {
        if !response.contains_key(*name) {
            if let Ok(value) = HeaderValue::from_str(value) {
                response.insert(*name, value);
            }
        }
    }
}

/// robotsMiddleware.
async fn robots(request: Request, next: Next) -> Response {
    let mut response: Response = next.run(request).await;
    let headers: [(&'static str, String); 4] = [
        ("strict-transport-security", "max-age=31536000;".to_string()),
        ("x-xss-protection", "1; mode=block".to_string()),
        ("x-frame-options", "DENY".to_string()),
        ("x-robots-tag", "none".to_string()),
    ];
    apply_if_absent(response.headers_mut(), &headers);
    response
}

/// ignoreMiddleware: a URL without the API prefix is not found, unless it names `/healthz`
/// anywhere.
async fn ignore(request: Request, next: Next) -> Response {
    let url: &str = request.uri().path_and_query().map_or("", |url| url.as_str());
    if url.contains("/healthz") || url.contains(API_PREFIX) {
        return next.run(request).await;
    }
    let html = vec![(CONTENT_TYPE, HeaderValue::from_static("text/html; charset=utf-8"))];
    send(&Requested::of(&request), StatusCode::NOT_FOUND, html, b"Not Found".to_vec())
}

fn rebind(request: &mut Request, bindings: Value, scope: &str) {
    let Some(log) = request.extensions().get::<RequestLog>().cloned() else {
        return;
    };
    let mut fields: LogObject = LogObject::new();
    if let Value::Object(map) = bindings {
        fields.extend(map.into_iter().filter(|(_, value)| !value.is_null()));
    }
    request.extensions_mut().insert(RequestLog {
        logger: log.logger.with(&fields, Some(scope)),
        request_id: log.request_id,
    });
}

/// ja4Middleware, handshakeTimingMiddleware, rawTlsSignalsMiddleware and ipInfoMiddleware.
async fn request_signals(State(state): State<Arc<PipelineState>>, ConnectInfo(remote): ConnectInfo<SocketAddr>, mut request: Request, next: Next) -> Response {
    let ja4: String = get_ja4(request.headers(), state.node_env.as_deref());
    rebind(&mut request, json!({ "ja4": ja4 }), "ja4");
    let timing: HandshakeTiming = get_handshake_timing(request.headers());
    if timing != HandshakeTiming::default() {
        rebind(&mut request, serde_json::to_value(timing).unwrap_or(Value::Null), "handshakeTiming");
    }
    let raw_tls: RawTlsSignals = get_raw_tls_signals(request.headers());
    if raw_tls != RawTlsSignals::default() {
        rebind(&mut request, serde_json::to_value(&raw_tls).unwrap_or(Value::Null), "rawTlsSignals");
    }
    let ip: String = client_ip(&remote, request.headers());
    let ip_info: Option<IpInfoResponse> = match &state.ip_info {
        Some(lookup) if !ip.is_empty() && lookup.is_available() => Some(lookup.lookup(&ip).await),
        _ => None,
    };
    request.extensions_mut().insert(RequestSignals { ip, ja4, timing, raw_tls, ip_info });
    next.run(request).await
}

/// `handleErrors` with the request's language, as `res.send` writes it.
pub fn handle_errors(request: &Request, error: &ThrownError) -> Response {
    let i18n: Option<&RequestI18n> = request.extensions().get::<RequestI18n>();
    let lookup = i18n.map(RequestI18n::lookup);
    let UnwrappedError { code, status_message, json_error } = unwrap_error(error, lookup.as_ref().map(|lookup| lookup as &dyn I18nLookup));
    let status: StatusCode = StatusCode::from_u16(code).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let mut response: Response = send_json(&Requested::of(request), status, Vec::new(), &json!({ "error": json_error }));
    if status.canonical_reason() != Some(status_message) {
        if let Ok(phrase) = hyper::ext::ReasonPhrase::try_from(status_message.as_bytes().to_vec()) {
            response.extensions_mut().insert(phrase);
        }
    }
    response
}

/// `validateAddr`: a polkadot address in prefix 42 form, else a 400 under `key`.
fn validate_address(address: &str, key: &str) -> Result<(), ProsopoError> {
    match prosopo_util_crypto::validate_address(Some(address), false, Some(42)) {
        Ok(true) => Ok(()),
        _ => Err(ProsopoError::new(
            ErrorClass::Api,
            ErrorSource::key(key),
            ErrorOptions {
                context: Some(ErrorContext::new().with("code", 400).with("siteKey", address)),
                ..ErrorOptions::default()
            },
        )),
    }
}

/// headerCheckMiddleware on the client routes that expect `Prosopo-User` and
/// `Prosopo-Site-Key`.
async fn header_check(mut request: Request, next: Next) -> Response {
    let path: String = request.uri().path().to_string();
    if !client_paths_expecting_headers().iter().any(|mount| mounted(&path, mount)) {
        return next.run(request).await;
    }
    let user: Option<String> = header(request.headers(), "prosopo-user").filter(|user| !user.is_empty());
    let site_key: Option<String> = header(request.headers(), "prosopo-site-key").filter(|key| !key.is_empty());
    let (Some(user), Some(site_key)) = (user, site_key) else {
        let body: Value = json!({ "error": "Unauthorized", "message": "Unauthorized" });
        return send_json(&Requested::of(&request), StatusCode::UNAUTHORIZED, Vec::new(), &body);
    };
    let checked = validate_address(&site_key, "API.INVALID_SITE_KEY").and_then(|()| validate_address(&user, "CONTRACT.INVALID_ADDRESS"));
    if let Err(error) = checked {
        return handle_errors(&request, &ThrownError::from(error));
    }
    rebind(&mut request, json!({ "user": user, "siteKey": site_key }), "header-check");
    request.extensions_mut().insert(RequestAccount { user, site_key });
    next.run(request).await
}

/// The admin JWT gate on everything under the admin prefix.
async fn admin_auth(State(auth): State<AuthState>, request: Request, next: Next) -> Response {
    if !mounted(request.uri().path(), ADMIN_PREFIX) {
        return next.run(request).await;
    }
    auth_middleware(State(auth), request, next).await
}

/// What the final handler takes off a page, after the stages inside this one set it.
async fn final_handler_headers(request: Request, next: Next) -> Response {
    let mut response: Response = next.run(request).await;
    if response.extensions().get::<express::FinalHandlerPage>().is_some() {
        for name in ["content-language", "content-encoding", "content-range"] {
            response.headers_mut().remove(name);
        }
    }
    response
}

/// express's 404 for what nothing above answered.
async fn not_found(request: Request) -> Response {
    express::not_found(&request)
}

/// The stages after the public router, ending in express's 404.
#[allow(clippy::too_many_arguments)]
pub fn pipeline(
    state: Arc<PipelineState>,
    request_logger: Logger,
    i18n: Arc<I18n>,
    auth: AuthState,
    verify: Arc<crate::api::verify::VerifyState>,
    block: Arc<BlockState>,
    domain: Arc<DomainState>,
    captcha: Arc<CaptchaState>,
) -> Router {
    Router::new()
        .fallback(not_found)
        .layer(from_fn_with_state(captcha, crate::api::captcha::captcha_routes))
        .layer(from_fn_with_state(domain, crate::api::domain::domain))
        .layer(from_fn_with_state(block, crate::api::block::block))
        .layer(from_fn_with_state(auth, admin_auth))
        .layer(from_fn_with_state(verify, crate::api::verify::verify_routes))
        .layer(from_fn(header_check))
        .layer(from_fn_with_state(state.clone(), request_signals))
        .layer(from_fn_with_state(i18n, i18n_middleware))
        .layer(from_fn(final_handler_headers))
        .layer(from_fn_with_state(request_logger, request_logger_middleware))
        .layer(from_fn(ignore))
        .layer(from_fn(robots))
        .layer(from_fn_with_state(state, rate_limits))
}

/// The limiters startProviderApi mounts: each configured route's, then each access-rule
/// route's, keyed by the admin user on admin routes and by site key on the two verify routes.
pub fn rate_limiters(routes: impl IntoIterator<Item = (String, f64, f64)>) -> Vec<RateLimiter> {
    routes
        .into_iter()
        .map(|(path, window_ms, limit)| {
            let key: RateLimitKey = if AdminApiPaths::ALL.iter().any(|admin| admin.as_str() == path) {
                RateLimitKey::AdminUser
            } else if path == ClientApiPaths::VerifyImageCaptchaSolutionDapp.as_str() || path == ClientApiPaths::VerifyPowCaptchaSolution.as_str() {
                RateLimitKey::SiteKey
            } else {
                RateLimitKey::Ip
            };
            RateLimiter::new(path, window_ms, limit, key)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mounts_as_express_does() {
        assert!(mounted("/v1/prosopo/provider/admin", ADMIN_PREFIX));
        assert!(mounted("/V1/prosopo/provider/ADMIN/x", ADMIN_PREFIX));
        assert!(!mounted("/v1/prosopo/provider/administrator", ADMIN_PREFIX));
        assert!(!mounted("/v1/prosopo", ADMIN_PREFIX));
    }

    #[test]
    fn counts_hits_in_a_window_from_the_first() {
        let limiter: RateLimiter = RateLimiter::new("/x".to_string(), 1000.0, 2.0, RateLimitKey::Ip);
        assert_eq!(limiter.increment("a", 0.0), (1.0, 1000.0));
        assert_eq!(limiter.increment("a", 500.0), (2.0, 1000.0));
        assert_eq!(limiter.increment("b", 600.0), (1.0, 1600.0));
        assert_eq!(limiter.increment("a", 1000.0), (1.0, 2000.0));
    }
}
