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

//! `express.urlencoded({ extended: true })` (body-parser 1.20 with qs 6): a form body read into
//! `req.body`. Keys are read flat: qs's bracket syntax (`a[b]=c`, `a[]=c`) is not expanded.

use axum::body::{to_bytes, Body};
use axum::extract::Request;
use axum::response::Response;
use http::{HeaderMap, Method, StatusCode};
use prosopo_api_route::schema::string_to_number;
use prosopo_api_router::RequestBody;
use prosopo_provider::api::express::{error_page, header};
use serde_json::{Map, Value};

/// body-parser's default `limit`, 100kb.
pub const LIMIT: usize = 100 * 1024;

const PARAMETER_LIMIT: usize = 1000;

/// The keys qs drops because they name a property of `Object.prototype`.
const PROTOTYPE_KEYS: [&str; 12] = [
    "__proto__",
    "__defineGetter__",
    "__defineSetter__",
    "__lookupGetter__",
    "__lookupSetter__",
    "constructor",
    "hasOwnProperty",
    "isPrototypeOf",
    "propertyIsEnumerable",
    "toLocaleString",
    "toString",
    "valueOf",
];

/// type-is's `hasBody`: `!isNaN(content-length)`, so an empty length counts.
pub fn has_body(headers: &HeaderMap) -> bool {
    headers.contains_key(http::header::TRANSFER_ENCODING) || header(headers, "content-length").is_some_and(|length| !string_to_number(&length).is_nan())
}

fn media_type(content_type: &str) -> String {
    content_type.split(';').next().unwrap_or_default().trim().to_lowercase()
}

pub fn is_urlencoded(headers: &HeaderMap) -> bool {
    header(headers, "content-type").is_some_and(|content_type| media_type(&content_type) == "application/x-www-form-urlencoded")
}

fn charset(content_type: &str) -> Option<String> {
    content_type.split(';').skip(1).find_map(|parameter| {
        let (name, value) = parameter.split_once('=')?;
        (name.trim().eq_ignore_ascii_case("charset")).then(|| value.trim().trim_matches('"').to_lowercase())
    })
}

/// qs's decoder: `+` is a space, then `decodeURIComponent`, or the text as it was when that throws.
fn decode(text: &str) -> String {
    let spaced: String = text.replace('+', " ");
    let bytes: &[u8] = spaced.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(bytes.len());
    let mut at: usize = 0;
    while at < bytes.len() {
        if bytes[at] == b'%' {
            let byte: Option<u8> = spaced.get(at + 1..at + 3).and_then(|hex| u8::from_str_radix(hex, 16).ok());
            match byte {
                Some(byte) => {
                    out.push(byte);
                    at += 3;
                    continue;
                }
                None => return spaced,
            }
        }
        out.push(bytes[at]);
        at += 1;
    }
    String::from_utf8(out).unwrap_or(spaced)
}

/// qs's `parse` of a body, flat: a repeated key collects its values in an array.
pub fn parse(text: &str) -> Value {
    let mut out: Map<String, Value> = Map::new();
    for part in text.split('&').take(PARAMETER_LIMIT) {
        if part.is_empty() {
            continue;
        }
        let split_at: Option<usize> = part.find("]=").map(|at| at + 1).or_else(|| part.find('='));
        let (key, value): (String, String) = match split_at {
            Some(at) => (decode(&part[..at]), decode(&part[at + 1..])),
            None => (decode(part), String::new()),
        };
        if key.is_empty() || PROTOTYPE_KEYS.contains(&key.as_str()) {
            continue;
        }
        match out.get_mut(&key) {
            Some(Value::Array(values)) => values.push(Value::String(value)),
            Some(existing) => {
                let first: Value = existing.take();
                *existing = Value::Array(vec![first, Value::String(value)]);
            }
            None => {
                out.insert(key, Value::String(value));
            }
        }
    }
    Value::Object(out)
}

/// The request with `RequestBody` holding the parsed form, or the page express answers when the
/// body cannot be read.
pub async fn form_body_within(request: Request, limit: usize) -> Result<Request, Box<Response>> {
    let method: Method = request.method().clone();
    let refuse = |status: StatusCode| Box::new(error_page(&method, status));
    let content_type: String = header(request.headers(), "content-type").unwrap_or_default();
    if charset(&content_type).is_some_and(|charset| charset != "utf-8") {
        return Err(refuse(StatusCode::UNSUPPORTED_MEDIA_TYPE));
    }
    let declared: Option<usize> = header(request.headers(), "content-length").and_then(|length| length.trim().parse().ok());
    if declared.is_some_and(|length| length > limit) {
        return Err(refuse(StatusCode::PAYLOAD_TOO_LARGE));
    }
    let (parts, body) = request.into_parts();
    let raw = to_bytes(body, limit + 1).await.map_err(|_| refuse(StatusCode::PAYLOAD_TOO_LARGE))?;
    if raw.len() > limit {
        return Err(refuse(StatusCode::PAYLOAD_TOO_LARGE));
    }
    if raw.iter().filter(|&&byte| byte == b'&').count() >= PARAMETER_LIMIT {
        return Err(refuse(StatusCode::PAYLOAD_TOO_LARGE));
    }
    let mut request: Request = Request::from_parts(parts, Body::empty());
    request.extensions_mut().insert(RequestBody(parse(&String::from_utf8_lossy(&raw))));
    Ok(request)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn parses_as_qs_does_for_flat_keys() {
        assert_eq!(parse("email=a%40b.c&password=pw"), json!({ "email": "a@b.c", "password": "pw" }));
        assert_eq!(parse("a=1&a=2&a=3"), json!({ "a": ["1", "2", "3"] }));
        assert_eq!(parse("plus=a+b%2Bc&tick=%E2%9C%93"), json!({ "plus": "a b+c", "tick": "\u{2713}" }));
        assert_eq!(parse("flag&empty=&=x"), json!({ "flag": "", "empty": "" }));
        assert_eq!(parse("bad=%E0%A4%A&ok=1"), json!({ "bad": "%E0%A4%A", "ok": "1" }));
        assert_eq!(parse("toString=x&__proto__=y&keep=z"), json!({ "keep": "z" }));
    }

    #[test]
    fn reads_the_media_type_and_charset() {
        assert_eq!(media_type("Application/X-WWW-Form-Urlencoded; charset=UTF-8"), "application/x-www-form-urlencoded");
        assert_eq!(charset("application/x-www-form-urlencoded; charset=\"UTF-8\"").as_deref(), Some("utf-8"));
        assert_eq!(charset("application/x-www-form-urlencoded").as_deref(), None);
    }
}
