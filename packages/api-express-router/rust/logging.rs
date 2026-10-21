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

//! `requestLoggerMiddleware` (requestLoggerMiddleware.ts).

use crate::context::{RequestBody, RequestLog};
use axum::extract::{Request, State};
use axum::middleware::Next;
use axum::response::Response;
use http::header::HeaderValue;
use prosopo_logger::{get_logger, LogLevel, LogObject, LogRecord, Logger};
use serde_json::{json, Value};
use std::time::Instant;

/// Probes whose request and response lines would drown out the rest.
pub const HEALTH_CHECK_PATHS: [&str; 3] = ["/healthz", "/health", "/readyz"];

/// A header's value as Node hands express a custom header: repeated ones joined with ", ".
fn header_value(request: &Request, name: &str) -> Option<String> {
    let values: Vec<&str> = request.headers().get_all(name).iter().filter_map(|value| value.to_str().ok()).collect();
    Some(values.join(", ")).filter(|value| !value.is_empty())
}

/// Logs the response line once, as `"finish"` when the response was handed back, or
/// `"close"` when the request was dropped first.
struct ResponseLine {
    logger: Logger,
    method: String,
    path: String,
    started: Instant,
    status: Option<u16>,
}

impl ResponseLine {
    fn emit(&mut self, outcome: &str) {
        let duration_ms: f64 = self.started.elapsed().as_secs_f64() * 1000.0;
        let status: Value = self.status.map(Value::from).unwrap_or(json!(200));
        self.logger.info(|| {
            LogRecord::msg("Response sent").with_data(json!({
                "method": self.method,
                "path": self.path,
                "status": status,
                "durationMs": duration_ms,
                "outcome": outcome,
            }))
        });
    }
}

impl Drop for ResponseLine {
    fn drop(&mut self) {
        if self.status.is_none() {
            self.emit("close");
        }
    }
}

/// The logger requests are logged under: `provider:request` at the configured level.
pub fn request_logger(log_level: LogLevel) -> Logger {
    get_logger(log_level, "provider:request")
}

/// `requestLoggerMiddleware(env)`: the request's id (an upstream proxy's `x-request-id`, or a
/// fresh `e-<uuid>`), echoed on the response, and `base` bound to it, the user, the site key
/// and the session, which the handlers log through. Each request but a health probe gets a
/// received line and a sent line.
pub async fn request_logger_middleware(State(base): State<Logger>, mut request: Request, next: Next) -> Response {
    let request_id: String = request
        .headers()
        .get("x-request-id")
        .and_then(|value| value.to_str().ok())
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| format!("e-{}", uuid::Uuid::new_v4()));
    let mut bindings: LogObject = LogObject::new();
    bindings.insert("requestId".to_string(), json!(request_id));
    if let Some(user) = header_value(&request, "prosopo-user") {
        bindings.insert("user".to_string(), json!(user));
    }
    if let Some(site_key) = header_value(&request, "prosopo-site-key") {
        bindings.insert("siteKey".to_string(), json!(site_key));
    }
    let session_id: Option<Value> = request
        .extensions()
        .get::<RequestBody>()
        .and_then(|body| body.0.get("sessionId"))
        .filter(|session_id| truthy(session_id))
        .cloned();
    if let Some(session_id) = session_id {
        bindings.insert("sessionId".to_string(), session_id);
    }
    let logger: Logger = base.with(&bindings, None);
    request.extensions_mut().insert(RequestLog {
        logger: logger.clone(),
        request_id: request_id.clone(),
    });
    let header: Option<HeaderValue> = HeaderValue::from_str(&request_id).ok();
    let path: String = request.uri().path().to_string();
    let mut response: Response = if HEALTH_CHECK_PATHS.contains(&path.as_str()) {
        next.run(request).await
    } else {
        let method: String = request.method().to_string();
        logger.info(|| LogRecord::msg("Request received").with_data(json!({ "method": method, "path": path })));
        let mut line: ResponseLine = ResponseLine {
            logger,
            method,
            path,
            started: Instant::now(),
            status: None,
        };
        let response: Response = next.run(request).await;
        line.status = Some(response.status().as_u16());
        line.emit("finish");
        response
    };
    if let Some(header) = header {
        response.headers_mut().insert("x-request-id", header);
    }
    response
}

/// JS truthiness.
fn truthy(value: &Value) -> bool {
    match value {
        Value::Null | Value::Bool(false) => false,
        Value::String(text) => !text.is_empty(),
        Value::Number(number) => number.as_f64().is_some_and(|n| n != 0.0 && !n.is_nan()),
        _ => true,
    }
}
