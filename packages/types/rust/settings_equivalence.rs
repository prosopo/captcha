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

//! Replays rust/equivalence/settings-vectors.json, written by generate-settings.ts from the
//! TS under Node 24 (the production runtime, whose regex syntax differs from Node 22's).

use crate::decision_machine::routing_machine_output_schema;
use crate::settings::*;
use crate::settings_types::UserSettings;
use crate::CaptchaType;
use prosopo_api_route::schema::{Data, Schema};
use serde::Deserialize;
use serde_json::{json, Map, Value};
use std::collections::BTreeMap;
use std::str::FromStr;

const VECTORS: &str = include_str!("equivalence/settings-vectors.json");

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Vectors {
    regex_fuzz: Vec<(String, bool)>,
    schemas: Vec<String>,
    schema_vectors: Vec<SchemaVector>,
    regex_validity: Vec<RegexCase>,
    user_agents: Vec<UserAgentCase>,
    undefined_user_agent: String,
    frictionless_types: Vec<Resolved>,
    feature_enabled: Vec<FeatureCase>,
    allowed_types: Vec<AllowedCase>,
    widget_feature: Vec<WidgetCase>,
    thresholds: Vec<Resolved>,
    image_rounds: Vec<RoundsCase>,
    defaults: Map<String, Value>,
    object_defaults: Map<String, Value>,
    enums: BTreeMap<String, Vec<(String, String)>>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Input {
    #[serde(default, deserialize_with = "present")]
    value: Option<Value>,
}

fn present<'de, D: serde::Deserializer<'de>>(deserializer: D) -> Result<Option<Value>, D::Error> {
    Value::deserialize(deserializer).map(Some)
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum Expected {
    Ok {
        ok: Value,
    },
    OkUndefined {
        #[serde(rename = "okUndefined")]
        _ok_undefined: bool,
    },
    Issues {
        issues: Value,
    },
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct SchemaVector {
    schema: String,
    input: Input,
    result: Expected,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct RegexCase {
    pattern: String,
    valid: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct UserAgentCase {
    user_agent: String,
    device_type: String,
    browser: String,
    webview: String,
}

/// `"undefined"` stands for an absent argument.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Resolved {
    configured: Value,
    resolved: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct FeatureCase {
    captcha_type: String,
    flags: Value,
    enabled: bool,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct AllowedCase {
    settings: Value,
    resolved: Value,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct WidgetCase {
    flags: Value,
    enabled: bool,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct RoundsCase {
    bounds: Map<String, Value>,
    requested: Value,
    resolved: Value,
    clamped: Value,
}

fn vectors() -> Vectors {
    serde_json::from_str(VECTORS).expect("settings-vectors.json parses")
}

fn argument(value: &Value) -> Option<&Value> {
    match value {
        Value::String(text) if text == "undefined" => None,
        other => Some(other),
    }
}

fn same_json(a: &Value, b: &Value) -> bool {
    match (a, b) {
        (Value::Number(a), Value::Number(b)) => a.as_f64() == b.as_f64(),
        (Value::Array(a), Value::Array(b)) => {
            a.len() == b.len() && a.iter().zip(b).all(|(a, b)| same_json(a, b))
        }
        (Value::Object(a), Value::Object(b)) => {
            a.len() == b.len()
                && a.iter()
                    .zip(b.iter())
                    .all(|((ka, va), (kb, vb))| ka == kb && same_json(va, vb))
        }
        (a, b) => a == b,
    }
}

fn schemas() -> BTreeMap<&'static str, Schema> {
    BTreeMap::from([
        ("clientSettings", client_settings_schema()),
        ("frictionlessThreshold", frictionless_threshold_schema()),
        ("frictionlessTypes", frictionless_types_schema()),
        (
            "captchaTypeFeatureFlags",
            captcha_type_feature_flags_schema(),
        ),
        ("widgetFeatureFlags", widget_feature_flags_schema()),
        ("audioSettings", audio_settings_schema()),
        ("puzzlePieceScale", puzzle_piece_scale_schema()),
        ("puzzleSettings", puzzle_settings_schema()),
        ("iconOrderSettings", icon_order_settings_schema()),
        ("ipValidationRules", ip_validation_rules_schema()),
        ("emailSpamRules", email_spam_rules_schema()),
        ("spamFilterRules", spam_filter_rules_schema()),
        ("trafficCategoryPolicy", traffic_category_policy_schema()),
        ("trafficFilter", traffic_filter_schema()),
        ("honeypotSettings", honeypot_settings_schema()),
        ("routingMachineOutput", routing_machine_output_schema()),
    ])
}

#[test]
fn schemas_match_the_ts() {
    let vectors: Vectors = vectors();
    let schemas: BTreeMap<&'static str, Schema> = schemas();
    let mut recorded: Vec<&str> = vectors.schemas.iter().map(String::as_str).collect();
    recorded.sort_unstable();
    assert_eq!(recorded, schemas.keys().copied().collect::<Vec<&str>>());
    let mut failures: Vec<String> = Vec::new();
    let mut typed: usize = 0;
    let mut valid_settings: usize = 0;
    for vector in &vectors.schema_vectors {
        let actual: Result<Data, Vec<Map<String, Value>>> =
            schemas[vector.schema.as_str()].safe_parse(vector.input.value.as_ref());
        let matches: bool = match (&actual, &vector.result) {
            (Ok(Some(value)), Expected::Ok { ok }) => same_json(value, ok),
            (Ok(None), Expected::OkUndefined { .. }) => true,
            (Err(issues), Expected::Issues { issues: expected }) => same_json(
                &Value::Array(issues.iter().cloned().map(Value::Object).collect()),
                expected,
            ),
            _ => false,
        };
        if !matches {
            failures.push(format!(
                "{} {}: got {}, TS gave {}",
                vector.schema,
                vector
                    .input
                    .value
                    .as_ref()
                    .map_or("undefined".to_string(), |v| v
                        .to_string()
                        .chars()
                        .take(160)
                        .collect()),
                match &actual {
                    Ok(value) => format!(
                        "ok {}",
                        value.as_ref().map_or(String::new(), Value::to_string)
                    ),
                    Err(issues) => serde_json::to_string(issues).unwrap_or_default(),
                },
                serde_json::to_string(&match &vector.result {
                    Expected::Ok { ok } => ok.clone(),
                    Expected::Issues { issues } => issues.clone(),
                    Expected::OkUndefined { .. } => Value::Null,
                })
                .unwrap_or_default()
            ));
            continue;
        }
        if let (Ok(Some(value)), "clientSettings") = (&actual, vector.schema.as_str()) {
            valid_settings += 1;
            let settings: UserSettings =
                serde_json::from_value(value.clone()).expect("parsed settings type");
            let reserialised: Value = serde_json::to_value(&settings).expect("serialises");
            assert!(same_json(&reserialised, value), "typed round trip: {value}");
            typed += 1;
        }
    }
    assert!(
        failures.is_empty(),
        "{} differ:\n{}",
        failures.len(),
        failures.join("\n")
    );
    assert_eq!(typed, valid_settings);
    assert!(
        valid_settings > 50,
        "only {valid_settings} valid settings vectors"
    );
}

#[test]
fn js_regex_validity_matches_node_24() {
    let vectors: Vectors = vectors();
    let failures: Vec<String> = vectors
        .regex_validity
        .iter()
        .filter(|case| is_valid_js_regex(&case.pattern) != case.valid)
        .map(|case| format!("{:?}: Node says {}", case.pattern, case.valid))
        .collect();
    assert!(
        failures.is_empty(),
        "{} differ:\n{}",
        failures.len(),
        failures.join("\n")
    );
}

/// 6,000 seeded random patterns built from the tokens the grammar treats specially.
#[test]
fn js_regex_validity_matches_node_24_on_random_patterns() {
    let vectors: Vectors = vectors();
    let failures: Vec<String> = vectors
        .regex_fuzz
        .iter()
        .filter(|(pattern, valid)| is_valid_js_regex(pattern) != *valid)
        .map(|(pattern, valid)| format!("{pattern:?}: Node says {valid}"))
        .collect();
    assert!(
        failures.is_empty(),
        "{} of {} differ:\n{}",
        failures.len(),
        vectors.regex_fuzz.len(),
        failures.join("\n")
    );
}

#[test]
fn user_agents_bucket_like_the_ts() {
    let vectors: Vectors = vectors();
    let mut failures: Vec<String> = Vec::new();
    for case in &vectors.user_agents {
        let actual: (DeviceType, ContextType, ContextType) = (
            device_type_from_user_agent(Some(&case.user_agent)),
            context_type_from_session(Some(&case.user_agent), false),
            context_type_from_session(Some(&case.user_agent), true),
        );
        let expected: (&str, &str, &str) = (&case.device_type, &case.browser, &case.webview);
        if (actual.0.as_str(), actual.1.as_str(), actual.2.as_str()) != expected {
            failures.push(format!(
                "{:?}: got {actual:?}, TS gave {expected:?}",
                case.user_agent
            ));
        }
    }
    assert!(
        failures.is_empty(),
        "{} differ:\n{}",
        failures.len(),
        failures.join("\n")
    );
    assert_eq!(
        device_type_from_user_agent(None).as_str(),
        vectors.undefined_user_agent
    );
}

fn allowed_json(types: AllowedTypes) -> Value {
    json!({ "image": types.image, "puzzle": types.puzzle, "iconOrder": types.icon_order })
}

#[test]
fn resolvers_match_the_ts() {
    let vectors: Vectors = vectors();
    for case in &vectors.frictionless_types {
        let actual: Value = allowed_json(resolve_frictionless_types(argument(&case.configured)));
        assert_eq!(actual, case.resolved, "{:?}", case.configured);
    }
    for case in &vectors.feature_enabled {
        let captcha_type: CaptchaType = CaptchaType::from_str(&case.captcha_type).expect("type");
        assert_eq!(
            is_captcha_type_feature_enabled(captcha_type, argument(&case.flags)),
            case.enabled,
            "{case:?}"
        );
    }
    for case in &vectors.allowed_types {
        let actual: Value = allowed_json(resolve_allowed_captcha_types(Some(&case.settings)));
        assert_eq!(actual, case.resolved, "{:?}", case.settings);
    }
    for case in &vectors.widget_feature {
        assert_eq!(
            is_puzzle_image_switch_enabled(argument(&case.flags)),
            case.enabled,
            "{case:?}"
        );
    }
    for case in &vectors.thresholds {
        let ladder: FrictionlessLadder = resolve_frictionless_threshold(argument(&case.configured));
        let actual: Value = json!({
            "frictionlessPuzzleThreshold": ladder.puzzle,
            "frictionlessImageThreshold": ladder.image,
        });
        assert!(
            same_json(&actual, &case.resolved),
            "{:?}: {actual}",
            case.configured
        );
    }
    for case in &vectors.image_rounds {
        let min: Option<f64> = case.bounds.get("imageMinRounds").and_then(Value::as_f64);
        let max: Option<f64> = case.bounds.get("imageMaxRounds").and_then(Value::as_f64);
        let requested: f64 = match &case.requested {
            Value::String(text) if text == "NaN" => f64::NAN,
            Value::String(text) if text == "Infinity" => f64::INFINITY,
            Value::String(text) if text == "-Infinity" => f64::NEG_INFINITY,
            other => other.as_f64().expect("number"),
        };
        let bounds: ImageRounds = resolve_image_rounds_bounds(min, max);
        assert!(
            same_json(
                &json!({ "min": bounds.min, "max": bounds.max }),
                &case.resolved
            ),
            "{case:?}"
        );
        let clamped: f64 = clamp_image_rounds(requested, min, max);
        assert!(
            same_json(&json!(clamped), &case.clamped),
            "{case:?}: {clamped}"
        );
    }
}

#[test]
fn defaults_and_enums_match_the_ts() {
    let vectors: Vectors = vectors();
    let rust: Vec<(&str, Value)> = vec![
        (
            "ICON_ORDER_GLYPH_VOCABULARY",
            json!(ICON_ORDER_GLYPH_VOCABULARY),
        ),
        ("MAX_PAD_BYTES", json!(MAX_PAD_BYTES)),
        (
            "abuseScoreThresholdDefault",
            json!(ABUSE_SCORE_THRESHOLD_DEFAULT),
        ),
        (
            "abuseScoreThresholdExceedActionDefault",
            json!(ABUSE_SCORE_THRESHOLD_EXCEED_ACTION_DEFAULT.as_str()),
        ),
        ("audioBabbleGainDefault", json!(AUDIO_BABBLE_GAIN_DEFAULT)),
        (
            "audioBabbleVoicesDefault",
            json!(AUDIO_BABBLE_VOICES_DEFAULT),
        ),
        ("audioDigitCountDefault", json!(AUDIO_DIGIT_COUNT_DEFAULT)),
        ("audioGapMsDefault", json!(AUDIO_GAP_MS_DEFAULT)),
        ("audioNoiseSnrDbDefault", json!(AUDIO_NOISE_SNR_DB_DEFAULT)),
        ("audioReverbMixDefault", json!(AUDIO_REVERB_MIX_DEFAULT)),
        ("captchaTypeDefault", json!(CAPTCHA_TYPE_DEFAULT.as_str())),
        (
            "cityChangeActionDefault",
            json!(CITY_CHANGE_ACTION_DEFAULT.as_str()),
        ),
        (
            "countryChangeActionDefault",
            json!(COUNTRY_CHANGE_ACTION_DEFAULT.as_str()),
        ),
        (
            "distanceExceedActionDefault",
            json!(DISTANCE_EXCEED_ACTION_DEFAULT.as_str()),
        ),
        (
            "distanceThresholdKmDefault",
            json!(DISTANCE_THRESHOLD_KM_DEFAULT),
        ),
        (
            "frictionlessImageThresholdDefault",
            json!(FRICTIONLESS_IMAGE_THRESHOLD_DEFAULT),
        ),
        (
            "frictionlessPuzzleThresholdDefault",
            json!(FRICTIONLESS_PUZZLE_THRESHOLD_DEFAULT),
        ),
        (
            "honeypotEncodingTypeDefault",
            json!(HONEYPOT_ENCODING_TYPE_DEFAULT.as_str()),
        ),
        (
            "iconOrderDecoyCountDefault",
            json!(ICON_ORDER_DECOY_COUNT_DEFAULT),
        ),
        (
            "iconOrderTargetCountDefault",
            json!(ICON_ORDER_TARGET_COUNT_DEFAULT),
        ),
        (
            "iconOrderToleranceDefault",
            json!(ICON_ORDER_TOLERANCE_DEFAULT),
        ),
        ("imageMaxRoundsDefault", json!(IMAGE_MAX_ROUNDS_DEFAULT)),
        ("imageMinRoundsDefault", json!(IMAGE_MIN_ROUNDS_DEFAULT)),
        ("imageThresholdDefault", json!(IMAGE_THRESHOLD_DEFAULT)),
        (
            "ispChangeActionDefault",
            json!(ISP_CHANGE_ACTION_DEFAULT.as_str()),
        ),
        (
            "maxLocalPartDotsDefault",
            json!(MAX_LOCAL_PART_DOTS_DEFAULT),
        ),
        ("powDifficultyDefault", json!(POW_DIFFICULTY_DEFAULT)),
        (
            "puzzleDecoyBodyBrightnessDefault",
            json!(PUZZLE_DECOY_BODY_BRIGHTNESS_DEFAULT),
        ),
        ("puzzleDecoyCountDefault", json!(PUZZLE_DECOY_COUNT_DEFAULT)),
        (
            "puzzleDecoyEdgeDarknessDefault",
            json!(PUZZLE_DECOY_EDGE_DARKNESS_DEFAULT),
        ),
        (
            "puzzleDecoyHoleDarkenDefault",
            json!(PUZZLE_DECOY_HOLE_DARKEN_DEFAULT),
        ),
        ("puzzleHoleDarkenDefault", json!(PUZZLE_HOLE_DARKEN_DEFAULT)),
        (
            "puzzleMaxDifficultyDefault",
            json!(PUZZLE_MAX_DIFFICULTY_DEFAULT),
        ),
        ("puzzleMaxDifficultyMax", json!(PUZZLE_MAX_DIFFICULTY_MAX)),
        (
            "puzzlePieceScaleMaxDefault",
            json!(PUZZLE_PIECE_SCALE_MAX_DEFAULT),
        ),
        (
            "puzzlePieceScaleMinDefault",
            json!(PUZZLE_PIECE_SCALE_MIN_DEFAULT),
        ),
        ("puzzleToleranceDefault", json!(PUZZLE_TOLERANCE_DEFAULT)),
        (
            "requireAllConditionsDefault",
            json!(REQUIRE_ALL_CONDITIONS_DEFAULT),
        ),
        (
            "trafficFilterAbuserScoreThresholdDefault",
            json!(TRAFFIC_FILTER_ABUSER_SCORE_THRESHOLD_DEFAULT),
        ),
    ];
    let recorded: Vec<&str> = vectors.defaults.keys().map(String::as_str).collect();
    assert_eq!(
        recorded,
        rust.iter().map(|(name, _)| *name).collect::<Vec<&str>>()
    );
    for (name, value) in &rust {
        assert!(same_json(value, &vectors.defaults[*name]), "{name}");
    }
    let objects: &Map<String, Value> = &vectors.object_defaults;
    assert!(same_json(
        &frictionless_threshold_default(),
        &objects["frictionlessThresholdDefault"]
    ));
    assert!(same_json(
        &frictionless_types_default(),
        &objects["frictionlessTypesDefault"]
    ));
    let flags: Value = json!({
        "puzzle": is_captcha_type_feature_enabled(CaptchaType::Puzzle, None),
        "iconOrder": is_captcha_type_feature_enabled(CaptchaType::IconOrder, None),
        "audio": is_captcha_type_feature_enabled(CaptchaType::Audio, None),
    });
    assert_eq!(flags, objects["captchaTypeFeatureFlagDefaults"]);
    assert_eq!(
        json!({ "puzzleImageSwitch": is_puzzle_image_switch_enabled(None) }),
        objects["widgetFeatureFlagDefaults"]
    );
    assert_eq!(
        json!(DEVICE_CONTEXT_TYPES.map(ContextType::as_str)),
        objects["deviceContextTypes"]
    );
    assert_eq!(json!([]), objects["domainsDefault"]);

    macro_rules! entries {
        ($name:ty) => {
            <$name>::TS_KEYS
                .iter()
                .zip(<$name>::ALL.map(<$name>::as_str))
                .map(|(key, value)| (key.to_string(), value.to_string()))
                .collect::<Vec<(String, String)>>()
        };
    }
    let enums: BTreeMap<&str, Vec<(String, String)>> = BTreeMap::from([
        ("IPValidationAction", entries!(IPValidationAction)),
        ("DeviceType", entries!(DeviceType)),
        ("ContextType", entries!(ContextType)),
        ("TrafficFilterAction", entries!(TrafficFilterAction)),
        ("EncodingType", entries!(EncodingType)),
    ]);
    for (name, ts) in &vectors.enums {
        assert_eq!(&enums[name.as_str()], ts, "{name}");
    }
}
