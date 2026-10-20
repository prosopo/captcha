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

use std::collections::{BTreeMap, HashMap};
use std::fmt;

use url::Url;

use crate::base64::decode_base64_url;
use crate::ed25519::verify_zip215;
use crate::jwks_resolver::{global_jwks_resolver, Jwk, JwksResolver, JwksResolverOptions};
use crate::parse_signature_agent::parse_signature_agent_header;
use crate::signature_base::{build_signature_base, SignatureBaseInput};
use crate::structured_fields::{parse_signature, parse_signature_input, ParamValue};

const WEB_BOT_AUTH_TAG: &str = "web-bot-auth";
const CLOCK_SKEW_SECONDS: f64 = 5.0;
/// The draft recommends signers keep expiry within 24 hours.
const MAX_VALIDITY_SECONDS: f64 = 24.0 * 60.0 * 60.0;

/// Header lookup by lowercase name, so any HTTP framework's header type can
/// be verified without conversion.
pub trait HeaderLookup {
    fn header(&self, name: &str) -> Option<String>;
}

impl HeaderLookup for HashMap<String, String> {
    fn header(&self, name: &str) -> Option<String> {
        self.get(name).cloned()
    }
}

impl HeaderLookup for BTreeMap<String, String> {
    fn header(&self, name: &str) -> Option<String> {
        self.get(name).cloned()
    }
}

impl HeaderLookup for HashMap<String, Vec<String>> {
    fn header(&self, name: &str) -> Option<String> {
        self.get(name)
            .and_then(|values: &Vec<String>| values.first().cloned())
    }
}

impl HeaderLookup for BTreeMap<String, Vec<String>> {
    fn header(&self, name: &str) -> Option<String> {
        self.get(name)
            .and_then(|values: &Vec<String>| values.first().cloned())
    }
}

impl HeaderLookup for http::HeaderMap {
    /// Values are decoded as latin-1, which is how Node exposes header bytes.
    fn header(&self, name: &str) -> Option<String> {
        self.get(name).map(|value: &http::HeaderValue| {
            value
                .as_bytes()
                .iter()
                .map(|b: &u8| char::from(*b))
                .collect()
        })
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct VerifiableRequest<H: HeaderLookup> {
    pub method: String,
    pub url: String,
    pub headers: H,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum VerifyFailReason {
    NoSignatureHeaders,
    UnparseableSignatureAgent,
    UnparseableSignatureInput,
    UnparseableSignature,
    UnsupportedAlg,
    MissingKeyid,
    Expired,
    MissingCreatedOrExpires,
    NotYetValid,
    ValidityTooLong,
    WrongTag,
    JwksFetchFailed,
    NoMatchingKey,
    MalformedKey,
    BadSignature,
}

impl VerifyFailReason {
    pub fn as_str(self) -> &'static str {
        match self {
            VerifyFailReason::NoSignatureHeaders => "no-signature-headers",
            VerifyFailReason::UnparseableSignatureAgent => "unparseable-signature-agent",
            VerifyFailReason::UnparseableSignatureInput => "unparseable-signature-input",
            VerifyFailReason::UnparseableSignature => "unparseable-signature",
            VerifyFailReason::UnsupportedAlg => "unsupported-alg",
            VerifyFailReason::MissingKeyid => "missing-keyid",
            VerifyFailReason::Expired => "expired",
            VerifyFailReason::MissingCreatedOrExpires => "missing-created-or-expires",
            VerifyFailReason::NotYetValid => "not-yet-valid",
            VerifyFailReason::ValidityTooLong => "validity-too-long",
            VerifyFailReason::WrongTag => "wrong-tag",
            VerifyFailReason::JwksFetchFailed => "jwks-fetch-failed",
            VerifyFailReason::NoMatchingKey => "no-matching-key",
            VerifyFailReason::MalformedKey => "malformed-key",
            VerifyFailReason::BadSignature => "bad-signature",
        }
    }
}

impl fmt::Display for VerifyFailReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum VerifyResult {
    Verified { signer_url: String, keyid: String },
    Failed(VerifyFailReason),
}

impl VerifyResult {
    pub fn verified(&self) -> bool {
        matches!(self, VerifyResult::Verified { .. })
    }
}

/// The cases where the TS `verifyWebBotAuth` rejects instead of resolving.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum VerifyError {
    /// The Signature-Agent header names an unparseable URL.
    InvalidSignatureAgentUrl,
    /// The JWKS `keys` array has a `null` before any key matching the keyid.
    NullJwk,
}

impl fmt::Display for VerifyError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            VerifyError::InvalidSignatureAgentUrl => "Invalid URL",
            VerifyError::NullJwk => "Cannot read properties of null (reading 'kid')",
        })
    }
}

impl std::error::Error for VerifyError {}

fn non_empty_header<H: HeaderLookup>(headers: &H, name: &str) -> Option<String> {
    headers.header(name).filter(|v: &String| !v.is_empty())
}

/// Only OKP/Ed25519 keys qualify, so a signer publishing RSA or ECDSA keys
/// in the same directory never matches a web-bot-auth signature.
fn jwk_to_ed25519_public_key(jwk: &Jwk) -> Option<Vec<u8>> {
    if jwk.kty() != Some("OKP") || jwk.crv() != Some("Ed25519") {
        return None;
    }
    let bytes: Vec<u8> = decode_base64_url(jwk.x()?).ok()?;
    (bytes.len() == 32).then_some(bytes)
}

fn find_jwk<'a>(jwks: &'a [Jwk], keyid: &str) -> Result<Option<&'a Jwk>, VerifyError> {
    for jwk in jwks {
        if jwk.0.is_null() {
            return Err(VerifyError::NullJwk);
        }
        if jwk.kid() == Some(keyid) {
            return Ok(Some(jwk));
        }
    }
    Ok(None)
}

fn request_authority(url: &str) -> Option<String> {
    let url: Url = Url::parse(url).ok()?;
    let host: &str = url.host_str().unwrap_or("");
    let authority: String = match url.port() {
        Some(port) => format!("{host}:{port}"),
        None => host.to_string(),
    };
    Some(authority.to_lowercase())
}

impl JwksResolver {
    pub async fn verify_web_bot_auth<H: HeaderLookup>(
        &self,
        request: &VerifiableRequest<H>,
        options: &JwksResolverOptions,
    ) -> Result<VerifyResult, VerifyError> {
        use VerifyFailReason as Reason;
        let fail = |reason: Reason| -> Result<VerifyResult, VerifyError> {
            Ok(VerifyResult::Failed(reason))
        };

        let (Some(signature_agent_raw), Some(signature_input_raw), Some(signature_raw)) = (
            non_empty_header(&request.headers, "signature-agent"),
            non_empty_header(&request.headers, "signature-input"),
            non_empty_header(&request.headers, "signature"),
        ) else {
            return fail(Reason::NoSignatureHeaders);
        };

        let Some(signer_url) = parse_signature_agent_header(&signature_agent_raw)
            .map_err(|_| VerifyError::InvalidSignatureAgentUrl)?
        else {
            return fail(Reason::UnparseableSignatureAgent);
        };

        let Some(input_entry) = parse_signature_input(&signature_input_raw) else {
            return fail(Reason::UnparseableSignatureInput);
        };
        let params = &input_entry.params;

        match params.get("alg") {
            None => {}
            Some(ParamValue::String(alg)) if alg == "ed25519" => {}
            Some(_) => return fail(Reason::UnsupportedAlg),
        }

        // created, expires and the tag are the only replay defence: the
        // signature covers just the authority and the agent header.
        if !matches!(params.get("tag"), Some(ParamValue::String(tag)) if tag == WEB_BOT_AUTH_TAG) {
            return fail(Reason::WrongTag);
        }
        let (Some(ParamValue::Number(created)), Some(ParamValue::Number(expires))) =
            (params.get("created"), params.get("expires"))
        else {
            return fail(Reason::MissingCreatedOrExpires);
        };
        let now_seconds: f64 = self.now_ms() / 1000.0;
        if *expires < now_seconds {
            return fail(Reason::Expired);
        }
        if *created > now_seconds + CLOCK_SKEW_SECONDS {
            return fail(Reason::NotYetValid);
        }
        if expires - created > MAX_VALIDITY_SECONDS {
            return fail(Reason::ValidityTooLong);
        }

        let keyid: String = match params.get("keyid") {
            Some(ParamValue::String(keyid)) if !keyid.is_empty() => keyid.clone(),
            _ => return fail(Reason::MissingKeyid),
        };

        let Some(signature_bytes) = parse_signature(&signature_raw, &input_entry.label) else {
            return fail(Reason::UnparseableSignature);
        };

        let Ok(jwks) = self
            .resolve_jwks_from_signature_agent(&signer_url, options)
            .await
        else {
            return fail(Reason::JwksFetchFailed);
        };

        let Some(jwk) = find_jwk(&jwks, &keyid)? else {
            return fail(Reason::NoMatchingKey);
        };

        let Some(public_key) = jwk_to_ed25519_public_key(jwk) else {
            return fail(Reason::MalformedKey);
        };

        let Some(authority) = request_authority(&request.url) else {
            return fail(Reason::BadSignature);
        };

        let Ok(signature_base) = build_signature_base(
            &input_entry.covered_components,
            &SignatureBaseInput {
                authority,
                signature_agent: signature_agent_raw,
            },
            &input_entry.serialised_value,
        ) else {
            return fail(Reason::BadSignature);
        };

        if verify_zip215(&signature_bytes, signature_base.as_bytes(), &public_key) {
            Ok(VerifyResult::Verified { signer_url, keyid })
        } else {
            fail(Reason::BadSignature)
        }
    }
}

/// Verifies against the process-wide JWKS cache and the system clock.
pub async fn verify_web_bot_auth<H: HeaderLookup>(
    request: &VerifiableRequest<H>,
    options: &JwksResolverOptions,
) -> Result<VerifyResult, VerifyError> {
    global_jwks_resolver()
        .verify_web_bot_auth(request, options)
        .await
}
