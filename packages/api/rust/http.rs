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

//! api/HttpClientBase.ts and HttpError.ts: JSON over HTTP, with a time budget that covers
//! the body as well as the headers.

use serde::Serialize;
use serde_json::Value;
use std::fmt;
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::time::Duration;

/// A failed response that was not JSON (and not a 400), which the caller cannot read.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HttpError {
    pub status: u16,
    pub status_text: String,
    pub url: String,
}

impl fmt::Display for HttpError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "HTTP error! status: {} ({}) for URL: {}",
            self.status, self.status_text, self.url
        )
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ApiError {
    Http(HttpError),
    /// The request failed before a response arrived (`fetch` rejecting).
    Network(String),
    /// The request outlived the client's time budget (the TS `TimeoutError`).
    TimedOut,
    /// The body was not JSON (`response.json()`'s `SyntaxError`).
    InvalidJson(String),
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ApiError::Http(error) => error.fmt(f),
            ApiError::Network(message) | ApiError::InvalidJson(message) => f.write_str(message),
            ApiError::TimedOut => f.write_str("The operation was aborted due to timeout"),
        }
    }
}

impl std::error::Error for ApiError {}

/// Headers as an object spread builds them: a later value for a name replaces the earlier
/// one in place, and names compare exactly, as object keys do.
pub type Headers = Vec<(String, String)>;

fn spread(target: &mut Headers, source: &[(String, String)]) {
    for (name, value) in source {
        match target.iter_mut().find(|(existing, _)| existing == name) {
            Some(entry) => entry.1 = value.clone(),
            None => target.push((name.clone(), value.clone())),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HttpRequest {
    pub url: String,
    pub method: String,
    pub headers: Headers,
    pub body: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HttpResponse {
    pub status: u16,
    pub status_text: String,
    /// The final url, after any redirects.
    pub url: String,
    pub content_type: Option<String>,
    pub body: Vec<u8>,
}

pub type TransportFuture = Pin<Box<dyn Future<Output = Result<HttpResponse, ApiError>> + Send>>;

/// Sends a request and reads the whole body; injected so tests need no network.
pub trait Transport: Send + Sync {
    fn send(&self, request: HttpRequest) -> TransportFuture;
}

/// `fetch` over reqwest. The status text is the canonical reason phrase: undici reports the
/// server's own, which reqwest does not expose. A network failure is undici's "fetch failed".
#[derive(Default)]
pub struct ReqwestTransport {
    client: reqwest::Client,
}

impl Transport for ReqwestTransport {
    fn send(&self, request: HttpRequest) -> TransportFuture {
        let method = reqwest::Method::from_bytes(request.method.as_bytes());
        let client: reqwest::Client = self.client.clone();
        Box::pin(async move {
            let method = method.map_err(|_| {
                ApiError::Network(format!("'{}' is not a valid HTTP method.", request.method))
            })?;
            let mut builder = client.request(method, &request.url);
            for (name, value) in &request.headers {
                builder = builder.header(name, value);
            }
            if let Some(body) = request.body {
                builder = builder.body(body);
            }
            let response = builder
                .send()
                .await
                .map_err(|_| ApiError::Network("fetch failed".to_string()))?;
            let status: reqwest::StatusCode = response.status();
            let url: String = response.url().to_string();
            let content_type: Option<String> = response
                .headers()
                .get(reqwest::header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok())
                .map(str::to_string);
            let body = response
                .bytes()
                .await
                .map_err(|_| ApiError::Network("terminated".to_string()))?;
            Ok(HttpResponse {
                status: status.as_u16(),
                status_text: status.canonical_reason().unwrap_or("").to_string(),
                url,
                content_type,
                body: body.to_vec(),
            })
        })
    }
}

/// The part of `RequestInit` a call may pass.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct RequestOptions {
    pub method: Option<String>,
    pub headers: Option<Headers>,
}

#[derive(Clone, Default)]
pub struct ClientOptions {
    /// Without one, a stalled request is left to the transport's own limits.
    pub timeout_ms: Option<u64>,
    /// Sent with every request, under any headers the call itself passes.
    pub default_headers: Headers,
    pub transport: Option<Arc<dyn Transport>>,
}

/// `HttpClientBase`. Responses are returned as parsed, unchecked JSON, as the TS casts them.
#[derive(Clone)]
pub struct HttpClient {
    base_url: String,
    timeout: Option<Duration>,
    default_headers: Headers,
    transport: Arc<dyn Transport>,
}

/// `response.json()`: the body decoded as UTF-8, less any byte order mark, then parsed.
fn parse_body(body: &[u8]) -> Result<Value, ApiError> {
    let text = String::from_utf8_lossy(body.strip_prefix(b"\xEF\xBB\xBF").unwrap_or(body));
    serde_json::from_str(&text).map_err(|error| ApiError::InvalidJson(error.to_string()))
}

impl HttpClient {
    pub fn new(base_url: &str, prefix: &str, options: ClientOptions) -> HttpClient {
        HttpClient {
            base_url: format!("{base_url}{prefix}"),
            timeout: options.timeout_ms.map(Duration::from_millis),
            default_headers: options.default_headers,
            transport: options
                .transport
                .unwrap_or_else(|| Arc::new(ReqwestTransport::default())),
        }
    }

    pub fn base_url(&self) -> &str {
        &self.base_url
    }

    /// Only throws for a failure the caller cannot read: a non-2xx that is neither a 400 nor
    /// JSON. A JSON error body is handed back.
    async fn exchange(&self, request: HttpRequest) -> Result<Value, ApiError> {
        let pending: TransportFuture = self.transport.send(request);
        let response: HttpResponse = match self.timeout {
            Some(timeout) => tokio::time::timeout(timeout, pending)
                .await
                .map_err(|_| ApiError::TimedOut)??,
            None => pending.await?,
        };
        let is_json: bool = response
            .content_type
            .as_deref()
            .is_some_and(|content_type| content_type.contains("application/json"));
        if !(200..300).contains(&response.status) && response.status != 400 && !is_json {
            return Err(ApiError::Http(HttpError {
                status: response.status,
                status_text: response.status_text,
                url: response.url,
            }));
        }
        parse_body(&response.body)
    }

    /// `fetch(input, init)`: a GET unless `options` names another method.
    pub async fn fetch(&self, input: &str, options: RequestOptions) -> Result<Value, ApiError> {
        let headers: Headers = if self.default_headers.is_empty() {
            options.headers.unwrap_or_default()
        } else {
            let mut headers: Headers = self.default_headers.clone();
            spread(&mut headers, &options.headers.unwrap_or_default());
            headers
        };
        self.exchange(HttpRequest {
            url: format!("{}{input}", self.base_url),
            method: options.method.unwrap_or_else(|| "GET".to_string()),
            headers,
            body: None,
        })
        .await
    }

    /// `post(input, body, init)`: `body` as JSON (`None` sends none), with a JSON content type
    /// under the default headers, under the call's own.
    pub async fn post<B: Serialize + ?Sized>(
        &self,
        input: &str,
        body: Option<&B>,
        options: RequestOptions,
    ) -> Result<Value, ApiError> {
        let mut headers: Headers =
            vec![("Content-Type".to_string(), "application/json".to_string())];
        spread(&mut headers, &self.default_headers);
        spread(&mut headers, &options.headers.unwrap_or_default());
        let body: Option<String> = body
            .map(serde_json::to_string)
            .transpose()
            .map_err(|error| ApiError::InvalidJson(error.to_string()))?;
        self.exchange(HttpRequest {
            url: format!("{}{input}", self.base_url),
            method: options.method.unwrap_or_else(|| "POST".to_string()),
            headers,
            body,
        })
        .await
    }
}
