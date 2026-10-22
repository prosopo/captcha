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

//! The cases of src/types/schemas.test.ts, one for one, then the Rust-only ones.

use crate::captcha::{
    STORED_POW_CAPTCHA_RECORD, STORED_PUZZLE_CAPTCHA_RECORD, STORED_SESSION_RECORD, STORED_USER_COMMITMENT_RECORD,
};
use crate::client::{USER_DATA, USER_SETTINGS};
use crate::document::{build, create, stored, Issue};
use crate::provider::{
    composite_ip_fields, BANNED_DOMAIN_RECORD, CAPTCHA_RECORD, CLIENT_RECORD, POW_CAPTCHA_RECORD,
    PUZZLE_CAPTCHA_RECORD, SCHEDULED_TASK_RECORD, SESSION_RECORD, SPAM_EMAIL_DOMAIN_RECORD, USER_SOLUTION_RECORD,
};
use crate::scheduled_task::ScheduledTask;
use crate::schema::{FreshIds, Index, IndexOptions, Schema};
use bson::{doc, Bson, DateTime, Document};
use prosopo_types::captcha_type::CaptchaType;
use prosopo_types::client::{ScheduledTaskNames, ScheduledTaskStatus, Tier};
use prosopo_types::settings::{TrafficFilterAction, CAPTCHA_TYPE_DEFAULT, MAX_PAD_BYTES, POW_DIFFICULTY_DEFAULT};
use prosopo_types::JsNumber;

fn built(schema: &Schema, input: Document) -> Document {
    build(schema, &input, &mut FreshIds).0
}

fn error_paths(schema: &Schema, input: Document) -> Vec<String> {
    build(schema, &input, &mut FreshIds).1.into_iter().map(|issue: Issue| issue.path).collect()
}

fn index_on<'a>(indexes: &'a [Index], field: &str) -> Option<&'a Index> {
    indexes.iter().find(|index| index.keys.iter().any(|(key, _)| key == field))
}

fn has_index_on(schema: &Schema, field: &str) -> bool {
    index_on(&schema.indexes(), field).is_some()
}

fn index_options(schema: &Schema, field: &str) -> Option<IndexOptions> {
    index_on(&schema.indexes(), field).map(|index| index.options.clone())
}

fn sub<'a>(document: &'a Document, path: &str) -> Option<&'a Bson> {
    let mut cursor: &Document = document;
    let pieces: Vec<&str> = path.split('.').collect();
    for piece in &pieces[..pieces.len() - 1] {
        cursor = cursor.get_document(*piece).ok()?;
    }
    cursor.get(pieces[pieces.len() - 1])
}

fn number(document: &Document, path: &str) -> Option<f64> {
    crate::number::as_js_number(sub(document, path)?)
}

mod banned_domain_record_schema {
    use super::*;

    #[test]
    fn requires_a_domain() {
        assert_eq!(error_paths(&BANNED_DOMAIN_RECORD, doc! {}), ["domain"]);
    }

    #[test]
    fn accepts_a_domain() {
        assert!(error_paths(&BANNED_DOMAIN_RECORD, doc! { "domain": "bad.example" }).is_empty());
    }

    #[test]
    fn indexes_the_domain_exactly_once_via_the_unique_constraint() {
        assert!(BANNED_DOMAIN_RECORD.path("domain").expect("domain").unique);
        let indexes: Vec<Index> = BANNED_DOMAIN_RECORD.indexes();
        assert_eq!(indexes.len(), 1);
        assert_eq!(indexes[0].keys, [("domain".to_string(), 1)]);
        assert_eq!(indexes[0].options, IndexOptions::unique());
    }

    #[test]
    fn rejects_an_empty_domain_only_if_the_string_is_absent_not_blank() {
        assert_eq!(error_paths(&BANNED_DOMAIN_RECORD, doc! { "domain": "" }), ["domain"]);
    }
}

mod spam_email_domain_record_schema {
    use super::*;

    #[test]
    fn mirrors_the_banned_domain_schema() {
        assert_eq!(error_paths(&SPAM_EMAIL_DOMAIN_RECORD, doc! {}), ["domain"]);
        assert!(SPAM_EMAIL_DOMAIN_RECORD.path("domain").expect("domain").unique);
        assert_eq!(SPAM_EMAIL_DOMAIN_RECORD.indexes().len(), 1);
    }
}

mod client_record_schema {
    use super::*;

    #[test]
    fn requires_a_tier_drawn_from_the_tier_enum() {
        assert_eq!(error_paths(&CLIENT_RECORD, doc! {}), ["tier"]);
        assert_eq!(error_paths(&CLIENT_RECORD, doc! { "tier": "platinum" }), ["tier"]);
        assert!(error_paths(&CLIENT_RECORD, doc! { "tier": Tier::Free.as_str() }).is_empty());
    }

    #[test]
    fn indexes_the_account() {
        assert!(has_index_on(&CLIENT_RECORD, "account"));
    }
}

mod composite_ip_address_record_schema_obj {
    use super::*;
    use std::sync::LazyLock;

    static IP_SCHEMA: LazyLock<Schema> = LazyLock::new(|| Schema::new(composite_ip_fields()));

    fn lower(input: Document) -> String {
        built(&IP_SCHEMA, input).get("lower").expect("lower").to_string()
    }

    #[test]
    fn requires_the_lower_half_but_not_the_upper() {
        assert!(IP_SCHEMA.path("lower").expect("lower").required);
        assert!(!IP_SCHEMA.path("upper").expect("upper").required);
    }

    #[test]
    fn stringifies_a_bigint_so_decimal128_does_not_lose_precision() {
        let value: u64 = (1 << 63) + 1;
        let input: Document = doc! { "lower": value.to_string(), "type": "v6" };
        assert_eq!(lower(input), value.to_string());
    }

    #[test]
    fn unpacks_a_bson_long_into_its_unsigned_decimal_string() {
        let input: Document = doc! { "lower": Bson::Int64(u64::MAX as i64), "type": "v6" };
        assert_eq!(lower(input), "18446744073709551615");
    }

    #[test]
    fn passes_a_plain_number_straight_through() {
        assert_eq!(lower(doc! { "lower": 3_232_235_777.0_f64, "type": "v4" }), "3232235777");
    }

    #[test]
    fn passes_a_decimal_string_straight_through() {
        assert_eq!(lower(doc! { "lower": "3232235777", "type": "v4" }), "3232235777");
    }

    #[test]
    fn requires_the_address_type() {
        assert_eq!(error_paths(&IP_SCHEMA, doc! { "lower": 1 }), ["type"]);
    }
}

mod captcha_record_schema {
    use super::*;

    fn captcha() -> Document {
        doc! {
            "captchaId": "id",
            "captchaContentId": "content",
            "datasetId": "dataset",
            "datasetContentId": "datasetContent",
            "solved": true,
            "target": "bus",
            "salt": "0x01",
            "items": [{ "hash": "h", "data": "d", "type": "image" }],
        }
    }

    #[test]
    fn accepts_a_fully_populated_captcha() {
        assert!(error_paths(&CAPTCHA_RECORD, captcha()).is_empty());
    }

    #[test]
    fn names_every_missing_required_field_at_once() {
        assert_eq!(
            error_paths(&CAPTCHA_RECORD, doc! {}),
            ["captchaContentId", "captchaId", "datasetContentId", "datasetId", "salt", "solved", "target"]
        );
    }

    #[test]
    fn treats_the_asset_uri_and_the_random_key_as_optional() {
        assert!(!CAPTCHA_RECORD.path("assetURI").expect("assetURI").required);
        assert!(!CAPTCHA_RECORD.path("randomKey").expect("randomKey").required);
    }

    #[test]
    fn requires_every_field_of_an_embedded_item() {
        let mut input: Document = captcha();
        input.insert("items", vec![Bson::Document(doc! { "hash": "h" })]);
        assert_eq!(error_paths(&CAPTCHA_RECORD, input), ["items.0.data", "items.0.type"]);
    }

    #[test]
    fn accepts_an_empty_item_list() {
        let mut input: Document = captcha();
        input.insert("items", Bson::Array(Vec::new()));
        assert!(error_paths(&CAPTCHA_RECORD, input).is_empty());
    }

    #[test]
    fn gives_embedded_items_no_id_of_their_own() {
        let document: Document = built(&CAPTCHA_RECORD, captcha());
        let item: &Document = document.get_array("items").expect("items")[0].as_document().expect("item");
        assert!(!item.contains_key("_id"));
    }

    #[test]
    fn carries_the_compound_index_that_powers_random_sampling() {
        let compound: bool = CAPTCHA_RECORD.indexes().iter().any(|index| {
            let keys: Vec<&str> = index.keys.iter().map(|(key, _)| key.as_str()).collect();
            ["datasetId", "solved", "randomKey"].iter().all(|key| keys.contains(key))
        });
        assert!(compound);
    }
}

mod user_solution_record_schema {
    use super::*;

    fn solution() -> Document {
        doc! {
            "captchaId": "id",
            "captchaContentId": "content",
            "salt": "0x01",
            "solution": ["a", "b"],
            "processed": false,
            "checked": false,
            "commitmentId": "commitment",
        }
    }

    #[test]
    fn accepts_a_complete_solution() {
        assert!(error_paths(&USER_SOLUTION_RECORD, solution()).is_empty());
    }

    #[test]
    fn stamps_created_at_so_the_ttl_has_something_to_expire() {
        assert!(matches!(built(&USER_SOLUTION_RECORD, solution()).get("createdAt"), Some(Bson::DateTime(_))));
    }

    #[test]
    fn expires_solutions_after_four_weeks() {
        assert_eq!(USER_SOLUTION_RECORD.path("createdAt").expect("createdAt").expires, Some(60 * 60 * 24 * 7 * 4));
    }

    #[test]
    fn is_embedded_so_it_carries_no_id() {
        assert!(!built(&USER_SOLUTION_RECORD, solution()).contains_key("_id"));
    }
}

mod scheduled_task_schema {
    use super::*;

    fn task() -> Document {
        doc! {
            "processName": ScheduledTaskNames::BatchCommitment.as_str(),
            "datetime": DateTime::now(),
            "status": ScheduledTaskStatus::Running.as_str(),
        }
    }

    fn parses(input: Document) -> bool {
        bson::deserialize_from_document::<ScheduledTask>(input).is_ok()
    }

    #[test]
    fn accepts_a_minimal_task() {
        assert!(parses(task()));
    }

    #[test]
    fn rejects_a_process_name_outside_the_enum() {
        let mut input: Document = task();
        input.insert("processName", "nope");
        assert!(!parses(input));
    }

    #[test]
    fn rejects_a_status_outside_the_enum() {
        let mut input: Document = task();
        input.insert("status", "nope");
        assert!(!parses(input));
    }

    #[test]
    fn rejects_a_datetime_that_is_not_a_date() {
        let mut input: Document = task();
        input.insert("datetime", DateTime::now().timestamp_millis());
        assert!(!parses(input));
    }

    #[test]
    fn accepts_an_optional_result_carrying_arbitrary_data() {
        let mut input: Document = task();
        input.insert("updated", DateTime::now());
        input.insert("result", doc! { "data": { "rows": 3 }, "error": "partial" });
        assert!(parses(input));
    }

    #[test]
    fn accepts_an_empty_result_object() {
        let mut input: Document = task();
        input.insert("result", Document::new());
        assert!(parses(input));
    }
}

mod scheduled_task_record_schema {
    use super::*;

    #[test]
    fn requires_the_process_name_and_status() {
        assert_eq!(error_paths(&SCHEDULED_TASK_RECORD, doc! {}), ["datetime", "processName", "status"]);
    }

    #[test]
    fn expires_task_records_after_a_week() {
        assert_eq!(SCHEDULED_TASK_RECORD.path("datetime").expect("datetime").expires, Some(60 * 60 * 24 * 7));
    }

    #[test]
    fn indexes_the_process_name_on_its_own_and_with_the_status() {
        let indexes: Vec<String> = SCHEDULED_TASK_RECORD
            .indexes()
            .iter()
            .map(|index| index.keys.iter().map(|(key, _)| key.as_str()).collect::<Vec<&str>>().join(","))
            .collect();
        assert!(indexes.contains(&"processName".to_string()));
        assert!(indexes.contains(&"processName,status".to_string()));
    }
}

mod pow_captcha_record_schema {
    use super::*;

    #[test]
    fn requires_the_challenge_and_both_accounts() {
        let paths: Vec<String> = error_paths(&POW_CAPTCHA_RECORD, doc! {});
        for field in ["challenge", "dappAccount", "userAccount"] {
            assert!(paths.contains(&field.to_string()), "{field}");
        }
    }

    #[test]
    fn leaves_every_outcome_timestamp_optional_since_they_arrive_later() {
        for field in ["submittedAtTimestamp", "verifiedAtTimestamp", "failedAtTimestamp", "lastUpdatedTimestamp"] {
            assert!(!POW_CAPTCHA_RECORD.path(field).expect(field).required, "{field}");
        }
    }

    #[test]
    fn indexes_the_challenge_for_lookup_by_id() {
        assert!(has_index_on(&POW_CAPTCHA_RECORD, "challenge"));
    }

    #[test]
    fn uses_a_partial_index_for_the_pending_stage_sweep() {
        let options: IndexOptions = index_options(&POW_CAPTCHA_RECORD, "pendingStage").expect("an index");
        assert_eq!(options.partial_filter_expression, Some(doc! { "pendingStage": true }));
    }
}

mod session_record_schema {
    use super::*;

    #[test]
    fn requires_the_session_id() {
        assert!(error_paths(&SESSION_RECORD, doc! {}).contains(&"sessionId".to_string()));
    }

    #[test]
    fn defaults_the_boolean_flags_rather_than_requiring_them() {
        let document: Document = built(&SESSION_RECORD, doc! { "sessionId": "s", "createdAt": DateTime::now() });
        assert_eq!(document.get("webView"), Some(&Bson::Boolean(false)));
        assert_eq!(document.get("iFrame"), Some(&Bson::Boolean(false)));
        assert_eq!(document.get("decryptedHeadHash"), Some(&Bson::String(String::new())));
    }

    #[test]
    fn constrains_the_session_id_to_be_unique() {
        assert!(index_options(&SESSION_RECORD, "sessionId").expect("an index").unique);
    }

    #[test]
    fn keeps_the_analytics_indexes_sparse() {
        for field in ["isEscalation", "isProtect", "ruleHash"] {
            assert!(index_options(&SESSION_RECORD, field).expect(field).sparse, "{field}");
        }
    }
}

mod user_settings_schema {
    use super::*;

    fn settings(input: Document) -> Document {
        built(&USER_SETTINGS, input)
    }

    fn settings_errors(input: Document) -> Vec<String> {
        error_paths(&USER_SETTINGS, input)
    }

    #[test]
    fn applies_the_shared_defaults_when_nothing_is_supplied() {
        let document: Document = settings(doc! {});
        assert_eq!(document.get_str("captchaType").ok(), Some(CAPTCHA_TYPE_DEFAULT.as_str()));
        assert_eq!(number(&document, "powDifficulty"), Some(POW_DIFFICULTY_DEFAULT));
        assert_eq!(document.get_array("domains").map(Vec::len).ok(), Some(0));
    }

    #[test]
    fn keeps_allow_agents_asset_origin_and_client_url_on_write() {
        let document: Document = settings(doc! {
            "allowAgents": true,
            "assetOrigin": "https://example.com",
            "clientUrl": "/robots.txt",
        });
        assert_eq!(document.get_bool("allowAgents").ok(), Some(true));
        assert_eq!(document.get_str("assetOrigin").ok(), Some("https://example.com"));
        assert_eq!(document.get_str("clientUrl").ok(), Some("/robots.txt"));
    }

    #[test]
    fn rejects_a_captcha_type_outside_the_enum() {
        assert_eq!(settings_errors(doc! { "captchaType": "sudoku" }), ["captchaType"]);
        assert!(settings_errors(doc! { "captchaType": CaptchaType::Pow.as_str() }).is_empty());
    }

    #[test]
    fn leaves_every_traffic_filter_category_unconfigured_by_default() {
        let document: Document = settings(doc! {});
        for category in ["vpn", "tor", "abuser"] {
            assert!(sub(&document, &format!("trafficFilter.{category}")).is_none(), "{category}");
        }
        assert_eq!(sub(&document, "trafficFilter.skipExtrasOnValidDnsPath"), Some(&Bson::Boolean(true)));
    }

    #[test]
    fn bounds_the_abuser_score_threshold_to_the_unit_interval() {
        assert_eq!(
            settings_errors(doc! { "trafficFilter": { "abuserScoreThreshold": 1.5 } }),
            ["trafficFilter.abuserScoreThreshold"]
        );
        assert_eq!(
            settings_errors(doc! { "trafficFilter": { "abuserScoreThreshold": -0.1 } }),
            ["trafficFilter.abuserScoreThreshold"]
        );
        assert!(settings_errors(doc! { "trafficFilter": { "abuserScoreThreshold": 1 } }).is_empty());
    }

    #[test]
    fn rejects_a_negative_auto_ban_threshold() {
        assert_eq!(settings_errors(doc! { "autoBanScoreThreshold": -1 }), ["autoBanScoreThreshold"]);
    }

    #[test]
    fn defaults_the_honeypot_to_a_disabled_morse_challenge() {
        let document: Document = settings(doc! {});
        assert_eq!(sub(&document, "honeypot.enabled"), Some(&Bson::Boolean(false)));
        assert_eq!(sub(&document, "honeypot.encodingType"), Some(&Bson::from("morse")));
    }

    #[test]
    fn allows_only_the_two_honeypot_encodings() {
        assert_eq!(
            settings_errors(doc! { "honeypot": { "encodingType": "braille" } }),
            ["honeypot.encodingType"]
        );
        assert!(settings_errors(doc! { "honeypot": { "encodingType": "semaphore" } }).is_empty());
    }

    #[test]
    fn defaults_the_spam_filter_and_its_email_rules_to_off() {
        let document: Document = settings(doc! {});
        assert_eq!(sub(&document, "spamFilter.enabled"), Some(&Bson::Boolean(false)));
        assert_eq!(sub(&document, "spamFilter.emailRules.enabled"), Some(&Bson::Boolean(false)));
        assert_eq!(sub(&document, "spamFilter.emailRules.customRegexBlocklist"), Some(&Bson::Array(Vec::new())));
    }

    #[test]
    fn leaves_the_ip_validation_rules_unset_unless_configured() {
        assert!(settings(doc! {}).get("ipValidationRules").is_none());
    }

    #[test]
    fn applies_the_ip_validation_defaults_once_the_block_is_present() {
        let document: Document = settings(doc! { "ipValidationRules": {} });
        assert_eq!(sub(&document, "ipValidationRules.enabled"), Some(&Bson::Boolean(false)));
        assert_eq!(sub(&document, "ipValidationRules.forceConsistentIp"), Some(&Bson::Boolean(false)));
        assert!(sub(&document, "ipValidationRules.countryOverrides").is_none());
    }

    #[test]
    fn rejects_a_negative_distance_threshold() {
        assert_eq!(
            settings_errors(doc! { "ipValidationRules": { "distanceThresholdKm": -1 } }),
            ["ipValidationRules.distanceThresholdKm"]
        );
    }

    #[test]
    fn persists_every_puzzle_render_override() {
        let document: Document = settings(doc! {
            "puzzle": {
                "decoyCount": 12,
                "decoyEdgeDarkness": 30,
                "decoyBodyBrightness": -6,
                "decoyHoleDarken": 0.8,
                "holeDarken": 0.4,
                "pieceScale": { "min": 0.2, "max": 0.35 },
            },
        });
        assert_eq!(number(&document, "puzzle.decoyCount"), Some(12.0));
        assert_eq!(number(&document, "puzzle.decoyEdgeDarkness"), Some(30.0));
        assert_eq!(number(&document, "puzzle.decoyBodyBrightness"), Some(-6.0));
        assert_eq!(number(&document, "puzzle.decoyHoleDarken"), Some(0.8));
        assert_eq!(number(&document, "puzzle.holeDarken"), Some(0.4));
        assert_eq!(number(&document, "puzzle.pieceScale.min"), Some(0.2));
        assert_eq!(number(&document, "puzzle.pieceScale.max"), Some(0.35));
    }

    #[test]
    fn persists_the_captcha_type_feature_flags() {
        let document: Document =
            settings(doc! { "captchaTypeFeatureFlags": { "puzzle": false, "iconOrder": true, "audio": true } });
        assert_eq!(sub(&document, "captchaTypeFeatureFlags.puzzle"), Some(&Bson::Boolean(false)));
        assert_eq!(sub(&document, "captchaTypeFeatureFlags.iconOrder"), Some(&Bson::Boolean(true)));
        assert_eq!(sub(&document, "captchaTypeFeatureFlags.audio"), Some(&Bson::Boolean(true)));
    }

    #[test]
    fn leaves_the_captcha_type_feature_flags_unset_unless_configured() {
        assert!(settings(doc! {}).get("captchaTypeFeatureFlags").is_none());
        let document: Document = settings(doc! { "captchaTypeFeatureFlags": {} });
        assert!(sub(&document, "captchaTypeFeatureFlags.puzzle").is_none());
        assert!(sub(&document, "captchaTypeFeatureFlags.iconOrder").is_none());
    }

    #[test]
    fn persists_the_widget_feature_flags() {
        let document: Document = settings(doc! { "widgetFeatureFlags": { "puzzleImageSwitch": true } });
        assert_eq!(sub(&document, "widgetFeatureFlags.puzzleImageSwitch"), Some(&Bson::Boolean(true)));
    }

    #[test]
    fn leaves_the_widget_feature_flags_unset_unless_configured() {
        assert!(settings(doc! {}).get("widgetFeatureFlags").is_none());
        let document: Document = settings(doc! { "widgetFeatureFlags": {} });
        assert!(sub(&document, "widgetFeatureFlags.puzzleImageSwitch").is_none());
    }

    #[test]
    fn leaves_the_puzzle_overrides_unset_unless_configured() {
        assert!(settings(doc! {}).get("puzzle").is_none());
    }

    #[test]
    fn persists_a_partial_puzzle_override_without_filling_in_the_rest() {
        let document: Document = settings(doc! { "puzzle": { "decoyCount": 0 } });
        assert_eq!(number(&document, "puzzle.decoyCount"), Some(0.0));
        assert!(sub(&document, "puzzle.holeDarken").is_none());
        assert!(sub(&document, "puzzle.pieceScale").is_none());
    }

    #[test]
    fn persists_puzzle_overrides_on_a_traffic_filter_category() {
        let document: Document = settings(doc! {
            "trafficFilter": {
                "vpn": {
                    "action": TrafficFilterAction::Challenge.as_str(),
                    "captchaType": CaptchaType::Puzzle.as_str(),
                    "puzzleTolerance": 8,
                    "puzzle": { "decoyCount": 40, "pieceScale": { "min": 0.1, "max": 0.2 } },
                },
            },
        });
        assert_eq!(number(&document, "trafficFilter.vpn.puzzleTolerance"), Some(8.0));
        assert_eq!(number(&document, "trafficFilter.vpn.puzzle.decoyCount"), Some(40.0));
        assert_eq!(number(&document, "trafficFilter.vpn.puzzle.pieceScale.max"), Some(0.2));
    }

    #[test]
    fn persists_the_tarpit_pad_bytes_on_a_challenge_category() {
        let document: Document = settings(doc! {
            "trafficFilter": {
                "proxy": {
                    "action": TrafficFilterAction::Challenge.as_str(),
                    "captchaType": CaptchaType::Pow.as_str(),
                    "powDifficulty": 9,
                    "padBytes": 2048,
                },
            },
        });
        assert_eq!(number(&document, "trafficFilter.proxy.padBytes"), Some(2048.0));
    }

    #[test]
    fn persists_the_tarpit_pad_bytes_on_a_blocked_category() {
        let document: Document = settings(doc! {
            "trafficFilter": { "proxy": { "action": TrafficFilterAction::Block.as_str(), "padBytes": 1_048_576 } },
        });
        assert_eq!(number(&document, "trafficFilter.proxy.padBytes"), Some(1_048_576.0));
    }

    #[test]
    fn rejects_a_pad_bytes_above_the_5_mib_cap() {
        assert_eq!(
            settings_errors(doc! {
                "trafficFilter": { "proxy": { "action": TrafficFilterAction::Block.as_str(), "padBytes": MAX_PAD_BYTES + 1.0 } },
            }),
            ["trafficFilter.proxy.padBytes"]
        );
        assert_eq!(
            settings_errors(doc! {
                "trafficFilter": { "proxy": { "action": TrafficFilterAction::Block.as_str(), "padBytes": -1 } },
            }),
            ["trafficFilter.proxy.padBytes"]
        );
    }
}

mod user_data_schema {
    use super::*;

    #[test]
    fn requires_nothing_so_partial_signups_can_be_persisted() {
        assert!(error_paths(&USER_DATA, doc! {}).is_empty());
    }

    #[test]
    fn nests_the_user_settings_and_applies_their_defaults() {
        let document: Document = built(&USER_DATA, doc! { "settings": {} });
        assert_eq!(sub(&document, "settings.captchaType"), Some(&Bson::from(CAPTCHA_TYPE_DEFAULT.as_str())));
    }
}

mod the_stored_event_schemas {
    use super::*;

    #[test]
    fn reuse_the_session_schema_verbatim() {
        assert!(std::ptr::eq::<Schema>(&*STORED_SESSION_RECORD, &*SESSION_RECORD));
    }

    #[test]
    fn index_the_session_id_on_every_stored_captcha_type() {
        for schema in [&STORED_USER_COMMITMENT_RECORD, &STORED_POW_CAPTCHA_RECORD, &STORED_PUZZLE_CAPTCHA_RECORD] {
            assert!(has_index_on(schema, "sessionId"));
        }
    }

    #[test]
    fn are_copies_so_indexing_them_does_not_touch_the_provider_schemas() {
        assert!(!std::ptr::eq::<Schema>(&*STORED_POW_CAPTCHA_RECORD, &*POW_CAPTCHA_RECORD));
        assert!(!has_index_on(&POW_CAPTCHA_RECORD, "sessionId"));
    }
}

mod the_puzzle_render_record {
    use super::*;

    fn render() -> Document {
        doc! {
            "level": 2,
            "pieceSize": 47,
            "geometry": { "width": 300, "height": 200, "notchSize": 44 },
            "settings": {
                "decoyCount": 7,
                "decoyEdgeDarkness": 31,
                "decoyBodyBrightness": 4,
                "holeDarken": 0.55,
                "decoyHoleDarken": 0.71,
            },
            "backgroundSeed": "00112233445566778899aabbccddeeff",
            "renderSeed": "ffeeddccbbaa99887766554433221100",
        }
    }

    #[test]
    fn survives_a_strict_mode_write_on_both_the_provider_and_stored_schemas() {
        for schema in [&PUZZLE_CAPTCHA_RECORD, &STORED_PUZZLE_CAPTCHA_RECORD] {
            let document: Document = built(schema, doc! { "render": render() });
            assert_eq!(document.get_document("render").ok(), Some(&render()));
        }
    }

    #[test]
    fn is_optional_so_records_written_before_it_existed_still_validate() {
        let (document, issues) = build(&PUZZLE_CAPTCHA_RECORD, &doc! {}, &mut FreshIds);
        assert!(document.get("render").is_none());
        assert!(!issues.iter().any(|issue| issue.path == "render"));
    }

    #[test]
    fn keeps_puzzle_level_on_the_session_schema_and_its_projection() {
        let document: Document = built(&SESSION_RECORD, doc! { "puzzleLevel": 3 });
        assert_eq!(number(&document, "puzzleLevel"), Some(3.0));
        assert!(crate::projection::SESSION_PROJECTION_FIELDS.contains(&"puzzleLevel"));
    }
}

mod rust_only {
    use super::*;

    #[test]
    fn js_number_keeps_negative_zero_a_double_in_bson_and_zero_in_json() {
        let negative_zero = |document: &Document| matches!(document.get("n"), Some(Bson::Double(value)) if value.is_sign_negative());
        let raw: Document =
            Document::try_from(bson::serialize_to_raw_document_buf(&doc_with(JsNumber(-0.0))).expect("serialises"))
                .expect("a document");
        assert!(negative_zero(&raw), "the driver's path");
        assert!(negative_zero(&crate::number::to_bson_document(&doc_with(JsNumber(-0.0))).expect("serialises")));
        let human_readable: Document = bson::serialize_to_document(&doc_with(JsNumber(-0.0))).expect("serialises");
        assert_eq!(human_readable.get("n"), Some(&Bson::Int32(0)), "why to_bson_document exists");
        assert_eq!(serde_json::to_string(&doc_with(JsNumber(-0.0))).expect("json"), r#"{"n":0}"#);
        assert_eq!(serde_json::to_string(&doc_with(JsNumber(2.5))).expect("json"), r#"{"n":2.5}"#);
    }

    #[derive(serde::Serialize)]
    struct Holder {
        n: JsNumber,
    }

    fn doc_with(n: JsNumber) -> Holder {
        Holder { n }
    }

    #[test]
    fn create_refuses_an_invalid_document_with_every_issue() {
        let error = create(&BANNED_DOMAIN_RECORD, &doc! {}, &mut FreshIds).expect_err("refused");
        assert_eq!(error.issues, [Issue { path: "domain".into(), kind: "required".into() }]);
    }

    #[test]
    fn stored_moves_the_id_to_the_front() {
        let sent: Document = create(&BANNED_DOMAIN_RECORD, &doc! { "domain": "a.example" }, &mut FreshIds).expect("valid");
        assert_eq!(sent.keys().collect::<Vec<&String>>(), ["domain", "_id", "__v"]);
        assert_eq!(stored(sent).keys().collect::<Vec<&String>>(), ["_id", "domain", "__v"]);
    }
}

/// mongoose 9.10's update validators (`findOneAndUpdate` with `runValidators`) on this schema
/// refuse these updates at these paths, and let `$inc` past a minimum through.
#[test]
fn update_validators_check_the_paths_an_update_sets_or_unsets() {
    use crate::schema::{array, date, field, nested, number, string, subdocument, Kind};
    use crate::update::validate_update;
    use std::sync::LazyLock;
    static AT: LazyLock<Schema> = LazyLock::new(|| Schema::new(vec![field("at", date().required())]).without_id());
    let schema: Schema = Schema::new(vec![
        field("name", string().required()),
        field("kind", string().one_of(["a", "b"])),
        field("count", number().min(0.0)),
        field("tags", array(Kind::String).one_of(["x", "y"])),
        nested("nested", vec![field("level", string().one_of(["low", "high"]))]),
        field("sub", subdocument(&AT)),
    ]);
    let refused = |update: Document| -> Vec<String> {
        validate_update(&schema, &update)
            .err()
            .map(|error| error.issues.into_iter().map(|issue| issue.path).collect())
            .unwrap_or_default()
    };
    assert_eq!(refused(doc! { "$unset": { "name": 1 } }), ["name"]);
    assert_eq!(refused(doc! { "$set": { "kind": "c" } }), ["kind"]);
    assert_eq!(refused(doc! { "$setOnInsert": { "kind": "c" } }), ["kind"]);
    assert!(refused(doc! { "$inc": { "count": -5 } }).is_empty());
    assert_eq!(refused(doc! { "$set": { "count": -5 } }), ["count"]);
    assert_eq!(refused(doc! { "$set": { "nested": { "level": "mid" } } }), ["nested.level"]);
    assert_eq!(refused(doc! { "$set": { "nested.level": "mid" } }), ["nested.level"]);
    assert_eq!(refused(doc! { "$set": { "tags": ["x", "z"] } }), ["tags.1"]);
    assert_eq!(refused(doc! { "$set": { "name": "" } }), ["name"]);
    assert_eq!(refused(doc! { "$set": { "sub": {} } }), ["sub.at"]);
    assert!(refused(doc! { "$set": { "name": "n", "kind": "a", "count": 0 } }).is_empty());
}

/// `{ minimize: false }` keeps an empty object on save and in `toObject()`.
#[test]
fn a_schema_without_minimize_keeps_empty_objects() {
    use crate::document::to_object;
    use crate::schema::{field, mixed};
    let schema: Schema = Schema::new(vec![field("parameters", mixed())]).without_minimize();
    let sent: Document = create(&schema, &doc! { "parameters": {} }, &mut FreshIds).expect("valid");
    assert_eq!(sent.get_document("parameters").ok(), Some(&Document::new()));
    assert_eq!(to_object(&schema, doc! { "parameters": {} }), doc! { "parameters": {} });
    let minimizing: Schema = Schema::new(vec![field("parameters", mixed())]);
    assert_eq!(to_object(&minimizing, doc! { "parameters": {} }), Document::new());
}

/// mongoose 9.10's `_castUpdate` of `$addToSet` and `$push` on arrays of primitives.
#[test]
fn array_additions_cast_each_value_as_an_element() {
    use crate::schema::{array, field, Kind};
    use crate::update::{cast_update, UpdateMethod};
    let schema: Schema = Schema::new(vec![field("tags", array(Kind::String)), field("n", array(Kind::Number))]);
    let cast = |update: Document| cast_update(&schema, UpdateMethod::FindOneAndUpdate, &update, &Document::new(), false, &mut FreshIds);
    assert_eq!(cast(doc! { "$addToSet": { "tags": "x" } }).ok(), Some(doc! { "$addToSet": { "tags": "x" } }));
    assert_eq!(
        cast(doc! { "$addToSet": { "tags": { "$each": ["x", 1] } } }).ok(),
        Some(doc! { "$addToSet": { "tags": { "$each": ["x", "1"] } } })
    );
    assert_eq!(
        cast(doc! { "$addToSet": { "tags": { "$each": [] } } }).ok(),
        Some(doc! { "$addToSet": { "tags": { "$each": [] } } })
    );
    assert_eq!(
        cast(doc! { "$push": { "n": { "$each": ["1", 2], "$slice": -2, "$position": 0 } } }).ok(),
        Some(doc! { "$push": { "n": { "$each": [1, 2], "$slice": -2, "$position": 0 } } })
    );
    assert_eq!(cast(doc! { "$push": { "n": "3" } }).ok(), Some(doc! { "$push": { "n": 3 } }));
    let refused: Vec<String> = cast(doc! { "$addToSet": { "n": { "$each": ["nope"] } } })
        .err()
        .map(|error| error.issues.into_iter().map(|issue| issue.path).collect())
        .unwrap_or_default();
    assert_eq!(refused, ["n.0"]);
}

/// mongoose 9.10's `Model.find(filter)` puts `$and`, then `$or`, before every other key, and
/// leaves `$nor` and the other operators where they were.
#[test]
fn a_filter_has_its_and_then_its_or_first() {
    use crate::schema::{field, number, string};
    use crate::update::cast_filter;
    let schema: Schema = Schema::new(vec![field("a", number()), field("b", string()), field("c", number())]);
    let keys = |filter: Document| -> Vec<String> {
        cast_filter(&schema, &filter, false, &mut FreshIds)
            .expect("casts")
            .keys()
            .cloned()
            .collect()
    };
    assert_eq!(keys(doc! { "a": 1, "$or": [{ "b": "x" }, { "c": 2 }] }), ["$or", "a"]);
    assert_eq!(keys(doc! { "a": 1, "$and": [{ "b": "x" }], "c": 3 }), ["$and", "a", "c"]);
    assert_eq!(keys(doc! { "a": 1, "$nor": [{ "b": "x" }], "$or": [{ "c": 1 }], "b": "y" }), ["$or", "a", "$nor", "b"]);
    assert_eq!(keys(doc! { "a": 1, "$or": [{ "c": 1 }], "$and": [{ "b": "x" }], "$nor": [{ "a": 2 }] }), ["$and", "$or", "a", "$nor"]);
    assert_eq!(keys(doc! { "a": 1, "$expr": { "$gt": ["$a", 1] }, "b": "y" }), ["a", "$expr", "b"]);
}
