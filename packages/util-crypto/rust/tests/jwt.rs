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

// Ported from src/jwt/jwtVerify.spec.ts
use crate::base::{base64_url_decode, base64_url_encode};
use crate::js::{json_parse, JsonValue};
use crate::jwt::{jwt_verify, now_millis, sr25519_jwt_issue, JwtIssueOptions, JwtVerifyOptions, JwtVerifyResult};
use crate::key::KeypairType;
use crate::sr25519::{sr25519_from_seed, sr25519_sign, Keypair};
use crate::u8a::{u8a_to_hex, u8a_to_string, u8a_wrap_bytes};

fn pair(fill: u8) -> Keypair {
    sr25519_from_seed(&[fill; 32]).expect("valid seed")
}

fn issue(pair: &Keypair, expires_in: Option<f64>, claims: &[(&str, &str)]) -> String {
    let claims: Vec<(String, String)> = claims.iter().map(|(k, v)| (k.to_string(), v.to_string())).collect();
    let options = JwtIssueOptions {
        expires_in,
        not_before: None,
    };
    sr25519_jwt_issue(&pair.public_key, &pair.secret_key, &options, &claims).expect("issues")
}

fn verify(jwt: &str, public_key: &[u8], options: &JwtVerifyOptions) -> JwtVerifyResult {
    jwt_verify(jwt, public_key, options).expect("does not throw")
}

fn audience(values: &[&str], require_audience: bool) -> JwtVerifyOptions {
    JwtVerifyOptions {
        audience: Some(values.iter().map(|v| v.to_string()).collect()),
        require_audience,
        max_lifetime_seconds: None,
    }
}

fn now_seconds() -> f64 {
    (now_millis() / 1000.0).floor()
}

mod jwt_signature_verify {
    use super::*;

    #[test]
    fn throws_on_invalid_header_payload() {
        let error = jwt_verify("blah.blah.blah", &[0u8; 32], &JwtVerifyOptions::default()).expect_err("throws");
        assert_eq!(error.message(), "Invalid JWT format (cannot parse header/payload JSON)");
    }

    #[test]
    fn throws_on_invalid_jwt_format() {
        let jwt = format!("blah.blah{}", u8a_to_hex(&[0u8; 64]));
        let error = jwt_verify(&jwt, &[0u8; 32], &JwtVerifyOptions::default()).expect_err("throws");
        assert!(error.message().contains("Invalid JWT format"));
    }

    #[test]
    fn returns_true_on_valid_sr25519_jwt() {
        let pair = pair(1);
        assert!(verify(&issue(&pair, Some(300.0), &[]), &pair.public_key, &JwtVerifyOptions::default()).is_valid);
    }

    #[test]
    fn returns_false_on_expired_sr25519_jwt() {
        let pair = pair(1);
        assert!(!verify(&issue(&pair, Some(-1.0), &[]), &pair.public_key, &JwtVerifyOptions::default()).is_valid);
    }

    #[test]
    fn accepts_a_token_whose_aud_is_an_accepted_audience() {
        let pair = pair(1);
        let jwt = issue(&pair, Some(300.0), &[("aud", "https://pronode1.prosopo.io")]);
        assert!(verify(&jwt, &pair.public_key, &audience(&["https://pronode1.prosopo.io"], false)).is_valid);
    }

    #[test]
    fn rejects_a_token_minted_for_another_audience() {
        let pair = pair(1);
        let jwt = issue(&pair, Some(300.0), &[("aud", "https://pronode2.prosopo.io")]);
        let result = verify(&jwt, &pair.public_key, &audience(&["https://pronode1.prosopo.io"], false));
        assert!(!result.is_valid);
        assert_eq!(result.error.as_deref(), Some("JWT audience does not match"));
    }

    #[test]
    fn still_accepts_a_token_without_aud_unless_audience_is_required() {
        let pair = pair(1);
        let jwt = issue(&pair, Some(300.0), &[]);
        assert!(verify(&jwt, &pair.public_key, &audience(&["pronode1.prosopo.io"], false)).is_valid);
        let required = verify(&jwt, &pair.public_key, &audience(&["pronode1.prosopo.io"], true));
        assert!(!required.is_valid);
        assert_eq!(required.error.as_deref(), Some("JWT has no audience"));
    }

    #[test]
    fn rejects_a_token_whose_lifetime_exceeds_the_maximum() {
        let pair = pair(1);
        let options = JwtVerifyOptions {
            max_lifetime_seconds: Some(3600.0),
            ..JwtVerifyOptions::default()
        };
        let result = verify(&issue(&pair, Some(7200.0), &[]), &pair.public_key, &options);
        assert!(!result.is_valid);
        assert_eq!(result.error.as_deref(), Some("JWT lifetime exceeds the allowed maximum"));
        assert!(verify(&issue(&pair, Some(3600.0), &[]), &pair.public_key, &options).is_valid);
    }
}

fn payload_for(public_key: &[u8]) -> String {
    let now = now_seconds();
    format!(
        "{{\"sub\":\"{}\",\"iat\":{now},\"nbf\":{now},\"exp\":{}}}",
        u8a_to_hex(public_key),
        now + 300.0
    )
}

fn sign_token(header: &str, payload: &str, sign: impl Fn(&str) -> Vec<u8>) -> String {
    let signing_input = format!(
        "{}.{}",
        base64_url_encode(header.as_bytes()),
        base64_url_encode(payload.as_bytes())
    );
    format!("{signing_input}.{}", base64_url_encode(sign(&signing_input).as_slice()))
}

mod algorithm_pinning {
    use super::*;

    const HEADER: &str = "{\"alg\":\"sr25519\",\"typ\":\"JWT\"}";

    fn signing_pair() -> Keypair {
        pair(2)
    }

    fn sign_with(pair: &Keypair) -> impl Fn(&str) -> Vec<u8> + '_ {
        move |input: &str| sr25519_sign(input, &pair.secret_key).expect("signs")
    }

    #[test]
    fn accepts_the_header_sr25519_jwt_issue_writes() {
        let pair = signing_pair();
        let token = issue(&pair, None, &[]);
        let header_part = token.split('.').next().unwrap_or_default();
        let header = json_parse(&u8a_to_string(&base64_url_decode(header_part).unwrap_or_default()));
        assert_eq!(
            header,
            Ok(JsonValue::Object(vec![
                ("alg".to_string(), JsonValue::String("sr25519".to_string())),
                ("typ".to_string(), JsonValue::String("JWT".to_string())),
            ]))
        );
        assert!(verify(&token, &pair.public_key, &JwtVerifyOptions::default()).is_valid);
    }

    #[test]
    fn rejects_a_validly_signed_token_with_an_unpinned_header() {
        let pair = signing_pair();
        let headers = [
            "{\"alg\":\"none\",\"typ\":\"JWT\"}",
            "{\"alg\":\"HS256\",\"typ\":\"JWT\"}",
            "{\"alg\":\"ed25519\",\"typ\":\"JWT\"}",
            "{\"alg\":\"ecdsa\",\"typ\":\"JWT\"}",
            "{\"alg\":\"SR25519\",\"typ\":\"JWT\"}",
            "{\"typ\":\"JWT\"}",
            "{\"alg\":1,\"typ\":\"JWT\"}",
            "{\"alg\":[\"sr25519\"],\"typ\":\"JWT\"}",
            "null",
            "\"sr25519\"",
        ];
        for header in headers {
            let token = sign_token(header, &payload_for(&pair.public_key), sign_with(&pair));
            let result = verify(&token, &pair.public_key, &JwtVerifyOptions::default());
            assert!(!result.is_valid, "{header}");
            assert_eq!(result.error.as_deref(), Some("Unsupported JWT algorithm"), "{header}");
        }
    }

    #[test]
    fn rejects_a_signature_over_the_bytes_wrapped_signing_input() {
        let pair = signing_pair();
        let token = sign_token(HEADER, &payload_for(&pair.public_key), |input| {
            sr25519_sign(&u8a_wrap_bytes(input.as_bytes()), &pair.secret_key).expect("signs")
        });
        assert!(!verify(&token, &pair.public_key, &JwtVerifyOptions::default()).is_valid);
    }

    #[test]
    fn rejects_a_multisig_prefixed_signature() {
        let pair = signing_pair();
        let token = sign_token(HEADER, &payload_for(&pair.public_key), |input| {
            [vec![1u8], sr25519_sign(input, &pair.secret_key).expect("signs")].concat()
        });
        assert!(!verify(&token, &pair.public_key, &JwtVerifyOptions::default()).is_valid);
    }

    #[test]
    fn rejects_a_signature_of_the_wrong_length_without_throwing() {
        let pair = signing_pair();
        let token = sign_token(HEADER, &payload_for(&pair.public_key), |input| {
            sr25519_sign(input, &pair.secret_key).expect("signs")[..63].to_vec()
        });
        assert!(!verify(&token, &pair.public_key, &JwtVerifyOptions::default()).is_valid);
    }

    #[test]
    fn reports_sr25519_as_the_crypto_of_a_valid_token() {
        let pair = signing_pair();
        let result = verify(&issue(&pair, None, &[]), &pair.public_key, &JwtVerifyOptions::default());
        assert!(result.is_valid);
        assert_eq!(result.crypto, Some(KeypairType::Sr25519));
        assert!(!result.is_wrapped);
    }
}

mod time_and_payload_claims {
    use super::*;

    fn claims_pair() -> Keypair {
        pair(3)
    }

    fn sign_raw_payload(payload_json: &str) -> String {
        let pair = claims_pair();
        sign_token("{\"alg\":\"sr25519\",\"typ\":\"JWT\"}", payload_json, |input| {
            sr25519_sign(input, &pair.secret_key).expect("signs")
        })
    }

    fn claims_json(overrides: &[(&str, &str)]) -> String {
        let now = now_seconds();
        let mut claims: Vec<(String, String)> = vec![
            ("sub".to_string(), format!("\"{}\"", u8a_to_hex(&claims_pair().public_key))),
            ("iat".to_string(), now.to_string()),
            ("nbf".to_string(), now.to_string()),
            ("exp".to_string(), (now + 300.0).to_string()),
        ];
        for (key, value) in overrides {
            match claims.iter_mut().find(|(k, _)| k == key) {
                Some(entry) => entry.1 = value.to_string(),
                None => claims.push((key.to_string(), value.to_string())),
            }
        }
        let body: Vec<String> = claims.iter().map(|(k, v)| format!("\"{k}\":{v}")).collect();
        format!("{{{}}}", body.join(","))
    }

    fn check(token: &str) -> JwtVerifyResult {
        verify(token, &claims_pair().public_key, &JwtVerifyOptions::default())
    }

    #[test]
    fn accepts_a_correctly_signed_token_with_integer_claims() {
        assert!(check(&sign_raw_payload(&claims_json(&[]))).is_valid);
    }

    #[test]
    fn accepts_a_token_without_nbf() {
        let now = now_seconds();
        let payload = format!(
            "{{\"sub\":\"{}\",\"iat\":{now},\"exp\":{}}}",
            u8a_to_hex(&claims_pair().public_key),
            now + 300.0
        );
        assert!(check(&sign_raw_payload(&payload)).is_valid);
    }

    #[test]
    fn rejects_malformed_time_claims() {
        let cases: [(&str, &str); 9] = [
            ("nbf", "\"later\""),
            ("nbf", "\"0\""),
            ("nbf", "true"),
            ("nbf", "null"),
            ("nbf", "{}"),
            ("nbf", "[]"),
            ("exp", "1e400"),
            ("iat", "1e400"),
            ("nbf", "-1e400"),
        ];
        for (key, value) in cases {
            assert!(!check(&sign_raw_payload(&claims_json(&[(key, value)]))).is_valid, "{key}={value}");
        }
    }

    #[test]
    fn returns_invalid_instead_of_throwing_for_non_object_payloads() {
        for payload in ["null", "[]", "\"payload\"", "1"] {
            assert!(!check(&sign_raw_payload(payload)).is_valid, "{payload}");
        }
    }

    #[test]
    fn returns_invalid_instead_of_throwing_for_a_non_string_sub() {
        let result = check(&sign_raw_payload(&claims_json(&[("sub", "123")])));
        assert!(!result.is_valid);
        assert_eq!(result.error.as_deref(), Some("Invalid payload: 'sub' is not a string"));
    }

    #[test]
    fn still_rejects_a_future_nbf() {
        let pair = claims_pair();
        let options = JwtIssueOptions {
            expires_in: None,
            not_before: Some(now_seconds() + 600.0),
        };
        let token = sr25519_jwt_issue(&pair.public_key, &pair.secret_key, &options, &[]).expect("issues");
        let result = check(&token);
        assert!(!result.is_valid);
        assert_eq!(result.error.as_deref(), Some("JWT not valid yet"));
    }
}
