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

//! Port of src/procaptcha/token.test.ts. `ProcaptchaOutputSchema.safeParse` is serde
//! deserialisation here.

use crate::scale::Writer;
use crate::{
    decode_procaptcha_output, encode_procaptcha_output, is_procaptcha_token, CaptchaType,
    OutputSignatures, ProcaptchaOutput, SignatureTypes, TokenDecodeError,
};
use prosopo_util_crypto::u8a::u8a_to_hex;
use serde_json::{json, Value};

fn minimal() -> ProcaptchaOutput {
    ProcaptchaOutput {
        commitment_id: None,
        provider_url: None,
        dapp: "5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw".to_string(),
        user: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY".to_string(),
        challenge: None,
        nonce: None,
        timestamp: "1700000000000".to_string(),
        signature: OutputSignatures::default(),
        captcha_type: None,
    }
}

fn signature_types(
    challenge: Option<&str>,
    request_hash: Option<&str>,
    timestamp: Option<&str>,
) -> SignatureTypes {
    SignatureTypes {
        challenge: challenge.map(str::to_string),
        request_hash: request_hash.map(str::to_string),
        timestamp: timestamp.map(str::to_string),
    }
}

fn full() -> ProcaptchaOutput {
    ProcaptchaOutput {
        commitment_id: Some("0xcommitment".to_string()),
        provider_url: Some("https://provider.example".to_string()),
        challenge: Some("a___b___c".to_string()),
        nonce: Some(42),
        captcha_type: Some(CaptchaType::Pow),
        signature: OutputSignatures {
            provider: signature_types(Some("pc"), Some("pr"), None),
            user: signature_types(None, Some("ur"), Some("ut")),
        },
        ..minimal()
    }
}

fn round_trip(output: &ProcaptchaOutput) -> ProcaptchaOutput {
    decode_procaptcha_output(&encode_procaptcha_output(output)).expect("decodes")
}

/// `ProcaptchaTokenCodecV1.enc`: the v2 layout without the trailing `captchaType`.
fn encode_v1(output: &ProcaptchaOutput) -> String {
    let mut writer: Writer = Writer::default();
    let optional = |writer: &mut Writer, value: &Option<String>| {
        writer.option(value.as_deref(), Writer::str);
    };
    optional(&mut writer, &output.commitment_id);
    optional(&mut writer, &output.provider_url);
    writer.str(&output.dapp);
    writer.str(&output.user);
    optional(&mut writer, &output.challenge);
    writer.option(output.nonce, Writer::u32);
    writer.str(&output.timestamp);
    optional(&mut writer, &output.signature.provider.challenge);
    optional(&mut writer, &output.signature.provider.request_hash);
    optional(&mut writer, &output.signature.user.timestamp);
    optional(&mut writer, &output.signature.user.request_hash);
    u8a_to_hex(&writer.into_bytes())
}

mod procaptcha_token_spec {
    use super::*;

    #[test]
    fn accepts_a_hex_string() {
        assert!(is_procaptcha_token("0xabc"));
    }

    #[test]
    fn rejects_a_string_with_no_hex_prefix() {
        assert!(!is_procaptcha_token("abc"));
    }

    #[test]
    fn rejects_an_empty_string() {
        assert!(!is_procaptcha_token(""));
    }
}

mod encode {
    use super::*;

    #[test]
    fn produces_a_hex_token() {
        let token: String = encode_procaptcha_output(&minimal());
        assert!(token.starts_with("0x"));
        assert!(token[2..]
            .bytes()
            .all(|b| matches!(b, b'0'..=b'9' | b'a'..=b'f')));
        assert!(token.len() > 2);
    }

    #[test]
    fn is_deterministic() {
        assert_eq!(
            encode_procaptcha_output(&full()),
            encode_procaptcha_output(&full())
        );
    }

    #[test]
    fn produces_different_tokens_for_different_outputs() {
        assert_ne!(
            encode_procaptcha_output(&minimal()),
            encode_procaptcha_output(&full())
        );
    }

    #[test]
    fn encodes_an_absent_optional_field_as_none_not_as_an_empty_string() {
        let with_empty: ProcaptchaOutput = ProcaptchaOutput {
            signature: OutputSignatures {
                provider: signature_types(Some(""), None, None),
                user: SignatureTypes::default(),
            },
            ..minimal()
        };
        assert_eq!(
            encode_procaptcha_output(&with_empty),
            encode_procaptcha_output(&minimal())
        );
    }

    #[test]
    fn drops_fields_the_codec_does_not_model() {
        let mut with_extra: Value = serde_json::to_value(minimal()).expect("serialises");
        with_extra["extra"] = json!("ignored");
        let parsed: ProcaptchaOutput = serde_json::from_value(with_extra).expect("parses");
        assert_eq!(round_trip(&parsed), minimal());
    }
}

mod decode {
    use super::*;

    #[test]
    fn round_trips_a_minimal_output() {
        assert_eq!(round_trip(&minimal()), minimal());
    }

    #[test]
    fn round_trips_every_optional_field() {
        assert_eq!(round_trip(&full()), full());
    }

    #[test]
    fn round_trips_a_zero_nonce() {
        let output: ProcaptchaOutput = ProcaptchaOutput {
            nonce: Some(0),
            ..minimal()
        };
        assert_eq!(round_trip(&output), output);
    }

    #[test]
    fn round_trips_each_captcha_type() {
        for captcha_type in CaptchaType::ALL {
            let output: ProcaptchaOutput = ProcaptchaOutput {
                captcha_type: Some(captcha_type),
                ..minimal()
            };
            assert_eq!(round_trip(&output).captcha_type, Some(captcha_type));
        }
    }

    #[test]
    fn round_trips_unicode_in_a_string_field() {
        let output: ProcaptchaOutput = ProcaptchaOutput {
            challenge: Some("日本語 ✅".to_string()),
            ..minimal()
        };
        assert_eq!(round_trip(&output), output);
    }

    #[test]
    fn falls_back_to_the_v1_layout_for_a_legacy_token() {
        assert_eq!(
            decode_procaptcha_output(&encode_v1(&minimal())),
            Ok(minimal())
        );
    }

    #[test]
    fn leaves_captcha_type_undefined_on_a_legacy_token() {
        let legacy: ProcaptchaOutput = ProcaptchaOutput {
            commitment_id: Some("c".to_string()),
            provider_url: Some("u".to_string()),
            challenge: Some("ch".to_string()),
            nonce: Some(1),
            signature: OutputSignatures {
                provider: signature_types(Some("pc"), Some("pr"), None),
                user: signature_types(None, Some("ur"), Some("ut")),
            },
            ..minimal()
        };
        let decoded: ProcaptchaOutput =
            decode_procaptcha_output(&encode_v1(&legacy)).expect("decodes");
        assert_eq!(decoded.captcha_type, None);
    }

    #[test]
    fn throws_for_a_token_that_decodes_under_neither_layout() {
        assert_eq!(
            decode_procaptcha_output("0x00"),
            Err(TokenDecodeError::Malformed)
        );
    }

    #[test]
    fn throws_for_an_empty_token() {
        assert_eq!(
            decode_procaptcha_output("0x"),
            Err(TokenDecodeError::Malformed)
        );
    }

    #[test]
    fn surfaces_a_schema_failure_rather_than_silently_falling_back() {
        let mut writer: Writer = Writer::default();
        writer.option(None::<&str>, Writer::str);
        writer.option(None::<&str>, Writer::str);
        writer.str(&minimal().dapp);
        writer.str(&minimal().user);
        writer.option(None::<&str>, Writer::str);
        writer.option(None::<u32>, Writer::u32);
        writer.str(&minimal().timestamp);
        for _ in 0..4 {
            writer.option(None::<&str>, Writer::str);
        }
        writer.option(Some("not-a-captcha-type"), Writer::str);
        let token: String = u8a_to_hex(&writer.into_bytes());
        assert!(matches!(
            decode_procaptcha_output(&token),
            Err(TokenDecodeError::UnknownCaptchaType(_))
        ));
    }
}

mod procaptcha_output_schema {
    use super::*;

    fn parses(value: Value) -> bool {
        serde_json::from_value::<ProcaptchaOutput>(value).is_ok()
    }

    fn minimal_json() -> Value {
        serde_json::to_value(minimal()).expect("serialises")
    }

    fn without(field: &str) -> Value {
        let mut value: Value = minimal_json();
        value.as_object_mut().expect("object").remove(field);
        value
    }

    fn with(field: &str, field_value: Value) -> Value {
        let mut value: Value = minimal_json();
        value[field] = field_value;
        value
    }

    #[test]
    fn accepts_the_minimal_shape() {
        assert!(parses(minimal_json()));
    }

    #[test]
    fn requires_the_dapp_account() {
        assert!(!parses(without("dapp")));
    }

    #[test]
    fn requires_the_user_account() {
        assert!(!parses(without("user")));
    }

    #[test]
    fn requires_the_timestamp() {
        assert!(!parses(without("timestamp")));
    }

    #[test]
    fn requires_the_signature_envelope() {
        assert!(!parses(without("signature")));
    }

    #[test]
    fn requires_the_timestamp_to_be_a_string_not_a_number() {
        assert!(!parses(with("timestamp", json!(1))));
    }

    #[test]
    fn requires_the_nonce_to_be_a_number_not_a_string() {
        assert!(!parses(with("nonce", json!("1"))));
    }

    #[test]
    fn rejects_an_unknown_captcha_type() {
        assert!(!parses(with("captchaType", json!("nope"))));
    }
}
