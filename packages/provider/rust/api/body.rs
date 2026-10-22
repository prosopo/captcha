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

//! `express.json({ limit: "1mb" })` (body-parser 1.20): a JSON body read into `req.body`, and
//! the request refused, through express's final handler, when the body cannot be read.
//!
//! What it refuses that the TS reads: a body in a `utf-*` charset other than UTF-8 and
//! UTF-16LE/BE, and JSON that `JSON.parse` accepts but a JSON value cannot hold (a lone
//! surrogate escape, a number beyond the double range) or that nests 128 or more deep, a
//! bound kept so that a 1 MB body cannot exhaust the stack.

use crate::api::express::{error_page, header};
use axum::body::{to_bytes, Body};
use axum::extract::Request;
use axum::middleware::Next;
use axum::response::Response;
use bytes::Bytes;
use flate2::read::{MultiGzDecoder, ZlibDecoder};
use http::{HeaderMap, StatusCode};
use prosopo_api_router::RequestBody;
use serde_json::{json, Value};
use std::io::Read;

pub const JSON_LIMIT: usize = 1024 * 1024;

/// `DETECTOR_POOL_BODY_LIMIT`, 128 MB, for a detector pool push carrying a valid admin token.
pub const DETECTOR_POOL_LIMIT: usize = 128 * 1024 * 1024;

/// The keys whose admin token earns a pool push the larger limit: the provider's pair and the
/// admin account.
pub type PoolPushKeys = std::sync::Arc<Vec<std::sync::Arc<dyn prosopo_api_router::AdminKey>>>;

/// `hasValidAdminJwt`: a bearer token either key verifies with no further options.
fn has_valid_admin_jwt(headers: &HeaderMap, keys: &PoolPushKeys) -> bool {
    let Some(jwt) = header(headers, "authorization").and_then(|value| value.strip_prefix("Bearer ").map(str::to_string)) else {
        return false;
    };
    keys.iter().any(|key| key.jwt_verify(&jwt, &prosopo_util_crypto::jwt::JwtVerifyOptions::default()).is_ok_and(|result| result.is_valid))
}

fn is_token_byte(byte: u8) -> bool {
    byte.is_ascii_alphanumeric() || b"!#$%&'*+-.^_`|~".contains(&byte)
}

fn is_media_type(text: &str) -> bool {
    match text.split_once('/') {
        Some((kind, subtype)) => !kind.is_empty() && !subtype.is_empty() && kind.bytes().chain(subtype.bytes()).all(is_token_byte),
        None => false,
    }
}

/// What a quoted parameter value may hold, which differs between the two packages.
struct Grammar {
    quoted: fn(char) -> bool,
    escaped: fn(char) -> bool,
}

fn quoted_text(c: char) -> bool {
    c == ' ' || c == '!' || ('\u{23}'..='\u{5b}').contains(&c) || ('\u{5d}'..='\u{7e}').contains(&c) || ('\u{80}'..='\u{ff}').contains(&c)
}

/// media-typer 0.3, which type-is uses.
const MEDIA_TYPER: Grammar = Grammar {
    quoted: quoted_text,
    escaped: |c: char| (' '..='\u{7e}').contains(&c),
};

/// content-type 1.0, which body-parser reads the charset with.
const CONTENT_TYPE: Grammar = Grammar {
    quoted: |c: char| c == '\u{b}' || quoted_text(c),
    escaped: |c: char| c == '\u{b}' || (' '..='\u{ff}').contains(&c),
};

/// One `; key=value` of a media type at `from`, as the packages' parameter pattern matches it:
/// the key, the raw value and where the match ends.
fn parameter(text: &str, from: usize, grammar: &Grammar) -> Option<(String, String, usize)> {
    let chars: Vec<(usize, char)> = text[from..].char_indices().map(|(offset, c)| (from + offset, c)).collect();
    let mut index: usize = 0;
    let at = |index: usize| chars.get(index).map(|&(_, c)| c);
    if at(index) != Some(';') {
        return None;
    }
    index += 1;
    while at(index) == Some(' ') {
        index += 1;
    }
    let key_start: usize = index;
    while at(index).is_some_and(|c| c.is_ascii() && is_token_byte(c as u8)) {
        index += 1;
    }
    if index == key_start {
        return None;
    }
    let key: String = chars[key_start..index].iter().map(|&(_, c)| c).collect();
    while at(index) == Some(' ') {
        index += 1;
    }
    if at(index) != Some('=') {
        return None;
    }
    index += 1;
    while at(index) == Some(' ') {
        index += 1;
    }
    let value_start: usize = index;
    if at(index) == Some('"') {
        index += 1;
        loop {
            match at(index) {
                Some('"') => {
                    index += 1;
                    break;
                }
                Some('\\') if at(index + 1).is_some_and(grammar.escaped) => index += 2,
                Some(c) if (grammar.quoted)(c) => index += 1,
                _ => return None,
            }
        }
    } else {
        while at(index).is_some_and(|c| c.is_ascii() && is_token_byte(c as u8)) {
            index += 1;
        }
        if index == value_start {
            return None;
        }
    }
    let value: String = chars[value_start..index].iter().map(|&(_, c)| c).collect();
    while at(index) == Some(' ') {
        index += 1;
    }
    let end: usize = chars.get(index).map_or(text.len(), |&(offset, _)| offset);
    Some((key, value, end))
}

/// The parameters after the type, or `None` when they do not parse to the end.
fn parameters(text: &str, grammar: &Grammar) -> Option<Vec<(String, String)>> {
    let Some(mut index) = text.find(';') else {
        return Some(Vec::new());
    };
    let mut found: Vec<(String, String)> = Vec::new();
    while let Some((key, value, end)) = parameter(text, index, grammar) {
        found.push((key, value));
        index = end;
    }
    (index == text.len()).then_some(found)
}

/// type-is over media-typer 0.3: whether the request's type is `application/json`.
fn is_json(content_type: &str) -> bool {
    let kind: &str = content_type.split(';').next().unwrap_or_default();
    is_media_type(kind) && parameters(content_type, &MEDIA_TYPER).is_some() && kind.to_lowercase() == "application/json"
}

/// The `content-type` package's charset parameter, lower-cased; `None` when the header does
/// not parse.
fn charset(content_type: &str) -> Option<String> {
    let kind: &str = content_type.split(';').next().unwrap_or_default().trim();
    if !is_media_type(kind) {
        return None;
    }
    let parameters: Vec<(String, String)> = parameters(content_type, &CONTENT_TYPE)?;
    let (_, value) = parameters.into_iter().rev().find(|(key, _)| key.to_lowercase() == "charset")?;
    let value: String = match value.strip_prefix('"').and_then(|inner| inner.strip_suffix('"')) {
        Some(inner) => {
            let mut unescaped: String = String::new();
            let mut chars = inner.chars();
            while let Some(c) = chars.next() {
                unescaped.push(if c == '\\' { chars.next().unwrap_or(c) } else { c });
            }
            unescaped
        }
        None => value,
    };
    Some(value.to_lowercase())
}

/// `typeis.hasBody`: a transfer encoding, or a content length JS reads as a number.
fn has_body(headers: &HeaderMap) -> bool {
    headers.contains_key(http::header::TRANSFER_ENCODING)
        || header(headers, "content-length").is_some_and(|length| {
            let trimmed: &str = length.trim();
            trimmed.is_empty() || trimmed.parse::<f64>().is_ok()
        })
}

enum Refusal {
    Status(StatusCode),
}

fn decode(bytes: &[u8], charset: &str) -> Result<String, Refusal> {
    let text: String = match charset {
        "utf-8" => String::from_utf8_lossy(bytes).into_owned(),
        "utf-16le" | "utf-16be" => {
            let units: Vec<u16> = bytes
                .chunks(2)
                .map(|pair| {
                    let pair: [u8; 2] = [pair[0], pair.get(1).copied().unwrap_or(0)];
                    if charset == "utf-16le" { u16::from_le_bytes(pair) } else { u16::from_be_bytes(pair) }
                })
                .collect();
            char::decode_utf16(units).map(|unit| unit.unwrap_or(char::REPLACEMENT_CHARACTER)).collect()
        }
        _ => return Err(Refusal::Status(StatusCode::UNSUPPORTED_MEDIA_TYPE)),
    };
    Ok(text.strip_prefix('\u{feff}').map(str::to_string).unwrap_or(text))
}

fn inflate(raw: &[u8], encoding: &str, limit: usize) -> Result<Vec<u8>, Refusal> {
    let reader: Box<dyn Read + '_> = match encoding {
        "gzip" => Box::new(MultiGzDecoder::new(raw)),
        "deflate" => Box::new(ZlibDecoder::new(raw)),
        _ => return Ok(raw.to_vec()),
    };
    let mut inflated: Vec<u8> = Vec::new();
    reader
        .take(limit as u64 + 1)
        .read_to_end(&mut inflated)
        .map_err(|_| Refusal::Status(StatusCode::BAD_REQUEST))?;
    if inflated.len() > limit {
        return Err(Refusal::Status(StatusCode::PAYLOAD_TOO_LARGE));
    }
    Ok(inflated)
}

/// body-parser's `parse`: nothing is `{}`, and strict mode wants an object or an array.
fn parse(text: &str) -> Result<Value, Refusal> {
    if text.is_empty() {
        return Ok(json!({}));
    }
    let first: Option<char> = text.chars().find(|c| !matches!(c, ' ' | '\t' | '\n' | '\r'));
    if !matches!(first, Some('{') | Some('[')) {
        return Err(Refusal::Status(StatusCode::BAD_REQUEST));
    }
    serde_json::from_str(text).map_err(|_| Refusal::Status(StatusCode::BAD_REQUEST))
}

async fn read(request: Request, content_type: &str, limit: usize) -> Result<(http::request::Parts, Value), Refusal> {
    let charset: String = charset(content_type).unwrap_or_else(|| "utf-8".to_string());
    if !charset.starts_with("utf-") {
        return Err(Refusal::Status(StatusCode::UNSUPPORTED_MEDIA_TYPE));
    }
    let encoding: String = header(request.headers(), "content-encoding").unwrap_or_else(|| "identity".to_string()).to_lowercase();
    if !matches!(encoding.as_str(), "identity" | "gzip" | "deflate") {
        return Err(Refusal::Status(StatusCode::UNSUPPORTED_MEDIA_TYPE));
    }
    let declared: Option<f64> = (encoding == "identity")
        .then(|| header(request.headers(), "content-length"))
        .flatten()
        .map(|length| prosopo_util::parse_int(&length, 10))
        .filter(|length| !length.is_nan());
    if declared.is_some_and(|length| length > limit as f64) {
        return Err(Refusal::Status(StatusCode::PAYLOAD_TOO_LARGE));
    }
    let raw_limit: usize = if encoding == "identity" { limit + 1 } else { 2 * limit + 64 };
    let (parts, body) = request.into_parts();
    let raw: Bytes = to_bytes(body, raw_limit).await.map_err(|_| Refusal::Status(StatusCode::PAYLOAD_TOO_LARGE))?;
    if encoding == "identity" && raw.len() > limit {
        return Err(Refusal::Status(StatusCode::PAYLOAD_TOO_LARGE));
    }
    if declared.is_some_and(|length| length != raw.len() as f64) {
        return Err(Refusal::Status(StatusCode::BAD_REQUEST));
    }
    let inflated: Vec<u8> = inflate(&raw, &encoding, limit)?;
    let text: String = decode(&inflated, &charset)?;
    Ok((parts, parse(&text)?))
}

/// The middleware: `RequestBody` holds the parsed body, or `{}` when there was none to parse.
/// A detector pool push with a valid admin token is read with the larger limit, as
/// `detectorPoolBodyParser` reads it ahead of `express.json`.
pub async fn json_body(axum::extract::State(keys): axum::extract::State<PoolPushKeys>, request: Request, next: Next) -> Response {
    let pool_push: bool = crate::api::pipeline::mounted(request.uri().path(), prosopo_types::provider_api::AdminApiPaths::ReplaceDetectorPool.as_str())
        && has_valid_admin_jwt(request.headers(), &keys);
    let limit: usize = if pool_push { DETECTOR_POOL_LIMIT } else { JSON_LIMIT };
    match json_body_within(request, limit).await {
        Ok(request) => next.run(request).await,
        Err(page) => *page,
    }
}

/// `express.json({ limit })`: the request with `RequestBody` holding the parsed body, or `{}`
/// when there was none to parse; or the page express answers when the body cannot be read.
pub async fn json_body_within(request: Request, limit: usize) -> Result<Request, Box<Response>> {
    let content_type: Option<String> = header(request.headers(), "content-type");
    let parse_it: bool = has_body(request.headers()) && content_type.as_deref().is_some_and(is_json);
    if !parse_it {
        let mut request: Request = request;
        request.extensions_mut().insert(RequestBody(json!({})));
        return Ok(request);
    }
    let method: http::Method = request.method().clone();
    match read(request, content_type.as_deref().unwrap_or_default(), limit).await {
        Ok((parts, value)) => {
            let mut request: Request = Request::from_parts(parts, Body::empty());
            request.extensions_mut().insert(RequestBody(value));
            Ok(request)
        }
        Err(Refusal::Status(status)) => Err(Box::new(error_page(&method, status))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn checks_the_type_as_type_is_does() {
        assert!(is_json("application/json"));
        assert!(is_json("Application/JSON; charset=utf-8"));
        assert!(is_json("application/json; charset=\"utf-8\""));
        assert!(!is_json("application/json;"));
        assert!(!is_json("application/vnd.api+json"));
        assert!(!is_json("text/plain"));
        assert!(!is_json("application/json; =x"));
    }

    #[test]
    fn reads_the_charset_as_content_type_does() {
        assert_eq!(charset("application/json; charset=UTF-8").as_deref(), Some("utf-8"));
        assert_eq!(charset("application/json; charset=\"latin1\"").as_deref(), Some("latin1"));
        assert_eq!(charset("application/json").as_deref(), None);
        assert_eq!(charset("application/json;").as_deref(), None);
    }

    #[test]
    fn parses_strictly() {
        assert!(matches!(parse(""), Ok(Value::Object(_))));
        assert!(matches!(parse(" \n[1]"), Ok(Value::Array(_))));
        assert!(parse("   ").is_err());
        assert!(parse("1").is_err());
        assert!(parse("\"x\"").is_err());
    }
}

