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

//! Bunny CDN token authentication for asset URLs (src/captcha/assetToken.ts):
//!   token = base64url(sha256(securityKey + path + expires [+ clientIp]))
//!   url   = <origin><path>?token=<token>&expires=<expires>

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use prosopo_util::parse_int;
use prosopo_util_crypto::js::js_number_to_string;
use prosopo_util_crypto::sha256_as_u8a;
use std::time::{SystemTime, UNIX_EPOCH};
use url::Url;

pub const DEFAULT_ASSET_TOKEN_TTL_SECONDS: f64 = 300.0;

pub const ASSET_TOKEN_KEY_ENV: &str = "PROSOPO_ASSET_TOKEN_KEY";
pub const ASSET_TOKEN_TTL_ENV: &str = "PROSOPO_ASSET_TOKEN_TTL_SECONDS";

/// The string the token hashes. `expires` is printed as JS prints a number.
pub fn asset_token_base(
    security_key: &str,
    path: &str,
    expires: f64,
    client_ip: Option<&str>,
) -> String {
    format!(
        "{security_key}{path}{}{}",
        js_number_to_string(expires),
        client_ip.unwrap_or("")
    )
}

/// URL-safe base64 without padding.
pub fn encode_asset_token(digest: &[u8]) -> String {
    URL_SAFE_NO_PAD.encode(digest)
}

#[derive(Debug, Clone, PartialEq)]
pub struct SignAssetUrlOptions {
    pub security_key: String,
    pub ttl_seconds: Option<f64>,
    pub client_ip: Option<String>,
    /// The time to sign at, in milliseconds since the epoch; now when absent.
    pub now_ms: Option<f64>,
}

fn now_ms() -> f64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0.0, |elapsed| elapsed.as_millis() as f64)
}

fn http_url(url: &str) -> Option<Url> {
    Url::parse(url)
        .ok()
        .filter(|parsed: &Url| matches!(parsed.scheme(), "http" | "https"))
}

/// The URL with a token and expiry for its path. Anything that is not an http(s) URL, or that
/// already carries a token, comes back unchanged.
pub fn sign_asset_url(url: &str, options: &SignAssetUrlOptions) -> String {
    let Some(parsed) = http_url(url) else {
        return url.to_string();
    };
    if parsed.query_pairs().any(|(key, _)| key == "token") {
        return url.to_string();
    }
    let expires: f64 = (options.now_ms.unwrap_or_else(now_ms) / 1000.0).floor()
        + options
            .ttl_seconds
            .unwrap_or(DEFAULT_ASSET_TOKEN_TTL_SECONDS);
    let base: String = asset_token_base(
        &options.security_key,
        parsed.path(),
        expires,
        options.client_ip.as_deref(),
    );
    format!(
        "{}{}?token={}&expires={}",
        parsed.origin().ascii_serialization(),
        parsed.path(),
        encode_asset_token(&sha256_as_u8a(base.as_bytes())),
        js_number_to_string(expires)
    )
}

/// Signing options from `PROSOPO_ASSET_TOKEN_KEY` and `PROSOPO_ASSET_TOKEN_TTL_SECONDS`, read
/// through `env`; none without a key. A TTL that `parseInt` cannot read falls back to 300.
pub fn asset_token_options_from(
    env: impl Fn(&str) -> Option<String>,
) -> Option<SignAssetUrlOptions> {
    let security_key: String = env(ASSET_TOKEN_KEY_ENV).filter(|key: &String| !key.is_empty())?;
    let ttl: f64 = parse_int(&env(ASSET_TOKEN_TTL_ENV).unwrap_or_default(), 10);
    Some(SignAssetUrlOptions {
        security_key,
        ttl_seconds: Some(if ttl.is_nan() {
            DEFAULT_ASSET_TOKEN_TTL_SECONDS
        } else {
            ttl
        }),
        client_ip: None,
        now_ms: None,
    })
}

/// [`asset_token_options_from`] the process environment.
pub fn asset_token_options_from_env() -> Option<SignAssetUrlOptions> {
    asset_token_options_from(|name: &str| std::env::var(name).ok())
}
