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

//! Every Signature-Agent URL points to a well-known JWKS directory. It is
//! fetched on first use and cached for as long as the origin's
//! `Cache-Control: max-age` says (1 h default, 24 h cap). The cache lives in
//! memory only: stale keys are worse than one extra fetch per signer per hour.

use std::collections::VecDeque;
use std::fmt;
use std::future::Future;
use std::pin::Pin;
use std::sync::{Arc, Mutex, MutexGuard, OnceLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use indexmap::IndexMap;
use serde_json::Value;
use url::Url;

use crate::js::{js_min, js_number_to_string, js_string_to_number};

pub const DIRECTORY_PATH: &str = "/.well-known/http-message-signatures-directory";
pub const DEFAULT_TTL_MS: f64 = 60.0 * 60.0 * 1000.0;
/// The signer chooses the cache-control header, so it does not get to pin a
/// key set in memory indefinitely.
pub const MAX_TTL_MS: f64 = 24.0 * 60.0 * 60.0 * 1000.0;
pub const DEFAULT_TIMEOUT_MS: u64 = 3000;
/// A key directory holds a handful of JWKs; anything bigger is not one.
pub const MAX_BODY_BYTES: usize = 64 * 1024;
/// Any request can name a fresh signer URL, so the cache must not grow with
/// attacker input.
pub const MAX_CACHE_ENTRIES: usize = 1000;

pub type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;

/// One entry of a directory's `keys` array, kept as the JSON it arrived as:
/// directories may publish non-Ed25519 keys and arbitrary extra members.
#[derive(Clone, Debug, PartialEq)]
pub struct Jwk(pub Value);

impl Jwk {
    fn string_member(&self, name: &str) -> Option<&str> {
        self.0.get(name).and_then(Value::as_str)
    }

    pub fn kty(&self) -> Option<&str> {
        self.string_member("kty")
    }

    pub fn kid(&self) -> Option<&str> {
        self.string_member("kid")
    }

    pub fn crv(&self) -> Option<&str> {
        self.string_member("crv")
    }

    pub fn x(&self) -> Option<&str> {
        self.string_member("x")
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct JwksFetchError(pub String);

impl fmt::Display for JwksFetchError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for JwksFetchError {}

/// A response body read chunk by chunk, so an oversized directory can be
/// abandoned without buffering it.
pub trait JwksBody: Send {
    fn next_chunk(&mut self) -> BoxFuture<'_, Result<Option<Vec<u8>>, JwksFetchError>>;
}

/// An in-memory body, mainly for tests and injected fetchers.
pub struct ChunkedBody(pub VecDeque<Vec<u8>>);

impl JwksBody for ChunkedBody {
    fn next_chunk(&mut self) -> BoxFuture<'_, Result<Option<Vec<u8>>, JwksFetchError>> {
        let chunk: Option<Vec<u8>> = self.0.pop_front();
        Box::pin(async move { Ok(chunk) })
    }
}

pub struct JwksResponse {
    pub status: u16,
    pub headers: Vec<(String, String)>,
    /// `None` is a null body (as opposed to an empty one).
    pub body: Option<Box<dyn JwksBody>>,
}

impl JwksResponse {
    pub fn from_bytes(status: u16, headers: Vec<(String, String)>, body: Vec<u8>) -> Self {
        JwksResponse {
            status,
            headers,
            body: Some(Box::new(ChunkedBody(VecDeque::from([body])))),
        }
    }

    pub fn ok(&self) -> bool {
        (200..=299).contains(&self.status)
    }

    /// `Headers.get`: case-insensitive, repeated headers joined with `", "`.
    pub fn header(&self, name: &str) -> Option<String> {
        let values: Vec<&str> = self
            .headers
            .iter()
            .filter(|(k, _)| k.eq_ignore_ascii_case(name))
            .map(|(_, v)| v.as_str())
            .collect();
        (!values.is_empty()).then(|| values.join(", "))
    }
}

/// Fetches a JWKS directory URL. Must not follow redirects. The resolver
/// enforces the timeout by dropping the future.
pub trait JwksFetch: Send + Sync {
    fn fetch<'a>(&'a self, url: &'a str) -> BoxFuture<'a, Result<JwksResponse, JwksFetchError>>;
}

/// The real fetcher: reqwest with rustls, redirects treated as errors.
pub struct ReqwestJwksFetch {
    client: reqwest::Client,
}

impl ReqwestJwksFetch {
    pub fn new() -> Result<Self, JwksFetchError> {
        let client: reqwest::Client = reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::custom(
                |attempt: reqwest::redirect::Attempt| attempt.error("redirect not allowed"),
            ))
            .build()
            .map_err(|e: reqwest::Error| JwksFetchError(e.to_string()))?;
        Ok(ReqwestJwksFetch { client })
    }
}

struct ReqwestBody(reqwest::Response);

impl JwksBody for ReqwestBody {
    fn next_chunk(&mut self) -> BoxFuture<'_, Result<Option<Vec<u8>>, JwksFetchError>> {
        Box::pin(async move {
            self.0
                .chunk()
                .await
                .map(|chunk| chunk.map(|bytes| bytes.to_vec()))
                .map_err(|e: reqwest::Error| JwksFetchError(e.to_string()))
        })
    }
}

impl JwksFetch for ReqwestJwksFetch {
    fn fetch<'a>(&'a self, url: &'a str) -> BoxFuture<'a, Result<JwksResponse, JwksFetchError>> {
        Box::pin(async move {
            let response: reqwest::Response = self
                .client
                .get(url)
                .send()
                .await
                .map_err(|e: reqwest::Error| JwksFetchError(e.to_string()))?;
            let headers: Vec<(String, String)> = response
                .headers()
                .iter()
                .map(|(name, value)| {
                    let text: String = value
                        .as_bytes()
                        .iter()
                        .map(|b: &u8| char::from(*b))
                        .collect();
                    (name.as_str().to_string(), text)
                })
                .collect();
            Ok(JwksResponse {
                status: response.status().as_u16(),
                headers,
                body: Some(Box::new(ReqwestBody(response))),
            })
        })
    }
}

fn default_fetch() -> Result<Arc<dyn JwksFetch>, JwksError> {
    static DEFAULT: OnceLock<Result<Arc<dyn JwksFetch>, JwksFetchError>> = OnceLock::new();
    DEFAULT
        .get_or_init(|| ReqwestJwksFetch::new().map(|f| Arc::new(f) as Arc<dyn JwksFetch>))
        .clone()
        .map_err(JwksError::Fetch)
}

#[derive(Clone, Default)]
pub struct JwksResolverOptions {
    /// Defaults to [`ReqwestJwksFetch`].
    pub fetch: Option<Arc<dyn JwksFetch>>,
    /// Overrides the cache-control / default TTL, in milliseconds.
    pub ttl_ms: Option<f64>,
    /// Abandon the fetch (including reading the body) after this long.
    pub timeout_ms: Option<u64>,
    /// Permit http:// and local signer hosts. Only for tests and local
    /// development, where the JWKS is served from a throwaway localhost origin.
    pub allow_local_signers: bool,
}

#[derive(Clone, Debug, PartialEq)]
pub enum JwksError {
    InvalidUrl,
    SignerNotHttps { origin: String },
    SignerHostNotAllowed { hostname: String },
    Fetch(JwksFetchError),
    Timeout,
    Status { status: u16, url: String },
    BodyTooLarge { declared: f64 },
    BodyExceedsLimit,
    InvalidJson(String),
    NullBody,
}

impl fmt::Display for JwksError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            JwksError::InvalidUrl => f.write_str("Invalid URL"),
            JwksError::SignerNotHttps { origin } => write!(f, "signer must be https: {origin}"),
            JwksError::SignerHostNotAllowed { hostname } => {
                write!(f, "signer host not allowed: {hostname}")
            }
            JwksError::Fetch(e) => f.write_str(&e.0),
            JwksError::Timeout => f.write_str("The operation was aborted due to timeout"),
            JwksError::Status { status, url } => write!(f, "JWKS fetch {status} at {url}"),
            JwksError::BodyTooLarge { declared } => {
                write!(
                    f,
                    "JWKS body too large: {} bytes",
                    js_number_to_string(*declared)
                )
            }
            JwksError::BodyExceedsLimit => write!(f, "JWKS body exceeds {MAX_BODY_BYTES} bytes"),
            JwksError::InvalidJson(message) => f.write_str(message),
            JwksError::NullBody => f.write_str("Cannot read properties of null (reading 'keys')"),
        }
    }
}

impl std::error::Error for JwksError {}

fn is_ip_literal(hostname: &str) -> bool {
    if hostname.starts_with('[') {
        return true;
    }
    let parts: Vec<&str> = hostname.split('.').collect();
    parts.len() == 4
        && parts
            .iter()
            .all(|p: &&str| (1..=3).contains(&p.len()) && p.bytes().all(|b: u8| b.is_ascii_digit()))
}

/// The signer URL comes from a request header, so without this any client
/// could make the provider fetch from inside its own network. Signers are
/// public HTTPS origins with DNS names. Names that resolve to private
/// addresses are not caught here.
fn assert_fetchable_signer(url: &Url) -> Result<(), JwksError> {
    if url.scheme() != "https" {
        return Err(JwksError::SignerNotHttps {
            origin: url.origin().ascii_serialization(),
        });
    }
    let hostname: String = url.host_str().unwrap_or("").to_lowercase();
    if is_ip_literal(&hostname)
        || hostname == "localhost"
        || hostname.ends_with(".localhost")
        || !hostname.contains('.')
    {
        return Err(JwksError::SignerHostNotAllowed { hostname });
    }
    Ok(())
}

/// `/max-age=(\d+)/i`, in milliseconds.
fn parse_max_age(header: Option<&str>) -> Option<f64> {
    let header: &str = header.filter(|h: &&str| !h.is_empty())?;
    let lower: String = header.to_ascii_lowercase();
    let mut search_from: usize = 0;
    while let Some(found) = lower[search_from..].find("max-age=") {
        let digits_start: usize = search_from + found + "max-age=".len();
        let digits: &str = &lower[digits_start..];
        let len: usize = digits.bytes().take_while(u8::is_ascii_digit).count();
        if len > 0 {
            return Some(js_string_to_number(&digits[..len]) * 1000.0);
        }
        search_from = search_from + found + 1;
    }
    None
}

async fn read_capped_text(response: JwksResponse) -> Result<String, JwksError> {
    let declared: f64 = response
        .header("content-length")
        .map_or(0.0, |v: String| js_string_to_number(&v));
    if declared > MAX_BODY_BYTES as f64 {
        return Err(JwksError::BodyTooLarge { declared });
    }
    let Some(mut body) = response.body else {
        return Ok(String::new());
    };
    let mut bytes: Vec<u8> = Vec::new();
    while let Some(chunk) = body.next_chunk().await.map_err(JwksError::Fetch)? {
        if bytes.len() + chunk.len() > MAX_BODY_BYTES {
            return Err(JwksError::BodyExceedsLimit);
        }
        bytes.extend_from_slice(&chunk);
    }
    let text: String = String::from_utf8_lossy(&bytes).into_owned();
    Ok(match text.strip_prefix('\u{FEFF}') {
        Some(rest) => rest.to_string(),
        None => text,
    })
}

/// JSON.parse yields IEEE doubles, so large integers lose precision exactly
/// as they do in JS.
fn with_js_numbers(value: Value) -> Value {
    match value {
        Value::Number(n) => match n.as_f64() {
            Some(x) if x.fract() == 0.0 && x.abs() < 9_007_199_254_740_992.0 && x != 0.0 => {
                Value::from(x as i64)
            }
            Some(x) => Value::from(x),
            None => Value::Number(n),
        },
        Value::Array(items) => Value::Array(items.into_iter().map(with_js_numbers).collect()),
        Value::Object(members) => Value::Object(
            members
                .into_iter()
                .map(|(k, v)| (k, with_js_numbers(v)))
                .collect(),
        ),
        other => other,
    }
}

/// `body.keys` when it is an array; a `null` body throws in the TS.
fn keys_of(body: Value) -> Result<Vec<Jwk>, JwksError> {
    match body {
        Value::Null => Err(JwksError::NullBody),
        Value::Object(mut members) => Ok(match members.remove("keys") {
            Some(Value::Array(keys)) => keys.into_iter().map(|k| Jwk(with_js_numbers(k))).collect(),
            _ => Vec::new(),
        }),
        _ => Ok(Vec::new()),
    }
}

struct CacheEntry {
    keys: Vec<Jwk>,
    expires_at: f64,
}

pub type Clock = Box<dyn Fn() -> f64 + Send + Sync>;

fn system_now_ms() -> f64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0.0, |d: Duration| d.as_millis() as f64)
}

/// Holds the JWKS cache and the clock (milliseconds since the epoch, like
/// `Date.now()`) that both cache expiry and signature validity windows use.
pub struct JwksResolver {
    cache: Mutex<IndexMap<String, CacheEntry>>,
    clock: Clock,
}

impl Default for JwksResolver {
    fn default() -> Self {
        Self::new()
    }
}

impl JwksResolver {
    pub fn new() -> Self {
        Self::with_clock(Box::new(system_now_ms))
    }

    pub fn with_clock(clock: Clock) -> Self {
        JwksResolver {
            cache: Mutex::new(IndexMap::new()),
            clock,
        }
    }

    pub fn now_ms(&self) -> f64 {
        (self.clock)()
    }

    fn cache(&self) -> MutexGuard<'_, IndexMap<String, CacheEntry>> {
        self.cache
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    pub fn jwks_cache_size(&self) -> usize {
        self.cache().len()
    }

    pub fn clear_jwks_cache(&self) {
        self.cache().clear();
    }

    fn remember(&self, signer_url: &str, entry: CacheEntry) {
        let now: f64 = self.now_ms();
        let mut cache = self.cache();
        cache.shift_remove(signer_url);
        if cache.len() >= MAX_CACHE_ENTRIES {
            cache.retain(|_, value: &mut CacheEntry| value.expires_at > now);
        }
        while cache.len() >= MAX_CACHE_ENTRIES {
            cache.shift_remove_index(0);
        }
        cache.insert(signer_url.to_string(), entry);
    }

    pub async fn resolve_jwks_from_signature_agent(
        &self,
        signer_url: &str,
        options: &JwksResolverOptions,
    ) -> Result<Vec<Jwk>, JwksError> {
        let now: f64 = self.now_ms();
        if let Some(cached) = self.cache().get(signer_url) {
            if cached.expires_at > now {
                return Ok(cached.keys.clone());
            }
        }

        let directory_url: Url = Url::parse(&format!("{signer_url}/"))
            .and_then(|base: Url| base.join(DIRECTORY_PATH))
            .map_err(|_| JwksError::InvalidUrl)?;
        if !options.allow_local_signers {
            assert_fetchable_signer(&directory_url)?;
        }
        let fetch: Arc<dyn JwksFetch> = match &options.fetch {
            Some(fetch) => Arc::clone(fetch),
            None => default_fetch()?,
        };
        let timeout: Duration =
            Duration::from_millis(options.timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS));
        let directory: &str = directory_url.as_str();
        let fetched = async {
            let response: JwksResponse = fetch.fetch(directory).await.map_err(JwksError::Fetch)?;
            if !response.ok() {
                return Err(JwksError::Status {
                    status: response.status,
                    url: directory.to_string(),
                });
            }
            let cache_control: Option<String> = response.header("cache-control");
            let text: String = read_capped_text(response).await?;
            Ok((cache_control, text))
        };
        let (cache_control, text): (Option<String>, String) =
            tokio::time::timeout(timeout, fetched)
                .await
                .map_err(|_| JwksError::Timeout)??;

        let body: Value = serde_json::from_str(&text)
            .map_err(|e: serde_json::Error| JwksError::InvalidJson(e.to_string()))?;
        let keys: Vec<Jwk> = keys_of(body)?;

        let ttl: f64 = js_min(
            options
                .ttl_ms
                .or_else(|| parse_max_age(cache_control.as_deref()))
                .unwrap_or(DEFAULT_TTL_MS),
            MAX_TTL_MS,
        );
        self.remember(
            signer_url,
            CacheEntry {
                keys: keys.clone(),
                expires_at: now + ttl,
            },
        );
        Ok(keys)
    }
}

/// The process-wide resolver, the counterpart of the TS module-level cache.
pub fn global_jwks_resolver() -> &'static JwksResolver {
    static GLOBAL: OnceLock<JwksResolver> = OnceLock::new();
    GLOBAL.get_or_init(JwksResolver::new)
}

pub async fn resolve_jwks_from_signature_agent(
    signer_url: &str,
    options: &JwksResolverOptions,
) -> Result<Vec<Jwk>, JwksError> {
    global_jwks_resolver()
        .resolve_jwks_from_signature_agent(signer_url, options)
        .await
}

pub fn jwks_cache_size() -> usize {
    global_jwks_resolver().jwks_cache_size()
}

pub fn clear_jwks_cache() {
    global_jwks_resolver().clear_jwks_cache();
}
