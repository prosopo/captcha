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

//! How the image route rewrites item URLs: the sealing half of assetSealFormat.ts and
//! assetSeal.ts, sealedAssetsResolver.ts and signedAssetsResolver.ts. Seals are opened at the
//! CDN edge by edge/assetSealHandler.ts, which stays TypeScript, so a seal made here must be
//! the bytes the TS would make.
//!
//!   blob      = base64url( version(1) | keyId(1) | iv(12) | ciphertext | tag(16) )
//!   plaintext = expiry(uint32be seconds) | utf8 path
//!   AAD       = version(1) | keyId(1)

use aes_gcm::aead::{Aead, KeyInit, Payload};
use aes_gcm::{Aes256Gcm, Nonce};
use base64::alphabet::URL_SAFE;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::engine::{DecodePaddingMode, GeneralPurpose, GeneralPurposeConfig};
use base64::Engine;
use indexmap::IndexMap;
use prosopo_api_route::schema::string_to_number;
use prosopo_datasets::{asset_token_base, encode_asset_token, AssetsResolver, DEFAULT_ASSET_TOKEN_TTL_SECONDS};
use prosopo_util::{js_trim, number_to_string, parse_int};
use prosopo_util_crypto::sha256_as_u8a;
use rand_core::{OsRng, RngCore};
use url::Url;

pub const SEAL_VERSION: u8 = 1;
pub const IV_BYTES: usize = 12;
pub const MAX_ASSET_PATH_LENGTH: usize = 512;
pub const SEAL_KEY_BYTES: usize = 32;
const MAX_KEY_ID: f64 = 255.0;
pub const DEFAULT_ASSET_SEAL_TTL_SECONDS: f64 = 300.0;
pub const DEFAULT_ASSET_SEAL_URL_PREFIX: &str = "s";

pub type Iv = [u8; IV_BYTES];

/// `atob` after the padding `fromBase64Url` adds: forgiving, so the unused bits of a final
/// partial group need not be zero.
const FORGIVING_URL_SAFE: GeneralPurpose =
    GeneralPurpose::new(&URL_SAFE, GeneralPurposeConfig::new().with_decode_allow_trailing_bits(true).with_decode_padding_mode(DecodePaddingMode::RequireNone));

/// `toBase64Url`.
pub fn to_base64_url(bytes: &[u8]) -> String {
    URL_SAFE_NO_PAD.encode(bytes)
}

/// `fromBase64Url`: nothing for an empty string, any character outside the URL-safe alphabet,
/// or a length no padding can complete (which the decoder refuses).
pub fn from_base64_url(value: &str) -> Option<Vec<u8>> {
    if value.is_empty() || !value.bytes().all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_') {
        return None;
    }
    FORGIVING_URL_SAFE.decode(value).ok()
}

/// `isSafeAssetPath`: rooted, at most 512 UTF-16 units, no `..`, `//` or control characters,
/// and under `required_prefix` when one is given.
pub fn is_safe_asset_path(path: &str, required_prefix: Option<&str>) -> bool {
    if !path.starts_with('/') || path.encode_utf16().count() > MAX_ASSET_PATH_LENGTH {
        return false;
    }
    if path.contains("..") || path.contains("//") || path.chars().any(|c| c <= '\u{1f}' || c == '\u{7f}') {
        return false;
    }
    required_prefix.is_none_or(|prefix| path.starts_with(prefix))
}

/// `DataView.setUint32`'s ToUint32.
fn to_uint32(value: f64) -> u32 {
    if !value.is_finite() {
        return 0;
    }
    value.trunc().rem_euclid(4_294_967_296.0) as u32
}

/// `encodePayload`.
pub fn encode_payload(expires_at_seconds: f64, path: &str) -> Vec<u8> {
    let mut bytes: Vec<u8> = to_uint32(expires_at_seconds).to_be_bytes().to_vec();
    bytes.extend_from_slice(path.as_bytes());
    bytes
}

/// `parseSealKeys`: `keyId:base64key` entries, comma-separated, a repeated id keeping its first
/// place and its last key.
pub fn parse_seal_keys(spec: &str) -> Result<IndexMap<u8, Vec<u8>>, String> {
    let mut keys: IndexMap<u8, Vec<u8>> = IndexMap::new();
    for entry in spec.split(',') {
        let trimmed: &str = js_trim(entry);
        if trimmed.is_empty() {
            continue;
        }
        let Some(separator) = trimmed.find(':').filter(|separator| *separator > 0) else {
            return Err("Malformed seal key entry: expected \"keyId:base64key\"".to_string());
        };
        let key_id: f64 = string_to_number(&trimmed[..separator]);
        if key_id.fract() != 0.0 || !(0.0..=MAX_KEY_ID).contains(&key_id) {
            return Err(format!("Seal key id must be an integer in [0, {MAX_KEY_ID}]"));
        }
        let encoded: String = trimmed[separator + 1..].replace('+', "-").replace('/', "_");
        let key: Option<Vec<u8>> = from_base64_url(encoded.trim_end_matches('='));
        let Some(key) = key.filter(|key| key.len() == SEAL_KEY_BYTES) else {
            return Err(format!("Seal key {} must be {SEAL_KEY_BYTES} base64-encoded bytes", number_to_string(key_id)));
        };
        keys.insert(key_id as u8, key);
    }
    if keys.is_empty() {
        return Err("No seal keys configured".to_string());
    }
    Ok(keys)
}

/// `sealAssetPath`, under the given IV.
pub fn seal_asset_path(path: &str, key: &[u8], key_id: u8, expires_at_seconds: f64, iv: &Iv) -> Result<String, String> {
    if !is_safe_asset_path(path, None) {
        return Err(format!("Refusing to seal an unusable asset path: {path}"));
    }
    let cipher: Aes256Gcm = Aes256Gcm::new_from_slice(key).map_err(|_| "Invalid key length".to_string())?;
    let additional_data: [u8; 2] = [SEAL_VERSION, key_id];
    let sealed: Vec<u8> = cipher
        .encrypt(Nonce::from_slice(iv), Payload { msg: &encode_payload(expires_at_seconds, path), aad: &additional_data })
        .map_err(|error| error.to_string())?;
    let mut envelope: Vec<u8> = additional_data.to_vec();
    envelope.extend_from_slice(iv);
    envelope.extend_from_slice(&sealed);
    Ok(to_base64_url(&envelope))
}

fn random_iv() -> Iv {
    let mut iv: Iv = [0; IV_BYTES];
    OsRng.fill_bytes(&mut iv);
    iv
}

fn now_ms() -> f64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_or(0.0, |elapsed| elapsed.as_millis() as f64)
}

/// `new URL(uri)` when it is http(s).
fn http_url(uri: &str) -> Option<Url> {
    Url::parse(uri).ok().filter(|url| matches!(url.scheme(), "http" | "https"))
}

/// `url.search !== ""`: a bare `?` leaves the search empty.
fn has_search(url: &Url) -> bool {
    url.query().is_some_and(|query| !query.is_empty())
}

/// `extensionOf`: a short alphanumeric extension of the last segment, dot included.
fn extension_of(pathname: &str) -> &str {
    let Some(last_dot) = pathname.rfind('.') else {
        return "";
    };
    let after_last_slash: usize = pathname.rfind('/').map_or(0, |slash| slash + 1);
    if last_dot <= after_last_slash {
        return "";
    }
    let extension: &str = &pathname[last_dot..];
    let name: &str = &extension[1..];
    if (1..=8).contains(&name.len()) && name.bytes().all(|byte| byte.is_ascii_alphanumeric()) {
        extension
    } else {
        ""
    }
}

/// `Number.parseInt(value ?? "", 10) || fallback`.
fn int_or(value: Option<String>, fallback: f64) -> f64 {
    let parsed: f64 = parse_int(&value.unwrap_or_default(), 10);
    if parsed.is_nan() || parsed == 0.0 {
        fallback
    } else {
        parsed
    }
}

/// `SealedAssetsResolver`.
#[derive(Debug, Clone)]
pub struct SealedAssetsResolver {
    pub key: Vec<u8>,
    pub key_id: u8,
    pub ttl_seconds: f64,
    pub url_prefix: String,
    /// The time to seal at, in milliseconds since the epoch; now when absent.
    pub now_ms: Option<f64>,
}

impl SealedAssetsResolver {
    /// `resolveAsset(uri).getURL()`, sealing under `iv`.
    pub fn resolve_with_iv(&self, uri: &str, iv: &Iv) -> Result<String, String> {
        let Some(url) = http_url(uri) else {
            return Ok(uri.to_string());
        };
        if has_search(&url) {
            return Err(format!("Cannot seal an asset URL that has a query string: {uri}"));
        }
        let expires: f64 = (self.now_ms.unwrap_or_else(now_ms) / 1000.0).floor() + self.ttl_seconds;
        let blob: String = seal_asset_path(url.path(), &self.key, self.key_id, expires, iv)?;
        Ok(format!("{}/{}/{blob}{}", url.origin().ascii_serialization(), self.url_prefix, extension_of(url.path())))
    }
}

impl AssetsResolver for SealedAssetsResolver {
    fn resolve_asset_url(&self, data: &str) -> Result<String, String> {
        self.resolve_with_iv(data, &random_iv())
    }
}

pub const ASSET_SEAL_KEYS_ENV: &str = "PROSOPO_ASSET_SEAL_KEYS";
pub const ASSET_SEAL_ACTIVE_KEY_ID_ENV: &str = "PROSOPO_ASSET_SEAL_ACTIVE_KEY_ID";
pub const ASSET_SEAL_TTL_ENV: &str = "PROSOPO_ASSET_SEAL_TTL_SECONDS";
pub const ASSET_SEAL_URL_PREFIX_ENV: &str = "PROSOPO_ASSET_SEAL_URL_PREFIX";
pub const ASSET_TOKEN_KEY_ENV: &str = "PROSOPO_ASSET_TOKEN_KEY";
pub const ASSET_TOKEN_TTL_ENV: &str = "PROSOPO_ASSET_TOKEN_TTL_SECONDS";
pub const ASSET_TOKEN_BIND_IP_ENV: &str = "PROSOPO_ASSET_TOKEN_BIND_IP";

fn set(env: &dyn Fn(&str) -> Option<String>, name: &str) -> Option<String> {
    env(name).filter(|value| !value.is_empty())
}

/// `getSealedAssetsResolver`: none until keys are configured; sealing with the configured
/// active key id, else the highest.
pub fn get_sealed_assets_resolver(env: &dyn Fn(&str) -> Option<String>) -> Result<Option<SealedAssetsResolver>, String> {
    let Some(spec) = set(env, ASSET_SEAL_KEYS_ENV) else {
        return Ok(None);
    };
    let keys: IndexMap<u8, Vec<u8>> = parse_seal_keys(&spec)?;
    let key_id: f64 = match set(env, ASSET_SEAL_ACTIVE_KEY_ID_ENV) {
        Some(configured) => {
            let parsed: f64 = parse_int(&configured, 10);
            if parsed.is_nan() {
                return Err("PROSOPO_ASSET_SEAL_ACTIVE_KEY_ID must be an integer".to_string());
            }
            parsed
        }
        None => keys.keys().max().map_or(f64::NEG_INFINITY, |max| f64::from(*max)),
    };
    let key: Option<&Vec<u8>> = (key_id.fract() == 0.0 && (0.0..=MAX_KEY_ID).contains(&key_id)).then(|| keys.get(&(key_id as u8))).flatten();
    let Some(key) = key else {
        return Err(format!("PROSOPO_ASSET_SEAL_ACTIVE_KEY_ID {} is not in PROSOPO_ASSET_SEAL_KEYS", number_to_string(key_id)));
    };
    Ok(Some(SealedAssetsResolver {
        key: key.clone(),
        key_id: key_id as u8,
        ttl_seconds: int_or(env(ASSET_SEAL_TTL_ENV), DEFAULT_ASSET_SEAL_TTL_SECONDS),
        url_prefix: set(env, ASSET_SEAL_URL_PREFIX_ENV).unwrap_or_else(|| DEFAULT_ASSET_SEAL_URL_PREFIX.to_string()),
        now_ms: None,
    }))
}

/// `SignedAssetsResolver`: Bunny token authentication, the URL refused if it has a query.
#[derive(Debug, Clone)]
pub struct SignedAssetsResolver {
    pub security_key: String,
    pub ttl_seconds: f64,
    pub client_ip: Option<String>,
    /// The time to sign at, in milliseconds since the epoch; now when absent.
    pub now_ms: Option<f64>,
}

impl AssetsResolver for SignedAssetsResolver {
    fn resolve_asset_url(&self, data: &str) -> Result<String, String> {
        let Some(url) = http_url(data) else {
            return Ok(data.to_string());
        };
        if has_search(&url) {
            return Err(format!("Cannot sign an asset URL that already has a query string: {data}"));
        }
        let expires: f64 = (self.now_ms.unwrap_or_else(now_ms) / 1000.0).floor() + self.ttl_seconds;
        let token: String = encode_asset_token(&sha256_as_u8a(asset_token_base(&self.security_key, url.path(), expires, self.client_ip.as_deref()).as_bytes()));
        Ok(format!("{}{}?token={token}&expires={}", url.origin().ascii_serialization(), url.path(), number_to_string(expires)))
    }
}

/// `getSignedAssetsResolver`: none without a key; bound to `client_ip` only when
/// `PROSOPO_ASSET_TOKEN_BIND_IP` is `true`.
pub fn get_signed_assets_resolver(env: &dyn Fn(&str) -> Option<String>, client_ip: Option<&str>) -> Option<SignedAssetsResolver> {
    let security_key: String = set(env, ASSET_TOKEN_KEY_ENV)?;
    let bind_ip: bool = env(ASSET_TOKEN_BIND_IP_ENV).as_deref() == Some("true");
    Some(SignedAssetsResolver {
        security_key,
        ttl_seconds: int_or(env(ASSET_TOKEN_TTL_ENV), DEFAULT_ASSET_TOKEN_TTL_SECONDS),
        client_ip: client_ip.filter(|ip| bind_ip && !ip.is_empty()).map(str::to_string),
        now_ms: None,
    })
}

/// The image route's `getSealedAssetsResolver() ?? getSignedAssetsResolver(ip)`.
pub enum ItemAssetsResolver {
    Sealed(SealedAssetsResolver),
    Signed(SignedAssetsResolver),
}

impl ItemAssetsResolver {
    pub fn from_env(env: &dyn Fn(&str) -> Option<String>, client_ip: Option<&str>) -> Result<Option<ItemAssetsResolver>, String> {
        if let Some(sealed) = get_sealed_assets_resolver(env)? {
            return Ok(Some(ItemAssetsResolver::Sealed(sealed)));
        }
        Ok(get_signed_assets_resolver(env, client_ip).map(ItemAssetsResolver::Signed))
    }

    pub fn resolver(&self) -> &dyn AssetsResolver {
        match self {
            ItemAssetsResolver::Sealed(sealed) => sealed,
            ItemAssetsResolver::Signed(signed) => signed,
        }
    }
}

#[cfg(test)]
mod tests {
    //! tests/unit/api/captcha/assetSeal.unit.test.ts and sealedAssetsResolver.unit.test.ts for
    //! the sealing side, tests/unit/signedAssetsResolver.unit.test.ts, and the vectors of
    //! generate-assets.ts.
    use super::*;
    use aes_gcm::aead::Aead;
    use serde_json::{json, Value};
    use std::collections::HashMap;

    const KEY: [u8; 32] = [7; 32];
    const NOW_MS: f64 = 1_700_000_000_000.0;

    /// The edge's `unsealAssetPath`, enough to see what a seal carries.
    fn open(blob: &str, key: &[u8]) -> Option<(u32, String)> {
        let bytes: Vec<u8> = from_base64_url(blob)?;
        let cipher: Aes256Gcm = Aes256Gcm::new_from_slice(key).ok()?;
        let plaintext: Vec<u8> = cipher.decrypt(Nonce::from_slice(&bytes[2..14]), Payload { msg: &bytes[14..], aad: &bytes[..2] }).ok()?;
        Some((u32::from_be_bytes(plaintext[..4].try_into().ok()?), String::from_utf8(plaintext[4..].to_vec()).ok()?))
    }

    fn sealed() -> SealedAssetsResolver {
        SealedAssetsResolver { key: KEY.to_vec(), key_id: 3, ttl_seconds: DEFAULT_ASSET_SEAL_TTL_SECONDS, url_prefix: "s".to_string(), now_ms: Some(NOW_MS) }
    }

    fn blob_of(url: &str) -> &str {
        let last: &str = url.rsplit('/').next().unwrap_or_default();
        last.split('.').next().unwrap_or_default()
    }

    #[test]
    fn a_seal_opens_again_to_the_path_and_says_nothing_about_it() {
        let blob: String = seal_asset_path("/datasets/a/0.jpg", &KEY, 1, 99.0, &random_iv()).expect("seals");
        assert_eq!(open(&blob, &KEY), Some((99, "/datasets/a/0.jpg".to_string())));
        assert!(!blob.contains("datasets"));
        assert!(blob.bytes().all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_'));
    }

    #[test]
    fn a_seal_is_different_every_time_for_the_same_path() {
        let first: String = seal_asset_path("/a.jpg", &KEY, 1, 99.0, &random_iv()).expect("seals");
        let second: String = seal_asset_path("/a.jpg", &KEY, 1, 99.0, &random_iv()).expect("seals");
        assert_ne!(first, second);
    }

    #[test]
    fn refuses_to_seal_a_path_that_could_not_be_served() {
        for path in ["relative", "/a/../b", "//host/x", "/a\nb"] {
            assert!(seal_asset_path(path, &KEY, 1, 99.0, &random_iv()).is_err(), "{path}");
        }
    }

    #[test]
    fn keeps_the_image_on_the_same_zone_under_an_opaque_blob() {
        let url: String = sealed().resolve_asset_url("https://cdn.example.com/datasets/a/0.jpg").expect("seals");
        assert!(url.starts_with("https://cdn.example.com/s/"));
        assert!(url.ends_with(".jpg"));
        assert_eq!(open(blob_of(&url), &KEY), Some((1_700_000_300, "/datasets/a/0.jpg".to_string())));
    }

    #[test]
    fn honours_a_configured_url_prefix_and_ttl() {
        let resolver: SealedAssetsResolver = SealedAssetsResolver { ttl_seconds: 60.0, url_prefix: "img".to_string(), ..sealed() };
        let url: String = resolver.resolve_asset_url("https://cdn.example.com/a.png").expect("seals");
        assert!(url.starts_with("https://cdn.example.com/img/"));
        assert_eq!(open(blob_of(&url), &KEY).map(|(expires, _)| expires), Some(1_700_000_060));
    }

    #[test]
    fn passes_through_anything_that_is_not_an_http_url_and_refuses_a_query() {
        for uri in ["/local/a.jpg", "data:image/png;base64,AAAA", "ftp://x/a.jpg"] {
            assert_eq!(sealed().resolve_asset_url(uri), Ok(uri.to_string()));
        }
        assert!(sealed().resolve_asset_url("https://cdn.example.com/a.jpg?v=1").is_err());
    }

    #[test]
    fn is_off_until_keys_are_configured_and_seals_with_the_highest_key_id_by_default() {
        let none = |_: &str| None;
        assert!(get_sealed_assets_resolver(&none).expect("configures").is_none());
        let keys: String = format!("1:{},4:{}", to_base64_url(&[1; 32]), to_base64_url(&[4; 32]));
        let env = |name: &str| (name == ASSET_SEAL_KEYS_ENV).then(|| keys.clone());
        let resolver: SealedAssetsResolver = get_sealed_assets_resolver(&env).expect("configures").expect("on");
        assert_eq!((resolver.key_id, resolver.key), (4, vec![4; 32]));
    }

    #[test]
    fn refuses_an_active_key_id_it_does_not_hold() {
        let keys: String = format!("1:{}", to_base64_url(&[1; 32]));
        let env = |name: &str| match name {
            ASSET_SEAL_KEYS_ENV => Some(keys.clone()),
            ASSET_SEAL_ACTIVE_KEY_ID_ENV => Some("2".to_string()),
            _ => None,
        };
        assert!(get_sealed_assets_resolver(&env).is_err());
    }

    #[test]
    fn signs_a_url_for_its_path_and_expiry() {
        let signed: SignedAssetsResolver = SignedAssetsResolver { security_key: "k".to_string(), ttl_seconds: 300.0, client_ip: None, now_ms: Some(NOW_MS) };
        let url: String = signed.resolve_asset_url("https://cdn.example.com/a.jpg").expect("signs");
        let token: String = encode_asset_token(&sha256_as_u8a(b"k/a.jpg1700000300"));
        assert_eq!(url, format!("https://cdn.example.com/a.jpg?token={token}&expires=1700000300"));
    }

    fn vectors() -> Value {
        serde_json::from_str(include_str!("../equivalence/assets-vectors.json")).expect("assets-vectors.json parses")
    }

    fn from_hex(text: &str) -> Vec<u8> {
        (0..text.len()).step_by(2).map(|i| u8::from_str_radix(&text[i..i + 2], 16).expect("hex")).collect()
    }

    fn outcome<T: Into<Value>>(result: Result<T, String>) -> Value {
        match result {
            Ok(value) => json!({ "ok": value.into() }),
            Err(error) => json!({ "error": error }),
        }
    }

    #[test]
    fn equivalence_encodes_and_checks_the_format_as_the_ts_does() {
        let vectors: Value = vectors();
        for case in vectors["base64"].as_array().expect("cases") {
            let decoded: Option<String> = from_base64_url(case["input"].as_str().expect("input")).map(hex::encode);
            assert_eq!(json!(decoded), case["decoded"], "{case}");
        }
        for case in vectors["encoded"].as_array().expect("cases") {
            let bytes: Vec<u8> = serde_json::from_value(case["bytes"].clone()).expect("bytes");
            assert_eq!(json!(to_base64_url(&bytes)), case["encoded"], "{case}");
        }
        for case in vectors["safePaths"].as_array().expect("cases") {
            assert_eq!(json!(is_safe_asset_path(case["path"].as_str().expect("path"), case["prefix"].as_str())), case["safe"], "{case}");
        }
        for case in vectors["payloads"].as_array().expect("cases") {
            let expires: f64 = case["expiresAtSeconds"].as_f64().unwrap_or(f64::NAN);
            assert_eq!(json!(hex::encode(encode_payload(expires, "/x"))), case["encoded"], "{case}");
        }
        for case in vectors["keys"].as_array().expect("cases") {
            let parsed = parse_seal_keys(case["spec"].as_str().expect("spec")).map(|keys| keys.iter().map(|(id, key)| json!([id, hex::encode(key)])).collect::<Vec<Value>>());
            assert_eq!(outcome(parsed), case["parsed"], "{case}");
        }
    }

    #[test]
    fn equivalence_seals_the_bytes_the_ts_seals() {
        for case in vectors()["seals"].as_array().expect("cases") {
            let expected: &Value = &case["sealed"];
            let iv: Iv = expected["ok"].as_str().and_then(from_base64_url).map_or([0; IV_BYTES], |bytes| bytes[2..14].try_into().expect("an iv"));
            let sealed = seal_asset_path(
                case["path"].as_str().expect("path"),
                &from_hex(case["key"].as_str().expect("key")),
                case["keyId"].as_u64().expect("key id") as u8,
                case["expiresAtSeconds"].as_f64().expect("expiry"),
                &iv,
            );
            assert_eq!(&outcome(sealed), expected, "{case}");
        }
    }

    #[test]
    fn equivalence_resolves_item_urls_as_the_route_does() {
        let vectors: Value = vectors();
        let now_ms: f64 = vectors["nowMs"].as_f64().expect("a time");
        let uris: Vec<&str> = vectors["uris"].as_array().expect("uris").iter().map(|uri| uri.as_str().expect("a uri")).collect();
        let cases: &Vec<Value> = vectors["resolved"].as_array().expect("cases");
        assert_eq!(cases.len(), 200);
        for case in cases {
            let env: HashMap<String, String> = serde_json::from_value(case["env"].clone()).expect("env");
            let reader = |name: &str| env.get(name).cloned();
            let resolved = ItemAssetsResolver::from_env(&reader, case["clientIp"].as_str()).map(|resolver| {
                let resolver: Option<ItemAssetsResolver> = resolver.map(|resolver| match resolver {
                    ItemAssetsResolver::Sealed(sealed) => ItemAssetsResolver::Sealed(SealedAssetsResolver { now_ms: Some(now_ms), ..sealed }),
                    ItemAssetsResolver::Signed(signed) => ItemAssetsResolver::Signed(SignedAssetsResolver { now_ms: Some(now_ms), ..signed }),
                });
                let expected: &Vec<Value> = case["urls"]["ok"].as_array().expect("urls");
                uris.iter()
                    .zip(expected)
                    .map(|(uri, expected)| {
                        let url = match &resolver {
                            None => Ok(uri.to_string()),
                            Some(ItemAssetsResolver::Sealed(sealed)) => {
                                let iv: Iv = expected["ok"].as_str().and_then(|url| from_base64_url(blob_of(url))).filter(|bytes| bytes.len() > 14).map_or([0; IV_BYTES], |bytes| bytes[2..14].try_into().expect("an iv"));
                                sealed.resolve_with_iv(uri, &iv)
                            }
                            Some(ItemAssetsResolver::Signed(signed)) => signed.resolve_asset_url(uri),
                        };
                        outcome(url.map(|url| if url.is_empty() { uri.to_string() } else { url }))
                    })
                    .collect::<Vec<Value>>()
            });
            assert_eq!(outcome(resolved), case["urls"], "{}", case["env"]);
        }
    }
}
