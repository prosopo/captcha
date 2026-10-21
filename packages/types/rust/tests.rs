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

//! Ports of the TS test files, one module each. In the token tests
//! `ProcaptchaOutputSchema.safeParse` is serde deserialisation.

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

/// Port of src/api/sanitise.test.ts.
mod sanitise {
    use crate::{bounded_array, bounded_string, safe_line, safe_text, InputLimits};
    use prosopo_api_route::schema::{number, Data};
    use serde_json::{json, Map, Value};

    fn accepts(schema: &prosopo_api_route::schema::Schema, value: Value) -> bool {
        schema.safe_parse(Some(&value)).is_ok()
    }

    fn issues(schema: &prosopo_api_route::schema::Schema, value: Value) -> Vec<Map<String, Value>> {
        schema.safe_parse(Some(&value)).expect_err("rejected")
    }

    #[test]
    fn orders_the_limits_from_identifier_sized_up_to_token_sized() {
        const {
            assert!(InputLimits::ID < InputLimits::EMAIL);
            assert!(InputLimits::EMAIL < InputLimits::URL);
            assert!(InputLimits::URL < InputLimits::TEXT);
            assert!(InputLimits::TEXT < InputLimits::LONG_TEXT);
            assert!(InputLimits::LONG_TEXT < InputLimits::TOKEN);
        }
    }

    #[test]
    fn keeps_every_limit_positive() {
        for (_, limit) in InputLimits::ENTRIES {
            assert!(limit > 0);
        }
    }

    #[test]
    fn bounded_string_accepts_an_empty_string() {
        assert!(accepts(&bounded_string(InputLimits::TEXT), json!("")));
    }

    #[test]
    fn bounded_string_accepts_a_string_at_the_limit() {
        assert!(accepts(&bounded_string(4), json!("abcd")));
    }

    #[test]
    fn bounded_string_rejects_a_string_one_over_the_limit() {
        assert!(!accepts(&bounded_string(4), json!("abcde")));
    }

    #[test]
    fn bounded_string_defaults_to_the_text_limit() {
        let schema = bounded_string(InputLimits::TEXT);
        assert!(accepts(&schema, json!("a".repeat(InputLimits::TEXT))));
        assert!(!accepts(&schema, json!("a".repeat(InputLimits::TEXT + 1))));
    }

    #[test]
    fn bounded_string_does_not_police_the_character_set() {
        assert!(accepts(
            &bounded_string(InputLimits::TEXT),
            json!("a\u{0}b")
        ));
    }

    #[test]
    fn bounded_string_rejects_a_non_string() {
        let schema = bounded_string(InputLimits::TEXT);
        assert!(!accepts(&schema, json!(1)));
        assert!(!accepts(&schema, json!({ "$gt": "" })));
    }

    #[test]
    fn bounded_string_stays_chainable() {
        assert!(!accepts(&bounded_string(4).min(2.0), json!("a")));
    }

    #[test]
    fn safe_text_accepts_ordinary_text() {
        assert!(accepts(&safe_text(InputLimits::TEXT), json!("hello world")));
    }

    #[test]
    fn safe_text_accepts_tabs_and_line_breaks() {
        assert!(accepts(
            &safe_text(InputLimits::TEXT),
            json!("a\tb\nc\r\nd")
        ));
    }

    #[test]
    fn safe_text_rejects_control_characters() {
        for value in [
            "a\u{0}b", "a\u{8}b", "a\u{b}b", "a\u{c}b", "a\u{e}b", "a\u{1b}b", "a\u{7f}b",
        ] {
            assert!(
                !accepts(&safe_text(InputLimits::TEXT), json!(value)),
                "{value:?}"
            );
        }
    }

    #[test]
    fn safe_text_accepts_c1_characters() {
        assert!(accepts(&safe_text(InputLimits::TEXT), json!("a\u{85}b")));
    }

    #[test]
    fn safe_text_accepts_non_latin_text_and_emoji() {
        assert!(accepts(
            &safe_text(InputLimits::TEXT),
            json!("日本語 — ok ✅")
        ));
    }

    #[test]
    fn safe_text_enforces_its_length_limit() {
        assert!(!accepts(&safe_text(3), json!("abcd")));
    }

    #[test]
    fn safe_text_reports_a_control_character_with_a_readable_message() {
        let issues = issues(&safe_text(InputLimits::TEXT), json!("a\u{0}b"));
        assert_eq!(issues[0]["message"], "must not contain control characters");
    }

    #[test]
    fn safe_line_accepts_a_single_line() {
        assert!(accepts(&safe_line(InputLimits::NAME), json!("A Name")));
    }

    #[test]
    fn safe_line_rejects_what_could_inject_a_header() {
        for value in ["a\nb", "a\rb", "a\tb", "a\u{0}b"] {
            assert!(
                !accepts(&safe_line(InputLimits::NAME), json!(value)),
                "{value:?}"
            );
        }
    }

    #[test]
    fn safe_line_defaults_to_the_name_limit() {
        let schema = safe_line(InputLimits::NAME);
        assert!(accepts(&schema, json!("a".repeat(InputLimits::NAME))));
        assert!(!accepts(&schema, json!("a".repeat(InputLimits::NAME + 1))));
    }

    #[test]
    fn safe_line_accepts_an_empty_string() {
        assert!(accepts(&safe_line(InputLimits::NAME), json!("")));
    }

    #[test]
    fn safe_line_reports_a_line_break_with_a_readable_message() {
        let issues = issues(&safe_line(InputLimits::NAME), json!("a\nb"));
        assert_eq!(
            issues[0]["message"],
            "must not contain control characters or line breaks"
        );
    }

    #[test]
    fn bounded_array_accepts_arrays_up_to_the_cap() {
        let schema = bounded_array(number(), 3);
        let parse = |value: Value| -> Data { schema.safe_parse(Some(&value)).expect("valid") };
        assert_eq!(parse(json!([1, 2, 3])), Some(json!([1, 2, 3])));
        assert_eq!(parse(json!([])), Some(json!([])));
    }

    #[test]
    fn bounded_array_rejects_an_over_long_array_with_a_single_issue() {
        let issues = issues(
            &bounded_array(number(), 3),
            json!(["a", "b", "c", "d", "e"]),
        );
        assert_eq!(issues.len(), 1);
        assert_eq!(
            issues[0]["message"],
            "Array must contain at most 3 element(s)"
        );
    }

    #[test]
    fn bounded_array_reports_element_issues_within_the_cap() {
        let issues = issues(&bounded_array(number(), 3), json!([1, "b"]));
        assert_eq!(issues[0]["path"], json!([1]));
    }

    #[test]
    fn bounded_array_reports_a_non_array_as_a_type_error() {
        let issues = issues(&bounded_array(number(), 3), json!("nope"));
        assert_eq!(issues[0]["code"], "invalid_type");
    }
}

/// Port of src/client/testSiteKeys.test.ts.
mod test_site_keys {
    use crate::{
        get_test_site_key_mode, TestSiteKeyMode, ALWAYS_FAIL_SITE_KEY, ALWAYS_PASS_SITE_KEY,
    };

    #[test]
    fn are_distinct() {
        assert_ne!(ALWAYS_PASS_SITE_KEY, ALWAYS_FAIL_SITE_KEY);
    }

    #[test]
    fn are_48_character_ss58_addresses() {
        assert_eq!(ALWAYS_PASS_SITE_KEY.len(), 48);
        assert_eq!(ALWAYS_FAIL_SITE_KEY.len(), 48);
    }

    #[test]
    fn forces_a_pass_for_the_always_pass_key() {
        assert_eq!(
            get_test_site_key_mode(ALWAYS_PASS_SITE_KEY),
            Some(TestSiteKeyMode::Pass)
        );
    }

    #[test]
    fn forces_a_fail_for_the_always_fail_key() {
        assert_eq!(
            get_test_site_key_mode(ALWAYS_FAIL_SITE_KEY),
            Some(TestSiteKeyMode::Fail)
        );
    }

    #[test]
    fn returns_none_for_a_normal_site_key() {
        assert_eq!(
            get_test_site_key_mode("5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw"),
            None
        );
    }

    #[test]
    fn returns_none_for_an_empty_site_key() {
        assert_eq!(get_test_site_key_mode(""), None);
    }

    #[test]
    fn matches_exactly_not_by_prefix() {
        assert_eq!(get_test_site_key_mode(&ALWAYS_PASS_SITE_KEY[..47]), None);
        assert_eq!(
            get_test_site_key_mode(&format!("{ALWAYS_PASS_SITE_KEY}x")),
            None
        );
    }

    #[test]
    fn is_case_sensitive() {
        assert_eq!(
            get_test_site_key_mode(&ALWAYS_PASS_SITE_KEY.to_lowercase()),
            None
        );
    }
}

/// Port of the counter cases of src/decisionMachine/counters.test.ts; the
/// `RoutingMachineOutputSchema` cases land with the settings schemas.
mod counters {
    use crate::decision_machine::{
        counter_spec_schema, encode_counter_key, CounterCaptchaType, CounterDimension, CounterKind,
        CounterSpec, CounterWindow,
    };
    use crate::CaptchaType;
    use serde_json::{json, Value};
    use std::collections::HashSet;

    const SPEC: CounterSpec = CounterSpec {
        kind: CounterKind::Served,
        captcha_type: CounterCaptchaType::Type(CaptchaType::Pow),
        dimension: CounterDimension::Ip,
        window: CounterWindow::OneHour,
    };

    fn spec_json() -> Value {
        json!({ "kind": "served", "captchaType": "pow", "dimension": "ip", "window": "1h" })
    }

    fn accepts(value: Value) -> bool {
        counter_spec_schema().safe_parse(Some(&value)).is_ok()
    }

    #[test]
    fn has_a_duration_for_every_window() {
        for window in CounterWindow::ALL {
            assert!(window.seconds() > 0);
        }
    }

    #[test]
    fn orders_the_windows_from_shortest_to_longest() {
        let seconds: Vec<u64> = CounterWindow::ALL.map(CounterWindow::seconds).to_vec();
        let mut sorted: Vec<u64> = seconds.clone();
        sorted.sort_unstable();
        assert_eq!(seconds, sorted);
    }

    #[test]
    fn matches_the_durations_the_window_names_claim() {
        assert_eq!(CounterWindow::OneMinute.seconds(), 60);
        assert_eq!(CounterWindow::TenMinutes.seconds(), 10 * 60);
        assert_eq!(CounterWindow::OneHour.seconds(), 60 * 60);
        assert_eq!(CounterWindow::OneDay.seconds(), 24 * 60 * 60);
    }

    #[test]
    fn builds_a_colon_separated_redis_key() {
        assert_eq!(
            encode_counter_key("dapp", &SPEC, "1.2.3.4"),
            "cnt:dapp:served:pow:ip:1.2.3.4:1h"
        );
    }

    #[test]
    fn puts_the_window_last() {
        assert!(encode_counter_key("dapp", &SPEC, "v").ends_with(":1h"));
    }

    #[test]
    fn distinguishes_kinds_dimensions_and_dapps() {
        let base: String = encode_counter_key("d", &SPEC, "v");
        let solved = CounterSpec {
            kind: CounterKind::Solved,
            ..SPEC
        };
        let peer = CounterSpec {
            dimension: CounterDimension::PeerIp,
            ..SPEC
        };
        assert_ne!(base, encode_counter_key("d", &solved, "v"));
        assert_ne!(base, encode_counter_key("d", &peer, "v"));
        assert_ne!(
            encode_counter_key("a", &SPEC, "v"),
            encode_counter_key("b", &SPEC, "v")
        );
    }

    #[test]
    fn encodes_the_wildcard_captcha_type_verbatim() {
        let any = CounterSpec {
            captcha_type: CounterCaptchaType::Any,
            ..SPEC
        };
        assert_eq!(
            encode_counter_key("d", &any, "v"),
            "cnt:d:served:any:ip:v:1h"
        );
    }

    #[test]
    fn produces_a_distinct_key_for_every_window() {
        let keys: HashSet<String> = CounterWindow::ALL
            .iter()
            .map(|window| {
                encode_counter_key(
                    "d",
                    &CounterSpec {
                        window: *window,
                        ..SPEC
                    },
                    "v",
                )
            })
            .collect();
        assert_eq!(keys.len(), CounterWindow::ALL.len());
    }

    #[test]
    fn passes_an_empty_value_straight_through() {
        assert_eq!(
            encode_counter_key("d", &SPEC, ""),
            "cnt:d:served:pow:ip::1h"
        );
    }

    #[test]
    fn does_not_escape_colons_in_the_value() {
        assert_eq!(
            encode_counter_key("d", &SPEC, "::1"),
            "cnt:d:served:pow:ip:::1:1h"
        );
    }

    #[test]
    fn accepts_a_well_formed_spec() {
        assert!(accepts(spec_json()));
    }

    #[test]
    fn accepts_every_declared_kind_dimension_and_window() {
        for kind in CounterKind::ALL {
            for dimension in CounterDimension::ALL {
                for window in CounterWindow::ALL {
                    let mut value: Value = spec_json();
                    value["kind"] = json!(kind.as_str());
                    value["dimension"] = json!(dimension.as_str());
                    value["window"] = json!(window.as_str());
                    assert!(accepts(value));
                }
            }
        }
    }

    #[test]
    fn accepts_each_challengeable_captcha_type_and_the_wildcard() {
        for captcha_type in ["pow", "image", "puzzle", "any"] {
            let mut value: Value = spec_json();
            value["captchaType"] = json!(captcha_type);
            assert!(accepts(value), "{captcha_type}");
        }
    }

    #[test]
    fn rejects_the_frictionless_type() {
        let mut value: Value = spec_json();
        value["captchaType"] = json!("frictionless");
        assert!(!accepts(value));
    }

    #[test]
    fn rejects_an_unknown_window() {
        let mut value: Value = spec_json();
        value["window"] = json!("2h");
        assert!(!accepts(value));
    }

    #[test]
    fn rejects_a_missing_field() {
        let mut value: Value = spec_json();
        value.as_object_mut().expect("object").remove("kind");
        assert!(!accepts(value));
    }
}

/// The `RoutingMachineOutputSchema` cases of src/decisionMachine/counters.test.ts.
mod routing_machine_output {
    use crate::decision_machine::routing_machine_output_schema;
    use serde_json::{json, Value};

    fn accepts(value: Value) -> bool {
        routing_machine_output_schema()
            .safe_parse(Some(&value))
            .is_ok()
    }

    #[test]
    fn accepts_a_bare_captcha_type() {
        assert!(accepts(json!({ "captchaType": "image" })));
    }

    #[test]
    fn rejects_frictionless_which_is_not_a_routable_outcome() {
        assert!(!accepts(json!({ "captchaType": "frictionless" })));
    }

    #[test]
    fn requires_a_positive_integer_image_count() {
        assert!(!accepts(
            json!({ "captchaType": "image", "solvedImagesCount": 0 })
        ));
        assert!(!accepts(
            json!({ "captchaType": "image", "solvedImagesCount": 1.5 })
        ));
        assert!(accepts(
            json!({ "captchaType": "image", "solvedImagesCount": 3 })
        ));
    }

    #[test]
    fn requires_a_positive_pow_difficulty_but_allows_a_fractional_one() {
        assert!(!accepts(
            json!({ "captchaType": "pow", "powDifficulty": 0 })
        ));
        assert!(accepts(
            json!({ "captchaType": "pow", "powDifficulty": 4.5 })
        ));
    }

    #[test]
    fn carries_a_free_form_reason() {
        assert!(accepts(
            json!({ "captchaType": "pow", "reason": "escalated on ip rate" })
        ));
    }

    #[test]
    fn rejects_a_non_string_reason() {
        assert!(!accepts(json!({ "captchaType": "pow", "reason": 1 })));
    }

    #[test]
    fn requires_a_captcha_type() {
        assert!(!accepts(json!({})));
    }
}

/// Port of src/provider/api.test.ts.
mod provider_api_cases {
    use crate::provider_api::{captcha_solution_body, provider_details_schema};
    use serde_json::{json, Value};

    fn redis() -> Value {
        json!([{ "actor": "General", "isReady": true, "awaitingTimeSeconds": 0 }])
    }

    #[test]
    fn provider_details_accept_a_host() {
        let parsed: Value = provider_details_schema()
            .safe_parse(Some(&json!({
                "version": "1.0.0",
                "message": "Provider online",
                "host": "provider.example.com",
                "redis": redis(),
            })))
            .expect("valid")
            .expect("defined");
        assert_eq!(parsed["host"], "provider.example.com");
    }

    #[test]
    fn provider_details_accept_a_payload_without_a_host() {
        let parsed: Value = provider_details_schema()
            .safe_parse(Some(
                &json!({ "version": "1.0.0", "message": "Provider online", "redis": redis() }),
            ))
            .expect("valid")
            .expect("defined");
        assert!(parsed.get("host").is_none());
    }

    #[test]
    fn provider_details_reject_a_non_string_host() {
        assert!(provider_details_schema()
            .safe_parse(Some(&json!({
                "version": "1.0.0",
                "message": "Provider online",
                "host": 1,
                "redis": redis(),
            })))
            .is_err());
    }

    fn body(input_methods: Option<Value>) -> Value {
        let mut captcha: Value = json!({
            "captchaId": "id",
            "captchaContentId": "cid",
            "solution": ["0xa"],
            "salt": "0x00",
        });
        if let Some(input_methods) = input_methods {
            captcha["inputMethods"] = input_methods;
        }
        json!({
            "user": "user",
            "dapp": "dapp",
            "captchas": [captcha],
            "requestHash": "hash",
            "timestamp": "1",
            "signature": { "user": { "timestamp": "sig" }, "provider": { "requestHash": "sig" } },
        })
    }

    #[test]
    fn accepts_a_submission_without_input_methods() {
        assert!(captcha_solution_body()
            .safe_parse(Some(&body(None)))
            .is_ok());
    }

    #[test]
    fn keeps_the_input_methods_the_widget_sends() {
        let parsed: Value = captcha_solution_body()
            .safe_parse(Some(&body(Some(json!(["pointer", "keyboard"])))))
            .expect("valid")
            .expect("defined");
        assert_eq!(
            parsed["captchas"][0]["inputMethods"],
            json!(["pointer", "keyboard"])
        );
    }

    #[test]
    fn rejects_an_unknown_input_method() {
        assert!(captcha_solution_body()
            .safe_parse(Some(&body(Some(json!(["stylus"])))))
            .is_err());
    }

    #[test]
    fn bounds_how_many_input_methods_one_captcha_may_carry() {
        let too_many: Value = json!(vec!["pointer"; 10_000]);
        assert!(captcha_solution_body()
            .safe_parse(Some(&body(Some(too_many))))
            .is_err());
    }
}

/// Port of src/provider/requestArrayLimits.test.ts.
mod request_array_limits {
    use crate::provider_api::{
        captcha_request_body, captcha_solution_body, submit_audio_captcha_solution_body,
        submit_icon_order_captcha_solution_body, submit_puzzle_captcha_solution_body,
        MAX_ICON_CLICKS,
    };
    use prosopo_api_route::schema::Schema;
    use serde_json::{json, Map, Value};

    const USER: &str = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";
    const DAPP: &str = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

    fn challenge() -> String {
        format!("1700000000000___{USER}___{DAPP}___1")
    }

    fn signature() -> Value {
        json!({ "user": { "timestamp": "0x01" }, "provider": { "challenge": "0x02" } })
    }

    fn puzzle_body(events: Value) -> Value {
        json!({
            "challenge": challenge(), "finalX": 1, "finalY": 1, "puzzleEvents": events,
            "signature": signature(), "user": USER, "dapp": DAPP,
        })
    }

    fn icon_order_body(clicks: Value, events: Value) -> Value {
        json!({
            "challenge": challenge(), "clicks": clicks, "iconOrderEvents": events,
            "signature": signature(), "user": USER, "dapp": DAPP,
        })
    }

    fn audio_body(events: Value) -> Value {
        json!({
            "challenge": challenge(), "answer": "12345", "audioEvents": events,
            "signature": signature(), "user": USER, "dapp": DAPP,
        })
    }

    fn captcha(solution: Vec<String>) -> Value {
        json!({ "captchaId": "0x01", "captchaContentId": "0x02", "solution": solution, "salt": "0x03" })
    }

    fn solution_body(captchas: Vec<Value>) -> Value {
        json!({
            "user": USER, "dapp": DAPP, "captchas": captchas, "requestHash": "0x04",
            "timestamp": "1700000000000",
            "signature": { "user": { "timestamp": "0x01" }, "provider": { "requestHash": "0x02" } },
        })
    }

    fn events(count: usize) -> Value {
        Value::Array(
            (0..count)
                .map(|i| json!({ "x": i, "y": i, "t": 1_700_000_000_000_u64 + i as u64 }))
                .collect(),
        )
    }

    fn issues(schema: &Schema, value: &Value) -> Vec<Map<String, Value>> {
        schema.safe_parse(Some(value)).err().unwrap_or_default()
    }

    #[test]
    fn caps_puzzle_events_at_10000() {
        let schema: Schema = submit_puzzle_captcha_solution_body();
        assert!(schema
            .safe_parse(Some(&puzzle_body(events(10_000))))
            .is_ok());
        let issues = issues(&schema, &puzzle_body(events(10_001)));
        assert_eq!(issues[0]["path"], json!(["puzzleEvents"]));
    }

    #[test]
    fn rejects_a_huge_array_of_invalid_puzzle_events_with_one_issue() {
        let schema: Schema = submit_puzzle_captcha_solution_body();
        assert_eq!(
            issues(&schema, &puzzle_body(json!(vec![Value::Null; 150_000]))).len(),
            1
        );
    }

    #[test]
    fn caps_icon_order_events_at_10000() {
        let schema: Schema = submit_icon_order_captcha_solution_body();
        assert!(schema
            .safe_parse(Some(&icon_order_body(json!([]), events(10_000))))
            .is_ok());
        let issues = issues(&schema, &icon_order_body(json!([]), events(10_001)));
        assert_eq!(issues[0]["path"], json!(["iconOrderEvents"]));
    }

    #[test]
    fn caps_audio_events_at_512() {
        let schema: Schema = submit_audio_captcha_solution_body();
        let event: Value = json!({ "kind": "key", "t": 1 });
        assert!(schema
            .safe_parse(Some(&audio_body(json!(vec![event.clone(); 512]))))
            .is_ok());
        let issues = issues(&schema, &audio_body(json!(vec![event; 513])));
        assert_eq!(issues[0]["path"], json!(["audioEvents"]));
    }

    #[test]
    fn rejects_a_huge_array_of_invalid_audio_events_with_one_issue() {
        let schema: Schema = submit_audio_captcha_solution_body();
        assert_eq!(
            issues(&schema, &audio_body(json!(vec![Value::Null; 150_000]))).len(),
            1
        );
    }

    #[test]
    fn caps_icon_order_clicks() {
        let schema: Schema = submit_icon_order_captcha_solution_body();
        let click: Value = json!({ "x": 1, "y": 1 });
        assert!(schema
            .safe_parse(Some(&icon_order_body(
                json!(vec![click.clone(); MAX_ICON_CLICKS]),
                json!([])
            )))
            .is_ok());
        let issues = issues(
            &schema,
            &icon_order_body(json!(vec![click; MAX_ICON_CLICKS + 1]), json!([])),
        );
        assert_eq!(issues[0]["path"], json!(["clicks"]));
    }

    #[test]
    fn caps_captchas_at_256() {
        let schema: Schema = captcha_solution_body();
        let within: Vec<Value> = vec![captcha(vec!["0x05".to_string()]); 256];
        assert!(schema
            .safe_parse(Some(&solution_body(within.clone())))
            .is_ok());
        let mut over: Vec<Value> = within;
        over.push(captcha(vec!["0x05".to_string()]));
        assert_eq!(issues(&schema, &solution_body(over)).len(), 1);
    }

    #[test]
    fn caps_each_captchas_solution_at_64_tiles() {
        let schema: Schema = captcha_solution_body();
        let tiles = |n: usize| (0..n).map(|i| format!("0x{i}")).collect::<Vec<String>>();
        assert!(schema
            .safe_parse(Some(&solution_body(vec![captcha(tiles(64))])))
            .is_ok());
        let issues = issues(&schema, &solution_body(vec![captcha(tiles(65))]));
        assert_eq!(issues[0]["path"], json!(["captchas", 0, "solution"]));
    }

    #[test]
    fn caps_a_byte_array_dataset_id_at_64_and_still_accepts_a_string() {
        let schema: Schema = captcha_request_body();
        let body =
            |dataset_id: Value| json!({ "user": USER, "dapp": DAPP, "datasetId": dataset_id });
        assert!(schema.safe_parse(Some(&body(json!(vec![1; 32])))).is_ok());
        assert!(schema.safe_parse(Some(&body(json!("0xabc")))).is_ok());
        assert!(schema.safe_parse(Some(&body(json!(vec![1; 65])))).is_err());
        let huge = issues(&schema, &body(json!(vec!["x"; 150_000])));
        assert!(!huge.is_empty());
        assert!(serde_json::to_string(&huge).expect("serialises").len() < 2_000);
    }
}
