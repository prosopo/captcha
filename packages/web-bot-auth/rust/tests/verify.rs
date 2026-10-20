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

// Ported from src/tests/verify.test.ts

use std::collections::HashMap;
use std::sync::Arc;

use ed25519_dalek::{Signer, SigningKey};

use super::support::{FakeClock, MockFetch};
use crate::jwks_resolver::{JwksFetch, JwksResolver, JwksResolverOptions};
use crate::signature_base::{build_signature_base, SignatureBaseInput};
use crate::verify::{VerifiableRequest, VerifyFailReason, VerifyResult};

const KEY_ID: &str = "test-key-1";
const SIGNER_URL: &str = "https://signer.example.com";
const AUTHORITY: &str = "target.example.com";
const REQUEST_URL: &str = "https://target.example.com/api/thing";
const COVERED: &str = "(\"@authority\" \"signature-agent\")";
const NOW_SECONDS: i64 = 1_767_225_600;

const B64: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

fn to_base64(bytes: &[u8]) -> String {
    let mut out: String = String::new();
    for chunk in bytes.chunks(3) {
        let n: u32 = chunk
            .iter()
            .enumerate()
            .fold(0, |acc: u32, (i, b)| acc | (u32::from(*b) << (16 - 8 * i)));
        for i in 0..4 {
            if i <= chunk.len() {
                out.push(char::from(B64[((n >> (18 - 6 * i)) & 63) as usize]));
            } else {
                out.push('=');
            }
        }
    }
    out
}

fn to_base64_url(bytes: &[u8]) -> String {
    to_base64(bytes)
        .replace('+', "-")
        .replace('/', "_")
        .trim_end_matches('=')
        .to_string()
}

fn signature_agent_header() -> String {
    format!("\"{SIGNER_URL}\"")
}

fn signing_key(seed: u8) -> SigningKey {
    SigningKey::from_bytes(&[seed; 32])
}

struct SignedRequest {
    fetch: Arc<MockFetch>,
    request: VerifiableRequest<HashMap<String, String>>,
}

fn jwks_fetch(kid: &str, key: &SigningKey) -> Arc<MockFetch> {
    let body: String = serde_json::json!({
        "keys": [{
            "kty": "OKP",
            "crv": "Ed25519",
            "alg": "EdDSA",
            "kid": kid,
            "x": to_base64_url(key.verifying_key().as_bytes()),
        }]
    })
    .to_string();
    MockFetch::ok(
        body,
        vec![("content-type".into(), "application/json".into())],
    )
}

fn build_signed_request(
    key: &SigningKey,
    expires_seconds: i64,
    params_override: Option<String>,
) -> SignedRequest {
    let created: i64 = NOW_SECONDS;
    let params: String = params_override.unwrap_or_else(|| {
        format!("{COVERED};created={created};expires={expires_seconds};keyid=\"{KEY_ID}\";alg=\"ed25519\";tag=\"web-bot-auth\"")
    });
    let base: String = build_signature_base(
        &["@authority", "signature-agent"],
        &SignatureBaseInput {
            authority: AUTHORITY.into(),
            signature_agent: signature_agent_header(),
        },
        &params,
    )
    .expect("base");
    let signature = key.sign(base.as_bytes());
    let headers: HashMap<String, String> = HashMap::from([
        ("signature-agent".to_string(), signature_agent_header()),
        ("signature-input".to_string(), format!("sig1={params}")),
        (
            "signature".to_string(),
            format!("sig1=:{}:", to_base64(&signature.to_bytes())),
        ),
    ]);
    SignedRequest {
        fetch: jwks_fetch(KEY_ID, key),
        request: VerifiableRequest {
            method: "GET".into(),
            url: REQUEST_URL.into(),
            headers,
        },
    }
}

fn resolver() -> JwksResolver {
    FakeClock::new(NOW_SECONDS as f64 * 1000.0).resolver()
}

fn options(fetch: &Arc<MockFetch>) -> JwksResolverOptions {
    JwksResolverOptions {
        fetch: Some(Arc::clone(fetch) as Arc<dyn JwksFetch>),
        ..JwksResolverOptions::default()
    }
}

#[tokio::test]
async fn verifies_a_fresh_correctly_signed_request() {
    let signed: SignedRequest = build_signed_request(&signing_key(1), NOW_SECONDS + 60, None);
    let result = resolver()
        .verify_web_bot_auth(&signed.request, &options(&signed.fetch))
        .await;
    assert_eq!(
        result,
        Ok(VerifyResult::Verified {
            signer_url: SIGNER_URL.into(),
            keyid: KEY_ID.into(),
        })
    );
}

#[tokio::test]
async fn rejects_when_signature_bytes_are_flipped() {
    let key: SigningKey = signing_key(2);
    let mut signed: SignedRequest = build_signed_request(&key, NOW_SECONDS + 60, None);
    let original: String = signed.request.headers["signature"].clone();
    let mut bytes: Vec<u8> =
        crate::base64::decode_base64(&original["sig1=:".len()..original.len() - 1]).expect("b64");
    bytes[0] ^= 0xff;
    signed
        .request
        .headers
        .insert("signature".into(), format!("sig1=:{}:", to_base64(&bytes)));
    let result = resolver()
        .verify_web_bot_auth(&signed.request, &options(&signed.fetch))
        .await;
    assert_eq!(
        result,
        Ok(VerifyResult::Failed(VerifyFailReason::BadSignature))
    );
}

#[tokio::test]
async fn rejects_an_expired_signature_before_touching_jwks() {
    let signed: SignedRequest = build_signed_request(&signing_key(3), NOW_SECONDS - 60, None);
    let fetch: Arc<MockFetch> = MockFetch::ok("{}".into(), Vec::new());
    let result = resolver()
        .verify_web_bot_auth(&signed.request, &options(&fetch))
        .await;
    assert_eq!(result, Ok(VerifyResult::Failed(VerifyFailReason::Expired)));
    assert_eq!(fetch.call_count(), 0);
}

fn tail() -> String {
    format!("keyid=\"{KEY_ID}\";alg=\"ed25519\"")
}

async fn assert_rejected_without_fetch(params: String, reason: VerifyFailReason) {
    let signed: SignedRequest = build_signed_request(&signing_key(4), 0, Some(params));
    let result = resolver()
        .verify_web_bot_auth(&signed.request, &options(&signed.fetch))
        .await;
    assert_eq!(result, Ok(VerifyResult::Failed(reason)));
    assert_eq!(signed.fetch.call_count(), 0);
}

#[tokio::test]
async fn rejects_no_expires_so_it_would_verify_forever() {
    let now: i64 = NOW_SECONDS;
    assert_rejected_without_fetch(
        format!("{COVERED};created={now};{};tag=\"web-bot-auth\"", tail()),
        VerifyFailReason::MissingCreatedOrExpires,
    )
    .await;
}

#[tokio::test]
async fn rejects_no_created() {
    let now: i64 = NOW_SECONDS;
    assert_rejected_without_fetch(
        format!(
            "{COVERED};expires={};{};tag=\"web-bot-auth\"",
            now + 60,
            tail()
        ),
        VerifyFailReason::MissingCreatedOrExpires,
    )
    .await;
}

#[tokio::test]
async fn rejects_created_in_the_future() {
    let now: i64 = NOW_SECONDS;
    assert_rejected_without_fetch(
        format!(
            "{COVERED};created={};expires={};{};tag=\"web-bot-auth\"",
            now + 3600,
            now + 3660,
            tail()
        ),
        VerifyFailReason::NotYetValid,
    )
    .await;
}

#[tokio::test]
async fn rejects_created_just_beyond_the_clock_skew_allowance() {
    let now: i64 = NOW_SECONDS;
    assert_rejected_without_fetch(
        format!(
            "{COVERED};created={};expires={};{};tag=\"web-bot-auth\"",
            now + 10,
            now + 70,
            tail()
        ),
        VerifyFailReason::NotYetValid,
    )
    .await;
}

#[tokio::test]
async fn rejects_a_validity_window_longer_than_24_hours() {
    let now: i64 = NOW_SECONDS;
    assert_rejected_without_fetch(
        format!(
            "{COVERED};created={now};expires={};{};tag=\"web-bot-auth\"",
            now + 400 * 24 * 3600,
            tail()
        ),
        VerifyFailReason::ValidityTooLong,
    )
    .await;
}

#[tokio::test]
async fn rejects_no_web_bot_auth_tag() {
    let now: i64 = NOW_SECONDS;
    assert_rejected_without_fetch(
        format!("{COVERED};created={now};expires={};{}", now + 60, tail()),
        VerifyFailReason::WrongTag,
    )
    .await;
}

#[tokio::test]
async fn rejects_a_different_tag() {
    let now: i64 = NOW_SECONDS;
    assert_rejected_without_fetch(
        format!(
            "{COVERED};created={now};expires={};{};tag=\"something-else\"",
            now + 60,
            tail()
        ),
        VerifyFailReason::WrongTag,
    )
    .await;
}

#[tokio::test]
async fn accepts_created_a_few_seconds_ahead_for_clock_skew() {
    let now: i64 = NOW_SECONDS;
    let signed: SignedRequest = build_signed_request(
        &signing_key(5),
        0,
        Some(format!(
            "{COVERED};created={};expires={};{};tag=\"web-bot-auth\"",
            now + 3,
            now + 63,
            tail()
        )),
    );
    let result = resolver()
        .verify_web_bot_auth(&signed.request, &options(&signed.fetch))
        .await
        .expect("result");
    assert!(result.verified());
}

#[tokio::test]
async fn rejects_when_the_jwks_has_no_matching_kid() {
    let key: SigningKey = signing_key(6);
    let signed: SignedRequest = build_signed_request(&key, NOW_SECONDS + 60, None);
    let fetch: Arc<MockFetch> = jwks_fetch("some-other-kid", &key);
    let result = resolver()
        .verify_web_bot_auth(&signed.request, &options(&fetch))
        .await;
    assert_eq!(
        result,
        Ok(VerifyResult::Failed(VerifyFailReason::NoMatchingKey))
    );
}

#[tokio::test]
async fn returns_no_signature_headers_when_the_request_is_unsigned() {
    let request: VerifiableRequest<HashMap<String, String>> = VerifiableRequest {
        method: "GET".into(),
        url: REQUEST_URL.into(),
        headers: HashMap::new(),
    };
    let result = resolver()
        .verify_web_bot_auth(&request, &JwksResolverOptions::default())
        .await;
    assert_eq!(
        result,
        Ok(VerifyResult::Failed(VerifyFailReason::NoSignatureHeaders))
    );
}
