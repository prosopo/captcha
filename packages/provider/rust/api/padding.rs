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

//! utils/tarpitPadding.ts: a challenge answered with the traffic filter's `padBytes` of random
//! base64 spliced between its fields, streamed so the padding costs the client bandwidth and
//! the provider nothing but the writes. The TS overrides `res.json` for every client route and
//! pads whatever is sent once a handler has set `res.locals.padBytes`; here the handler that
//! resolves padding answers through [`send_json_padded`].

use crate::api::express::{send_json, Requested};
use axum::body::Body;
use axum::response::Response;
use base64::Engine;
use bytes::Bytes;
use http::header::CONTENT_TYPE;
use http::{HeaderValue, Method, StatusCode};
use prosopo_types::settings::MAX_PAD_BYTES;
use rand_core::{OsRng, RngCore};
use serde_json::{Map, Value};
use std::collections::HashSet;
use std::convert::Infallible;
use std::sync::OnceLock;

const CHUNK_BYTES: usize = 64 * 1024;
const KEY_ALPHABET: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const MIN_KEY_LENGTH: usize = 3;
const MAX_KEY_LENGTH: usize = 12;

/// The incompressible text padding is cut from, drawn once per process.
fn pool() -> &'static str {
    static POOL: OnceLock<String> = OnceLock::new();
    POOL.get_or_init(|| {
        let mut bytes: Vec<u8> = vec![0; (MAX_PAD_BYTES * 3.0 / 4.0).ceil() as usize];
        OsRng.fill_bytes(&mut bytes);
        base64::engine::general_purpose::STANDARD.encode(bytes)
    })
}

/// `Math.random()`.
fn random() -> f64 {
    (OsRng.next_u64() >> 11) as f64 / (1u64 << 53) as f64
}

/// `Math.floor(Math.random() * bound)`.
fn random_below(bound: usize) -> usize {
    (random() * bound as f64).floor() as usize
}

/// `clampPadBytes`: nothing for an absent, zero, negative or NaN value, at most `MAX_PAD_BYTES`.
pub fn clamp_pad_bytes(pad_bytes: Option<f64>) -> usize {
    match pad_bytes {
        Some(bytes) if bytes > 0.0 => bytes.floor().min(MAX_PAD_BYTES) as usize,
        _ => 0,
    }
}

/// `bodyMembers`: each own property as `JSON.stringify(key):JSON.stringify(value)`, in
/// `Object.entries` order.
fn body_members(body: &Map<String, Value>) -> Vec<(String, String)> {
    prosopo_logger::js_key_order(body)
        .into_iter()
        .map(|key| {
            let encoded: String = format!(
                "{}:{}",
                prosopo_logger::json_stringify(&Value::String(key.clone()), 0),
                prosopo_logger::json_stringify(&body[key.as_str()], 0)
            );
            (key.clone(), encoded)
        })
        .collect()
}

/// `randomKey`: 3 to 12 alphanumerics, none already used in the body.
fn random_key(taken: &mut HashSet<String>) -> String {
    loop {
        let length: usize = MIN_KEY_LENGTH + random_below(MAX_KEY_LENGTH - MIN_KEY_LENGTH + 1);
        let key: String = (0..length).map(|_| char::from(KEY_ALPHABET[random_below(KEY_ALPHABET.len())])).collect();
        if taken.insert(key.clone()) {
            return key;
        }
    }
}

/// `partition`: `total` split at `parts - 1` uniform cuts.
fn partition(total: usize, parts: usize) -> Vec<usize> {
    let mut cuts: Vec<usize> = vec![0, total];
    for _ in 1..parts {
        cuts.push(random_below(total + 1));
    }
    cuts.sort_unstable();
    cuts.windows(2).map(|pair| pair[1] - pair[0]).collect()
}

/// One pad: a random window of the pool, in chunks of at most 64 KiB.
fn pad_chunks(size: usize) -> impl Iterator<Item = Bytes> {
    let pool: &'static str = pool();
    let offset: usize = random_below(pool.len() - size + 1);
    (0..size).step_by(CHUNK_BYTES).map(move |written| {
        let from: usize = offset + written;
        let to: usize = offset + (written + CHUNK_BYTES).min(size);
        Bytes::from_static(&pool.as_bytes()[from..to])
    })
}

/// `streamWithPad`'s writes, made as they are asked for: `{"<key>":"<pad>",<member>,…}` with a
/// pad before every member (one pad for an empty body).
pub fn padded_chunks(body: &Map<String, Value>, total: usize) -> impl Iterator<Item = Bytes> + Send + 'static {
    let members: Vec<(String, String)> = body_members(body);
    let segments: usize = members.len().max(1);
    let sizes: Vec<usize> = partition(total, segments);
    let mut taken: HashSet<String> = members.iter().map(|(key, _)| key.clone()).collect();
    let keys: Vec<String> = (0..segments).map(|_| random_key(&mut taken)).collect();
    let mut encoded: Vec<Option<String>> = members.into_iter().map(|(_, encoded)| Some(encoded)).collect();
    encoded.resize(segments, None);
    keys.into_iter()
        .zip(sizes)
        .zip(encoded)
        .enumerate()
        .flat_map(|(index, ((key, size), member))| {
            let separator: char = if index == 0 { '{' } else { ',' };
            let close: String = member.map_or_else(|| "\"".to_string(), |member| format!("\",{member}"));
            std::iter::once(Bytes::from(format!("{separator}\"{key}\":\"")))
                .chain(pad_chunks(size))
                .chain(std::iter::once(Bytes::from(close)))
        })
        .chain(std::iter::once(Bytes::from_static(b"}")))
}

/// `res.json(body)` under `padResponseMiddleware`, with `padBytes` as `res.locals.padBytes`.
pub fn send_json_padded(requested: &Requested, body: &Value, pad_bytes: Option<f64>) -> Response {
    let total: usize = clamp_pad_bytes(pad_bytes);
    let Some(members) = body.as_object().filter(|_| total > 0) else {
        return send_json(requested, StatusCode::OK, Vec::new(), body);
    };
    let mut response: Response = Response::new(Body::empty());
    response.headers_mut().insert(CONTENT_TYPE, HeaderValue::from_static("application/json; charset=utf-8"));
    if requested.method != Method::HEAD {
        let chunks = padded_chunks(members, total).map(Ok::<Bytes, Infallible>);
        *response.body_mut() = Body::from_stream(futures_util::stream::iter(chunks));
    }
    response
}

#[cfg(test)]
mod tests {
    //! utils/tarpitPadding.unit.test.ts. Its three backpressure cases test Node's `drain` and
    //! `close` plumbing; here the body is a lazy iterator hyper pulls from, so what they pin is
    //! that the pad is produced as it is read, and not ahead of it.
    use super::*;
    use serde_json::json;

    fn challenge() -> Map<String, Value> {
        json!({ "status": "ok", "challenge": "0x1234", "difficulty": 9, "timestamp": "1764000000000" })
            .as_object()
            .cloned()
            .expect("an object")
    }

    fn body(members: &Map<String, Value>, total: usize) -> String {
        padded_chunks(members, total).map(|chunk| String::from_utf8(chunk.to_vec()).expect("UTF-8")).collect()
    }

    fn pads(parsed: &Map<String, Value>, members: &Map<String, Value>) -> Vec<String> {
        parsed
            .iter()
            .filter(|(key, _)| !members.contains_key(key.as_str()))
            .map(|(_, value)| value.as_str().expect("a pad is a string").to_string())
            .collect()
    }

    #[test]
    fn leaves_the_response_untouched_when_no_padding_was_resolved() {
        assert_eq!(clamp_pad_bytes(None), 0);
    }

    #[test]
    fn leaves_the_response_untouched_for_a_zero_or_negative_pad_bytes() {
        assert_eq!(clamp_pad_bytes(Some(0.0)), 0);
        assert_eq!(clamp_pad_bytes(Some(-1.0)), 0);
        assert_eq!(clamp_pad_bytes(Some(f64::NAN)), 0);
    }

    #[test]
    fn emits_the_requested_total_padding_and_keeps_every_real_field() {
        let members: Map<String, Value> = challenge();
        let parsed: Map<String, Value> = serde_json::from_str(&body(&members, 4096)).expect("valid JSON");
        for (key, value) in &members {
            assert_eq!(parsed.get(key), Some(value));
        }
        assert_eq!(pads(&parsed, &members).concat().len(), 4096);
    }

    #[test]
    fn interleaves_the_padding_so_no_real_field_arrives_before_some_of_it() {
        let members: Map<String, Value> = challenge();
        let text: String = body(&members, 4096);
        let parsed: Map<String, Value> = serde_json::from_str(&text).expect("valid JSON");
        let pads: Vec<String> = pads(&parsed, &members);
        assert_eq!(pads.len(), members.len());
        for field in members.keys() {
            assert!(text.find(&format!("\"{field}\"")).expect("present") > 0);
        }
        let last_pad: usize = pads.last().map_or(0, String::len);
        assert!(text.find("\"timestamp\"").expect("present") > 4096 - last_pad);
    }

    #[test]
    fn uses_unpredictable_pad_keys_rather_than_a_fixed_marker() {
        let members: Map<String, Value> = challenge();
        let keys = || -> Vec<String> {
            let parsed: Map<String, Value> = serde_json::from_str(&body(&members, 512)).expect("valid JSON");
            parsed.keys().filter(|key| !members.contains_key(key.as_str())).cloned().collect()
        };
        let first: Vec<String> = keys();
        assert!(!first.contains(&"pad".to_string()));
        assert_ne!(first, keys());
    }

    #[test]
    fn pads_with_incompressible_bytes() {
        let members: Map<String, Value> = challenge();
        let parsed: Map<String, Value> = serde_json::from_str(&body(&members, 8192)).expect("valid JSON");
        assert!(pads(&parsed, &members).concat().chars().collect::<HashSet<char>>().len() > 50);
    }

    #[test]
    fn clamps_padding_to_the_5_mib_ceiling_so_it_cannot_be_used_as_an_amplifier() {
        let total: usize = clamp_pad_bytes(Some(MAX_PAD_BYTES * 10.0));
        assert_eq!(total, MAX_PAD_BYTES as usize);
        let members: Map<String, Value> = challenge();
        let parsed: Map<String, Value> = serde_json::from_str(&body(&members, total)).expect("valid JSON");
        assert_eq!(pads(&parsed, &members).concat().len(), MAX_PAD_BYTES as usize);
    }

    #[test]
    fn emits_valid_json_for_a_body_with_no_fields() {
        let members: Map<String, Value> = Map::new();
        let parsed: Map<String, Value> = serde_json::from_str(&body(&members, 64)).expect("valid JSON");
        assert_eq!(pads(&parsed, &members).concat().len(), 64);
    }

    #[test]
    fn does_not_pad_a_non_object_body() {
        let response: Response = send_json_padded(&Requested { method: Method::POST, headers: Default::default() }, &json!(["a", "b"]), Some(64.0));
        assert!(response.headers().contains_key(http::header::CONTENT_LENGTH));
    }

    #[test]
    fn produces_the_pad_as_it_is_read() {
        let members: Map<String, Value> = challenge();
        let mut chunks = padded_chunks(&members, 512 * 1024);
        let read: usize = chunks.by_ref().take(3).map(|chunk| chunk.len()).sum();
        assert!(read < 128 * 1024 + 64);
        assert!(chunks.next().is_some());
    }

    #[test]
    fn writes_no_chunk_larger_than_64_kib() {
        assert!(padded_chunks(&challenge(), MAX_PAD_BYTES as usize).all(|chunk| chunk.len() <= CHUNK_BYTES + 64));
    }
}

#[cfg(test)]
mod equivalence {
    //! Replays rust/equivalence/padding-vectors.json, written by generate-padding.ts from
    //! tarpitPadding.ts behind express. The pad is random on both sides, so a case matches when
    //! the headers, the members' text in order, the number of pads and their total do.
    use super::*;
    use http::header::{CONTENT_LENGTH, ETAG};

    const VECTORS: &str = include_str!("../equivalence/padding-vectors.json");

    fn pad_bytes(value: &Value) -> Option<f64> {
        match value {
            Value::Null => None,
            Value::String(text) => Some(prosopo_api_route::schema::string_to_number(text)),
            number => number.as_f64(),
        }
    }

    /// Members as `JSON.stringify` writes them, in wire order, and the pads' count and total.
    fn shape(text: &str, original: &Map<String, Value>) -> (Vec<String>, usize, usize) {
        let parsed: Map<String, Value> = serde_json::from_str(text).expect("valid JSON");
        let mut members: Vec<String> = original
            .keys()
            .map(|key| {
                format!(
                    "{}:{}",
                    prosopo_logger::json_stringify(&Value::String(key.clone()), 0),
                    prosopo_logger::json_stringify(&parsed[key.as_str()], 0)
                )
            })
            .collect();
        members.sort_by_key(|member| text.find(member.as_str()).expect("on the wire"));
        let pads: Vec<usize> = parsed
            .iter()
            .filter(|(key, _)| !original.contains_key(key.as_str()))
            .map(|(_, pad)| pad.as_str().expect("a pad").len())
            .collect();
        (members, pads.len(), pads.iter().sum())
    }

    /// The body with its array-index keys inserted last. `Object.entries` puts them first
    /// whatever the insertion order, so only that ordering gives the TS's wire order back.
    fn index_keys_last(body: &Value) -> Value {
        match body.as_object() {
            Some(members) => {
                let is_index = |key: &str| {
                    !key.is_empty() && (key == "0" || !key.starts_with('0')) && key.bytes().all(|b| b.is_ascii_digit()) && key.parse::<u32>().is_ok_and(|n| n != u32::MAX)
                };
                Value::Object(
                    members
                        .iter()
                        .filter(|(key, _)| !is_index(key))
                        .chain(members.iter().filter(|(key, _)| is_index(key)))
                        .map(|(key, value)| (key.clone(), value.clone()))
                        .collect(),
                )
            }
            None => body.clone(),
        }
    }

    #[tokio::test]
    async fn equivalence_pads_as_the_ts_does() {
        let vectors: Value = serde_json::from_str(VECTORS).expect("padding-vectors.json parses");
        assert_eq!(vectors["maxPadBytes"].as_f64(), Some(MAX_PAD_BYTES));
        for case in vectors["cases"].as_array().expect("cases") {
            let label: String = format!("{} with {}", case["body"], case["padBytes"]);
            let response: Response =
                send_json_padded(&Requested { method: Method::POST, headers: Default::default() }, &index_keys_last(&case["body"]), pad_bytes(&case["padBytes"]));
            assert_eq!(response.headers().get(CONTENT_TYPE).and_then(|value| value.to_str().ok()), case["contentType"].as_str(), "{label}");
            assert_eq!(response.headers().contains_key(ETAG), case["etag"].as_bool().expect("a flag"), "{label}");
            assert_eq!(response.headers().contains_key(CONTENT_LENGTH), case["contentLength"].as_bool().expect("a flag"), "{label}");
            let streamed: bool = !response.headers().contains_key(CONTENT_LENGTH);
            assert_eq!(streamed, case["chunked"].as_bool().expect("a flag"), "{label}");
            let bytes = axum::body::to_bytes(response.into_body(), usize::MAX).await.expect("a body");
            let text: String = String::from_utf8(bytes.to_vec()).expect("UTF-8");
            let expected: &Value = &case["shape"];
            let Some(original) = case["body"].as_object() else {
                assert_eq!(Some(text.as_str()), expected["raw"].as_str(), "{label}");
                continue;
            };
            if case["contentLength"].as_bool() == Some(true) {
                continue;
            }
            let (members, pads, total) = shape(&text, original);
            let expected_members: Vec<String> = expected["members"].as_array().expect("members").iter().map(|member| member.as_str().expect("text").to_string()).collect();
            assert_eq!(members, expected_members, "{label}");
            assert_eq!(Some(pads as u64), expected["pads"].as_u64(), "{label}");
            assert_eq!(Some(total as u64), expected["total"].as_u64(), "{label}");
        }
    }
}
