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

//! api/dnsEventUrl.ts: the beacon URL a session's DNS lookup is observed through.

use hmac::{Hmac, Mac};
use sha2::Sha256;

const EXTENSIONS: [&str; 3] = ["gif", "png", "webp"];

/// `derivePath`: `/<first 8 bytes of HMAC-SHA256(secret, sessionId) as hex>.<extension>`.
pub fn derive_path(session_id: &str, secret: &str) -> String {
    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).expect("HMAC takes a key of any length");
    mac.update(session_id.as_bytes());
    let digest = mac.finalize().into_bytes();
    format!("/{}.{}", hex::encode(&digest[..8]), EXTENSIONS[usize::from(digest[8]) % EXTENSIONS.len()])
}

/// `buildDnsEventUrl`: none unless `DNS_EVENT_SUBZONE` and `DNS_EVENT_HMAC_SECRET` are set.
pub fn build_dns_event_url(session_id: &str, env: &dyn Fn(&str) -> Option<String>) -> Option<String> {
    let subzone: String = env("DNS_EVENT_SUBZONE").filter(|value| !value.is_empty())?;
    let secret: String = env("DNS_EVENT_HMAC_SECRET").filter(|value| !value.is_empty())?;
    let path: String = derive_path(session_id, &secret);
    let host: String = match env("DNS_EVENT_PORT").filter(|value| !value.is_empty()) {
        Some(port) => format!("{session_id}.{subzone}:{port}"),
        None => format!("{session_id}.{subzone}"),
    };
    Some(format!("https://{host}{path}?sid={session_id}"))
}
