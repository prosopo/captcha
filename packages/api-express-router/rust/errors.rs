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

//! `handleErrors` (errorHandler.ts), and the responses express writes.

use crate::context::RequestI18n;
use axum::body::Body;
use axum::response::Response;
use http::header::{CONTENT_TYPE, HeaderValue};
use http::StatusCode;
use hyper::ext::ReasonPhrase;
use prosopo_common::{unwrap_error, ThrownError, UnwrappedError};
use prosopo_locale::I18nLookup;
use prosopo_logger::json_stringify;
use serde_json::{json, Value};

/// `res.status(code).json(body)`, with `res.statusMessage` set to `reason`: the body written
/// as `JSON.stringify` writes it.
pub fn json_response(code: u16, reason: &str, body: &Value) -> Response {
    let status: StatusCode = StatusCode::from_u16(code).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let mut response: Response = Response::new(Body::from(json_stringify(body, 0)));
    *response.status_mut() = status;
    response
        .headers_mut()
        .insert(CONTENT_TYPE, HeaderValue::from_static("application/json; charset=utf-8"));
    if status.canonical_reason() != Some(reason) {
        if let Ok(phrase) = ReasonPhrase::try_from(reason.as_bytes().to_vec()) {
            response.extensions_mut().insert(phrase);
        }
    }
    response
}

/// `handleErrors`: the error as `{ error }`, its status and reason phrase as
/// `unwrapError` gives them, in the request's language.
pub fn error_response(error: &ThrownError, i18n: Option<&RequestI18n>) -> Response {
    let lookup = i18n.map(RequestI18n::lookup);
    let UnwrappedError { code, status_message, json_error } =
        unwrap_error(error, lookup.as_ref().map(|lookup| lookup as &dyn I18nLookup));
    let body: Value = json!({ "error": json_error });
    json_response(code, status_message, &body)
}

/// What express's final handler answers a request no route took: `Cannot <METHOD> <path>` as
/// a small HTML page, with its two protective headers.
pub fn not_found(method: &str, path: &str) -> Response {
    let message: String = escape_html(&format!("Cannot {method} {}", encode_url(path)));
    let message: String = message.replace('\n', "<br>").replace("  ", " &nbsp;");
    let document: String = format!(
        "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>{message}</pre>\n</body>\n</html>\n"
    );
    let mut response: Response = Response::new(Body::from(document));
    *response.status_mut() = StatusCode::NOT_FOUND;
    let headers = response.headers_mut();
    headers.insert("content-security-policy", HeaderValue::from_static("default-src 'none'"));
    headers.insert("x-content-type-options", HeaderValue::from_static("nosniff"));
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("text/html; charset=utf-8"));
    response
}

/// `escape-html`.
fn escape_html(text: &str) -> String {
    text.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;").replace('\'', "&#39;")
}

/// `encodeurl`: percent-encodes what is not already a valid URL character, leaving existing
/// escapes alone.
fn encode_url(path: &str) -> String {
    let bytes: &[u8] = path.as_bytes();
    let mut out: String = String::new();
    let mut index: usize = 0;
    while index < bytes.len() {
        let byte: u8 = bytes[index];
        let escaped: bool =
            byte == b'%' && bytes.get(index + 1).is_some_and(u8::is_ascii_hexdigit) && bytes.get(index + 2).is_some_and(u8::is_ascii_hexdigit);
        let allowed: bool = byte.is_ascii_alphanumeric() || b"!#$&'()*+,-./:;=?@[]_~".contains(&byte);
        if allowed || escaped {
            out.push(byte as char);
        } else {
            out.push_str(&format!("%{byte:02X}"));
        }
        index += 1;
    }
    out
}
