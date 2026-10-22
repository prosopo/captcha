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

//! What ja4Middleware, handshakeTimingMiddleware and rawTlsSignalsMiddleware read off the
//! headers the TLS-terminating Caddy plugin adds: the JA4 fingerprint of the ClientHello, two
//! handshake timings, and the client SYN's fields from the tcp-probe sidecar.

use crate::api::express::header;
use http::HeaderMap;
use num_bigint::BigUint;
use num_traits::ToPrimitive;
use serde::Serialize;

pub const DEFAULT_JA4: &str = "ja4";

/// `Buffer.from(text, "base64")`: either alphabet, characters outside it skipped, stopping at
/// the first `=`.
pub fn node_base64_decode(text: &str) -> Vec<u8> {
    let mut out: Vec<u8> = Vec::with_capacity(text.len() * 3 / 4);
    let mut accumulator: u32 = 0;
    let mut bits: u32 = 0;
    for byte in text.bytes() {
        let value: u32 = match byte {
            b'A'..=b'Z' => u32::from(byte - b'A'),
            b'a'..=b'z' => u32::from(byte - b'a') + 26,
            b'0'..=b'9' => u32::from(byte - b'0') + 52,
            b'+' | b'-' => 62,
            b'/' | b'_' => 63,
            b'=' => break,
            _ => continue,
        };
        accumulator = (accumulator << 6) | value;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((accumulator >> bits) as u8);
            accumulator &= (1 << bits) - 1;
        }
    }
    out
}

/// `getJA4`: the JA4 of the ClientHello in `x-tls-clienthello`, or `ja4` when there is none
/// or it does not parse. In development it is `ja4` and four random hex digits.
pub fn get_ja4(headers: &HeaderMap, node_env: Option<&str>) -> String {
    if node_env == Some("development") {
        let random: String = prosopo_util_crypto::random_as_hex(32);
        return format!("{DEFAULT_JA4}{}", random.get(28..32).unwrap_or_default());
    }
    let client_hello: Vec<u8> = node_base64_decode(&header(headers, "x-tls-clienthello").unwrap_or_default());
    if client_hello.get(5) != Some(&0x01) {
        return DEFAULT_JA4.to_string();
    }
    prosopo_ja4::Ja4::from_client_hello(&client_hello).map_or_else(|_| DEFAULT_JA4.to_string(), |parsed| parsed.ja4)
}

/// `Number.parseInt(value, 10)` of a header, when it is a number from 0 to `max`.
fn int_header(headers: &HeaderMap, name: &str, max: f64) -> Option<f64> {
    let parsed: f64 = prosopo_util::parse_int(&header(headers, name)?, 10);
    (!parsed.is_nan() && parsed >= 0.0 && parsed <= max).then_some(parsed)
}

/// `getHandshakeTiming`, in microseconds.
#[derive(Debug, Clone, Copy, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HandshakeTiming {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tcp_to_chello_us: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chello_to_handshake_us: Option<f64>,
}

pub fn get_handshake_timing(headers: &HeaderMap) -> HandshakeTiming {
    HandshakeTiming {
        tcp_to_chello_us: int_header(headers, "x-tls-tcp-to-chello-us", f64::INFINITY),
        chello_to_handshake_us: int_header(headers, "x-tls-chello-to-handshake-us", f64::INFINITY),
    }
}

/// `RawTlsSignals`: each field the client's SYN carried, as JS numbers, since that is how the
/// session record stores them.
#[derive(Debug, Clone, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RawTlsSignals {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub syn_ns: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub synack_ns: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ack_ns: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub observed_ttl: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tcp_mss: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tcp_wscale: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tcp_window: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tcp_opts_kinds: Option<Vec<u8>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tcp_opts_present: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tcp_opts_count: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tcp_tsval: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tcp_tsecr: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tcp_flags: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tcp_data_offset_resv: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tcp_urg_ptr: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip_ident: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip_total_len: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip_frag_flags: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip_tos: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tcp_opts_flags: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tcp_opts_order: Option<f64>,
}

const MAX_NS: f64 = 9_223_372_036_854_775_808.0;
const MAX_U8: f64 = 255.0;
const MAX_U16: f64 = 65_535.0;
const MAX_U32: f64 = 4_294_967_295.0;

/// The packed option kinds: a decimal u64, its bytes least significant first, up to the first
/// zero. Absent when not a plain decimal, beyond u64, or zero.
fn opts_kinds(headers: &HeaderMap) -> Option<Vec<u8>> {
    let value: String = header(headers, "x-tls-tcp-opts-kinds")?;
    if value.is_empty() || !value.bytes().all(|byte| byte.is_ascii_digit()) {
        return None;
    }
    let packed: u64 = value.parse::<BigUint>().ok()?.to_u64()?;
    let kinds: Vec<u8> = packed.to_le_bytes().into_iter().take_while(|kind| *kind != 0).collect();
    (!kinds.is_empty()).then_some(kinds)
}

pub fn get_raw_tls_signals(headers: &HeaderMap) -> RawTlsSignals {
    RawTlsSignals {
        syn_ns: int_header(headers, "x-tls-syn-ns", MAX_NS),
        synack_ns: int_header(headers, "x-tls-synack-ns", MAX_NS),
        ack_ns: int_header(headers, "x-tls-ack-ns", MAX_NS),
        observed_ttl: int_header(headers, "x-tls-observed-ttl", MAX_U8),
        tcp_mss: int_header(headers, "x-tls-tcp-mss", MAX_U16),
        tcp_wscale: int_header(headers, "x-tls-tcp-wscale", MAX_U8),
        tcp_window: int_header(headers, "x-tls-tcp-window", MAX_U16),
        tcp_opts_kinds: opts_kinds(headers),
        tcp_opts_present: int_header(headers, "x-tls-tcp-opts-present", MAX_U16),
        tcp_opts_count: int_header(headers, "x-tls-tcp-opts-count", MAX_U8),
        tcp_tsval: int_header(headers, "x-tls-tcp-tsval", MAX_U32),
        tcp_tsecr: int_header(headers, "x-tls-tcp-tsecr", MAX_U32),
        tcp_flags: int_header(headers, "x-tls-tcp-flags", MAX_U8),
        tcp_data_offset_resv: int_header(headers, "x-tls-tcp-data-offset-resv", MAX_U8),
        tcp_urg_ptr: int_header(headers, "x-tls-tcp-urg-ptr", MAX_U16),
        ip_ident: int_header(headers, "x-tls-ip-ident", MAX_U16),
        ip_total_len: int_header(headers, "x-tls-ip-total-len", MAX_U16),
        ip_frag_flags: int_header(headers, "x-tls-ip-frag-flags", MAX_U16),
        ip_tos: int_header(headers, "x-tls-ip-tos", MAX_U8),
        tcp_opts_flags: int_header(headers, "x-tls-tcp-opts-flags", MAX_U8),
        tcp_opts_order: int_header(headers, "x-tls-tcp-opts-order", MAX_U32),
    }
}
