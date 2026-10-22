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

//! `jsonwebtoken` 9 with a string secret: `sign` with HS256 and an expiry, and `verify` with its
//! checks in its order and its messages.

use base64::engine::general_purpose::{STANDARD_NO_PAD, URL_SAFE_NO_PAD};
use base64::Engine;
use hmac::{Hmac, Mac};
use prosopo_logger::json_stringify;
use serde_json::{json, Map, Value};
use sha2::{Sha256, Sha384, Sha512};

/// `jws.sign`'s HMAC of `input`, in base64url without padding; `None` for an algorithm not HS.
fn hmac(alg: &str, secret: &[u8], input: &[u8]) -> Option<String> {
    macro_rules! mac {
        ($digest:ty) => {{
            let mut mac = Hmac::<$digest>::new_from_slice(secret).expect("HMAC takes a key of any length");
            mac.update(input);
            mac.finalize().into_bytes().to_vec()
        }};
    }
    let bytes: Vec<u8> = match alg {
        "HS256" => mac!(Sha256),
        "HS384" => mac!(Sha384),
        "HS512" => mac!(Sha512),
        _ => return None,
    };
    Some(URL_SAFE_NO_PAD.encode(bytes))
}

/// `jwt.sign(claims, secret, { expiresIn })` at `now_seconds`: `iat` and `exp` after the claims.
pub fn sign(claims: Map<String, Value>, secret: &str, expires_in_seconds: i64, now_seconds: i64) -> String {
    let mut payload: Map<String, Value> = claims;
    payload.insert("iat".to_string(), json!(now_seconds));
    payload.insert("exp".to_string(), json!(now_seconds + expires_in_seconds));
    let header: String = URL_SAFE_NO_PAD.encode(r#"{"alg":"HS256","typ":"JWT"}"#);
    let body: String = URL_SAFE_NO_PAD.encode(json_stringify(&Value::Object(payload), 0));
    let input: String = format!("{header}.{body}");
    let signature: String = hmac("HS256", secret.as_bytes(), input.as_bytes()).expect("HS256 is an HMAC");
    format!("{input}.{signature}")
}

/// `Buffer.from(text, "base64")`: either alphabet, a final lone character ignored.
fn node_base64(text: &str) -> Vec<u8> {
    let standard: String = text.replace('-', "+").replace('_', "/");
    let usable: &str = if standard.len() % 4 == 1 { &standard[..standard.len() - 1] } else { &standard };
    STANDARD_NO_PAD.decode(usable).unwrap_or_default()
}

/// jws's `JWS_REGEX`: `/^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$/`.
fn is_jws_shape(parts: &[&str]) -> bool {
    let alphabet = |part: &str| part.bytes().all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_');
    parts.len() == 3 && !parts[0].is_empty() && !parts[1].is_empty() && parts.iter().all(|part| alphabet(part))
}

fn is_truthy(value: &Value) -> bool {
    match value {
        Value::Null => false,
        Value::Bool(flag) => *flag,
        Value::Number(number) => number.as_f64().is_some_and(|n| n != 0.0 && !n.is_nan()),
        Value::String(text) => !text.is_empty(),
        Value::Array(_) | Value::Object(_) => true,
    }
}

/// `jwt.verify(token, secret)` at `now_seconds`: the payload, or the error's message.
pub fn verify(token: &str, secret: &str, now_seconds: f64) -> Result<Value, String> {
    if token.is_empty() {
        return Err("jwt must be provided".to_string());
    }
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return Err("jwt malformed".to_string());
    }
    if !is_jws_shape(&parts) {
        return Err("invalid token".to_string());
    }
    let header_text: String = node_base64(parts[0]).iter().map(|&byte| byte as char).collect();
    let header: Value = match serde_json::from_str::<Value>(&header_text) {
        Ok(header) if is_truthy(&header) => header,
        _ => return Err("invalid token".to_string()),
    };
    let payload_text: String = String::from_utf8_lossy(&node_base64(parts[1])).into_owned();
    let payload: Value = if header.get("typ") == Some(&json!("JWT")) {
        serde_json::from_str(&payload_text).map_err(|_| format!("Unexpected token in JSON: {payload_text}"))?
    } else {
        match serde_json::from_str::<Value>(&payload_text) {
            Ok(object @ Value::Object(_)) | Ok(object @ Value::Array(_)) => object,
            _ => Value::String(payload_text),
        }
    };
    if parts[2].trim().is_empty() {
        return Err("jwt signature is required".to_string());
    }
    let alg: &str = header.get("alg").and_then(Value::as_str).unwrap_or_default();
    let Some(expected) = hmac(alg, secret.as_bytes(), format!("{}.{}", parts[0], parts[1]).as_bytes()) else {
        return Err("invalid algorithm".to_string());
    };
    if expected != parts[2] {
        return Err("invalid signature".to_string());
    }
    if payload.is_null() {
        return Err("Cannot read properties of null (reading 'nbf')".to_string());
    }
    if let Some(nbf) = payload.get("nbf") {
        let Some(nbf) = nbf.as_f64() else {
            return Err("invalid nbf value".to_string());
        };
        if nbf > now_seconds {
            return Err("jwt not active".to_string());
        }
    }
    if let Some(exp) = payload.get("exp") {
        let Some(exp) = exp.as_f64() else {
            return Err("invalid exp value".to_string());
        };
        if now_seconds >= exp {
            return Err("jwt expired".to_string());
        }
    }
    Ok(payload)
}

/// Whether a verified payload is truthy, as `if (!decodedToken)` reads it.
pub fn is_truthy_payload(payload: &Value) -> bool {
    is_truthy(payload)
}

#[cfg(test)]
mod tests {
    use super::*;

    const NOW: i64 = 1_792_651_297;

    fn claims() -> Map<String, Value> {
        json!({ "email": "seed@example.com" }).as_object().cloned().unwrap_or_default()
    }

    /// The token is `jwt.sign({ email, iat: NOW }, "secret", { expiresIn: "1h" })` from jsonwebtoken 9.0.3.
    #[test]
    fn signs_as_jsonwebtoken_does() {
        assert_eq!(
            sign(claims(), "secret", 3600, NOW),
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InNlZWRAZXhhbXBsZS5jb20iLCJpYXQiOjE3OTI2NTEyOTcsImV4cCI6MTc5MjY1NDg5N30.dgJaoN6MQ136Lw5ltLGswuSDLhVhXH-EyIwqtfxkotU"
        );
    }

    #[test]
    fn verifies_in_jsonwebtokens_order() {
        let token: String = sign(claims(), "secret", 3600, NOW);
        assert_eq!(verify(&token, "secret", NOW as f64).map(|payload| payload["email"].clone()), Ok(json!("seed@example.com")));
        assert_eq!(verify(&token, "secret", (NOW + 3600) as f64), Err("jwt expired".to_string()));
        assert_eq!(verify(&token, "other", NOW as f64), Err("invalid signature".to_string()));
        assert_eq!(verify("abc", "secret", 0.0), Err("jwt malformed".to_string()));
        assert_eq!(verify("a.b.c", "secret", 0.0), Err("invalid token".to_string()));
        assert_eq!(verify("", "secret", 0.0), Err("jwt must be provided".to_string()));
        let unsigned: String = token.rsplit_once('.').map(|(input, _)| format!("{input}.")).unwrap_or_default();
        assert_eq!(verify(&unsigned, "secret", NOW as f64), Err("jwt signature is required".to_string()));
        let none: String = format!("{}.{}.x", URL_SAFE_NO_PAD.encode(r#"{"alg":"none"}"#), URL_SAFE_NO_PAD.encode("{}"));
        assert_eq!(verify(&none, "secret", 0.0), Err("invalid algorithm".to_string()));
    }

    #[test]
    fn decodes_base64_as_node_buffers_do() {
        assert_eq!(node_base64("eyJ9"), b"{\"}".to_vec());
        assert_eq!(node_base64("eyJ9e"), b"{\"}".to_vec());
        assert_eq!(node_base64("YQ"), b"a".to_vec());
    }
}
