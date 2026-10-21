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

//! client/settings.ts: a site's settings. `ClientSettingsSchema.parse` output is stored on
//! the client record, so its defaults and key order are byte-identical to the TS.

use crate::captcha_type::{selectable_captcha_type_schema, CaptchaType};
use crate::number::js_math_round;
use crate::timeouts::{DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT, DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT};
use crate::wire_enum::wire_enum;
use prosopo_api_route::schema::{
    array, boolean, number, object, preprocess, record, string, Data, IssueData, Schema,
};
use serde_json::{json, Value};
use std::sync::LazyLock;

pub const CAPTCHA_TYPE_DEFAULT: CaptchaType = CaptchaType::Frictionless;
/// The lower rung of the score ladder: at or below it a session passes silently to PoW.
pub const FRICTIONLESS_PUZZLE_THRESHOLD_DEFAULT: f64 = 0.5;
/// The upper rung: at or above it the user gets an image captcha. Allowed above 1, since the
/// score it is compared with has server-side penalties added to it.
pub const FRICTIONLESS_IMAGE_THRESHOLD_DEFAULT: f64 = 1.0;
pub const POW_DIFFICULTY_DEFAULT: f64 = 4.0;
pub const IMAGE_THRESHOLD_DEFAULT: f64 = 0.8;
pub const IMAGE_MAX_ROUNDS_DEFAULT: f64 = 32.0;
pub const IMAGE_MIN_ROUNDS_DEFAULT: f64 = 2.0;
pub const PUZZLE_TOLERANCE_DEFAULT: f64 = 15.0;
/// Matches `MAX_AUTO_ESCALATION_LEVEL` in captcha-severity; the maximum matches its ladder.
pub const PUZZLE_MAX_DIFFICULTY_DEFAULT: f64 = 3.0;
pub const PUZZLE_MAX_DIFFICULTY_MAX: f64 = 4.0;
pub const PUZZLE_DECOY_COUNT_DEFAULT: f64 = 5.0;
pub const PUZZLE_DECOY_EDGE_DARKNESS_DEFAULT: f64 = 20.0;
pub const PUZZLE_DECOY_BODY_BRIGHTNESS_DEFAULT: f64 = 4.0;
pub const PUZZLE_HOLE_DARKEN_DEFAULT: f64 = 0.55;
pub const PUZZLE_DECOY_HOLE_DARKEN_DEFAULT: f64 = 0.7;
pub const PUZZLE_PIECE_SCALE_MIN_DEFAULT: f64 = 0.15;
pub const PUZZLE_PIECE_SCALE_MAX_DEFAULT: f64 = 0.45;
pub const AUDIO_DIGIT_COUNT_DEFAULT: f64 = 5.0;
pub const AUDIO_NOISE_SNR_DB_DEFAULT: f64 = 14.0;
pub const AUDIO_BABBLE_GAIN_DEFAULT: f64 = 0.16;
pub const AUDIO_BABBLE_VOICES_DEFAULT: f64 = 2.0;
pub const AUDIO_REVERB_MIX_DEFAULT: f64 = 0.12;
pub const AUDIO_GAP_MS_DEFAULT: f64 = 220.0;
pub const ICON_ORDER_TARGET_COUNT_DEFAULT: f64 = 3.0;
pub const ICON_ORDER_DECOY_COUNT_DEFAULT: f64 = 4.0;
pub const ICON_ORDER_TOLERANCE_DEFAULT: f64 = 0.75;
pub const ICON_ORDER_GLYPH_VOCABULARY: f64 = 10.0;
pub const MAX_PAD_BYTES: f64 = 5.0 * 1024.0 * 1024.0;
pub const DISTANCE_THRESHOLD_KM_DEFAULT: f64 = 1000.0;
pub const ABUSE_SCORE_THRESHOLD_DEFAULT: f64 = 0.005;
pub const REQUIRE_ALL_CONDITIONS_DEFAULT: bool = false;
pub const MAX_LOCAL_PART_DOTS_DEFAULT: f64 = 2.0;
pub const TRAFFIC_FILTER_ABUSER_SCORE_THRESHOLD_DEFAULT: f64 = 0.2;
const MAX_REGEX_PATTERN_LENGTH: f64 = 256.0;
const MAX_CUSTOM_REGEX_PATTERNS: f64 = 50.0;
const MAX_DATACENTER_ALLOWLIST_ENTRIES: f64 = 50.0;
const MAX_DATACENTER_ALLOWLIST_ENTRY_LENGTH: f64 = 128.0;

fn int(min: f64, max: f64) -> Schema {
    number().int().min(min).max(max)
}

fn range(min: f64, max: f64) -> Schema {
    number().min(min).max(max)
}

pub fn pow_difficulty_field_schema() -> Schema {
    number().positive().min(1.0).max(10.0)
}

pub fn image_threshold_field_schema() -> Schema {
    range(0.0, 1.0)
}

pub fn pad_bytes_field_schema() -> Schema {
    int(0.0, MAX_PAD_BYTES)
}

pub fn image_max_rounds_field_schema() -> Schema {
    number().int().min(2.0)
}

pub fn image_min_rounds_field_schema() -> Schema {
    number().int().min(1.0)
}

pub fn puzzle_tolerance_field_schema() -> Schema {
    int(5.0, 1000.0)
}

pub fn puzzle_max_difficulty_field_schema() -> Schema {
    int(0.0, PUZZLE_MAX_DIFFICULTY_MAX)
}

pub fn icon_order_tolerance_field_schema() -> Schema {
    range(0.1, 12.0)
}

fn number_at(value: &Data, key: &str) -> Option<f64> {
    value.as_ref()?.get(key)?.as_f64()
}

/// JS `a <= b` for two parsed fields; `undefined` compares as false.
fn at_most(a: Option<f64>, b: Option<f64>) -> bool {
    matches!((a, b), (Some(a), Some(b)) if a <= b)
}

fn refine_message(message: &str) -> Option<String> {
    Some(message.to_string())
}

/// `FrictionlessThresholdSchema`: a bare number (the pre-ladder shape) is lifted into the
/// puzzle rung.
pub fn frictionless_threshold_schema() -> Schema {
    preprocess(
        |raw: Data, _ctx| match raw {
            Some(Value::Number(threshold)) => Some(json!({ "frictionlessPuzzleThreshold": threshold })),
            other => other,
        },
        object(vec![
            (
                "frictionlessPuzzleThreshold",
                range(0.0, 1.0).optional().default(FRICTIONLESS_PUZZLE_THRESHOLD_DEFAULT),
            ),
            (
                "frictionlessImageThreshold",
                number().min(0.0).optional().default(FRICTIONLESS_IMAGE_THRESHOLD_DEFAULT),
            ),
        ])
        .refine_with(
            |value: &Data| {
                at_most(
                    number_at(value, "frictionlessPuzzleThreshold"),
                    number_at(value, "frictionlessImageThreshold"),
                )
            },
            |_| {
                IssueData::code("custom")
                    .with(
                        "message",
                        "frictionlessImageThreshold must be >= frictionlessPuzzleThreshold — the image band sits above the puzzle band",
                    )
                    .with("path", json!(["frictionlessImageThreshold"]))
            },
        ),
    )
}

pub fn frictionless_threshold_default() -> Value {
    json!({
        "frictionlessPuzzleThreshold": FRICTIONLESS_PUZZLE_THRESHOLD_DEFAULT,
        "frictionlessImageThreshold": FRICTIONLESS_IMAGE_THRESHOLD_DEFAULT,
    })
}

/// `FrictionlessTypesSchema`: which challenge types the frictionless flow may serve. PoW is
/// always available.
pub fn frictionless_types_schema() -> Schema {
    object(vec![
        ("image", boolean().optional().default(true)),
        ("puzzle", boolean().optional().default(true)),
        ("iconOrder", boolean().optional().default(true)),
    ])
}

pub fn frictionless_types_default() -> Value {
    json!({ "image": true, "puzzle": true, "iconOrder": true })
}

pub fn captcha_type_feature_flags_schema() -> Schema {
    object(vec![
        (CaptchaType::Puzzle.as_str(), boolean().optional()),
        (CaptchaType::IconOrder.as_str(), boolean().optional()),
        (CaptchaType::Audio.as_str(), boolean().optional()),
    ])
}

pub fn widget_feature_flags_schema() -> Schema {
    object(vec![("puzzleImageSwitch", boolean().optional())])
}

pub fn audio_settings_schema() -> Schema {
    object(vec![
        ("digitCount", int(3.0, 8.0).optional()),
        ("noiseSnrDb", range(3.0, 60.0).optional()),
        ("babbleGain", range(0.0, 0.6).optional()),
        ("babbleVoices", int(0.0, 4.0).optional()),
        ("reverbMix", range(0.0, 0.6).optional()),
        ("gapMs", int(0.0, 1500.0).optional()),
    ])
}

fn puzzle_piece_scale_field_schema() -> Schema {
    range(0.05, 0.95)
}

pub fn puzzle_piece_scale_schema() -> Schema {
    object(vec![
        (
            "min",
            puzzle_piece_scale_field_schema()
                .optional()
                .default(PUZZLE_PIECE_SCALE_MIN_DEFAULT),
        ),
        (
            "max",
            puzzle_piece_scale_field_schema()
                .optional()
                .default(PUZZLE_PIECE_SCALE_MAX_DEFAULT),
        ),
    ])
    .refine(
        |value: &Data| at_most(number_at(value, "min"), number_at(value, "max")),
        refine_message("puzzle piece scale min must be <= max"),
    )
}

/// `PuzzleSettingsSchema`: per-render overrides of the puzzle asset defaults.
pub fn puzzle_settings_schema() -> Schema {
    object(vec![
        ("decoyCount", int(0.0, 200.0).optional()),
        ("decoyEdgeDarkness", int(0.0, 40.0).optional()),
        ("decoyBodyBrightness", int(-20.0, 20.0).optional()),
        ("decoyHoleDarken", range(0.0, 1.0).optional()),
        ("holeDarken", range(0.0, 1.0).optional()),
        ("pieceScale", puzzle_piece_scale_schema().optional()),
    ])
}

/// `IconOrderSettingsSchema`: the refine rejects more targets and decoys than there are
/// distinct glyphs, which would otherwise fail every challenge request.
pub fn icon_order_settings_schema() -> Schema {
    object(vec![
        ("targetCount", int(2.0, 6.0).optional()),
        ("decoyCount", int(0.0, ICON_ORDER_GLYPH_VOCABULARY - 2.0).optional()),
        ("strokeWidth", range(1.0, 10.0).optional()),
        ("iconOpacity", range(0.1, 1.0).optional()),
        ("haloOpacity", range(0.0, 1.0).optional()),
        ("backgroundClutter", int(0.0, 40.0).optional()),
    ])
    .refine(
        |value: &Data| {
            let field = |key: &str, default: f64| -> Option<f64> {
                match value.as_ref().and_then(|object| object.get(key)) {
                    None => Some(default),
                    Some(number) => number.as_f64(),
                }
            };
            at_most(
                field("targetCount", ICON_ORDER_TARGET_COUNT_DEFAULT)
                    .zip(field("decoyCount", ICON_ORDER_DECOY_COUNT_DEFAULT))
                    .map(|(targets, decoys)| targets + decoys),
                Some(ICON_ORDER_GLYPH_VOCABULARY),
            )
        },
        refine_message(
            "icon-order targetCount + decoyCount must be <= 10, the number of distinct glyphs available",
        ),
    )
}

wire_enum! {
    pub enum IPValidationAction {
        Allow: "Allow" = "allow",
        Reject: "Reject" = "reject",
        Flag: "Flag" = "flag",
    }
}

pub const COUNTRY_CHANGE_ACTION_DEFAULT: IPValidationAction = IPValidationAction::Allow;
pub const CITY_CHANGE_ACTION_DEFAULT: IPValidationAction = IPValidationAction::Allow;
pub const ISP_CHANGE_ACTION_DEFAULT: IPValidationAction = IPValidationAction::Allow;
pub const DISTANCE_EXCEED_ACTION_DEFAULT: IPValidationAction = IPValidationAction::Reject;
pub const ABUSE_SCORE_THRESHOLD_EXCEED_ACTION_DEFAULT: IPValidationAction =
    IPValidationAction::Reject;

const IP_ACTION_KEYS: [&str; 5] = [
    "countryChangeAction",
    "cityChangeAction",
    "ispChangeAction",
    "distanceExceedAction",
    "abuseScoreExceedAction",
];

/// `IPValidationSchema`, the shape of a per-country override.
fn ip_validation_schema() -> Schema {
    object(vec![
        (
            "actions",
            object(
                IP_ACTION_KEYS
                    .iter()
                    .map(|key| (*key, IPValidationAction::schema().optional()))
                    .collect(),
            )
            .partial(),
        ),
        ("distanceThresholdKm", number().positive().optional()),
        ("abuseScoreThreshold", number().positive().optional()),
        ("requireAllConditions", boolean().optional()),
    ])
}

pub fn ip_validation_rules_schema() -> Schema {
    let defaults: [IPValidationAction; 5] = [
        COUNTRY_CHANGE_ACTION_DEFAULT,
        CITY_CHANGE_ACTION_DEFAULT,
        ISP_CHANGE_ACTION_DEFAULT,
        DISTANCE_EXCEED_ACTION_DEFAULT,
        ABUSE_SCORE_THRESHOLD_EXCEED_ACTION_DEFAULT,
    ];
    object(vec![
        ("enabled", boolean().optional().default(false)),
        (
            "actions",
            object(
                IP_ACTION_KEYS
                    .iter()
                    .zip(defaults)
                    .map(|(key, default)| {
                        (
                            *key,
                            IPValidationAction::schema()
                                .optional()
                                .default(default.as_str()),
                        )
                    })
                    .collect(),
            ),
        ),
        (
            "distanceThresholdKm",
            number()
                .positive()
                .optional()
                .default(DISTANCE_THRESHOLD_KM_DEFAULT),
        ),
        (
            "abuseScoreThreshold",
            number()
                .positive()
                .optional()
                .default(ABUSE_SCORE_THRESHOLD_DEFAULT),
        ),
        (
            "requireAllConditions",
            boolean().optional().default(REQUIRE_ALL_CONDITIONS_DEFAULT),
        ),
        (
            "countryOverrides",
            record(ip_validation_schema()).optional(),
        ),
        ("forceConsistentIp", boolean().optional().default(false)),
    ])
}

wire_enum! {
    /// The device families a context-aware baseline is held per.
    ///
    /// Coarse on purpose. A site's `<head>` differs most between a phone-width
    /// responsive render, a tablet render and a desktop render; finer splits
    /// (vendor, OS version) fracture the sample without changing the DOM.
    pub enum DeviceType {
        Desktop: "Desktop" = "desktop",
        Mobile: "Mobile" = "mobile",
        Tablet: "Tablet" = "tablet",
    }
}

wire_enum! {
    /// Context type — the bucket a session's head hash is averaged into, and the
    /// key a context-aware entropy record is stored under.
    ///
    /// The device family crossed with whether the page is running inside a
    /// webview. Both dimensions move the DOM independently: a phone renders
    /// different markup from a desktop, and an in-app webview injects and
    /// suppresses different things again from the same device's real browser.
    pub enum ContextType {
        Desktop: "Desktop" = "desktop",
        DesktopWebview: "DesktopWebview" = "desktop-webview",
        Mobile: "Mobile" = "mobile",
        MobileWebview: "MobileWebview" = "mobile-webview",
        Tablet: "Tablet" = "tablet",
        TabletWebview: "TabletWebview" = "tablet-webview",
    }
}

/// `deviceContextTypes`.
pub const DEVICE_CONTEXT_TYPES: [ContextType; 6] = ContextType::ALL;

pub fn context_type_for(device_type: DeviceType, web_view: bool) -> ContextType {
    match (device_type, web_view) {
        (DeviceType::Desktop, false) => ContextType::Desktop,
        (DeviceType::Desktop, true) => ContextType::DesktopWebview,
        (DeviceType::Mobile, false) => ContextType::Mobile,
        (DeviceType::Mobile, true) => ContextType::MobileWebview,
        (DeviceType::Tablet, false) => ContextType::Tablet,
        (DeviceType::Tablet, true) => ContextType::TabletWebview,
    }
}

fn js_regex(pattern: &str, flags: &str) -> regress::Regex {
    regress::Regex::with_flags(pattern, flags).expect("a pattern the TS compiles")
}

/// JS regexes, run by regress for the lookahead and JS's case folding.
static TABLET_PATTERN: LazyLock<regress::Regex> = LazyLock::new(|| {
    js_regex(
        r"\b(iPad|Tablet|PlayBook|Silk)\b|Android(?!.*\bMobile\b)",
        "i",
    )
});
static MOBILE_PATTERN: LazyLock<regress::Regex> = LazyLock::new(|| {
    js_regex(
        r"\b(Mobi|Mobile|iPhone|iPod|Windows Phone|IEMobile|BlackBerry|BB10|Opera Mini)\b",
        "i",
    )
});

/// `deviceTypeFromUserAgent`: an absent or unrecognised UA is a desktop. The entropy sweep
/// and the decision machine must bucket sessions identically, so this is pinned to the TS.
pub fn device_type_from_user_agent(user_agent: Option<&str>) -> DeviceType {
    match user_agent {
        None | Some("") => DeviceType::Desktop,
        Some(user_agent) if TABLET_PATTERN.find(user_agent).is_some() => DeviceType::Tablet,
        Some(user_agent) if MOBILE_PATTERN.find(user_agent).is_some() => DeviceType::Mobile,
        Some(_) => DeviceType::Desktop,
    }
}

pub fn context_type_from_session(user_agent: Option<&str>, web_view: bool) -> ContextType {
    context_type_for(device_type_from_user_agent(user_agent), web_view)
}

static DANGEROUS_REGEX_TOKENS: LazyLock<regex::Regex> = LazyLock::new(|| {
    regex::Regex::new(r"(\(\?[<!=])|(\(\?P[<])|(\(\?\{)|(\{[0-9,]{4,})").expect("pattern compiles")
});

pub use crate::js_regex::is_valid_js_regex;

fn safe_regex_pattern() -> Schema {
    string()
        .max(MAX_REGEX_PATTERN_LENGTH)
        .refine(
            |value: &Data| {
                value
                    .as_ref()
                    .and_then(Value::as_str)
                    .is_some_and(is_valid_js_regex)
            },
            refine_message("Invalid regular expression syntax"),
        )
        .refine(
            |value: &Data| {
                value
                    .as_ref()
                    .and_then(Value::as_str)
                    .is_some_and(|raw| !DANGEROUS_REGEX_TOKENS.is_match(raw))
            },
            refine_message(
                "Pattern uses disallowed features (lookahead, lookbehind, or large quantifiers)",
            ),
        )
}

pub fn email_spam_rules_schema() -> Schema {
    object(vec![
        ("enabled", boolean().optional().default(false)),
        ("maxLocalPartDots", number().int().min(0.0).optional()),
        ("normaliseGmail", boolean().optional().default(false)),
        ("useDefaultPatterns", boolean().optional().default(false)),
        (
            "customRegexBlocklist",
            array(safe_regex_pattern())
                .max(MAX_CUSTOM_REGEX_PATTERNS)
                .optional()
                .default(json!([])),
        ),
        (
            "maxEmailSubmissionCount",
            number().int().min(1.0).optional(),
        ),
    ])
}

pub fn spam_filter_rules_schema() -> Schema {
    object(vec![
        ("enabled", boolean().optional().default(false)),
        ("emailRules", email_spam_rules_schema().optional()),
    ])
}

wire_enum! {
    pub enum TrafficFilterAction {
        Block: "Block" = "block",
        Challenge: "Challenge" = "challenge",
    }
}

pub fn traffic_category_policy_schema() -> Schema {
    object(vec![
        ("action", TrafficFilterAction::schema()),
        ("captchaType", selectable_captcha_type_schema().optional()),
        ("powDifficulty", pow_difficulty_field_schema().optional()),
        (
            "solvedImagesCount",
            image_max_rounds_field_schema().optional(),
        ),
        (
            "puzzleTolerance",
            puzzle_tolerance_field_schema().optional(),
        ),
        ("padBytes", pad_bytes_field_schema().optional()),
        ("puzzle", puzzle_settings_schema().optional()),
        ("audio", audio_settings_schema().optional()),
        (
            "iconOrderTolerance",
            icon_order_tolerance_field_schema().optional(),
        ),
        ("iconOrder", icon_order_settings_schema().optional()),
    ])
}

fn name_list() -> Schema {
    array(string().min(1.0).max(MAX_DATACENTER_ALLOWLIST_ENTRY_LENGTH))
        .max(MAX_DATACENTER_ALLOWLIST_ENTRIES)
        .optional()
}

pub fn traffic_filter_schema() -> Schema {
    let policy = || traffic_category_policy_schema().optional();
    object(vec![
        ("vpn", policy()),
        ("proxy", policy()),
        ("tor", policy()),
        ("abuser", policy()),
        (
            "abuserScoreThreshold",
            range(0.0, 1.0)
                .optional()
                .default(TRAFFIC_FILTER_ABUSER_SCORE_THRESHOLD_DEFAULT),
        ),
        ("datacenter", policy()),
        ("datacenterNameAllowlist", name_list()),
        ("datacenterNameDenylist", name_list()),
        (
            "skipExtrasOnValidDnsPath",
            boolean().optional().default(true),
        ),
        ("mobile", policy()),
        ("satellite", policy()),
        ("crawler", policy()),
    ])
}

wire_enum! {
    /// Encoding used when serialising the honeypot question into the rendered
    /// hidden input. Humans don't see the field; bots that auto-fill text inputs
    /// receive an encoded string they can't trivially decode.
    pub enum EncodingType {
        Morse: "morse" = "morse",
        Semaphore: "semaphore" = "semaphore",
    }
}

pub const HONEYPOT_ENCODING_TYPE_DEFAULT: EncodingType = EncodingType::Morse;

pub fn honeypot_settings_schema() -> Schema {
    object(vec![
        ("enabled", boolean().optional().default(false)),
        ("question", string().optional()),
        (
            "encodingType",
            EncodingType::schema()
                .optional()
                .default(HONEYPOT_ENCODING_TYPE_DEFAULT.as_str()),
        ),
    ])
}

/// `/^\/(?!\/)/`: root-relative, not protocol-relative.
fn is_root_relative(value: &str) -> bool {
    value.starts_with('/') && !value.starts_with("//")
}

/// `ClientSettingsSchema`.
pub fn client_settings_schema() -> Schema {
    let timeout = |default: u64| int(1000.0, 600_000.0).optional().default(default);
    object(vec![
        (
            "captchaType",
            selectable_captcha_type_schema()
                .optional()
                .default(CAPTCHA_TYPE_DEFAULT.as_str()),
        ),
        ("domains", array(string()).min(1.0)),
        (
            "verifiedTimeout",
            timeout(DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT),
        ),
        (
            "solutionTimeout",
            timeout(DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT),
        ),
        (
            "frictionlessThreshold",
            frictionless_threshold_schema()
                .optional()
                .default(frictionless_threshold_default()),
        ),
        (
            "frictionlessTypes",
            frictionless_types_schema()
                .optional()
                .default(frictionless_types_default()),
        ),
        (
            "captchaTypeFeatureFlags",
            captcha_type_feature_flags_schema().optional(),
        ),
        (
            "widgetFeatureFlags",
            widget_feature_flags_schema().optional(),
        ),
        (
            "powDifficulty",
            pow_difficulty_field_schema()
                .optional()
                .default(POW_DIFFICULTY_DEFAULT),
        ),
        (
            "imageThreshold",
            image_threshold_field_schema()
                .optional()
                .default(IMAGE_THRESHOLD_DEFAULT),
        ),
        (
            "imageMaxRounds",
            image_max_rounds_field_schema()
                .optional()
                .default(IMAGE_MAX_ROUNDS_DEFAULT),
        ),
        (
            "imageMinRounds",
            image_min_rounds_field_schema()
                .optional()
                .default(IMAGE_MIN_ROUNDS_DEFAULT),
        ),
        ("autoBanScoreThreshold", number().min(0.0).optional()),
        (
            "puzzleTolerance",
            puzzle_tolerance_field_schema()
                .optional()
                .default(PUZZLE_TOLERANCE_DEFAULT),
        ),
        (
            "puzzleMaxDifficulty",
            puzzle_max_difficulty_field_schema()
                .optional()
                .default(PUZZLE_MAX_DIFFICULTY_DEFAULT),
        ),
        ("puzzle", puzzle_settings_schema().optional()),
        ("audio", audio_settings_schema().optional()),
        ("audioAccessibilityEnabled", boolean().optional()),
        (
            "iconOrderTolerance",
            icon_order_tolerance_field_schema()
                .optional()
                .default(ICON_ORDER_TOLERANCE_DEFAULT),
        ),
        ("iconOrder", icon_order_settings_schema().optional()),
        ("ipValidationRules", ip_validation_rules_schema().optional()),
        ("disallowWebView", boolean().optional().default(false)),
        ("spamEmailDomainCheckEnabled", boolean().optional()),
        ("spamFilter", spam_filter_rules_schema().optional()),
        ("trafficFilter", traffic_filter_schema().optional()),
        ("storeMetadata", boolean().optional()),
        ("honeypot", honeypot_settings_schema().optional()),
        ("allowAgents", boolean().optional()),
        ("assetOrigin", string().url().optional()),
        (
            "clientUrl",
            string()
                .regex_with_message(is_root_relative, "clientUrl must be a root-relative path")
                .optional(),
        ),
    ])
    .refine_with(
        |value: &Data| {
            at_most(
                number_at(value, "imageMinRounds"),
                number_at(value, "imageMaxRounds"),
            )
        },
        |_| {
            IssueData::code("custom")
                .with("message", "imageMinRounds must be <= imageMaxRounds")
                .with("path", json!(["imageMinRounds"]))
        },
    )
}

/// A stored settings field as `resolveFrictionlessTypes` and friends read it: missing,
/// `null` and absent keys all fall back to the defaults.
fn flag(settings: Option<&Value>, key: &str) -> Option<bool> {
    settings?.get(key)?.as_bool()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AllowedTypes {
    pub image: bool,
    pub puzzle: bool,
    pub icon_order: bool,
}

/// `resolveFrictionlessTypes`: a stored `frictionlessTypes` (possibly missing or partial) as
/// a complete set.
pub fn resolve_frictionless_types(configured: Option<&Value>) -> AllowedTypes {
    AllowedTypes {
        image: flag(configured, "image").unwrap_or(true),
        puzzle: flag(configured, "puzzle").unwrap_or(true),
        icon_order: flag(configured, "iconOrder").unwrap_or(true),
    }
}

fn feature_flag_default(captcha_type: CaptchaType) -> Option<bool> {
    match captcha_type {
        CaptchaType::Puzzle => Some(true),
        CaptchaType::IconOrder => Some(false),
        CaptchaType::Audio => Some(false),
        _ => None,
    }
}

/// `isCaptchaTypeFeatureEnabled`: types without a feature flag are always enabled.
pub fn is_captcha_type_feature_enabled(captcha_type: CaptchaType, flags: Option<&Value>) -> bool {
    match feature_flag_default(captcha_type) {
        Some(default) => flag(flags, captcha_type.as_str()).unwrap_or(default),
        None => true,
    }
}

/// `resolveAllowedCaptchaTypes`: the owner's `frictionlessTypes` narrowed by Prosopo's
/// feature flags.
pub fn resolve_allowed_captcha_types(settings: Option<&Value>) -> AllowedTypes {
    let preferred: AllowedTypes =
        resolve_frictionless_types(settings.and_then(|s| s.get("frictionlessTypes")));
    let flags: Option<&Value> = settings.and_then(|s| s.get("captchaTypeFeatureFlags"));
    AllowedTypes {
        image: preferred.image,
        puzzle: preferred.puzzle && is_captcha_type_feature_enabled(CaptchaType::Puzzle, flags),
        icon_order: preferred.icon_order
            && is_captcha_type_feature_enabled(CaptchaType::IconOrder, flags),
    }
}

/// `isWidgetFeatureEnabled` for the one widget feature, `puzzleImageSwitch`.
pub fn is_puzzle_image_switch_enabled(flags: Option<&Value>) -> bool {
    flag(flags, "puzzleImageSwitch").unwrap_or(false)
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct FrictionlessLadder {
    pub puzzle: f64,
    pub image: f64,
}

/// `resolveFrictionlessThreshold`: a stored ladder, or the pre-ladder bare number (the puzzle
/// rung). The image rung never sits below the puzzle rung.
pub fn resolve_frictionless_threshold(configured: Option<&Value>) -> FrictionlessLadder {
    let (puzzle, image): (Option<f64>, Option<f64>) = match configured {
        Some(Value::Number(number)) => (number.as_f64(), None),
        Some(object @ Value::Object(_)) => (
            object
                .get("frictionlessPuzzleThreshold")
                .and_then(Value::as_f64),
            object
                .get("frictionlessImageThreshold")
                .and_then(Value::as_f64),
        ),
        _ => (None, None),
    };
    let puzzle: f64 = puzzle.unwrap_or(FRICTIONLESS_PUZZLE_THRESHOLD_DEFAULT);
    FrictionlessLadder {
        puzzle,
        image: js_max(
            puzzle,
            image.unwrap_or(FRICTIONLESS_IMAGE_THRESHOLD_DEFAULT),
        ),
    }
}

/// `Math.max` of two numbers: NaN wins.
fn js_max(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        f64::NAN
    } else {
        a.max(b)
    }
}

fn js_min(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        f64::NAN
    } else {
        a.min(b)
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ImageRounds {
    pub min: f64,
    pub max: f64,
}

/// `resolveImageRoundsBounds`: the cap wins over a stale floor above it.
pub fn resolve_image_rounds_bounds(min: Option<f64>, max: Option<f64>) -> ImageRounds {
    let max: f64 = max.unwrap_or(IMAGE_MAX_ROUNDS_DEFAULT);
    ImageRounds {
        min: js_min(min.unwrap_or(IMAGE_MIN_ROUNDS_DEFAULT), max),
        max,
    }
}

/// `clampImageRounds`: the site's bounds win over every other source of a round count. A
/// non-finite request falls back to the floor.
pub fn clamp_image_rounds(requested: f64, min: Option<f64>, max: Option<f64>) -> f64 {
    let bounds: ImageRounds = resolve_image_rounds_bounds(min, max);
    if !requested.is_finite() {
        return bounds.min;
    }
    js_min(js_max(js_math_round(requested), bounds.min), bounds.max)
}
