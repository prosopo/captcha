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

//! What express 4 and Node's HTTP server do around every route of the provider's app: the
//! request's IP and host under `trust proxy` 1, the headers Node hands the app, CORS with
//! `providerCorsOptions`, `X-Powered-By`, and `res.send` with its weak ETag and 304.

use axum::body::{Body, HttpBody};
use axum::extract::Request;
use axum::middleware::Next;
use axum::response::Response;
use http::header::{HeaderName, HeaderValue, CONTENT_LENGTH, CONTENT_TYPE, ETAG};
use http::{HeaderMap, Method, StatusCode};
use std::net::SocketAddr;

/// A header value as Node gives it to JS: each byte one UTF-16 unit (latin1).
pub fn latin1(bytes: &[u8]) -> String {
    bytes.iter().map(|&byte| byte as char).collect()
}

/// `req.headers[name]`: duplicates joined with `", "`, except the fields Node keeps only the
/// first of.
pub fn header(headers: &HeaderMap, name: &str) -> Option<String> {
    let mut values = headers.get_all(name).iter().map(|value: &HeaderValue| latin1(value.as_bytes()));
    let first: String = values.next()?;
    if FIRST_ONLY.contains(&name) {
        return Some(first);
    }
    Some(values.fold(first, |joined, value| format!("{joined}, {value}")))
}

/// The fields Node's `IncomingMessage` drops duplicates of.
const FIRST_ONLY: [&str; 17] = [
    "content-type",
    "content-length",
    "user-agent",
    "referer",
    "host",
    "authorization",
    "proxy-authorization",
    "if-modified-since",
    "if-unmodified-since",
    "from",
    "location",
    "max-forwards",
    "retry-after",
    "etag",
    "last-modified",
    "server",
    "age",
];

/// The socket's address as Node reports it: an IPv4 client of a dual-stack listener is
/// `::ffff:a.b.c.d`.
pub fn socket_address(remote: &SocketAddr) -> String {
    remote.ip().to_string()
}

/// `forwarded`'s parse of `X-Forwarded-For`: the addresses nearest first, split on commas,
/// spaces around them dropped, empty ones skipped.
fn forwarded_for(header: &str) -> Vec<String> {
    let units: Vec<u16> = header.encode_utf16().collect();
    let mut list: Vec<String> = Vec::new();
    let mut end: usize = units.len();
    let mut start: usize = units.len();
    for index in (0..units.len()).rev() {
        match units[index] {
            0x20 => {
                if start == end {
                    start = index;
                    end = index;
                }
            }
            0x2c => {
                if start != end {
                    list.push(String::from_utf16_lossy(&units[start..end]));
                }
                start = index;
                end = index;
            }
            _ => start = index,
        }
    }
    if start != end {
        list.push(String::from_utf16_lossy(&units[start..end]));
    }
    list
}

/// `req.ip` under `trust proxy` 1: the address nearest in `X-Forwarded-For`, else the socket's.
pub fn client_ip(remote: &SocketAddr, headers: &HeaderMap) -> String {
    let forwarded: Vec<String> = forwarded_for(&header(headers, "x-forwarded-for").unwrap_or_default());
    forwarded.into_iter().next().unwrap_or_else(|| socket_address(remote))
}

/// `req.hostname` under `trust proxy` 1: the first `X-Forwarded-Host`, else `Host`, without
/// its port.
pub fn hostname(headers: &HeaderMap) -> Option<String> {
    let host: String = match header(headers, "x-forwarded-host").filter(|host| !host.is_empty()) {
        Some(forwarded) => match forwarded.find(',') {
            Some(comma) => forwarded[..comma].trim_end().to_string(),
            None => forwarded,
        },
        None => header(headers, "host")?,
    };
    if host.is_empty() {
        return None;
    }
    let offset: usize = if host.starts_with('[') { host.find(']').map_or(0, |close| close + 1) } else { 0 };
    match host[offset..].find(':') {
        Some(colon) => Some(host[..offset + colon].to_string()),
        None => Some(host),
    }
}

/// The `etag` package's weak tag: `W/"<length in hex>-<27 characters of the SHA-1 in base64>"`.
pub fn weak_etag(body: &[u8]) -> String {
    prosopo_api_router::weak_etag(body)
}

/// `fresh`'s token list: split on commas, spaces around tokens dropped.
fn token_list(text: &str) -> Vec<&str> {
    let bytes: &[u8] = text.as_bytes();
    let mut list: Vec<&str> = Vec::new();
    let (mut start, mut end): (usize, usize) = (0, 0);
    for (index, byte) in bytes.iter().enumerate() {
        match byte {
            b' ' => {
                if start == end {
                    start = index + 1;
                    end = index + 1;
                }
            }
            b',' => {
                list.push(&text[start..end]);
                start = index + 1;
                end = index + 1;
            }
            _ => end = index + 1,
        }
    }
    list.push(&text[start..end]);
    list
}

fn no_cache(cache_control: &str) -> bool {
    cache_control.split(',').any(|directive: &str| directive.trim_matches(|c: char| c.is_whitespace()) == "no-cache")
}

/// `req.fresh` for a response with this ETag and no `Last-Modified`.
pub fn fresh(method: &Method, status: StatusCode, request: &HeaderMap, etag: &str) -> bool {
    if method != Method::GET && method != Method::HEAD {
        return false;
    }
    if !(status.is_success() || status == StatusCode::NOT_MODIFIED) {
        return false;
    }
    let modified_since: Option<String> = header(request, "if-modified-since").filter(|value| !value.is_empty());
    let none_match: Option<String> = header(request, "if-none-match").filter(|value| !value.is_empty());
    if modified_since.is_none() && none_match.is_none() {
        return false;
    }
    if header(request, "cache-control").is_some_and(|value| no_cache(&value)) {
        return false;
    }
    if let Some(none_match) = none_match.filter(|value| value != "*") {
        let matched: bool = token_list(&none_match)
            .into_iter()
            .any(|tag: &str| tag == etag || format!("W/{etag}") == tag || format!("W/{tag}") == etag);
        if !matched {
            return false;
        }
    }
    modified_since.is_none()
}

/// The request facts `res.send` reads.
#[derive(Debug, Clone)]
pub struct Requested {
    pub method: Method,
    pub headers: HeaderMap,
}

impl Requested {
    pub fn of(request: &Request) -> Requested {
        Requested {
            method: request.method().clone(),
            headers: request.headers().clone(),
        }
    }
}

/// `res.status(status).set(headers).send(body)`: the length, the weak ETag, a 304 when the
/// request already holds this body, and no body for HEAD.
pub fn send(requested: &Requested, status: StatusCode, headers: Vec<(HeaderName, HeaderValue)>, body: Vec<u8>) -> Response {
    let etag: String = weak_etag(&body);
    let not_modified: bool = fresh(&requested.method, status, &requested.headers, &etag);
    let mut response: Response = Response::new(Body::empty());
    let response_headers: &mut HeaderMap = response.headers_mut();
    for (name, value) in headers {
        response_headers.insert(name, value);
    }
    response_headers.insert(ETAG, HeaderValue::from_str(&etag).expect("an ETag is ASCII"));
    if not_modified {
        *response.status_mut() = StatusCode::NOT_MODIFIED;
        response.headers_mut().remove(CONTENT_TYPE);
        return response;
    }
    *response.status_mut() = status;
    response.headers_mut().insert(CONTENT_LENGTH, HeaderValue::from(body.len()));
    if requested.method != Method::HEAD {
        *response.body_mut() = Body::from(body);
    }
    response
}

/// `res.json(value)` after `res.status(status)`.
pub fn send_json(requested: &Requested, status: StatusCode, headers: Vec<(HeaderName, HeaderValue)>, body: &serde_json::Value) -> Response {
    let mut headers: Vec<(HeaderName, HeaderValue)> = headers;
    if !headers.iter().any(|(name, _)| name == CONTENT_TYPE) {
        headers.push((CONTENT_TYPE, HeaderValue::from_static("application/json; charset=utf-8")));
    }
    send(requested, status, headers, prosopo_logger::json_stringify(body, 0).into_bytes())
}

/// Node answers a request without `Host` with a bare 400 before the app sees it.
pub async fn require_host(request: Request, next: Next) -> Response {
    if request.headers().contains_key(http::header::HOST) {
        return next.run(request).await;
    }
    let mut response: Response = Response::new(Body::empty());
    *response.status_mut() = StatusCode::BAD_REQUEST;
    response
}

/// express's `X-Powered-By`, on everything the app answers.
pub async fn powered_by(request: Request, next: Next) -> Response {
    let mut response: Response = next.run(request).await;
    response.headers_mut().insert("x-powered-by", HeaderValue::from_static("Express"));
    response
}

const ALLOWED_HEADERS: &str = "Accept,Accept-Language,Authorization,Content-Language,Content-Type,Prosopo-Lang,Prosopo-Site-Key,Prosopo-User,x-prosopo-meta";

/// `cors(providerCorsOptions)`: any origin, `x-prosopo-meta` exposed, and a preflight answered
/// at once with the allowed methods and headers, cached for a day.
pub async fn cors(request: Request, next: Next) -> Response {
    if request.method() == Method::OPTIONS {
        let mut response: Response = Response::new(Body::empty());
        *response.status_mut() = StatusCode::NO_CONTENT;
        let headers: &mut HeaderMap = response.headers_mut();
        headers.insert("access-control-allow-origin", HeaderValue::from_static("*"));
        headers.insert("access-control-allow-methods", HeaderValue::from_static("GET,HEAD,PUT,PATCH,POST,DELETE"));
        headers.insert("access-control-allow-headers", HeaderValue::from_static(ALLOWED_HEADERS));
        headers.insert("access-control-max-age", HeaderValue::from_static("86400"));
        headers.insert("access-control-expose-headers", HeaderValue::from_static("x-prosopo-meta"));
        headers.insert(CONTENT_LENGTH, HeaderValue::from_static("0"));
        return response;
    }
    let mut response: Response = next.run(request).await;
    let headers: &mut HeaderMap = response.headers_mut();
    headers.insert("access-control-allow-origin", HeaderValue::from_static("*"));
    headers.insert("access-control-expose-headers", HeaderValue::from_static("x-prosopo-meta"));
    response
}

/// Marks a page from express's final handler, which takes off the `Content-Language`,
/// `Content-Encoding` and `Content-Range` that earlier middleware set.
#[derive(Debug, Clone, Copy)]
pub struct FinalHandlerPage;

/// express's final handler for a request no route answered.
pub fn not_found(request: &Request) -> Response {
    let mut response: Response = prosopo_api_router::not_found(request.method().as_str(), request.uri().path());
    finish_page(&mut response, request.method());
    response
}

/// express's final handler for an error no handler took, as production renders it.
pub fn error_page(method: &Method, status: StatusCode) -> Response {
    let mut response: Response = prosopo_api_router::error_page(status);
    finish_page(&mut response, method);
    response
}

/// The final handler sets the length itself and sends no body for HEAD.
fn finish_page(response: &mut Response, method: &Method) {
    let length: usize = match response.body().size_hint().exact() {
        Some(length) => length as usize,
        None => return,
    };
    response.headers_mut().insert(CONTENT_LENGTH, HeaderValue::from(length));
    response.extensions_mut().insert(FinalHandlerPage);
    if method == Method::HEAD {
        *response.body_mut() = Body::empty();
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    fn headers(pairs: &[(&str, &[u8])]) -> HeaderMap {
        let mut map: HeaderMap = HeaderMap::new();
        for (name, value) in pairs {
            map.append(HeaderName::from_bytes(name.as_bytes()).unwrap(), HeaderValue::from_bytes(value).unwrap());
        }
        map
    }

    #[test]
    fn takes_the_nearest_forwarded_address() {
        let remote: SocketAddr = "[::ffff:127.0.0.1]:5000".parse().unwrap();
        assert_eq!(client_ip(&remote, &headers(&[])), "::ffff:127.0.0.1");
        assert_eq!(client_ip(&remote, &headers(&[("x-forwarded-for", b"1.1.1.1, 2.2.2.2")])), "2.2.2.2");
        assert_eq!(client_ip(&remote, &headers(&[("x-forwarded-for", b"1.1.1.1"), ("x-forwarded-for", b"3.3.3.3")])), "3.3.3.3");
        assert_eq!(client_ip(&remote, &headers(&[("x-forwarded-for", b" , 4.4.4.4 ,, ")])), "4.4.4.4");
        assert_eq!(client_ip(&remote, &headers(&[("x-forwarded-for", b"")])), "::ffff:127.0.0.1");
    }

    #[test]
    fn reads_the_hostname_as_express_does() {
        assert_eq!(hostname(&headers(&[("host", b"a.example:80")])).as_deref(), Some("a.example"));
        assert_eq!(hostname(&headers(&[("host", b"[::1]:80")])).as_deref(), Some("[::1]"));
        assert_eq!(hostname(&headers(&[("host", b"h"), ("x-forwarded-host", b"f.example , g")])).as_deref(), Some("f.example"));
        assert_eq!(hostname(&headers(&[("host", b"h"), ("x-forwarded-host", b"")])).as_deref(), Some("h"));
        assert_eq!(hostname(&headers(&[])), None);
    }

    #[test]
    fn makes_the_etag_package_tag() {
        assert_eq!(weak_etag(b""), "W/\"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk\"");
    }
}
