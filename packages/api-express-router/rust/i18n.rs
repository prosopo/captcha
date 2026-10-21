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

//! What i18next-http-middleware does for the provider: the language a request is served in,
//! told back in `Content-Language`.

use crate::context::RequestI18n;
use axum::extract::{Request, State};
use axum::middleware::Next;
use axum::response::Response;
use http::header::{HeaderValue, CONTENT_LANGUAGE};
use prosopo_locale::{I18n, LanguageRequest};
use std::sync::Arc;

fn first_lng(query: Option<&str>) -> Option<String> {
    query?
        .split('&')
        .filter_map(|pair| pair.split_once('=').or(Some((pair, ""))))
        .find(|(key, _)| *key == "lng")
        .map(|(_, value)| value.replace('+', " "))
        .map(|value| percent_decode(&value))
}

fn percent_decode(text: &str) -> String {
    let bytes: &[u8] = text.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(bytes.len());
    let mut index: usize = 0;
    while index < bytes.len() {
        let hex = |at: usize| bytes.get(at).and_then(|byte| (*byte as char).to_digit(16));
        match (bytes[index], hex(index + 1), hex(index + 2)) {
            (b'%', Some(high), Some(low)) => {
                out.push((high * 16 + low) as u8);
                index += 3;
            }
            (byte, _, _) => {
                out.push(byte);
                index += 1;
            }
        }
    }
    String::from_utf8_lossy(&out).into_owned()
}

/// `i18nMiddleware`: puts [`RequestI18n`] on the request and the language in the response's
/// `Content-Language`.
pub async fn i18n_middleware(State(i18n): State<Arc<I18n>>, mut request: Request, next: Next) -> Response {
    let headers: Vec<(String, String)> = request
        .headers()
        .iter()
        .filter_map(|(name, value)| value.to_str().ok().map(|value| (name.as_str().to_string(), value.to_string())))
        .collect();
    let language_request: LanguageRequest = LanguageRequest::from_parts(
        first_lng(request.uri().query()).as_deref(),
        headers.iter().map(|(name, value)| (name.as_str(), value.as_str())),
    );
    let language: String = i18n.for_request(&language_request).language().to_string();
    request.extensions_mut().insert(RequestI18n {
        i18n: i18n.clone(),
        language: language.clone(),
    });
    let mut response: Response = next.run(request).await;
    if let Ok(value) = HeaderValue::from_str(&language) {
        response.headers_mut().insert(CONTENT_LANGUAGE, value);
    }
    response
}
