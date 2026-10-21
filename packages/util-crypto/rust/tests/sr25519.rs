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

use super::testing_vectors;
use crate::mnemonic::mnemonic_to_mini_secret;
use crate::random::random_as_u8a;
use crate::sr25519::*;
use crate::u8a::u8a_to_hex;

const MESSAGE: &[u8] = b"this is a message";

fn random_pair() -> Keypair {
    sr25519_from_seed(&random_as_u8a(32)).expect("valid seed")
}

mod agreement_spec {
    // Ported from src/sr25519/agreement.spec.ts
    use super::*;

    #[test]
    fn matches_a_known_agreement_both_ways() {
        let pair_a = sr25519_from_seed("0x98b3d305d5a5eace562387e47e59badd4d77e3f72cabfb10a60f8a197059f0a8").expect("seed");
        let pair_b = sr25519_from_seed("0x9732eea001851ff862d949a1699c9971f3a26edbede2ad7922cbbe9a0701f366").expect("seed");
        let expected = "0xb03a0b198c34c16f35cae933d88b16341b4cef3e84e851f20e664c6a30527f4e".to_string();
        assert_eq!(
            sr25519_agreement(&pair_a.secret_key, &pair_b.public_key).map(|s| u8a_to_hex(&s)),
            Ok(expected.clone())
        );
        assert_eq!(
            sr25519_agreement(&pair_b.secret_key, &pair_a.public_key).map(|s| u8a_to_hex(&s)),
            Ok(expected)
        );
    }
}

mod sign_spec {
    // Ported from src/sr25519/sign.spec.ts
    use super::*;

    #[test]
    fn has_64_byte_signatures() {
        let pair = random_pair();
        assert_eq!(sr25519_sign(MESSAGE, &pair.secret_key).map(|s| s.len()), Ok(64));
    }

    #[test]
    fn has_non_deterministic_signatures() {
        let pair = random_pair();
        assert_ne!(sr25519_sign(MESSAGE, &pair.secret_key), sr25519_sign(MESSAGE, &pair.secret_key));
    }
}

mod verify_spec {
    // Ported from src/sr25519/verify.spec.ts
    use super::*;

    #[test]
    fn can_sign_and_verify_a_message() {
        let pair = random_pair();
        let signature = sr25519_sign(MESSAGE, &pair.secret_key).expect("signs");
        assert_eq!(sr25519_verify(MESSAGE, &signature, &pair.public_key), Ok(true));
    }

    #[test]
    fn throws_error_when_public_key_lengths_do_not_match() {
        let error = sr25519_verify(&[0x61u8, 0x62, 0x63, 0x64], &[0u8; 64], &[0u8; 31]).expect_err("invalid");
        assert!(error.message().contains("Invalid publicKey"));
    }

    #[test]
    fn throws_error_when_signature_lengths_do_not_match() {
        let error = sr25519_verify(&[0x61u8, 0x62, 0x63, 0x64], &[0u8; 65], &[0u8; 32]).expect_err("invalid");
        assert!(error.message().contains("Invalid signature"));
    }
}

mod vrf_sign_verify_spec {
    // Ported from src/sr25519/vrfSignVerify.spec.ts
    use super::*;

    const EMPTY: &[u8] = &[];

    #[test]
    fn has_96_byte_proofs() {
        let pair = random_pair();
        assert_eq!(sr25519_vrf_sign(MESSAGE, &pair.secret_key, EMPTY, EMPTY).map(|p| p.len()), Ok(96));
    }

    #[test]
    fn signing_output_is_deterministic() {
        let pair = random_pair();
        let proof1 = sr25519_vrf_sign(MESSAGE, &pair.secret_key, EMPTY, EMPTY).expect("signs");
        let proof2 = sr25519_vrf_sign(MESSAGE, &pair.secret_key, EMPTY, EMPTY).expect("signs");
        assert_eq!(proof1[..32], proof2[..32]);
    }

    #[test]
    fn can_sign_and_verify_a_message() {
        let pair = random_pair();
        let proof = sr25519_vrf_sign(MESSAGE, &pair.secret_key, EMPTY, EMPTY).expect("signs");
        assert_eq!(sr25519_vrf_verify(MESSAGE, &proof, &pair.public_key, EMPTY, EMPTY), Ok(true));
    }

    #[test]
    fn can_sign_and_verify_a_message_with_context() {
        let context = "my context";
        let pair = random_pair();
        let proof = sr25519_vrf_sign(MESSAGE, &pair.secret_key, context, EMPTY).expect("signs");
        assert_eq!(sr25519_vrf_verify(MESSAGE, &proof, &pair.public_key, context, EMPTY), Ok(true));
    }

    #[test]
    fn can_sign_and_verify_a_message_with_context_and_extra() {
        let context = "my context";
        let extra = "some extra transcript data";
        let pair = random_pair();
        let proof = sr25519_vrf_sign(MESSAGE, &pair.secret_key, context, extra).expect("signs");
        assert_eq!(sr25519_vrf_verify(MESSAGE, &proof, &pair.public_key, context, extra), Ok(true));
    }

    #[test]
    fn throws_error_when_public_key_lengths_do_not_match() {
        let error = sr25519_vrf_verify(&[0x61u8, 0x62, 0x63, 0x64], &[0u8; 96], &[0u8; 31], EMPTY, EMPTY)
            .expect_err("invalid");
        assert!(error.message().contains("Invalid publicKey"));
    }

    #[test]
    fn throws_error_when_proof_lengths_do_not_match() {
        let error = sr25519_vrf_verify(&[0x61u8, 0x62, 0x63, 0x64], &[0u8; 99], &[0u8; 32], EMPTY, EMPTY)
            .expect_err("invalid");
        assert!(error.message().contains("Invalid vrfSign"));
    }
}

mod pair_from_seed_spec {
    // Ported from src/sr25519/pair/fromSeed.spec.ts and src/sr25519/pair/testing.spec.ts
    use super::*;

    #[test]
    fn generates_a_valid_public_key_secret_key_pair() {
        let pair = sr25519_from_seed(&b"12345678901234567890123456789012"[..]).expect("seed");
        assert_eq!(
            pair.public_key,
            vec![
                116, 28, 8, 160, 111, 65, 197, 150, 96, 143, 103, 116, 37, 155, 217, 4, 51, 4, 173, 250,
                93, 62, 234, 98, 118, 11, 217, 190, 151, 99, 77, 99,
            ]
        );
        assert_eq!(
            pair.secret_key,
            vec![
                240, 16, 102, 96, 195, 221, 162, 63, 22, 218, 169, 172, 91, 129, 27, 150, 48, 119, 245,
                188, 10, 248, 159, 133, 128, 79, 13, 232, 228, 36, 240, 80, 249, 141, 102, 243, 148, 66,
                80, 111, 249, 71, 253, 145, 31, 24, 199, 167, 165, 218, 99, 154, 99, 232, 211, 180, 226,
                51, 247, 65, 67, 217, 81, 193,
            ]
        );
    }

    #[test]
    fn creates_valid_secrets_against_known_vectors() {
        let vectors = testing_vectors();
        assert_eq!(vectors.len(), 24);
        for (index, [mnemonic, _, _, secret]) in vectors.into_iter().enumerate() {
            let seed = mnemonic_to_mini_secret(mnemonic, "Substrate", None).expect("valid");
            let pair = sr25519_from_seed(&seed).expect("seed");
            assert_eq!(u8a_to_hex(&pair.secret_key), secret, "{index}");
        }
    }
}

mod jwt_spec {
    // Ported from src/sr25519/jwt.spec.ts (fake timers become an explicit `now`)
    use super::*;
    use crate::base::base64_url_decode;
    use crate::js::{json_parse, JsonValue};
    use crate::jwt::{jwt_verify_at, sr25519_jwt_issue_at, JwtIssueOptions, JwtVerifyOptions};
    use crate::u8a::u8a_to_string;
    use rand_core::OsRng;

    const NOW_MS: f64 = 1_704_067_200_000.0;

    fn issue(pair: &Keypair, options: JwtIssueOptions, message: &[(&str, &str)]) -> crate::Result<String> {
        let message: Vec<(String, String)> = message
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect();
        sr25519_jwt_issue_at(&pair.public_key, &pair.secret_key, &options, &message, NOW_MS, OsRng)
    }

    fn expires_in(seconds: f64) -> JwtIssueOptions {
        JwtIssueOptions {
            expires_in: Some(seconds),
            not_before: None,
        }
    }

    fn decode_payload(jwt: &str) -> JsonValue {
        let part = jwt.split('.').nth(1).unwrap_or_default();
        json_parse(&u8a_to_string(&base64_url_decode(part).unwrap_or_default())).unwrap_or(JsonValue::Null)
    }

    fn is_valid(jwt: &str, public_key: &[u8]) -> bool {
        jwt_verify_at(jwt, public_key, &JwtVerifyOptions::default(), NOW_MS).is_ok_and(|r| r.is_valid)
    }

    #[test]
    fn issues_a_jwt_with_a_valid_format() {
        let jwt = issue(&random_pair(), expires_in(300.0), &[]).expect("issues");
        assert_eq!(jwt.split('.').count(), 3);
        assert!(!jwt.split('.').nth(2).unwrap_or_default().is_empty());
    }

    #[test]
    fn throws_an_error_for_invalid_secret_key_length() {
        let pair = random_pair();
        let invalid = Keypair {
            public_key: pair.public_key,
            secret_key: vec![0u8; 63],
        };
        let error = issue(&invalid, expires_in(300.0), &[]).expect_err("invalid");
        assert_eq!(error.message(), "Expected secretKey to be 64 bytes, found 63");
    }

    #[test]
    fn accepts_a_custom_expiration_time() {
        let jwt = issue(&random_pair(), expires_in(600.0), &[]).expect("issues");
        assert_eq!(jwt.split('.').count(), 3);
        let exp = decode_payload(&jwt).get("exp").and_then(JsonValue::as_f64).unwrap_or(0.0);
        assert!(exp >= (NOW_MS / 1000.0).floor() + 600.0);
    }

    #[test]
    fn accepts_a_custom_start_time() {
        let not_before = ((NOW_MS + 24.0 * 60.0 * 60.0 * 1000.0) / 1000.0).floor();
        let options = JwtIssueOptions {
            expires_in: Some(300.0),
            not_before: Some(not_before),
        };
        let jwt = issue(&random_pair(), options, &[]).expect("issues");
        assert_eq!(decode_payload(&jwt).get("nbf").and_then(JsonValue::as_f64), Some(not_before));
    }

    #[test]
    fn carries_extra_fields_into_the_payload() {
        let pair = random_pair();
        let jwt = issue(&pair, expires_in(300.0), &[("role", "admin")]).expect("issues");
        assert_eq!(decode_payload(&jwt).get("role").and_then(JsonValue::as_str), Some("admin"));
        assert!(is_valid(&jwt, &pair.public_key));
    }

    #[test]
    fn cannot_replace_the_standard_claims() {
        let pair = random_pair();
        let other = random_pair();
        let now = (NOW_MS / 1000.0).floor();
        let zero_sub = format!("0x{}", "00".repeat(32));
        let jwt = issue(
            &pair,
            expires_in(300.0),
            &[("sub", &zero_sub), ("iat", "0"), ("nbf", "0"), ("exp", "99999999999"), ("role", "admin")],
        )
        .expect("issues");
        let payload = decode_payload(&jwt);
        assert_eq!(payload.get("exp").and_then(JsonValue::as_f64), Some(now + 300.0));
        assert_eq!(payload.get("iat").and_then(JsonValue::as_f64), Some(now));
        assert_eq!(payload.get("nbf").and_then(JsonValue::as_f64), Some(now));
        assert_ne!(payload.get("sub").and_then(JsonValue::as_str), Some(zero_sub.as_str()));
        assert_eq!(payload.get("role").and_then(JsonValue::as_str), Some("admin"));
        assert!(is_valid(&jwt, &pair.public_key));
        assert!(!is_valid(&jwt, &other.public_key));
    }
}
