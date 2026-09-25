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

#[macro_use]
extern crate napi_derive;

use napi::bindgen_prelude::{Buffer, Error, Status};

/// Compute a JA4 TLS fingerprint from raw ClientHello bytes.
///
/// Delegates to the `prosopo-ja4` crate on crates.io — the same
/// implementation the protect edge stack (bumblebee) uses, so both produce
/// byte-identical fingerprints for the same input.
#[napi(js_name = "calculateJa4")]
pub fn calculate_ja4(data: Buffer) -> napi::Result<String> {
    fingerprint(data.as_ref()).map_err(|e| Error::new(Status::InvalidArg, e))
}

/// prosopo-ja4 0.1.0 panics on some malformed ClientHellos, and a panic
/// unwinding out of a napi call aborts the whole Node process, so a crafted
/// handshake could take the provider down. Contain it as a parse error.
fn fingerprint(data: &[u8]) -> Result<String, String> {
    std::panic::catch_unwind(|| prosopo_ja4::Ja4::from_client_hello(data))
        .map_err(|_| "malformed ClientHello".to_owned())?
        .map(|parsed| parsed.ja4)
        .map_err(|e| format!("{:?}", e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    const HANDSHAKE_RECORD_TYPE: u8 = 0x16;
    const CLIENT_HELLO: u8 = 0x01;

    fn u16_len(bytes: &[u8]) -> [u8; 2] {
        u16::try_from(bytes.len()).unwrap().to_be_bytes()
    }

    /// Wraps extension bytes in a ClientHello whose outer framing is valid, so
    /// generated input reaches the per-extension parsers instead of stopping at
    /// the record header.
    fn client_hello_record(extensions: &[(u16, Vec<u8>)]) -> Vec<u8> {
        let mut extension_bytes = Vec::new();
        for (id, data) in extensions {
            extension_bytes.extend(id.to_be_bytes());
            extension_bytes.extend(u16_len(data));
            extension_bytes.extend(data);
        }
        let mut body = vec![0x03, 0x03];
        body.extend([0u8; 32]);
        body.push(0);
        body.extend([0x00, 0x02, 0x13, 0x01]);
        body.extend([0x01, 0x00]);
        body.extend(u16_len(&extension_bytes));
        body.extend(extension_bytes);
        let mut handshake = vec![CLIENT_HELLO];
        handshake.extend(&u32::try_from(body.len()).unwrap().to_be_bytes()[1..]);
        handshake.extend(body);
        let mut record = vec![HANDSHAKE_RECORD_TYPE, 0x03, 0x01];
        record.extend(u16_len(&handshake));
        record.extend(handshake);
        record
    }

    fn extension_id() -> impl Strategy<Value = u16> {
        prop_oneof![
            Just(0u16),
            Just(10),
            Just(11),
            Just(13),
            Just(16),
            Just(0x2b),
            any::<u16>(),
        ]
    }

    /// Extension bodies whose outer length prefix is right but whose contents
    /// are not, which random bytes almost never produce on their own.
    fn extension_body() -> impl Strategy<Value = Vec<u8>> {
        let bytes = prop::collection::vec(any::<u8>(), 0..48);
        prop_oneof![
            bytes.clone(),
            bytes.clone().prop_map(|b| {
                let mut out = vec![u8::try_from(b.len()).unwrap()];
                out.extend(b);
                out
            }),
            bytes.prop_map(|b| {
                let mut out = u16_len(&b).to_vec();
                out.extend(b);
                out
            }),
        ]
    }

    #[test]
    fn rejects_an_alpn_list_that_runs_past_its_extension() {
        let hello = client_hello_record(&[(16, vec![0x00, 0x01, 0x01])]);
        assert!(fingerprint(&hello).is_err());
    }

    #[test]
    fn fingerprints_a_minimal_client_hello() {
        let hello = client_hello_record(&[(0x2b, vec![0x02, 0x03, 0x04])]);
        assert!(fingerprint(&hello).unwrap().starts_with("t13"));
    }

    proptest! {
        #[test]
        fn never_panics_on_arbitrary_bytes(data in prop::collection::vec(any::<u8>(), 0..512)) {
            let _ = fingerprint(&data);
        }

        #[test]
        fn never_panics_on_malformed_extensions(
            extensions in prop::collection::vec((extension_id(), extension_body()), 0..8)
        ) {
            let _ = fingerprint(&client_hello_record(&extensions));
        }

        #[test]
        fn never_panics_on_a_truncated_extension_block(
            extensions in prop::collection::vec((extension_id(), extension_body()), 1..4),
            cut in 1usize..8,
        ) {
            let mut record = client_hello_record(&extensions);
            record.truncate(record.len().saturating_sub(cut));
            let _ = fingerprint(&record);
        }
    }
}
