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

//! The sr25519 JWT: `base64url(header).base64url(payload).base64url(sig)`,
//! signed over the first two parts with the "substrate" context.

use crate::base::{base64_url_decode, base64_url_encode};
use crate::error::{err, Result};
use crate::js::{array_index, json_parse, json_stringify_number, json_stringify_string, JsonValue};
use crate::key::KeypairType;
use crate::sr25519::{sign_raw, sr25519_verify};
use crate::u8a::{hex_to_u8a, u8a_to_hex, u8a_to_string};
use rand_core::{CryptoRng, OsRng, RngCore};
use std::time::{SystemTime, UNIX_EPOCH};

pub type Jwt = String;

const JWT_ALG: &str = "sr25519";
const JWT_HEADER: &str = "{\"alg\":\"sr25519\",\"typ\":\"JWT\"}";
const DEFAULT_LIFETIME_SECONDS: f64 = 300.0;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct JwtIssueOptions {
    pub expires_in: Option<f64>,
    pub not_before: Option<f64>,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct JwtVerifyOptions {
    /// Accepted `aud` values. A token that carries `aud` must name one of them;
    /// one without `aud` passes unless `require_audience` is set.
    pub audience: Option<Vec<String>>,
    pub require_audience: bool,
    /// Reject tokens whose `exp - iat` is longer than this, in seconds.
    pub max_lifetime_seconds: Option<f64>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct JwtVerifyResult {
    pub is_valid: bool,
    pub error: Option<String>,
    /// `None` is the TS `"none"`.
    pub crypto: Option<KeypairType>,
    pub public_key: Vec<u8>,
    pub is_wrapped: bool,
    pub payload: Option<JsonValue>,
}

/// `Date.now()`.
pub fn now_millis() -> f64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0.0, |d| d.as_millis() as f64)
}

fn is_truthy(value: Option<f64>) -> Option<f64> {
    value.filter(|v| *v != 0.0 && !v.is_nan())
}

fn set(entries: &mut Vec<(String, String)>, key: &str, value: String) {
    match entries.iter_mut().find(|(k, _)| k == key) {
        Some(entry) => entry.1 = value,
        None => entries.push((key.to_string(), value)),
    }
}

/// The key order `{ ...message, sub, iat, nbf, exp }` ends up with in JavaScript.
fn payload_entries(message: &[(String, String)], standard: [(&str, String); 4]) -> Vec<(String, String)> {
    let mut entries: Vec<(String, String)> = Vec::new();
    for (key, value) in message {
        set(&mut entries, key, json_stringify_string(value));
    }
    for (key, value) in standard {
        set(&mut entries, key, value);
    }
    let (mut indexed, named): (Vec<(String, String)>, Vec<(String, String)>) =
        entries.into_iter().partition(|(k, _)| array_index(k).is_some());
    indexed.sort_by_key(|(k, _)| array_index(k));
    indexed.extend(named);
    indexed
}

/// `sr25519jwtIssue({ publicKey, secretKey }, options, message)`.
pub fn sr25519_jwt_issue(
    public_key: &[u8],
    secret_key: &[u8],
    options: &JwtIssueOptions,
    message: &[(String, String)],
) -> Result<Jwt> {
    sr25519_jwt_issue_at(public_key, secret_key, options, message, now_millis(), OsRng)
}

/// `sr25519jwtIssue` at a given `Date.now()` (milliseconds) and with the signing randomness supplied.
pub fn sr25519_jwt_issue_at<R: RngCore + CryptoRng>(
    public_key: &[u8],
    secret_key: &[u8],
    options: &JwtIssueOptions,
    message: &[(String, String)],
    now_ms: f64,
    rng: R,
) -> Result<Jwt> {
    if secret_key.len() != 64 {
        return err(format!(
            "Expected secretKey to be 64 bytes, found {}",
            secret_key.len()
        ));
    }
    let now = (now_ms / 1000.0).floor();
    let nbf = is_truthy(options.not_before).map_or(now, f64::floor);
    let lifetime = is_truthy(options.expires_in).map_or(DEFAULT_LIFETIME_SECONDS, f64::floor);
    let entries = payload_entries(
        message,
        [
            ("sub", json_stringify_string(&u8a_to_hex(public_key))),
            ("iat", json_stringify_number(now)),
            ("nbf", json_stringify_number(nbf)),
            ("exp", json_stringify_number(now + lifetime)),
        ],
    );
    let payload = format!(
        "{{{}}}",
        entries
            .iter()
            .map(|(k, v)| format!("{}:{v}", json_stringify_string(k)))
            .collect::<Vec<String>>()
            .join(",")
    );
    let signing_input = format!(
        "{}.{}",
        base64_url_encode(JWT_HEADER.as_bytes()),
        base64_url_encode(payload.as_bytes())
    );
    let signature = sign_raw(signing_input.as_bytes(), secret_key, rng)?;
    Ok(format!("{signing_input}.{}", base64_url_encode(signature.as_slice())))
}

fn parse_part(part: &str) -> Result<JsonValue> {
    json_parse(&u8a_to_string(&base64_url_decode(part)?))
}

fn audience_matches(aud: &JsonValue, accepted: &[String]) -> bool {
    let claimed: Vec<&JsonValue> = match aud {
        JsonValue::Array(items) => items.iter().collect(),
        other => vec![other],
    };
    claimed
        .iter()
        .any(|value| value.as_str().is_some_and(|s| accepted.iter().any(|a| a == s)))
}

fn numeric_date(value: Option<&JsonValue>) -> Option<f64> {
    value.and_then(JsonValue::as_f64).filter(|n| n.is_finite())
}

/// `jwtVerify(jwt, publicKey, options)`.
pub fn jwt_verify(jwt: &str, public_key: &[u8], options: &JwtVerifyOptions) -> Result<JwtVerifyResult> {
    jwt_verify_at(jwt, public_key, options, now_millis())
}

/// `jwtVerify` at a given `Date.now()` (milliseconds).
pub fn jwt_verify_at(
    jwt: &str,
    public_key: &[u8],
    options: &JwtVerifyOptions,
    now_ms: f64,
) -> Result<JwtVerifyResult> {
    let parts: Vec<&str> = jwt.split('.').collect();
    if parts.len() != 3 {
        return err("Invalid JWT format (expected 3 parts)");
    }
    let (header_part, payload_part, sig_part) = (parts[0], parts[1], parts[2]);
    if header_part.is_empty() || payload_part.is_empty() || sig_part.is_empty() {
        return err("Invalid JWT format (empty part)");
    }
    let (Ok(header), Ok(payload)) = (parse_part(header_part), parse_part(payload_part)) else {
        return err("Invalid JWT format (cannot parse header/payload JSON)");
    };
    let invalid = |error: &str, crypto: Option<KeypairType>| -> JwtVerifyResult {
        JwtVerifyResult {
            is_valid: false,
            error: Some(error.to_string()),
            crypto,
            public_key: public_key.to_vec(),
            is_wrapped: false,
            payload: None,
        }
    };
    let pinned = matches!(&header, JsonValue::Object(_))
        && header.get("alg").and_then(JsonValue::as_str) == Some(JWT_ALG);
    if !pinned {
        return Ok(invalid("Unsupported JWT algorithm", None));
    }
    let crypto = Some(KeypairType::Sr25519);
    let signature = base64_url_decode(sig_part)?;
    if signature.is_empty() {
        return Ok(invalid("Missing signature", crypto));
    }
    if !matches!(payload, JsonValue::Object(_)) {
        return Ok(invalid("Invalid payload: not a JSON object", crypto));
    }
    let now = now_ms / 1000.0;
    let (Some(exp), Some(iat)) = (
        numeric_date(payload.get("exp")),
        numeric_date(payload.get("iat")),
    ) else {
        return Ok(invalid(
            "Invalid payload: 'exp' or 'iat' is not a number",
            crypto,
        ));
    };
    if exp < now {
        return Ok(invalid("JWT expired", crypto));
    }
    if let Some(nbf) = payload.get("nbf") {
        let Some(nbf) = numeric_date(Some(nbf)) else {
            return Ok(invalid("Invalid payload: 'nbf' is not a number", crypto));
        };
        if nbf > now {
            return Ok(invalid("JWT not valid yet", crypto));
        }
    }
    if options
        .max_lifetime_seconds
        .is_some_and(|max| exp - iat > max)
    {
        return Ok(invalid("JWT lifetime exceeds the allowed maximum", crypto));
    }
    let Some(sub) = payload.get("sub").and_then(JsonValue::as_str) else {
        return Ok(invalid("Invalid payload: 'sub' is not a string", crypto));
    };
    if let Some(accepted) = &options.audience {
        match payload.get("aud") {
            None if options.require_audience => {
                return Ok(invalid("JWT has no audience", crypto));
            }
            None => {}
            Some(aud) if !audience_matches(aud, accepted) => {
                return Ok(invalid("JWT audience does not match", crypto));
            }
            Some(_) => {}
        }
    }
    if hex_to_u8a(sub) != public_key {
        return Ok(invalid("Subject does not match publicKey", crypto));
    }
    let signing_input = format!("{header_part}.{payload_part}");
    let is_valid = matches!(
        sr25519_verify(signing_input.as_str(), signature.as_slice(), public_key),
        Ok(true)
    );
    Ok(JwtVerifyResult {
        is_valid,
        error: None,
        crypto,
        public_key: public_key.to_vec(),
        is_wrapped: false,
        payload: Some(payload),
    })
}
