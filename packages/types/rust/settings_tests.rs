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

//! Port of src/client/settings.test.ts.

use crate::settings::*;
use crate::timeouts::{DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT, DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT};
use crate::CaptchaType;
use prosopo_api_route::schema::Schema;
use serde_json::{json, Value};
use std::collections::HashSet;

fn minimal() -> Value {
    json!({ "domains": ["example.com"] })
}

fn with(mut base: Value, key: &str, value: Value) -> Value {
    base[key] = value;
    base
}

fn accepts(schema: &Schema, input: Value) -> bool {
    schema.safe_parse(Some(&input)).is_ok()
}

fn parse_with(schema: &Schema, input: Value) -> Value {
    schema
        .safe_parse(Some(&input))
        .unwrap_or_else(|issues| panic!("rejected {input}: {issues:?}"))
        .expect("defined")
}

fn parse(input: Value) -> Value {
    parse_with(&client_settings_schema(), input)
}

fn settings_accepts(input: Value) -> bool {
    accepts(&client_settings_schema(), input)
}

mod client_settings_schema_cases {
    use super::*;

    #[test]
    fn requires_at_least_one_domain() {
        assert!(!settings_accepts(json!({ "domains": [] })));
        assert!(!settings_accepts(json!({})));
    }

    #[test]
    fn fills_in_every_default_from_a_bare_domain_list() {
        let settings: Value = parse(minimal());
        assert_eq!(settings["captchaType"], CAPTCHA_TYPE_DEFAULT.as_str());
        assert_eq!(
            settings["verifiedTimeout"],
            DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT
        );
        assert_eq!(
            settings["solutionTimeout"],
            DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT
        );
        assert_eq!(
            settings["frictionlessThreshold"],
            frictionless_threshold_default()
        );
        assert_eq!(settings["powDifficulty"], POW_DIFFICULTY_DEFAULT);
        assert_eq!(settings["imageThreshold"], IMAGE_THRESHOLD_DEFAULT);
        assert_eq!(settings["imageMaxRounds"], IMAGE_MAX_ROUNDS_DEFAULT);
        assert_eq!(settings["puzzleTolerance"], PUZZLE_TOLERANCE_DEFAULT);
        assert_eq!(settings["disallowWebView"], false);
    }

    #[test]
    fn defaults_the_captcha_type_to_frictionless() {
        assert_eq!(CAPTCHA_TYPE_DEFAULT, CaptchaType::Frictionless);
    }

    #[test]
    fn leaves_the_optional_sub_settings_absent_rather_than_defaulted() {
        let settings: Value = parse(minimal());
        for key in [
            "ipValidationRules",
            "trafficFilter",
            "spamFilter",
            "honeypot",
            "autoBanScoreThreshold",
            "storeMetadata",
        ] {
            assert!(settings.get(key).is_none(), "{key}");
        }
    }

    #[test]
    fn lifts_a_legacy_bare_number_into_the_puzzle_rung() {
        let settings: Value = parse(with(minimal(), "frictionlessThreshold", json!(0.35)));
        assert_eq!(
            settings["frictionlessThreshold"],
            json!({
                "frictionlessPuzzleThreshold": 0.35,
                "frictionlessImageThreshold": FRICTIONLESS_IMAGE_THRESHOLD_DEFAULT,
            })
        );
    }

    #[test]
    fn accepts_both_rungs_explicitly() {
        let settings: Value = parse(with(
            minimal(),
            "frictionlessThreshold",
            json!({ "frictionlessPuzzleThreshold": 0.35, "frictionlessImageThreshold": 0.75 }),
        ));
        assert_eq!(
            settings["frictionlessThreshold"]["frictionlessPuzzleThreshold"],
            0.35
        );
        assert_eq!(
            settings["frictionlessThreshold"]["frictionlessImageThreshold"],
            0.75
        );
    }

    #[test]
    fn fills_the_missing_rung_from_its_default() {
        let image_only: Value = parse(with(
            minimal(),
            "frictionlessThreshold",
            json!({ "frictionlessPuzzleThreshold": 0.4 }),
        ));
        assert_eq!(
            image_only["frictionlessThreshold"]["frictionlessImageThreshold"],
            FRICTIONLESS_IMAGE_THRESHOLD_DEFAULT
        );
        let puzzle_only: Value = parse(with(
            minimal(),
            "frictionlessThreshold",
            json!({ "frictionlessImageThreshold": 1.4 }),
        ));
        assert_eq!(
            puzzle_only["frictionlessThreshold"]["frictionlessPuzzleThreshold"],
            FRICTIONLESS_PUZZLE_THRESHOLD_DEFAULT
        );
    }

    #[test]
    fn accepts_rungs_collapsed_onto_the_same_value() {
        assert!(settings_accepts(with(
            minimal(),
            "frictionlessThreshold",
            json!({ "frictionlessPuzzleThreshold": 0.5, "frictionlessImageThreshold": 0.5 }),
        )));
    }

    #[test]
    fn rejects_an_image_rung_below_the_puzzle_rung() {
        assert!(!settings_accepts(with(
            minimal(),
            "frictionlessThreshold",
            json!({ "frictionlessPuzzleThreshold": 0.8, "frictionlessImageThreshold": 0.4 }),
        )));
    }

    #[test]
    fn allows_an_image_rung_above_1_unlike_the_puzzle_rung() {
        let settings: Value = parse(with(
            minimal(),
            "frictionlessThreshold",
            json!({ "frictionlessImageThreshold": 1.5 }),
        ));
        assert_eq!(
            settings["frictionlessThreshold"]["frictionlessImageThreshold"],
            1.5
        );
        assert!(!settings_accepts(with(
            minimal(),
            "frictionlessThreshold",
            json!({ "frictionlessPuzzleThreshold": 1.5 }),
        )));
    }

    #[test]
    fn rejects_a_negative_rung() {
        assert!(!settings_accepts(with(
            minimal(),
            "frictionlessThreshold",
            json!({ "frictionlessImageThreshold": -0.1 }),
        )));
    }

    #[test]
    fn accepts_every_selectable_captcha_type() {
        for captcha_type in CaptchaType::ALL {
            if captcha_type == CaptchaType::Audio {
                continue;
            }
            let settings: Value =
                parse(with(minimal(), "captchaType", json!(captcha_type.as_str())));
            assert_eq!(settings["captchaType"], captcha_type.as_str());
        }
    }

    #[test]
    fn rejects_audio_as_a_sites_captcha_type() {
        assert!(!settings_accepts(with(
            minimal(),
            "captchaType",
            json!("audio")
        )));
    }

    #[test]
    fn rejects_audio_as_a_traffic_categorys_captcha_type() {
        let policy: Schema = traffic_category_policy_schema();
        assert!(!accepts(
            &policy,
            json!({ "action": "challenge", "captchaType": "audio" })
        ));
        assert!(accepts(
            &policy,
            json!({ "action": "challenge", "captchaType": "image" })
        ));
    }

    #[test]
    fn rejects_an_unknown_captcha_type() {
        assert!(!settings_accepts(with(
            minimal(),
            "captchaType",
            json!("nope")
        )));
    }

    #[test]
    fn bounds_the_timeouts() {
        for key in ["verifiedTimeout", "solutionTimeout"] {
            assert!(settings_accepts(with(minimal(), key, json!(1000))), "{key}");
            assert!(
                settings_accepts(with(minimal(), key, json!(600000))),
                "{key}"
            );
            assert!(!settings_accepts(with(minimal(), key, json!(999))), "{key}");
            assert!(
                !settings_accepts(with(minimal(), key, json!(600001))),
                "{key}"
            );
            assert!(
                !settings_accepts(with(minimal(), key, json!(1000.5))),
                "{key}"
            );
        }
    }

    #[test]
    fn bounds_the_puzzle_rung_to_a_probability() {
        let rung = |value: Value| {
            parse(with(minimal(), "frictionlessThreshold", value))["frictionlessThreshold"]
                ["frictionlessPuzzleThreshold"]
                .clone()
        };
        assert_eq!(rung(json!(0)), 0);
        assert_eq!(rung(json!(1)), 1);
        assert!(!settings_accepts(with(
            minimal(),
            "frictionlessThreshold",
            json!(-0.1)
        )));
        assert!(!settings_accepts(with(
            minimal(),
            "frictionlessThreshold",
            json!(1.1)
        )));
    }

    #[test]
    fn bounds_pow_difficulty_to_1_to_10() {
        assert!(settings_accepts(with(minimal(), "powDifficulty", json!(1))));
        assert!(settings_accepts(with(
            minimal(),
            "powDifficulty",
            json!(10)
        )));
        assert!(!settings_accepts(with(
            minimal(),
            "powDifficulty",
            json!(0)
        )));
        assert!(!settings_accepts(with(
            minimal(),
            "powDifficulty",
            json!(11)
        )));
    }

    #[test]
    fn allows_a_fractional_pow_difficulty() {
        assert_eq!(
            parse(with(minimal(), "powDifficulty", json!(4.5)))["powDifficulty"],
            4.5
        );
    }

    #[test]
    fn requires_at_least_two_image_rounds() {
        assert!(!settings_accepts(with(
            minimal(),
            "imageMaxRounds",
            json!(1)
        )));
        assert_eq!(
            parse(with(minimal(), "imageMaxRounds", json!(2)))["imageMaxRounds"],
            2
        );
    }

    #[test]
    fn rejects_a_fractional_image_round_count() {
        assert!(!settings_accepts(with(
            minimal(),
            "imageMaxRounds",
            json!(2.5)
        )));
        assert!(!settings_accepts(with(
            minimal(),
            "imageMinRounds",
            json!(2.5)
        )));
    }

    #[test]
    fn defaults_image_min_rounds_to_the_historical_floor() {
        assert_eq!(parse(minimal())["imageMinRounds"], IMAGE_MIN_ROUNDS_DEFAULT);
        assert_eq!(IMAGE_MIN_ROUNDS_DEFAULT, 2.0);
    }

    #[test]
    fn allows_a_single_round_floor_but_never_a_sub_2_cap() {
        assert_eq!(
            parse(with(minimal(), "imageMinRounds", json!(1)))["imageMinRounds"],
            1
        );
        assert!(!settings_accepts(with(
            minimal(),
            "imageMinRounds",
            json!(0)
        )));
    }

    #[test]
    fn rejects_a_floor_above_the_cap() {
        let bounds = |min: u32, max: u32| {
            with(
                with(minimal(), "imageMinRounds", json!(min)),
                "imageMaxRounds",
                json!(max),
            )
        };
        assert!(!settings_accepts(bounds(9, 8)));
        assert!(settings_accepts(bounds(8, 8)));
    }

    #[test]
    fn bounds_puzzle_tolerance_to_5_to_1000() {
        assert!(!settings_accepts(with(
            minimal(),
            "puzzleTolerance",
            json!(4)
        )));
        assert_eq!(
            parse(with(minimal(), "puzzleTolerance", json!(5)))["puzzleTolerance"],
            5
        );
        assert_eq!(
            parse(with(minimal(), "puzzleTolerance", json!(1000)))["puzzleTolerance"],
            1000
        );
        assert!(!settings_accepts(with(
            minimal(),
            "puzzleTolerance",
            json!(1001)
        )));
    }

    #[test]
    fn allows_a_zero_auto_ban_score_threshold() {
        assert_eq!(
            parse(with(minimal(), "autoBanScoreThreshold", json!(0)))["autoBanScoreThreshold"],
            0
        );
    }

    #[test]
    fn rejects_a_negative_auto_ban_score_threshold() {
        assert!(!settings_accepts(with(
            minimal(),
            "autoBanScoreThreshold",
            json!(-1)
        )));
    }

    #[test]
    fn accepts_many_domains_and_does_not_deduplicate_them() {
        assert_eq!(
            parse(json!({ "domains": ["a.com", "a.com", "b.com"] }))["domains"],
            json!(["a.com", "a.com", "b.com"])
        );
    }
}

mod ip_validation_rules {
    use super::*;

    fn rules(input: Value) -> Value {
        parse_with(&ip_validation_rules_schema(), input)
    }

    #[test]
    fn defaults_to_disabled_with_permissive_actions() {
        let rules: Value = rules(json!({ "actions": {} }));
        assert_eq!(rules["enabled"], false);
        assert_eq!(rules["actions"]["countryChangeAction"], "allow");
        assert_eq!(rules["actions"]["cityChangeAction"], "allow");
        assert_eq!(rules["actions"]["ispChangeAction"], "allow");
    }

    #[test]
    fn rejects_a_distance_or_abuse_breach_by_default() {
        let rules: Value = rules(json!({ "actions": {} }));
        assert_eq!(rules["actions"]["distanceExceedAction"], "reject");
        assert_eq!(rules["actions"]["abuseScoreExceedAction"], "reject");
    }

    #[test]
    fn defaults_the_thresholds_and_the_conjunction_flag() {
        let rules: Value = rules(json!({ "actions": {} }));
        assert_eq!(rules["distanceThresholdKm"], DISTANCE_THRESHOLD_KM_DEFAULT);
        assert_eq!(rules["abuseScoreThreshold"], ABUSE_SCORE_THRESHOLD_DEFAULT);
        assert_eq!(rules["requireAllConditions"], false);
        assert_eq!(rules["forceConsistentIp"], false);
    }

    #[test]
    fn requires_the_actions_object_even_when_empty() {
        assert!(!accepts(&ip_validation_rules_schema(), json!({})));
    }

    #[test]
    fn rejects_a_non_positive_threshold() {
        let schema: Schema = ip_validation_rules_schema();
        assert!(!accepts(
            &schema,
            json!({ "actions": {}, "distanceThresholdKm": 0 })
        ));
        assert!(!accepts(
            &schema,
            json!({ "actions": {}, "abuseScoreThreshold": 0 })
        ));
    }

    #[test]
    fn rejects_an_unknown_action() {
        assert!(!accepts(
            &ip_validation_rules_schema(),
            json!({ "actions": { "countryChangeAction": "quarantine" } })
        ));
    }

    #[test]
    fn accepts_per_country_overrides_which_do_not_inherit_the_defaults() {
        let rules: Value = rules(json!({
            "actions": {},
            "countryOverrides": { "GB": { "actions": { "countryChangeAction": "flag" } } },
        }));
        assert_eq!(
            rules["countryOverrides"]["GB"]["actions"]["countryChangeAction"],
            "flag"
        );
        assert!(rules["countryOverrides"]["GB"]
            .get("distanceThresholdKm")
            .is_none());
    }
}

mod device_type_from_user_agent_cases {
    use super::*;

    #[test]
    fn classifies_known_user_agents() {
        let cases: [(&str, DeviceType); 6] = [
            ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", DeviceType::Desktop),
            ("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0", DeviceType::Desktop),
            ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", DeviceType::Mobile),
            ("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36", DeviceType::Mobile),
            ("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", DeviceType::Tablet),
            ("Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", DeviceType::Tablet),
        ];
        for (user_agent, expected) in cases {
            assert_eq!(
                device_type_from_user_agent(Some(user_agent)),
                expected,
                "{user_agent}"
            );
        }
    }

    #[test]
    fn falls_back_to_desktop_for_a_missing_or_unrecognised_user_agent() {
        assert_eq!(device_type_from_user_agent(None), DeviceType::Desktop);
        assert_eq!(device_type_from_user_agent(Some("")), DeviceType::Desktop);
        assert_eq!(
            device_type_from_user_agent(Some("curl/8.4.0")),
            DeviceType::Desktop
        );
    }
}

mod context_type_for_cases {
    use super::*;

    #[test]
    fn crosses_each_device_family_with_the_webview_flag() {
        assert_eq!(
            context_type_for(DeviceType::Desktop, false),
            ContextType::Desktop
        );
        assert_eq!(
            context_type_for(DeviceType::Desktop, true),
            ContextType::DesktopWebview
        );
        assert_eq!(
            context_type_for(DeviceType::Mobile, false),
            ContextType::Mobile
        );
        assert_eq!(
            context_type_for(DeviceType::Mobile, true),
            ContextType::MobileWebview
        );
        assert_eq!(
            context_type_for(DeviceType::Tablet, false),
            ContextType::Tablet
        );
        assert_eq!(
            context_type_for(DeviceType::Tablet, true),
            ContextType::TabletWebview
        );
    }

    #[test]
    fn covers_every_device_context_exactly_once() {
        let produced: Vec<ContextType> = DeviceType::ALL
            .iter()
            .flat_map(|device| {
                [
                    context_type_for(*device, false),
                    context_type_for(*device, true),
                ]
            })
            .collect();
        let unique: HashSet<ContextType> = produced.iter().copied().collect();
        assert_eq!(
            unique,
            DEVICE_CONTEXT_TYPES
                .into_iter()
                .collect::<HashSet<ContextType>>()
        );
        assert_eq!(produced.len(), DEVICE_CONTEXT_TYPES.len());
    }
}

mod email_spam_rules {
    use super::*;

    fn email_accepts(input: Value) -> bool {
        accepts(&email_spam_rules_schema(), input)
    }

    #[test]
    fn is_off_by_default_with_an_empty_blocklist() {
        let rules: Value = parse_with(&email_spam_rules_schema(), json!({}));
        assert_eq!(rules["enabled"], false);
        assert_eq!(rules["normaliseGmail"], false);
        assert_eq!(rules["useDefaultPatterns"], false);
        assert_eq!(rules["customRegexBlocklist"], json!([]));
    }

    #[test]
    fn allows_zero_local_part_dots() {
        let rules: Value = parse_with(&email_spam_rules_schema(), json!({ "maxLocalPartDots": 0 }));
        assert_eq!(rules["maxLocalPartDots"], 0);
    }

    #[test]
    fn rejects_a_negative_or_fractional_dot_count() {
        assert!(!email_accepts(json!({ "maxLocalPartDots": -1 })));
        assert!(!email_accepts(json!({ "maxLocalPartDots": 1.5 })));
    }

    #[test]
    fn accepts_a_simple_pattern() {
        assert!(email_accepts(json!({ "customRegexBlocklist": ["^spam"] })));
    }

    #[test]
    fn rejects_a_syntactically_invalid_pattern() {
        assert!(!email_accepts(json!({ "customRegexBlocklist": ["("] })));
    }

    #[test]
    fn rejects_patterns_that_can_hang_the_matcher() {
        for pattern in ["(?=evil)", "(?<=evil)", "(?!evil)", "a{1000}"] {
            assert!(
                !email_accepts(json!({ "customRegexBlocklist": [pattern] })),
                "{pattern}"
            );
        }
    }

    #[test]
    fn caps_the_pattern_length() {
        assert!(!email_accepts(
            json!({ "customRegexBlocklist": ["a".repeat(257)] })
        ));
        assert!(email_accepts(
            json!({ "customRegexBlocklist": ["a".repeat(256)] })
        ));
    }

    #[test]
    fn caps_the_number_of_patterns() {
        assert!(!email_accepts(
            json!({ "customRegexBlocklist": vec!["a"; 51] })
        ));
        assert!(email_accepts(
            json!({ "customRegexBlocklist": vec!["a"; 50] })
        ));
    }
}

mod spam_filter_rules {
    use super::*;

    #[test]
    fn is_off_by_default_with_no_email_rules() {
        let rules: Value = parse_with(&spam_filter_rules_schema(), json!({}));
        assert_eq!(rules["enabled"], false);
        assert!(rules.get("emailRules").is_none());
    }

    #[test]
    fn defaults_the_nested_email_rules_once_they_are_present() {
        let rules: Value = parse_with(
            &spam_filter_rules_schema(),
            json!({ "enabled": true, "emailRules": {} }),
        );
        assert_eq!(rules["emailRules"]["enabled"], false);
    }
}

mod traffic_filter {
    use super::*;

    fn filter(input: Value) -> Value {
        parse_with(&traffic_filter_schema(), input)
    }

    #[test]
    fn leaves_every_category_unconfigured_by_default() {
        let filter: Value = filter(json!({}));
        for key in [
            "vpn",
            "proxy",
            "tor",
            "abuser",
            "datacenter",
            "mobile",
            "satellite",
            "crawler",
        ] {
            assert!(filter.get(key).is_none(), "{key}");
        }
    }

    #[test]
    fn skips_the_extras_check_on_a_validated_dns_path_by_default() {
        assert_eq!(filter(json!({}))["skipExtrasOnValidDnsPath"], true);
    }

    #[test]
    fn defaults_the_abuser_score_threshold() {
        assert_eq!(
            filter(json!({}))["abuserScoreThreshold"],
            TRAFFIC_FILTER_ABUSER_SCORE_THRESHOLD_DEFAULT
        );
    }

    #[test]
    fn bounds_the_abuser_score_threshold_to_a_probability() {
        let schema: Schema = traffic_filter_schema();
        assert!(accepts(&schema, json!({ "abuserScoreThreshold": 0 })));
        assert!(accepts(&schema, json!({ "abuserScoreThreshold": 1 })));
        assert!(!accepts(&schema, json!({ "abuserScoreThreshold": 1.01 })));
    }

    #[test]
    fn leaves_the_allow_and_deny_lists_absent_by_default() {
        let filter: Value = filter(json!({}));
        assert!(filter.get("datacenterNameAllowlist").is_none());
        assert!(filter.get("datacenterNameDenylist").is_none());
    }

    #[test]
    fn rejects_an_empty_or_overlong_list_entry() {
        let schema: Schema = traffic_filter_schema();
        for key in ["datacenterNameAllowlist", "datacenterNameDenylist"] {
            assert!(!accepts(&schema, json!({ key: [""] })), "{key}");
            assert!(
                !accepts(&schema, json!({ key: ["a".repeat(129)] })),
                "{key}"
            );
            assert!(!accepts(&schema, json!({ key: vec!["a"; 51] })), "{key}");
            assert!(accepts(&schema, json!({ key: [] })), "{key}");
        }
    }
}

mod honeypot_settings {
    use super::*;

    #[test]
    fn is_off_by_default_and_encodes_with_morse() {
        let honeypot: Value = parse_with(&honeypot_settings_schema(), json!({}));
        assert_eq!(honeypot["enabled"], false);
        assert_eq!(
            honeypot["encodingType"],
            HONEYPOT_ENCODING_TYPE_DEFAULT.as_str()
        );
        assert_eq!(HONEYPOT_ENCODING_TYPE_DEFAULT, EncodingType::Morse);
        assert!(honeypot.get("question").is_none());
    }

    #[test]
    fn accepts_every_encoding() {
        for encoding in EncodingType::ALL {
            let honeypot: Value = parse_with(
                &honeypot_settings_schema(),
                json!({ "encodingType": encoding.as_str() }),
            );
            assert_eq!(honeypot["encodingType"], encoding.as_str());
        }
    }

    #[test]
    fn rejects_an_unknown_encoding() {
        assert!(!accepts(
            &honeypot_settings_schema(),
            json!({ "encodingType": "rot13" })
        ));
    }
}

mod image_round_bounds {
    use super::*;

    #[test]
    fn clamps_a_requested_count_into_the_configured_bounds() {
        assert_eq!(clamp_image_rounds(1.0, Some(3.0), Some(8.0)), 3.0);
        assert_eq!(clamp_image_rounds(5.0, Some(3.0), Some(8.0)), 5.0);
        assert_eq!(clamp_image_rounds(99.0, Some(3.0), Some(8.0)), 8.0);
    }

    #[test]
    fn rounds_a_fractional_request_to_a_whole_number_of_rounds() {
        assert_eq!(clamp_image_rounds(4.4, Some(2.0), Some(8.0)), 4.0);
        assert_eq!(clamp_image_rounds(4.5, Some(2.0), Some(8.0)), 5.0);
    }

    #[test]
    fn falls_back_to_the_floor_for_a_non_finite_request() {
        assert_eq!(clamp_image_rounds(f64::NAN, Some(3.0), Some(8.0)), 3.0);
    }

    #[test]
    fn uses_the_schema_defaults_when_a_record_stores_neither_bound() {
        assert_eq!(
            resolve_image_rounds_bounds(None, None),
            ImageRounds {
                min: IMAGE_MIN_ROUNDS_DEFAULT,
                max: IMAGE_MAX_ROUNDS_DEFAULT
            }
        );
    }

    #[test]
    fn lets_the_cap_win_when_a_legacy_records_floor_exceeds_it() {
        assert_eq!(
            resolve_image_rounds_bounds(None, Some(1.0)),
            ImageRounds { min: 1.0, max: 1.0 }
        );
        assert_eq!(clamp_image_rounds(5.0, Some(9.0), Some(4.0)), 4.0);
    }
}

mod icon_order_settings {
    use super::*;

    fn icon_accepts(input: Value) -> bool {
        accepts(&icon_order_settings_schema(), input)
    }

    #[test]
    fn accepts_a_partial_override_without_restating_the_defaults() {
        let parsed: Value = parse_with(&icon_order_settings_schema(), json!({ "decoyCount": 2 }));
        assert_eq!(parsed["decoyCount"], 2);
        assert!(parsed.get("targetCount").is_none());
    }

    #[test]
    fn rejects_a_total_the_glyph_vocabulary_cannot_supply() {
        assert!(!icon_accepts(json!({ "targetCount": 6, "decoyCount": 6 })));
    }

    #[test]
    fn counts_the_defaults_when_only_one_side_is_overridden() {
        assert!(icon_accepts(json!({ "targetCount": 6 })));
        assert!(!icon_accepts(json!({ "decoyCount": 8 })));
    }

    #[test]
    fn bounds_the_render_tunables() {
        assert!(!icon_accepts(json!({ "targetCount": 1 })));
        assert!(!icon_accepts(json!({ "iconOpacity": 0 })));
        assert!(!icon_accepts(json!({ "strokeWidth": 0 })));
        assert!(!icon_accepts(json!({ "haloOpacity": 1.5 })));
    }

    #[test]
    fn defaults_the_owners_icon_order_preference_on() {
        assert_eq!(parse(minimal())["frictionlessTypes"]["iconOrder"], true);
        assert!(resolve_frictionless_types(None).icon_order);
        assert!(
            resolve_frictionless_types(Some(&json!({ "image": true, "puzzle": true }))).icon_order
        );
        assert!(!resolve_frictionless_types(Some(&json!({ "iconOrder": false }))).icon_order);
    }

    #[test]
    fn defaults_the_tolerance_to_a_size_relative_radius() {
        let parsed: Value = parse(minimal());
        assert_eq!(parsed["iconOrderTolerance"], ICON_ORDER_TOLERANCE_DEFAULT);
        assert!(parsed.get("iconOrder").is_none());
    }

    #[test]
    fn keeps_a_site_wide_render_override() {
        let parsed: Value = parse(with(
            minimal(),
            "iconOrder",
            json!({ "targetCount": 4, "decoyCount": 3 }),
        ));
        assert_eq!(
            parsed["iconOrder"],
            json!({ "targetCount": 4, "decoyCount": 3 })
        );
    }

    #[test]
    fn rejects_a_tolerance_outside_the_field_bounds() {
        assert!(!settings_accepts(with(
            minimal(),
            "iconOrderTolerance",
            json!(0)
        )));
        assert!(!settings_accepts(with(
            minimal(),
            "iconOrderTolerance",
            json!(13)
        )));
    }

    #[test]
    fn accepts_the_ceiling_the_end_to_end_specs_rely_on() {
        assert_eq!(
            parse(with(minimal(), "iconOrderTolerance", json!(12)))["iconOrderTolerance"],
            12
        );
    }
}

mod audio_settings {
    use super::*;

    #[test]
    fn accepts_a_partial_override_without_restating_the_defaults() {
        let parsed: Value = parse_with(&audio_settings_schema(), json!({ "digitCount": 6 }));
        assert_eq!(parsed["digitCount"], 6);
        assert!(parsed.get("noiseSnrDb").is_none());
    }

    #[test]
    fn bounds_the_render_tunables() {
        for input in [
            json!({ "digitCount": 2 }),
            json!({ "digitCount": 9 }),
            json!({ "noiseSnrDb": 2 }),
            json!({ "babbleGain": 0.7 }),
            json!({ "babbleVoices": 5 }),
            json!({ "reverbMix": 0.7 }),
            json!({ "gapMs": 1501 }),
        ] {
            assert!(!accepts(&audio_settings_schema(), input.clone()), "{input}");
        }
    }

    #[test]
    fn leaves_the_accessibility_alternative_unset() {
        let parsed: Value = parse(minimal());
        assert!(parsed.get("audioAccessibilityEnabled").is_none());
        assert!(parsed.get("audio").is_none());
    }

    #[test]
    fn keeps_an_explicit_opt_in() {
        assert_eq!(
            parse(with(minimal(), "audioAccessibilityEnabled", json!(true)))
                ["audioAccessibilityEnabled"],
            true
        );
    }

    #[test]
    fn keeps_a_site_wide_render_override() {
        let parsed: Value = parse(with(
            minimal(),
            "audio",
            json!({ "digitCount": 4, "gapMs": 400 }),
        ));
        assert_eq!(parsed["audio"], json!({ "digitCount": 4, "gapMs": 400 }));
    }

    #[test]
    fn rejects_a_render_override_outside_the_field_bounds() {
        assert!(!settings_accepts(with(
            minimal(),
            "audio",
            json!({ "digitCount": 12 })
        )));
    }
}

mod captcha_type_feature_flags {
    use super::*;

    #[test]
    fn allows_puzzle_by_default() {
        assert!(is_captcha_type_feature_enabled(CaptchaType::Puzzle, None));
        assert!(is_captcha_type_feature_enabled(
            CaptchaType::Puzzle,
            Some(&json!({}))
        ));
    }

    #[test]
    fn keeps_icon_order_off_unless_its_flag_is_true() {
        assert!(!is_captcha_type_feature_enabled(
            CaptchaType::IconOrder,
            None
        ));
        assert!(!is_captcha_type_feature_enabled(
            CaptchaType::IconOrder,
            Some(&json!({}))
        ));
        assert!(is_captcha_type_feature_enabled(
            CaptchaType::IconOrder,
            Some(&json!({ "iconOrder": true }))
        ));
    }

    #[test]
    fn keeps_audio_off_unless_its_flag_is_true() {
        assert!(!is_captcha_type_feature_enabled(CaptchaType::Audio, None));
        assert!(is_captcha_type_feature_enabled(
            CaptchaType::Audio,
            Some(&json!({ "audio": true }))
        ));
    }

    #[test]
    fn never_makes_audio_a_type_the_frictionless_flow_can_serve() {
        let allowed: AllowedTypes = resolve_allowed_captcha_types(Some(
            &json!({ "captchaTypeFeatureFlags": { "audio": true } }),
        ));
        assert_eq!(
            allowed,
            AllowedTypes {
                image: true,
                puzzle: true,
                icon_order: false
            }
        );
    }

    #[test]
    fn disallows_puzzle_only_when_the_flag_is_false() {
        assert!(!is_captcha_type_feature_enabled(
            CaptchaType::Puzzle,
            Some(&json!({ "puzzle": false }))
        ));
        assert!(is_captcha_type_feature_enabled(
            CaptchaType::Puzzle,
            Some(&json!({ "puzzle": true }))
        ));
    }

    #[test]
    fn leaves_types_without_a_flag_enabled() {
        for captcha_type in [
            CaptchaType::Pow,
            CaptchaType::Image,
            CaptchaType::Frictionless,
        ] {
            assert!(is_captcha_type_feature_enabled(
                captcha_type,
                Some(&json!({ "puzzle": false }))
            ));
        }
    }

    #[test]
    fn is_absent_from_parsed_settings_unless_set() {
        assert!(parse(minimal()).get("captchaTypeFeatureFlags").is_none());
        let parsed: Value = parse(with(
            minimal(),
            "captchaTypeFeatureFlags",
            json!({ "puzzle": false }),
        ));
        assert_eq!(
            parsed["captchaTypeFeatureFlags"],
            json!({ "puzzle": false })
        );
    }
}

mod resolve_allowed_captcha_types_cases {
    use super::*;

    fn allowed(settings: Value) -> AllowedTypes {
        resolve_allowed_captcha_types(Some(&settings))
    }

    #[test]
    fn allows_image_and_puzzle_but_not_icon_order_when_nothing_is_configured() {
        let expected: AllowedTypes = AllowedTypes {
            image: true,
            puzzle: true,
            icon_order: false,
        };
        assert_eq!(resolve_allowed_captcha_types(None), expected);
        assert_eq!(allowed(json!({})), expected);
    }

    #[test]
    fn matches_the_owners_frictionless_types_when_no_flag_is_set() {
        for image in [true, false] {
            for puzzle in [true, false] {
                assert_eq!(
                    allowed(json!({ "frictionlessTypes": { "image": image, "puzzle": puzzle } })),
                    AllowedTypes {
                        image,
                        puzzle,
                        icon_order: false
                    }
                );
            }
        }
    }

    #[test]
    fn lets_the_feature_flag_override_the_owners_choice() {
        assert_eq!(
            allowed(json!({
                "frictionlessTypes": { "image": true, "puzzle": true },
                "captchaTypeFeatureFlags": { "puzzle": false },
            })),
            AllowedTypes {
                image: true,
                puzzle: false,
                icon_order: false
            }
        );
    }

    #[test]
    fn allows_icon_order_only_when_the_flag_and_the_owner_both_do() {
        assert!(
            !allowed(
                json!({ "frictionlessTypes": { "image": true, "puzzle": true, "iconOrder": true } })
            )
            .icon_order
        );
        assert!(allowed(json!({ "captchaTypeFeatureFlags": { "iconOrder": true } })).icon_order);
        assert!(
            !allowed(json!({
                "frictionlessTypes": { "image": true, "puzzle": true, "iconOrder": false },
                "captchaTypeFeatureFlags": { "iconOrder": true },
            }))
            .icon_order
        );
    }

    #[test]
    fn never_lets_the_feature_flag_re_enable_a_type_the_owner_switched_off() {
        assert_eq!(
            allowed(json!({
                "frictionlessTypes": { "image": true, "puzzle": false },
                "captchaTypeFeatureFlags": { "puzzle": true },
            })),
            AllowedTypes {
                image: true,
                puzzle: false,
                icon_order: false
            }
        );
    }
}

mod widget_feature_flags {
    use super::*;

    #[test]
    fn leaves_the_puzzle_image_switch_off_by_default() {
        assert!(!is_puzzle_image_switch_enabled(None));
        assert!(!is_puzzle_image_switch_enabled(Some(&json!({}))));
    }

    #[test]
    fn turns_the_puzzle_image_switch_on_only_when_the_flag_is_true() {
        assert!(is_puzzle_image_switch_enabled(Some(
            &json!({ "puzzleImageSwitch": true })
        )));
        assert!(!is_puzzle_image_switch_enabled(Some(
            &json!({ "puzzleImageSwitch": false })
        )));
    }

    #[test]
    fn is_absent_from_parsed_settings_unless_set() {
        assert!(parse(minimal()).get("widgetFeatureFlags").is_none());
        let parsed: Value = parse(with(
            minimal(),
            "widgetFeatureFlags",
            json!({ "puzzleImageSwitch": true }),
        ));
        assert_eq!(
            parsed["widgetFeatureFlags"],
            json!({ "puzzleImageSwitch": true })
        );
    }
}
